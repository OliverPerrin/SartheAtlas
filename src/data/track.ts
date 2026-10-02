export const circuit = {
  name: "Circuit de la Sarthe",
  length: 13.626,
  corners: 38,
  location: "Le Mans, France",
};

export type Section = { id: string; name: string; from: number; to: number; color: string; text: string };

// Lap fractions follow the marker positions in the track-atlas corner data.
export const sections: Section[] = [
  {
    id: "start",
    name: "Start & Dunlop",
    from: 0,
    to: 0.09,
    color: "#3d7bff",
    text: "Past the pits, through the fast Dunlop Curve, a tight chicane, then uphill under the famous Dunlop bridge.",
  },
  {
    id: "forest",
    name: "Esses & Tertre Rouge",
    from: 0.09,
    to: 0.16,
    color: "#8a5cff",
    text: "Downhill through the Esses de la Forêt to Tertre Rouge, the corner that leads onto the public road and the long straight.",
  },
  {
    id: "hunaudieres",
    name: "Hunaudières straight",
    from: 0.16,
    to: 0.57,
    color: "#e4002b",
    text: "The public-road straight, called Ligne Droite des Hunaudières and known in English as the Mulsanne Straight. Two chicanes have broken it up since 1990. Top speeds exceed 330 km/h.",
  },
  {
    id: "mulsanne",
    name: "Mulsanne to Arnage",
    from: 0.57,
    to: 0.76,
    color: "#ff7a00",
    text: "A hard stop at Mulsanne corner, a fast run through the trees to Indianapolis, then the slowest corner of the lap at Arnage.",
  },
  {
    id: "porsche",
    name: "Porsche Curves",
    from: 0.76,
    to: 0.93,
    color: "#2fd18b",
    text: "The permanent part of the circuit. A fast, flowing sequence with barriers close by, where downforce and commitment make the difference.",
  },
  {
    id: "ford",
    name: "Ford Chicanes",
    from: 0.93,
    to: 1,
    color: "#35c1f1",
    text: "Two tight chicanes lead back onto the start-finish straight and the pit entry.",
  },
];

export const cornerNotes: Record<string, string> = {
  "Dunlop Curve":
    "The lap starts with a fast right-hander after the pits. Cars arrive at full speed and need a stable platform under braking.",
  "Dunlop Chicane":
    "A tight left-right chicane at the top of the hill. It is a busy spot for overtaking on the first lap.",
  "Esses de la Forêt":
    "A quick left-right through the trees, downhill. Carrying speed here sets up the exit of Tertre Rouge.",
  "Tertre Rouge":
    "A right-hander onto the public road. A good exit gains time all the way down the long straight.",
  "First Chicane":
    "The Chicane Daytona breaks up the straight. Cars brake from over 320 km/h to about 100 km/h.",
  "Second Chicane":
    "The Chicane Michelin is the second braking zone on the Hunaudières and a common overtaking spot.",
  Mulsanne:
    "A right-hander at a roundabout on the public road. It is one of the hardest braking points of the lap.",
  Indianapolis:
    "A fast right through the trees feeds a banked left-hander. Drivers brake very late here.",
  Arnage:
    "The slowest corner of the lap, taken at around 70–80 km/h. Traction on the exit is everything.",
  "Turn 13":
    "The flat-out kink after Arnage leads onto the Porsche Curves.",
  "Porsche Curves":
    "A high-speed series of direction changes with little run-off. Passing slower cars here takes nerve.",
  Karting:
    "Part of the Porsche Curves complex, named after the karting track next to it.",
  Corvette:
    "The last of the flowing curves before the approach to the Ford Chicanes.",
  "Ford Chicane":
    "Two slow chicanes before the finish line. Rhythm and kerb use matter, and the pit entry is on the right just after them.",
};

// Illustrative class lap targets, used only to calibrate the animation. These are not timing data.
export const lapTargets = {
  Hypercar: { lap: 207, top: 340, color: "#e4002b" },
  LMP2: { lap: 216, top: 320, color: "#1d6bff" },
  LMGT3: { lap: 235, top: 300, color: "#ff7a00" },
} as const;
