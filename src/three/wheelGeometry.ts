import * as THREE from "three";

export const splitSpokeDesign = (design: string) =>
  ["porsche", "m4", "bmw", "ford", "mercedes"].includes(design);

export function rimGeometry(design: string, width: number) {
  const split = splitSpokeDesign(design);
  const outline = new THREE.Shape();
  outline.moveTo(0.031, -0.012);
  outline.lineTo(0.205, -0.023);
  outline.lineTo(0.222, -0.012);
  outline.lineTo(0.115, 0.008);
  if (split) {
    outline.lineTo(0.22, 0.026);
    outline.lineTo(0.214, 0.038);
    outline.lineTo(0.087, 0.02);
  } else {
    outline.lineTo(0.219, 0.009);
    outline.lineTo(0.21, 0.022);
  }
  outline.lineTo(0.031, 0.014);
  outline.closePath();
  const spoke = new THREE.ExtrudeGeometry(outline, {
    depth: 0.016,
    bevelEnabled: false,
    curveSegments: 12,
  });
  spoke.translate(0, 0, -0.008);
  spoke.rotateX(Math.PI / 2);
  const geometry = {
    spoke,
    barrel: new THREE.CylinderGeometry(0.229, 0.229, width * 0.87, 64, 1, true),
    lip: new THREE.TorusGeometry(0.224, 0.008, 8, 64),
    face: new THREE.RingGeometry(0.205, 0.23, 64),
    hub: new THREE.CylinderGeometry(0.05, 0.05, 0.036, 32),
    nut: new THREE.CylinderGeometry(0.031, 0.034, 0.038, 12),
    lock: new THREE.RingGeometry(0.013, 0.02, 20),
    valve: new THREE.CylinderGeometry(0.003, 0.003, 0.026, 8),
  };
  return { geometry, spokeCount: split ? 5 : 10 };
}

export function spokeMatrices(width: number, count: number) {
  return [-1, 1].flatMap((side) =>
    Array.from({ length: count }, (_, i) =>
      new THREE.Matrix4().compose(
        new THREE.Vector3(0, side * (width * 0.395 - 0.009), 0),
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          (i * Math.PI * 2) / count,
        ),
        new THREE.Vector3(1, 1, 1),
      ),
    ),
  );
}
