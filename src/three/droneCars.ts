import * as THREE from "three";
import * as maplibregl from "maplibre-gl";
import type { CustomLayerInterface, Map as GeoMap } from "maplibre-gl";
import { Body } from "./body.ts";
import { shapes } from "./shapes.ts";
import { paintLivery, toTexture } from "./livery.ts";
import type { Car } from "../data/cars.ts";
import type { Entry } from "../data/entries.ts";
import type { Phase } from "../data/racePhase.ts";

/**
 * The cars in the aerial view are the same parametric studies as the car
 * explorer, drawn by three.js inside the map's own WebGL context: body shell
 * in its entry's colour study, wheels, wing, lamps, and at night the light
 * they throw on the road.
 */

export type DroneCarState = {
  /** Metres east and south of the followed car. */
  x: number;
  z: number;
  /** Direction of travel, radians, measured from east toward south. */
  heading: number;
  visible: boolean;
};

type Rig = {
  group: THREE.Group;
  body: THREE.MeshLambertMaterial;
  lamps: THREE.Mesh[];
  beams: THREE.Mesh[];
  tails: THREE.Mesh[];
  wash: THREE.Mesh;
  billboards: THREE.Mesh[];
};

const light: Record<
  Phase,
  {
    sun: number;
    sunColor: number;
    sunDir: [number, number, number];
    sky: number;
    ground: number;
    ambient: number;
    beams: number;
    glow: number;
    panels: number;
    shadow: number;
  }
> = {
  day: {
    sun: 2.4, sunColor: 0xfff1dc, sunDir: [0.5, 1, 0.35], sky: 0xcfe2ff,
    ground: 0x6b6558, ambient: 1.25, beams: 0, glow: 0.55, panels: 0.5, shadow: 0.55,
  },
  dusk: {
    sun: 2.1, sunColor: 0xff9a55, sunDir: [-1, 0.32, 0.2], sky: 0x8f8fd0,
    ground: 0x55362a, ambient: 0.75, beams: 0.6, glow: 0.9, panels: 1.4, shadow: 0.4,
  },
  night: {
    sun: 0.5, sunColor: 0x8fa8ff, sunDir: [0.3, 1, -0.4], sky: 0x27325c,
    ground: 0x0b0d16, ambient: 0.5, beams: 1, glow: 1, panels: 2.4, shadow: 0.2,
  },
  dawn: {
    sun: 1.5, sunColor: 0xffb6a8, sunDir: [1, 0.3, -0.2], sky: 0x9fb4e8,
    ground: 0x4a3a44, ambient: 0.8, beams: 0.5, glow: 0.85, panels: 1.2, shadow: 0.35,
  },
};

