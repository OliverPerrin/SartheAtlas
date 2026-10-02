export type ClassName = "Hypercar" | "LMP2" | "LMGT3";
export type Platform = "LMH" | "LMDh" | "LMP2" | "GT3";
export type EngineConfig = "V" | "I" | "F";
export type EnginePosition = "mid" | "front-mid" | "rear";

export type Engine = {
  label: string;
  cylinders: number;
  config: EngineConfig;
  bankAngle: number;
  litres: number;
  turbo: boolean;
  /** Explicit only where needed to distinguish a single-turbo architecture. */
  turboCount?: 1 | 2;
  position: EnginePosition;
};

export type Hybrid = {
  kind: "LMH front axle" | "LMDh spec";
  label: string;
};

export type Car = {
  id: string;
  make: string;
  name: string;
  category: ClassName;
  platform: Platform;
  debut: number;
  engine: Engine;
  hybrid: Hybrid | null;
  gearbox: string;
  chassis: string;
  tyres: "Michelin" | "Goodyear";
  drive: string;
  summary: string;
  identify: string[];
  source: string;
};

export const entrySource =
  "https://www.fiawec.com/umbrella_media/2026-fia-wec-24-hours-of-le-mans-provisional-entry-list-v2-69faef62f3d33722462224.pdf";

const lmdhHybrid: Hybrid = {
  kind: "LMDh spec",
  label:
    "Common LMDh hybrid: Bosch motor-generator in the gearbox bell-housing, Williams Advanced Engineering battery",
};
const lmdhGearbox = "Xtrac P1359 seven-speed sequential (common LMDh part)";

