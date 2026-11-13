// Builds every modelled car: Blender writes plain GLB files, pack.mjs
// compresses them into public/models.
//
//   npm run models:build [-- ids...] [--render DIR]
//
// Set BLENDER to the Blender executable if it is not in the default place.
import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const here = new URL(".", import.meta.url).pathname;
const blender =
  process.env.BLENDER ??
  ["/Applications/Blender.app/Contents/MacOS/Blender", "/usr/bin/blender", "/usr/local/bin/blender"].find(existsSync) ??
  "blender";
const extra = process.argv.slice(2);
const ids = extra.filter((a, i) => !a.startsWith("--") && extra[i - 1] !== "--render");
if (!ids.length) rmSync(join(here, ".build"), { recursive: true, force: true });
const built = spawnSync(blender, ["-b", "-P", join(here, "build.py"), "--", ...extra], { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8", maxBuffer: 1 << 26 });
const lines = (built.stdout ?? "").split("\n").filter((l) => /^(BUILT|WARNING)|Error|Traceback|^\s+File "/.test(l));
if (lines.length) console.log(lines.join("\n"));
if (built.status !== 0) process.exit(built.status ?? 1);
const packed = spawnSync(process.execPath, [join(here, "pack.mjs")], { stdio: "inherit" });
process.exit(packed.status ?? 1);
