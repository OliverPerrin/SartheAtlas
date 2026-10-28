import {
  Component,
  memo,
  useCallback,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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
import { createBuildClock, usesGarage } from "./teardown.ts";
import type { BuildClock, StudioMode } from "./teardown.ts";
import { GarageRegistry, TeardownCtx, useTeardown } from "./teardownLayout.ts";
import { AeroFlow, BuildDriver, GarageFloor } from "./TeardownStage.tsx";
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
  studio?: StudioMode;
  clock?: BuildClock;
};

function Rig({
  preset,
  nonce,
  lift,
  compact,
  car,
  studio,
}: {
  preset: Preset;
  nonce: number;
  lift: number;
  compact: boolean;
  car: Car;
  studio: StudioMode;
}) {
  const { body, shape } = useBody(car);
  const { garage } = useTeardown();
  const version = useSyncExternalStore(garage.subscribe, garage.getVersion);
  // Only the garage framing depends on the measured layout.
  const layoutVersion = usesGarage(studio) ? version : 0;
  const { camera, size } = useThree();
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as OrbitImpl | null;
  const goal = useRef<THREE.Vector3 | null>(null);
  const targetGoal = useRef(new THREE.Vector3(0, 0.45, 0));
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    if (studio !== "cutaway") {
      const aspect = size.width / Math.max(1, size.height);
      if (studio === "tunnel") {
        setCameraProjection(perspective, 30, 0.1);
        goal.current = new THREE.Vector3(6.4, 2.2, 7.6).multiplyScalar(
          aspect < 0.8 ? 2.15 : aspect < 1.2 ? 1.35 : 1,
        );
        targetGoal.current.set(-0.4, 0.45, 0);
      } else {
        // High over the garage floor: back off until every corner of the
        // measured layout (and the tallest parts on it) is inside the frame.
        setCameraProjection(perspective, 34, 0.1);
        const { bounds } = garage.current();
        const centre = new THREE.Vector3(
          (bounds.x0 + bounds.x1) / 2,
          0,
          (bounds.z0 + bounds.z1) / 2,
        );
        const hx = (bounds.x1 - bounds.x0) / 2 + 0.3;
        const hz = (bounds.z1 - bounds.z0) / 2 + 0.3;
        const direction = new THREE.Vector3(0.14, 1, 0.9).normalize();
        const probe = new THREE.PerspectiveCamera(34, aspect, 0.1, 80);
        const corner = new THREE.Vector3();
        let distance = 8;
        for (; distance < 40; distance += 0.25) {
          probe.position.copy(direction).multiplyScalar(distance).add(centre);
          probe.lookAt(centre);
          probe.updateMatrixWorld();
          let fits = true;
          for (const x of [-hx, hx])
            for (const y of [0, 0.9])
              for (const z of [-hz, hz]) {
                corner.set(x, y, z).add(centre).project(probe);
                if (Math.abs(corner.x) > 0.97 || Math.abs(corner.y) > 0.86)
                  fits = false;
              }
          if (fits) break;
        }
        goal.current = direction.multiplyScalar(distance).add(centre);
        targetGoal.current.copy(centre);
      }
      invalidate();
      return;
    }
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
        1 + outer * 0.38 + layers.cooling * 0.06 + layers.cabin * 0.05,
      );
      if (preset !== "top" && preset !== "under")
        v.y += outer * 0.78 + layers.cabin * 0.08;
    }
    goal.current = v;
    targetGoal.current.set(
      0,
      preset === "under" ? 0.2 : 0.45 + outer * 0.85 + layers.cabin * 0.12,
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
    studio,
    garage,
    layoutVersion,
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
  wide = false,
  tunnel = false,
}: {
  night: boolean;
  under: boolean;
  compact: boolean;
  lift: number;
  poseRevision: string;
  wide?: boolean;
  tunnel?: boolean;
}) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const sun = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    // The garage layout spreads parts well beyond the car's own footprint.
    const shadow = sun.current?.shadow;
    if (!shadow) return;
    const camera = shadow.camera;
    // A cached map keeps its old size and bounds; let three rebuild it.
    shadow.map?.dispose();
    shadow.map = null;
    const reach = wide ? 9 : 5;
    Object.assign(camera, {
      left: -reach,
      right: reach,
      top: reach,
      bottom: -reach,
    });
    camera.updateProjectionMatrix();
    refreshShadows(gl);
    invalidate();
  }, [wide, gl, invalidate]);
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
  const background = tunnel ? "#030508" : night ? "#090c10" : "#161b21";
  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, wide ? 34 : 16, wide ? 80 : 38]} />
      <ambientLight intensity={night ? 0.12 : 0.3} />
      <directionalLight
        ref={sun}
        position={[3, 7, 4]}
        intensity={night ? 1.2 : 2.3}
        color="#fff3e5"
        castShadow={!compact}
        shadow-mapSize={wide ? [2048, 2048] : [1024, 1024]}
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
          scale={wide ? 22 : 11}
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
  const studio = p.studio ?? "cutaway";
  const tunnel = studio === "tunnel";
  const [garage] = useState(() => new GarageRegistry());
  const [ownClock] = useState(createBuildClock);
  const clock = p.clock ?? ownClock;
  useEffect(() => garage.invalidate(), [garage, detailRevision, p.car.id]);
  const teardown = useMemo(
    () => ({ mode: studio, clock, garage }),
    [studio, clock, garage],
  );
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
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
            wide={usesGarage(studio)}
            tunnel={tunnel}
            night={p.night || tunnel}
            under={under}
            compact={!!p.compact}
            lift={p.exploded}
            poseRevision={`${studio}/${p.car.id}/${p.exploded}/${p.bodyRemoved}/${p.wheelsRemoved}/${p.focus ? p.selected : "all"}/${p.xray}/${p.sectioned}/${detailRevision}`}
          />
          <TeardownCtx.Provider value={teardown}>
            <BuildDriver />
            {usesGarage(studio) && <GarageFloor />}
            {tunnel && <AeroFlow car={p.car} animate={!reducedMotion} />}
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
            <Rig
              studio={studio}
              car={p.car}
              preset={p.preset}
              nonce={p.presetNonce}
              lift={p.exploded}
              compact={!!p.compact}
            />
          </TeardownCtx.Provider>
          {p.dims && studio === "cutaway" && <Dimensions car={p.car} />}
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={isInspectionPreset(p.preset) ? 0.18 : 3.2}
            maxDistance={usesGarage(studio) ? 34 : 25}
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
        </Canvas>
      </div>
    </SceneBoundary>
  );
}