export const cars: Car[] = [
  {
    id: "ferrari",
    make: "Ferrari",
    name: "499P",
    category: "Hypercar",
    platform: "LMH",
    debut: 2023,
    engine: {
      label: "3.0 L twin-turbo 120° V6",
      cylinders: 6,
      config: "V",
      bankAngle: 120,
      litres: 3.0,
      turbo: true,
      position: "mid",
    },
    hybrid: {
      kind: "LMH front axle",
      label:
        "Front-axle electric motor (up to 200 kW), deploys above a regulated speed",
    },
    gearbox: "Seven-speed sequential",
    chassis: "Ferrari carbon-fibre monocoque (LMH: manufacturer-designed)",
    tyres: "Michelin",
    drive: "Rear-wheel drive, all-wheel drive when the front motor deploys",
    summary:
      "Ferrari's return to top-class endurance racing won Le Mans at its first attempt in 2023, then again in 2024 and 2025. The 120° V6 is a stressed member of the chassis, and the front-axle hybrid gives brief all-wheel drive at speed.",
    identify: [
      "Slim horizontal light blades set into the front fenders",
      "Deep channel between the front fenders feeding the underfloor",
      "Central fin and swan-neck rear wing",
    ],
    source:
      "https://www.ferrari.com/en-US/magazine/articles/ferrari-499p-the-comeback",
  },
  {
    id: "toyota",
    make: "Toyota",
    name: "TR010 Hybrid",
    category: "Hypercar",
    platform: "LMH",
    debut: 2026,
    engine: {
      label: "3.5 L twin-turbo V6",
      cylinders: 6,
      config: "V",
      bankAngle: 90,
      litres: 3.5,
      turbo: true,
      position: "mid",
    },
    hybrid: {
      kind: "LMH front axle",
      label:
        "Front-axle motor-generator (up to 200 kW) with a high-voltage battery",
    },
    gearbox: "Seven-speed sequential",
    chassis: "Toyota carbon-fibre monocoque (LMH: manufacturer-designed)",
    tyres: "Michelin",
    drive: "Rear-wheel drive, all-wheel drive when the front motor deploys",
    summary:
      "The 2026 evolution of the GR010 Hybrid, renamed TR010 Hybrid, with revised front and rear bodywork. Toyota won Le Mans five times in a row between 2018 and 2022.",
    identify: [
      "Wide, flat nose with lights high on the fender leading edges",
      "Long central fin into a full-width wing",
      "Revised 2026 front and rear bodywork",
    ],
    source: "https://toyota-racing.com/toyota-racing-wec/",
  },
  {
    id: "aston",
    make: "Aston Martin",
    name: "Valkyrie",
    category: "Hypercar",
    platform: "LMH",
    debut: 2025,
    engine: {
      label: "6.5 L naturally aspirated Cosworth V12",
      cylinders: 12,
      config: "V",
      bankAngle: 65,
      litres: 6.5,
      turbo: false,
      position: "mid",
    },
    hybrid: null,
    gearbox: "7-speed sequential Xtrac",
    chassis: "Carbon-fibre tub derived from the road-going Valkyrie",
    tyres: "Michelin",
    drive: "Rear-wheel drive",
    summary:
      "The only road-car-based LMH in the field and the only V12. Aston Martin runs it without a hybrid system, relying on a high-revving naturally aspirated Cosworth engine.",
    identify: [
      "Teardrop canopy with a very narrow cockpit",
      "Huge venturi tunnels either side of the raised nose",
      "Front fenders separated from the central body",
    ],
    source: entrySource,
  },
  {
    id: "cadillac",
    make: "Cadillac",
    name: "V-Series.R",
    category: "Hypercar",
    platform: "LMDh",
    debut: 2023,
    engine: {
      label: "5.5 L naturally aspirated flat-plane V8",
      cylinders: 8,
      config: "V",
      bankAngle: 90,
      litres: 5.5,
      turbo: false,
      position: "mid",
    },
    hybrid: lmdhHybrid,
    gearbox: lmdhGearbox,
    chassis: "Dallara LMDh carbon-fibre chassis",
    tyres: "Michelin",
    drive: "Rear-wheel drive (LMDh hybrid acts on the rear axle)",
    summary:
      "The only naturally aspirated V8 among the Hypercars, with a sound to match. Built on the Dallara LMDh chassis and styled with Cadillac's vertical lighting signature.",
    identify: [
      "Vertical LED light blades at the nose and in the fenders",
      "Tall, upright front fender leading edges",
      "Vertical light graphic on the rear fin area",
    ],
    source: entrySource,
  },
  {
    id: "bmw",
    make: "BMW",
    name: "M Hybrid V8",
    category: "Hypercar",
    platform: "LMDh",
    debut: 2023,
    engine: {
      label: "4.0 L twin-turbo V8 (P66/3)",
      cylinders: 8,
      config: "V",
      bankAngle: 90,
      litres: 4.0,
      turbo: true,
      position: "mid",
    },
    hybrid: lmdhHybrid,
    gearbox: lmdhGearbox,
    chassis: "Dallara LMDh carbon-fibre chassis",
    tyres: "Michelin",
    drive: "Rear-wheel drive (LMDh hybrid acts on the rear axle)",
    summary:
      "BMW's LMDh prototype, run in WEC by Team WRT. The twin-turbo V8 is derived from a DTM-era engine, and the nose carries illuminated kidney outlines.",
    identify: [
      "Illuminated BMW kidney outlines in the nose",
      "M stripes in blue, violet and red",
      "Revised nose for 2026",
    ],
    source: entrySource,
  },
  {
    id: "genesis",
    make: "Genesis",
    name: "GMR-001",
    category: "Hypercar",
    platform: "LMDh",
    debut: 2026,
    engine: {
      label: "3.2 L twin-turbo V8",
      cylinders: 8,
      config: "V",
      bankAngle: 90,
      litres: 3.2,
      turbo: true,
      position: "mid",
    },
    hybrid: lmdhHybrid,
    gearbox: lmdhGearbox,
    chassis: "Oreca LMDh carbon-fibre chassis",
    tyres: "Michelin",
    drive: "Rear-wheel drive (LMDh hybrid acts on the rear axle)",
    summary:
      "Hyundai's luxury brand arrives at Le Mans for 2026 with its first prototype. It is built on the Oreca LMDh chassis and run by Genesis Magma Racing.",
    identify: [
      "Genesis 'two lines' light signature",
      "Oreca-derived cockpit and side profile",
      "New for the 2026 season",
    ],
    source: entrySource,
  },
  {
    id: "alpine",
    make: "Alpine",
    name: "A424",
    category: "Hypercar",
    platform: "LMDh",
    debut: 2024,
    engine: {
      label: "3.4 L single-turbo 95° V6",
      cylinders: 6,
      config: "V",
      bankAngle: 95,
      litres: 3.4,
      turbo: true,
      turboCount: 1,
      position: "mid",
    },
    hybrid: lmdhHybrid,
    gearbox: lmdhGearbox,
    chassis: "Oreca LMDh carbon-fibre chassis",
    tyres: "Michelin",
    drive: "Rear-wheel drive (LMDh hybrid acts on the rear axle)",
    summary:
      "Alpine's LMDh prototype, built with Oreca and powered by a Mecachrome-developed single-turbo V6.",
    identify: [
      "Triangular light signature in each front fender",
      "Blue and black livery with pink accents",
      "Oreca-derived chassis with Alpine bodywork",
    ],
    source:
      "https://media.alpinecars.com/alpine-a424-track-debut-imminent/?lang=eng",
  },
  {
    id: "peugeot",
    make: "Peugeot",
    name: "9X8",
    category: "Hypercar",
    platform: "LMH",
    debut: 2022,
    engine: {
      label: "2.6 L twin-turbo 90° V6",
      cylinders: 6,
      config: "V",
      bankAngle: 90,
      litres: 2.6,
      turbo: true,
      position: "mid",
    },
    hybrid: {
      kind: "LMH front axle",
      label:
        "Front-axle motor-generator (up to 200 kW) with a high-voltage battery",
    },
    gearbox: "Seven-speed sequential",
    chassis: "Peugeot carbon-fibre monocoque (LMH: manufacturer-designed)",
    tyres: "Michelin",
    drive: "Rear-wheel drive, all-wheel drive when the front motor deploys",
    summary:
      "Famous for racing without a rear wing at its 2022 debut. The 2024 update added a conventional wing. Its three-claw light signature is shared with Peugeot road cars.",
    identify: [
      "Three-claw light signature front and rear",
      "Dark 'Selenium' grey with bright green accents",
      "Rear wing added in the 2024 update",
    ],
    source: entrySource,
  },
  {
    id: "oreca",
    make: "Oreca",
    name: "07 – Gibson",
    category: "LMP2",
    platform: "LMP2",
    debut: 2017,
    engine: {
      label: "4.2 L naturally aspirated Gibson GK428 V8",
      cylinders: 8,
      config: "V",
      bankAngle: 90,
      litres: 4.2,
      turbo: false,
      position: "mid",
    },
    hybrid: null,
    gearbox: "Xtrac six-speed sequential",
    chassis: "Oreca carbon-fibre monocoque (spec LMP2 chassis)",
    tyres: "Goodyear",
    drive: "Rear-wheel drive",
    summary:
      "Every LMP2 car at Le Mans is an Oreca 07 with a Gibson V8. With the machinery equal, the class is decided by driver line-ups, strategy and pit work. Pro-Am entries must include a Bronze-rated driver.",
    identify: [
      "Smaller, narrower prototype than the Hypercars",
      "Upright vertical headlights",
      "Blue class number panels",
    ],
    source:
      "https://www.oreca.com/wp-content/uploads/2017/04/ORECA07_MediaKit_EN.pdf",
  },
  {
    id: "296",
    make: "Ferrari",
    name: "296 LMGT3 Evo",
    category: "LMGT3",
    platform: "GT3",
    debut: 2026,
    engine: {
      label: "3.0 L twin-turbo 120° V6",
      cylinders: 6,
      config: "V",
      bankAngle: 120,
      litres: 3.0,
      turbo: true,
      position: "mid",
    },
    hybrid: null,
    gearbox: "Six-speed sequential",
    chassis: "Aluminium road-car structure with FIA safety cage",
    tyres: "Goodyear",
    drive: "Rear-wheel drive",
    summary:
      "The GT3 version of Ferrari's 296 keeps the 120° V6 but drops the road car's hybrid system. The Evo package brings aerodynamic and cooling updates.",
    identify: [
      "Short nose and long rear deck (mid-engine)",
      "Large rear wing on swan-neck mounts",
      "Deep front splitter with dive planes",
    ],
    source: entrySource,
  },
  {
    id: "corvette",
    make: "Corvette",
    name: "Z06 LMGT3.R",
    category: "LMGT3",
    platform: "GT3",
    debut: 2024,
    engine: {
      label: "5.5 L naturally aspirated flat-plane V8",
      cylinders: 8,
      config: "V",
      bankAngle: 90,
      litres: 5.5,
      turbo: false,
      position: "mid",
    },
    hybrid: null,
    gearbox: "Six-speed sequential",
    chassis: "Aluminium road-car structure with FIA safety cage",
    tyres: "Goodyear",
    drive: "Rear-wheel drive",
    summary:
      "Built by Pratt Miller on the Z06 road car, with an engine closely related to the road Z06's flat-plane crank V8.",
    identify: [
      "Angular mid-engine silhouette",
      "Sharp, narrow headlight graphic",
      "Large side intakes ahead of the rear wheels",
    ],
    source: entrySource,
  },
  {
    id: "mclaren",
    make: "McLaren",
    name: "720S LMGT3 Evo",
    category: "LMGT3",
    platform: "GT3",
    debut: 2024,
    engine: {
      label: "4.0 L twin-turbo V8",
      cylinders: 8,
      config: "V",
      bankAngle: 90,
      litres: 4.0,
      turbo: true,
      position: "mid",
    },
    hybrid: null,
    gearbox: "Six-speed sequential",
    chassis: "Carbon-fibre Monocage II with FIA safety cage",
    tyres: "Goodyear",
    drive: "Rear-wheel drive",
    summary:
      "The only carbon-tubbed car in LMGT3. The low teardrop cabin and 'eye socket' headlights come straight from the 720S road car.",
    identify: [
      "'Eye socket' headlights",
      "Low teardrop cabin",
      "Carbon tub rather than a steel or aluminium chassis",
    ],
    source: entrySource,
  },
  {
    id: "vantage",
    make: "Aston Martin",
    name: "Vantage AMR LMGT3",
    category: "LMGT3",
    platform: "GT3",
    debut: 2024,
    engine: {
      label: "4.0 L twin-turbo V8",
      cylinders: 8,
      config: "V",
      bankAngle: 90,
      litres: 4.0,
      turbo: true,
      position: "front-mid",
    },
    hybrid: null,
    gearbox: "Six-speed sequential transaxle",
    chassis: "Bonded aluminium road-car structure with FIA safety cage",
    tyres: "Goodyear",
    drive: "Rear-wheel drive",
    summary:
      "A front-engined GT with the engine set well back behind the front axle and the gearbox at the rear for balance.",
    identify: [
      "Large Aston Martin grille",
      "Long bonnet and short rear deck",
      "Green livery on the Heart of Racing cars",
    ],
    source: entrySource,
  },
  {
    id: "m4",
    make: "BMW",
    name: "M4 LMGT3 Evo",
    category: "LMGT3",
    platform: "GT3",
    debut: 2024,
    engine: {
      label: "3.0 L twin-turbo inline-six",
      cylinders: 6,
      config: "I",
      bankAngle: 0,
      litres: 3.0,
      turbo: true,
      position: "front-mid",
    },
    hybrid: null,
    gearbox: "Six-speed sequential",
    chassis: "Steel road-car structure with FIA safety cage",
    tyres: "Goodyear",
    drive: "Rear-wheel drive",
    summary:
      "The only inline-six in the field. The M4 is the largest car in the class, and the big vertical kidney grille makes it easy to spot.",
    identify: [
      "Tall vertical kidney grille",
      "Boxy coupe roofline",
      "Large fender vents behind the front wheels",
    ],
    source: entrySource,
  },
  {
    id: "mercedes",
    make: "Mercedes-AMG",
    name: "LMGT3",
    category: "LMGT3",
    platform: "GT3",
    debut: 2024,
    engine: {
      label: "6.2 L naturally aspirated V8",
      cylinders: 8,
      config: "V",
      bankAngle: 90,
      litres: 6.2,
      turbo: false,
      position: "front-mid",
    },
    hybrid: null,
    gearbox: "Six-speed sequential transaxle",
    chassis: "Aluminium spaceframe with FIA safety cage",
    tyres: "Goodyear",
    drive: "Rear-wheel drive",
    summary:
      "Built on the AMG GT3 with a large-capacity naturally aspirated V8 mounted behind the front axle.",
    identify: [
      "Very long bonnet with the cabin set far back",
      "Panamericana vertical-slat grille",
      "Short rounded tail",
    ],
    source: entrySource,
  },
  {
    id: "ford",
    make: "Ford",
    name: "Mustang LMGT3",
    category: "LMGT3",
    platform: "GT3",
    debut: 2024,
    engine: {
      label: "5.4 L naturally aspirated V8",
      cylinders: 8,
      config: "V",
      bankAngle: 90,
      litres: 5.4,
      turbo: false,
      position: "front-mid",
    },
    hybrid: null,
    gearbox: "Six-speed sequential transaxle",
    chassis: "Steel road-car structure with FIA safety cage",
    tyres: "Goodyear",
    drive: "Rear-wheel drive",
    summary:
      "Developed with Multimatic, the Mustang GT3 uses a Coyote-derived V8 and a rear transaxle for better weight distribution.",
    identify: [
      "Three-bar tail lights",
      "Muscular fastback roof",
      "Long bonnet with central power bulge",
    ],
    source: entrySource,
  },
  {
    id: "lexus",
    make: "Lexus",
    name: "RC F LMGT3",
    category: "LMGT3",
    platform: "GT3",
    debut: 2024,
    engine: {
      label: "5.4 L naturally aspirated V8",
      cylinders: 8,
      config: "V",
      bankAngle: 90,
      litres: 5.4,
      turbo: false,
      position: "front-mid",
    },
    hybrid: null,
    gearbox: "Six-speed sequential (installation position unverified)",
    chassis: "Steel road-car structure with FIA safety cage",
    tyres: "Goodyear",
    drive: "Rear-wheel drive",
    summary:
      "Lexus's front-engine GT racer, run by Akkodis ASP. The spindle grille is its signature.",
    identify: [
      "Spindle grille",
      "Coupe roofline with short rear deck",
      "Front-engine proportions",
    ],
    source: entrySource,
  },
  {
    id: "porsche",
    make: "Porsche",
    name: "911 GT3 R LMGT3",
    category: "LMGT3",
    platform: "GT3",
    debut: 2023,
    engine: {
      label: "4.2 L naturally aspirated flat-six",
      cylinders: 6,
      config: "F",
      bankAngle: 180,
      litres: 4.2,
      turbo: false,
      position: "rear",
    },
    hybrid: null,
    gearbox: "Six-speed sequential",
    chassis: "Aluminium-steel road-car structure with FIA safety cage",
    tyres: "Goodyear",
    drive: "Rear-wheel drive",
    summary:
      "The only rear-engined car at Le Mans. Its flat-six hangs behind the rear axle, which shapes how the car brakes, turns and puts power down.",
    identify: [
      "Round headlights and a sloping 911 roofline",
      "Engine behind the rear axle",
      "Large swan-neck wing over the engine cover",
    ],
    source: entrySource,
  },
];

