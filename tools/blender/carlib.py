"""Builds a car exterior in Blender from a per-car spec and exports it as GLB.

Coordinates in specs are car coordinates in metres: s runs from the nose
(s = 0) to the tail (s = L), y is up from the ground, z is the half-width
from the centreline. The app's frame is x forward, y up, z right with the
origin under the middle of the car; Blender's is Z up, so a car point
(x, y, z) becomes Blender (x, -z, y) and the glTF exporter turns it back.

The body is a subdivision-surface cage: rows run round the section from the
sill to the roof centreline, stations run along the car. Rows have fixed
meanings (see ROWS) so the paint layout used by the app's liveries maps onto
every car the same way.
"""
import math

import bmesh
import bpy
from mathutils import Vector

# Row index -> (name, v coordinate in the app's livery layout).
ROWS = [
    ("flange", 0.185),
    ("sill", 0.2),
    ("lower", 0.27),
    ("belly", 0.34),
    ("upper", 0.45),
    ("crest", 0.62),
    ("inner", 0.67),
    ("edge", 0.72),
    ("rail_lo", 0.84),
    ("rail_hi", 0.86),
    ("mid", 0.93),
    ("centre", 1.0),
]
R = {name: i for i, (name, _) in enumerate(ROWS)}
PAINT, GLASS = 0, 1


def curve(keys):
    """Monotone cubic through (s, value) keys; flat beyond the ends."""
    keys = sorted(keys)
    xs = [k[0] for k in keys]
    ys = [k[1] for k in keys]
    n = len(keys)
    if n == 1:
        return lambda s: ys[0]
    d = [(ys[i + 1] - ys[i]) / max(1e-9, xs[i + 1] - xs[i]) for i in range(n - 1)]
    m = []
    for i in range(n):
        if i == 0:
            m.append(d[0])
        elif i == n - 1:
            m.append(d[-1])
        elif d[i - 1] * d[i] <= 0:
            m.append(0.0)
        else:
            m.append(2 / (1 / d[i - 1] + 1 / d[i]))

    def f(s):
        if s <= xs[0]:
            return ys[0]
        if s >= xs[-1]:
            return ys[-1]
        i = 0
        while s > xs[i + 1]:
            i += 1
        h = xs[i + 1] - xs[i]
        t = (s - xs[i]) / h
        t2, t3 = t * t, t * t * t
        return (
            (2 * t3 - 3 * t2 + 1) * ys[i]
            + (t3 - 2 * t2 + t) * h * m[i]
            + (-2 * t3 + 3 * t2) * ys[i + 1]
            + (t3 - t2) * h * m[i + 1]
        )

    return f


def polyline(keys):
    """Straight segments through (s, value) keys, for lines that should kink."""
    keys = sorted(keys)

    def f(s):
        if s <= keys[0][0]:
            return keys[0][1]
        for (a, ya), (b, yb) in zip(keys, keys[1:]):
            if s <= b:
                return ya + (yb - ya) * (s - a) / max(1e-9, b - a)
        return keys[-1][1]

    return f


def lerp(a, b, k):
    return a + (b - a) * k


