import { assertCanonicalProfileRegistry } from "./foremanFieldRegistry";
import { normalizeWorkTypeCode } from "./workTypeCode";

export type FinalWorkTypeInputProfile = {
  workTypeCode: string;
  familyCode?: string;
  core: readonly string[];
  engineering?: readonly string[];
  derived?: readonly string[];
  hidden?: readonly string[];
  labels?: Record<string, string>;
  notes?: string;
};

const mk = (
  workTypeCode: string,
  familyCode: string,
  core: readonly string[],
  engineering?: readonly string[],
  derived?: readonly string[],
  hidden?: readonly string[],
  labels?: Record<string, string>,
  notes?: string,
): FinalWorkTypeInputProfile => ({
  workTypeCode,
  familyCode,
  core,
  engineering,
  derived,
  hidden,
  labels,
  notes,
});

const fromCodes = (
  codes: string[],
  profile: Omit<FinalWorkTypeInputProfile, "workTypeCode">,
): FinalWorkTypeInputProfile[] => codes.map((code) => ({ workTypeCode: code, ...profile }));

const F1_FACADE = {
  familyCode: "facade",
  core: ["area_m2"],
  engineering: ["height_m", "length_m", "perimeter_m", "opening_area_m2", "opening_count"],
  labels: {
    area_m2: "Площадь фасада",
    height_m: "Высота фасада",
    length_m: "Длина фасада",
    perimeter_m: "Периметр фасада",
    opening_area_m2: "Площадь проёмов",
    opening_count: "Количество проёмов",
  },
} as const;

const G1_GKL = {
  familyCode: "gkl",
  core: ["area_m2"],
  engineering: ["perimeter_m"],
  labels: {
    area_m2: "Площадь ГКЛ",
    perimeter_m: "Периметр примыканий",
  },
} as const;

const CL1_CEIL = {
  familyCode: "ceil",
  core: ["area_m2"],
  engineering: ["perimeter_m", "points_light"],
  labels: {
    area_m2: "Площадь потолка",
    perimeter_m: "Периметр примыканий",
    points_light: "Количество световых точек",
  },
} as const;

const _FN1_FINISH = {
  familyCode: "finish",
  core: ["area_m2"],
  engineering: ["height_m", "perimeter_m"],
} as const;

const _H1_HYDRO = {
  familyCode: "hydro",
  core: ["area_m2"],
  engineering: ["layers_count", "perimeter_m"],
  labels: {
    area_m2: "Площадь гидроизоляции",
  },
} as const;

const _I1_INSUL = {
  familyCode: "insul",
  core: ["area_m2"],
  engineering: ["thickness_mm", "layers_count"],
} as const;

const R1_ROOF = {
  familyCode: "roof",
  core: ["area_m2"],
  engineering: ["length_m", "width_m", "ridge_height_m", "overhang_m"],
  labels: {
    area_m2: "Площадь кровли",
    length_m: "Длина крыши",
    width_m: "Ширина крыши",
    ridge_height_m: "Высота конька",
    overhang_m: "Свес",
  },
} as const;