export const classInfo: Record<
  ClassName,
  { color: string; tagline: string; text: string; facts: [string, string][] }
> = {
  Hypercar: {
    color: "#e4002b",
    tagline: "The fight for overall victory",
    text: "Two rulesets share one class. LMH lets manufacturers design their own chassis, with an optional front-axle hybrid. LMDh uses one of four approved chassis makers and a common rear-axle hybrid. Balance of Performance brings them into the same lap-time window.",
    facts: [
      ["Target power", "≈ 500 kW, set by BoP"],
      ["Minimum weight", "≈ 1,030 kg before BoP"],
      ["Tyres", "Michelin"],
      ["Number panels", "Red"],
    ],
  },
  LMP2: {
    color: "#1d6bff",
    tagline: "Equal cars, different crews",
    text: "A spec prototype class. Every car is an Oreca 07 with a Gibson V8 and Goodyear tyres, so the difference comes down to drivers, engineers and strategy. Each crew must include lower-rated drivers.",
    facts: [
      ["Chassis", "Oreca 07"],
      ["Engine", "Gibson 4.2 L V8"],
      ["Tyres", "Goodyear"],
      ["Number panels", "Blue"],
    ],
  },
  LMGT3: {
    color: "#ff7a00",
    tagline: "Road-car silhouettes, racing everything",
    text: "Production-based GT3 cars from nine manufacturers, adapted for Le Mans and balanced by BoP. Every crew includes a Bronze-rated amateur driver, so traffic management and consistency matter as much as speed.",
    facts: [
      ["Manufacturers", "9"],
      ["Basis", "Production GT3"],
      ["Tyres", "Goodyear"],
      ["Number panels", "Orange"],
    ],
  },
};

export const classOrder: ClassName[] = ["Hypercar", "LMP2", "LMGT3"];

export function carById(id: string | null | undefined) {
  return cars.find((c) => c.id === id);
}
