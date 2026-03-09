import { FINAL_WORK_TYPE_INPUT_MATRIX } from "./finalWorkTypeInputMatrix";

export type FieldUiPriority = "core" | "secondary" | "engineering" | "advanced" | "derived" | "hidden";

export type WorkTypeInputOverride = {
  workTypeCode: string;
  familyCode?: string;
  coreFields?: string[];
  secondaryFields?: string[];
  engineeringFields?: string[];
  advancedFields?: string[];
  derivedFields?: string[];
  hiddenFields?: string[];
  labelOverrides?: Record<string, string>;
  hintOverrides?: Record<string, string>;
  editableOverrides?: Record<string, boolean>;
  semanticRoleOverrides?: Record<string, string>;
  notes?: string;
};

export type CalcFieldUiMeta = {
  familyCode: string;
  semanticRole: string;
  uiPriority: FieldUiPriority;
  visibleInBaseUi: boolean;
  editable: boolean;
  hiddenInUi: boolean;
  displayLabelRu?: string;
  displayHintRu?: string;
};

type BasisKey = string;
type LabelMap = Record<string, string>;

const CORE = "core" as const;
const SECONDARY = "secondary" as const;
const ENGINEERING = "engineering" as const;
const ADVANCED = "advanced" as const;
const DERIVED = "derived" as const;
const HIDDEN = "hidden" as const;

const normalizeCode = (code: string) => String(code || "").trim().toUpperCase();

const toSet = (items?: string[]) => new Set((items ?? []).map((v) => String(v || "").trim()).filter(Boolean));

const NEUTRAL_BASIS_LABELS: LabelMap = {
  area_m2: "Площадь",
  length_m: "Длина",
  pipe_length_m: "Длина трубопровода",
  perimeter_m: "Периметр",
  height_m: "Высота / Толщина",
  volume_m3: "Объём",
  count: "Количество",
  points: "Количество точек",
};

const FAMILY_LABEL_OVERRIDES: Record<string, LabelMap> = {
  finish: {
    area_m2: "Площадь отделки, м²",
    perimeter_m: "Периметр примыканий, м",
  },
  hydro: {
    area_m2: "Площадь гидроизоляции, м²",
  },
  insul: {
    area_m2: "Площадь утепления, м²",
  },
  tile: {
    area_m2: "Площадь укладки плитки, м²",
  },
  ceil: {
    area_m2: "Площадь потолка, м²",
    perimeter_m: "Периметр примыканий, м",
  },
  facade: {
    area_m2: "Площадь фасада, м²",
    perimeter_m: "Периметр фасада, м",
    length_m: "Длина фасада, м",
    height_m: "Высота фасада, м",
  },
  roof: {
    area_m2: "Площадь кровли, м²",
    perimeter_m: "Периметр примыканий, м",
  },
  masonry: {
    area_m2: "Площадь кладки, м²",
    length_m: "Длина кладки, м",
    height_m: "Высота кладки, м",
    perimeter_m: "Периметр, м",
  },
  elec: {
    length_m: "Длина трассы, м",
    points: "Точки, шт",
  },
  plumb: {
    length_m: "Длина трассы, м",
    pipe_length_m: "Длина трубопровода, м",
    points: "Сантехнические точки, шт",
  },
  ext: {
    length_m: "Длина, м",
  },
  concrete: {
    area_m2: "Площадь, м²",
    height_m: "Толщина, м",
    volume_m3: "Объём, м³ (авто)",
  },
  floor: {
    area_m2: "Площадь пола, м²",
    height_m: "Толщина, м",
    volume_m3: "Объём, м³ (авто)",
  },
};

