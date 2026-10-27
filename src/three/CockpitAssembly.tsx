import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Car } from "../data/cars.ts";
import type { Body } from "./body.ts";
import type { Shape } from "./shapes.ts";
import { Block, Mat, Rod, usePartLook } from "./primitives.tsx";
import type { V3 } from "./primitives.tsx";
import { cockpitLayout } from "./cockpitLayout.ts";
import { seatShellGeometry, harnessRibbonGeometry } from "./cockpitGeometry.ts";

// Educational assembly, not manufacturer CAD. Control positions, cable routes,
// seat dimensions and fasteners are illustrative. +X is toward the nose.
const C = {
  carbon: "#20252a",
  pad: "#353a3e",
  rubber: "#181c20",
  alloy: "#b7c1c8",
  steel: "#747d85",
  belt: "#d93437",
  cable: "#333940",
};
const CarbonContext = createContext<THREE.Texture | null>(null);
const FabricContext = createContext<THREE.Texture | null>(null);

function carbonTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#8b9298";
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const horizontal = (x + y) % 4 < 2;
      const gradient = ctx.createLinearGradient(
        x * 8,
        y * 8,
        x * 8 + (horizontal ? 0 : 8),
        y * 8 + (horizontal ? 8 : 0),
      );
      gradient.addColorStop(0, "#616970");
      gradient.addColorStop(0.45, "#a7adb2");
      gradient.addColorStop(1, "#71797f");
      ctx.fillStyle = gradient;
      ctx.fillRect(x * 8, y * 8, 8, 8);
      ctx.strokeStyle = "#525960";
      ctx.lineWidth = 0.5;
      for (let n = 1; n < 4; n++) {
        ctx.beginPath();
        if (horizontal) {
          ctx.moveTo(x * 8, y * 8 + n * 2);
          ctx.lineTo(x * 8 + 8, y * 8 + n * 2);
        } else {
          ctx.moveTo(x * 8 + n * 2, y * 8);
          ctx.lineTo(x * 8 + n * 2, y * 8 + 8);
        }
        ctx.stroke();
      }
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  return texture;
}

function fabricTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const pixels = context.createImageData(128, 128);
  // Deterministic fine fibres, so a material rebuild cannot change the upholstery.
  for (let i = 0; i < pixels.data.length; i += 4) {
    const px = (i / 4) % 128,
      py = Math.floor(i / 512);
    const noise =
      (Math.imul(px + 1, 374761393) ^ Math.imul(py + 1, 668265263)) >>> 0;
    const value = 180 + (noise % 66);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function Upholstery({ color = C.pad }: { color?: string }) {
  const texture = useContext(FabricContext);
  const { rule, hovered, ghost } = usePartLook("cockpit");
  return (
    <meshStandardMaterial
      color={rule ?? color}
      map={rule ? null : texture}
      roughness={0.96}
      metalness={0}
      side={THREE.DoubleSide}
      emissive={hovered ? "#6f9bff" : "#000000"}
      emissiveIntensity={hovered ? 0.035 : 0}
      transparent={ghost}
      opacity={ghost ? 0.12 : 1}
      depthWrite={!ghost}
    />
  );
}

function Composite() {
  const map = useContext(CarbonContext);
  const { rule, hovered, ghost } = usePartLook("cockpit");
  return (
    <meshPhysicalMaterial
      color={rule ?? C.carbon}
      map={rule ? null : map}
      roughness={0.48}
      metalness={0}
      clearcoat={0.23}
      clearcoatRoughness={0.4}
      side={THREE.DoubleSide}
      emissive={hovered ? "#6f9bff" : "#000000"}
      emissiveIntensity={hovered ? 0.035 : 0}
      transparent={ghost}
      opacity={ghost ? 0.12 : 1}
      depthWrite={!ghost}
    />
  );
}

function SoftBox({
  p,
  s,
  color = C.pad,
  rot,
  composite = false,
  metal = 0,
  radius = 0.01,
}: {
  p: V3;
  s: V3;
  color?: string;
  rot?: V3;
  composite?: boolean;
  metal?: number;
  radius?: number;
}) {
  const [width, height, depth] = s;
  const geometry = useMemo(
    () => new RoundedBoxGeometry(width, height, depth, 2, radius),
    [width, height, depth, radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      position={p}
      rotation={rot}
      castShadow
      receiveShadow
    >
      {composite ? (
        <Composite />
      ) : color === C.pad ? (
        <Upholstery />
      ) : (
        <Mat color={color} metal={metal} rough={metal ? 0.36 : 0.87} />
      )}
    </mesh>
  );
}

function Hose({
  points,
  radius = 0.006,
  color = C.cable,
  metal = 0,
}: {
  points: V3[];
  radius?: number;
  color?: string;
  metal?: number;
}) {
  const key = JSON.stringify(points);
  const geometry = useMemo(() => {
    const coordinates = JSON.parse(key) as V3[];
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        coordinates.map((p) => new THREE.Vector3(...p)),
      ),
      Math.max(12, coordinates.length * 8),
      radius,
      6,
      false,
    );
  }, [key, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow>
      <Mat color={color} metal={metal} rough={0.64} />
    </mesh>
  );
}

// One draw call for screw heads, with hexagonal rather than featureless round caps.
function Fasteners({
  points,
  axis = "x",
  radius = 0.0045,
  color = C.alloy,
}: {
  points: V3[];
  axis?: "x" | "y" | "z";
  radius?: number;
  color?: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const key = JSON.stringify(points);
  useLayoutEffect(() => {
    const object = new THREE.Object3D();
    if (axis === "x") object.rotation.z = Math.PI / 2;
    if (axis === "z") object.rotation.x = Math.PI / 2;
    const coordinates = JSON.parse(key) as V3[];
    coordinates.forEach((p, i) => {
      object.position.set(...p);
      object.updateMatrix();
      ref.current!.setMatrixAt(i, object.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [key, axis]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, points.length]}
      castShadow
    >
      <cylinderGeometry args={[radius, radius, 0.004, 6]} />
      <Mat color={color} metal={0.85} rough={0.38} />
    </instancedMesh>
  );
}

function Belt({ points, width = 0.046 }: { points: V3[]; width?: number }) {
  const key = JSON.stringify(points);
  const geometry = useMemo(
    () => harnessRibbonGeometry(JSON.parse(key) as V3[], width),
    [key, width],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow>
      <Upholstery color={C.belt} />
    </mesh>
  );
}

function SeatAssembly({
  x,
  y,
  z,
  prototype,
}: {
  x: number;
  y: number;
  z: number;
  prototype: boolean;
}) {
  const recline = prototype ? 1 : 0.78;
  const geometry = useMemo(() => seatShellGeometry(recline), [recline]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group position={[x, y, z]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <Composite />
      </mesh>
      <SoftBox p={[0.07, 0.045, 0]} s={[0.32, 0.045, 0.29]} radius={0.018} />
      <SoftBox
        p={[-0.145 * recline, 0.18, 0]}
        s={[0.045, 0.16, 0.28]}
        rot={[0, 0, -0.3]}
        radius={0.018}
      />
      <SoftBox
        p={[-0.215 * recline, 0.355, 0]}
        s={[0.04, 0.2, 0.3]}
        rot={[0, 0, -0.3]}
        radius={0.018}
      />
      <SoftBox
        p={[-0.265 * recline, 0.56, 0]}
        s={[0.05, 0.16, 0.22]}
        rot={[0, 0, -0.18]}
        radius={0.018}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <SoftBox
            p={[-0.21 * recline, 0.575, side * 0.15]}
            s={[0.21, 0.14, 0.065]}
            composite
            radius={0.022}
          />
          <SoftBox
            p={[-0.16 * recline, 0.58, side * 0.137]}
            s={[0.12, 0.11, 0.035]}
            radius={0.016}
          />
          <SoftBox
            p={[-0.09, 0.145, side * 0.17]}
            s={[0.31, 0.12, 0.055]}
            rot={[0, 0, -0.18]}
            radius={0.018}
          />
          <Hose
            radius={0.005}
            color="#454d54"
            points={[
              [0.25, 0.13, side * 0.16],
              [0, 0.145, side * 0.19],
              [-0.1, 0.23, side * 0.18],
              [-0.15, 0.39, side * 0.2],
              [-0.18, 0.5, side * 0.23],
            ]}
          />
          {/* Shoulder slot surround, belt adjuster and load anchor. */}
          <SoftBox
            p={[-0.205 * recline, 0.445, side * 0.085]}
            s={[0.035, 0.044, 0.072]}
            color="#11161a"
            radius={0.009}
          />
          <Belt
            points={[
              [-0.32, 0.41, side * 0.1],
              [-0.22 * recline, 0.454, side * 0.085],
              [-0.11, 0.28, side * 0.07],
              [0.02, 0.1, side * 0.025],
            ]}
          />
          <SoftBox
            p={[-0.135, 0.32, side * 0.07]}
            s={[0.014, 0.03, 0.06]}
            color={C.alloy}
            metal={0.75}
            radius={0.003}
          />
          <Rod
            a={[-0.28, 0.4, side * 0.1]}
            b={[-0.36, 0.38, side * 0.12]}
            r={0.008}
            color={C.alloy}
          />
          <Belt
            width={0.041}
            points={[
              [0.02, 0.075, side * 0.185],
              [0.03, 0.09, side * 0.13],
              [0.028, 0.105, side * 0.02],
            ]}
          />
          <Belt
            width={0.028}
            points={[
              [0.13, 0.02, side * 0.055],
              [0.135, 0.07, side * 0.045],
              [0.035, 0.105, side * 0.022],
            ]}
          />
          <Block
            p={[0.02, -0.025, side * 0.19]}
            s={[0.38, 0.025, 0.027]}
            color={C.alloy}
            metal={0.75}
          />
          <Fasteners
            axis="y"
            points={[
              [0.16, -0.008, side * 0.19],
              [-0.12, -0.008, side * 0.19],
            ]}
          />
        </group>
      ))}
      <mesh position={[0.02, 0.11, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 24]} />
        <Mat color={C.alloy} metal={0.85} />
      </mesh>
      <SoftBox
        p={[0.005, 0.115, 0]}
        s={[0.013, 0.009, 0.04]}
        color="#d63337"
        radius={0.003}
      />
    </group>
  );
}

type InstrumentKind = "wheel" | "dash" | "console";
function instrumentTexture(kind: InstrumentKind) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = kind === "console" ? 768 : 512;
  const ctx = canvas.getContext("2d")!,
    w = canvas.width,
    h = canvas.height;
  ctx.fillStyle = "#0b1117";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#35454d";
  ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.textAlign = "left";
  ctx.fillStyle = "#c4d1d4";
  ctx.font = "600 34px monospace";
  ctx.fillText(
    kind === "console" ? "SYSTEM CONTROL" : "ENDURANCE / CONTROL",
    38,
    55,
  );
  ctx.fillStyle = "#6e919d";
  ctx.font = "25px monospace";
  ctx.fillText("ILLUSTRATIVE ENGINEERING STUDY", 38, h - 34);
  if (kind === "console") {
    const labels = [
      "MASTER",
      "IGNITION",
      "PUMP",
      "FAN",
      "LIGHTS",
      "WIPER",
      "RADIO",
      "FIRE",
    ];
    labels.forEach((label, i) => {
      const x = 155 + (i % 2) * 500,
        y = 160 + Math.floor(i / 2) * 133;
      ctx.strokeStyle = i === 7 ? "#aa413b" : "#4b6873";
      ctx.strokeRect(x - 100, y - 32, 370, 88);
      ctx.font = "700 32px monospace";
      ctx.fillStyle = "#c2cdd1";
      ctx.fillText(label, x - 65, y + 8);
    });
  } else {
    ctx.font = "600 32px monospace";
    ctx.fillStyle = "#8abfca";
    ctx.fillText("SYSTEMS", 38, 125);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = i < 5 ? "#4e9695" : "#253b44";
      ctx.fillRect(42 + i * 66, 156, 47, 15);
    }
    ctx.font = "700 82px monospace";
    ctx.fillStyle = "#d3e4e8";
    ctx.fillText("CTRL", 42, 290);
    ctx.font = "27px monospace";
    ctx.fillStyle = "#a5b8bf";
    ["BRAKE BALANCE", "ENERGY", "TRACTION"].forEach((label, i) => {
      ctx.fillText(label, 535, 245 + i * 66);
      ctx.fillText("--", 900, 245 + i * 66);
    });
    ctx.font = "26px monospace";
    ctx.fillStyle = "#68808b";
    ctx.fillText("STATIC DISPLAY / NO LIVE DATA", 42, 390);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function Display({
  p,
  width,
  height,
  kind = "dash",
}: {
  p: V3;
  width: number;
  height: number;
  kind?: InstrumentKind;
}) {
  const texture = useMemo(() => instrumentTexture(kind), [kind]);
  const { rule, hovered, ghost } = usePartLook("cockpit");
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={p}>
      <SoftBox
        p={[0.012, 0, 0]}
        s={[0.035, height + 0.018, width + 0.019]}
        color="#161e24"
        radius={0.008}
      />
      <mesh position={[-0.007, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={rule ? null : texture}
          color={rule ?? "#fff"}
          roughness={0.28}
          emissiveMap={rule ? null : texture}
          emissive={hovered ? "#6f9bff" : "#fff"}
          emissiveIntensity={0.4}
          transparent={ghost}
          opacity={ghost ? 0.12 : 1}
          depthWrite={!ghost}
        />
      </mesh>
      <Fasteners
        points={[-1, 1].flatMap((y) =>
          [-1, 1].map(
            (z) =>
              [-0.008, y * (height / 2 + 0.004), z * (width / 2 + 0.004)] as V3,
          ),
        )}
        radius={0.0026}
      />
    </group>
  );
}

function Rotary({ y, z, color }: { y: number; z: number; color: string }) {
  return (
    <group position={[-0.046, y, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.017, 0.019, 0.017, 16]} />
        <Mat color={color} metal={0.24} rough={0.48} />
      </mesh>
      <Block p={[-0.012, 0.008, 0]} s={[0.002, 0.01, 0.003]} color="#e1e4dd" />
      <mesh position={[0.006, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.021, 0.0018, 4, 32]} />
        <Mat color="#b6bdc3" metal={0.5} />
      </mesh>
    </group>
  );
}

function SteeringAssembly({ p, prototype }: { p: V3; prototype: boolean }) {
  const rim = useMemo(() => {
    const points: V3[] = prototype
      ? [
          [0, -0.08, -0.15],
          [0, 0.065, -0.17],
          [0, 0.095, -0.105],
          [0, 0.081, 0],
          [0, 0.095, 0.105],
          [0, 0.065, 0.17],
          [0, -0.08, 0.15],
          [0, -0.105, 0.07],
          [0, -0.105, -0.07],
        ]
      : [
          [0, -0.11, -0.11],
          [0, -0.01, -0.18],
          [0, 0.115, -0.12],
          [0, 0.16, 0],
          [0, 0.115, 0.12],
          [0, -0.01, 0.18],
          [0, -0.11, 0.11],
          [0, -0.13, 0],
        ];
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        points.map((q) => new THREE.Vector3(...q)),
        true,
      ),
      80,
      0.014,
      10,
      true,
    );
  }, [prototype]);
  const plate = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.147, 0.074);
    shape.lineTo(-0.147, -0.071);
    shape.quadraticCurveTo(-0.06, -0.105, 0, -0.07);
    shape.quadraticCurveTo(0.06, -0.105, 0.147, -0.071);
    shape.lineTo(0.147, 0.074);
    shape.quadraticCurveTo(0, 0.04, -0.147, 0.074);
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.005,
      bevelThickness: 0.004,
    });
  }, []);
  useEffect(
    () => () => {
      rim.dispose();
      plate.dispose();
    },
    [rim, plate],
  );
  return (
    <group position={p} rotation={[0, 0, 0.22]}>
      <mesh geometry={rim} castShadow>
        <Mat color={C.rubber} rough={0.93} />
      </mesh>
      <mesh
        geometry={plate}
        position={[-0.018, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
      >
        <Composite />
      </mesh>
      <Display
        p={[-0.048, 0.02, 0]}
        width={0.102}
        height={0.057}
        kind="wheel"
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <SoftBox
            p={[0, 0.005, side * 0.157]}
            s={[0.048, 0.13, 0.035]}
            radius={0.014}
            color="#30383d"
          />
          <SoftBox
            p={[-0.018, 0.035, side * 0.132]}
            s={[0.042, 0.046, 0.043]}
            rot={[side * 0.18, 0, 0]}
            radius={0.012}
            color="#252c32"
          />
          <SoftBox
            p={[0.047, -0.013, side * 0.12]}
            s={[0.014, 0.105, 0.05]}
            rot={[side * 0.2, 0, 0]}
            radius={0.008}
            composite
          />
          <Rod
            a={[0.05, 0, side * 0.12]}
            b={[0.073, 0.018, side * 0.048]}
            r={0.005}
            color={C.steel}
          />
          {[
            [-0.005, 0.095],
            [0.05, 0.093],
          ].map(([y, z], i) => (
            <mesh
              key={i}
              position={[-0.046, y, side * z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.008, 0.01, 0.008, 16]} />
              <Mat
                color={i ? "#d2ae38" : side < 0 ? "#cc4248" : "#4fa2cf"}
                rough={0.55}
              />
            </mesh>
          ))}
          <Rotary
            y={-0.057}
            z={side * 0.09}
            color={side < 0 ? "#54949a" : "#bc733e"}
          />
          <Fasteners
            points={[
              [-0.047, 0.065, side * 0.132],
              [-0.047, -0.066, side * 0.133],
            ]}
            radius={0.0026}
          />
        </group>
      ))}
      <Rotary y={-0.061} z={0} color="#6f7682" />
      {/* Column, quick release locking collar, flange and harness connector. */}
      <Rod a={[0.022, 0, 0]} b={[0.38, -0.09, 0]} r={0.013} color={C.steel} />
      <mesh position={[0.082, -0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.055, 20]} />
        <Mat color="#c8a74a" metal={0.8} />
      </mesh>
      <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 0.011, 20]} />
        <Mat color={C.alloy} metal={0.8} />
      </mesh>
      <Hose
        points={[
          [0.064, -0.03, 0.034],
          [0.12, -0.08, 0.07],
          [0.23, -0.1, 0.09],
          [0.36, -0.1, 0.035],
        ]}
        radius={0.0045}
      />
      <Fasteners
        points={Array.from(
          { length: 6 },
          (_, i) =>
            [
              0.035,
              Math.sin((i * Math.PI) / 3) * 0.034,
              Math.cos((i * Math.PI) / 3) * 0.034,
            ] as V3,
        )}
        radius={0.0025}
      />
    </group>
  );
}

