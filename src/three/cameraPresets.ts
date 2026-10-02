export type Preset =
  | "three"
  | "side"
  | "front"
  | "rear"
  | "top"
  | "under"
  | "cockpit"
  | "pedals"
  | "powertrain"
  | "running";
export const presets: { id: Preset; label: string }[] = [
  { id: "three", label: "3/4" },
  { id: "side", label: "Side" },
  { id: "front", label: "Front" },
  { id: "rear", label: "Rear" },
  { id: "top", label: "Top" },
  { id: "under", label: "Under" },
  { id: "cockpit", label: "Cockpit" },
  { id: "pedals", label: "Pedals" },
  { id: "powertrain", label: "Powertrain" },
  { id: "running", label: "Running gear" },
];

export const isInspectionPreset = (preset: Preset) =>
  ["cockpit", "pedals", "powertrain", "running"].includes(preset);