class Car:
    def __init__(self, spec):
        self.spec = spec
        self.L = spec["L"]
        self.W = spec["W"]
        self.wheel_r = spec.get("wheel_r", 0.35)
        self.tyre_w = spec.get("tyre_w", 0.31)
        self.arch_gap = spec.get("arch_gap", 0.035)
        self.front_s = spec["front_axle"]
        self.rear_s = self.front_s + spec["wheelbase"]
        self.f = {
            k: (polyline(v[1:]) if v and v[0] == "linear" else curve(v))
            for k, v in spec["curves"].items()
        }
        self.cabin = spec["cabin"]  # cowl, header, pillar, back, glass_end, deck (s)
        self.objects = []
        self.preview = []

    # --- frames ---------------------------------------------------------
    def x(self, s):
        return self.L / 2 - s

    def bl(self, s, y, z):
        """Car point to Blender coordinates."""
        return Vector((self.x(s), -z, y))

    # --- section --------------------------------------------------------
    def arch(self, s):
        """Height of the wheel opening at s, or None outside the arches."""
        ra = self.wheel_r + self.arch_gap
        for axle in (self.front_s, self.rear_s):
            d = abs(s - axle)
            if d < ra - 1e-6:
                return self.wheel_r + math.sqrt(ra * ra - d * d)
        return None

    def section(self, s):
        f = self.f
        c = self.cabin
        half = f["half"](s)
        sill_y = f["sill_y"](s)
        belly_y = f["belly_y"](s)
        crest_y = f["crest_y"](s)
        crest_z = min(f["crest_z"](s), half - 0.02)
        edge_y = f["edge_y"](s)
        edge_z = min(f["edge_z"](s), crest_z - 0.03)
        top = f["top"](s)
        arch = self.arch(s)
        tuck = f["tuck"](s) if "tuck" in f else 0.04
        pts = [None] * len(ROWS)
        if arch is None:
            pts[R["sill"]] = (half - tuck, sill_y)
            pts[R["lower"]] = (half - tuck * 0.35, lerp(sill_y, belly_y, 0.5))
            pts[R["belly"]] = (half, belly_y)
            pts[R["upper"]] = (half - 0.012, lerp(belly_y, crest_y, 0.62))
        else:
            crest_y = max(crest_y, arch + 0.045)
            pts[R["sill"]] = (half, arch)
            pts[R["lower"]] = (half + 0.004, lerp(arch, crest_y, 0.22))
            pts[R["belly"]] = (half, lerp(arch, crest_y, 0.45))
            pts[R["upper"]] = (half - 0.014, lerp(arch, crest_y, 0.72))
        sz, sy = pts[R["sill"]]
        pts[R["flange"]] = (sz - 0.05, sy + (0.0 if arch is None else 0.0))
        pts[R["crest"]] = (crest_z, crest_y)
        pts[R["inner"]] = (lerp(crest_z, edge_z, 0.5), lerp(crest_y, edge_y, 0.32))
        pts[R["edge"]] = (edge_z, edge_y)
        if c["cowl"] <= s <= c["deck"]:
            rail_y = f["rail_y"](s)
            rail_z = min(f["rail_z"](s), edge_z - 0.012)
            pts[R["rail_lo"]] = (rail_z, rail_y)
            pts[R["rail_hi"]] = (max(0.05, rail_z - f["rail_w"](s)), min(top - 0.004, rail_y + 0.022))
            hz, hy = pts[R["rail_hi"]]
            pts[R["mid"]] = (hz * 0.5, top - (top - hy) * 0.27)
        else:
            # Bonnet or deck: a crowned panel from its edge to the centreline.
            crown = self.spec.get("crown", 2.0)
            for name, k in (("rail_lo", 0.75), ("rail_hi", 0.5), ("mid", 0.25)):
                z = edge_z * k
                pts[R[name]] = (z, top - (top - edge_y) * (z / max(1e-6, edge_z)) ** crown)
        pts[R["centre"]] = (0.0, top)
        return pts

    def stations(self):
        c = self.cabin
        ra = self.wheel_r + self.arch_gap
        feature = [0.0, self.L]
        feature += [c["cowl"], (c["cowl"] + c["header"]) / 2, c["header"]]
        pw = c.get("pillar_w", 0.03)
        feature += [c["pillar"] - pw, c["pillar"] + pw, c["back"]]
        if c["glass_end"] < c["deck"] - 0.05:
            feature.append(c["glass_end"])
        feature += [(c["back"] + c["deck"]) / 2, c["deck"]]
        feature += list(self.spec.get("stations", []))
        arches = []
        for axle in (self.front_s, self.rear_s):
            for k in (-1.012, -0.988, -0.86, -0.5, 0.0, 0.5, 0.86, 0.988, 1.012):
                arches.append(axle + ra * k)
        fill = [0.02, 0.07, 0.16, 0.3, self.L - 0.3, self.L - 0.16, self.L - 0.07, self.L - 0.02]
        fill += [c["header"] + 0.07]
        out = []
        # Arches and features win; filler stations only where there is room.
        for group, gap in ((arches, 0.0), (feature, 0.03), (fill, 0.06)):
            for s in group:
                if 0 <= s <= self.L and all(abs(s - o) > gap for o in out):
                    out.append(s)
        out.sort()
        # Keep the cage from stretching over long panels.
        dense = [out[0]]
        for a, b in zip(out, out[1:]):
            n = int((b - a) / 0.36)
            for i in range(1, n + 1):
                dense.append(a + (b - a) * i / (n + 1))
            dense.append(b)
        return dense

    def glass_face(self, s0, s1, row):
        """Whether the cage face between two stations and above `row` is glass."""
        c = self.cabin
        mid = (s0 + s1) / 2
        if R["rail_hi"] <= row < R["centre"]:
            return c["cowl"] < mid < c["header"] or c["back"] < mid < c["glass_end"]
        if row == R["edge"]:
            if not c["cowl"] < mid < c["side_end"]:
                return False
            pw = c.get("pillar_w", 0.03)
            return not c["pillar"] - pw < mid < c["pillar"] + pw
        return False

    # --- cage -----------------------------------------------------------
    def build_shell(self, levels=2):
        ss = self.stations()
        self.station_list = ss
        bm = bmesh.new()
        uv = bm.loops.layers.uv.new("UVMap")
        crease = bm.edges.layers.float.new("crease_edge")
        nrow = len(ROWS)
        grid = {}
        tv = {}
        caps = []
        for side in (1, -1):
            for i, s in enumerate(ss):
                pts = self.section(s)
                for j, (z, y) in enumerate(pts):
                    if side < 0 and z == 0.0:
                        grid[(side, i, j)] = grid[(1, i, j)]
                        continue
                    v = bm.verts.new(self.bl(s, y, z * side))
                    grid[(side, i, j)] = v
                    tv[v] = (s / self.L, ROWS[j][1])
        bm.verts.ensure_lookup_table()

        def set_uv(face, side):
            for loop in face.loops:
                t, v = tv[loop.vert]
                if side < 0:
                    loop[uv].uv = (t, 1 - (0.5 + v * 0.5))
                else:
                    loop[uv].uv = (1 - t, 1 - v * 0.5)

        for side in (1, -1):
            for i in range(len(ss) - 1):
                for j in range(nrow - 1):
                    a, b = grid[(side, i, j)], grid[(side, i + 1, j)]
                    c, d = grid[(side, i + 1, j + 1)], grid[(side, i, j + 1)]
                    quad = [a, b, c, d] if side > 0 else [a, d, c, b]
                    if len(set(quad)) < 4:
                        continue
                    face = bm.faces.new(quad)
                    face.material_index = GLASS if self.glass_face(ss[i], ss[i + 1], j) else PAINT
                    set_uv(face, side)
            # Close the nose and the tail: one cap per side, so each keeps to
            # its own half of the paint layout.
            for i in (0, len(ss) - 1):
                ring = [grid[(side, i, j)] for j in range(R["sill"], nrow)]
                key = ("cap", i)
                if key not in grid:
                    z0, y0 = self.section(ss[i])[R["sill"]]
                    grid[key] = bm.verts.new(self.bl(ss[i], y0, 0.0))
                    tv[grid[key]] = (ss[i] / self.L, ROWS[R["sill"]][1])
                loop = ring + [grid[key]]
                if (i == 0) == (side > 0):
                    loop.reverse()
                face = bm.faces.new(loop)
                face.material_index = PAINT
                set_uv(face, side)
                caps.append(face)
        bm.normal_update()
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        # The nose normal should point forward: flip everything if it does not.
        if caps[0].normal.x < 0:
            bmesh.ops.reverse_faces(bm, faces=bm.faces)

        # Creases: feature lines stay tight under subdivision.
        def crease_row(row, s0, s1, value):
            for side in (1, -1):
                for i in range(len(ss) - 1):
                    if s0 <= (ss[i] + ss[i + 1]) / 2 <= s1:
                        e = bm.edges.get((grid[(side, i, row)], grid[(side, i + 1, row)]))
                        if e:
                            e[crease] = max(e[crease], value)

        crease_row(R["sill"], 0, self.L, 0.85)
        for name, s0, s1, value in self.spec.get("creases", []):
            crease_row(R[name], s0, s1, value)
        for face in caps:
            for e in face.edges:
                if not all(abs(v.co.y) < 1e-9 for v in e.verts):
                    e[crease] = max(e[crease], self.spec.get("end_crease", 0.35))

        mesh = bpy.data.meshes.new("cage")
        bm.to_mesh(mesh)
        bm.free()
        cage = bpy.data.objects.new("cage", mesh)
        bpy.context.scene.collection.objects.link(cage)
        sub = cage.modifiers.new("sub", "SUBSURF")
        sub.levels = sub.render_levels = levels
        sub.uv_smooth = "PRESERVE_BOUNDARIES"
        sub.boundary_smooth = "PRESERVE_CORNERS"
        dg = bpy.context.evaluated_depsgraph_get()
        fine = bpy.data.meshes.new_from_object(cage.evaluated_get(dg))
        bpy.data.objects.remove(cage)
        bpy.data.meshes.remove(mesh)

        # Split the glass from the painted shell.
        bm = bmesh.new()
        bm.from_mesh(fine)
        bpy.data.meshes.remove(fine)
        glass = [f for f in bm.faces if f.material_index == GLASS]
        gm = bmesh.new()
        if glass:
            ret = bmesh.ops.split(bm, geom=glass)
            keep = {f for f in ret["geom"] if isinstance(f, bmesh.types.BMFace)}
            # Move the split-off faces into their own mesh.
            tmp = bpy.data.meshes.new("tmp")
            bm.to_mesh(tmp)
            gm.from_mesh(tmp)
            bpy.data.meshes.remove(tmp)
            bmesh.ops.delete(gm, geom=[f for f in gm.faces if f.material_index != GLASS], context="FACES")
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == GLASS], context="FACES")
            del keep
            gm.normal_update()
            for v in gm.verts:
                v.co -= v.normal * 0.006
        # The shell stays editable until finish(): pockets cut into it and
        # decals copy patches from it.
        self.shell_bm = bm
        bm.normal_update()
        if glass:
            self.glass = self.add(gm, "glass", "glass")

    def finish(self):
        """Writes the shell once every pocket has been cut."""
        bm = self.shell_bm
        self.shell_bm = None
        self.shell = self.add(bm, "shell", "shell")
        return self.shell

    # --- objects --------------------------------------------------------
    def add(self, bm, name, material, smooth=True, preview=False):
        mesh = bpy.data.meshes.new(name)
        bm.normal_update()
        bm.to_mesh(mesh)
        bm.free()
        for poly in mesh.polygons:
            poly.use_smooth = smooth
            poly.material_index = 0
        mesh.materials.clear()
        mesh.materials.append(material_named(material))
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        (self.preview if preview else self.objects).append(obj)
        return obj

    def _frame(self, at, toward, side):
        """Origin and axes of a view: looking along d, u to the right, v up."""
        origin = self.bl(at[0], at[1], at[2] * side)
        d = Vector((-toward[0], -toward[2] * side, toward[1])).normalized()
        if abs(d.z) > 0.9:
            return origin, d, Vector((-1, 0, 0)), Vector((0, -side, 0))
        v = Vector((0, 0, 1))
        v = (v - d * v.dot(d)).normalized()
        u = v.cross(d)
        outboard = Vector((0, -side, 0))
        ref = outboard if abs(u.dot(outboard)) > 0.3 else Vector((-1, 0, 0))
        if u.dot(ref) < 0:
            u = -u
        return origin, d, u, v

    def decal(self, name, material, at, toward, polys, mirror=True, offset=0.003, depth=0.3):
        """Cuts the patch of the shell seen through convex outlines.

        `at` is a point (s, y, z) on or near the surface and `toward` the
        direction the viewer looks along, both in car coordinates. Each
        outline is a convex list of (u, v) points around `at`, in metres:
        v runs up the picture and u to its right, chosen so that u points
        outboard (or rearward when looking from the side, and v outboard
        when looking from above). The patch follows the surface exactly and
        is lifted off it by `offset`; `mirror` repeats it on the left side.
        """
        out = bmesh.new()
        for side in (1, -1) if mirror else (1,):
            origin, d, u, v = self._frame(at, toward, side)
            for poly in polys:
                pts = [origin + u * p[0] + v * p[1] for p in poly]
                self._decal_piece(out, pts, d, origin, depth)
        if not out.faces:
            out.free()
            print(f"WARNING {self.spec['id']}: decal {name} is empty")
            return None
        out.normal_update()
        for vert in out.verts:
            vert.co += vert.normal * offset
        return self.add(out, name, material)

    def pocket(self, name, material, at, toward, polys, sink=0.05, mirror=True, depth=0.3, wall="dark", slats=None):
        """Cuts convex openings into the shell and recesses a floor behind them.

        Same view convention as decal(). The shell loses the faces inside each
        outline; they come back `sink` metres along the view direction as the
        floor, joined to the opening by walls. `slats` = (count, material,
        width, "u" or "v") hangs louvres across the opening, part-way down.
        """
        floor = bmesh.new()
        walls = bmesh.new()
        louvres = bmesh.new()
        bm = self.shell_bm
        for side in (1, -1) if mirror else (1,):
            origin, d, u, v = self._frame(at, toward, side)
            for poly in polys:
                pts = [origin + u * p[0] + v * p[1] for p in poly]
                centre = sum(pts, Vector()) / len(pts)
                radius = max((p - centre).length for p in pts) + 0.02
                n = len(pts)
                area = sum((pts[i] - centre).cross(pts[(i + 1) % n] - centre).dot(d) for i in range(n))
                planes = []
                for i in range(n):
                    a, b = pts[i], pts[(i + 1) % n]
                    normal = (b - a).cross(d)
                    if area < 0:
                        normal = -normal
                    if normal.length > 1e-9:
                        planes.append((a, normal.normalized()))

                def near():
                    out = []
                    for face in bm.faces:
                        if face.normal.dot(d) > -0.05:
                            continue
                        rel = face.calc_center_median() - centre
                        along = rel.dot(d)
                        if abs(along + (centre - origin).dot(d)) > depth:
                            continue
                        if (rel - d * along).length <= radius:
                            out.append(face)
                    return out

                for co, no in planes:
                    faces = near()
                    if not faces:
                        break
                    geom = set(faces)
                    for face in faces:
                        geom.update(face.edges)
                        geom.update(face.verts)
                    bmesh.ops.bisect_plane(bm, geom=list(geom), plane_co=co, plane_no=no, clear_outer=False, clear_inner=False)
                inside = [f for f in near() if all((f.calc_center_median() - co).dot(no) < 1e-6 for co, no in planes)]
                if not inside:
                    continue
                chosen = set(inside)
                moved = {}
                for face in inside:
                    verts = []
                    for vert in face.verts:
                        if vert not in moved:
                            moved[vert] = floor.verts.new(vert.co + d * sink)
                        verts.append(moved[vert])
                    floor.faces.new(verts)
                    for edge in face.edges:
                        if sum(1 for f in edge.link_faces if f in chosen) == 1:
                            a, b = edge.verts
                            walls.faces.new([walls.verts.new(a.co), walls.verts.new(b.co), walls.verts.new(b.co + d * sink), walls.verts.new(a.co + d * sink)])
                if slats:
                    count, _mat, width, axis = slats
                    across = u if axis == "u" else v
                    lo = min((p - origin).dot(across) for p in pts)
                    hi = max((p - origin).dot(across) for p in pts)
                    for k in range(count):
                        mid = lo + (hi - lo) * (k + 0.5) / count
                        strip = bmesh.new()
                        copy = {}
                        for face in inside:
                            strip.faces.new([copy.setdefault(vert, strip.verts.new(vert.co)) for vert in face.verts])
                        for sign in (1, -1):
                            if strip.faces:
                                bmesh.ops.bisect_plane(strip, geom=strip.verts[:] + strip.edges[:] + strip.faces[:], plane_co=origin + across * (mid + sign * width / 2), plane_no=across * sign, clear_outer=True)
                        new = {vert: louvres.verts.new(vert.co + d * sink * 0.35) for vert in strip.verts}
                        for face in strip.faces:
                            louvres.faces.new([new[vert] for vert in face.verts])
                        strip.free()
                bmesh.ops.delete(bm, geom=inside, context="FACES")
        bm.normal_update()
        if not floor.faces:
            print(f"WARNING {self.spec['id']}: pocket {name} is empty")
        for mesh, suffix, mat in ((floor, "", material), (walls, "_wall", wall), (louvres, "_slats", slats[1] if slats else wall)):
            if mesh.faces:
                bmesh.ops.remove_doubles(mesh, verts=mesh.verts[:], dist=1e-5)
                self.add(mesh, name + suffix, mat, smooth=suffix == "")
            else:
                mesh.free()

    def _decal_piece(self, out, pts, direction, origin, depth):
        centre = sum(pts, Vector()) / len(pts)
        radius = max((p - centre).length for p in pts) + 0.06
        piece = bmesh.new()
        vmap = {}
        for face in self.shell_bm.faces:
            if face.normal.dot(direction) > -0.05:
                continue
            rel = face.calc_center_median() - centre
            along = rel.dot(direction)
            if abs(along + (centre - origin).dot(direction)) > depth:
                continue
            if (rel - direction * along).length > radius:
                continue
            verts = []
            for vert in face.verts:
                if vert not in vmap:
                    vmap[vert] = piece.verts.new(vert.co)
                    vmap[vert].normal = vert.normal
                verts.append(vmap[vert])
            piece.faces.new(verts)
        n = len(pts)
        area = sum((pts[i] - centre).cross(pts[(i + 1) % n] - centre).dot(direction) for i in range(n))
        for i in range(n):
            a, b = pts[i], pts[(i + 1) % n]
            normal = (b - a).cross(direction)
            if area < 0:
                normal = -normal
            if normal.length < 1e-9 or not piece.faces:
                continue
            bmesh.ops.bisect_plane(
                piece,
                geom=piece.verts[:] + piece.edges[:] + piece.faces[:],
                plane_co=a,
                plane_no=normal.normalized(),
                clear_outer=True,
            )
        new = {vert: out.verts.new(vert.co) for vert in piece.verts}
        for face in piece.faces:
            try:
                out.faces.new([new[vert] for vert in face.verts])
            except ValueError:
                pass
        piece.free()

    def tube(self, name, material, points, radius=0.014, segments=8, closed=False, preview=False):
        bm = bmesh.new()
        pts = [Vector(p) for p in points]
        rings = []
        for i, p in enumerate(pts):
            a = pts[max(0, i - 1)]
            b = pts[min(len(pts) - 1, i + 1)]
            tangent = (b - a).normalized()
            ref = Vector((0, 0, 1)) if abs(tangent.z) < 0.9 else Vector((1, 0, 0))
            u = tangent.cross(ref).normalized()
            w = tangent.cross(u).normalized()
            rings.append([bm.verts.new(p + (u * math.cos(k) + w * math.sin(k)) * radius) for k in [2 * math.pi * q / segments for q in range(segments)]])
        for r0, r1 in zip(rings, rings[1:]):
            for q in range(segments):
                bm.faces.new([r0[q], r0[(q + 1) % segments], r1[(q + 1) % segments], r1[q]])
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return self.add(bm, name, material, preview=preview)

    def box(self, name, material, centre, size, rotation=(0, 0, 0), bevel=0.0, subdiv=0, preview=False, smooth=False):
        """A box in car coordinates: centre (s, y, z), size (along s, y, z)."""
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1)
        for v in bm.verts:
            v.co = Vector((v.co.x * size[0], v.co.y * size[2], v.co.z * size[1]))
        if bevel:
            bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, affect="EDGES")
        if subdiv:
            bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
        obj = self.add(bm, name, material, smooth=smooth, preview=preview)
        obj.location = self.bl(*centre)
        obj.rotation_euler = rotation
        return obj

    def blob(self, name, material, centre, size, levels=2, preview=False):
        """A rounded pod (mirror housings and the like)."""
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1)
        for v in bm.verts:
            v.co = Vector((v.co.x * size[0], v.co.y * size[2], v.co.z * size[1]))
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
        mesh = bpy.data.meshes.new("b")
        bm.to_mesh(mesh)
        bm.free()
        tmp = bpy.data.objects.new("b", mesh)
        bpy.context.scene.collection.objects.link(tmp)
        tmp.modifiers.new("s", "SUBSURF").levels = levels
        dg = bpy.context.evaluated_depsgraph_get()
        fine = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
        bpy.data.objects.remove(tmp)
        bm = bmesh.new()
        bm.from_mesh(fine)
        bpy.data.meshes.remove(fine)
        obj = self.add(bm, name, material, preview=preview)
        obj.location = self.bl(*centre)
        return obj

    def arch_lips(self, material="trim", radius=0.013):
        ra = self.wheel_r + self.arch_gap
        for label, axle in (("front", self.front_s), ("rear", self.rear_s)):
            for side in (1, -1):
                pts = []
                for i in range(25):
                    a = math.pi * (0.02 + 0.96 * i / 24)
                    s = axle + ra * math.cos(a)
                    z = self.f["half"](s) + 0.006
                    pts.append(self.bl(s, self.wheel_r + ra * math.sin(a), z * side))
                self.tube(f"arch_{label}_{'r' if side > 0 else 'l'}", material, pts, radius=radius, segments=6)

    def wheel_wells(self, material="dark"):
        ra = self.wheel_r + self.arch_gap + 0.02
        for label, axle in (("front", self.front_s), ("rear", self.rear_s)):
            for side in (1, -1):
                bm = bmesh.new()
                inner = self.W / 2 - self.tyre_w - 0.1
                outer = self.f["half"](axle) - 0.03
                rings = []
                for z in (inner, outer):
                    rings.append([bm.verts.new(self.bl(axle + ra * math.cos(a), max(0.1, self.wheel_r + ra * math.sin(a)), z * side)) for a in [math.pi * (-0.12 + 1.24 * i / 16) for i in range(17)]])
                for q in range(16):
                    bm.faces.new([rings[0][q], rings[0][q + 1], rings[1][q + 1], rings[1][q]])
                bm.faces.new(rings[0])
                bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
                self.add(bm, f"well_{label}_{'r' if side > 0 else 'l'}", material, smooth=False)

    def common(self, door, mirror, louvres=True, diffuser=0.42):
        """What every GT3 car here has: arch lips and liners, door shut lines,
        mirrors, louvres over the front wheels and a diffuser opening.

        door = (centre s, half length, sill y, belt y); mirror = (s, y).
        """
        self.arch_lips()
        self.wheel_wells()
        ds, dh, y0, y1 = door
        mid = (y0 + y1) / 2
        self.decal("door", "dark", (ds, mid, self.W / 2), (0, 0, -1), stroke([(-dh + 0.04, y1 - mid), (-dh, 0.0), (-dh + 0.08, y0 - mid), (dh - 0.06, y0 - mid), (dh, 0.0), (dh - 0.02, y1 - mid)], 0.008), offset=0.002)
        ms, my = mirror
        half = self.f["half"](ms)
        for side in (1, -1):
            self.blob("mirror", "paint", (ms, my, (half + 0.07) * side), (0.17, 0.1, 0.2))
            self.tube("mirror_stalk", "trim", [self.bl(ms + 0.03, my - 0.08, (half - 0.13) * side), self.bl(ms + 0.01, my - 0.03, (half + 0.02) * side)], radius=0.014)
        if louvres:
            top = self.f["crest_y"](self.front_s) + 0.1
            self.pocket("wing_louvres", "dark", (self.front_s, top, self.f["half"](self.front_s) - 0.15), (0, -1, 0), [rrect(-0.19 + i * 0.1, -0.07, -0.13 + i * 0.1, 0.07, 0.012) for i in range(4)], sink=0.03)
        if diffuser:
            self.pocket("diffuser", "trim", (self.L, diffuser, 0), (-1, 0, 0), [[(-0.72, -0.08), (0.72, -0.08), (0.63, 0.08), (-0.63, 0.08)]], sink=0.07, mirror=False, depth=0.5)

    def exhausts(self, y, zs, radius=0.05):
        for z in zs:
            self.tube("exhaust", "chrome", [self.bl(self.L - 0.1, y, z), self.bl(self.L + 0.02, y, z)], radius=radius, segments=16)

    def preview_all(self, wing_s, wing_y):
        self.preview_wheels()
        self.preview_floor()
        self.preview_wing(wing_s, wing_y)

    def preview_wheels(self):
        for axle in (self.front_s, self.rear_s):
            for side in (1, -1):
                z = (self.W / 2 - self.tyre_w / 2 - 0.025) * side
                for name, r, w, mat in (("tyre", self.wheel_r, self.tyre_w, "dark"), ("rim", self.wheel_r * 0.64, self.tyre_w + 0.01, "rim")):
                    bm = bmesh.new()
                    bmesh.ops.create_cone(bm, cap_ends=True, segments=32, radius1=r, radius2=r, depth=w)
                    obj = self.add(bm, f"preview_{name}", mat, preview=True, smooth=False)
                    obj.rotation_euler = (math.pi / 2, 0, 0)
                    obj.location = self.bl(axle, self.wheel_r, z)

    def preview_wing(self, s, y, chord=0.4, span=1.9):
        self.box("preview_wing", "dark", (s, y, 0), (chord, 0.03, span), preview=True)
        for side in (1, -1):
            self.box("preview_plate", "dark", (s, y - 0.06, side * span / 2), (chord * 1.2, 0.3, 0.015), preview=True)
            self.box("preview_neck", "dark", (s - 0.1, y - 0.12, side * 0.3), (0.05, 0.3, 0.02), preview=True)

    def preview_floor(self):
        self.box("preview_floor", "dark", (self.L / 2 - 0.05, 0.085, 0), (self.L * 0.98 + 0.12, 0.02, self.W * 0.9), preview=True)