const WORK_TYPE_OVERRIDES: Record<string, WorkTypeInputOverride> = {
  "WT-CONC": {
    workTypeCode: "WT-CONC",
    familyCode: "concrete",
    coreFields: ["area_m2", "height_m"],
    secondaryFields: ["formwork_m2", "rebar_kg"],
    advancedFields: ["pump_m3", "excavation_m3", "backfill_m3", "subconcrete_m3", "waterproof_m2"],
    derivedFields: ["volume_m3"],
    labelOverrides: {
      area_m2: "Площадь бетонирования, м²",
      volume_m3: "Объём бетона, м³ (авто)",
    },
  },
  IND_CONCRETE: {
    workTypeCode: "ind_concrete",
    familyCode: "concrete",
    coreFields: ["area_m2", "height_m"],
    secondaryFields: ["formwork_m2", "rebar_kg"],
    advancedFields: ["film_m2", "mesh_m2", "pump_m3", "subbase_m3", "count"],
    derivedFields: ["volume_m3"],
    labelOverrides: {
      area_m2: "Площадь бетонирования, м²",
      volume_m3: "Объём бетона, м³ (авто)",
    },
  },
  "WT-CONCRETE-SLAB": {
    workTypeCode: "WT-CONCRETE-SLAB",
    familyCode: "concrete",
    coreFields: ["area_m2", "height_m"],
    secondaryFields: ["perimeter_m", "count"],
    derivedFields: ["volume_m3"],
    labelOverrides: {
      area_m2: "Площадь плиты, м²",
      height_m: "Толщина плиты, м",
      perimeter_m: "Периметр примыканий, м",
      volume_m3: "Объём бетона, м³ (авто)",
    },
  },
  "WT-CONCRETE-SLAB-PRO": {
    workTypeCode: "WT-CONCRETE-SLAB-PRO",
    familyCode: "concrete",
    coreFields: ["area_m2", "height_m"],
    derivedFields: ["volume_m3"],
  },
  "WT-CONC-FLOOR": {
    workTypeCode: "WT-CONC-FLOOR",
    familyCode: "floor",
    coreFields: ["area_m2", "height_m"],
    derivedFields: ["volume_m3"],
    labelOverrides: {
      area_m2: "Площадь пола, м²",
      height_m: "Толщина слоя, м",
      volume_m3: "Объём бетона, м³ (авто)",
    },
  },
  "WT-CONCRETE-STRIP": {
    workTypeCode: "WT-CONCRETE-STRIP",
    familyCode: "concrete",
    coreFields: ["perimeter_m", "length_m", "height_m"],
    secondaryFields: ["count"],
    derivedFields: ["volume_m3"],
    labelOverrides: {
      perimeter_m: "Длина ленты / контур, м",
      length_m: "Ширина ленты, м",
      height_m: "Высота / глубина ленты, м",
      volume_m3: "Объём бетона, м³ (авто)",
    },
  },
  "WT-CONCRETE-STRIP-PRO": {
    workTypeCode: "WT-CONCRETE-STRIP-PRO",
    familyCode: "concrete",
    coreFields: ["perimeter_m", "length_m", "height_m"],
    derivedFields: ["volume_m3"],
    labelOverrides: {
      perimeter_m: "Длина ленты / контур, м",
      length_m: "Ширина ленты, м",
      height_m: "Высота / глубина ленты, м",
    },
  },
  "WT-CONCRETE-MONO": {
    workTypeCode: "WT-CONCRETE-MONO",
    familyCode: "concrete",
    coreFields: ["area_m2", "height_m"],
    derivedFields: ["volume_m3"],
  },
  "WT-CONCRETE-BEAM": {
    workTypeCode: "WT-CONCRETE-BEAM",
    familyCode: "concrete",
    coreFields: ["area_m2", "height_m"],
    secondaryFields: ["count"],
    derivedFields: ["volume_m3"],
    labelOverrides: {
      area_m2: "Площадь бетонирования, м²",
    },
  },
  "WT-CONCRETE-COLUMN": {
    workTypeCode: "WT-CONCRETE-COLUMN",
    familyCode: "concrete",
    coreFields: ["count"],
    derivedFields: ["volume_m3"],
  },
  "WT-CONCRETE-FOOTING": {
    workTypeCode: "WT-CONCRETE-FOOTING",
    familyCode: "concrete",
    coreFields: ["count"],
    derivedFields: ["volume_m3"],
  },
  "WT-CONCRETE-PILE": {
    workTypeCode: "WT-CONCRETE-PILE",
    familyCode: "concrete",
    coreFields: ["count"],
    derivedFields: ["volume_m3"],
  },
  "WT-BLOCK": {
    workTypeCode: "WT-BLOCK",
    familyCode: "masonry",
    coreFields: ["area_m2"],
    secondaryFields: ["height_m", "length_m"],
    advancedFields: ["count", "points", "perimeter_m"],
    labelOverrides: {
      area_m2: "Площадь кладки, м²",
      height_m: "Высота стены, м",
      length_m: "Длина стены, м",
      perimeter_m: "Контур / суммарная длина, м",
    },
  },
  "WT-MASONRY-BRICK": {
    workTypeCode: "WT-MASONRY-BRICK",
    familyCode: "masonry",
    coreFields: ["area_m2"],
    secondaryFields: ["height_m", "length_m"],
    advancedFields: ["perimeter_m", "points"],
    labelOverrides: {
      area_m2: "Площадь кладки, м²",
      height_m: "Высота стены, м",
      length_m: "Длина стены, м",
    },
  },
  "WT-MASONRY-BRICK-CLINKER": {
    workTypeCode: "WT-MASONRY-BRICK-CLINKER",
    familyCode: "masonry",
    coreFields: ["area_m2"],
    secondaryFields: ["height_m", "length_m"],
    advancedFields: ["perimeter_m", "points"],
    labelOverrides: {
      area_m2: "Площадь кладки, м²",
      height_m: "Высота стены, м",
      length_m: "Длина стены, м",
    },
  },
  "WT-ELEC-CABLE": {
    workTypeCode: "WT-ELEC-CABLE",
    familyCode: "elec",
    coreFields: ["length_m"],
    labelOverrides: {
      length_m: "Длина кабельной линии, м",
    },
  },
  "WT-ELEC-TRAY": {
    workTypeCode: "WT-ELEC-TRAY",
    familyCode: "elec",
    coreFields: ["length_m"],
    secondaryFields: ["count"],
    labelOverrides: {
      length_m: "Длина лотка / трассы, м",
      count: "Количество элементов, шт",
    },
  },
  RES_ELECTRICA: {
    workTypeCode: "res_electrica",
    familyCode: "elec",
    coreFields: ["points_light", "points_outlet", "points_switch"],
    secondaryFields: ["length_m", "count"],
    labelOverrides: {
      points_light: "Точки света, шт",
      points_outlet: "Розетки, шт",
      points_switch: "Выключатели, шт",
      length_m: "Длина трассы, м",
    },
  },
  "WT-HYDRO": {
    workTypeCode: "WT-HYDRO",
    familyCode: "hydro",
    coreFields: ["area_m2"],
    secondaryFields: ["count"],
    labelOverrides: {
      area_m2: "Площадь гидроизоляции, м²",
    },
  },
  "WT-WP": {
    workTypeCode: "WT-WP",
    familyCode: "hydro",
    coreFields: ["area_m2"],
    labelOverrides: {
      area_m2: "Площадь гидроизоляции, м²",
    },
  },
  "WT-PLMB": {
    workTypeCode: "WT-PLMB",
    familyCode: "plumb",
    coreFields: ["length_m", "count"],
    advancedFields: ["area_m2"],
    labelOverrides: {
      length_m: "Длина трубопровода, м",
      count: "Количество приборов / точек, шт",
    },
  },
  "WT-BATH": {
    workTypeCode: "WT-BATH",
    familyCode: "plumb",
    coreFields: ["points", "area_m2"],
    secondaryFields: ["perimeter_m"],
    advancedFields: ["count"],
    labelOverrides: {
      points: "Сантехнические точки, шт",
      area_m2: "Площадь санузла, м²",
      perimeter_m: "Периметр примыканий, м",
    },
  },
  SANITARY: {
    workTypeCode: "sanitary",
    familyCode: "plumb",
    coreFields: ["points_shower", "points_sink", "points_wc", "points_wm"],
    secondaryFields: ["length_m"],
    advancedFields: ["count"],
    labelOverrides: {
      points_shower: "Душевые точки, шт",
      points_sink: "Раковины, шт",
      points_wc: "Унитазы, шт",
      points_wm: "Стиральные машины, шт",
      length_m: "Длина трубопровода, м",
    },
  },
  "WT-EXT-CURB": {
    workTypeCode: "WT-EXT-CURB",
    familyCode: "ext",
    coreFields: ["length_m"],
    labelOverrides: {
      length_m: "Длина бордюра, м",
    },
  },
  "WT-EXT-DRAIN-CHANNEL": {
    workTypeCode: "WT-EXT-DRAIN-CHANNEL",
    familyCode: "ext",
    coreFields: ["length_m"],
    labelOverrides: {
      length_m: "Длина водоотводного лотка, м",
    },
  },
  "WT-ROAD-MARKING": {
    workTypeCode: "WT-ROAD-MARKING",
    familyCode: "ext",
    coreFields: ["length_m"],
    labelOverrides: {
      length_m: "Длина разметки, м",
    },
  },
  "WT-HVAC": {
    workTypeCode: "WT-HVAC",
    familyCode: "other",
    coreFields: ["length_m"],
    secondaryFields: ["area_m2"],
    labelOverrides: {
      length_m: "Длина воздуховода / трассы, м",
      area_m2: "Площадь обслуживания, м²",
    },
  },
};