function PedalAssembly({ p }: { p: V3 }) {
  const holes = [-1, 1].flatMap((side) =>
    Array.from(
      { length: 4 },
      (_, i) => [0.008, 0.094 + i * 0.021, side * 0.087] as V3,
    ),
  );
  return (
    <group position={p}>
      <SoftBox
        p={[0.035, 0, 0]}
        s={[0.27, 0.023, 0.32]}
        composite
        radius={0.008}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            p={[0.016, 0.027, side * 0.105]}
            s={[0.17, 0.019, 0.017]}
            color={C.alloy}
            metal={0.8}
          />
          <Rod
            a={[-0.005, 0.028, side * 0.087]}
            b={[0.025, 0.123, side * 0.087]}
            r={0.008}
            color={C.alloy}
          />
          <SoftBox
            p={[0.02, 0.121, side * 0.087]}
            s={[0.016, 0.093, 0.06]}
            rot={[0, 0, -0.17]}
            color={C.alloy}
            metal={0.75}
            radius={0.005}
          />
          <mesh
            position={[0.145, 0.054, side * 0.067]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.014, 0.016, 0.08, 12]} />
            <Mat color={C.alloy} metal={0.8} />
          </mesh>
          <Rod
            a={[0.014, 0.065, side * 0.087]}
            b={[0.127, 0.054, side * 0.067]}
            r={0.0035}
            color={C.steel}
          />
          <mesh position={[0.16, 0.097, side * 0.067]}>
            <cylinderGeometry args={[0.016, 0.016, 0.029, 12]} />
            <Mat color="#c9c5b9" rough={0.5} />
          </mesh>
          <Hose
            points={[
              [0.18, 0.06, side * 0.067],
              [0.205, 0.04, side * 0.075],
              [0.21, 0.025, side * 0.13],
              [0.3, 0.026, side * 0.16],
            ]}
            radius={0.0032}
            color="#929ba1"
            metal={0.6}
          />
        </group>
      ))}
      <Fasteners points={holes} radius={0.005} color="#20272b" />
      <Rod
        a={[0.045, 0.072, -0.09]}
        b={[0.045, 0.072, 0.09]}
        r={0.006}
        color="#ad8e5b"
      />
      <SoftBox
        p={[0.031, 0.095, -0.2]}
        s={[0.018, 0.14, 0.06]}
        rot={[0, 0, -0.2]}
        composite
        radius={0.005}
      />
      <Fasteners
        axis="y"
        points={[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => [0.035 + x * 0.11, 0.017, z * 0.14] as V3),
        )}
      />
    </group>
  );
}

