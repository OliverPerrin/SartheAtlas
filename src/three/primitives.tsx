import { createContext, useContext, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Car } from "../data/cars.ts";
import type { SystemId } from "../data/systems.ts";
import { ruleFor, ruleInfo } from "../data/systems.ts";

export type V3 = [number, number, number];

export type ViewState = {
  car: Car;
  selected: SystemId | null;
  hovered: SystemId | null;
  rules: boolean;
  xray: boolean;
  focus: boolean;
  night: boolean;
  bodyRemoved?: boolean;
  wheelsRemoved?: boolean;
  sectioned?: boolean;
  inspection?: boolean;
  exploded?: number;
};

export const ViewCtx = createContext<ViewState | null>(null);
export const PartCtx = createContext<SystemId>("body");

export function useView() {
  return useContext(ViewCtx)!;
}

// Resolves the look of a part's material from the current view mode.
export function usePartLook(id: SystemId) {
  const v = useView();
  const rule = v.rules ? ruleInfo[ruleFor(v.car, id)].color : null;
  const selected = v.selected === id;
  const hovered = v.hovered === id;
  const ghost = v.focus && v.selected !== null && !selected;
  return { rule, selected, hovered, ghost };
}

export function Mat({
  color,
  metal = 0,
  rough = 0.5,
  emissive,
  emissiveIntensity = 1,
  side,
  coat = 0,
}: {
  color: string;
  metal?: number;
  rough?: number;
  emissive?: string;
  emissiveIntensity?: number;
  side?: THREE.Side;
  coat?: number;
}) {
  const id = useContext(PartCtx);
  const { rule, hovered, ghost } = usePartLook(id);
  const glow = hovered ? "#6f9bff" : emissive;
  const glowI = hovered ? 0.035 : emissive ? emissiveIntensity : 0;
  return (
    <meshPhysicalMaterial
      clearcoat={rule ? 0 : coat}
      clearcoatRoughness={0.12}
      color={rule ?? color}
      metalness={rule ? 0.05 : metal}
      roughness={rule ? 0.55 : rough}
      emissive={glow ?? "#000000"}
      emissiveIntensity={glowI}
      transparent={ghost}
      opacity={ghost ? 0.12 : 1}
      depthWrite={!ghost}
      side={side}
    />
  );
}

export function Rod({
  a,
  b,
  r = 0.012,
  color = "#9aa3ad",
  metal = 0.8,
}: {
  a: V3;
  b: V3;
  r?: number;
  color?: string;
  metal?: number;
}) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a),
      vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    return { pos: va.add(vb).multiplyScalar(0.5), quat, len };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[r, r, len, 10]} />
      <Mat color={color} metal={metal} rough={0.3} />
    </mesh>
  );
}

export function Block({
  p,
  s,
  color,
  r,
  metal = 0,
  rough = 0.5,
  rot,
  emissive,
}: {
  p: V3;
  s: V3;
  color: string;
  r?: V3;
  metal?: number;
  rough?: number;
  rot?: V3;
  emissive?: string;
}) {
  return (
    <mesh position={p} rotation={rot ?? r} castShadow receiveShadow>
      <boxGeometry args={s} />
      <Mat color={color} metal={metal} rough={rough} emissive={emissive} />
    </mesh>
  );
}

class Helix extends THREE.Curve<THREE.Vector3> {
  radius: number;
  length: number;
  turns: number;
  constructor(radius: number, length: number, turns: number) {
    super();
    this.radius = radius;
    this.length = length;
    this.turns = turns;
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * this.turns;
    return target.set(
      Math.cos(a) * this.radius,
      t * this.length - this.length / 2,
      Math.sin(a) * this.radius,
    );
  }
}

export function Damper({
  a,
  b,
  color = "#e2b33c",
}: {
  a: V3;
  b: V3;
  color?: string;
}) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a),
      vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    return { pos: va.add(vb).multiplyScalar(0.5), quat, len };
  }, [a, b]);
  const spring = useMemo(
    () => new THREE.TubeGeometry(new Helix(0.028, len * 0.62, 7), 90, 0.005, 5),
    [len],
  );
  useEffect(() => () => spring.dispose(), [spring]);
  return (
    <group position={pos} quaternion={quat}>
      <mesh castShadow>
        <cylinderGeometry args={[0.018, 0.018, len, 12]} />
        <Mat color="#2d3238" metal={0.8} rough={0.3} />
      </mesh>
      <mesh geometry={spring}>
        <Mat color={color} metal={0.4} rough={0.4} />
      </mesh>
    </group>
  );
}

// Rounded-rectangle loft for tubs, cells and ducts: [x, yBottom, yTop, halfWidth].
export function loftBox(
  sections: [number, number, number, number][],
  radius = 0.06,
) {
  const seg = 6;
  const ring = (y0: number, y1: number, w: number) => {
    const pts: [number, number][] = [];
    const r = Math.min(radius, (y1 - y0) / 2 - 0.001, w - 0.001);
    const corners: [number, number, number][] = [
      [w - r, y1 - r, 0],
      [-w + r, y1 - r, Math.PI / 2],
      [-w + r, y0 + r, Math.PI],
      [w - r, y0 + r, (Math.PI * 3) / 2],
    ];
    for (const [cz, cy, a0] of corners)
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (i / seg) * (Math.PI / 2);
        pts.push([cz + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    return pts;
  };
  const rings = sections.map(([, y0, y1, w]) => ring(y0, y1, w));
  const n = rings[0].length;
  const pos: number[] = [];
  const idx: number[] = [];
  sections.forEach(([x], i) => rings[i].forEach(([z, y]) => pos.push(x, y, z)));
  for (let i = 0; i < sections.length - 1; i++)
    for (let j = 0; j < n; j++) {
      const a = i * n + j,
        b = i * n + ((j + 1) % n),
        c = a + n,
        d = b + n;
      idx.push(a, c, b, b, c, d);
    }
  for (const end of [0, sections.length - 1]) {
    const c = pos.length / 3;
    const [x, y0, y1] = sections[end];
    pos.push(x, (y0 + y1) / 2, 0);
    for (let j = 0; j < n; j++) {
      const a = end * n + j,
        b = end * n + ((j + 1) % n);
      if (end === 0) idx.push(c, b, a);
      else idx.push(c, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function Loft({
  sections,
  radius,
  color,
  metal = 0,
  rough = 0.55,
}: {
  sections: [number, number, number, number][];
  radius?: number;
  color: string;
  metal?: number;
  rough?: number;
}) {
  const g = useMemo(() => loftBox(sections, radius), [sections, radius]);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh geometry={g} castShadow receiveShadow>
      <Mat color={color} metal={metal} rough={rough} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Canvas-drawn text sprite, used for labels in the 3D views.
export function Label({
  text,
  position,
  size = 0.22,
  color = "#ffffff",
  bg = "rgba(8,12,30,0.85)",
  onClick,
  screen = false,
}: {
  text: string;
  position: V3;
  size?: number;
  color?: string;
  bg?: string;
  onClick?: () => void;
  screen?: boolean;
}) {
  const { tex, aspect } = useMemo(() => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    const font = "700 44px 'DM Sans', Arial, sans-serif";
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 40;
    c.width = w;
    c.height = 72;
    ctx.font = font;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, 72, 14);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, 38);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { tex, aspect: w / 72 };
  }, [text, color, bg]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <sprite
      position={position}
      scale={[size * aspect, size, 1]}
      renderOrder={10}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
    >
      <spriteMaterial
        map={tex}
        depthTest={false}
        transparent
        toneMapped={false}
        sizeAttenuation={!screen}
      />
    </sprite>
  );
}