const FINAL_WORK_TYPE_OVERRIDES: Record<string, WorkTypeInputOverride> = Object.fromEntries(
  Object.entries(FINAL_WORK_TYPE_INPUT_MATRIX).map(([code, profile]) => [
    code,
    {
      workTypeCode: profile.workTypeCode,
      familyCode: profile.familyCode,
      coreFields: Array.from(profile.core),
      engineeringFields: profile.engineering ? Array.from(profile.engineering) : undefined,
      derivedFields: profile.derived ? Array.from(profile.derived) : undefined,
      hiddenFields: profile.hidden ? Array.from(profile.hidden) : undefined,
      labelOverrides: profile.labels,
      notes: profile.notes,
    } satisfies WorkTypeInputOverride,
  ]),
);

const getWorkTypeOverride = (workTypeCode: string) =>
  FINAL_WORK_TYPE_OVERRIDES[normalizeCode(workTypeCode)] ??
  WORK_TYPE_OVERRIDES[normalizeCode(workTypeCode)];

const hasKey = (keys: Set<string>, key: string) => keys.has(key);

const inferFamilyByCode = (workTypeCode: string): string => {
  const c = normalizeCode(workTypeCode);
  if (c.includes("FACADE")) return "facade";
  if (c.includes("CONC") || c.includes("CONCRETE") || c.includes("FND")) return "concrete";
  if (c.includes("MASONRY") || c.includes("BLOCK") || c.includes("BRICK")) return "masonry";
  if (c.includes("ELEC")) return "elec";
  if (c.includes("PLMB") || c.includes("PLUMB") || c.includes("BATH") || c.includes("PIP") || c.includes("SANITARY")) return "plumb";
  if (c.includes("CEIL")) return "ceil";
  if (c.includes("PAINT") || c.includes("PLASTER") || c.includes("WALLPAPER") || c.includes("PUTTY")) return "finish";
  if (c.includes("GKL") || c.includes("GYPSUM") || c.includes("DRYWALL")) return "gkl";
  if (c.includes("TILE")) return "tile";
  if (c.includes("HYDRO") || c.includes("WP")) return "hydro";
  if (c.includes("INSUL")) return "insul";
  if (c.includes("FLOOR") || c.includes("SCREED") || c.includes("FLR")) return "floor";
  if (c.includes("HVAC") || c.includes("VENT")) return "hvac";
  if (c.includes("METAL") || c.includes("STEEL")) return "metal";
  if (c.includes("ROOF")) return "roof";
  if (c.includes("WINDOW") || c.startsWith("WT-WIN")) return "window";
  if (c.includes("DOOR") || c.startsWith("WT-DOOR")) return "doors";
  if (c.includes("LOGISTIC") || c.includes("DELIVERY")) return "logistics";
  if (c.includes("TRASH") || c.includes("WASTE") || c.includes("MUSOR")) return "trash";
  if (c.includes("DEM")) return "demo";
  if (c.includes("EXT") || c.includes("ROAD") || c.includes("CURB")) return "ext";
  return "other";
};

