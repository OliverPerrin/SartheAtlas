export type ClassName = "Hypercar" | "LMP2" | "LMGT3";
export type Car = {
  id: string;
  make: string;
  name: string;
  category: ClassName;
  architecture: string;
  color: string;
  accent: string;
  number: string;
  description: string;
  source: string;
  model?: string;
  author?: string;
};
export const entrySource =
  "https://www.fiawec.com/umbrella_media/2026-fia-wec-24-hours-of-le-mans-provisional-entry-list-v2-69faef62f3d33722462224.pdf";
export const cars: Car[] = [
  [
    "ferrari",
    "Ferrari",
    "499P",
    "Hypercar",
    "LMH · hybrid",
    "#c71c30",
    "#ffda40",
    "50",
    "A purpose-built prototype with a combustion engine at the rear and an electric motor at the front. Its low nose, sculpted wheel arches and elevated rear wing are part of a complete aerodynamic system.",
    "https://www.ferrari.com/en-US/magazine/articles/ferrari-499p-the-comeback",
    "3886c10416fe40dea730da0a31bddebc",
    "MattDoesBlender",
  ],
  [
    "toyota",
    "Toyota",
    "TR010 Hybrid",
    "Hypercar",
    "LMH · hybrid",
    "#e02b32",
    "#eeeeee",
    "7",
    "The 2026 evolution of Toyota’s endurance prototype brings revised front and rear bodywork and a new name. It continues the manufacturer’s hybrid Le Mans programme.",
    "https://toyota-racing.com/toyota-racing-wec/",
  ],
  [
    "aston",
    "Aston Martin",
    "Valkyrie",
    "Hypercar",
    "LMH · non-hybrid",
    "#125c4c",
    "#d2ee47",
    "007",
    "A naturally aspirated prototype with a distinct approach to the Hypercar class. Explore the shared principles of downforce, braking and endurance packaging.",
    entrySource,
  ],
  [
    "cadillac",
    "Cadillac",
    "V-Series.R",
    "Hypercar",
    "LMDh · hybrid",
    "#c3a45e",
    "#24272c",
    "12",
    "An LMDh prototype: manufacturer identity and engine engineering meet a regulated chassis and common hybrid architecture.",
    entrySource,
  ],
  [
    "bmw",
    "BMW",
    "M Hybrid V8",
    "Hypercar",
    "LMDh · hybrid",
    "#f3f3f0",
    "#268dde",
    "15",
    "BMW’s endurance prototype combines a manufacturer combustion engine with the LMDh hybrid platform.",
    entrySource,
  ],
  [
    "genesis",
    "Genesis",
    "GMR-001-Hypercar",
    "Hypercar",
    "LMDh · hybrid",
    "#d64b21",
    "#29282a",
    "17",
    "Genesis joins the 2026 Le Mans Hypercar field with its own interpretation of the LMDh platform.",
    entrySource,
  ],
  [
    "alpine",
    "Alpine",
    "A424",
    "Hypercar",
    "LMDh · hybrid",
    "#2375c9",
    "#ff87b4",
    "35",
    "A closed-cockpit endurance prototype built around the LMDh rule set. Cooling, serviceability and consistent balance all matter over a full day of racing.",
    entrySource,
  ],
  [
    "peugeot",
    "Peugeot",
    "9X8",
    "Hypercar",
    "LMH · hybrid",
    "#a1a3a5",
    "#d4eb34",
    "93",
    "Peugeot’s LMH prototype couples hybrid propulsion with bodywork developed for sustained aerodynamic performance.",
    entrySource,
  ],
  [
    "oreca",
    "Oreca",
    "07 – Gibson",
    "LMP2",
    "LMP2 · non-hybrid",
    "#1755b1",
    "#f6df24",
    "43",
    "A dedicated sports prototype. LMP2 puts the emphasis on closely matched machinery, efficient pit work and the performance of the driver crew.",
    "https://www.oreca.com/wp-content/uploads/2017/04/ORECA07_MediaKit_EN.pdf",
  ],
  [
    "296",
    "Ferrari",
    "296 LMGT3 Evo",
    "LMGT3",
    "GT3 · mid-engine",
    "#c32d30",
    "#f6d046",
    "21",
    "A racing derivative with the silhouette of a road-going sports car. The 2026 entry list identifies the Evo version; the optional community exterior reference depicts an earlier 296 GT3.",
    entrySource,
    "a463226115184535928ec75660c6571f",
    "vecarz",
  ],
  [
    "corvette",
    "Corvette",
    "Z06 LMGT3.R",
    "LMGT3",
    "GT3 · mid-engine",
    "#e7c626",
    "#252627",
    "33",
    "A production-derived GT racer. The component study illustrates the systems shared across endurance GT cars rather than a manufacturer CAD assembly.",
    entrySource,
  ],
  [
    "mclaren",
    "McLaren",
    "720S LMGT3 Evo",
    "LMGT3",
    "GT3 · mid-engine",
    "#e8751d",
    "#33353a",
    "10",
    "A mid-engine GT race car competing in the LMGT3 field. Tyre management and consistency are as important as outright pace.",
    entrySource,
  ],
  [
    "vantage",
    "Aston Martin",
    "Vantage AMR LMGT3",
    "LMGT3",
    "GT3 · front-engine",
    "#17624f",
    "#d1ee35",
    "23",
    "The Vantage brings a front-engine GT layout to Le Mans. Switch to the engineering view to explore a conceptual GT assembly.",
    entrySource,
  ],
  [
    "m4",
    "BMW",
    "M4 LMGT3 Evo",
    "LMGT3",
    "GT3 · front-engine",
    "#e6e7e8",
    "#397dca",
    "32",
    "A front-engine GT racing platform, entered in Evo form for 2026.",
    entrySource,
  ],
  [
    "mercedes",
    "Mercedes-AMG",
    "LMGT3",
    "LMGT3",
    "GT3 · front-engine",
    "#9ea5aa",
    "#60d3b4",
    "61",
    "A long-bonnet GT silhouette with a front-engine layout. This study focuses on the functions of major racing systems.",
    entrySource,
  ],
  [
    "ford",
    "Ford",
    "Mustang LMGT3",
    "LMGT3",
    "GT3 · front-engine",
    "#204e9c",
    "#e44635",
    "77",
    "The Mustang’s GT racing derivative combines a recognisable coupe silhouette with endurance racing aerodynamics.",
    entrySource,
  ],
  [
    "lexus",
    "Lexus",
    "RC F LMGT3",
    "LMGT3",
    "GT3 · front-engine",
    "#d3d5d8",
    "#242933",
    "78",
    "A front-engine GT entry. Braking stability, cooling and traction are central to its endurance racing role.",
    entrySource,
  ],
  [
    "porsche",
    "Porsche",
    "911 GT3 R LMGT3",
    "LMGT3",
    "GT3 · rear-engine",
    "#d5dd25",
    "#343738",
    "91",
    "A rear-engine GT racing layout with a distinctive weight distribution. The generic GT study is not an exact 911 body or internal assembly.",
    entrySource,
  ],
].map(
  ([
    id,
    make,
    name,
    category,
    architecture,
    color,
    accent,
    number,
    description,
    source,
    model,
    author,
  ]) => ({
    id,
    make,
    name,
    category: category as ClassName,
    architecture,
    color,
    accent,
    number,
    description,
    source,
    model,
    author,
  }),
);
export const systems = [
  {
    id: "body",
    name: "Bodywork",
    tag: "AERODYNAMICS",
    text: "Body panels control how air meets the car. Wheel-arch openings, cooling exits and the shape of the nose influence drag, lift and how consistently the car responds in traffic.",
    detail:
      "Panels are removable for access. Their exact shapes are specific to each homologated car.",
  },
  {
    id: "wing",
    name: "Rear wing",
    tag: "AERODYNAMICS",
    text: "The rear wing produces downforce by turning airflow. More load can improve cornering grip, but increases drag on the long straights.",
    detail:
      "Wing setting is a compromise between straight-line performance and a stable car through the Porsche Curves.",
  },
  {
    id: "floor",
    name: "Floor & diffuser",
    tag: "AERODYNAMICS",
    text: "The floor works with the road surface to generate aerodynamic load. The diffuser expands the flow beneath the rear of the car.",
    detail:
      "Ride height, pitch and roll change the floor’s working conditions. Kerb strikes can damage an otherwise hidden performance surface.",
  },
  {
    id: "chassis",
    name: "Safety structure",
    tag: "STRUCTURE",
    text: "The central safety structure protects the driver and carries suspension and powertrain loads. Prototypes use a survival cell; GT cars retain a production-derived structure with a racing safety cage.",
    detail:
      "The study shows a simplified structural volume, not a crash-certified design or manufacturer construction drawing.",
  },
  {
    id: "engine",
    name: "Combustion engine",
    tag: "POWERTRAIN",
    text: "The combustion engine converts fuel energy into torque. Cooling, lubrication and sustained operation are just as important as peak output in a 24-hour race.",
    detail:
      "Engine architecture and location vary by car. Public headline power is not a substitute for the event’s Balance of Performance settings.",
  },
  {
    id: "hybrid",
    name: "Hybrid system",
    tag: "POWERTRAIN",
    text: "A motor-generator can recover kinetic energy during braking and return electrical energy as drive torque. A battery and power electronics manage that energy.",
    detail:
      "LMH and LMDh use different architectures. Non-hybrid cars, LMP2 and LMGT3 do not acquire a hybrid system just because they share the circuit.",
  },
  {
    id: "gearbox",
    name: "Transmission",
    tag: "POWERTRAIN",
    text: "The transmission selects gear ratios and delivers engine torque to the driven wheels. The differential allows the driven wheels to turn at different speeds.",
    detail:
      "A race gearbox must tolerate repeated shifts and thermal loads while remaining serviceable in the pits.",
  },
  {
    id: "suspension",
    name: "Suspension",
    tag: "CHASSIS DYNAMICS",
    text: "Suspension controls tyre contact and vehicle attitude. Springs support loads, dampers control motion, and links constrain the wheel path.",
    detail:
      "Mechanical grip and aerodynamic stability interact: a change in ride height can change the way the floor works.",
  },
  {
    id: "brakes",
    name: "Braking system",
    tag: "CHASSIS DYNAMICS",
    text: "Brakes convert kinetic energy into heat. The discs, calipers, pads and cooling ducts must work consistently over repeated heavy stops.",
    detail:
      "Brake materials and regulations differ between classes. The illustrated discs are conceptual and do not represent a particular supplier.",
  },
  {
    id: "wheels",
    name: "Wheels & tyres",
    tag: "CONTACT PATCH",
    text: "Four small contact patches transmit acceleration, braking and cornering forces. Temperature, pressure, wear and surface conditions change the grip available.",
    detail:
      "Tyre management can extend a stint and reduce pit time. Wheel and tyre geometry here is illustrative.",
  },
  {
    id: "cooling",
    name: "Cooling circuits",
    tag: "THERMAL MANAGEMENT",
    text: "Heat exchangers transfer energy from fluids to the airflow. Engines, charge air, oil and hybrid components have different thermal demands.",
    detail:
      "Larger openings can improve cooling but introduce aerodynamic costs. Exact duct routing is generally not public.",
  },
  {
    id: "cockpit",
    name: "Cockpit",
    tag: "DRIVER SYSTEMS",
    text: "The cockpit combines the seat, harness, steering controls, displays and driver protection. Ergonomics must work for multiple drivers through daylight, darkness and fatigue.",
    detail:
      "Controls and seat fittings are simplified. A real car’s steering wheel and electrical architecture are model-specific.",
  },
] as const;
export type SystemId = (typeof systems)[number]["id"];
export const trackNotes: Record<string, string> = {
  "Dunlop Curve":
    "The lap begins with a fast right-hand curve before the chicane. A stable aero platform helps the driver commit.",
  "Dunlop Chicane":
    "Heavy braking and a direction change compress the field early in the lap. Exit balance matters for the descent.",
  "Tertre Rouge":
    "The exit onto the Hunaudières is crucial: a small loss here carries a long way down the straight.",
  "First Chicane":
    "The first interruption to the Hunaudières demands hard braking followed by clean traction back onto the straight.",
  "Second Chicane":
    "Another major braking event on the Hunaudières. Brake temperatures and traffic shape the approach.",
  Mulsanne:
    "The end of the long straight brings a sharp change of speed and direction.",
  Indianapolis:
    "A fast approach feeds a slower left. Drivers need confidence in the car’s stability as they brake and turn.",
  Arnage:
    "A slow right-hand corner rewards patience and traction. A locked wheel or missed apex can be costly.",
  "Porsche Curves":
    "A flowing sequence where aerodynamic balance and confidence in traffic are essential.",
  "Ford Chicane":
    "The final direction changes bring the car back to the start-finish straight.",
};

