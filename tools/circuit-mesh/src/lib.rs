use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, HashMap};

pub type CompileResult<T> = Result<T, String>;
pub const MAGIC: &[u8; 8] = b"SATMESH1";
pub const HEADER_BYTES: usize = 32;
const MAX_VERTICES: usize = 10_000_000;
const MAX_INDICES: usize = 30_000_000;

#[derive(Clone, Deserialize, Serialize, Debug)]
pub struct Origin {
    pub longitude: f64,
    pub latitude: f64,
}
#[derive(Clone, Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TerrainGrid {
    pub bbox: [f64; 4],
    pub columns: usize,
    pub rows: usize,
    pub values: Vec<Option<f64>>,
}
#[derive(Clone, Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PreparedInput {
    pub schema_version: u32,
    pub origin: Origin,
    pub elevation_base: f64,
    pub points: Vec<[f64; 2]>,
    pub terrain_grid: Option<TerrainGrid>,
    pub projection_scale: Option<[f64; 2]>,
    pub scene_scale: f64,
    pub corridor_metres: f64,
    pub source_hashes: BTreeMap<String, String>,
    #[serde(default)]
    pub provenance: Option<Value>,
}
#[derive(Deserialize)]
struct Collection {
    #[serde(rename = "type")]
    kind: String,
    features: Vec<Feature>,
}
#[derive(Deserialize)]
struct Feature {
    #[serde(rename = "type")]
    kind: String,
    geometry: Geometry,
    properties: BTreeMap<String, Value>,
}
#[derive(Deserialize)]
struct Geometry {
    #[serde(rename = "type")]
    kind: String,
    coordinates: Value,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct Bounds {
    pub min: [f32; 3],
    pub max: [f32; 3],
}
impl Bounds {
    fn include(&mut self, position: [f32; 3]) {
        for (axis, value) in position.into_iter().enumerate() {
            self.min[axis] = self.min[axis].min(value);
            self.max[axis] = self.max[axis].max(value);
        }
    }
}
#[derive(Default, Debug)]
pub struct Mesh {
    pub vertices: Vec<[f32; 6]>,
    pub indices: Vec<u32>,
    pub bounds: Option<Bounds>,
    lookup: HashMap<[u32; 6], u32>,
}
impl Mesh {
    fn vertex(&mut self, value: [f32; 6]) -> CompileResult<u32> {
        if value.iter().any(|number| !number.is_finite()) {
            return Err("Mesh contains a non-finite Float32 coordinate/normal".into());
        }
        // Signed zeros describe the same position/normal; preserve all other exact
        // Float32 values so hard face normals are never welded together.
        let key = value.map(|v| if v == 0.0 { 0 } else { v.to_bits() });
        if let Some(index) = self.lookup.get(&key) {
            return Ok(*index);
        }
        if self.vertices.len() >= MAX_VERTICES {
            return Err("Mesh vertex limit exceeded".into());
        }
        let index = u32::try_from(self.vertices.len()).map_err(|_| "Vertex index exceeds u32")?;
        self.vertices.push(value);
        self.lookup.insert(key, index);
        let p = [value[0], value[1], value[2]];
        if let Some(bounds) = &mut self.bounds {
            bounds.include(p);
        } else {
            self.bounds = Some(Bounds { min: p, max: p });
        }
        Ok(index)
    }
    fn triangle(
        &mut self,
        positions: [[f64; 3]; 3],
        footprint: bool,
        offset: f64,
    ) -> CompileResult<()> {
        if self.indices.len() + 3 > MAX_INDICES {
            return Err("Mesh index limit exceeded".into());
        }
        // THREE first uploads untransformed positions to Float32. Its non-indexed
        // normal cross product is also stored in Float32 before normalization.
        let positions = positions.map(|p| p.map(|v| f64::from(v as f32)));
        let normal = if footprint {
            [0.0, 0.0, 1.0]
        } else {
            let cb = sub(positions[2], positions[1]);
            let ab = sub(positions[0], positions[1]);
            let cross = cross(cb, ab).map(|v| f64::from(v as f32));
            normalize(cross).map(|v| f64::from(v as f32))
        };
        // The exact Float64 values used by THREE.rotateX(-Math.PI / 2).
        // Pin them rather than allowing platform libm differences in asset bytes.
        let c = 6.123233995736766e-17_f64;
        let s = -1.0_f64;
        let rotated_normal = normalize([
            normal[0],
            c * normal[1] - s * normal[2],
            s * normal[1] + c * normal[2],
        ])
        .map(|v| v as f32);
        for p in positions {
            // rotateX() and translate() each write Float32 independently, just as
            // BufferGeometry does. Do not collapse the two rounding stages.
            let rotated = [
                p[0] as f32,
                (c * p[1] - s * p[2]) as f32,
                (s * p[1] + c * p[2]) as f32,
            ];
            let final_p = [
                rotated[0],
                (f64::from(rotated[1]) + offset) as f32,
                rotated[2],
            ];
            let index = self.vertex([
                final_p[0],
                final_p[1],
                final_p[2],
                rotated_normal[0],
                rotated_normal[1],
                rotated_normal[2],
            ])?;
            self.indices.push(index);
        }
        Ok(())
    }
    pub fn validate(&self) -> CompileResult<()> {
        if self.vertices.len() > MAX_VERTICES
            || self.indices.len() > MAX_INDICES
            || !self.indices.len().is_multiple_of(3)
        {
            return Err("Invalid mesh size".into());
        }
        if self.vertices.iter().flatten().any(|v| !v.is_finite()) {
            return Err("Non-finite mesh vertex".into());
        }
        if self
            .indices
            .iter()
            .any(|i| *i as usize >= self.vertices.len())
        {
            return Err("Mesh index outside vertex buffer".into());
        }
        Ok(())
    }
}
fn sub(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
fn cross(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}
fn normalize(v: [f64; 3]) -> [f64; 3] {
    let length = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
    let divisor = if length == 0.0 { 1.0 } else { length };
    v.map(|x| x / divisor)
}

pub fn sha256(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn valid_elevation(value: f64) -> bool {
    value.is_finite() && value > -1000.0 && value < 10000.0
}
fn number(value: Option<&Value>) -> Option<f64> {
    value.and_then(Value::as_f64).filter(|v| v.is_finite())
}
fn truthy(value: Option<&Value>) -> bool {
    match value {
        None | Some(Value::Null) => false,
        Some(Value::Bool(v)) => *v,
        Some(Value::Number(v)) => v.as_f64().is_some_and(|v| v != 0.0),
        Some(Value::String(v)) => !v.is_empty(),
        _ => true,
    }
}

#[derive(Clone)]
pub struct Projection {
    pub origin: Origin,
    pub east: f64,
    pub north: f64,
}
impl Projection {
    pub fn new(input: &PreparedInput) -> Self {
        let (east, north) = match input.projection_scale {
            Some([east, north]) => (east, north),
            None => {
                let deg = std::f64::consts::PI / 180.0;
                let lat = input.origin.latitude * deg;
                let a = 6_378_137.0;
                let e2 = 0.00669437999014;
                let w = (1.0 - e2 * lat.sin().powi(2)).sqrt();
                (
                    ((deg * a) / w) * lat.cos(),
                    (deg * a * (1.0 - e2)) / w.powi(3),
                )
            }
        };
        Self {
            origin: input.origin.clone(),
            east,
            north,
        }
    }
    pub fn project(&self, longitude: f64, latitude: f64) -> [f64; 2] {
        [
            (longitude - self.origin.longitude) * self.east,
            -(latitude - self.origin.latitude) * self.north,
        ]
    }
    pub fn unproject(&self, x: f64, z: f64) -> [f64; 2] {
        [
            self.origin.longitude + x / self.east,
            self.origin.latitude - z / self.north,
        ]
    }
}

pub fn terrain_elevation_at(
    input: &PreparedInput,
    projection: &Projection,
    x: f64,
    z: f64,
) -> Option<f64> {
    let grid = input.terrain_grid.as_ref()?;
    if grid.columns < 2
        || grid.rows < 2
        || grid.values.len() != grid.columns.checked_mul(grid.rows)?
    {
        return None;
    }
    let [lng, lat] = projection.unproject(x, z);
    let [west, south, east, north] = grid.bbox;
    if lng < west || lng > east || lat < south || lat > north || east <= west || north <= south {
        return None;
    }
    let gx = ((lng - west) / (east - west)) * (grid.columns - 1) as f64;
    let gy = ((north - lat) / (north - south)) * (grid.rows - 1) as f64;
    let ix = (gx.floor() as usize).min(grid.columns - 2);
    let iy = (gy.floor() as usize).min(grid.rows - 2);
    let u = gx - ix as f64;
    let v = gy - iy as f64;
    let values = [
        grid.values[iy * grid.columns + ix]?,
        grid.values[iy * grid.columns + ix + 1]?,
        grid.values[(iy + 1) * grid.columns + ix]?,
        grid.values[(iy + 1) * grid.columns + ix + 1]?,
    ];
    if !values.iter().all(|v| valid_elevation(*v)) {
        return None;
    }
    Some(
        values[0] * (1.0 - u) * (1.0 - v)
            + values[1] * u * (1.0 - v)
            + values[2] * (1.0 - u) * v
            + values[3] * u * v,
    )
}

struct Corridor<'a> {
    points: &'a [[f64; 2]],
    radius: f64,
    cells: HashMap<(i64, i64), Vec<usize>>,
}
impl<'a> Corridor<'a> {
    fn new(points: &'a [[f64; 2]], radius: f64) -> CompileResult<Self> {
        let mut cells: HashMap<(i64, i64), Vec<usize>> = HashMap::new();
        for (i, a) in points.iter().enumerate() {
            let b = points[(i + 1) % points.len()];
            let minx = ((a[0].min(b[0]) - radius) / radius).floor() as i64;
            let maxx = ((a[0].max(b[0]) + radius) / radius).floor() as i64;
            let minz = ((a[1].min(b[1]) - radius) / radius).floor() as i64;
            let maxz = ((a[1].max(b[1]) + radius) / radius).floor() as i64;
            if (maxx - minx + 1).saturating_mul(maxz - minz + 1) > 1_000_000 {
                return Err("Unbounded corridor segment".into());
            }
            for x in minx..=maxx {
                for z in minz..=maxz {
                    cells.entry((x, z)).or_default().push(i);
                }
            }
        }
        Ok(Self {
            points,
            radius,
            cells,
        })
    }
    fn contains(&self, x: f64, z: f64) -> bool {
        let key = (
            (x / self.radius).floor() as i64,
            (z / self.radius).floor() as i64,
        );
        for &i in self.cells.get(&key).into_iter().flatten() {
            let a = self.points[i];
            let b = self.points[(i + 1) % self.points.len()];
            let dx = b[0] - a[0];
            let dz = b[1] - a[1];
            let denom = dx * dx + dz * dz;
            let t = (((x - a[0]) * dx + (z - a[1]) * dz) / if denom == 0.0 { 1.0 } else { denom })
                .clamp(0.0, 1.0);
            if (x - a[0] - t * dx).powi(2) + (z - a[1] - t * dz).powi(2)
                <= self.radius * self.radius
            {
                return true;
            }
        }
        false
    }
}

fn area(ring: &[[f64; 2]]) -> f64 {
    let mut result = 0.0;
    for i in 0..ring.len() {
        let previous = ring[(i + ring.len() - 1) % ring.len()];
        let p = ring[i];
        result += previous[0] * p[1] - p[0] * previous[1];
    }
    result * 0.5
}
fn remove_closed_endpoint(ring: &mut Vec<[f64; 2]>) {
    if ring.len() > 2 && ring.first() == ring.last() {
        ring.pop();
    }
}
fn merge_overlapping(ring: &mut Vec<[f64; 2]>) {
    // Mirrors ExtrudeGeometry's relative 1e-10 adjacent-point threshold.
    if ring.is_empty() {
        return;
    }
    let mut previous = ring[0];
    let mut i = 1;
    while i <= ring.len() && !ring.is_empty() {
        let index = i % ring.len();
        let current = ring[index];
        let magnitude = current[0]
            .abs()
            .max(current[1].abs())
            .max(previous[0].abs())
            .max(previous[1].abs());
        let distance = (current[0] - previous[0]).powi(2) + (current[1] - previous[1]).powi(2);
        if distance <= 1e-20 * magnitude * magnitude {
            ring.remove(index);
            if ring.len() < 2 {
                break;
            }
            continue;
        }
        previous = current;
        i += 1;
    }
}
fn add_polygon(
    mesh: &mut Mesh,
    mut rings: Vec<Vec<[f64; 2]>>,
    solid: bool,
    depth: f64,
    offset: f64,
) -> CompileResult<()> {
    if rings.is_empty() {
        return Ok(());
    }
    let reverse = area(&rings[0]) >= 0.0;
    if reverse {
        rings[0].reverse();
    }
    // Match ShapeGeometry and ExtrudeGeometry's distinct winding rules. The
    // latter checks hole orientation only when it reversed the outer contour.
    if !solid || reverse {
        for ring in rings.iter_mut().skip(1) {
            if area(ring) < 0.0 {
                ring.reverse();
            }
        }
    }
    for ring in &mut rings {
        if solid {
            merge_overlapping(ring);
        }
        remove_closed_endpoint(ring);
    }
    if rings[0].len() < 3 {
        return Err("Degenerate outer ring after source point normalization".into());
    }
    let mut flattened = Vec::new();
    let mut holes = Vec::new();
    let mut vertices = Vec::new();
    for (index, ring) in rings.iter().enumerate() {
        if ring.len() < 3 {
            return Err("Degenerate polygon hole".into());
        }
        if index > 0 {
            holes.push(vertices.len());
        }
        for &p in ring {
            flattened.extend(p);
            vertices.push(p);
        }
    }
    let triangles = earcutr::earcut(&flattened, &holes, 2)
        .map_err(|e| format!("Polygon triangulation failed: {e:?}"))?;
    if triangles.len() % 3 != 0 || triangles.iter().any(|i| *i >= vertices.len()) {
        return Err("Invalid triangulation result".into());
    }
    let point = |i: usize, d: f64| [vertices[i][0], vertices[i][1], d];
    if solid {
        for f in triangles.chunks_exact(3) {
            mesh.triangle(
                [point(f[2], 0.0), point(f[1], 0.0), point(f[0], 0.0)],
                false,
                offset,
            )?;
        }
        for f in triangles.chunks_exact(3) {
            mesh.triangle(
                [point(f[0], depth), point(f[1], depth), point(f[2], depth)],
                false,
                offset,
            )?;
        }
        let mut ring_offset = 0;
        for ring in &rings {
            for j in (0..ring.len()).rev() {
                let k = if j == 0 { ring.len() - 1 } else { j - 1 };
                let a = point(ring_offset + j, 0.0);
                let b = point(ring_offset + k, 0.0);
                let c = point(ring_offset + k, depth);
                let d = point(ring_offset + j, depth);
                mesh.triangle([a, b, d], false, offset)?;
                mesh.triangle([b, c, d], false, offset)?;
            }
            ring_offset += ring.len();
        }
    } else {
        for f in triangles.chunks_exact(3) {
            mesh.triangle(
                [point(f[0], 0.0), point(f[1], 0.0), point(f[2], 0.0)],
                true,
                offset,
            )?;
        }
    }
    Ok(())
}

#[derive(Default, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Counts {
    pub source_feature_count: usize,
    pub feature_count: usize,
    pub solid_feature_count: usize,
    pub footprint_feature_count: usize,
    pub solid_polygon_count: usize,
    pub footprint_polygon_count: usize,
}
#[derive(Debug)]
pub struct Compilation {
    pub solid: Mesh,
    pub footprint: Mesh,
    pub counts: Counts,
}

fn validate_input(input: &PreparedInput) -> CompileResult<()> {
    if input.schema_version != 1 {
        return Err("Unsupported prepared schemaVersion".into());
    }
    if !input.origin.longitude.is_finite()
        || !input.origin.latitude.is_finite()
        || input.origin.longitude.abs() > 180.0
        || input.origin.latitude.abs() >= 90.0
    {
        return Err("Invalid projection origin".into());
    }
    if !input.elevation_base.is_finite()
        || !input.scene_scale.is_finite()
        || input.scene_scale <= 0.0
        || !input.corridor_metres.is_finite()
        || input.corridor_metres <= 0.0
    {
        return Err("Invalid scale, corridor or elevation base".into());
    }
    if input.points.len() < 3
        || input
            .points
            .iter()
            .flatten()
            .any(|x| !x.is_finite() || x.abs() > 100_000_000.0)
    {
        return Err("Invalid prepared track points".into());
    }
    if let Some(scales) = input.projection_scale {
        if scales.iter().any(|v| !v.is_finite() || *v <= 0.0) {
            return Err("Invalid prepared projectionScale".into());
        }
    }
    if let Some(grid) = &input.terrain_grid {
        if grid.columns < 2
            || grid.rows < 2
            || grid.values.len()
                != grid
                    .columns
                    .checked_mul(grid.rows)
                    .ok_or("Terrain grid dimensions overflow")?
            || grid.bbox.iter().any(|x| !x.is_finite())
            || grid.bbox[2] <= grid.bbox[0]
            || grid.bbox[3] <= grid.bbox[1]
        {
            return Err("Invalid terrain grid dimensions/bounds".into());
        }
        if grid.values.iter().flatten().any(|v| !v.is_finite()) {
            return Err("Non-finite terrain cell".into());
        }
    }
    for key in ["buildings", "context", "circuit"] {
        let hash = input
            .source_hashes
            .get(key)
            .ok_or_else(|| format!("Missing source hash: {key}"))?;
        if hash.len() != 64 || !hash.bytes().all(|b| b.is_ascii_hexdigit()) {
            return Err(format!("Invalid SHA256 for {key}"));
        }
    }
    Ok(())
}
pub fn compile(input: &PreparedInput, source: &[u8]) -> CompileResult<Compilation> {
    validate_input(input)?;
    if sha256(source) != input.source_hashes["buildings"].to_ascii_lowercase() {
        return Err("Original building source SHA256 differs from prepared input".into());
    }
    let collection: Collection =
        serde_json::from_slice(source).map_err(|e| format!("Malformed building GeoJSON: {e}"))?;
    if collection.kind != "FeatureCollection" {
        return Err("Buildings source must be a FeatureCollection".into());
    }
    let projection = Projection::new(input);
    let corridor = Corridor::new(&input.points, input.corridor_metres)?;
    let mut output = Compilation {
        solid: Mesh::default(),
        footprint: Mesh::default(),
        counts: Counts {
            source_feature_count: collection.features.len(),
            ..Counts::default()
        },
    };
    for (feature_index, feature) in collection.features.into_iter().enumerate() {
        if feature.kind != "Feature" {
            return Err(format!("Feature {feature_index} is not GeoJSON Feature"));
        }
        let polygons: Vec<Vec<Vec<Vec<f64>>>> = match feature.geometry.kind.as_str() {
            "Polygon" => vec![
                serde_json::from_value(feature.geometry.coordinates)
                    .map_err(|e| format!("Feature {feature_index} Polygon coordinates: {e}"))?,
            ],
            "MultiPolygon" => serde_json::from_value(feature.geometry.coordinates)
                .map_err(|e| format!("Feature {feature_index} MultiPolygon coordinates: {e}"))?,
            kind => {
                return Err(format!(
                    "Unsupported building geometry {kind} at feature {feature_index}"
                ));
            }
        };
        let height = number(feature.properties.get("height"));
        let known =
            height.is_some_and(|v| v > 0.0) && truthy(feature.properties.get("heightSource"));
        let mut included = false;
        let mut solid_feature = false;
        let mut footprint_feature = false;
        for rings in polygons {
            if rings.is_empty() || rings[0].len() < 4 {
                continue;
            }
            if rings.iter().flatten().any(|p| {
                p.len() < 2
                    || !p[0].is_finite()
                    || !p[1].is_finite()
                    || p[0].abs() > 180.0
                    || p[1].abs() > 90.0
            }) {
                return Err(format!(
                    "Malformed/non-finite building coordinate at feature {feature_index}"
                ));
            }
            let n = rings[0].len() as f64;
            let mut centre = [0.0, 0.0];
            for p in &rings[0] {
                centre[0] += p[0] / n;
                centre[1] += p[1] / n;
            }
            let [cx, cz] = projection.project(centre[0], centre[1]);
            if !corridor.contains(cx, cz) {
                continue;
            }
            let ground = match feature.properties.get("groundElevation") {
                Some(v) if !v.is_null() => Some(v),
                _ => feature.properties.get("altitude_minimale_sol"),
            };
            let base = number(ground)
                .filter(|v| valid_elevation(*v))
                .or_else(|| terrain_elevation_at(input, &projection, cx, cz));
            let solid = known && base.is_some();
            let depth = height.unwrap_or(0.0) * input.scene_scale;
            let offset =
                base.map_or(0.0, |v| (v - input.elevation_base) * input.scene_scale) + 0.006;
            let projected = rings
                .into_iter()
                .map(|ring| {
                    ring.into_iter()
                        .map(|p| {
                            let [x, z] = projection.project(p[0], p[1]);
                            [x * input.scene_scale, -z * input.scene_scale]
                        })
                        .collect()
                })
                .collect();
            if solid {
                add_polygon(&mut output.solid, projected, true, depth, offset)?;
                output.counts.solid_polygon_count += 1;
                solid_feature = true;
            } else {
                add_polygon(&mut output.footprint, projected, false, 0.0, offset)?;
                output.counts.footprint_polygon_count += 1;
                footprint_feature = true;
            }
            included = true;
        }
        if included {
            output.counts.feature_count += 1;
        }
        if solid_feature {
            output.counts.solid_feature_count += 1;
        }
        if footprint_feature {
            output.counts.footprint_feature_count += 1;
        }
    }
    output.solid.validate()?;
    output.footprint.validate()?;
    Ok(output)
}

pub fn encode(compiled: &Compilation) -> CompileResult<Vec<u8>> {
    compiled.solid.validate()?;
    compiled.footprint.validate()?;
    let mut out = Vec::with_capacity(
        HEADER_BYTES
            + (compiled.solid.vertices.len() + compiled.footprint.vertices.len()) * 24
            + (compiled.solid.indices.len() + compiled.footprint.indices.len()) * 4,
    );
    out.extend(MAGIC);
    for number in [
        1,
        compiled.solid.vertices.len() as u32,
        compiled.solid.indices.len() as u32,
        compiled.footprint.vertices.len() as u32,
        compiled.footprint.indices.len() as u32,
        0,
    ] {
        out.extend(number.to_le_bytes());
    }
    for mesh in [&compiled.solid, &compiled.footprint] {
        // Separate contiguous position and normal arrays improve gzip while
        // retaining zero-copy Float32 views and the exact deduplicated vertices.
        for component_range in [0..3, 3..6] {
            for vertex in &mesh.vertices {
                for value in &vertex[component_range.clone()] {
                    out.extend(value.to_le_bytes());
                }
            }
        }
        for index in &mesh.indices {
            out.extend(index.to_le_bytes());
        }
    }
    Ok(out)
}

pub fn gzip(binary: &[u8]) -> CompileResult<Vec<u8>> {
    use std::io::Write;
    let mut encoder = flate2::GzBuilder::new()
        .mtime(0)
        .operating_system(255)
        .write(Vec::new(), flate2::Compression::new(9));
    encoder
        .write_all(binary)
        .map_err(|error| format!("Gzip encode: {error}"))?;
    encoder
        .finish()
        .map_err(|error| format!("Gzip finish: {error}"))
}

pub fn manifest(
    input: &PreparedInput,
    compiled: &Compilation,
    binary: &[u8],
    compressed: &[u8],
    binary_url: &str,
    input_hash: &str,
) -> Value {
    let mut bounds = compiled
        .solid
        .bounds
        .clone()
        .or_else(|| compiled.footprint.bounds.clone());
    if let (Some(global), Some(footprint)) = (&mut bounds, &compiled.footprint.bounds) {
        global.include(footprint.min);
        global.include(footprint.max);
    }
    let mesh = |m: &Mesh| serde_json::json!({"vertexCount":m.vertices.len(),"indexCount":m.indices.len(),"triangleCount":m.indices.len()/3,"bounds":m.bounds});
    let mut result = serde_json::json!({
        "schemaVersion":1,"binary":binary_url,"binarySha256":sha256(binary),"binaryBytes":binary.len(),
        "compressedSha256":sha256(compressed),"compressedBytes":compressed.len(),
        "origin":[input.origin.longitude,input.origin.latitude],"elevationBase":input.elevation_base,
        "sceneScale":input.scene_scale,"corridorMetres":input.corridor_metres,"sourceHashes":input.source_hashes,
        "preparedInputSha256":input_hash,"bounds":bounds,"meshes":{"solid":mesh(&compiled.solid),"footprint":mesh(&compiled.footprint)},
        "compiler":{"name":"sarthe-circuit-mesh","version":env!("CARGO_PKG_VERSION"),"language":"Rust","earcutr":"0.5.0"},
        "provenance":input.provenance,
    });
    let counts = serde_json::to_value(&compiled.counts).expect("counts serialize");
    for (key, value) in counts.as_object().expect("counts object") {
        result[key] = value.clone();
    }
    result
}

#[cfg(test)]
mod tests;
