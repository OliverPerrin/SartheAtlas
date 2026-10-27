import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Car } from "../data/cars.ts";
import { engineMechanism, sleeveSectionGeometry } from "./machineryGeometry.ts";
import { Mat, Rod } from "./primitives.tsx";
import type { V3 } from "./primitives.tsx";
import { refreshShadows } from "./shadowRefresh.ts";
import {
  barrelTubeGeometry,
  camCoverColor,
  chargeFlanges,
  coverDistances,
  cylinderDeckGeometry,
  engineArchitecture,
  gasketFrameGeometry,
  headerPaths,
  intakePaths,
  jacketInspectionTilt,
  openCoverGeometry,
  plenumPlacement,
  sideShellGeometry,
  sumpPanGeometry,
  turboStudyPositions,
} from "./engineTeardown.ts";

const EngineSection = lazy(() =>
  import("./MachinerySections.tsx").then((module) => ({
    default: module.EngineSection,
  })),
);

const CAST = "#626c72";
const ALU = "#8f999f";
const BORE = "#737f85";
const GASKET = "#1c2428";
const HEADER = "#9c8b72";

function useDisposed<T extends THREE.BufferGeometry>(geometry: T) {
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function Tubes({
  paths,
  radius,
  color,
  metal = 0.86,
  rough = 0.5,
}: {
  paths: V3[][];
  radius: number;
  color: string;
  metal?: number;
  rough?: number;
}) {
  const key = JSON.stringify(paths);
  const geometry = useMemo(() => {
    const routes = JSON.parse(key) as V3[][];
    const pieces = routes
      .filter((path) => path.length > 1)
      .map(
        (path) =>
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(
              path.map((point) => new THREE.Vector3(...point)),
              false,
              "centripetal",
            ),
            Math.max(12, path.length * 6),
            radius,
            7,
            false,
          ),
      );
    const merged = pieces.length ? mergeGeometries(pieces, false) : null;
    pieces.forEach((piece) => piece.dispose());
    return merged;
  }, [key, radius]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  return geometry ? (
    <mesh geometry={geometry} castShadow={radius > 0.02}>
      <Mat color={color} metal={metal} rough={rough} />
    </mesh>
  ) : null;
}

function SharedMesh({
  geometry,
  position,
  rotation,
  color,
  metal = 0.78,
  rough = 0.42,
  doubleSide = false,
}: {
  geometry: THREE.BufferGeometry;
  position?: V3;
  rotation?: V3;
  color: string;
  metal?: number;
  rough?: number;
  doubleSide?: boolean;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      geometry={geometry}
      castShadow
      receiveShadow
    >
      <Mat
        color={color}
        metal={metal}
        rough={rough}
        side={doubleSide ? THREE.DoubleSide : undefined}
      />
    </mesh>
  );
}

function AlongBank({
  xs,
  y,
  z,
  geometry,
  color,
  metal = 0.76,
  rough = 0.4,
  doubleSide = false,
  tilt,
}: {
  xs: number[];
  y: number;
  z: number;
  geometry: THREE.BufferGeometry;
  color: string;
  metal?: number;
  rough?: number;
  doubleSide?: boolean;
  tilt?: THREE.Quaternion;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const key = xs.join(",");
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new THREE.Matrix4();
    if (tilt) matrix.makeRotationFromQuaternion(tilt);
    xs.forEach((x, index) => {
      matrix.setPosition(x, y, z);
      mesh.current!.setMatrixAt(index, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [key, xs, y, z, tilt]);
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, xs.length]}
      receiveShadow
    >
      <Mat
        color={color}
        metal={metal}
        rough={rough}
        side={doubleSide ? THREE.DoubleSide : undefined}
      />
    </instancedMesh>
  );
}

function MechanismReady({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    onReady();
    invalidate();
  }, [onReady, invalidate]);
  return null;
}