const resolveFamily = (workTypeCode: string, familyCode?: string | null) => {
  const overrideFamily = getWorkTypeOverride(workTypeCode)?.familyCode;
  if (overrideFamily) return overrideFamily.toLowerCase();
  const fam = String(familyCode || "").trim().toLowerCase();
  if (fam) return fam;
  return inferFamilyByCode(workTypeCode).toLowerCase();
};

const shouldDeriveConcreteVolume = (workTypeCode: string, allKeys: Set<string>) => {
  if (!hasKey(allKeys, "volume_m3")) return false;

  const hasAreaThickness = hasKey(allKeys, "area_m2") && hasKey(allKeys, "height_m");
  const hasStripGeometry = hasKey(allKeys, "perimeter_m") && hasKey(allKeys, "length_m") && hasKey(allKeys, "height_m");
  const code = normalizeCode(workTypeCode);
  const concreteLike =
    code.includes("CONC") ||
    code.includes("CONCRETE") ||
    code.includes("FND") ||
    code.includes("SLAB") ||
    code.includes("STRIP") ||
    code.includes("PILE") ||
    code.includes("FOOTING") ||
    code.includes("COLUMN");

  return concreteLike && (hasAreaThickness || hasStripGeometry);
};

const resolveConcretePriority = (
  basisKey: BasisKey,
  workTypeCode: string,
  allKeys: Set<string>,
): FieldUiPriority => {
  const code = normalizeCode(workTypeCode);

  if (basisKey === "volume_m3" && shouldDeriveConcreteVolume(workTypeCode, allKeys)) return DERIVED;

  if (code === "WT-CONC" || code === "IND_CONCRETE") {
    if (basisKey === "area_m2" || basisKey === "height_m") return CORE;
    if (basisKey === "formwork_m2" || basisKey === "rebar_kg") return SECONDARY;
    if (basisKey === "volume_m3") return DERIVED;
    return ADVANCED;
  }

  if (code.includes("STRIP")) {
    if (basisKey === "perimeter_m" || basisKey === "length_m" || basisKey === "height_m") return CORE;
    if (basisKey === "count") return SECONDARY;
    if (basisKey === "volume_m3") return DERIVED;
    return ADVANCED;
  }

  if (code.includes("SLAB") || code.includes("FLOOR")) {
    if (basisKey === "area_m2" || basisKey === "height_m") return CORE;
    if (basisKey === "perimeter_m" || basisKey === "count") return SECONDARY;
    if (basisKey === "volume_m3") return DERIVED;
    return ADVANCED;
  }

  if (code.includes("PILE") || code.includes("FOOTING") || code.includes("COLUMN")) {
    if (basisKey === "count") return CORE;
    if (basisKey === "height_m" || basisKey === "length_m" || basisKey === "width_m") return ENGINEERING;
    if (basisKey === "volume_m3") return hasKey(allKeys, "height_m") ? DERIVED : SECONDARY;
    return ADVANCED;
  }

  if (basisKey === "volume_m3" && shouldDeriveConcreteVolume(workTypeCode, allKeys)) return DERIVED;
  if (basisKey === "area_m2" || basisKey === "height_m") return CORE;
  if (basisKey === "length_m" || basisKey === "width_m" || basisKey === "depth_m") return ENGINEERING;
  if (basisKey === "formwork_m2" || basisKey === "rebar_kg") return SECONDARY;
  if (basisKey === "count") return SECONDARY;
  return ADVANCED;
};

