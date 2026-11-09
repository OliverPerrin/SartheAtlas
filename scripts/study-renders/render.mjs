// Renders the built-in engineering studies to still images for the home page
// and the field: one day and one night image per car family, and one day
// image per race entry in its own colour study.
//
//   npm run dev -- --port 4318            (in another terminal)
//   node scripts/study-renders/render.mjs [--only ferrari,50] [--night] [--base URL]
//
// Needs a Chromium-based browser (set BROWSER to its executable) and macOS
// `sips` for AVIF encoding. Output goes to public/studies/. This is one-off
// tooling, not part of the build or CI.
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { cars } from "../../src/data/cars.ts";
import { entries } from "../../src/data/entries.ts";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const base = option("base", "http://127.0.0.1:4318");
const only = option("only", "")?.split(",").filter(Boolean);
const nightOnly = args.includes("--night");
const out = resolve("public/studies");
const WIDTH = 960;
const HEIGHT = 600;
const CAMERA = "4.9,1.42,5.55";
const DAY = { bg: "17171a", extra: "" };
const NIGHT = { bg: "060607", extra: "&night&exp=0.84" };

const browser =
  process.env.BROWSER ??
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Helium.app/Contents/MacOS/Helium",
  ].find(existsSync);
if (!browser) throw new Error("Set BROWSER to a Chromium-based browser.");

const jobs = [];
for (const car of cars) {
  if (only.length && !only.includes(car.id)) continue;
  if (!nightOnly)
    jobs.push({ file: `${car.id}-day`, query: `car=${car.id}&bg=${DAY.bg}` });
  jobs.push({
    file: `${car.id}-night`,
    query: `car=${car.id}&bg=${NIGHT.bg}${NIGHT.extra}`,
  });
}
for (const entry of entries) {
  if (nightOnly || (only.length && !only.includes(entry.number))) continue;
  jobs.push({
    file: `entry-${entry.number}`,
    query: `car=${entry.carId}&entry=${entry.number}&bg=${DAY.bg}`,
  });
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), "study-renders-"));
const child = spawn(
  browser,
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--hide-scrollbars",
    `--window-size=${WIDTH},${HEIGHT}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);
try {
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target = list.find((t) => t.type === "page");
    } catch {
      /* browser still starting */
    }
    if (!target) await sleep(200);
  }
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done) => socket.addEventListener("open", done, { once: true }));
  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((done) => {
      const call = ++id;
      pending.set(call, done);
      socket.send(JSON.stringify({ id: call, method, params }));
    });
  const evaluate = async (expression) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true }))
      .result?.result?.value;
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  mkdirSync(out, { recursive: true });
  const scratch = mkdtempSync(join(tmpdir(), "study-png-"));
  for (const [index, job] of jobs.entries()) {
    await send("Page.navigate", {
      url: `${base}/?lab&${job.query}&cam=${CAMERA}`,
    });
    // Wait for the fonts (liveries are painted with them) and the canvas.
    for (let i = 0; i < 80; i++) {
      await sleep(150);
      if (
        await evaluate(
          `!!document.querySelector('[data-fonts="true"] .car-scene[data-rendering="true"] canvas')`,
        )
      )
        break;
    }
    await sleep(3200);
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const png = join(scratch, `${job.file}.png`);
    writeFileSync(png, Buffer.from(shot.result.data, "base64"));
    execFileSync("sips", [
      "-s", "format", "avif",
      "-s", "formatOptions", "52",
      png,
      "--out", join(out, `${job.file}.avif`),
    ], { stdio: "ignore" });
    process.stdout.write(`\r${index + 1}/${jobs.length} ${job.file}        `);
  }
  process.stdout.write("\n");
  rmSync(scratch, { recursive: true, force: true });
  socket.close();
} finally {
  child.kill();
}
