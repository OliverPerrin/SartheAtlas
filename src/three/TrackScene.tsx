import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import type { ClassName } from "../data/cars.ts";
import { classOrder } from "../data/cars.ts";
import { lapTargets, sections } from "../data/track.ts";
import type { TrackGeo } from "../data/trackGeo.ts";
import { loadPreparedBuildings } from "../data/preparedBuildings.ts";
import type {
  PreparedBuildings,
  PreparedMeshSection,
  PreparedMeshMetadata,
} from "../data/preparedBuildings.ts";
import {
  fractionAtTime,
  pointAt,
  speedModel,
  projectLngLat,
  terrainElevationAt,
} from "../data/trackGeo.ts";
import type { SpeedModel } from "../data/trackGeo.ts";
import { SceneBoundary } from "./CarScene.tsx";
import { Label, ViewCtx } from "./primitives.tsx";
import type { ViewState } from "./primitives.tsx";
import { CarModel } from "./CarModel.tsx";
import { carById } from "../data/cars.ts";
import { entries } from "../data/entries.ts";
import { namedCorners } from "../components/TrackMap.tsx";

const S = 0.1; // scene units per metre
// Spread the three cars around the lap at the start.
const offsets: Record<ClassName, number> = { Hypercar: 70, LMP2: 35, LMGT3: 0 };
// The car shown for each class.
const reps = Object.fromEntries(
  (
    [
      ["Hypercar", "50"],
      ["LMP2", "22"],
      ["LMGT3", "91"],
    ] as [ClassName, string][]
  ).map(([c, n]) => {
    const entry = entries.find((e) => e.number === n)!;
    return [c, { entry, car: carById(entry.carId)! }];
  }),
) as Record<
  ClassName,
  {
    entry: (typeof entries)[number];
    car: NonNullable<ReturnType<typeof carById>>;
  }
>;
const noop = () => undefined;

export type ColorMode = "sections" | "speed";
export type CamMode = "overview" | "follow";
export type Tick = {
  cls: ClassName;
  speed: number;
  fraction: number;
  lap: number;
  elapsed: number;
};

type Props = {
  cameraReset?: number;
  track: TrackGeo;
  mode: ColorMode;
  night: boolean;
  playing: boolean;
  timeScale: number;
  cam: CamMode;
  follow: ClassName;
  activeCorner: string | null;
  onCorner: (name: string) => void;
  onTick: (t: Tick) => void;
  visible: Record<ClassName, boolean>;
};

function speedColor(kmh: number) {
  const c = new THREE.Color();
  const t = Math.min(1, Math.max(0, (kmh - 80) / 250));
  if (t < 0.5)
    c.lerpColors(new THREE.Color("#ff2d4a"), new THREE.Color("#ffc21a"), t * 2);
  else
    c.lerpColors(
      new THREE.Color("#ffc21a"),
      new THREE.Color("#35d1ff"),
      (t - 0.5) * 2,
    );
  return c;
}

function useGeometry(track: TrackGeo, model: SpeedModel) {
  return useMemo(() => {
    const pts = track.points.map(
      ([x, z], i) =>
        new THREE.Vector3(
          x * S,
          ((track.elevations[i] ?? track.elevationBase) - track.elevationBase) *
            S,
          z * S,
        ),
    );
    const secColors: [number, number, number][] = [];
    const spdColors: [number, number, number][] = [];
    for (let i = 0; i <= pts.length; i++) {
      const f = track.cum[i % pts.length] / track.length;
      const section =
        sections.find((x) => f >= x.from && f < x.to) ?? sections[0];
      secColors.push(
        new THREE.Color(section.color).toArray() as [number, number, number],
      );
      const kmh =
        model.speeds[
          Math.min(
            model.speeds.length - 1,
            Math.floor((f * track.length) / model.step),
          )
        ] * 3.6;
      spdColors.push(speedColor(kmh).toArray() as [number, number, number]);
    }
    // This is an analytical centreline overlay, not a guessed asphalt width or kerb layout.
    const segments: {
      line: [number, number, number][];
      secColors: [number, number, number][];
      spdColors: [number, number, number][];
    }[] = [];
    const hasElevation = track.elevations.some(
      (elevation) => elevation !== null,
    );
    let current: {
      line: [number, number, number][];
      secColors: [number, number, number][];
      spdColors: [number, number, number][];
    } = { line: [], secColors: [], spdColors: [] };
    for (let i = 0; i <= pts.length; i++) {
      if (hasElevation && track.elevations[i % pts.length] === null) {
        if (current.line.length > 1) segments.push(current);
        current = { line: [], secColors: [], spdColors: [] };
        continue;
      }
      const p = pts[i % pts.length];
      current.line.push([p.x, p.y + 0.035, p.z]);
      current.secColors.push(secColors[i]);
      current.spdColors.push(spdColors[i]);
    }
    if (current.line.length > 1) segments.push(current);
    return { segments };
  }, [track, model]);
}

