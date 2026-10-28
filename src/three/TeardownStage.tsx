import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Car } from "../data/cars.ts";
import { buildStreamlines, speedColor } from "./aeroField.ts";
import { useBody } from "./CarModel.tsx";
import { useTeardown } from "./teardownLayout.ts";
import type { LayoutTag, LayoutZone } from "./teardown.ts";
import { systems } from "../data/systems.ts";

const noRaycast = () => null;

/** Advances build playback while it runs; the scene renders on demand otherwise. */
export function BuildDriver() {
  const { clock, mode } = useTeardown();
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => clock.subscribe(() => invalidate()), [clock, invalidate]);
  useFrame((_, dt) => {
    if (mode === "build" && clock.tick(Math.min(dt, 0.05))) invalidate();
  });
  return null;
}

function zoneLabel(
  text: string,
  color = "rgba(240, 214, 120, 0.92)",
  weight = 700,
) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  const font = `${weight} 64px 'Barlow Condensed', 'Arial Narrow', sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text.toUpperCase()).width) + 24;
  c.width = w;
  c.height = 84;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), 12, 44);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, aspect: w / 84 };
}

function Zone({ zone }: { zone: LayoutZone }) {
  const outline = useMemo(() => {
    const y = 0.004;
    const pts = [
      [zone.x0, y, zone.z0],
      [zone.x1, y, zone.z0],
      [zone.x1, y, zone.z1],
      [zone.x0, y, zone.z1],
      [zone.x0, y, zone.z0],
    ].map((p) => new THREE.Vector3(...(p as [number, number, number])));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color: "#d9b84f",
        transparent: true,
        opacity: 0.75,
      }),
    );
    line.raycast = noRaycast;
    return line;
  }, [zone]);
  const label = useMemo(
    () => (zone.label ? zoneLabel(zone.label) : null),
    [zone.label],
  );
  useEffect(
    () => () => {
      outline.geometry.dispose();
      (outline.material as THREE.Material).dispose();
      label?.texture.dispose();
    },
    [outline, label],
  );
  const h = 0.4;
  return (
    <group>
      <primitive object={outline} />
      {label && (
        <mesh
          position={[zone.x0 + (h * label.aspect) / 2, 0.006, zone.z0 - 0.28]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={noRaycast}
        >
          <planeGeometry args={[h * label.aspect, h]} />
          <meshBasicMaterial
            map={label.texture}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

function floorTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#20262d";
  ctx.fillRect(0, 0, 512, 512);
  // Fine speckle, like a sealed epoxy garage floor.
  for (let i = 0; i < 2600; i++) {
    const v = 26 + Math.random() * 14;
    ctx.fillStyle = `rgba(${v + 10},${v + 16},${v + 22},0.5)`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.4, 1.4);
  }
  ctx.strokeStyle = "rgba(160,176,196,0.16)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 510, 510);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Pit-garage floor with taped zones for each row of the layout. */
function Tag({ tag }: { tag: LayoutTag }) {
  const name = systems.find((s) => s.id === tag.system)?.name ?? tag.system;
  const label = useMemo(
    () =>
      zoneLabel(
        tag.count > 1 ? `${name} ×${tag.count}` : name,
        "rgba(214, 224, 236, 0.85)",
        600,
      ),
    [name, tag.count],
  );
  useEffect(() => () => label.texture.dispose(), [label]);
  const h = 0.2;
  return (
    <mesh
      position={[tag.x, 0.006, tag.z + h / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      raycast={noRaycast}
    >
      <planeGeometry args={[h * label.aspect, h]} />
      <meshBasicMaterial
        map={label.texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function GarageFloor() {
  const { garage } = useTeardown();
  useSyncExternalStore(garage.subscribe, garage.getVersion);
  const layout = garage.current();
  const texture = useMemo(() => floorTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  const { bounds } = layout;
  const size: [number, number] = [
    bounds.x1 - bounds.x0 + 4,
    bounds.z1 - bounds.z0 + 4,
  ];
  texture.repeat.set(size[0], size[1]);
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[
          (bounds.x0 + bounds.x1) / 2,
          -0.002,
          (bounds.z0 + bounds.z1) / 2,
        ]}
        receiveShadow
        raycast={noRaycast}
      >
        <planeGeometry args={size} />
        <meshStandardMaterial
          map={texture}
          roughness={0.55}
          metalness={0.05}
          envMapIntensity={0.35}
        />
      </mesh>
      {layout.tags.map((tag) => (
        <Tag
          key={`${tag.system}/${tag.x.toFixed(2)}/${tag.z.toFixed(2)}`}
          tag={tag}
        />
      ))}
      {layout.zones.map((zone, i) => (
        <Zone
          key={`${i}/${zone.label}/${zone.x0.toFixed(2)}/${zone.z0.toFixed(2)}`}
          zone={zone}
        />
      ))}
    </group>
  );
}

/** Flags rewritten buffers for upload on the next frame. */
function markUploaded(...attributes: THREE.BufferAttribute[]) {
  for (const attribute of attributes) attribute.needsUpdate = true;
}

const PARTICLES = 12;
const TRAIL = 7;
const TRAIL_STEP = 0.022;

/** Speed-coloured streamlines with particles riding them, drawn over the study body. */
export function AeroFlow({ car, animate }: { car: Car; animate: boolean }) {
  const { body, shape } = useBody(car);
  const lines = useMemo(() => buildStreamlines(body, shape), [body, shape]);
  const invalidate = useThree((s) => s.invalidate);

  const paths = useMemo(() => {
    let segments = 0;
    for (const line of lines) segments += line.speed.length - 1;
    const position = new Float32Array(segments * 6);
    const color = new Float32Array(segments * 8);
    let o = 0;
    for (const line of lines)
      for (let i = 0; i < line.speed.length - 1; i++)
        for (const k of [i, i + 1]) {
          position.set(line.points.subarray(k * 3, k * 3 + 3), o * 3);
          const [r, g, b] = speedColor(line.speed[k]);
          color.set([r, g, b, line.kind === "vortex" ? 0.32 : 0.16], o * 4);
          o++;
        }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(color, 4));
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const object = new THREE.LineSegments(geometry, material);
    object.raycast = noRaycast;
    object.renderOrder = 20;
    return object;
  }, [lines]);

  const streaks = useMemo(() => {
    const count = lines.length * PARTICLES * (TRAIL - 1) * 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(count * 4), 4),
    );
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const object = new THREE.LineSegments(geometry, material);
    object.frustumCulled = false;
    object.raycast = noRaycast;
    object.renderOrder = 21;
    return object;
  }, [lines]);

  useEffect(
    () => () => {
      for (const object of [paths, streaks]) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    },
    [paths, streaks],
  );

  const elapsed = useRef(0);
  useFrame((_, dt) => {
    if (!animate) return;
    elapsed.current += Math.min(dt, 0.05);
    const position = streaks.geometry.attributes
      .position as THREE.BufferAttribute;
    const color = streaks.geometry.attributes.color as THREE.BufferAttribute;
    const pos = position.array as Float32Array;
    const col = color.array as Float32Array;
    let o = 0;
    const sample = (line: (typeof lines)[number], t: number, out: number[]) => {
      const time = line.time;
      let lo = 0;
      let hi = time.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (time[mid] <= t) lo = mid;
        else hi = mid;
      }
      const span = time[hi] - time[lo] || 1;
      const f = Math.min(1, Math.max(0, (t - time[lo]) / span));
      for (let c = 0; c < 3; c++)
        out[c] =
          line.points[lo * 3 + c] +
          (line.points[hi * 3 + c] - line.points[lo * 3 + c]) * f;
      out[3] = line.speed[lo] + (line.speed[hi] - line.speed[lo]) * f;
    };
    const a = [0, 0, 0, 0];
    const b = [0, 0, 0, 0];
    lines.forEach((line, li) => {
      const total = line.time[line.time.length - 1];
      for (let p = 0; p < PARTICLES; p++) {
        const phase = (p + ((li * 0.618) % 1)) / PARTICLES;
        const head = ((elapsed.current * 0.95) / total + phase) % 1;
        for (let k = 0; k < TRAIL - 1; k++) {
          const t0 = (head - (k * TRAIL_STEP) / total) * total;
          const t1 = (head - ((k + 1) * TRAIL_STEP) / total) * total;
          const visible = t1 > 0;
          sample(line, Math.max(0, t0), a);
          sample(line, Math.max(0, t1), b);
          pos.set([a[0], a[1], a[2], b[0], b[1], b[2]], o * 3);
          const fade = visible ? 1 - k / (TRAIL - 1) : 0;
          const edge = Math.min(1, head * 8, (1 - head) * 8);
          const [r, g, bb] = speedColor(a[3]);
          col.set(
            [
              r,
              g,
              bb,
              fade * edge * 0.95,
              r,
              g,
              bb,
              fade * edge * 0.8 * (1 - 1 / (TRAIL - 1)),
            ],
            o * 4,
          );
          o += 2;
        }
      }
    });
    markUploaded(position, color);
    invalidate();
  });

  return (
    <group>
      <primitive object={paths} />
      {animate && <primitive object={streaks} />}
    </group>
  );
}
