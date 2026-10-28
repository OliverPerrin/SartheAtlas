import {
  Component,
  memo,
  useCallback,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  Line,
  OrbitControls,
} from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import type { Car } from "../data/cars.ts";
import type { Entry } from "../data/entries.ts";
import type { SystemId } from "../data/systems.ts";
import { CarModel, useBody } from "./CarModel.tsx";
import type { PaintMode } from "./livery.ts";
import { Label, ViewCtx } from "./primitives.tsx";
import type { V3 } from "./primitives.tsx";
import { refreshShadows, cacheStaticShadows } from "./shadowRefresh.ts";

export class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-error">
        <h3>3D view unavailable</h3>
        <p>
          Your browser could not start WebGL. The specifications and part notes
          are still available.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}

import type { Preset } from "./cameraPresets.ts";
import { isInspectionPreset } from "./cameraPresets.ts";
import { inspectionFrame, setCameraProjection } from "./inspectionCamera.ts";
import { layerWeights } from "./layerPlan.ts";
export { presets } from "./cameraPresets.ts";
export type { Preset } from "./cameraPresets.ts";
const presetPos: Record<
  Exclude<Preset, "cockpit" | "pedals" | "powertrain" | "running">,
  V3
> = {
  three: [5.2, 2.0, 6.0],
  side: [0, 0.9, 8.6],
  front: [8.4, 1.0, 0.01],
  rear: [-8.4, 1.3, 0.01],
  top: [0.01, 9.4, 0.01],
  under: [0.8, -6.2, 0.6],
};

export type SceneProps = {
  car: Car;
  entry: Entry;
  paint: PaintMode;
  selected: SystemId | null;
  hovered: SystemId | null;
  onSelect: (id: SystemId) => void;
  onHover: (id: SystemId | null) => void;
  exploded: number;
  xray: boolean;
  rules: boolean;
  focus: boolean;
  dims: boolean;
  spin: boolean;
  preset: Preset;
  presetNonce: number;
  night: boolean;
  fontsReady: boolean;
  compact?: boolean;
  onInteraction?: () => void;
  bodyRemoved?: boolean;
  wheelsRemoved?: boolean;
  sectioned?: boolean;
};

function Rig({
  preset,
  nonce,
  lift,
  compact,
  car,
}: {
  preset: Preset;
  nonce: number;
  lift: number;
  compact: boolean;
  car: Car;
}) {
  const { body, shape } = useBody(car);
  const { camera, size } = useThree();
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as OrbitImpl | null;
  const goal = useRef<THREE.Vector3 | null>(null);
  const targetGoal = useRef(new THREE.Vector3(0, 0.45, 0));
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    if (isInspectionPreset(preset)) {
      const frame = inspectionFrame(car, body, shape, preset, lift);
      setCameraProjection(perspective, frame.fov, 0.012);
      goal.current = new THREE.Vector3(...frame.position);
      targetGoal.current.set(...frame.target);
      invalidate();
      return;
    }
    setCameraProjection(perspective, 30, 0.1);
    // Keep the whole car in frame on narrow viewports.
    const v = new THREE.Vector3(...presetPos[preset as keyof typeof presetPos]);
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const half = Math.atan(
      Math.tan(fov / 2) * (size.width / Math.max(1, size.height)),
    );
    const extent =
      preset === "front" || preset === "rear"
        ? 1.4
        : preset === "three"
          ? size.width / size.height < 0.8
            ? 3.1
            : compact
              ? 2.65
              : 3.0
          : preset === "side"
            ? 2.85
            : 3.0;
    const need = extent / Math.tan(half) + (preset === "three" ? 1.2 : 1);
    if (v.length() < need) v.setLength(Math.min(need, 24));
    const layers = layerWeights(lift);
    // The shell is set aside once cooling starts moving, so it should not keep
    // the camera pulled back for the inner layers.
    const outer = Math.max(0, layers.bodywork - layers.cooling);
    if (lift > 0) {
      // Follow the same staged lift as the parts, keeping the separated
      // bodywork and the remaining structure inside the frame.
      v.multiplyScalar(
        1 +
          outer * 0.38 +
          layers.cooling * 0.06 +
          layers.cabin * 0.05,
      );
      if (preset !== "top" && preset !== "under")
        v.y += outer * 0.78 + layers.cabin * 0.08;
    }
    goal.current = v;
    targetGoal.current.set(
      0,
      preset === "under"
        ? 0.2
        : 0.45 + outer * 0.85 + layers.cabin * 0.12,
      0,
    );
    invalidate();
  }, [
    preset,
    nonce,
    size.width,
    size.height,
    camera,
    lift,
    compact,
    car,
    body,
    shape,
    invalidate,
  ]);
  useEffect(() => {
    if (!controls) return;
    const stopTransition = () => {
      goal.current = null;
    };
    controls.addEventListener("start", stopTransition);
    return () => controls.removeEventListener("start", stopTransition);
  }, [controls]);
  useFrame((_, dt) => {
    if (!goal.current) return;
    const blend = 1 - Math.exp(-Math.min(dt, 0.08) * 4.5);
    if (controls) {
      if (controls.target.distanceTo(targetGoal.current) > 0.002) {
        controls.target.lerp(targetGoal.current, blend);
        controls.update();
      }
    }
    camera.position.lerp(goal.current, blend);
    controls?.update();
    if (
      camera.position.distanceTo(goal.current) < 0.01 &&
      (!controls || controls.target.distanceTo(targetGoal.current) < 0.01)
    )
      goal.current = null;
    else invalidate();
  });
  return null;
}