const resolvePriorityByFamily = (
  basisKey: BasisKey,
  familyCode: string,
  workTypeCode: string,
  allKeys: Set<string>,
): FieldUiPriority => {
  const family = familyCode.toLowerCase();
  const code = normalizeCode(workTypeCode);

  if (family === "concrete") return resolveConcretePriority(basisKey, workTypeCode, allKeys);

  if (family === "finish") {
    if (basisKey === "area_m2") return CORE;
    if (basisKey === "perimeter_m") return SECONDARY;
    if (basisKey === "height_m") return ENGINEERING;
    return ADVANCED;
  }

  if (family === "hydro" || family === "insul") {
    if (basisKey === "area_m2") return CORE;
    if (basisKey === "layers_count" || basisKey === "thickness_mm") return SECONDARY;
    if (basisKey === "perimeter_m" || basisKey === "count") return ENGINEERING;
    return ADVANCED;
  }

  if (family === "tile") {
    if (basisKey === "area_m2") return CORE;
    if (basisKey === "tile_size_mm" || basisKey === "joint_mm") return SECONDARY;
    return ADVANCED;
  }

  if (family === "gkl") {
    if (basisKey === "area_m2") return CORE;
    if (basisKey === "perimeter_m" || basisKey === "levels_count") return SECONDARY;
    return ADVANCED;
  }

  if (family === "elec") {
    if (code === "COM_MEP_ELECTRICA") {
      if (basisKey === "points") return CORE;
      if (basisKey === "points_light" || basisKey === "points_socket" || basisKey === "points_low" || basisKey === "points_panel") {
        return SECONDARY;
      }
      return ADVANCED;
    }
    if (code === "RES_ELECTRICA") {
      if (basisKey === "points_light" || basisKey === "points_outlet" || basisKey === "points_switch") return CORE;
      if (basisKey === "length_m" || basisKey === "count") return SECONDARY;
      return ADVANCED;
    }
    if (code === "WT-ELEC-LIGHT" && basisKey === "points_light") return CORE;
    if (code === "WT-ELEC-OUTLET" && basisKey === "points_outlet") return CORE;
    if (code === "WT-ELEC-SWITCH" && basisKey === "points_switch") return CORE;
    if (basisKey === "length_m") return CORE;
    if (basisKey === "cable_section_mm") return SECONDARY;
    if (basisKey === "count") return SECONDARY;
    if (basisKey.startsWith("points_") || basisKey === "points") return SECONDARY;
    return ADVANCED;
  }

  if (family === "plumb") {
    if (code === "COM_PLUMBING") {
      if (basisKey === "points") return CORE;
      if (basisKey === "points_cw" || basisKey === "points_hw" || basisKey === "points_sw") return SECONDARY;
      return ADVANCED;
    }
    if (code === "SANITARY") {
      if (basisKey === "points_shower" || basisKey === "points_sink" || basisKey === "points_wc" || basisKey === "points_wm") return CORE;
      if (basisKey === "length_m") return SECONDARY;
      return ADVANCED;
    }
    if (code === "IND_PIPING") {
      if (basisKey === "pipe_length_m" || basisKey === "length_m") return CORE;
      if (basisKey === "count") return SECONDARY;
      return ADVANCED;
    }
    if (basisKey === "points") return CORE;
    if (basisKey === "pipe_length_m" || basisKey === "length_m") return SECONDARY;
    if (basisKey === "diameter_mm") return ENGINEERING;
    if (basisKey === "count") return SECONDARY;
    return ADVANCED;
  }

  if (family === "ceil") {
    if (basisKey === "area_m2") return CORE;
    if (basisKey === "perimeter_m") return SECONDARY;
    if (basisKey.startsWith("points") || basisKey === "points") return SECONDARY;
    return ADVANCED;
  }

  if (family === "facade") {
    if (basisKey === "area_m2") return CORE;
    if (basisKey === "perimeter_m" || basisKey === "height_m" || basisKey === "length_m") return ENGINEERING;
    if (basisKey === "area_wall_m2" || basisKey === "pipe_length_m" || basisKey === "opening_area_m2" || basisKey === "opening_count") {
      return SECONDARY;
    }
    return ADVANCED;
  }

  if (family === "masonry") {
    if (basisKey === "length_m" || basisKey === "height_m") return CORE;
    if (basisKey === "area_m2") return DERIVED;
    if (basisKey === "perimeter_m") return SECONDARY;
    if (basisKey === "block_size_mm" || basisKey === "joint_thickness_mm") return ENGINEERING;
    return ADVANCED;
  }

  if (family === "demo") {
    if (basisKey === "area_m2" || basisKey === "count" || basisKey === "length_m") return CORE;
    if (basisKey === "height_m" || basisKey === "thickness_mm") return SECONDARY;
    if (basisKey === "volume_m3" && hasKey(allKeys, "area_m2") && hasKey(allKeys, "thickness_mm")) return DERIVED;
    return ADVANCED;
  }

  if (family === "floor") {
    if (basisKey === "volume_m3" && hasKey(allKeys, "area_m2") && hasKey(allKeys, "height_m")) return DERIVED;
    if (basisKey === "area_m2") return CORE;
    if (basisKey === "height_m" || basisKey === "thickness_mm") return SECONDARY;
    if (basisKey === "pipe_length_m") return ENGINEERING;
    if (basisKey === "perimeter_m" || basisKey === "count" || basisKey === "volume_m3") return SECONDARY;
    return ADVANCED;
  }

  if (family === "ext" || family === "outside") {
    if (basisKey === "length_m" || basisKey === "area_m2") return CORE;
    if (basisKey === "thickness_cm" || basisKey === "layers_count") return SECONDARY;
    return ADVANCED;
  }

  if (family === "roof") {
    if (basisKey === "area_m2") return CORE;
    if (basisKey === "length_m" || basisKey === "width_m" || basisKey === "ridge_height_m" || basisKey === "overhang_m") return ENGINEERING;
    if (basisKey === "roof_area_m2") return DERIVED;
    if (basisKey === "perimeter_m") return SECONDARY;
    return ADVANCED;
  }

  if (family === "doors" || family === "door" || family === "window" || family === "windows") {
    if (basisKey === "count") return CORE;
    if (basisKey === "width_m" || basisKey === "height_m") return ENGINEERING;
    if (basisKey === "area_m2") return DERIVED;
    return ADVANCED;
  }

  if (family === "logistics") {
    if (basisKey === "count") return CORE;
    if (basisKey === "distance_km" || basisKey === "weight_ton") return SECONDARY;
    return ADVANCED;
  }

  if (family === "trash" || family === "waste") {
    if (basisKey === "volume_m3") return CORE;
    return ADVANCED;
  }

  if (family === "metal" || family === "metall" || family === "metals") {
    if (basisKey === "count" || basisKey === "length_m") return CORE;
    if (basisKey === "weight_ton") return SECONDARY;
    if (basisKey === "height_m" || basisKey === "width_m") return ENGINEERING;
    if (basisKey === "area_m2") return SECONDARY;
    return ADVANCED;
  }

  if (family === "hvac" || family === "vent" || family === "ventilation") {
    if (basisKey === "length_m") return CORE;
    if (basisKey === "diameter_mm") return SECONDARY;
    if (basisKey === "area_m2") return ENGINEERING;
    return ADVANCED;
  }

  return CORE;
};

