import type {
  ExteriorCameraOptions,
  EnvironmentOverrides,
} from "../ExteriorViewer.tsx";
import {
  materialRecipes,
  materialRecipeModelIds,
  environmentRecipes,
  postProcessingRecipes,
} from "./materialRecipes.ts";

// Presentation repairs are attached to the exact inspected source asset ID.
// Swapping a reference cannot accidentally recolour an unrelated creator model.
export type ExteriorTuning = ExteriorCameraOptions & {
  hiddenNodeNames?: readonly string[];
  environmentOverrides?: EnvironmentOverrides;
  postProcessingOverrides?: Record<string, unknown>;
};
export const exteriorTuning: Record<string, ExteriorTuning> = {
  "2752ec60ebad4b7496dd3dc7005eca90": { fitScale: 0.85 },
  a463226115184535928ec75660c6571f: {
    fitScale: 0.62,
    cameraYaw: 35,
    cameraElevation: 0.3,
  },
  a9e29a73196244979cce065fe25f9589: {
    fitScale: 0.76,
    cameraYaw: 30,
    cameraElevation: 0.3,
  },
  "9871477854b64e82bd43438eb9b940fd": { fitScale: 1.0 },
  e44e0ec2dc864c08bf68b062bf32d7d3: {
    fitScale: 0.88,
    cameraYaw: 15,
    cameraElevation: 0.3,
  },
  "4dedaf758f2d4f659322efffc969e8e3": {
    hiddenNodeNames: [
      "RIM_BLUR_LF_134",
      "RIM_BLUR_LR_147",
      "RIM_BLUR_RF_160",
      "RIM_BLUR_RR_173",
    ],
    cameraYaw: 25,
    cameraElevation: 0.3,
  },
};

// Verified main M4 assembly: remove author reflection/duplicate parts and correct its up axis.
exteriorTuning["0feb1f9793c14b35971518a93a97d688"] = {
  cameraYaw: 35,
  cameraElevation: 0.3,
  hiddenNodeNames: [
    "mesh_135_1809.nr_0",
    "mesh_135_1805.nr_1",
    "mesh_135_1804.nr_2",
    "mesh_135_1803.nr_3",
    "mesh_135_1802.nr_4",
    "mesh_135_1801.nr_5",
    "mesh_135_1800.nr_6",
    "mesh_135_1797.nr_7",
    "mesh_135_1796.nr_8",
    "mesh_135_1786.nr_9",
    "mesh_135_1783.nr_10",
    "mesh_135_1782.nr_11",
    "mesh_135_1781.nr_12",
    "mesh_135_1780.nr_13",
    "mesh_135_1779.nr_14",
    "mesh_135_1778.nr_15",
    "mesh_135_1777.nr_16",
    "mesh_135_1776.nr_17",
    "mesh_135_1775.nr_18",
    "mesh_135_1774.nr_19",
    "mesh_135_1773.nr_20",
    "mesh_135_1772.nr_21",
    "mesh_135_1771.nr_22",
    "mesh_135_1770.nr_23",
    "mesh_135_1769.nr_24",
    "mesh_135_1768.nr_25",
    "mesh_135_1767.nr_26",
    "mesh_135_1766.nr_27",
    "mesh_135_1765.nr_28",
    "mesh_135_1764.nr_29",
    "mesh_135_1763.nr_30",
    "mesh_135_1761.nr_31",
    "mesh_135_1724.nr_32",
    "mesh_135_1723.nr_33",
    "mesh_135_1722.nr_34",
    "mesh_135_1721.nr_35",
    "mesh_135_1720.nr_36",
    "mesh_135_1719.nr_37",
    "mesh_135_1718.nr_38",
    "mesh_135_1717.nr_39",
    "mesh_135_1716.nr_40",
    "mesh_135_1715.nr_41",
    "mesh_135_1714.nr_42",
    "mesh_135_1713.nr_43",
    "mesh_135_1712.nr_44",
    "mesh_135_1710.nr_45",
    "mesh_135_1709.nr_46",
    "mesh_135_1708.nr_47",
    "mesh_135_1707.nr_48",
    "mesh_135_1698.nr_49",
    "mesh_135_1697.nr_50",
    "mesh_135_1696.nr_51",
    "mesh_135_1695.nr_52",
    "mesh_135_1694.nr_53",
    "mesh_135_1693.nr_54",
    "mesh_135_1692.nr_55",
    "mesh_135_1691.nr_56",
    "mesh_135_1686.nr_57",
    "mesh_135_1685.nr_58",
    "mesh_135_1684.nr_59",
    "mesh_135_1683.nr_60",
    "mesh_132_1599.nr_61",
    "mesh_132_1598.nr_62",
    "mesh_132_1597.nr_63",
    "mesh_132_1596.nr_64",
    "mesh_132_1595.nr_65",
    "mesh_132_1593.nr_66",
    "mesh_132_1590.nr_67",
    "mesh_132_1589.nr_68",
    "mesh_132_1588.nr_69",
    "mesh_132_1587.nr_70",
    "mesh_132_1586.nr_71",
    "mesh_132_1585.nr_72",
    "mesh_132_1584.nr_73",
    "mesh_132_1583.nr_74",
    "mesh_132_1582.nr_75",
    "mesh_132_1581.nr_76",
    "mesh_132_1580.nr_77",
    "mesh_132_1579.nr_78",
    "mesh_132_1570.nr_79",
    "mesh_132_1569.nr_80",
    "mesh_132_1568.nr_81",
    "mesh_132_1567.nr_82",
    "mesh_132_1560.nr_83",
    "mesh_132_1559.nr_84",
    "mesh_132_1558.nr_85",
    "mesh_132_1557.nr_86",
    "mesh_132_1556.nr_87",
    "mesh_132_1555.nr_88",
    "mesh_132_1554.nr_89",
    "mesh_132_1553.nr_90",
    "mesh_132_1552.nr_91",
    "mesh_132_1551.nr_92",
    "mesh_132_1523.nr_93",
    "mesh_132_1522.nr_94",
    "mesh_132_1405.nr_150",
    "mesh_132_1404.nr_151",
    "mesh_132_1403.nr_152",
    "mesh_132_1402.nr_153",
  ],
  modelRotation: {
    angle: -1.5707963267948966,
    axis: [1, 0, 0],
    modelId: "0feb1f9793c14b35971518a93a97d688",
    nodeName: "GLTF_SceneRootNode",
  },
};
const recipeSourceIds = Object.fromEntries(
  Object.entries(materialRecipeModelIds).map(([car, model]) => [model, car]),
);
for (const [model, car] of Object.entries(recipeSourceIds)) {
  exteriorTuning[model] = {
    ...exteriorTuning[model],
    environmentOverrides: environmentRecipes[car],
    postProcessingOverrides: postProcessingRecipes[car],
  };
}
export function materialRecipeFor(modelId: string) {
  const recipe = recipeSourceIds[modelId];
  return recipe ? materialRecipes[recipe] : undefined;
}