function Equipment({
  x,
  y,
  z,
  prototype,
}: {
  x: number;
  y: number;
  z: number;
  prototype: boolean;
}) {
  const side = prototype ? -0.24 : 0.23;
  return (
    <group position={[x, y, 0]}>
      {/* Passenger-side switch plinth and protected emergency release. */}
      <group position={[0.1, 0.21, side]} rotation={[0, 0, -0.3]}>
        <SoftBox
          p={[0.0, 0, 0]}
          s={[0.1, 0.27, 0.15]}
          composite
          radius={0.014}
        />
        <Display
          p={[-0.055, 0.015, 0]}
          width={0.127}
          height={0.23}
          kind="console"
        />
        {[-1, 1].map((column) =>
          Array.from({ length: 3 }, (_, i) => (
            <mesh
              key={`${column}:${i}`}
              position={[-0.073, 0.078 - i * 0.055, column * 0.036]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.006, 0.008, 0.018, 10]} />
              <Mat color={i === 0 ? "#dbcd83" : "#c3cacf"} metal={0.6} />
            </mesh>
          )),
        )}
        <SoftBox
          p={[-0.076, -0.095, 0.035]}
          s={[0.018, 0.028, 0.025]}
          color="#c6312e"
          radius={0.004}
        />
      </group>
      <SoftBox
        p={[-0.12, 0.055, side]}
        s={[0.24, 0.058, 0.12]}
        color="#59606a"
        metal={0.7}
        radius={0.006}
      />
      <Fasteners
        axis="y"
        points={[-1, 1].flatMap((a) =>
          [-1, 1].map(
            (b) => [-0.12 + a * 0.105, 0.087, side + b * 0.044] as V3,
          ),
        )}
        radius={0.003}
      />
      <Block p={[-0.12, 0.089, side]} s={[0.15, 0.003, 0.07]} color="#202b33" />
      {/* Data/logger enclosure and three keyed connector barrels. */}
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <mesh
            position={[-0.24, 0.063, side - 0.036 + i * 0.036]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.01, 0.01, 0.024, 12]} />
            <Mat color={i === 1 ? "#ae8a51" : C.alloy} metal={0.8} />
          </mesh>
          <Hose
            points={[
              [-0.255, 0.063, side - 0.036 + i * 0.036],
              [-0.28, 0.05, side - 0.05 + i * 0.036],
              [-0.29, 0.04, side - 0.06],
              [-0.1, 0.02, side - 0.08],
              [0.34, 0.03, side - 0.08],
              [0.65, 0.06, side - 0.08],
              [0.65, 0.34, side - 0.08],
              [0.64, 0.48, z + 0.06],
            ]}
            radius={i === 0 ? 0.006 : 0.004}
            color={i === 1 ? "#3d5360" : C.cable}
          />
        </group>
      ))}
      {/* Extinguisher cylinder, band clamps, valve, nozzle routing. */}
      <group position={[-0.17, 0.074, prototype ? 0.3 : 0.45]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.046, 0.21, 6, 16]} />
          <Mat color="#bf3633" metal={0.42} rough={0.4} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * 0.075, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.047, 0.004, 5, 20]} />
              <Mat color={C.alloy} metal={0.8} />
            </mesh>
            <SoftBox
              p={[s * 0.075, -0.052, 0]}
              s={[0.028, 0.037, 0.09]}
              color={C.alloy}
              metal={0.75}
              radius={0.003}
            />
            <Fasteners
              axis="y"
              radius={0.003}
              points={[
                [s * 0.075, -0.03, -0.033],
                [s * 0.075, -0.03, 0.033],
              ]}
            />
          </group>
        ))}
        <Rod a={[0.155, 0, 0]} b={[0.184, 0, 0]} r={0.014} color={C.alloy} />
        <Rod a={[0.18, 0, 0]} b={[0.18, 0.04, 0]} r={0.006} color="#b69152" />
        <Hose
          points={[
            [0.18, 0.04, 0],
            [0.21, 0.07, 0],
            [0.3, 0.05, -0.01],
            [0.63, 0.05, -0.02],
            [0.7, 0.16, -0.02],
          ]}
          radius={0.0036}
          color="#989c9b"
          metal={0.7}
        />
        <Rod
          a={[0.7, 0.16, -0.02]}
          b={[0.7, 0.16, -0.065]}
          r={0.005}
          color="#bb9559"
        />
      </group>
      {/* Bias-adjuster cable returns to the pedal balance bar. */}
      <Hose
        radius={0.003}
        points={[
          [0.19, 0.19, side - 0.04],
          [0.29, 0.08, side - 0.03],
          [0.48, 0.025, z - 0.12],
          [0.75, 0.03, z - 0.09],
          [0.76, 0.1, z],
        ]}
        color="#626d76"
      />
    </group>
  );
}