const profiles: FinalWorkTypeInputProfile[] = [
  // Demolition
  mk("WT-DEMO", "demo", ["area_m2"], ["thickness_mm"], ["volume_m3"], undefined, { area_m2: "Площадь демонтажа" }),
  mk("WT-DEM-GKL", "demo", ["area_m2"], undefined, undefined, undefined, { area_m2: "Площадь демонтажа ГКЛ" }),
  mk("WT-DEM-DOOR", "demo", ["count"], undefined, undefined, undefined, { count: "Количество дверей" }),
  mk("WT-DEM-ROOF", "demo", ["area_m2"], undefined, undefined, undefined, { area_m2: "Площадь демонтажа кровли" }),
  mk("WT-DEM-FLOOR", "demo", ["area_m2"], undefined, undefined, undefined, { area_m2: "Площадь демонтажа пола" }),
  mk("WT-DEM-WALL", "demo", ["area_m2"], undefined, undefined, undefined, { area_m2: "Площадь демонтажа стен" }),
  mk("WT-DEM-WINDOW", "demo", ["count"], undefined, undefined, undefined, { count: "Количество окон" }),
  mk("WT-DEM-TILE-FLOOR", "demo", ["area_m2"], undefined, undefined, undefined, { area_m2: "Площадь демонтажа плитки (пол)" }),
  mk("WT-DEM-TILE-WALL", "demo", ["area_m2"], undefined, undefined, undefined, { area_m2: "Площадь демонтажа плитки (стены)" }),
  mk("WT-DEM-CEIL", "demo", ["area_m2"], undefined, undefined, undefined, { area_m2: "Площадь демонтажа потолка" }),
  mk("WT-DEM-RADIATOR", "demo", ["count"], undefined, undefined, undefined, { count: "Количество радиаторов" }),
  mk("WT-DEM-OUTLET", "demo", ["count"], undefined, undefined, undefined, { count: "Количество розеток / выключателей" }),
  mk("WT-DEM-PLUMB-FIX", "demo", ["count"], undefined, undefined, undefined, { count: "Количество сантехприборов" }),
  mk("WT-DEM-LIGHT", "demo", ["count"], undefined, undefined, undefined, { count: "Количество светильников" }),
  mk("WT-DEM-SCREED", "demo", ["area_m2"], ["thickness_mm"], ["volume_m3"], undefined, { area_m2: "Площадь демонтажа стяжки" }),
  mk("WT-DEM-INSUL", "demo", ["area_m2"], undefined, undefined, undefined, { area_m2: "Площадь демонтажа утепления" }),
  mk("WT-DEM-PLASTER", "demo", ["area_m2"], ["thickness_mm"], ["volume_m3"], undefined, { area_m2: "Площадь демонтажа штукатурки" }),

  // Concrete
  mk("WT-CONC", "concrete", ["area_m2", "thickness_mm"], ["formwork_m2", "rebar_kg"], ["volume_m3"], ["pump_m3", "backfill_m3", "excavation_m3", "subconcrete_m3", "waterproof_m2"], {
    area_m2: "Площадь бетонирования",
    thickness_mm: "Толщина слоя",
  }),
  mk("IND_CONCRETE", "concrete", ["area_m2", "thickness_mm"], ["formwork_m2", "rebar_kg"], ["volume_m3"], ["film_m2", "mesh_m2", "pump_m3", "subbase_m3", "count"]),
  mk("WT-CONC-FLOOR", "floor", ["area_m2", "thickness_mm"], undefined, ["volume_m3"], undefined, { area_m2: "Площадь пола", thickness_mm: "Толщина слоя" }),
  mk("WT-CONCRETE-FLOOR", "floor", ["area_m2", "thickness_mm"], undefined, ["volume_m3"], undefined, { area_m2: "Площадь пола", thickness_mm: "Толщина слоя" }),
  mk("WT-CONCRETE-SLAB", "concrete", ["area_m2", "thickness_mm"], undefined, ["volume_m3"], undefined, { area_m2: "Площадь плиты", thickness_mm: "Толщина плиты" }),
  mk("WT-CONCRETE-SLAB-PRO", "concrete", ["area_m2", "thickness_mm"], undefined, ["volume_m3"]),
  mk("WT-CONCRETE-STRIP", "concrete", ["perimeter_m", "width_m", "height_m"], undefined, ["volume_m3"], undefined, {
    perimeter_m: "Длина ленты / контур",
    width_m: "Ширина ленты",
    height_m: "Высота / глубина ленты",
  }),
  mk("WT-CONCRETE-STRIP-PRO", "concrete", ["perimeter_m", "width_m", "height_m"], undefined, ["volume_m3"]),
  mk("WT-CONCRETE-MONO", "concrete", ["area_m2", "thickness_mm"], ["formwork_m2", "rebar_kg"], ["volume_m3"]),
  mk("WT-CONCRETE-BEAM", "concrete", ["area_m2", "thickness_mm"], ["length_m", "width_m", "height_m"], ["volume_m3"]),
  mk("WT-CONCRETE-COLUMN", "concrete", ["count"], ["width_m", "length_m", "height_m", "diameter_mm"], ["volume_m3"], undefined, { count: "Количество колонн" }),
  mk("WT-CONCRETE-FOOTING", "concrete", ["count"], ["width_m", "length_m", "height_m", "diameter_mm"], ["volume_m3"], undefined, { count: "Количество башмаков / тумб" }),
  mk("WT-CONCRETE-PILE", "concrete", ["count"], ["width_m", "length_m", "height_m", "diameter_mm"], ["volume_m3"], undefined, { count: "Количество свай / столбов" }),
  mk("WT-EARTHWORK-PRO", "concrete", ["volume_m3"], undefined, undefined, undefined, { volume_m3: "Объём грунта" }),
  mk("WT-FND-MKD", "concrete", ["volume_m3"], undefined, undefined, undefined, { volume_m3: "Объём бетона" }),
  mk("WT-HYDRO-FOUND-PRO", "hydro", ["area_m2"], ["layers_count"], undefined, undefined, { area_m2: "Площадь гидроизоляции фундамента" }),
  mk("WT-SUBBASE-PRO", "concrete", ["area_m2", "thickness_mm"], undefined, ["volume_m3"], undefined, { area_m2: "Площадь основания" }),

  // Facades
  ...fromCodes([
    "WT-FACADE-WET", "WT-FACADE-FC-H", "WT-FACADE-FC-RIVET", "WT-FACADE-FC-RIVET-10", "WT-FACADE-FC-RIVET-12", "WT-FACADE-FC-RIVET-8",
    "WT-FACADE-HPL-LSTK", "WT-FACADE-HPL", "WT-FACADE-ACP", "WT-FACADE-STONE", "WT-FACADE-PORC", "WT-FACADE-CLINKER-VF",
    "WT-FACADE-FCB", "WT-FACADE-WET-SYSTEM", "WT-FACADE-PORCELAIN-VENT", "WT-FACADE-CASSETTE-INSTALL", "WT-FACADE-HPL-INSTALL",
    "WT-FACADE-FC-H-10", "WT-FACADE-FC-H-12", "WT-FACADE-FC-H-8",
  ], F1_FACADE),

  // Masonry
  mk("WT-BLOCK", "masonry", ["length_m", "height_m"], ["thickness_mm"], ["area_m2"], undefined, {
    length_m: "Длина стены",
    height_m: "Высота стены",
    area_m2: "Площадь кладки",
  }),
  mk("WT-MASONRY-BLOCK", "masonry", ["length_m", "height_m"], ["thickness_mm"], ["area_m2"], undefined, { area_m2: "Площадь кладки блоков" }),
  mk("WT-MASONRY-BRICK", "masonry", ["length_m", "height_m"], ["thickness_mm"], ["area_m2"], undefined, { area_m2: "Площадь кирпичной кладки" }),
  mk("WT-MASONRY-BRICK-CLINKER", "masonry", ["length_m", "height_m"], ["thickness_mm"], ["area_m2"], undefined, { area_m2: "Площадь клинкерной кладки" }),

  // GKL
  ...fromCodes(["WT-GKL-CEIL-PRO", "WT-GKL-WALL", "WT-GKL-WALL-PRO", "WT-GKL"], G1_GKL),

  // Ceilings
  ...fromCodes([
    "WT-CEIL-CLIPIN", "WT-CEIL-CLIPIN-300x1200", "WT-CEIL-CLIPIN-600", "WT-CEIL-ARMSTRONG-600", "WT-CEIL-GKL-2L", "WT-CEIL-GKL-BOX",
    "WT-CEIL-GKL-1L", "WT-CEIL-GRILIATO-100", "WT-CEIL-GRILIATO-050", "WT-CEIL-GRILIATO-075", "WT-CEIL-GRILIATO-PYR-100",
    "WT-CEIL-GRILIATO-PYR-050", "WT-CEIL-GRILIATO-PYR-075", "WT-CEIL-GRID", "WT-CEIL-STRETCH", "WT-CEIL-RACK", "WT-CEIL-RACK-LENS",
  ], CL1_CEIL),

  // Exterior
  mk("WT-EXT-ASPHALT", "ext", ["area_m2"], ["thickness_mm", "layers_count"], undefined, undefined, {
    area_m2: "Площадь асфальтирования",
    thickness_mm: "Толщина слоя",
    layers_count: "Количество слоёв",
  }),
  mk("WT-EXT-ASPHALT-PRO", "ext", ["area_m2"], ["thickness_mm", "layers_count"], undefined, ["base_mix_mass_t", "finish_mix_mass_t"]),
  mk("WT-EXT-CURB", "ext", ["length_m"], ["thickness_mm"], undefined, undefined, { length_m: "Длина бордюра" }),
  mk("WT-EXT-DRAIN-CHANNEL", "ext", ["length_m"], ["thickness_mm"], undefined, undefined, { length_m: "Длина водоотводного лотка" }),
  mk("WT-ROAD-MARKING", "ext", ["length_m"], ["thickness_mm"], undefined, undefined, { length_m: "Длина разметки" }),
  mk("WT-EXT-OTMOSTKA", "ext", ["area_m2"], ["thickness_mm", "layers_count"], undefined, undefined, { area_m2: "Площадь отмостки" }),
  mk("WT-ROAD-MEDIAN", "ext", ["length_m"], ["thickness_mm"], undefined, undefined, { length_m: "Длина барьера" }),
  mk("WT-EXT-PAVING", "ext", ["area_m2"], ["thickness_mm", "layers_count"], undefined, undefined, { area_m2: "Площадь мощения" }),

  // Finish
  mk("COM_FITOUT", "finish", ["area_m2"], ["height_m", "perimeter_m"], undefined, undefined, { area_m2: "Площадь отделки" }),
  mk("WT-WALLPAPER", "finish", ["area_m2"], ["height_m", "perimeter_m"], undefined, undefined, { area_m2: "Площадь оклейки" }),
  mk("FINISH_PAINT", "finish", ["area_m2"], ["height_m", "perimeter_m"], undefined, undefined, { area_m2: "Площадь окраски" }),
  mk("WT-PAINT-INT", "finish", ["area_m2"], ["height_m", "perimeter_m"], undefined, undefined, { area_m2: "Площадь окраски" }),
  mk("WT-PAINT", "finish", ["area_m2"], ["height_m", "perimeter_m"], undefined, undefined, { area_m2: "Площадь окраски" }),
  mk("RES_FINISH_PAINT", "finish", ["area_m2"], ["height_m", "perimeter_m"], undefined, undefined, { area_m2: "Площадь окраски" }),
  mk("WT-PUTTY", "finish", ["area_m2"], ["height_m", "perimeter_m"], undefined, undefined, { area_m2: "Площадь шпаклёвки" }),
  mk("WT-PLASTER-INT", "finish", ["area_m2"], ["height_m", "perimeter_m"], undefined, undefined, { area_m2: "Площадь штукатурки" }),
  mk("WT-PLASTER", "finish", ["area_m2"], ["height_m", "perimeter_m"], undefined, undefined, { area_m2: "Площадь штукатурки" }),
  mk("WT-PLASTER-WALL-PRO", "finish", ["area_m2"], ["height_m", "perimeter_m"], undefined, undefined, { area_m2: "Площадь штукатурки" }),

  // Windows
  mk("WT-WINDOW-AL", "window", ["count"], ["width_m", "height_m"], ["area_m2"], undefined, { count: "Количество окон / витражей" }),
  mk("WT-WINDOW-PVC", "window", ["count"], ["width_m", "height_m"], ["area_m2"], undefined, { count: "Количество окон" }),
  mk("WT-WINDOW-REVEAL", "window", ["length_m"], ["width_m", "height_m"], undefined, undefined, { length_m: "Суммарная длина откосов / примыканий" }),

  // Floors
  mk("WT-FLOOR-LAMINATE", "floor", ["area_m2"], ["perimeter_m"]),
  mk("WT-LEVEL", "floor", ["area_m2", "thickness_mm"], undefined, ["volume_m3"]),
  mk("IND_FLOOR_EPOXY", "floor", ["area_m2"], ["thickness_mm"]),
  mk("WT-PLINTH", "floor", ["length_m"], undefined, undefined, undefined, { length_m: "Длина плинтуса" }),
  mk("WT-FLR-TOPPING", "floor", ["area_m2"], ["thickness_mm", "perimeter_m"], ["volume_m3"]),
  mk("WT-SCREED", "floor", ["area_m2"], ["thickness_mm", "perimeter_m"], ["volume_m3"]),
  mk("WT-FLR-HEAT-WATER", "floor", ["area_m2"], ["pipe_length_m"], undefined, undefined, { pipe_length_m: "Длина контура" }),
  mk("WT-FLR-HEAT-ELEC", "floor", ["area_m2"]),
  mk("WT-RF-PORCELAIN", "floor", ["area_m2"]),
  mk("WT-RF-HPL", "floor", ["area_m2"]),
  mk("WT-RF-CARPET", "floor", ["area_m2"]),
  mk("WT-RF-PVC", "floor", ["area_m2"]),

  // Tile
  mk("WT-TILE", "tile", ["area_m2"], ["perimeter_m"], undefined, undefined, { area_m2: "Площадь укладки плитки" }),

  // Hydro
  mk("WT-WP", "hydro", ["area_m2"], ["layers_count", "perimeter_m"], undefined, undefined, { area_m2: "Площадь гидроизоляции" }),
  mk("WT-HYDRO", "hydro", ["area_m2"], ["layers_count", "perimeter_m"], undefined, undefined, { area_m2: "Площадь гидроизоляции" }),

  // Insulation
  mk("WT-INSUL-CEIL-INT", "insul", ["area_m2"], ["thickness_mm", "layers_count"], undefined, undefined, { area_m2: "Площадь утепления потолка" }),
  mk("WT-INSUL-CEIL-PRO", "insul", ["area_m2"], ["thickness_mm", "layers_count"], undefined, undefined, { area_m2: "Площадь утепления потолка" }),
  mk("WT-INSUL-WALL-PRO", "insul", ["area_m2"], ["thickness_mm", "layers_count"], undefined, undefined, { area_m2: "Площадь утепления стен" }),
  mk("WT-INSUL-WALL-INT", "insul", ["area_m2"], ["thickness_mm", "layers_count"], undefined, undefined, { area_m2: "Площадь утепления / звукоизоляции стен" }),

  // Electric
  mk("RES_ELECTRICA", "elec", ["points_light", "points_outlet", "points_switch"], ["length_m"]),
  mk("ELECTRICA", "elec", ["points"], ["length_m"]),
  mk("COM_MEP_ELECTRICA", "elec", ["points"], ["length_m", "points_light", "points_outlet", "points_low"]),
  mk("WT-ELEC-SWITCH", "elec", ["points_switch"]),
  mk("WT-ELEC-CABLE", "elec", ["length_m"], undefined, undefined, undefined, { length_m: "Длина кабельной линии" }),
  mk("WT-ELEC-TRAY", "elec", ["length_m"], undefined, undefined, undefined, { length_m: "Длина лотка" }),
  mk("WT-ELEC-OUTLET", "elec", ["points_outlet"]),
  mk("WT-ELEC-LIGHT", "elec", ["points_light"]),
  mk("WT-ELEC", "elec", ["length_m"], undefined, undefined, undefined, { length_m: "Длина электротрассы" }),

  // Plumbing
  mk("COM_PLUMBING", "plumb", ["points"], ["pipe_length_m", "points_cw", "points_hw", "points_sw"]),
  mk("SANITARY", "plumb", ["points_sink", "points_wc", "points_shower"], ["points_wm", "pipe_length_m"]),
  mk("WT-PLMB-SHOWER", "plumb", ["points"]),
  mk("WT-PLMB-SINK", "plumb", ["points"]),
  mk("WT-PLMB-WM", "plumb", ["points"]),
  mk("WT-PLMB-TOILET", "plumb", ["points"]),
  mk("WT-PLMB", "plumb", ["points"], ["pipe_length_m"]),
  mk("WT-BATH", "plumb", ["points"], ["area_m2", "pipe_length_m"]),
  mk("IND_PIPING", "plumb", ["pipe_length_m"], ["diameter_mm"]),

  // Ventilation
  mk("WT-HVAC", "hvac", ["length_m"], ["diameter_mm"], undefined, undefined, { length_m: "Длина воздуховода / трассы" }),

  // Steel / metal
  mk("IND_STEEL", "metal", ["count"], ["width_m", "height_m", "weight_ton"]),
  mk("WT-STEEL-GATE-SLIDE", "metal", ["count"], ["width_m", "height_m", "length_m", "weight_ton"], undefined, undefined, {
    count: "Количество ворот",
    width_m: "Ширина полотна",
    height_m: "Высота полотна",
  }),
  mk("WT-STEEL-GATE-OVERHEAD", "metal", ["count"], ["width_m", "height_m", "length_m", "weight_ton"]),
  mk("WT-STEEL-GATE-SWING", "metal", ["count"], ["width_m", "height_m", "length_m", "weight_ton"]),
  mk("WT-STEEL-PRIME", "metal", ["area_m2"], undefined, undefined, undefined, { area_m2: "Площадь грунтования" }),
  mk("WT-STEEL-FENCE-PROF", "metal", ["length_m"], ["height_m", "weight_ton"], undefined, undefined, { length_m: "Длина ограждения" }),
  mk("WT-STEEL-FENCE-MESH", "metal", ["length_m"], ["height_m", "weight_ton"], undefined, undefined, { length_m: "Длина ограждения" }),
  mk("WT-STEEL-STAIR", "metal", ["count"], ["width_m", "height_m", "weight_ton"]),
  mk("WT-STEEL-RAILING", "metal", ["length_m"], ["height_m", "weight_ton"], undefined, undefined, { length_m: "Длина ограждения / перил" }),
  mk("WT-STEEL-TRUSS-LIGHT", "metal", ["count"], ["width_m", "height_m", "weight_ton"]),
  mk("WT-STEEL-TRUSS-HEAVY", "metal", ["count"], ["width_m", "height_m", "weight_ton"]),
  mk("WT-STEEL-PAINT", "metal", ["area_m2"], undefined, undefined, undefined, { area_m2: "Площадь окраски металлоконструкций" }),
  mk("WT-STEEL-CUT", "metal", ["length_m"]),
  mk("WT-STEEL-WELD-MIG-A4", "metal", ["length_m"], undefined, undefined, undefined, { length_m: "Длина сварного шва" }),
  mk("WT-STEEL-WELD-MMA", "metal", ["length_m"], undefined, undefined, undefined, { length_m: "Длина сварного шва" }),
  mk("WT-STEEL-DRILL", "metal", ["count"], undefined, undefined, undefined, { count: "Количество отверстий" }),

  // Roof
  ...fromCodes([
    "WT-ROOF-SHINGLE", "WT-ROOF-METAL", "WT-ROOF-MTL", "WT-ROOF-ROLLED", "WT-ROOF-SANDWICH", "WT-ROOF-SLATE",
    "WT-STEEL-CANOPY-HIP", "WT-STEEL-CANOPY-GABLE", "WT-STEEL-CANOPY-LEAN", "WT-ROOF-FRAME-SHINGLE", "WT-ROOF-FRAME-MTL",
    "WT-ROOF-FRAME-SLATE", "WT-ROOF-FRAME",
  ], R1_ROOF),
  mk("WT-PLASTER-FACADE", "facade", ["area_m2"], ["height_m", "length_m", "perimeter_m"], undefined, undefined, { area_m2: "Площадь штукатурки фасада" }),

  // Doors
  mk("WT-DOOR", "doors", ["count"], ["width_m", "height_m"], undefined, undefined, {
    count: "Количество дверей",
    width_m: "Ширина двери",
    height_m: "Высота двери",
  }),
  mk("WT-DOOR-SET", "doors", ["count"], ["width_m", "height_m"], undefined, undefined, {
    count: "Количество дверей",
    width_m: "Ширина двери",
    height_m: "Высота двери",
  }),

  // Logistics / Waste
  mk("WT-DELIVERY", "logistics", ["count"], ["distance_km", "weight_ton"], undefined, undefined, { count: "Количество рейсов / поставок" }),
  mk("WT-WASTE", "waste", ["volume_m3"], ["weight_ton"], undefined, undefined, { volume_m3: "Объём мусора" }),
  mk("WT-CLEANING-FINISH", "waste", ["area_m2"], undefined, undefined, undefined, { area_m2: "Площадь уборки" }),
];