const resolveSemanticRole = (basisKey: BasisKey): string => {
  if (basisKey === "area_m2") return "area";
  if (basisKey === "perimeter_m") return "perimeter";
  if (basisKey === "length_m") return "length";
  if (basisKey === "width_m") return "width";
  if (basisKey === "pipe_length_m") return "pipe_length";
  if (basisKey === "height_m") return "height_or_thickness";
  if (basisKey === "thickness_mm") return "thickness";
  if (basisKey === "diameter_mm") return "diameter";
  if (basisKey === "layers_count") return "layers";
  if (basisKey === "overhang_m") return "overhang";
  if (basisKey === "ridge_height_m") return "ridge_height";
  if (basisKey === "volume_m3") return "volume";
  if (basisKey === "count") return "count";
  if (basisKey === "points" || basisKey.startsWith("points_")) return "points";
  return "aux";
};

const resolveDisplayLabel = (args: {
  workTypeCode: string;
  familyCode: string;
  basisKey: BasisKey;
  originalLabel: string;
  override?: WorkTypeInputOverride;
}) => {
  const familyCode = String(args.familyCode || "").toLowerCase();

  const workTypeLabels = args.override?.labelOverrides ?? {};
  const familyLabels = FAMILY_LABEL_OVERRIDES[familyCode] ?? {};

  return (
    workTypeLabels[args.basisKey] ??
    familyLabels[args.basisKey] ??
    NEUTRAL_BASIS_LABELS[args.basisKey] ??
    args.originalLabel
  );
};