# --- outline helpers -----------------------------------------------------------
def oval(cu, cv, ru, rv, n=20, turn=0.0):
    c, k = math.cos(turn), math.sin(turn)
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        x, y = ru * math.cos(a), rv * math.sin(a)
        out.append((cu + x * c - y * k, cv + x * k + y * c))
    return out


def rrect(u0, v0, u1, v1, r=0.02, n=4):
    """A rounded rectangle; r may be one radius or four (bl, br, tr, tl)."""
    rs = (r,) * 4 if isinstance(r, (int, float)) else r
    corners = [(u0, v0, rs[0], 180), (u1, v0, rs[1], 270), (u1, v1, rs[2], 0), (u0, v1, rs[3], 90)]
    out = []
    for (cu, cv, rad, start), (sx, sy) in zip(corners, ((1, 1), (-1, 1), (-1, -1), (1, -1))):
        if rad <= 0:
            out.append((cu, cv))
            continue
        ox, oy = cu + sx * rad, cv + sy * rad
        for i in range(n + 1):
            a = math.radians(start + 90 * i / n)
            out.append((ox + rad * math.cos(a), oy + rad * math.sin(a)))
    return out


def stroke(points, width=0.008):
    """A polyline as a list of thin convex quads, for shut lines and strips."""
    out = []
    for (u0, v0), (u1, v1) in zip(points, points[1:]):
        du, dv = u1 - u0, v1 - v0
        n = math.hypot(du, dv) or 1
        nu, nv = -dv / n * width / 2, du / n * width / 2
        eu, ev = du / n * width / 2, dv / n * width / 2
        out.append([(u0 - eu + nu, v0 - ev + nv), (u1 + eu + nu, v1 + ev + nv), (u1 + eu - nu, v1 + ev - nv), (u0 - eu - nu, v0 - ev - nv)])
    return out


