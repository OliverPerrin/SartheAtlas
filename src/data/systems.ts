import type { Car } from "./cars.ts";
import {
  carEngineeringSummary,
  engineeringLayoutFor,
} from "./engineeringDetails.ts";

export type SystemId =
  | "body"
  | "wing"
  | "floor"
  | "chassis"
  | "engine"
  | "hybrid"
  | "gearbox"
  | "suspension"
  | "brakes"
  | "wheels"
  | "cooling"
  | "cockpit"
  | "fuel"
  | "lights";

export type Group =
  "Aerodynamics" | "Structure" | "Powertrain" | "Chassis" | "Driver & systems";

export type System = {
  id: SystemId;
  name: string;
  group: Group;
  text: string;
  endurance: string;
};

export const systems: System[] = [
  {
    id: "body",
    name: "Bodywork",
    group: "Aerodynamics",
    text: "The outer skin decides how air meets the car. Fender shapes, cooling inlets and outlets, and the nose all trade drag against downforce. Bodywork is homologated, so it cannot be redesigned for each circuit.",
    endurance:
      "Panels are built to be swapped in seconds. A damaged nose or rear clamshell can be replaced in the pits with only a small loss of time.",
  },
  {
    id: "wing",
    name: "Rear wing",
    group: "Aerodynamics",
    text: "The rear wing turns airflow upward to push the rear tyres into the track. At Le Mans, teams run low-drag settings for the long straights, which makes the car more nervous through the Porsche Curves.",
    endurance:
      "Most wings hang from swan-neck mounts on their top surface, which keeps the more important underside of the wing clean.",
  },
  {
    id: "floor",
    name: "Floor & diffuser",
    group: "Aerodynamics",
    text: "The underfloor produces much of the car's downforce by accelerating air beneath it. The diffuser at the back slows that air again. The front splitter and plank set how the floor sits relative to the road.",
    endurance:
      "Kerb strikes wear the skid plank and can crack the floor. Plank wear is measured after the race, and teams can be penalised for running too low.",
  },
  {
    id: "chassis",
    name: "Monocoque & safety cell",
    group: "Structure",
    text: "The prototypes are built around a carbon-fibre survival cell that carries the engine, suspension and driver loads. GT cars keep their production structure and add a welded-in FIA safety cage.",
    endurance:
      "Crash structures in the nose, sides and rear have to pass FIA homologation tests, and the driver sits well inside them.",
  },
  {
    id: "engine",
    name: "Combustion engine",
    group: "Powertrain",
    text: "The engine turns fuel into torque. At Le Mans it runs close to full throttle for long stretches, so cooling, lubrication and fuel efficiency matter as much as peak output.",
    endurance:
      "Engines are sealed and homologated. Balance of Performance limits power and the energy allowed per stint so that very different engine concepts can race together.",
  },
  {
    id: "hybrid",
    name: "Hybrid system",
    group: "Powertrain",
    text: "A motor-generator recovers energy under braking and gives it back as drive. LMH cars drive the front axle and may only deploy above a set speed. LMDh cars use a common rear-axle unit built into the gearbox.",
    endurance:
      "Energy recovered and deployed is metered and capped per stint, alongside the fuel allowance.",
  },
  {
    id: "gearbox",
    name: "Transmission",
    group: "Powertrain",
    text: "A sequential gearbox with paddle shifts delivers drive to the rear axle through a limited-slip differential. The gearbox casing usually carries the rear suspension too.",
    endurance:
      "Over 24 hours a car makes tens of thousands of shifts. Gearbox reliability often decides who is still running on Sunday.",
  },
  {
    id: "suspension",
    name: "Suspension",
    group: "Chassis",
    text: "Wheel-locating links, spring media and damper actuation vary with the chassis. Rockers can connect pushrods to inboard dampers, while anti-roll elements couple the sides. Some race cars use rear multilink arrangements rather than four identical double-wishbone corners.",
    endurance:
      "Suspension is set up for Le Mans's bumpy public-road sections and the kerbs at the chicanes, while keeping the floor at a stable ride height.",
  },
  {
    id: "brakes",
    name: "Braking system",
    group: "Chassis",
    text: "Hypercars and LMP2 cars use carbon discs and pads that work best when very hot. GT3 cars use steel discs. Brake-by-wire systems blend friction braking with hybrid energy recovery.",
    endurance:
      "The stops from over 300 km/h into the Mulsanne and Arnage corners are among the hardest in racing. Brake cooling ducts are sized for 24 hours of this.",
  },
  {
    id: "wheels",
    name: "Wheels & tyres",
    group: "Chassis",
    text: "Four contact patches carry every force the car makes. Hypercars run Michelin tyres; LMP2 and LMGT3 run Goodyear. Tyre allowances are limited, so teams often run two stints on one set.",
    endurance:
      "Centre-lock wheels and air jacks let a crew change all four wheels in seconds. Only a limited number of mechanics may work on the car during a stop.",
  },
  {
    id: "cooling",
    name: "Cooling",
    group: "Aerodynamics",
    text: "Radiators in the sidepods cool the engine water, oil, charge air and, on hybrids, the electrical system. Bigger openings cool better but add drag.",
    endurance:
      "Grass and debris in the radiator inlets are a real risk at Le Mans. Crews check and clear the inlets at pit stops.",
  },
  {
    id: "cockpit",
    name: "Cockpit & controls",
    group: "Driver & systems",
    text: "The seat, harness, steering wheel and displays have to work for three drivers of different sizes, day and night. The steering wheel carries dozens of controls for brake balance, traction control, radio and pit-lane speed limiter.",
    endurance:
      "Driver changes are practised until they take a few seconds. Cockpit cooling, drink systems and seat inserts help keep drivers comfortable over long stints.",
  },
  {
    id: "fuel",
    name: "Fuel & energy",
    group: "Driver & systems",
    text: "A protected fuel cell contains the bladder, collector, pumps and vent hardware. Its position depends on the chassis; the rear-engined Porsche GT3 R carries its tank at the front. Refuelling, pressure regulation and feed routing are separate parts of the system.",
    endurance:
      "Refuelling rate is regulated, so saving fuel to lengthen a stint can mean fewer pit stops.",
  },
  {
    id: "lights",
    name: "Lighting",
    group: "Driver & systems",
    text: "Powerful LED headlights are essential for the night-time hours on unlit sections of the lap. Many manufacturers use a signature light graphic so fans can identify the car in the dark.",
    endurance:
      "Class-specific lights help drivers judge closing speeds in traffic, and position lights show whether a car is leading its class.",
  },
];