function Dimensions({ car }: { car: Car }) {
  const { body } = useBody(car);
  const L = body.spec.length,
    W = body.spec.width;
  const H = Math.max(
    ...Array.from({ length: 40 }, (_, i) => body.topAt(i / 39)),
  );
  const z = W / 2 + 0.45;
  const c = "#7fb0ff";
  const mm = (m: number) =>
    `≈ ${Math.round(m * 1000).toLocaleString("en-GB")} mm`;
  const seg = (a: V3, b: V3) => (
    <Line
      points={[a, b]}
      color={c}
      lineWidth={1.6}
      dashed
      dashSize={0.08}
      gapSize={0.05}
    />
  );
  return (
    <group>
      {seg([L / 2, 0.02, z], [-L / 2, 0.02, z])}
      {seg([L / 2, 0.02, z - 0.15], [L / 2, 0.02, z + 0.1])}
      {seg([-L / 2, 0.02, z - 0.15], [-L / 2, 0.02, z + 0.1])}
      <Label
        text={`Length ${mm(L)}`}
        position={[0, 0.15, z]}
        size={0.2}
        color="#cfe0ff"
      />
      {seg([body.frontX, 0.02, z - 0.3], [body.rearX, 0.02, z - 0.3])}
      <Label
        text={`Wheelbase ${mm(body.spec.wheelbase)}`}
        position={[(body.frontX + body.rearX) / 2, 0.14, z - 0.3]}
        size={0.17}
        color="#cfe0ff"
      />
      {seg([L / 2 + 0.4, 0.02, -W / 2], [L / 2 + 0.4, 0.02, W / 2])}
      <Label
        text={`Width ${mm(W)}`}
        position={[L / 2 + 0.45, 0.16, 0]}
        size={0.2}
        color="#cfe0ff"
      />
      {seg([-L / 2 - 0.3, 0, -W / 2], [-L / 2 - 0.3, H, -W / 2])}
      <Label
        text={`Height ${mm(H)}`}
        position={[-L / 2 - 0.35, H + 0.14, -W / 2]}
        size={0.2}
        color="#cfe0ff"
      />
    </group>
  );
}

const Studio = memo(function Studio({
  night,
  under,
  compact,
  lift,
  poseRevision,
}: {
  night: boolean;
  under: boolean;
  compact: boolean;
  lift: number;
  poseRevision: string;
}) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    refreshShadows(gl);
    invalidate();
  }, [poseRevision, night, compact, gl, invalidate]);
  const [settledPose, setSettledPose] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledPose(poseRevision), 1400);
    return () => window.clearTimeout(timer);
  }, [poseRevision]);
  const environmentLights = useMemo(
    () => (
      <>
        <Lightformer
          form="rect"
          intensity={night ? 1.4 : 3.6}
          position={[0, 6, 0]}
          rotation-x={Math.PI / 2}
          scale={[9, 4, 1]}
        />
        <Lightformer
          form="rect"
          intensity={night ? 0.8 : 2.2}
          position={[0, 2.8, 6]}
          scale={[11, 2, 1]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={night ? 1.4 : 2.8}
          position={[0, 3, -6]}
          rotation-y={Math.PI}
          scale={[11, 1.5, 1]}
          color="#e3edff"
        />
        <Lightformer
          form="rect"
          intensity={night ? 0.5 : 1.8}
          position={[7, 2, 0]}
          rotation-y={-Math.PI / 2}
          scale={[4, 2, 1]}
          color="#fff2dd"
        />
        <Lightformer
          form="rect"
          intensity={night ? 0.4 : 1}
          position={[-7, 2, 0]}
          rotation-y={Math.PI / 2}
          scale={[4, 2, 1]}
        />
      </>
    ),
    [night],
  );
  const background = night ? "#090c10" : "#161b21";
  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 16, 38]} />
      <ambientLight intensity={night ? 0.12 : 0.3} />
      <directionalLight
        position={[3, 7, 4]}
        intensity={night ? 1.2 : 2.3}
        color="#fff3e5"
        castShadow={!compact}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-normalBias={0.025}
        shadow-bias={-0.0001}
        shadow-radius={3}
      />
      <directionalLight
        position={[-4, 3, -5]}
        intensity={night ? 0.7 : 1.4}
        color="#d9e8ff"
      />
      <Environment resolution={256} frames={1}>
        {environmentLights}
      </Environment>
      <>
        <mesh
          visible={!under}
          rotation-x={-Math.PI / 2}
          position={[0, -0.012 - lift * 0.65, 0]}
          receiveShadow
        >
          <circleGeometry args={[40, 64]} />
          <meshStandardMaterial
            color={night ? "#030507" : "#050709"}
            envMapIntensity={0.05}
            roughness={1}
            metalness={0}
          />
        </mesh>
        <ContactShadows
          visible={!under}
          frames={under ? 0 : settledPose === poseRevision ? 1 : Infinity}
          position={[0, -0.008 - lift * 0.65, 0]}
          opacity={0.68}
          scale={11}
          blur={2.4}
          far={2.8}
          resolution={compact ? 256 : 384}
          color="#000000"
        />
      </>
    </>
  );
});

