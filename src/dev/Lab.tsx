import { useState } from "react";
import { cars } from "../data/cars.ts";
import { entries } from "../data/entries.ts";
import { CarScene } from "../three/CarScene.tsx";
import type { Preset } from "../three/CarScene.tsx";
import type { SystemId } from "../data/systems.ts";

export default function Lab() {
  const q = new URLSearchParams(location.search);
  const car = cars.find((c) => c.id === (q.get("car") || "ferrari"))!;
  const entry = entries.find((e) => e.carId === car.id)!;
  const [sel, setSel] = useState<SystemId | null>(null);
  const [hov, setHov] = useState<SystemId | null>(null);
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <CarScene car={car} entry={entry} paint="livery" selected={sel} hovered={hov} onSelect={setSel} onHover={setHov}
        exploded={Number(q.get("x") || 0)} xray={q.has("xray")} rules={q.has("rules")} focus={false} dims={q.has("dims")} spin={false}
        preset={(q.get("view") as Preset) || "three"} presetNonce={0} night={q.has("night")} fontsReady={true} />
    </div>
  );
}