function Terrain({ track, night }: { track: TrackGeo; night: boolean }) {
  const geometry = useMemo(() => {
    const grid = track.context?.terrainGrid;
    if (
      !grid ||
      grid.columns < 2 ||
      grid.rows < 2 ||
      grid.values.length !== grid.columns * grid.rows
    )
      return null;
    const [west, south, east, north] = grid.bbox;
    const pos: number[] = [],
      indices: number[] = [],
      colors: number[] = [];
    const low = new THREE.Color("#3e5548"),
      high = new THREE.Color("#839178");
    const known = grid.values.filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v),
    );
    const min = Math.min(...known),
      range = Math.max(...known) - min || 1;
    for (let row = 0; row < grid.rows; row++)
      for (let col = 0; col < grid.columns; col++) {
        const i = row * grid.columns + col,
          altitude = grid.values[i];
        const [x, z] = projectLngLat(
          track,
          west + ((east - west) * col) / (grid.columns - 1),
          north - ((north - south) * row) / (grid.rows - 1),
        );
        pos.push(
          x * S,
          (typeof altitude === "number" && Number.isFinite(altitude)
            ? altitude - track.elevationBase
            : 0) * S,
          z * S,
        );
        const color = low
          .clone()
          .lerp(
            high,
            typeof altitude === "number" ? (altitude - min) / range : 0,
          );
        colors.push(color.r, color.g, color.b);
        if (row < grid.rows - 1 && col < grid.columns - 1) {
          const cell = [i, i + 1, i + grid.columns, i + grid.columns + 1];
          if (
            cell.every(
              (index) =>
                typeof grid.values[index] === "number" &&
                Number.isFinite(grid.values[index]),
            )
          )
            indices.push(
              i,
              i + grid.columns,
              i + 1,
              i + 1,
              i + grid.columns,
              i + grid.columns + 1,
            );
        }
      }
    if (!indices.length) return null;
    const mesh = new THREE.BufferGeometry();
    mesh.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    mesh.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    mesh.setIndex(indices);
    mesh.computeVertexNormals();
    return mesh;
  }, [track]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) {
    const { minX, maxX, minZ, maxZ } = track.bounds;
    return (
      <mesh
        rotation-x={-Math.PI / 2}
        position={[((minX + maxX) / 2) * S, -0.025, ((minZ + maxZ) / 2) * S]}
      >
        <planeGeometry
          args={[(maxX - minX + 500) * S, (maxZ - minZ + 500) * S]}
        />
        <meshStandardMaterial
          color={night ? "#080d13" : "#46534d"}
          roughness={1}
        />
      </mesh>
    );
  }
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={1}
        side={THREE.DoubleSide}
        color={night ? "#39495b" : "#ffffff"}
      />
    </mesh>
  );
}