function CockpitTub({
  prototype,
  floor,
  z,
  seatX,
  pedals,
}: {
  prototype: boolean;
  floor: number;
  z: number;
  seatX: number;
  pedals: V3;
}) {
  // Prototype cockpits are a narrow central tub; GT cabins are wider and sit
  // off-centre. The floor, sills and low bulkhead are illustrative, not a
  // manufacturer drawing, but they give the seat and pedal box a real surround.
  const half = prototype ? 0.35 : 0.47;
  const rear = seatX - 0.3;
  const front = pedals[0] + 0.2;
  const length = front - rear;
  return (
    <group>
      <SoftBox
        p={[(rear + front) / 2, floor - 0.018, z]}
        s={[length, 0.032, half * 2]}
        composite
        radius={0.012}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <SoftBox
            p={[(rear + front) / 2, floor + 0.1, z + side * half]}
            s={[length * 0.88, 0.13, 0.04]}
            composite
            radius={0.012}
          />
          <SoftBox
            p={[seatX + 0.3, floor + 0.2, z + side * (half - 0.03)]}
            s={[0.48, 0.2, 0.035]}
            radius={0.02}
          />
        </group>
      ))}
      {/* Low rear bulkhead: high enough to read as a firewall, low enough to
          keep the over-the-shoulder camera sightline onto the seat and pedals. */}
      <SoftBox
        p={[rear + 0.02, floor + 0.145, z]}
        s={[0.04, 0.29, half * 2]}
        composite
        radius={0.008}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <SoftBox
            p={[rear + 0.045, floor + 0.255, z + side * 0.12]}
            s={[0.02, 0.035, 0.05]}
            color="#11161a"
            radius={0.008}
          />
          <Block
            p={[seatX - 0.02, floor + 0.035, z + side * 0.18]}
            s={[0.42, 0.028, 0.035]}
            color={C.steel}
            metal={0.8}
          />
          <Fasteners
            axis="y"
            radius={0.003}
            points={[
              [seatX - 0.2, floor + 0.05, z + side * 0.18],
              [seatX + 0.16, floor + 0.05, z + side * 0.18],
            ]}
          />
        </group>
      ))}
      {!prototype && (
        <group>
          {/* Outboard door bars sit behind the window net on the driver's side. */}
          {[0.25, 0.45].map((height) => (
            <SoftBox
              key={height}
              p={[seatX + 0.08, floor + height, z - 0.31]}
              s={[0.62, 0.055, 0.055]}
              radius={0.022}
            />
          ))}
          <Rod
            a={[seatX - 0.19, floor + 0.25, z - 0.31]}
            b={[seatX - 0.19, floor + 0.45, z - 0.31]}
            r={0.018}
            color="#30373d"
          />
        </group>
      )}
    </group>
  );
}

