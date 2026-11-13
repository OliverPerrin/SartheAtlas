// Race photography from Wikimedia Commons. Every image keeps its author,
// license and source page; the files in public/photos are resized and
// recompressed copies (2200 px and 1100 px wide), with no other changes.

import type { Phase } from "./racePhase.ts";

export type Photo = {
  id: string;
  alt: string;
  caption: string;
  place: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
  width: number;
  height: number;
  /** object-position focus for full-bleed crops */
  focus: string;
};

const base = import.meta.env.BASE_URL;

export const photoSrc = (photo: Photo, size: 1100 | 2200 = 2200) =>
  `${base}photos/${photo.id}-${size}.jpg`;

export const photoSrcSet = (photo: Photo) =>
  `${photoSrc(photo, 1100)} 1100w, ${photoSrc(photo, 2200)} 2200w`;

const commons = (file: string) =>
  `https://commons.wikimedia.org/wiki/File:${file}`;
const BY2 = ["CC BY 2.0", "https://creativecommons.org/licenses/by/2.0/"];
const BYSA2 = ["CC BY-SA 2.0", "https://creativecommons.org/licenses/by-sa/2.0/"];
const BY4 = ["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"];
const BYSA4 = ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"];

function photo(
  id: string,
  [license, licenseUrl]: string[],
  fields: Omit<Photo, "id" | "license" | "licenseUrl">,
): Photo {
  return { id, license, licenseUrl, ...fields };
}