function gradientTexture(draw: (c: CanvasRenderingContext2D, n: number) => void) {
  const n = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = n;
  draw(canvas.getContext("2d")!, n);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function radial(stops: [number, string][]) {
  return gradientTexture((c, n) => {
    const g = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    for (const [at, color] of stops) g.addColorStop(at, color);
    c.fillStyle = g;
    c.fillRect(0, 0, n, n);
  });
}

export function createDroneCars(
  cast: { car: Car; entry: Entry }[],
  getStates: () => DroneCarState[],
  getPhase: () => Phase,
  getOrigin: () => [number, number],
  getScale: () => number,
): CustomLayerInterface & { dispose(): void } {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  const sky = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(sun, sky);
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(item: T) => {
    disposables.push(item);
    return item;
  };

  const textures = {
    flare: keep(
      radial([
        [0, "rgba(255,255,255,1)"],
        [0.14, "rgba(230,240,255,0.8)"],
        [0.45, "rgba(160,195,255,0.14)"],
        [1, "rgba(120,160,255,0)"],
      ]),
    ),
    tail: keep(
      radial([
        [0, "rgba(255,90,90,1)"],
        [0.2, "rgba(255,30,45,0.7)"],
        [0.6, "rgba(255,0,30,0.12)"],
        [1, "rgba(255,0,30,0)"],
      ]),
    ),
    shadow: keep(
      radial([
        [0, "rgba(0,0,0,0.85)"],
        [0.55, "rgba(0,0,0,0.5)"],
        [1, "rgba(0,0,0,0)"],
      ]),
    ),
    // Canvas x runs away from the car: a cone that widens and fades.
    beam: keep(
      gradientTexture((c, n) => {
        const g = c.createLinearGradient(0, 0, n, 0);
        g.addColorStop(0, "rgba(240,246,255,0.95)");
        g.addColorStop(0.3, "rgba(220,232,255,0.4)");
        g.addColorStop(1, "rgba(200,220,255,0)");
        c.fillStyle = g;
        c.filter = "blur(5px)";
        c.beginPath();
        c.moveTo(0, n * 0.4);
        c.lineTo(n, n * 0.06);
        c.lineTo(n, n * 0.94);
        c.lineTo(0, n * 0.6);
        c.closePath();
        c.fill();
      }),
    ),
  };
  const additive = (map: THREE.Texture) =>
    keep(
      new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
  const unit = keep(new THREE.PlaneGeometry(1, 1));

  const rigs: Rig[] = cast.map(({ car, entry }) => {
    const shape = shapes[car.id];
    const body = new Body(shape.body);
    const { length: L, width: W, wheelR, tyreW } = body.spec;
    const group = new THREE.Group();
    const canvases = paintLivery(car, shape, entry, "livery");
    const map = keep(toTexture(canvases.map));
    const emissive = keep(toTexture(canvases.emissive));
    const openings = keep(toTexture(canvases.openings, false));
    const paint = keep(
      new THREE.MeshLambertMaterial({
        map,
        emissiveMap: emissive,
        emissive: 0xffffff,
        emissiveIntensity: 0.6,
        alphaMap: openings,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    group.add(new THREE.Mesh(keep(body.geometry()), paint));

    const dark = keep(new THREE.MeshLambertMaterial({ color: 0x0c0d10 }));
    const carbon = keep(new THREE.MeshLambertMaterial({ color: 0x1a1c20 }));
    // Something dark behind the window openings.
    const cabin = new THREE.Mesh(
      keep(
        new THREE.BoxGeometry(
          (shape.cockpit.to - shape.cockpit.from) * L * 0.92,
          body.topAt(shape.cockpit.roof) - 0.32,
          0.62,
        ),
      ),
      dark,
    );
    cabin.position.set(
      body.x((shape.cockpit.from + shape.cockpit.to) / 2),
      0.2 + (body.topAt(shape.cockpit.roof) - 0.32) / 2,
      0,
    );
    group.add(cabin);
    const tyre = keep(new THREE.CylinderGeometry(wheelR, wheelR, tyreW, 20));
    tyre.rotateX(Math.PI / 2);
    const rim = keep(new THREE.CylinderGeometry(wheelR * 0.62, wheelR * 0.62, tyreW + 0.012, 16));
    rim.rotateX(Math.PI / 2);
    const rimPaint = keep(new THREE.MeshLambertMaterial({ color: 0x3a3d44 }));
    for (const x of [body.frontX, body.rearX])
      for (const side of [1, -1]) {
        const wheel = new THREE.Mesh(tyre, dark);
        wheel.position.set(x, wheelR, side * body.wheelZ);
        const hub = new THREE.Mesh(rim, rimPaint);
        hub.position.copy(wheel.position);
        group.add(wheel, hub);
      }
    const wingX = body.x(shape.wing.t);
    const plane = new THREE.Mesh(
      keep(new THREE.BoxGeometry(shape.wing.chord, 0.035, shape.wing.span)),
      carbon,
    );
    plane.position.set(wingX, shape.wing.y, 0);
    group.add(plane);
    for (const side of [1, -1]) {
      const plate = new THREE.Mesh(
        keep(new THREE.BoxGeometry(shape.wing.chord * 1.15, shape.wing.plate, 0.02)),
        carbon,
      );
      plate.position.set(wingX, shape.wing.y - shape.wing.plate * 0.3, (side * shape.wing.span) / 2);
      const pylon = new THREE.Mesh(
        keep(new THREE.BoxGeometry(0.16, shape.wing.y - body.topAt(shape.wing.t) + 0.1, 0.025)),
        carbon,
      );
      pylon.position.set(
        wingX + 0.04,
        (shape.wing.y + body.topAt(shape.wing.t)) / 2,
        side * 0.32,
      );
      group.add(plate, pylon);
    }
    const floor = new THREE.Mesh(
      keep(new THREE.BoxGeometry(L * 0.92, 0.03, W * 0.84)),
      carbon,
    );
    floor.position.y = 0.07;
    group.add(floor);

    const shadow = new THREE.Mesh(
      unit,
      keep(
        new THREE.MeshBasicMaterial({
          map: textures.shadow,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      ),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(L * 1.5, W * 1.9, 1);
    shadow.position.y = 0.02;
    shadow.renderOrder = -1;
    group.add(shadow);

    const lamps: THREE.Mesh[] = [];
    const beams: THREE.Mesh[] = [];
    const tails: THREE.Mesh[] = [];
    const billboards: THREE.Mesh[] = [];
    for (const side of [1, -1]) {
      const at = body.surfaceAt(0.068, 0.58, side, 0.04);
      const lamp = new THREE.Mesh(unit, additive(textures.flare));
      lamp.position.copy(at);
      lamp.scale.setScalar(1.1);
      lamp.renderOrder = 3;
      const beam = new THREE.Mesh(unit, additive(textures.beam));
      beam.rotation.x = -Math.PI / 2;
      beam.scale.set(26, 9, 1);
      beam.position.set(L / 2 + 12.6, 0.05, at.z * 0.9);
      beam.renderOrder = 2;
      const tail = new THREE.Mesh(unit, additive(textures.tail));
      tail.position.set(-L / 2 - 0.05, body.topAt(1) - 0.12, side * W * 0.34);
      tail.scale.setScalar(0.75);
      tail.renderOrder = 3;
      lamps.push(lamp);
      beams.push(beam);
      tails.push(tail);
      billboards.push(lamp, tail);
      group.add(lamp, beam, tail);
    }
    const wash = new THREE.Mesh(unit, additive(textures.tail));
    wash.rotation.x = -Math.PI / 2;
    wash.scale.set(7, 5, 1);
    wash.position.set(-L / 2 - 2.6, 0.05, 0);
    wash.renderOrder = 2;
    group.add(wash);
    scene.add(group);
    return { group, body: paint, lamps, beams, tails, wash, billboards };
  });

  let renderer: THREE.WebGLRenderer | null = null;
  let host: GeoMap | null = null;
  const projection = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const upright = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const flip = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  const target = new THREE.Vector3();
  const look = { ...light.day, sunDir: [...light.day.sunDir] as [number, number, number] };
  const colour = { sun: new THREE.Color(), sky: new THREE.Color(), ground: new THREE.Color() };
  let last = 0;

  return {
    id: "drone-cars",
    type: "custom",
    renderingMode: "3d",
    onAdd(map, gl) {
      host = map;
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl as WebGL2RenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
    },
    render(_gl, args) {
      if (!renderer || !host) return;
      const now = performance.now();
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1;
      last = now;
      // Ease every lighting value toward the current phase.
      const goal = light[getPhase()];
      const k = 1 - Math.exp(-dt * 1.6);
      for (const key of ["sun", "ambient", "beams", "glow", "panels", "shadow"] as const)
        look[key] += (goal[key] - look[key]) * k;
      for (let i = 0; i < 3; i++)
        look.sunDir[i] += (goal.sunDir[i] - look.sunDir[i]) * k;
      sun.color.lerp(colour.sun.set(goal.sunColor), k);
      sky.color.lerp(colour.sky.set(goal.sky), k);
      sky.groundColor.lerp(colour.ground.set(goal.ground), k);
      sun.intensity = look.sun;
      sky.intensity = look.ambient;
      sun.position.set(...look.sunDir).normalize();

      const bearing = (host.getBearing() * Math.PI) / 180;
      const pitch = (host.getPitch() * Math.PI) / 180;
      toCamera.set(
        -Math.sin(bearing) * Math.sin(pitch),
        Math.cos(pitch),
        Math.cos(bearing) * Math.sin(pitch),
      );
      const scale = getScale();
      const states = getStates();
      rigs.forEach((rig, i) => {
        const state = states[i];
        rig.group.visible = !!state?.visible;
        if (!state) return;
        rig.group.position.set(state.x, 0, state.z);
        rig.group.rotation.y = -state.heading;
        rig.group.scale.setScalar(scale);
        rig.body.emissiveIntensity = look.panels;
        for (const beam of rig.beams)
          (beam.material as THREE.MeshBasicMaterial).opacity = look.beams * 0.55;
        (rig.wash.material as THREE.MeshBasicMaterial).opacity = look.beams * 0.5;
        for (const lamp of rig.lamps)
          (lamp.material as THREE.MeshBasicMaterial).opacity = look.glow;
        for (const tail of rig.tails)
          (tail.material as THREE.MeshBasicMaterial).opacity = look.glow * 0.9;
        const shadow = rig.group.children.find((child) => child.renderOrder === -1);
        if (shadow)
          ((shadow as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = look.shadow;
        rig.group.updateMatrixWorld(true);
        // Lamp flares always face the drone.
        for (const quad of rig.billboards) {
          quad.getWorldPosition(target).add(toCamera);
          quad.lookAt(target);
        }
      });

      const origin = maplibregl.MercatorCoordinate.fromLngLat(getOrigin(), 0);
      const metre = origin.meterInMercatorCoordinateUnits();
      local
        .makeTranslation(origin.x, origin.y, origin.z)
        .scale(flip.set(metre, -metre, metre))
        .multiply(upright);
      camera.projectionMatrix = projection
        .fromArray(args.defaultProjectionData.mainMatrix)
        .multiply(local);
      renderer.resetState();
      renderer.render(scene, camera);
    },
    onRemove() {
      this.dispose();
    },
    dispose() {
      disposables.splice(0).forEach((item) => item.dispose());
      // The WebGL context belongs to the map; only release three's state.
      renderer?.dispose();
      renderer = null;
      host = null;
    },
  };
}