function WindowNet({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <Rod
        a={[-0.3, 0.3, 0]}
        b={[0.25, 0.3, 0]}
        r={0.01}
        color="#262b30"
        metal={0}
      />
      <Rod
        a={[-0.3, 0, 0]}
        b={[0.2, 0, 0]}
        r={0.01}
        color="#262b30"
        metal={0}
      />
      {Array.from({ length: 7 }, (_, i) => (
        <Block
          key={`v${i}`}
          p={[-0.27 + i * 0.078, 0.15, 0]}
          s={[0.012, 0.3, 0.006]}
          color="#272c31"
          rough={0.95}
        />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <Block
          key={`h${i}`}
          p={[-0.025, 0.035 + i * 0.075, 0]}
          s={[0.5, 0.012, 0.006]}
          color="#272c31"
          rough={0.95}
        />
      ))}
      <SoftBox
        p={[0.23, 0.285, 0]}
        s={[0.06, 0.035, 0.022]}
        color={C.alloy}
        metal={0.8}
        radius={0.005}
      />
      <Block p={[0.18, 0.245, 0]} s={[0.025, 0.055, 0.005]} color="#d33a34" />
    </group>
  );
}

/** Replace the old Seat + Steering inside Part id="cockpit" with this assembly. */
export function CockpitAssembly({
  car,
  body,
  shape,
}: {
  car: Car;
  body: Body;
  shape: Shape;
}) {
  const layout = cockpitLayout(car, body, shape),
    { prototype, floor, z, wheel, dash, pedals, seatX } = layout;
  const texture = useMemo(() => carbonTexture(), []);
  const fabric = useMemo(() => fabricTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => fabric.dispose(), [fabric]);
  return (
    <CarbonContext.Provider value={texture}>
      <FabricContext.Provider value={fabric}>
        <CockpitTub
          prototype={prototype}
          floor={floor}
          z={z}
          seatX={seatX}
          pedals={pedals}
        />
        <SeatAssembly x={seatX} y={floor} z={z} prototype={prototype} />
        <SteeringAssembly p={wheel} prototype={prototype} />
        <group position={dash} rotation={[0, 0, 0.12]}>
          <SoftBox
            p={[0.035, -0.015, 0]}
            s={[0.15, 0.16, prototype ? 0.4 : 0.56]}
            composite
            radius={0.028}
          />
          <Display p={[-0.05, 0.003, 0]} width={0.21} height={0.105} />
          <SoftBox
            p={[-0.045, 0.077, 0]}
            s={[0.14, 0.014, 0.25]}
            composite
            radius={0.007}
          />
          {/* Actual light pipes with dark gaps, rather than an emissive solid bar. */}
          {Array.from({ length: 10 }, (_, i) => (
            <mesh key={i} position={[-0.064, 0.067, -0.072 + i * 0.016]}>
              <sphereGeometry args={[0.003, 8, 6]} />
              <Mat
                color={i < 4 ? "#58a188" : i < 7 ? "#c9af63" : "#a75455"}
                rough={0.3}
              />
            </mesh>
          ))}
        </group>
        <PedalAssembly p={pedals} />
        <Equipment
          x={body.x(shape.cockpit.roof)}
          y={floor}
          z={z}
          prototype={prototype}
        />
        {!prototype && (
          <WindowNet x={seatX + 0.05} y={floor + 0.26} z={-0.64} />
        )}
        {/* Heel support and bulkhead service bolts. */}
        <SoftBox
          p={[pedals[0] - 0.17, floor + 0.012, z]}
          s={[0.11, 0.036, 0.26]}
          color="#646c74"
          metal={0.7}
          radius={0.005}
        />
        <Fasteners
          axis="y"
          points={[-1, 1].flatMap((a) =>
            [-1, 1].map(
              (b) =>
                [wheel[0] + 0.06 + a * 0.29, floor - 0.003, z + b * 0.16] as V3,
            ),
          )}
        />
      </FabricContext.Provider>
    </CarbonContext.Provider>
  );
}