export const photos = {
  goldenHour: photo("cadillac-golden-hour", BY2, {
    alt: "A red Cadillac V-Series.R prototype kicks up dust in low golden sunlight.",
    caption: "Cadillac V-Series.R #31",
    place: "Petit Le Mans, Road Atlanta · 2023",
    author: "Osajus Photography",
    source: commons(
      "Whelen_Engineering_Racing%27s_Cadillac_V-Series.R_during_the_2023_Petit_Le_Mans.jpg",
    ),
    width: 2200,
    height: 1467,
    focus: "62% 50%",
  }),
  lightTrails: photo("esses-night-trails", BYSA2, {
    alt: "Headlight trails snake through the Esses under floodlights in the dark at Le Mans.",
    caption: "Light trails through the Esses",
    place: "24 Hours of Le Mans · 2014",
    author: "Nic Redhead",
    source: commons("Le_Mans_Esses_at_night.jpg"),
    width: 2200,
    height: 1457,
    focus: "60% 58%",
  }),
  fordChicane: photo("cadillac-ford-chicane", BYSA2, {
    alt: "A yellow Cadillac V-Series.R turns through the Ford Chicane, seen head-on.",
    caption: "Cadillac V-Series.R #3 · Ford Chicane",
    place: "24 Hours of Le Mans · 2023",
    author: "Martin Lee",
    source: commons(
      "Cadillac_V-Series.R-Hybrid_-_Sebastien_Bourdais,_Renger_van_der_Zande_%26_Scott_Dixon_in_Ford_Chicane_at_the_2023_Le_Mans_(53427995162).jpg",
    ),
    width: 2200,
    height: 1210,
    focus: "52% 60%",
  }),
  bmwSpeed: photo("bmw-at-speed", BY2, {
    alt: "A BMW M Hybrid V8 panned at speed, the background streaked with motion blur.",
    caption: "BMW M Hybrid V8 at speed",
    place: "24 Hours of Le Mans · 2024",
    author: "Mickael Le rouzic",
    source: commons("2024_24_Hours_of_Le_Mans_(54094633049).jpg"),
    width: 2200,
    height: 1384,
    focus: "50% 50%",
  }),
  underLights: photo("cadillac-night-2026", BYSA4, {
    alt: "A gold and black Cadillac V-Series.R, number 38, panned at speed in the dark with its lights and number panel glowing.",
    caption: "Cadillac V-Series.R #38 at Indianapolis",
    place: "24 Hours of Le Mans · 2026",
    author: "T GOUREAU",
    source: commons(
      "24_Heures_du_Mans_2026_Hypercar_No._38_Cadillac_V-Series.R_(night).jpg",
    ),
    width: 2200,
    height: 1099,
    focus: "45% 55%",
  }),
  brakesNight: photo("brakes-glowing-night", BY2, {
    alt: "A red Oreca 07, number 41, brakes in the dark, its front brake disc glowing orange.",
    caption: "Oreca 07 #41 · brake discs glowing",
    place: "24 Hours of Le Mans · 2023",
    author: "Mickael Le rouzic",
    source: commons("2023_24_Hours_of_Le_Mans_(53272136874).jpg"),
    width: 2200,
    height: 1127,
    focus: "35% 68%",
  }),
  pitLaneNight: photo("pit-lane-night", BYSA2, {
    alt: "The floodlit pit straight and grandstands at night, with light trails streaking down the pit lane.",
    caption: "Pit lane and grandstands at night",
    place: "24 Hours of Le Mans · 2014",
    author: "Nic Redhead",
    source: commons("Le_Mans_pit_lane_at_night.jpg"),
    width: 2200,
    height: 1457,
    focus: "50% 55%",
  }),
  dawnWheel: photo("ferris-wheel-dawn", BY2, {
    alt: "The Le Mans Ferris wheel and a floodlit grandstand under a grey-blue sky at dawn.",
    caption: "The Ferris wheel at dawn",
    place: "24 Hours of Le Mans · 2013",
    author: "Surreal Name Given",
    source: commons("Le_Mans_2013_(9344640603).jpg"),
    width: 2200,
    height: 1461,
    focus: "42% 40%",
  }),
  finish: photo("finish-line-2025", BYSA4, {
    alt: "The chequered flag waves over the Le Mans finish line as the clock reads zero.",
    caption: "Chequered flag for car #83",
    place: "24 Hours of Le Mans · 2025",
    author: "Lukas Raich",
    source: commons("24H_Le_Mans_2025_Car_83_crossing_the_finish_line_(1).jpg"),
    width: 2200,
    height: 1467,
    focus: "35% 40%",
  }),
  alpine: photo("alpine-a424", BY2, {
    alt: "The blue Alpine A424 #35 rounds a corner over yellow and blue kerbs.",
    caption: "Alpine A424 #35",
    place: "24 Hours of Le Mans · 2024",
    author: "Mickael Le rouzic",
    source: commons("2024_24_Hours_of_Le_Mans_(54094303231).jpg"),
    width: 2200,
    height: 1240,
    focus: "62% 55%",
  }),
  prototypes: photo("prototypes-le-mans", BYSA2, {
    alt: "Two prototypes run nose to tail past the yellow and blue Le Mans kerbs.",
    caption: "Prototypes nose to tail",
    place: "24 Hours of Le Mans · 2024",
    author: "Kevin Decherf",
    source: commons("24H_Le_Mans_(53814567052).jpg"),
    width: 2200,
    height: 1467,
    focus: "45% 65%",
  }),
  vantage: photo("aston-vantage-lmgt3", BY4, {
    alt: "A dark green Aston Martin Vantage GT3 with lime details passes a trackside banner.",
    caption: "Aston Martin Vantage #007",
    place: "24 Hours of Le Mans · 2025",
    author: "Mickael Le rouzic",
    source: commons("2025_24_Hours_of_Le_Mans_(54917513783).jpg"),
    width: 2200,
    height: 1190,
    focus: "50% 60%",
  }),
  bmwSide: photo("bmw-side-detail", BY2, {
    alt: "Side detail of a BMW M Hybrid V8: front wheel, Michelin tyre and number 25.",
    caption: "BMW M Hybrid V8 #25 · side detail",
    place: "Petit Le Mans, Road Atlanta · 2022",
    author: "Osajus Photography",
    source: commons("BMW_M_Hybrid_V8_at_the_2022_Petit_Le_Mans_-_Side.jpg"),
    width: 2200,
    height: 1464,
    focus: "50% 55%",
  }),
} satisfies Record<string, Photo>;

export const allPhotos = Object.values(photos);

/** The full-screen photograph for each light of the race. */
export const phasePhotos: Record<Phase, Photo> = {
  day: photos.alpine,
  dusk: photos.goldenHour,
  night: photos.lightTrails,
  dawn: photos.dawnWheel,
};
