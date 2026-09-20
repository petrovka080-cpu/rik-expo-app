import type { MasterTechnologyBenchmark } from "./masterScopeInventory.shared";

export type MasterBenchmarkFixtureMapping = Readonly<{
  ordinal: number;
  masterTitleRu: string;
  fixtureId: string;
  historicalExpectedIdentityRu: string;
  currentSemanticSuccessorCatalogId?: string;
}>;

const CURRENT_SEMANTIC_SUCCESSOR_CATALOG_IDS = new Map<number, string>([
  [
    2,
    "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
  ],
  [
    3,
    "canonical-work:expanded:foundation_pile_field",
  ],
  [
    7,
    "canonical-work:expanded:steel_frame_building",
  ],
  [
    14,
    "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area",
  ],
  [
    15,
    "canonical-work:base:plumbing_interior_pnd_pipe_connect_standard",
  ],
  [
    16,
    "canonical-work:base:plumbing_interior_sewer_route_standard",
  ],
  [
    17,
    "canonical-work:base:paving_roads_landscape_interior_drainage_lay_standard",
  ],
  [
    21,
    "canonical-work:expanded:sprinkler_system",
  ],
  [
    24,
    "canonical-work:expanded:site_telecom_connection",
  ],
  [
    25,
    "canonical-work:expanded:fiber_optic_connection",
  ],
  [
    28,
    "canonical-work:expanded:boiler_installation",
  ],
  [
    29,
    "canonical-work:expanded:pipeline_welding",
  ],
  [
    30,
    "canonical-work:expanded:data_center_mep",
  ],
]);

export const MASTER_BENCHMARK_FIXTURE_MAPPING = Object.freeze([
  [1, "Бетонирование ленточного фундамента", "strip_foundation_concrete_pour", "Бетонирование ленточного фундамента"],
  [2, "Укладка и виброуплотнение бетона плиты", "foundation_slab_concrete_vibration", "Укладка и виброуплотнение бетона фундаментной плиты"],
  [3, "Буронабивная ж/б свая", "bored_reinforced_concrete_pile", "Устройство буронабивной железобетонной сваи"],
  [4, "Установка анкерной группы", "anchor_group_alignment", "Установка и выверка анкерной группы по шаблону"],
  [5, "Монтаж арматурного каркаса", "monolithic_rebar_cage", "Монтаж арматурного каркаса монолитной конструкции"],
  [6, "Кладка керамических блоков", "ceramic_block_external_wall", "Кладка наружной стены из керамических блоков"],
  [7, "Монтаж стальных колонн и балок", "steel_columns_beams_installation", "Монтаж и выверка стальных колонн и балок"],
  [8, "Кровельная ПВХ-мембрана", "pvc_roof_membrane_installation", "Монтаж кровельной ПВХ-мембраны"],
  [9, "Фасадный минераловатный утеплитель", "facade_mineral_wool_installation", "Монтаж минераловатного утеплителя фасада"],
  [10, "Механизированная штукатурка", "mechanized_wall_plaster", "Механизированное оштукатуривание стен"],
  [11, "Укладка керамогранита", "porcelain_floor_tile", "Укладка керамогранитной плитки на пол"],
  [12, "Демонтаж стяжки", "cement_sand_screed_demolition", "Демонтаж существующей цементно-песчаной стяжки"],
  [13, "Верхний слой асфальтобетона", "asphalt_upper_course", "Укладка и уплотнение верхнего слоя асфальтобетона"],
  [14, "Водоотводный лоток", "surface_drainage_channel", "Монтаж водоотводного лотка с решёткой"],
  [15, "Электромуфтовая сварка ПЭ Ø110", "pe110_electrofusion_joint", "Электромуфтовая сварка трубы ПЭ Ø110 мм"],
  [16, "Канализационная труба SN8", "gravity_sewer_pvc_sn8", "Укладка канализационной трубы ПВХ SN8"],
  [17, "Дренажная труба", "perforated_drain_pipe_filter", "Укладка перфорированной дренажной трубы в фильтрующей обсыпке"],
  [18, "Панельный радиатор", "steel_panel_radiator", "Монтаж стального панельного радиатора"],
  [19, "Оцинкованный воздуховод", "galvanized_steel_duct", "Монтаж воздуховода из оцинкованной стали"],
  [20, "Split-система", "split_system_blocks", "Монтаж внутреннего и наружного блока сплит-системы"],
  [21, "Спринклерный ороситель", "sprinkler_head_connection", "Монтаж спринклерного оросителя и присоединение к трубопроводу"],
  [22, "Силовой кабель", "vvgng_ls_power_cable", "Прокладка силового кабеля ВВГнг-LS"],
  [23, "LED-светильник", "led_luminaire_installation", "Монтаж светодиодного светильника"],
  [24, "Кабель Cat.6", "cat6_twisted_pair_cable", "Прокладка кабеля витая пара категории 6"],
  [25, "Сварка оптических волокон", "optical_fiber_splicing", "Сварка оптических волокон с измерением затухания"],
  [26, "Адресный дымовой извещатель", "addressable_smoke_detector", "Монтаж адресного дымового пожарного извещателя"],
  [27, "Монтаж и центровка насосного агрегата", "pump_unit_alignment_connection", "Монтаж, центровка и подключение насосного агрегата"],
  [28, "Монтаж и обвязка котла", "hot_water_boiler_piping", "Монтаж и обвязка водогрейного котла"],
  [29, "Сварка стыка технологического трубопровода", "industrial_steel_pipe_butt_weld", "Сварка стыка стального технологического трубопровода"],
  [30, "Монтаж и заземление шкафа 42U", "server_rack_42u_grounding", "Монтаж и заземление серверного шкафа 42U"],
].map(([ordinal, masterTitleRu, fixtureId, historicalExpectedIdentityRu]) => ({
  ordinal: Number(ordinal),
  masterTitleRu: String(masterTitleRu),
  fixtureId: String(fixtureId),
  historicalExpectedIdentityRu: String(historicalExpectedIdentityRu),
  currentSemanticSuccessorCatalogId: CURRENT_SEMANTIC_SUCCESSOR_CATALOG_IDS.get(Number(ordinal)),
}))) as readonly MasterBenchmarkFixtureMapping[];