// Creator-hosted references: never treated as licensed local CAD or verified 2026 assets.
export const exteriorReferences: Record<
  string,
  { id: string; author: string; note: string }
> = {
  ferrari: {
    id: "3886c10416fe40dea730da0a31bddebc",
    author: "MattDoesBlender",
    note: "Community 499P; bodywork and livery year unverified.",
  },
  "296": {
    id: "a463226115184535928ec75660c6571f",
    author: "vecarz",
    note: "Earlier 296 GT3; not the 2026 Evo.",
  },
  bmw: {
    id: "beac4b9b7cb9407d865fa4ad3c4ee60b",
    author: "vecarz",
    note: "Earlier M Hybrid V8; not verified against the revised 2026 nose.",
  },
  cadillac: {
    id: "171bd5faf6824674b73162143e1e70f9",
    author: "kevin (sohyalebret)",
    note: "2023 V-Series.R, including Daytona-era bodywork and livery.",
  },
  alpine: {
    id: "a9e29a73196244979cce065fe25f9589",
    author: "Dave Love SketchFab",
    note: "2024 A424 reference; not the 2026 livery.",
  },
  genesis: {
    id: "88965db4db194222b9048f946ca5c0eb",
    author: "Abu Saif",
    note: "Community GMR-001; race-specification details unverified.",
  },
  peugeot: {
    id: "f77715deedb14cda8afe96a83c4daf31",
    author: "kilianhoffmann13",
    note: "Earlier 9X8 reference; geometry may predate the rear-wing update.",
  },
  oreca: {
    id: "c2517d31955e48ae9e1b83dfe0dfc382",
    author: "Todor Malakchiev",
    note: "Earlier Oreca 07; team livery and detail specification unverified.",
  },
  mclaren: {
    id: "e44e0ec2dc864c08bf68b062bf32d7d3",
    author: "MattDoesBlender",
    note: "720S LMGT3 Evo reference published in 2025; not a verified 2026 livery.",
  },
  porsche: {
    id: "d634485e0b2a4b07b66150b525009a6f",
    author: "DisneyCars / supercarmodels",
    note: "2023 911 GT3 R; not verified against 2026 updates.",
  },
  mercedes: {
    id: "146766480dc348dbb95ec03c1bf33d0d",
    author: "DisneyCars / supercarmodels",
    note: "2020 AMG GT3 Evo; LMGT3 adaptations and 2026 livery unverified.",
  },
};
for (const car of cars) {
  const ref = exteriorReferences[car.id];
  if (ref) {
    car.model = ref.id;
    car.author = ref.author;
  }
}