# --- materials -------------------------------------------------------------
LOOKS = {
    # name: (base colour, metallic, roughness, emission colour, emission strength, alpha)
    "shell": ((0.75, 0.75, 0.74), 0.0, 0.32, None, 0, 1),
    "paint": ((0.75, 0.75, 0.74), 0.0, 0.32, None, 0, 1),
    "glass": ((0.03, 0.045, 0.05), 0.0, 0.06, None, 0, 1),
    "trim": ((0.02, 0.022, 0.025), 0.0, 0.55, None, 0, 1),
    "dark": ((0.008, 0.008, 0.01), 0.0, 0.8, None, 0, 1),
    "mesh": ((0.035, 0.037, 0.04), 0.3, 0.6, None, 0, 1),
    "chrome": ((0.6, 0.62, 0.65), 1.0, 0.25, None, 0, 1),
    "lens": ((0.02, 0.03, 0.04), 0.2, 0.1, None, 0, 1),
    "lamp_front": ((0.9, 0.95, 1.0), 0.0, 0.2, (0.85, 0.93, 1.0), 2.5, 1),
    "lamp_rear": ((0.8, 0.02, 0.04), 0.0, 0.25, (1.0, 0.03, 0.05), 1.6, 1),
    "amber": ((0.9, 0.45, 0.05), 0.0, 0.3, (1.0, 0.5, 0.05), 0.6, 1),
    "rim": ((0.05, 0.05, 0.055), 0.6, 0.4, None, 0, 1),
}


