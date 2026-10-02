import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { refreshShadows } from "./shadowRefresh.ts";
import { useThree } from "@react-three/fiber";
import type { Car } from "../data/cars.ts";
import type { Body } from "./body.ts";
import type { Shape } from "./shapes.ts";
import { Mat, Rod } from "./primitives.tsx";
import {
  annularDiscGeometry,
  rotatedBankPoint,
  mechanicalLayout,
} from "./mechanicalGeometry.ts";
import {
  engineMechanism,
  pistonStudyGeometry,
  sleeveSectionGeometry,
  transmissionMechanism,
  toothedGearGeometry,
} from "./machineryGeometry.ts";
import type { Point } from "./machineryGeometry.ts";

type Pose = { p: Point; q?: THREE.Quaternion; r?: Point; s?: Point };
const ALU = "#b3b9bb";
const STEEL = "#84969f";
const DARK_STEEL = "#515e67";
const BEARING = "#a79674";

function sectionGeometry(kind: string, parameters: number[]) {
  switch (kind) {
    case "piston":
      return pistonStudyGeometry();
    case "sleeve":
      return sleeveSectionGeometry();
    case "web":
      return new THREE.BoxGeometry(0.008, 1, 0.011);
    case "flange":
      return new THREE.BoxGeometry(0.022, 1, 0.0035);
    case "piston-ring":
      return new THREE.TorusGeometry(0.043, 0.00085, 5, 40);
    case "big-eye":
      return annularDiscGeometry(0.024, 0.016, 0.014);
    case "small-eye":
      return annularDiscGeometry(0.013, 0.007, 0.016);
    case "journal":
      return new THREE.CylinderGeometry(0.021, 0.021, 0.037, 32);
    case "crank-pin":
      return new THREE.CylinderGeometry(0.016, 0.016, 0.043, 24);
    case "counterweight":
      return new THREE.CylinderGeometry(0.041, 0.041, 0.01, 24);
    case "main-bearing":
      return annularDiscGeometry(0.029, 0.021, 0.018);
    case "valve-stem":
      return new THREE.CylinderGeometry(0.0035, 0.0035, 1, 12);
    case "valve-head":
      return new THREE.CylinderGeometry(0.014, 0.012, 0.003, 20);
    case "valve-spring":
      return new THREE.TubeGeometry(new ValveSpring(), 40, 0.0012, 5);
    case "cam-lobe":
      return new THREE.CylinderGeometry(0.019, 0.019, 0.012, 20);
    case "cam-bearing":
      return annularDiscGeometry(0.021, 0.013, 0.013);
    case "trans-bearing":
      return annularDiscGeometry(0.028, 0.012, 0.018);
    case "dog-collar":
      return annularDiscGeometry(0.023, 0.013, 0.021);
    case "clutch-plate":
      return annularDiscGeometry(0.098, 0.022, 0.003);
    case "selector-groove":
      return new THREE.TubeGeometry(new SelectorGroove(), 64, 0.00085, 4, true);
    case "dog-teeth":
      return new THREE.BoxGeometry(0.007, 0.008, 0.008);
    case "gear":
      return toothedGearGeometry(parameters[0], parameters[1], parameters[2]);
    case "selector-fork": {
      const outline = new THREE.Shape();
      outline.absarc(0, 0, 0.03, Math.PI * 0.18, Math.PI * 0.82, true);
      outline.lineTo(
        Math.cos(Math.PI * 0.82) * 0.024,
        Math.sin(Math.PI * 0.82) * 0.024,
      );
      outline.absarc(0, 0, 0.024, Math.PI * 0.82, Math.PI * 0.18, false);
      outline.closePath();
      const g = new THREE.ExtrudeGeometry(outline, {
        depth: 0.01,
        bevelEnabled: false,
        curveSegments: 24,
      });
      g.translate(0, 0, -0.005);
      return g;
    }
    default:
      throw new Error(`Unknown sectional geometry ${kind}`);
  }
}

function useGeometry(kind: string, parameters: number[] = []) {
  const key = JSON.stringify(parameters);
  const g = useMemo(
    () => sectionGeometry(kind, JSON.parse(key) as number[]),
    [kind, key],
  );
  useEffect(() => () => g.dispose(), [g]);
  return g;
}

// Every repeated internal mechanism uses instancing; these meshes are mounted
// only with the housings open and do not incur closed-view draw calls.
function Instances({
  geometry,
  poses,
  color,
  metal = 0.85,
  rough = 0.4,
}: {
  geometry: THREE.BufferGeometry;
  poses: Pose[];
  color: string;
  metal?: number;
  rough?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (const [i, pose] of poses.entries()) {
      q.copy(
        pose.q ??
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(...(pose.r ?? [0, 0, 0])),
          ),
      );
      matrix.compose(
        new THREE.Vector3(...pose.p),
        q,
        new THREE.Vector3(...(pose.s ?? [1, 1, 1])),
      );
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [poses]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, poses.length]}
      receiveShadow
    >
      <Mat color={color} metal={metal} rough={rough} />
    </instancedMesh>
  );
}

