import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { engineeringDetailsFor } from "../data/engineeringDetails.ts";
import type { SystemId } from "../data/systems.ts";
import type { Body } from "./body.ts";
import { calloutAnchors } from "./calloutAnchors.ts";
import { useView } from "./primitives.tsx";
import type { V3 } from "./primitives.tsx";
import type { Shape } from "./shapes.ts";

const LABEL_PX = 21;
const DOT_PX = 9;
const noRaycast = () => null;

function labelTexture(index: number, text: string) {
  const h = 64;
  const font = "600 30px 'DM Sans', Arial, sans-serif";
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + h + 22;
  c.width = w;
  c.height = h;
  ctx.fillStyle = "rgba(7, 11, 18, 0.88)";
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 12);
  ctx.fill();
  ctx.fillStyle = "#3d7bff";
  ctx.beginPath();
  ctx.arc(h / 2, h / 2, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.font = "700 27px 'DM Sans', Arial, sans-serif";
  ctx.fillText(String(index), h / 2, h / 2 + 1);
  ctx.textAlign = "left";
  ctx.font = font;
  ctx.fillText(text, h + 4, h / 2 + 1);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: w / h };
}

const dotTexture = (() => {
  let texture: THREE.CanvasTexture | null = null;
  return () => {
    if (texture) return texture;
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(16, 16, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d7bff";
    ctx.beginPath();
    ctx.arc(16, 16, 9, 0, Math.PI * 2);
    ctx.fill();
    texture = new THREE.CanvasTexture(c);
    return texture;
  };
})();

// Keeps a sprite the same size in pixels whatever the camera distance or FOV.
function screenScale(
  sprite: THREE.Sprite | null,
  px: number,
  aspect: number,
  fov: number,
  height: number,
) {
  if (!sprite) return;
  const s = (px / height) * 2 * Math.tan((fov * Math.PI) / 360);
  sprite.scale.set(s * aspect, s, 1);
}

// Pixel offset from a part to its label. Labels fan outward from the centre
// of the view and are nudged apart when their boxes would overlap.
const REACH_PX = 28;
const RISE_PX = 30;
const GAP_PX = 5;
const EDGE_PX = 84;

type Item = { at: V3; index: number; text: string };
type Placed = {
  right: boolean;
  x: number;
  y: number;
  w: number;
  z: number;
  shown: boolean;
};

function leaderLine(at: V3) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...at),
    new THREE.Vector3(...at),
  ]);
  const material = new THREE.LineBasicMaterial({
    color: "#9dbdff",
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 30;
  line.frustumCulled = false;
  line.raycast = noRaycast;
  return line;
}

function separate(placed: Placed[]) {
  const boxes = placed.map((p) => ({
    p,
    left: () => (p.right ? p.x : p.x - p.w),
  }));
  for (let pass = 0; pass < 6; pass++) {
    boxes.sort((a, b) => a.p.y - b.p.y);
    let moved = false;
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        const overlapX =
          Math.min(a.left() + a.p.w, b.left() + b.p.w) -
          Math.max(a.left(), b.left());
        const need = LABEL_PX + GAP_PX - (b.p.y - a.p.y);
        if (overlapX > 0 && need > 0) {
          b.p.y += need;
          moved = true;
        }
      }
    if (!moved) break;
  }
}

/**
 * Numbered labels for the selected system's parts. Numbers and names follow
 * the component list in the detail panel; parts without a mesh anchor are
 * listed there but not labelled here.
 */
export function Callouts({
  system,
  body,
  shape,
}: {
  system: SystemId;
  body: Body;
  shape: Shape;
}) {
  const view = useView();
  const visible = view.selected === system;
  const items = useMemo<Item[]>(() => {
    if (!visible) return [];
    const components =
      engineeringDetailsFor(view.car, system)?.components ?? [];
    const used = new Set<number>();
    return calloutAnchors(view.car, body, shape, system).flatMap((anchor) => {
      const index = components.findIndex(
        (part, n) =>
          !used.has(n) &&
          anchor.match.some((word) => part.name.toLowerCase().includes(word)),
      );
      if (index < 0) return [];
      used.add(index);
      return [
        { at: anchor.at, index: index + 1, text: components[index].name },
      ];
    });
  }, [visible, view.car, body, shape, system]);
  const textures = useMemo(
    () => items.map((item) => labelTexture(item.index, item.text)),
    [items],
  );
  const lines = useMemo(
    () => items.map((item) => leaderLine(item.at)),
    [items],
  );
  useEffect(
    () => () => {
      for (const { texture } of textures) texture.dispose();
      for (const line of lines) {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
    },
    [textures, lines],
  );
  const group = useRef<THREE.Group>(null);
  const labels = useRef<(THREE.Sprite | null)[]>([]);
  const dots = useRef<(THREE.Sprite | null)[]>([]);
  const point = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const root = group.current;
    if (!root || !items.length) return;
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 40;
    const placed: Placed[] = items.map((item, i) => {
      point.set(...item.at);
      root.localToWorld(point).project(camera);
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height;
      const w = LABEL_PX * textures[i].aspect;
      // Fan outward, unless that would run under the edge controls.
      let right = point.x >= 0;
      if (right && x + REACH_PX + w > size.width - EDGE_PX) right = false;
      else if (!right && x - REACH_PX - w < EDGE_PX) right = true;
      return {
        right,
        x: right
          ? Math.min(x + REACH_PX, size.width - EDGE_PX - w)
          : Math.max(x - REACH_PX, EDGE_PX + w),
        y: y - RISE_PX,
        w,
        z: point.z,
        shown:
          Math.abs(point.x) < 0.97 && Math.abs(point.y) < 0.97 && point.z < 1,
      };
    });
    separate(placed.filter((p) => p.shown));
    placed.forEach((p, i) => {
      const label = labels.current[i];
      const dot = dots.current[i];
      if (!label || !dot) return;
      label.visible = dot.visible = lines[i].visible = p.shown;
      if (!p.shown) return;
      point
        .set((p.x / size.width) * 2 - 1, 1 - (p.y / size.height) * 2, p.z)
        .unproject(camera);
      root.worldToLocal(point);
      label.position.copy(point);
      label.center.set(p.right ? 0 : 1, 0.5);
      const positions = lines[i].geometry.attributes
        .position as THREE.BufferAttribute;
      positions.setXYZ(1, point.x, point.y, point.z);
      positions.needsUpdate = true;
      screenScale(label, LABEL_PX, textures[i].aspect, fov, size.height);
      screenScale(dot, DOT_PX, 1, fov, size.height);
    });
  });
  if (!items.length) return null;
  return (
    <group ref={group}>
      {items.map((item, i) => (
        <group key={item.index}>
          <primitive object={lines[i]} />
          <sprite
            ref={(s) => {
              dots.current[i] = s;
            }}
            position={item.at}
            renderOrder={31}
            raycast={noRaycast}
          >
            <spriteMaterial
              map={dotTexture()}
              depthTest={false}
              transparent
              sizeAttenuation={false}
              toneMapped={false}
            />
          </sprite>
          <sprite
            ref={(s) => {
              labels.current[i] = s;
            }}
            position={item.at}
            renderOrder={32}
            raycast={noRaycast}
          >
            <spriteMaterial
              map={textures[i].texture}
              depthTest={false}
              transparent
              sizeAttenuation={false}
              toneMapped={false}
            />
          </sprite>
        </group>
      ))}
    </group>
  );
}
