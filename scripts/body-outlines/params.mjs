import { readFileSync } from "node:fs";
const ROOT = process.env.ROOT ?? "/Users/oliverperrin/SartheAtlas";
const { shapes } = await import(`${ROOT}/src/three/shapes.ts`);
const fits = JSON.parse(readFileSync("/tmp/sa-qa/sil/fits.json", "utf8"));
const r2 = (v) => Math.round(v * 100) / 100;
for (const [car, fit] of Object.entries(fits)) {
  const st = fit.stations, ts = st.map((s) => s[0]), top = st.map((s) => s[1] ?? 0);
  const sh = shapes[car], spec = sh.body;
  const fa = spec.frontAxle, tr = fa + spec.wheelbase / spec.length;
  const at = (t) => { const i = Math.round(t * (ts.length - 1)); return top[i]; };
  if (spec.kind === "gt") {
    // Deck minimum before the wing step.
    let mi = ts.findIndex((t) => t >= 0.66), best = mi;
    for (let i = mi; i < ts.length && ts[i] <= 0.95; i++) if (top[i] < top[best]) best = i;
    const cut = ts[best];
    let ri = 0; for (let i = 0; i < best; i++) if (top[i] > top[ri]) ri = i;
    const roofH = top[ri];
    let a = ri, b = ri;
    while (a > 0 && top[a - 1] >= roofH - 0.035) a--;
    while (b < best && top[b + 1] >= roofH - 0.035) b++;
    const hoodH = at((fa + ts[a]) / 2 - 0.02);
    let w = a; while (w > 0 && top[w] > hoodH + 0.12 * (roofH - hoodH)) w--;
    const deckH = top[best];
    let e = b; while (e < best && top[e] > deckH + 0.18 * (roofH - deckH)) e++;
    console.log(car.padEnd(9), "gt", JSON.stringify({ ws: r2(ts[w]), roofStart: r2(ts[a]), roofEnd: r2(ts[b]), rearEnd: r2(ts[e]), roofH: r2(roofH), hoodH: r2(hoodH), deckH: r2(deckH), noseH: r2(at(0.03)) }), "cut", r2(cut), "was", JSON.stringify({ cockpit: sh.cockpit }));
  } else {
    let ri = ts.findIndex((t) => t >= 0.3), best = ri;
    for (let i = ri; ts[i] <= 0.62; i++) if (top[i] > top[best]) best = i;
    console.log(car.padEnd(9), "proto", JSON.stringify({ tc: r2(ts[best]), roofH: r2(top[best]), fenderH: r2(Math.max(...ts.map((t, i) => (Math.abs(t - fa) < 0.06 ? top[i] : 0)))), noseH: r2(at(0.05)) }), "was", JSON.stringify({ tc: sh.cockpit.roof }));
  }
}