function between(a: Point, b: Point): Pose {
  const va = new THREE.Vector3(...a),
    vb = new THREE.Vector3(...b);
  const delta = vb.clone().sub(va);
  return {
    p: va.add(vb).multiplyScalar(0.5).toArray() as Point,
    q: new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.clone().normalize(),
    ),
    s: [1, delta.length(), 1],
  };
}

function bankQuaternion(angle: number) {
  return new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    angle,
  );
}
const ALONG_X: Point = [0, Math.PI / 2, 0];
const CYLINDER_X: Point = [0, 0, Math.PI / 2];

class ValveSpring extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 8;
    return target.set(
      Math.cos(a) * 0.0065,
      (t - 0.5) * 0.028,
      Math.sin(a) * 0.0065,
    );
  }
}

class SelectorGroove extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2;
    return target.set(
      Math.cos(a) * 0.0189,
      Math.sin(a * 2) * 0.009,
      Math.sin(a) * 0.0189,
    );
  }
}

export function EngineSection({ car, length }: { car: Car; length: number }) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    refreshShadows(gl);
    invalidate();
  }, [gl, invalidate, car.id]);
  const mechanism = useMemo(() => engineMechanism(car, length), [car, length]);
  const piston = useGeometry("piston");
  const sleeve = useGeometry("sleeve");
  const rodWeb = useGeometry("web");
  const rodFlange = useGeometry("flange");
  const ring = useGeometry("piston-ring");
  const bigEye = useGeometry("big-eye");
  const smallEye = useGeometry("small-eye");
  const journal = useGeometry("journal");
  const crankPin = useGeometry("crank-pin");
  const web = useGeometry("counterweight");
  const bearing = useGeometry("main-bearing");
  const valveStem = useGeometry("valve-stem");
  const valveHead = useGeometry("valve-head");
  const valveSpring = useGeometry("valve-spring");
  const camLobe = useGeometry("cam-lobe");
  const camBearing = useGeometry("cam-bearing");
  const pistonPoses: Pose[] = [];
  const sleevePoses: Pose[] = [];
  const ringPoses: Pose[] = [];
  const rodPoses: Pose[] = [];
  const flangePoses: Pose[] = [];
  const bigEyes: Pose[] = [];
  const smallEyes: Pose[] = [];
  const valves: Pose[] = [];
  const valveHeads: Pose[] = [];
  const valveSprings: Pose[] = [];
  const cams: Pose[] = [];
  for (const cylinder of mechanism.cylinders) {
    const q = bankQuaternion(cylinder.angle);
    pistonPoses.push({ p: cylinder.piston, q });
    sleevePoses.push({
      p: rotatedBankPoint(cylinder.x, 0.147, 0, cylinder.angle),
      q,
    });
    for (const y of [0.194, 0.187, 0.18])
      ringPoses.push({
        p: rotatedBankPoint(cylinder.x, y, 0, cylinder.angle),
        q: q
          .clone()
          .multiply(
            new THREE.Quaternion().setFromEuler(
              new THREE.Euler(Math.PI / 2, 0, 0),
            ),
          ),
      });
    const rod = between(cylinder.crankPin, cylinder.wristPin);
    rodPoses.push(rod);
    for (const side of [-1, 1]) {
      const p = new THREE.Vector3(...rod.p).add(
        new THREE.Vector3(0, 0, side * 0.006).applyQuaternion(rod.q!),
      );
      flangePoses.push({ ...rod, p: p.toArray() as Point });
    }
    bigEyes.push({ p: cylinder.crankPin, r: ALONG_X });
    smallEyes.push({ p: cylinder.wristPin, r: ALONG_X });
    // An explicitly representative two-cam, four-valve head, not an OEM claim.
    for (const xSide of [-1, 1])
      for (const zSide of [-1, 1]) {
        const bottom = rotatedBankPoint(
          cylinder.x + xSide * 0.016,
          0.236,
          zSide * 0.028,
          cylinder.angle,
        );
        const top = rotatedBankPoint(
          cylinder.x + xSide * 0.016,
          0.31,
          zSide * 0.05,
          cylinder.angle,
        );
        const pose = between(bottom, top);
        valves.push(pose);
        valveHeads.push({ p: bottom, q: pose.q });
        valveSprings.push({
          p: rotatedBankPoint(
            cylinder.x + xSide * 0.016,
            0.29,
            zSide * 0.044,
            cylinder.angle,
          ),
          q: pose.q,
        });
        cams.push({
          p: rotatedBankPoint(
            cylinder.x + xSide * 0.016,
            0.326,
            zSide * 0.059,
            cylinder.angle,
          ),
          r: CYLINDER_X,
          s: [1, 1, 0.78],
        });
      }
  }
  const journals = mechanism.mains.map((x) => ({
    p: [x, 0, 0] as Point,
    r: CYLINDER_X,
  }));
  const mains = mechanism.mains.map((x) => ({
    p: [x, 0, 0] as Point,
    r: ALONG_X,
  }));
  const webs = mechanism.pins.flatMap((p) =>
    [-1, 1].map((side) => ({
      p: [p[0] + side * 0.023, p[1] * 0.4, p[2] * 0.4] as Point,
      r: CYLINDER_X,
      s: [1, 1, 0.88] as Point,
    })),
  );
  return (
    <group name="Illustrative engine mechanisms">
      <Rod
        a={[-length * 0.48, 0, 0]}
        b={[length * 0.48, 0, 0]}
        r={0.014}
        color={STEEL}
      />
      <Instances
        geometry={piston}
        poses={pistonPoses}
        color={ALU}
        rough={0.32}
      />
      <Instances
        geometry={sleeve}
        poses={sleevePoses}
        color="#737f85"
        rough={0.43}
      />
      <Instances
        geometry={ring}
        poses={ringPoses}
        color="#51595e"
        rough={0.48}
      />
      <Instances geometry={rodWeb} poses={rodPoses} color={STEEL} />
      <Instances geometry={rodFlange} poses={flangePoses} color={STEEL} />
      <Instances geometry={bigEye} poses={bigEyes} color={STEEL} />
      <Instances geometry={smallEye} poses={smallEyes} color={BEARING} />
      <Instances
        geometry={journal}
        poses={journals}
        color={STEEL}
        rough={0.28}
      />
      <Instances
        geometry={crankPin}
        poses={mechanism.pins.map((p) => ({ p, r: CYLINDER_X }))}
        color={STEEL}
        rough={0.26}
      />
      <Instances geometry={web} poses={webs} color={DARK_STEEL} />
      <Instances
        geometry={bearing}
        poses={mains}
        color={BEARING}
        rough={0.42}
      />
      <Instances
        geometry={valveStem}
        poses={valves}
        color={STEEL}
        rough={0.25}
      />
      <Instances
        geometry={valveHead}
        poses={valveHeads}
        color={ALU}
        rough={0.42}
      />
      <Instances
        geometry={valveSpring}
        poses={valveSprings}
        color={DARK_STEEL}
        rough={0.52}
      />
      <Instances geometry={camLobe} poses={cams} color={STEEL} rough={0.3} />
      {mechanism.banks.map((bank) => (
        <group key={bank.side}>
          {[-1, 1].map((side) => (
            <Rod
              key={side}
              a={rotatedBankPoint(
                -length * 0.43,
                0.326,
                side * 0.059,
                bank.angle,
              )}
              b={rotatedBankPoint(
                length * 0.43,
                0.326,
                side * 0.059,
                bank.angle,
              )}
              r={0.013}
              color={STEEL}
            />
          ))}
          <Instances
            geometry={camBearing}
            poses={[-length * 0.4, 0, length * 0.4].flatMap((x) =>
              [-1, 1].map((side) => ({
                p: rotatedBankPoint(x, 0.326, side * 0.059, bank.angle),
                r: ALONG_X,
              })),
            )}
            color={BEARING}
          />
        </group>
      ))}
    </group>
  );
}