export const FINAL_WORK_TYPE_INPUT_MATRIX: Record<string, FinalWorkTypeInputProfile> = Object.fromEntries(
  profiles.map((p) => [normalizeWorkTypeCode(p.workTypeCode), p]),
);
export const FINAL_WORK_TYPE_INPUT_PROFILES: FinalWorkTypeInputProfile[] =
  Object.values(FINAL_WORK_TYPE_INPUT_MATRIX).map((item) => ({
    ...item,
    core: Array.from(item.core),
    engineering: item.engineering ? Array.from(item.engineering) : undefined,
    derived: item.derived ? Array.from(item.derived) : undefined,
    hidden: item.hidden ? Array.from(item.hidden) : undefined,
    labels: item.labels ? { ...item.labels } : undefined,
  }));

export const FINAL_WORK_TYPE_INPUT_PROFILE_MAP: Record<string, FinalWorkTypeInputProfile> =
  Object.fromEntries(
    FINAL_WORK_TYPE_INPUT_PROFILES.map((item) => [
      normalizeWorkTypeCode(item.workTypeCode),
      item,
    ]),
  );

if (typeof __DEV__ !== "undefined" && __DEV__) {
  assertCanonicalProfileRegistry(FINAL_WORK_TYPE_INPUT_PROFILES);
}