export function systemsFor(car: Car) {
  return systems.filter((s) => s.id !== "hybrid" || car.hybrid);
}

export type Rule = "homologated" | "common" | "bop" | "safety" | "setup";

export const ruleInfo: Record<
  Rule,
  { label: string; color: string; text: string }
> = {
  homologated: {
    label: "Homologated design",
    color: "#3d7bff",
    text: "Designed by the manufacturer, then frozen. Changes need homologation 'jokers' or an Evo package.",
  },
  common: {
    label: "Common / supplied part",
    color: "#b8c2d6",
    text: "Supplied from a single source to every car in the class, or chosen from a short approved list.",
  },
  bop: {
    label: "Balance of Performance",
    color: "#ff7a00",
    text: "Power, weight and energy per stint are adjusted by the organisers to keep the field close.",
  },
  safety: {
    label: "FIA safety structure",
    color: "#ff2d4a",
    text: "Must pass FIA crash or strength tests. Cannot be changed.",
  },
  setup: {
    label: "Team setup",
    color: "#2fd18b",
    text: "Adjusted by the team for Le Mans, within the rules.",
  },
};

export function ruleFor(car: Car, id: SystemId): Rule {
  const p = car.platform;
  switch (id) {
    case "chassis":
    case "fuel":
      return "safety";
    case "engine":
      return "bop";
    case "hybrid":
      return p === "LMDh" ? "common" : "bop";
    case "gearbox":
      return p === "LMDh" || p === "LMP2" ? "common" : "homologated";
    case "wheels":
      return "common";
    case "suspension":
    case "brakes":
      return p === "LMP2" ? "common" : "setup";
    case "wing":
      return p === "LMP2" ? "common" : "setup";
    case "cockpit":
      return "setup";
    default:
      return p === "LMP2" ? "common" : "homologated";
  }
}

export function specsFor(car: Car, id: SystemId): [string, string][] {
  const proto = car.category !== "LMGT3";
  switch (id) {
    case "engine":
      return [
        ["Engine", car.engine.label],
        [
          "Layout",
          car.engine.position === "rear"
            ? "Rear-mounted, behind the rear axle"
            : car.engine.position === "front-mid"
              ? "Front-mid, behind the front axle"
              : "Mid-mounted, behind the driver",
        ],
        [
          "Aspiration",
          car.engine.turbo
            ? car.engine.turboCount === 1
              ? "Single turbocharger"
              : /twin/i.test(car.engine.label) || car.engine.turboCount === 2
                ? "Twin turbochargers"
                : "Turbocharged; count not verified"
            : "Naturally aspirated",
        ],
        [
          "Power",
          car.category === "LMGT3"
            ? "Set by BoP, around 370 kW"
            : car.category === "LMP2"
              ? "Class-regulated"
              : "Combined output capped by BoP",
        ],
      ];
    case "hybrid":
      return car.hybrid
        ? [
            ["System", car.hybrid.label],
            ["Axle", car.hybrid.kind === "LMH front axle" ? "Front" : "Rear"],
            ["Drive", car.drive],
          ]
        : [];
    case "gearbox":
      return [
        ["Gearbox", car.gearbox],
        ["Driven wheels", car.drive],
      ];
    case "chassis":
      return [
        ["Structure", car.chassis],
        ["Ruleset", platformLabel(car)],
      ];
    case "wheels":
      return [
        ["Tyres", `${car.tyres} (single supplier for the class)`],
        ["Fixing", "Single centre-lock nut"],
        ["Wet running", "Treaded wet tyres available"],
      ];
    case "brakes":
      return [
        ["Discs", proto ? "Carbon-carbon" : "Steel"],
        [
          "Control",
          car.hybrid
            ? "Brake-by-wire blending with energy recovery"
            : "Hydraulic, driver-adjustable balance",
        ],
      ];
    case "body":
      return car.identify.map((t, i) => [`Spotting cue ${i + 1}`, t]);
    case "fuel":
      return [
        ["Fuel", "100% renewable"],
        ["Energy", "Capped per stint"],
      ];
    case "suspension":
      return [
        ["Architecture", carEngineeringSummary(car).suspension],
        [
          "Spring medium",
          engineeringLayoutFor(car).springMedium === "torsion-bar"
            ? "Documented torsion bars"
            : "Exact spring medium not verified",
        ],
      ];
    default:
      return [];
  }
}

export function platformLabel(car: Car) {
  switch (car.platform) {
    case "LMH":
      return "Le Mans Hypercar (LMH)";
    case "LMDh":
      return "Le Mans Daytona h (LMDh)";
    case "LMP2":
      return "Le Mans Prototype 2";
    default:
      return "LMGT3 (FIA GT3 based)";
  }
}