def material_named(name):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    base, metal, rough, emit, strength, _alpha = LOOKS[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base, 1)
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = rough
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*emit, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    if name in ("shell", "paint"):
        for key, value in (("Coat Weight", 1.0), ("Coat Roughness", 0.08)):
            if key in bsdf.inputs:
                bsdf.inputs[key].default_value = value
    return mat


def set_paint(colour):
    for name in ("shell", "paint"):
        material_named(name).node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*colour, 1)


# --- scene, render, export -------------------------------------------------
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    return scene


VIEWS = {
    "f34": ((6.4, -6.2, 2.0), 32),
    "r34": ((-6.6, -6.0, 2.1), 32),
    "side": ((0.0, -11.5, 0.95), 26),
    "front": ((9.0, 0.0, 0.95), 22),
    "rear": ((-9.0, 0.0, 1.0), 22),
    "top": ((0.01, 0.0, 11.0), 26),
}


def render(car, out_dir, views=("f34", "r34", "side", "front", "rear", "top"), size=(960, 600), samples=24):
    import os

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 88
    try:
        scene.eevee.taa_render_samples = samples
    except Exception:
        pass
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.52, 0.56, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.35
    scene.world = world
    # Ground and three soft lights: enough to judge form and highlights.
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40)
    ground = car.add(bm, "preview_ground", "ground" if bpy.data.materials.get("ground") else _ground(), preview=True)
    ground.location = (0, 0, -0.001)
    for name, loc, energy, sz in (("key", (5, -7, 6), 1500, 7), ("fill", (-7, -4, 3), 350, 8), ("rim", (-4, 7, 5), 900, 6), ("top", (0, 0, 9), 500, 14)):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.size = sz
        obj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(obj)
        obj.location = loc
        direction = Vector((0, 0, 0.5)) - Vector(loc)
        obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam_data = bpy.data.cameras.new("cam")
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    os.makedirs(out_dir, exist_ok=True)
    for view in views:
        loc, fov = VIEWS[view]
        cam.location = loc
        cam_data.angle = math.radians(fov)
        target = Vector((0, 0, 0.55 if view != "top" else 0))
        direction = target - Vector(loc)
        cam.rotation_euler = direction.to_track_quat("-Z", "Y" if view != "top" else "X").to_euler()
        scene.render.filepath = os.path.join(out_dir, f"{view}.jpg")
        bpy.ops.render.render(write_still=True)


def _ground():
    mat = bpy.data.materials.new("ground")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.09, 0.09, 0.1, 1)
    bsdf.inputs["Roughness"].default_value = 0.7
    return "ground"


def export(car, path, lod_path=None):
    bpy.ops.object.select_all(action="DESELECT")
    # One mesh per material keeps the file small and the runtime simple.
    groups = {}
    for obj in car.objects:
        groups.setdefault(obj.data.materials[0].name, []).append(obj)
    merged = []
    for name, objs in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objs:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        target = bpy.context.view_layer.objects.active
        target.name = name
        target.data.name = name
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        merged.append(target)
    car.objects = merged
    bpy.ops.object.select_all(action="DESELECT")
    for obj in merged:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_animations=False,
    )
