import { modelMetadata } from "./modelMetadata.ts";
import type { ModelMetadata } from "./modelMetadata.ts";

// Public creator-hosted exterior models. Embedding does not redistribute meshes.
// Each asset keeps its own material/livery and its documented variant caveat.
export type ExteriorFilm = {
  id: string;
  title: string;
  author: string;
  sourceUrl: string;
  poster: string;
  note: string;
};

export type Reference = {
  id: string;
  author: string;
  assetLabel: string;
  note: string;
  film?: ExteriorFilm;
} & Partial<ModelMetadata>;

const references: Record<string, Reference> = {
  ferrari: {
    id: "e5957ead88aa4f2996bc66073734d3d7",
    author: "Project 212",
    assetLabel: "499P · earlier race exterior",
    note: "Creator model published in 2024, depicting #51 with its own livery. Exact 2026 specification is unverified.",
  },
  toyota: {
    id: "9d9800d56b754f65acfba6f91966a5c3",
    author: "LMP12",
    assetLabel: "TR010 · 2026 community model",
    note: "2026-labelled TR010 exterior. Uploader notes missing interior and light textures; manufacturer accuracy is unverified.",
  },
  aston: {
    id: "7daa766d301f4d489312b0922d4bdc0d",
    author: "vecarz · credits MattDoesBlender",
    film: {
      id: "R5Svt74fomo",
      title: "2026 Aston Martin Valkyrie AMR-LMH studio turntable",
      author: "OpticalDreamSoft",
      sourceUrl:
        "https://www.opticaldreamsoft.com/wec-2026-aston-martin-amr-lmh",
      poster: "https://i.ytimg.com/vi/R5Svt74fomo/maxresdefault.jpg",
      note: "Original artist’s rendered 2026 AMR-LMH turntable. This is a studio film; the interactive exterior is a related customer LM track variant.",
    },
    assetLabel: "Valkyrie LM · related track variant",
    note: "Detailed textured Valkyrie LM, the related customer track variant rather than the homologated WEC LMH. See the optional artist film for a 2026 race model; hosted asset provenance is unverified.",
  },
  cadillac: {
    id: "171bd5faf6824674b73162143e1e70f9",
    author: "kevin (sohyalebret)",
    assetLabel: "V-Series.R · 2023 exterior",
    note: "2023 V-Series.R with earlier Whelen/Daytona bodywork and livery, rather than the selected 2026 entry.",
  },
  bmw: {
    id: "9871477854b64e82bd43438eb9b940fd",
    author: "JUSTGAME",
    assetLabel: "M Hybrid V8 · earlier exterior",
    note: "Earlier M Hybrid V8 bodywork and the model's original livery, before the revised 2026 nose.",
  },
  genesis: {
    id: "b78356b7cea64044839219c44329ff82",
    author: "LMP12",
    assetLabel: "GMR-001 · 2026 community model",
    note: "2026-labelled GMR-001 depicting #17. Community geometry and materials have not been factory validated.",
  },
  alpine: {
    id: "a9e29a73196244979cce065fe25f9589",
    author: "Dave Love SketchFab",
    assetLabel: "A424 · 2024 exterior",
    note: "2024 A424 with the hosted model's own livery. Exact 2026 bodywork and asset provenance remain unverified.",
  },
  peugeot: {
    id: "b3efbf3a774c4411983e630d764c8cea",
    author: "kevin (sohyalebret)",
    assetLabel: "9X8 EVO · 2024 exterior",
    note: "Wing-equipped 2024 9X8 EVO depicting #93, rather than an exact 2026 race livery.",
  },
  oreca: {
    id: "c2517d31955e48ae9e1b83dfe0dfc382",
    author: "Todor Malakchiev",
    assetLabel: "Oreca 07 · earlier exterior",
    note: "Earlier Oreca 07 with the creator's original colours. The selected entry's livery is shown separately as a study.",
  },
  "296": {
    id: "a463226115184535928ec75660c6571f",
    author: "vecarz",
    assetLabel: "296 GT3 · earlier exterior",
    note: "Earlier 296 GT3 depicting #54, rather than the 2026 Evo or necessarily the selected race entry.",
  },
  corvette: {
    id: "2752ec60ebad4b7496dd3dc7005eca90",
    author: "Patricars",
    assetLabel: "Z06 GT3.R · white studio exterior",
    note: "Detailed Z06 GT3.R in the artist’s white studio finish. It does not reproduce the selected team’s livery; exact 2026 bodywork is unverified.",
  },
  mclaren: {
    id: "e44e0ec2dc864c08bf68b062bf32d7d3",
    author: "MattDoesBlender",
    assetLabel: "720S LMGT3 Evo · 2025 model",
    note: "720S LMGT3 Evo published in 2025 with its own #95 livery, rather than the selected 2026 entry.",
  },
  vantage: {
    id: "b42382f18f024251bb5c23bb21cb3410",
    author: "toddeppe",
    assetLabel: "Vantage GT3 Evo · Heart of Racing",
    note: "Heart of Racing #27 community model published in 2026, based on a MattDoesBlender model; upstream provenance is unverified.",
  },
  m4: {
    id: "0feb1f9793c14b35971518a93a97d688",
    author: "MattDoesBlender",
    assetLabel: "M4 GT3 EVO · community exterior",
    note: "EVO-labelled exterior with its own livery. The viewer isolates the main car from duplicate/reflection geometry and corrects its up axis. Exact 2026 specification is unverified.",
  },
  mercedes: {
    id: "146766480dc348dbb95ec03c1bf33d0d",
    author: "DisneyCars / supercarmodels",
    assetLabel: "AMG GT3 Evo · 2020 exterior",
    note: "2020 AMG GT3 Evo with original model colours. LMGT3 changes and the 2026 race livery are unverified.",
  },
  ford: {
    id: "061487e4e4fa4cd1bf7e15eae2e238ba",
    author: "vecarz · credits MattDoesBlender",
    assetLabel: "Mustang GT3 · textured race exterior",
    note: "Creator-restored detailed Mustang GT3 depicting #44 with its own livery. Exact 2026 updates and upstream asset provenance are unverified; the host credits MattDoesBlender.",
  },
  lexus: {
    id: "59cff926f1d9460abf1401c5118c54d6",
    author: "vecarz",
    assetLabel: "RC F GT3 · earlier exterior",
    note: "Earlier Blancpain-series RC F GT3 depicting #23. It is a hosted reference, with upstream provenance and 2026 livery unverified.",
  },
  porsche: {
    id: "d634485e0b2a4b07b66150b525009a6f",
    author: "DisneyCars / supercarmodels",
    assetLabel: "911 GT3 R · 2023 exterior",
    note: "2023 911 GT3 R with original model colours, not independently checked against 2026 updates.",
  },
};

export const exteriorReferences: Record<string, Reference> = Object.fromEntries(
  Object.entries(references).map(([carId, reference]) => [
    carId,
    { ...reference, ...modelMetadata[reference.id] },
  ]),
);