const resolveDisplayHint = (args: {
  basisKey: BasisKey;
  originalHint?: string | null;
  override?: WorkTypeInputOverride;
}) => {
  const hints = args.override?.hintOverrides ?? {};
  const hint = hints[args.basisKey];
  if (typeof hint === "string" && hint.trim()) return hint;
  return args.originalHint ?? undefined;
};

const resolvePriorityByOverride = (basisKey: BasisKey, override?: WorkTypeInputOverride): FieldUiPriority | null => {
  if (!override) return null;

  const core = toSet(override.coreFields);
  const secondary = toSet(override.secondaryFields);
  const engineering = toSet(override.engineeringFields);
  const advanced = toSet(override.advancedFields);
  const derived = toSet(override.derivedFields);
  const hidden = toSet(override.hiddenFields);

  if (hidden.has(basisKey)) return HIDDEN;
  if (core.has(basisKey)) return CORE;
  if (engineering.has(basisKey)) return ENGINEERING;
  if (secondary.has(basisKey)) return SECONDARY;
  if (derived.has(basisKey)) return DERIVED;
  if (advanced.has(basisKey)) return ADVANCED;
  return null;
};

export const enrichFieldUiMeta = (params: {
  workTypeCode: string;
  familyCode?: string | null;
  basisKey: BasisKey;
  originalLabel: string;
  originalHint?: string | null;
  allBasisKeys: BasisKey[];
}): CalcFieldUiMeta => {
  const code = normalizeCode(params.workTypeCode);
  const override = getWorkTypeOverride(code);

  const familyCode = resolveFamily(code, params.familyCode);
  const allKeys = new Set((params.allBasisKeys || []).map((k) => String(k)));

  const hiddenSet = toSet(override?.hiddenFields);
  const hiddenInUi = hiddenSet.has(params.basisKey);

  const overridePriority = resolvePriorityByOverride(params.basisKey, override);
  const familyPriority = resolvePriorityByFamily(params.basisKey, familyCode, code, allKeys);
  const uiPriority = overridePriority ?? familyPriority;

  const editableOverride = override?.editableOverrides?.[params.basisKey];
  const editable = typeof editableOverride === "boolean" ? editableOverride : uiPriority !== DERIVED && uiPriority !== HIDDEN;

  const semanticRole =
    override?.semanticRoleOverrides?.[params.basisKey] ??
    resolveSemanticRole(params.basisKey);

  return {
    familyCode,
    semanticRole,
    uiPriority,
    visibleInBaseUi: !hiddenInUi && uiPriority === CORE,
    editable,
    hiddenInUi,
    displayLabelRu: resolveDisplayLabel({
      workTypeCode: code,
      familyCode,
      basisKey: params.basisKey,
      originalLabel: params.originalLabel,
      override,
    }),
    displayHintRu: resolveDisplayHint({
      basisKey: params.basisKey,
      originalHint: params.originalHint,
      override,
    }),
  };
};