function Gear({
  teeth,
  module,
  p,
  q,
  phase = 0,
  thickness = 0.021,
}: {
  teeth: number;
  module: number;
  p: Point;
  q: THREE.Quaternion;
  phase?: number;
  thickness?: number;
}) {
  const g = useGeometry("gear", [teeth, module, thickness]);
  const rotation = q
    .clone()
    .multiply(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        phase,
      ),
    );
  return (
    <mesh geometry={g} position={p} quaternion={rotation} receiveShadow>
      <Mat color={STEEL} metal={0.9} rough={0.36} />
    </mesh>
  );
}

export function TransmissionSection({
  car,
  body,
  shape,
}: {
  car: Car;
  body: Body;
  shape: Shape;
}) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    refreshShadows(gl);
    invalidate();
  }, [gl, invalidate, car.id]);
  const layout = mechanicalLayout(car, body, shape);
  const housingLength = layout.gearboxTransverse ? 0.38 : layout.gearboxLength;
  const engineFacingDirection = car.engine.position === "rear" ? -1 : 1;
  const clutchX =
    layout.gearboxX + engineFacingDirection * (housingLength / 2 + 0.034);
  const mechanism = useMemo(
    () => transmissionMechanism(car, body, shape),
    [car, body, shape],
  );
  const axis = new THREE.Vector3(...mechanism.axis);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    axis,
  );
  const bearing = useGeometry("trans-bearing");
  const clutch = useGeometry("clutch-plate");
  const grooves = useGeometry("selector-groove");
  const collar = useGeometry("dog-collar");
  const dogs = useGeometry("dog-teeth");
  const fork = useGeometry("selector-fork");
  const bearings: Pose[] = [];
  const collars: Pose[] = [];
  const dogPoses: Pose[] = [];
  const forkPoses: Pose[] = [];
  const forkOffsets: number[] = [];
  for (let i = 0; i < mechanism.shafts.length; i++)
    for (const side of [-1, 1])
      bearings.push({
        p: mechanism.position(i, side * mechanism.span * 0.49),
        q,
      });
  for (let i = 0; i < mechanism.count - 1; i += 2) {
    const offset =
      (mechanism.pairs[i].offset + mechanism.pairs[i + 1].offset) / 2;
    forkOffsets.push(offset);
    const p = mechanism.position(1, offset);
    collars.push({ p, q });
    forkPoses.push({ p, q });
    for (let tooth = 0; tooth < 6; tooth++) {
      const a = (tooth * Math.PI * 2) / 6;
      const radial = new THREE.Vector3(
        Math.cos(a) * 0.022,
        Math.sin(a) * 0.022,
        0,
      ).applyQuaternion(q);
      dogPoses.push({
        p: new THREE.Vector3(...p).add(radial).toArray() as Point,
        q: q
          .clone()
          .multiply(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 0, 1),
              a,
            ),
          ),
      });
    }
  }
  const drumCenter: Point = mechanism.transverse
    ? [mechanism.shafts[0][0] + 0.06, 0.42, 0]
    : [mechanism.shafts[0][0], 0.4, 0.11];
  const drumEnds = [-1, 1].map(
    (side) =>
      new THREE.Vector3(...drumCenter)
        .addScaledVector(axis, side * mechanism.span * 0.45)
        .toArray() as Point,
  );
  return (
    <group name="Representative sequential transmission mechanisms">
      {mechanism.shafts.map((_, i) => (
        <Rod
          key={i}
          a={mechanism.position(i, -mechanism.span / 2)}
          b={mechanism.position(i, mechanism.span / 2)}
          r={0.012}
          color={DARK_STEEL}
        />
      ))}
      <Instances
        geometry={clutch}
        poses={Array.from({ length: 6 }, (_, i) => ({
          p: [
            clutchX + engineFacingDirection * (i - 2.5) * 0.006,
            layout.engineY,
            0,
          ] as Point,
          r: ALONG_X,
        }))}
        color={STEEL}
        rough={0.5}
      />
      <Instances geometry={bearing} poses={bearings} color={BEARING} />
      {mechanism.pairs.map((pair, i) => (
        <group key={i}>
          <Gear
            teeth={pair.teethA}
            module={pair.module}
            p={mechanism.position(0, pair.offset)}
            q={q}
          />
          <Gear
            teeth={pair.teethB}
            module={pair.module}
            p={mechanism.position(1, pair.offset)}
            q={q}
            phase={Math.PI / pair.teethB}
          />
        </group>
      ))}
      {mechanism.shafts.length === 3 && (
        <>
          <Gear
            teeth={24}
            module={Math.hypot(0.04, 0.085) / 24}
            p={mechanism.position(1, mechanism.span * 0.465)}
            q={q}
          />
          <Gear
            teeth={24}
            module={Math.hypot(0.04, 0.085) / 24}
            p={mechanism.position(2, mechanism.span * 0.465)}
            q={q}
            phase={Math.PI / 24}
          />
        </>
      )}
      <Instances
        geometry={collar}
        poses={collars}
        color="#a0a9ae"
        rough={0.3}
      />
      <Instances geometry={dogs} poses={dogPoses} color={STEEL} />
      <Instances
        geometry={fork}
        poses={forkPoses}
        color="#aaac9b"
        rough={0.48}
      />
      <Rod a={drumEnds[0]} b={drumEnds[1]} r={0.018} color="#78888f" />
      <Instances
        geometry={grooves}
        poses={forkOffsets.map((offset) => ({
          p: new THREE.Vector3(...drumCenter)
            .addScaledVector(axis, offset)
            .toArray() as Point,
          q: new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            axis,
          ),
        }))}
        color="#343c41"
        metal={0.2}
        rough={0.65}
      />
      {forkOffsets.map((offset, i) => {
        const collarPoint = mechanism.position(1, offset);
        const stem: Point = [
          collarPoint[0],
          collarPoint[1] + 0.028,
          collarPoint[2],
        ];
        const drumPoint = new THREE.Vector3(...drumCenter)
          .addScaledVector(axis, offset)
          .toArray() as Point;
        return <Rod key={i} a={stem} b={drumPoint} r={0.0045} color={STEEL} />;
      })}
    </group>
  );
}