export function assertMasterBenchmarkFixtureMapping(input: {
  benchmarks: readonly MasterTechnologyBenchmark[];
  mappings?: readonly MasterBenchmarkFixtureMapping[];
}): void {
  const mappings = input.mappings ?? MASTER_BENCHMARK_FIXTURE_MAPPING;
  if (mappings.length !== 30) {
    throw new Error(`MASTER_BENCHMARK_MAPPING:COUNT:${mappings.length}`);
  }
  if (new Set(mappings.map((mapping) => mapping.fixtureId)).size !== mappings.length) {
    throw new Error("MASTER_BENCHMARK_MAPPING:DUPLICATE_FIXTURE_ID");
  }
  if (input.benchmarks.length !== mappings.length) {
    throw new Error(`MASTER_BENCHMARK_MAPPING:MASTER_COUNT:${input.benchmarks.length}`);
  }
  for (const [index, mapping] of mappings.entries()) {
    const benchmark = input.benchmarks[index];
    if (mapping.ordinal !== index + 1 || benchmark?.ordinal !== mapping.ordinal) {
      throw new Error(`MASTER_BENCHMARK_MAPPING:ORDINAL:${index + 1}`);
    }
    if (benchmark.titleRu !== mapping.masterTitleRu) {
      throw new Error(`MASTER_BENCHMARK_MAPPING:TITLE:${mapping.ordinal}`);
    }
    if (!mapping.fixtureId || !mapping.historicalExpectedIdentityRu) {
      throw new Error(`MASTER_BENCHMARK_MAPPING:CONTENT:${mapping.ordinal}`);
    }
    if (mapping.currentSemanticSuccessorCatalogId
      && !mapping.currentSemanticSuccessorCatalogId.startsWith("canonical-work:")) {
      throw new Error(`MASTER_BENCHMARK_MAPPING:CURRENT_SUCCESSOR:${mapping.ordinal}`);
    }
  }
}
