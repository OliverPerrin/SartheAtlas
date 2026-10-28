import { writeFileSync } from "node:fs";
export default async function (p) {
  const car = process.env.CAR, id = process.env.ID, tuning = process.env.TUNING || "{}";
  await p.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await p.goto(`http://localhost:4330/harness.html?id=${id}&tuning=${encodeURIComponent(tuning)}`, 2000);
  if (!(await p.waitFor("window.state.ready || window.state.error", 90000))) throw new Error("timeout");
  const st = JSON.parse(await p.eval("JSON.stringify(window.state)"));
  if (!st.cam) throw new Error("load error");
  await p.sleep(4000);
  const t = st.cam.target, d = Math.hypot(...st.cam.position.map((v, i) => v - t[i]));
  const shot = async () => (await p.send("Page.captureScreenshot", { format: "png" })).data;
  const capture = async (name) => {
    await p.eval("setBg('#ff00ff')"); await p.sleep(300); const m = await shot();
    await p.eval("setBg('#00ff00')"); await p.sleep(300); const g = await shot();
    if (name) writeFileSync(`/tmp/sa-qa/sil/out/${car}-${name}.png`, Buffer.from(m, "base64"));
    return JSON.parse(await p.eval(`matte('data:image/png;base64,${m}','data:image/png;base64,${g}').then(JSON.stringify)`));
  };
  const look = (target, dir, D, fov) => p.eval(`look([${target.map((v, i) => v + dir[i] * D)}],[${target}],${fov})`);
  const fov = 12;
  let D = d * 3;
  // A target far from the model (a repaired root) leaves nothing in frame:
  // fall back to the model's bounding centre.
  const box = JSON.parse(await p.eval("new Promise(r=>api.getSceneGraph((e,g)=>r(JSON.stringify(g.bbox||null))))").catch(() => "null"));
  if (process.env.TARGET) t.splice(0, 3, ...JSON.parse(process.env.TARGET));
  const dirs = JSON.parse(process.env.DIRS ?? "[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]]");
  const upAxis = JSON.parse(process.env.UP ?? "[0,0,1]");
  const boxes = [];
  for (const dir of dirs) { await look(t, dir, D, fov); boxes.push(await capture()); }
  const ratio = (b) => (b.x1 - b.x0) / Math.max(1, b.y1 - b.y0);
  let si = 0; boxes.forEach((b, i) => { if (ratio(b) > ratio(boxes[si])) si = i; });
  const dir = dirs[si];
  // Centre the silhouette, then make the car span ~70% of the usable width.
  const f = dir.map((v) => -v);
  const right = [f[1] * upAxis[2] - f[2] * upAxis[1], f[2] * upAxis[0] - f[0] * upAxis[2], f[0] * upAxis[1] - f[1] * upAxis[0]];
  const recentre = async (scaleOut) => {
    D *= scaleOut;
    await look(t, dir, D, fov);
    const b = await capture();
    const perPx = (2 * D * Math.tan((fov * Math.PI) / 360)) / 1000; // vertical fov over 1000 px
    const dx = ((b.x0 + b.x1) / 2 - 800) * perPx;
    const dy = ((b.y0 + b.y1) / 2 - 500) * perPx;
    for (let i = 0; i < 3; i++) t[i] += right[i] * dx;
    for (let i = 0; i < 3; i++) t[i] -= upAxis[i] * dy;
    return b;
  };
  await recentre(1.8);
  const fitted = await recentre(1);
  D *= (fitted.x1 - fitted.x0) / (0.7 * 1480);
  await look(t, dir, D, fov);
  const side = await capture("side");
  const sideCols = JSON.parse(await p.eval("JSON.stringify(columns(14))"));
  const sideDark = JSON.parse(await p.eval(`JSON.stringify(dark(${side.y1}, ${Math.round((side.y1 - side.y0) * 0.62)}))`));
  // Plan view: rotate the model so its roof faces the same camera.
  const up = upAxis;
  const k = [up[1] * dir[2] - up[2] * dir[1], up[2] * dir[0] - up[0] * dir[2], up[0] * dir[1] - up[1] * dir[0]];
  if (process.env.PLANCAM) {
    // Look down the up axis, tilted a hair toward the side camera so the view
    // keeps the same screen orientation as the side capture.
    const over = up.map((v, i) => v + dir[i] * 0.002);
    await look(t, over, D, fov);
  } else {
    await p.eval(`rotateRoot(${Math.PI / 2}, [${k}])`);
    await p.sleep(1200);
  }
  // Rodrigues for the target.
  const rot = (v) => { const c = 0, s = 1; const kv = k[0]*v[0]+k[1]*v[1]+k[2]*v[2]; const kx = [k[1]*v[2]-k[2]*v[1], k[2]*v[0]-k[0]*v[2], k[0]*v[1]-k[1]*v[0]]; return v.map((vi, i) => vi * c + kx[i] * s + k[i] * kv * (1 - c)); };
  if (!process.env.PLANCAM) await look(rot(t), dir, D, fov);
  const plan = await capture("plan");
  const planCols = JSON.parse(await p.eval("JSON.stringify(columns(4))"));
  writeFileSync(`/tmp/sa-qa/sil/out/${car}.json`, JSON.stringify({ car, id, dir, D, fov, d, boxes, side, sideCols, sideDark, plan, planCols }));
  console.log(car, "dir", dir, "side", JSON.stringify(side), "plan", JSON.stringify(plan));
}