export function EngineConstruction({
  car,
  length,
  phase,
  drySump,
}: {
  car: Car;
  length: number;
  phase: number;
  drySump: boolean;
}) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const [detailed, setDetailed] = useState(false);
  const markReady = useMemo(() => () => setDetailed(true), []);
  useEffect(() => {
    refreshShadows(gl);
    invalidate();
  }, [gl, invalidate, phase, car.id]);

  const architecture = engineArchitecture(car);
  const distances = coverDistances(phase);
  const mechanism = useMemo(() => engineMechanism(car, length), [car, length]);
  const banks = mechanism.banks;
  const plenum = useMemo(() => plenumPlacement(car, length), [car, length]);
  const plenumShell = useDisposed(
    useMemo(
      () => openCoverGeometry(plenum.size[0], plenum.size[2], plenum.size[1]),
      [plenum],
    ),
  );
  const coverColor = camCoverColor(car);
  const headWidth =
    car.engine.config === "I" ? 0.2 : car.engine.config === "F" ? 0.15 : 0.17;
  const bankParts = useMemo(
    () =>
      banks.map((bank) => {
        const xs = mechanism.cylinders
          .filter((cylinder) => cylinder.angle === bank.angle)
          .map((cylinder) => cylinder.x);
        return { xs, deck: cylinderDeckGeometry(length, headWidth * 0.92, xs) };
      }),
    [banks, mechanism, length, headWidth],
  );
  useEffect(
    () => () => bankParts.forEach((part) => part.deck.dispose()),
    [bankParts],
  );
  const cover = useDisposed(
    useMemo(
      () => openCoverGeometry(length * 0.9, headWidth, 0.064),
      [length, headWidth],
    ),
  );
  const gasket = useDisposed(
    useMemo(
      () => gasketFrameGeometry(length * 0.9, headWidth * 0.92),
      [length, headWidth],
    ),
  );
  const sleeve = useDisposed(useMemo(() => sleeveSectionGeometry(), []));
  const barrel = useDisposed(useMemo(() => barrelTubeGeometry(), []));
  const sideCover = useDisposed(
    useMemo(() => sideShellGeometry(length * 0.9, 0.12), [length]),
  );
  const pan = useDisposed(
    useMemo(
      () =>
        sumpPanGeometry(
          length * 0.84,
          drySump ? 0.22 : 0.26,
          drySump ? 0.042 : 0.072,
        ),
      [length, drySump],
    ),
  );
  const valleyPlate = useDisposed(
    useMemo(() => new THREE.BoxGeometry(length * 0.7, 0.012, 0.16), [length]),
  );
  const intakes = useMemo(() => intakePaths(car, length), [car, length]);
  const headers = useMemo(() => headerPaths(car, length), [car, length]);
  const charges = useMemo(() => chargeFlanges(car, length), [car, length]);
  const turbos = turboStudyPositions(car, length);
  const expose = phase > 0;

  return (
    <group>
      <group name="engine-crankcase">
        <mesh position={[0, -0.01, -0.1]} castShadow receiveShadow>
          <boxGeometry args={[length * 0.96, 0.15, 0.016]} />
          <Mat color={CAST} metal={0.7} rough={0.58} />
        </mesh>
        {[-1, 1].map((end) => (
          <mesh
            key={end}
            position={[end * length * 0.47, -0.01, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.02, 0.15, 0.2]} />
            <Mat color="#59636a" metal={0.74} rough={0.46} />
          </mesh>
        ))}
        {architecture.crankcaseOpening === "camera-side" && (
          <mesh position={[0, 0.05, 0]} receiveShadow>
            <boxGeometry args={[length * 0.88, 0.018, 0.12]} />
            <Mat color="#5c676d" metal={0.72} rough={0.5} />
          </mesh>
        )}
        {architecture.crankcaseOpening === "camera-side" ? (
          <group position={[0, -0.01, 0.09 + distances.crankcaseSide]}>
            <SharedMesh
              geometry={sideCover}
              color={ALU}
              metal={0.84}
              rough={0.32}
              doubleSide
            />
          </group>
        ) : (
          <group position={[0, 0.062 + distances.plenum, 0]}>
            <SharedMesh
              geometry={valleyPlate}
              color={CAST}
              rough={0.55}
              doubleSide
            />
          </group>
        )}
        <mesh
          position={[length * 0.5, 0.01, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry
            args={[
              car.engine.config === "F" ? 0.09 : 0.11,
              car.engine.config === "F" ? 0.09 : 0.11,
              0.028,
              28,
            ]}
          />
          <Mat color={CAST} metal={0.72} rough={0.5} />
        </mesh>
        <mesh position={[length * 0.36, -0.0825, 0.13]} castShadow>
          <boxGeometry args={[0.09, 0.05, 0.04]} />
          <Mat color={ALU} metal={0.8} rough={0.36} />
        </mesh>
        {Array.from({ length: 6 }, (_, index) => (
          <mesh
            key={index}
            position={[-length * 0.34 + index * length * 0.136, -0.02, -0.112]}
            castShadow
          >
            <boxGeometry args={[0.012, 0.12, 0.012]} />
            <Mat color="#7d868b" metal={0.68} rough={0.5} />
          </mesh>
        ))}
      </group>

      {banks.map((bank, bankIndex) => (
        <group key={bank.side} name="engine-bank" rotation={[bank.angle, 0, 0]}>
          <mesh
            position={[0, 0.2, 0]}
            geometry={bankParts[bankIndex].deck}
            receiveShadow
          >
            <Mat color={ALU} metal={0.84} rough={0.3} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[0, 0.29, side * 0.05]} castShadow>
              <boxGeometry args={[length * 0.84, 0.045, 0.016]} />
              <Mat color={CAST} metal={0.7} rough={0.52} />
            </mesh>
          ))}
          {bank.cylinders.map((x) =>
            [-1, 1].map((side) => (
              <mesh
                key={`${x}-${side}`}
                position={[x, 0.322, side * 0.055]}
                castShadow
              >
                <boxGeometry args={[0.022, 0.036, 0.026]} />
                <Mat color="#4e585e" metal={0.75} rough={0.42} />
              </mesh>
            )),
          )}
          <mesh position={[0, 0.306, 0]} geometry={gasket} receiveShadow>
            <Mat color={GASKET} metal={0.08} rough={0.9} />
          </mesh>
          <group position={[0, 0.31 + distances.camCover, 0]}>
            <SharedMesh
              geometry={cover}
              color={coverColor}
              metal={0.16}
              rough={0.48}
              doubleSide
            />
            {bank.cylinders.map((x) => (
              <mesh key={x} position={[x, 0.07, 0]}>
                <boxGeometry args={[0.028, 0.012, 0.04]} />
                <Mat color="#1d272b" metal={0.2} rough={0.55} />
              </mesh>
            ))}
          </group>
          <AlongBank
            xs={bankParts[bankIndex].xs}
            y={0.147}
            z={0}
            geometry={sleeve}
            color={BORE}
            rough={0.4}
          />
          <AlongBank
            xs={bankParts[bankIndex].xs}
            y={0.147}
            z={distances.barrel}
            geometry={barrel}
            tilt={jacketInspectionTilt(bank.angle, phase)}
            color={CAST}
            rough={0.56}
            doubleSide
          />
        </group>
      ))}

      <group
        name="engine-sump"
        position={[0.01, (drySump ? -0.1 : -0.12) - distances.sump, 0]}
      >
        <SharedMesh
          geometry={pan}
          color="#58636a"
          metal={0.74}
          rough={0.48}
          doubleSide
        />
      </group>

      <group
        position={[
          plenum.center[0],
          plenum.center[1] - plenum.size[1] / 2 + distances.plenum,
          plenum.center[2],
        ]}
      >
        <SharedMesh
          geometry={plenumShell}
          color={
            architecture.intake === "charge-manifold" ? "#3c464c" : "#20272c"
          }
          metal={architecture.intake === "charge-manifold" ? 0.4 : 0.08}
          rough={0.55}
          doubleSide
        />
        {architecture.singleThrottle ? (
          <mesh
            position={[plenum.size[0] / 2 + 0.03, plenum.size[1] / 2, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.028, 0.028, 0.05, 20]} />
            <Mat color={ALU} metal={0.8} rough={0.34} />
          </mesh>
        ) : architecture.intake === "airbox" ||
          architecture.intake === "boxer-plenum" ? (
          <mesh
            position={[plenum.size[0] / 2 + 0.04, plenum.size[1] / 2, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.032, 0.036, 0.07, 20]} />
            <Mat color={ALU} metal={0.78} rough={0.36} />
          </mesh>
        ) : null}
        {charges.map((charge, index) => (
          <mesh
            key={index}
            position={[
              charge.flange[0] - plenum.center[0],
              charge.flange[1] - (plenum.center[1] - plenum.size[1] / 2),
              charge.flange[2] - plenum.center[2],
            ]}
          >
            <cylinderGeometry args={[0.018, 0.022, 0.012, 12]} />
            <Mat color="#252f36" metal={0.45} rough={0.5} />
          </mesh>
        ))}
      </group>

      <Tubes
        paths={intakes}
        radius={0.016}
        color="#687a82"
        metal={0.75}
        rough={0.4}
      />
      <Tubes
        paths={headers}
        radius={0.014}
        color={HEADER}
        metal={0.9}
        rough={0.62}
      />
      {turbos.length === 1 && (
        <Tubes
          paths={[-1, 1].map((side) => [
            [turbos[0][0] - 0.06, turbos[0][1] - 0.01, side * 0.16],
            [turbos[0][0] - 0.03, turbos[0][1], turbos[0][2]],
          ])}
          radius={0.018}
          color={HEADER}
          metal={0.9}
          rough={0.62}
        />
      )}
      <Tubes
        paths={charges.map((charge) => {
          const stop: V3 = [
            charge.flange[0],
            charge.flange[1] - 0.004,
            charge.flange[2],
          ];
          return [charge.outlet, stop];
        })}
        radius={0.02}
        color="#252f36"
        metal={0.35}
        rough={0.52}
      />

      {expose && !detailed && (
        <group name="Illustrative engine mechanisms">
          <Rod
            a={[-length * 0.48, 0, 0]}
            b={[length * 0.48, 0, 0]}
            r={0.014}
            color="#84969f"
          />
          {mechanism.cylinders.map((cylinder, index) => (
            <group key={index}>
              <mesh
                position={cylinder.piston}
                rotation={[cylinder.angle, 0, 0]}
              >
                <cylinderGeometry args={[0.04, 0.04, 0.04, 16]} />
                <Mat color={ALU} metal={0.8} rough={0.34} />
              </mesh>
              <Rod
                a={cylinder.crankPin}
                b={cylinder.wristPin}
                r={0.008}
                color="#84969f"
              />
            </group>
          ))}
          {banks.map((bank) =>
            [-1, 1].map((side) => (
              <Rod
                key={`${bank.side}-${side}`}
                a={[
                  -length * 0.42,
                  Math.cos(bank.angle) * 0.326 -
                    Math.sin(bank.angle) * side * 0.059,
                  Math.sin(bank.angle) * 0.326 +
                    Math.cos(bank.angle) * side * 0.059,
                ]}
                b={[
                  length * 0.42,
                  Math.cos(bank.angle) * 0.326 -
                    Math.sin(bank.angle) * side * 0.059,
                  Math.sin(bank.angle) * 0.326 +
                    Math.cos(bank.angle) * side * 0.059,
                ]}
                r={0.012}
                color="#84969f"
              />
            )),
          )}
        </group>
      )}
      {expose && (
        <Suspense fallback={null}>
          <EngineSection car={car} length={length} />
          <MechanismReady onReady={markReady} />
        </Suspense>
      )}
    </group>
  );
}