function MappedBuildings({
  data,
  night,
}: {
  data?: PreparedBuildings;
  night: boolean;
}) {
  const batches = useMemo(() => {
    const geometry = (
      section: PreparedMeshSection | undefined,
      metadata?: PreparedMeshMetadata,
    ) => {
      if (!section?.indices.length) return null;
      const mesh = new THREE.BufferGeometry();
      mesh.setAttribute(
        "position",
        new THREE.BufferAttribute(section.positions, 3),
      );
      mesh.setAttribute(
        "normal",
        new THREE.BufferAttribute(section.normals, 3),
      );
      mesh.setIndex(new THREE.BufferAttribute(section.indices, 1));
      if (metadata?.bounds) {
        mesh.boundingBox = new THREE.Box3(
          new THREE.Vector3(...metadata.bounds.min),
          new THREE.Vector3(...metadata.bounds.max),
        );
        mesh.boundingSphere = mesh.boundingBox.getBoundingSphere(
          new THREE.Sphere(),
        );
      } else {
        mesh.computeBoundingBox();
        mesh.computeBoundingSphere();
      }
      return mesh;
    };
    return {
      solid: geometry(data?.solid, data?.manifest.meshes?.solid),
      footprint: geometry(data?.footprint, data?.manifest.meshes?.footprint),
    };
  }, [data]);
  useEffect(
    () => () => {
      batches.solid?.dispose();
      batches.footprint?.dispose();
    },
    [batches],
  );
  return (
    <group>
      {batches.solid && (
        <mesh geometry={batches.solid} receiveShadow>
          <meshStandardMaterial
            color={night ? "#39404a" : "#c9c9bd"}
            roughness={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {batches.footprint && (
        <mesh geometry={batches.footprint}>
          <meshStandardMaterial
            color={night ? "#39404a" : "#a4b8ae"}
            roughness={1}
            side={THREE.DoubleSide}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </group>
  );
}

let beam: THREE.CanvasTexture | null = null;
function beamTexture() {
  if (beam) return beam;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, "rgba(255,244,214,0.55)");
  g.addColorStop(1, "rgba(255,244,214,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 56);
  ctx.lineTo(256, 0);
  ctx.lineTo(256, 128);
  ctx.lineTo(0, 72);
  ctx.fill();
  beam = new THREE.CanvasTexture(c);
  return beam;
}

function RaceCar({
  color,
  glow,
  marker,
}: {
  color: string;
  glow: number;
  marker: boolean;
}) {
  return (
    <group>
      <mesh
        position={[0, 0.004, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={marker}
      >
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
      {glow > 0 && (
        <mesh position={[1.7, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3, 1.6]} />
          <meshBasicMaterial
            map={beamTexture()}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

function Cars({
  track,
  models,
  playing,
  timeScale,
  cam,
  follow,
  onTick,
  visible,
  night,
}: {
  track: TrackGeo;
  models: Record<ClassName, SpeedModel>;
  playing: boolean;
  timeScale: number;
  cam: CamMode;
  follow: ClassName;
  onTick: (t: Tick) => void;
  visible: Record<ClassName, boolean>;
  night: boolean;
}) {
  const refs = useRef<Record<string, THREE.Group | null>>({});
  const views = useMemo(
    () =>
      Object.fromEntries(
        classOrder.map((c) => [
          c,
          {
            car: reps[c].car,
            selected: null,
            hovered: null,
            rules: false,
            xray: false,
            focus: false,
            night,
          },
        ]),
      ) as Record<ClassName, ViewState>,
    [night],
  );
  const time = useRef(0);
  const last = useRef(0);
  const { camera } = useThree();
  const tickChanged = useRef(true);
  useEffect(() => {
    tickChanged.current = true;
  }, [follow, playing, cam, visible]);
  const camPos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    if (playing) time.current += Math.min(dt, 0.1) * timeScale;
    for (const cls of classOrder) {
      const g = refs.current[cls];
      if (!g) continue;
      const m = models[cls];
      const f = fractionAtTime(m, time.current + offsets[cls], track.length);
      const p = pointAt(track, f);
      const ahead = pointAt(track, f + 12 / track.length);
      g.position.set(p.x * S, p.y * S + 0.0035, p.z * S);
      // Ride attitude is an illustrative local ground tangent, not surveyed pavement/banking.
      // A 20 m window avoids treating sub-metre vertex spacing and ground-model pits as suspension input.
      const rear = pointAt(track, f - 10 / track.length),
        front = pointAt(track, f + 10 / track.length);
      const heading = Math.atan2(ahead.z - p.z, ahead.x - p.x);
      const pitch =
        rear.elevation !== null && front.elevation !== null
          ? Math.atan2(
              front.y - rear.y,
              Math.hypot(front.x - rear.x, front.z - rear.z),
            )
          : 0;
      const targetPitch = pitch;
      const currentPitch = g.rotation.z;
      g.rotation.set(
        0,
        -heading,
        THREE.MathUtils.lerp(currentPitch, targetPitch, 1 - Math.exp(-dt * 8)),
        "YXZ",
      );
      if (cam === "follow" && cls === follow) {
        const hx = Math.cos(-g.rotation.y),
          hz = Math.sin(-g.rotation.y);
        camPos.set(
          g.position.x - hx * 1.4,
          g.position.y + 0.56,
          g.position.z - hz * 1.4,
        );
        camera.position.copy(camPos);
        look.set(ahead.x * S, ahead.y * S + 0.12, ahead.z * S);
        camera.lookAt(look);
      }
    }
    if (
      tickChanged.current ||
      (playing && state.clock.elapsedTime - last.current > 0.12)
    ) {
      tickChanged.current = false;
      last.current = state.clock.elapsedTime;
      const m = models[follow];
      const t = time.current + offsets[follow];
      const f = fractionAtTime(m, t, track.length);
      const i = Math.min(
        m.speeds.length - 1,
        Math.floor((f * track.length) / m.step),
      );
      onTick({
        cls: follow,
        speed: m.speeds[i] * 3.6,
        fraction: f,
        lap: m.lapTime,
        elapsed: ((t % m.lapTime) + m.lapTime) % m.lapTime,
      });
    }
  });
  return (
    <>
      {classOrder.map((cls) => (
        <group
          key={cls}
          ref={(g) => void (refs.current[cls] = g)}
          visible={visible[cls]}
        >
          <RaceCar
            color={lapTargets[cls].color}
            glow={night ? 1 : 0}
            marker={!(cam === "follow" && cls === follow)}
          />
          <group scale={S}>
            <ViewCtx.Provider value={views[cls]}>
              <CarModel
                car={reps[cls].car}
                entry={reps[cls].entry}
                paint="livery"
                exploded={0}
                onSelect={noop}
                onHover={noop}
                fontsReady
              />
            </ViewCtx.Provider>
          </group>
          {!(cam === "follow" && cls === follow) && (
            <Label
              text={cls}
              position={[0, 0.9, 0]}
              size={0.025}
              screen
              color="#fff"
              bg={lapTargets[cls].color}
            />
          )}
        </group>
      ))}
    </>
  );
}

function CameraDirector({
  track,
  active,
  cam,
  reset,
}: {
  track: TrackGeo;
  active: string | null;
  cam: CamMode;
  reset?: number;
}) {
  const { camera, invalidate } = useThree();
  const controls = useThree((s) => s.controls) as unknown as OrbitImpl | null;
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(
    null,
  );
  const placed = useRef(false);
  const cx = ((track.bounds.minX + track.bounds.maxX) / 2) * S,
    cz = ((track.bounds.minZ + track.bounds.maxZ) / 2) * S;
  const span =
    Math.max(
      track.bounds.maxX - track.bounds.minX,
      track.bounds.maxZ - track.bounds.minZ,
    ) * S;
  useEffect(() => {
    if (cam !== "overview") return;
    const c = active ? track.corners.find((x) => x.name === active) : null;
    const cy =
      (c
        ? pointAt(track, c.fraction).y
        : (terrainElevationAt(track, cx / S, cz / S) ?? track.elevationBase) -
          track.elevationBase) * S;
    goal.current = c
      ? {
          pos: new THREE.Vector3(c.x * S + 26, cy + 34, c.z * S + 30),
          target: new THREE.Vector3(c.x * S, cy, c.z * S),
        }
      : {
          pos: new THREE.Vector3(cx - span * 0.1, span * 1.3, cz + span * 0.95),
          target: new THREE.Vector3(cx - span * 0.12, cy, cz + span * 0.08),
        };
    invalidate();
    if (!placed.current && controls) {
      placed.current = true;
      camera.position.copy(goal.current.pos);
      controls.target.copy(goal.current.target);
      controls.update();
      goal.current = null;
    }
  }, [active, cam, reset, track, cx, cz, span, camera, controls, invalidate]);
  useFrame((_, dt) => {
    if (!goal.current || !controls || cam !== "overview") return;
    const k = 1 - Math.exp(-dt * 3);
    camera.position.lerp(goal.current.pos, k);
    controls.target.lerp(goal.current.target, k);
    controls.update();
    if (camera.position.distanceTo(goal.current.pos) < 0.5) goal.current = null;
    else invalidate();
  });
  return null;
}

function World(p: Props & { buildings?: PreparedBuildings }) {
  const models = useMemo(
    () =>
      Object.fromEntries(
        classOrder.map((c) => [c, speedModel(p.track, c)]),
      ) as Record<ClassName, SpeedModel>,
    [p.track],
  );
  const g = useGeometry(p.track, models[p.follow]);
  const { minX, maxX, minZ, maxZ } = p.track.bounds;
  const cx = ((minX + maxX) / 2) * S,
    cz = ((minZ + maxZ) / 2) * S;
  const seen = new Set<string>();
  const markers = p.track.corners.filter((c) => {
    const shown =
      [1, 6, 7, 8, 9, 10, 12, 14, 18].includes(c.number) ||
      c.name === p.activeCorner;
    if (!namedCorners.includes(c.number) || !shown || seen.has(c.name))
      return false;
    seen.add(c.name);
    return true;
  });
  const bg = p.night ? "#02040b" : "#8ea6c9";
  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 700, 2400]} />
      <hemisphereLight
        args={[
          p.night ? "#1a2350" : "#dfe9ff",
          p.night ? "#020308" : "#2b3a2c",
          p.night ? 0.35 : 1.2,
        ]}
      />
      <directionalLight
        position={[cx - 200, 300, cz + 150]}
        intensity={p.night ? 0.15 : 2.2}
        color={p.night ? "#6d86ff" : "#fff4e0"}
      />
      <Terrain track={p.track} night={p.night} />
      {g.segments.map((segment, index) => (
        <Line
          key={index}
          points={segment.line}
          vertexColors={
            p.mode === "speed" ? segment.spdColors : segment.secColors
          }
          lineWidth={p.cam === "follow" ? 1.5 : p.night ? 4.5 : 4}
          transparent
          opacity={0.95}
          toneMapped={false}
        />
      ))}
      <MappedBuildings data={p.buildings} night={p.night} />
      {markers.map((c) => (
        <Label
          key={c.number}
          text={`${c.number}  ${c.name}`}
          position={[
            c.x * S,
            pointAt(p.track, c.fraction).y * S + 3.2,
            c.z * S,
          ]}
          size={0.024}
          screen
          color={p.activeCorner === c.name ? "#ffffff" : "#dfe6ff"}
          bg={
            p.activeCorner === c.name
              ? "rgba(61,123,255,0.95)"
              : "rgba(8,12,30,0.8)"
          }
          onClick={() => p.onCorner(c.name)}
        />
      ))}
      <Cars
        track={p.track}
        models={models}
        playing={p.playing}
        timeScale={p.timeScale}
        cam={p.cam}
        follow={p.follow}
        onTick={p.onTick}
        visible={p.visible}
        night={p.night}
      />
      <CameraDirector
        track={p.track}
        active={p.activeCorner}
        cam={p.cam}
        reset={p.cameraReset}
      />
      <OrbitControls
        makeDefault
        enabled={p.cam === "overview"}
        maxPolarAngle={Math.PI * 0.46}
        minDistance={8}
        maxDistance={900}
        enableDamping
      />
    </>
  );
}

export function TrackScene(p: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (!host.current) return;
    let inView = true;
    const update = () => setActive(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    observer.observe(host.current);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const [prepared, setPrepared] = useState<{
    base: TrackGeo;
    data?: PreparedBuildings;
    failed?: boolean;
  } | null>(null);
  const buildings = prepared?.base === p.track ? prepared.data : undefined;
  const buildingState = buildings
    ? "ready"
    : prepared?.base === p.track && prepared.failed
      ? "unavailable"
      : p.track.context?.layers?.buildings
        ? "loading"
        : "unavailable";
  useEffect(() => {
    if (!p.track.context?.layers?.buildings) return;
    let live = true;
    loadPreparedBuildings(p.track)
      .then((data) => {
        if (live) setPrepared({ base: p.track, data });
      })
      .catch(() => {
        if (live) setPrepared({ base: p.track, failed: true });
      });
    return () => {
      live = false;
    };
  }, [p.track]);
  return (
    <SceneBoundary>
      <div
        style={{ width: "100%", height: "100%", position: "relative" }}
        ref={host}
        data-context-status={p.track.contextStatus}
        data-buildings-status={buildingState}
      >
        <Canvas
          aria-label="Sourced circuit elevation and mapped building study"
          dpr={[1, 1.5]}
          frameloop={active && p.playing ? "always" : "demand"}
          camera={{ position: [0, 700, 600], fov: 38, near: 0.5, far: 5000 }}
          gl={{ antialias: true }}
        >
          <World {...p} playing={active && p.playing} buildings={buildings} />
        </Canvas>
        <div
          role="status"
          style={{
            position: "absolute",
            right: 16,
            bottom: 88,
            padding: "8px 12px",
            maxWidth: 280,
            color: "#e4ebf3",
            background: "rgba(8,12,20,.8)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 4,
            fontSize: 11,
            lineHeight: 1.6,
            pointerEvents: "none",
          }}
        >
          {p.track.contextStatus === "unavailable"
            ? "Elevation/context unavailable. Flat circuit fallback."
            : !p.track.context?.terrainGrid
              ? "Sourced road elevations; terrain surface unavailable."
              : buildingState === "loading"
                ? "IGN terrain. Loading mapped building footprints…"
                : buildingState === "unavailable"
                  ? "IGN terrain. Building footprints unavailable."
                  : "IGN terrain and sourced building footprints within 600 m of the course. Simplified massing; unknown heights stay flat. Estimated ride attitude."}
        </div>
      </div>
    </SceneBoundary>
  );
}