export function CarScene(p: SceneProps) {
  const container = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);
  const [detailRevision, setDetailRevision] = useState(0);
  const detailReady = useCallback(
    () => setDetailRevision((value) => value + 1),
    [],
  );
  useEffect(() => {
    const update = () => {
      const bounds = container.current?.getBoundingClientRect();
      const inViewport =
        !!bounds &&
        bounds.bottom > -80 &&
        bounds.top < window.innerHeight + 80 &&
        bounds.right > 0 &&
        bounds.left < window.innerWidth;
      setRendering(inViewport && !document.hidden);
    };
    const observer = new IntersectionObserver(update, { rootMargin: "80px" });
    if (container.current) observer.observe(container.current);
    const initial = requestAnimationFrame(update);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(initial);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const view = useMemo(
    () => ({
      car: p.car,
      selected: p.selected,
      hovered: p.hovered,
      rules: p.rules,
      xray: p.xray,
      focus: p.focus,
      night: p.night,
      bodyRemoved: p.bodyRemoved,
      wheelsRemoved: p.wheelsRemoved,
      sectioned: p.sectioned,
      inspection: isInspectionPreset(p.preset),
      exploded: p.exploded,
      preset: p.preset,
    }),
    [
      p.car,
      p.selected,
      p.hovered,
      p.rules,
      p.xray,
      p.focus,
      p.night,
      p.bodyRemoved,
      p.wheelsRemoved,
      p.sectioned,
      p.preset,
      p.exploded,
    ],
  );
  const under = p.preset === "under";
  return (
    <SceneBoundary>
      <div
        ref={container}
        className="car-scene"
        data-rendering={rendering}
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        <Canvas
          frameloop={rendering ? (p.spin ? "always" : "demand") : "never"}
          dpr={[1, p.compact ? 1.5 : 2]}
          shadows={!p.compact ? "percentage" : false}
          camera={{ position: presetPos.three, fov: 30, near: 0.1, far: 80 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: p.night ? 0.9 : 1.05,
          }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace;
            cacheStaticShadows(gl);
          }}
          onPointerMissed={() => p.onHover(null)}
        >
          <Studio
            night={p.night}
            under={under}
            compact={!!p.compact}
            lift={p.exploded}
            poseRevision={`${p.car.id}/${p.exploded}/${p.bodyRemoved}/${p.wheelsRemoved}/${p.focus ? p.selected : "all"}/${p.xray}/${p.sectioned}/${detailRevision}`}
          />
          <ViewCtx.Provider value={view}>
            <Suspense fallback={null}>
              <CarModel
                car={p.car}
                entry={p.entry}
                paint={p.paint}
                exploded={p.exploded}
                onSelect={p.onSelect}
                onHover={p.onHover}
                fontsReady={p.fontsReady}
                onDetailReady={detailReady}
              />
            </Suspense>
          </ViewCtx.Provider>
          {p.dims && <Dimensions car={p.car} />}
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={isInspectionPreset(p.preset) ? 0.18 : 3.2}
            maxDistance={25}
            autoRotate={p.spin}
            onStart={() => {
              p.onHover(null);
              p.onInteraction?.();
            }}
            maxPolarAngle={
              under || isInspectionPreset(p.preset) ? Math.PI : Math.PI * 0.49
            }
            autoRotateSpeed={0.8}
            enableDamping
          />
          <Rig
            car={p.car}
            preset={p.preset}
            nonce={p.presetNonce}
            lift={p.exploded}
            compact={!!p.compact}
          />
        </Canvas>
      </div>
    </SceneBoundary>
  );
}
