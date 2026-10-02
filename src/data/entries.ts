import type { ClassName } from "./cars.ts";

export type Pattern =
  | "solid"
  | "stripe"
  | "split"
  | "fade"
  | "slash"
  | "mstripes"
  | "claw"
  | "shards"
  | "wave"
  | "chevron";

export type Livery = {
  base: string;
  second: string;
  accent: string;
  pattern: Pattern;
};

export type Entry = {
  number: string;
  carId: string;
  team: string;
  nation: string;
  drivers: [string, string, string];
  proAm?: boolean;
  livery: Livery;
};

const L = (
  base: string,
  second: string,
  accent: string,
  pattern: Pattern,
): Livery => ({ base, second, accent, pattern });

// Numbers, teams and crews follow the FIA WEC 2026 Le Mans provisional entry list V2 (5 May 2026).
// Liveries are original colour studies inspired by each entry, not reproductions of sponsor artwork.
export const entries: Entry[] = [
  // Hypercar
  { number: "007", carId: "aston", team: "Aston Martin THOR Team", nation: "USA", drivers: ["Harry Tincknell", "Tom Gamble", "Ross Gunn"], livery: L("#0d5c46", "#0a2b22", "#c7f23a", "wave") },
  { number: "009", carId: "aston", team: "Aston Martin THOR Team", nation: "USA", drivers: ["Alex Riberas", "Marco Sørensen", "Roman De Angelis"], livery: L("#0d5c46", "#0a2b22", "#c7f23a", "shards") },
  { number: "7", carId: "toyota", team: "Toyota Racing", nation: "JPN", drivers: ["Mike Conway", "Kamui Kobayashi", "Nyck de Vries"], livery: L("#15171b", "#e0162b", "#f2f2f2", "split") },
  { number: "8", carId: "toyota", team: "Toyota Racing", nation: "JPN", drivers: ["Sébastien Buemi", "Brendon Hartley", "Ryō Hirakawa"], livery: L("#15171b", "#e0162b", "#f2f2f2", "slash") },
  { number: "12", carId: "cadillac", team: "Cadillac Hertz Team Jota", nation: "USA", drivers: ["Alex Lynn", "Will Stevens", "Norman Nato"], livery: L("#101114", "#ffcc00", "#ffffff", "chevron") },
  { number: "15", carId: "bmw", team: "BMW M Team WRT", nation: "GER", drivers: ["Kevin Magnussen", "Raffaele Marciello", "Dries Vanthoor"], livery: L("#f4f5f6", "#16274d", "#2a8be0", "mstripes") },
  { number: "17", carId: "genesis", team: "Genesis Magma Racing", nation: "KOR", drivers: ["André Lotterer", "Luis Felipe Derani", "Mathys Jaubert"], livery: L("#1b1c1f", "#d8552a", "#e9e2d6", "fade") },
  { number: "19", carId: "genesis", team: "Genesis Magma Racing", nation: "KOR", drivers: ["Mathieu Jaminet", "Paul-Loup Chatin", "Daniel Juncadella"], livery: L("#e9e2d6", "#1b1c1f", "#d8552a", "fade") },
  { number: "20", carId: "bmw", team: "BMW M Team WRT", nation: "GER", drivers: ["Robin Frijns", "René Rast", "Sheldon van der Linde"], livery: L("#16274d", "#f4f5f6", "#2a8be0", "mstripes") },
  { number: "35", carId: "alpine", team: "Alpine Endurance Team", nation: "FRA", drivers: ["António Félix da Costa", "Charles Milesi", "Ferdinand Habsburg"], livery: L("#0f1a33", "#1f5fd6", "#ff5fa2", "shards") },
  { number: "36", carId: "alpine", team: "Alpine Endurance Team", nation: "FRA", drivers: ["Frédéric Makowiecki", "Jules Gounon", "Victor Martins"], livery: L("#0f1a33", "#1f5fd6", "#ff5fa2", "slash") },
  { number: "38", carId: "cadillac", team: "Cadillac Hertz Team Jota", nation: "USA", drivers: ["Sébastien Bourdais", "Earl Bamber", "Jack Aitken"], livery: L("#ffcc00", "#101114", "#ffffff", "chevron") },
  { number: "50", carId: "ferrari", team: "Ferrari AF Corse", nation: "ITA", drivers: ["Antonio Fuoco", "Nicklas Nielsen", "Miguel Molina"], livery: L("#c8102e", "#1a1a1a", "#ffd21f", "stripe") },
  { number: "51", carId: "ferrari", team: "Ferrari AF Corse", nation: "ITA", drivers: ["Alessandro Pier Guidi", "James Calado", "Antonio Giovinazzi"], livery: L("#c8102e", "#1a1a1a", "#ffd21f", "stripe") },
  { number: "83", carId: "ferrari", team: "AF Corse", nation: "ITA", drivers: ["Yifei Ye", "Robert Kubica", "Philip Hanson"], livery: L("#ffd21f", "#1a1a1a", "#c8102e", "stripe") },
  { number: "93", carId: "peugeot", team: "Peugeot TotalEnergies", nation: "FRA", drivers: ["Paul di Resta", "Stoffel Vandoorne", "Nick Cassidy"], livery: L("#2b2e33", "#15171a", "#c6f432", "claw") },
  { number: "94", carId: "peugeot", team: "Peugeot TotalEnergies", nation: "FRA", drivers: ["Loïc Duval", "Malthe Jakobsen", "Théo Pourchaire"], livery: L("#2b2e33", "#15171a", "#c6f432", "claw") },
  { number: "101", carId: "cadillac", team: "Cadillac WTR", nation: "USA", drivers: ["Ricky Taylor", "Jordan Taylor", "Filipe Albuquerque"], livery: L("#0b1f4d", "#c9ccd2", "#d22630", "slash") },
  // LMP2
  { number: "3", carId: "oreca", team: "DKR Engineering", nation: "LUX", proAm: true, drivers: ["John Farano", "Sebastian Alvarez", "Renger van der Zande"], livery: L("#f2f2f2", "#d6202b", "#111111", "slash") },
  { number: "4", carId: "oreca", team: "CrowdStrike Racing by APR", nation: "USA", proAm: true, drivers: ["George Kurtz", "Alexander Quinn", "Laurin Heinrich"], livery: L("#141414", "#e3262f", "#f2f2f2", "shards") },
  { number: "9", carId: "oreca", team: "Proton Competition", nation: "GER", drivers: ["Jonas Ried", "Lenny Ried", "Harry King"], livery: L("#f2f2f2", "#141414", "#e5332a", "split") },
  { number: "14", carId: "oreca", team: "TDS Racing", nation: "FRA", proAm: true, drivers: ["Tobias Lütke", "Mathias Beche", "Kevin Estre"], livery: L("#1c2a48", "#94c93d", "#ffffff", "fade") },
  { number: "22", carId: "oreca", team: "United Autosports", nation: "GBR", drivers: ["Rasmus Lindh", "Grégoire Saucy", "Mikkel Jensen"], livery: L("#ff8200", "#1a2b4c", "#ffffff", "split") },
  { number: "24", carId: "oreca", team: "Nielsen Racing", nation: "GBR", drivers: ["David Heinemeier Hansson", "Edward Pearson", "Jack Doohan"], livery: L("#101010", "#e8e8e8", "#e0162b", "stripe") },
  { number: "25", carId: "oreca", team: "Algarve Pro Racing", nation: "POR", proAm: true, drivers: ["Michael Jensen", "Enzo Trulli", "Jake Hughes"], livery: L("#f5f5f5", "#2f6fdf", "#10213f", "wave") },
  { number: "26", carId: "oreca", team: "Vector Sport", nation: "GBR", drivers: ["Ryan Cullen", "Vladislav Lomko", "Pietro Fittipaldi"], livery: L("#0f1c2e", "#35c1f1", "#ffffff", "chevron") },
  { number: "28", carId: "oreca", team: "IDEC Sport", nation: "FRA", drivers: ["Paul Lafargue", "Valerio Rinicella", "Job van Uitert"], livery: L("#f4f4f4", "#1e3c8c", "#e3262f", "stripe") },
  { number: "29", carId: "oreca", team: "Forestier Racing by Panis", nation: "FRA", drivers: ["Louis Rousset", "Esteban Masson", "Oliver Gray"], livery: L("#101a3a", "#e9e9e9", "#d51f3a", "slash") },
  { number: "30", carId: "oreca", team: "Duqueine Team", nation: "FRA", drivers: ["Doriane Pin", "Julien Andlauer", "Richard Verschoor"], livery: L("#e9e9e9", "#131313", "#ffcf00", "shards") },
  { number: "37", carId: "oreca", team: "CLX Motorsport", nation: "SUI", drivers: ["Adrien Closmenil", "Ian Aguilera", "Theodor Jensen"], livery: L("#111827", "#6d4bd8", "#f2f2f2", "fade") },
  { number: "43", carId: "oreca", team: "Inter Europol Competition", nation: "POL", drivers: ["Jakub Śmiechowski", "Tom Dillmann", "Nicholas Yelloly"], livery: L("#f2f2f2", "#c8102e", "#141414", "wave") },
  { number: "44", carId: "oreca", team: "Proton Competition", nation: "GER", proAm: true, drivers: ["Stefan Aust", "Horst Felbermayr Jr.", "Horst Felix Felbermayr"], livery: L("#141414", "#f2f2f2", "#e5332a", "split") },
  { number: "48", carId: "oreca", team: "RD Limited", nation: "FRA", proAm: true, drivers: ["Fred Poordad", "Tristan Vautier", "Romain Dumas"], livery: L("#1b1b1b", "#b89b5e", "#ffffff", "stripe") },
  { number: "99", carId: "oreca", team: "AO by TF", nation: "USA", proAm: true, drivers: ["PJ Hyett", "Louis Delétraz", "Dane Cameron"], livery: L("#7ad33f", "#101010", "#f0469b", "shards") },
  { number: "183", carId: "oreca", team: "AF Corse", nation: "ITA", proAm: true, drivers: ["François Perrodo", "Matthieu Vaxivière", "Ben Barnicoat"], livery: L("#ffd21f", "#1a1a1a", "#c8102e", "stripe") },
  { number: "222", carId: "oreca", team: "United Autosports", nation: "GBR", proAm: true, drivers: ["Daniel Schneider", "Benjamin Hanley", "Oliver Jarvis"], livery: L("#1a2b4c", "#ff8200", "#ffffff", "split") },
  { number: "343", carId: "oreca", team: "Inter Europol Competition", nation: "POL", drivers: ["Bijoy Garg", "Reshad de Gérus", "Nico Müller"], livery: L("#c8102e", "#f2f2f2", "#141414", "wave") },
  // LMGT3
  { number: "2", carId: "corvette", team: "TF Sport", nation: "GBR", drivers: ["Prince Jefri Ibrahim", "Afiq Ikhwan", "Ben Green"], livery: L("#f7d117", "#15161a", "#e7e7e7", "slash") },
  { number: "10", carId: "mclaren", team: "Garage 59", nation: "GBR", drivers: ["Antares Au", "Thomas Fleming", "Marvin Kirchhöfer"], livery: L("#ff8000", "#15161a", "#6dc8f2", "fade") },
  { number: "13", carId: "corvette", team: "13 Autosport", nation: "CAN", drivers: ["Orey Fidani", "Lars Kern", "Matthew Bell"], livery: L("#e8e8e8", "#10213f", "#e21c34", "chevron") },
  { number: "21", carId: "296", team: "Vista AF Corse", nation: "ITA", drivers: ["François Hériau", "Simon Mann", "Alessio Rovera"], livery: L("#c8102e", "#101010", "#ffd21f", "stripe") },
  { number: "23", carId: "vantage", team: "Heart of Racing Team", nation: "USA", drivers: ["Gray Newell", "Eduardo Barrichello", "Jonny Adam"], livery: L("#0d5c46", "#e8e8e8", "#c7f23a", "wave") },
  { number: "27", carId: "vantage", team: "Heart of Racing Team", nation: "USA", drivers: ["Ian James", "Zacharie Robichon", "Mattia Drudi"], livery: L("#0d5c46", "#e8e8e8", "#c7f23a", "wave") },
  { number: "32", carId: "m4", team: "Team WRT", nation: "BEL", drivers: ["Darren Leung", "Sean Gelael", "Augusto Farfus"], livery: L("#f4f5f6", "#16274d", "#2a8be0", "mstripes") },
  { number: "33", carId: "corvette", team: "TF Sport", nation: "GBR", drivers: ["Ben Keating", "Jonny Edgar", "Nicky Catsburg"], livery: L("#f7d117", "#15161a", "#e7e7e7", "shards") },
  { number: "34", carId: "corvette", team: "Racing Team Turkey by TF", nation: "TUR", drivers: ["Peter Dempsey", "Salih Yoluç", "Charlie Eastwood"], livery: L("#d91e2b", "#f2f2f2", "#15161a", "slash") },
  { number: "54", carId: "296", team: "Vista AF Corse", nation: "ITA", drivers: ["Thomas Flohr", "Francesco Castellacci", "Davide Rigon"], livery: L("#c8102e", "#101010", "#ffffff", "stripe") },
  { number: "57", carId: "296", team: "Kessel Racing", nation: "SUI", drivers: ["Takeshi Kimura", "Conrad Laursen", "Daniel Serra"], livery: L("#101010", "#c8102e", "#ffffff", "shards") },
  { number: "58", carId: "mclaren", team: "Garage 59", nation: "GBR", drivers: ["Alexander West", "Finn Gehrsitz", "Benjamin Goethe"], livery: L("#15161a", "#ff8000", "#6dc8f2", "fade") },
  { number: "59", carId: "vantage", team: "Racing Spirit of Léman", nation: "FRA", drivers: ["Clément Mateu", "Marius Fossard", "Valentin Hasse Clot"], livery: L("#12306e", "#f2f2f2", "#e3262f", "split") },
  { number: "61", carId: "mercedes", team: "Iron Lynx", nation: "ITA", drivers: ["Martin Berry", "Rui Andrade", "Maxime Martin"], livery: L("#1b1c20", "#a7adb4", "#e5e5e5", "shards") },
  { number: "62", carId: "mercedes", team: "Team Qatar by Iron Lynx", nation: "QAT", drivers: ["Abdulla Al-Khelaifi", "Julian Hanses", "Giuliano Alesi"], livery: L("#f2f2f2", "#8a1538", "#1b1c20", "wave") },
  { number: "69", carId: "m4", team: "Team WRT", nation: "BEL", drivers: ["Anthony McIntosh", "Parker Thompson", "Daniel Harper"], livery: L("#16274d", "#f4f5f6", "#2a8be0", "mstripes") },
  { number: "74", carId: "296", team: "Kessel Racing", nation: "SUI", drivers: ["Dustin Blattner", "Lorenzo Patrese", "Dennis Marschall"], livery: L("#101010", "#c8102e", "#ffd21f", "shards") },
  { number: "77", carId: "ford", team: "Proton Competition", nation: "GER", drivers: ["Eric Powell", "Ben Tuck", "Sebastian Priaulx"], livery: L("#f2f2f2", "#123a8c", "#e5332a", "slash") },
  { number: "78", carId: "lexus", team: "Akkodis ASP Team", nation: "FRA", drivers: ["Tom Van Rompuy", "Hadrien David", "Jack Hawksworth"], livery: L("#f2f2f2", "#14253f", "#ff6a13", "chevron") },
  { number: "79", carId: "mercedes", team: "Iron Lynx", nation: "ITA", drivers: ["Johannes Zelger", "Matteo Cressoni", "Lin Hodenius"], livery: L("#a7adb4", "#1b1c20", "#e5e5e5", "shards") },
  { number: "87", carId: "lexus", team: "Akkodis ASP Team", nation: "FRA", drivers: ["Petru Umbrărescu", "Clemens Schmid", "José María López"], livery: L("#14253f", "#f2f2f2", "#ff6a13", "chevron") },
  { number: "88", carId: "ford", team: "Proton Competition", nation: "GER", drivers: ["Stefano Gattuso", "Giammarco Levorato", "Logan Sargeant"], livery: L("#123a8c", "#f2f2f2", "#e5332a", "slash") },
  { number: "91", carId: "porsche", team: "Manthey DK Engineering", nation: "GER", drivers: ["James Cottingham", "Timur Boguslavskiy", "Ayhancan Güven"], livery: L("#ffe500", "#1c9c4f", "#141414", "fade") },
  { number: "92", carId: "porsche", team: "The Bend Manthey", nation: "GER", drivers: ["Yasser Shahin", "Riccardo Pera", "Richard Lietz"], livery: L("#1c9c4f", "#ffe500", "#141414", "fade") },
  { number: "150", carId: "296", team: "Richard Mille AF Corse", nation: "ITA", drivers: ["Custodio Toledo", "Lilou Wadoux", "Riccardo Agostini"], livery: L("#f2f2f2", "#c8102e", "#141414", "wave") },
];

export const classPanel: Record<ClassName, string> = {
  Hypercar: "#e4002b",
  LMP2: "#1d6bff",
  LMGT3: "#ff7a00",
};

export function entriesFor(carId: string) {
  return entries.filter((e) => e.carId === carId);
}

// Surnames as printed on the entry list, where the last word alone would be wrong.
const surnames: Record<string, string> = {
  "Alessandro Pier Guidi": "Pier Guidi",
  "António Félix da Costa": "Félix da Costa",
  "David Heinemeier Hansson": "Heinemeier Hansson",
  "Valentin Hasse Clot": "Hasse Clot",
  "Horst Felbermayr Jr.": "Felbermayr Jr.",
  "Prince Jefri Ibrahim": "Jefri Ibrahim",
};
const particles = ["de", "van", "da", "di", "De", "Van"];

export function surname(name: string) {
  if (surnames[name]) return surnames[name];
  const parts = name.split(" ");
  const i = parts.findIndex((p, k) => k > 0 && particles.includes(p));
  return i > 0 ? parts.slice(i).join(" ") : parts[parts.length - 1];
}
