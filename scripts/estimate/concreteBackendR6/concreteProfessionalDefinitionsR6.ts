import {
  compileFormulaGraph,
  evaluateFormulaGraph,
  type CompiledFormulaGraph,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  evaluateInclusionGraph,
  type InclusionGraphAst,
} from "../../../src/lib/estimate/backendPlatform/inclusionGraph";

export const CONCRETE_R6_CONTRACT = "one-canonical-estimate-r6-concrete-professional.v1" as const;

export type ConcreteR6ParameterVisibility = "USER_INPUT" | "INTERNAL_ONLY";
export type ConcreteR6ResourceGroup = "material" | "construction_work" | "machine_equipment" | "delivery";
export type ConcreteR6Value = string | number | boolean;

export type ConcreteR6NormativeBinding = {
  sourceKey: "krer_06_2015" | "sn_kr_52_02_2024" | "project_documentation";
  documentCode: string;
  officialUrl: string;
  artifactSha256: string | null;
  rateCode: string | null;
  pdfPage: number | null;
  locator: string;
};

export type ConcreteR6Parameter = {
  parameterId: string;
  titleRu: string;
  valueType: "decimal" | "integer" | "boolean" | "enum";
  unitId: string | null;
  visibilityRole: ConcreteR6ParameterVisibility;
  defaultValue: ConcreteR6Value | null;
  required: boolean;
  requiredWhen?: InclusionGraphAst;
  choices?: readonly string[];
  minimum?: number;
  guideRu: string;
};

export type ConcreteR6Formula = CompiledFormulaGraph & {
  formulaId: string;
  outputUnitId: string;
};

export type ConcreteR6Resource = {
  rowId: string;
  group: ConcreteR6ResourceGroup;
  titleRu: string;
  rowType: ConcreteR6ResourceGroup;
  unitId: string;
  formulaId: string;
  inclusionAst: InclusionGraphAst;
  procurementEligible: boolean;
  normativeBinding: ConcreteR6NormativeBinding;
};

export type ConcreteR6Definition = {
  catalogId: string;
  titleRu: string;
  aliasesRu: readonly string[];
  geometryKind: ConcreteR6GeometryKind;
  includedRu: readonly string[];
  excludedRu: readonly string[];
  parameters: readonly ConcreteR6Parameter[];
  formulas: readonly ConcreteR6Formula[];
  resources: readonly ConcreteR6Resource[];
  normativeBinding: ConcreteR6NormativeBinding;
};

export type ConcreteR6CompiledRow = ConcreteR6Resource & { quantity: string };

export type ConcreteR6CompiledEstimate = {
  catalogId: string;
  titleRu: string;
  values: Readonly<Record<string, ConcreteR6Value>>;
  rows: readonly ConcreteR6CompiledRow[];
  groups: Readonly<Record<ConcreteR6ResourceGroup, readonly ConcreteR6CompiledRow[]>>;
};

type ConcreteR6GeometryKind =
  | "area_thickness"
  | "linear_prism"
  | "counted_prism"
  | "wall"
  | "column"
  | "beam"
  | "stairs"
  | "pit"
  | "volume"
  | "repair";

type DefinitionSeed = {
  key: string;
  titleRu: string;
  aliasesRu: readonly string[];
  geometryKind: ConcreteR6GeometryKind;
  rateCode: string;
  pdfPage: number;
  reinforced: boolean;
  formwork: boolean;
  concreteMaterial: boolean;
  joints?: boolean;
  waterproofing?: boolean;
};

const KRER6_SHA256 = "45c065fb0e35586948fdb06cd21fe331358e2c454c25a4dc83d4a686bf9f3e4b";
const KRER6_URL = "https://minstroy.gov.kg/ru/kyzmat/422/show";
const SN52_URL = "https://cbd.minjust.gov.kg/52-1632/edition/12062/ru";

const literalTrue: InclusionGraphAst = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: ConcreteR6Value): InclusionGraphAst => ({
  kind: "equals",
  parameterId,
  value,
});
function projectBinding(locator: string): ConcreteR6NormativeBinding {
  return {
    sourceKey: "project_documentation",
    documentCode: "Рабочая документация",
    officialUrl: "",
    artifactSha256: null,
    rateCode: null,
    pdfPage: null,
    locator,
  };
}

function krerBinding(rateCode: string, pdfPage: number): ConcreteR6NormativeBinding {
  return {
    sourceKey: "krer_06_2015",
    documentCode: "КРЕР 81-02-06-2015",
    officialUrl: KRER6_URL,
    artifactSha256: KRER6_SHA256,
    rateCode,
    pdfPage,
    locator: `таблица ${rateCode}, PDF стр. ${pdfPage}`,
  };
}

const SN52_BINDING: ConcreteR6NormativeBinding = Object.freeze({
  sourceKey: "sn_kr_52_02_2024",
  documentCode: "СН КР 52-02:2024",
  officialUrl: SN52_URL,
  artifactSha256: null,
  rateCode: null,
  pdfPage: null,
  locator: "бетонные и железобетонные конструкции",
});

const SEEDS: readonly DefinitionSeed[] = Object.freeze([
  { key: "concrete_preparation", titleRu: "Бетонная подготовка", aliasesRu: ["подбетонка", "бетонная подготовка под фундамент"], geometryKind: "area_thickness", rateCode: "06-01-001", pdfPage: 18, reinforced: false, formwork: false, concreteMaterial: true },
  { key: "strip_foundation", titleRu: "Монолитный ленточный фундамент", aliasesRu: ["ленточный фундамент", "бетонирование ленты фундамента"], geometryKind: "linear_prism", rateCode: "06-01-001", pdfPage: 18, reinforced: true, formwork: true, concreteMaterial: true, waterproofing: true },
  { key: "isolated_foundation", titleRu: "Монолитный отдельный фундамент", aliasesRu: ["столбчатый фундамент", "фундамент стаканного типа"], geometryKind: "counted_prism", rateCode: "06-01-006", pdfPage: 30, reinforced: true, formwork: true, concreteMaterial: true, waterproofing: true },
  { key: "raft_foundation", titleRu: "Монолитная фундаментная плита", aliasesRu: ["плитный фундамент", "фундаментная плита"], geometryKind: "area_thickness", rateCode: "06-01-012", pdfPage: 38, reinforced: true, formwork: true, concreteMaterial: true, waterproofing: true, joints: true },
  { key: "grillage", titleRu: "Монолитный ростверк", aliasesRu: ["железобетонный ростверк", "бетонирование ростверка"], geometryKind: "linear_prism", rateCode: "06-01-012", pdfPage: 38, reinforced: true, formwork: true, concreteMaterial: true },
  { key: "foundation_wall", titleRu: "Монолитная стена фундамента", aliasesRu: ["стена подвала", "железобетонная фундаментная стена"], geometryKind: "wall", rateCode: "06-01-014", pdfPage: 43, reinforced: true, formwork: true, concreteMaterial: true, waterproofing: true, joints: true },
  { key: "monolithic_wall", titleRu: "Монолитная железобетонная стена", aliasesRu: ["бетонная стена", "монолитная стена"], geometryKind: "wall", rateCode: "06-01-030", pdfPage: 58, reinforced: true, formwork: true, concreteMaterial: true, joints: true },
  { key: "column", titleRu: "Монолитная железобетонная колонна", aliasesRu: ["бетонная колонна", "монолитные колонны"], geometryKind: "column", rateCode: "06-01-027", pdfPage: 57, reinforced: true, formwork: true, concreteMaterial: true },
  { key: "beam", titleRu: "Монолитная железобетонная балка", aliasesRu: ["монолитный ригель", "железобетонная балка"], geometryKind: "beam", rateCode: "06-01-109", pdfPage: 136, reinforced: true, formwork: true, concreteMaterial: true },
  { key: "floor_slab", titleRu: "Монолитная плита перекрытия", aliasesRu: ["бетонирование перекрытия", "железобетонная плита перекрытия"], geometryKind: "area_thickness", rateCode: "06-01-109", pdfPage: 136, reinforced: true, formwork: true, concreteMaterial: true, joints: true },
  { key: "stairs", titleRu: "Монолитная железобетонная лестница", aliasesRu: ["бетонная лестница", "лестничный марш монолитный"], geometryKind: "stairs", rateCode: "06-01-119", pdfPage: 149, reinforced: true, formwork: true, concreteMaterial: true },
  { key: "retaining_wall", titleRu: "Монолитная подпорная стена", aliasesRu: ["железобетонная подпорная стена", "бетонирование подпорной стены"], geometryKind: "wall", rateCode: "06-01-014", pdfPage: 43, reinforced: true, formwork: true, concreteMaterial: true, waterproofing: true, joints: true },
  { key: "pit_channel_reservoir", titleRu: "Монолитный приямок, канал или резервуар", aliasesRu: ["бетонный приямок", "железобетонный канал", "монолитный резервуар"], geometryKind: "pit", rateCode: "06-01-049", pdfPage: 83, reinforced: true, formwork: true, concreteMaterial: true, waterproofing: true, joints: true },
  { key: "industrial_floor", titleRu: "Монолитный промышленный бетонный пол", aliasesRu: ["промышленный бетонный пол", "бетонный пол с упрочнением"], geometryKind: "area_thickness", rateCode: "06-01-091", pdfPage: 122, reinforced: false, formwork: false, concreteMaterial: true, joints: true },
  { key: "ready_mix_placement", titleRu: "Укладка готовой бетонной смеси", aliasesRu: ["приёмка и укладка бетона", "бетонирование готовой смесью"], geometryKind: "volume", rateCode: "06-01-108", pdfPage: 132, reinforced: false, formwork: false, concreteMaterial: false },
  { key: "concrete_repair", titleRu: "Ремонт бетонной конструкции", aliasesRu: ["ремонт бетона", "восстановление защитного слоя бетона"], geometryKind: "repair", rateCode: "06-01-084", pdfPage: 118, reinforced: false, formwork: false, concreteMaterial: false },
]);

function userParameter(
  parameterId: string,
  titleRu: string,
  unitId: string | null,
  guideRu: string,
  options: Partial<Pick<ConcreteR6Parameter, "valueType" | "defaultValue" | "required" | "requiredWhen" | "choices" | "minimum">> = {},
): ConcreteR6Parameter {
  return {
    parameterId,
    titleRu,
    valueType: options.valueType ?? "decimal",
    unitId,
    visibilityRole: "USER_INPUT",
    defaultValue: options.defaultValue ?? null,
    required: options.required ?? true,
    ...(options.requiredWhen ? { requiredWhen: options.requiredWhen } : {}),
    ...(options.choices ? { choices: options.choices } : {}),
    ...(options.minimum == null ? {} : { minimum: options.minimum }),
    guideRu,
  };
}

function internalParameter(
  parameterId: string,
  titleRu: string,
  unitId: string,
  defaultValue: number,
  guideRu: string,
): ConcreteR6Parameter {
  return {
    parameterId,
    titleRu,
    valueType: "decimal",
    unitId,
    visibilityRole: "INTERNAL_ONLY",
    defaultValue,
    required: true,
    minimum: 0,
    guideRu,
  };
}

function geometry(seed: DefinitionSeed): {
  parameters: ConcreteR6Parameter[];
  volume: string;
  contactArea: string;
  formworkArea: string;
} {
  const project = (field: string) => `Значение «${field}» берётся из проекта или фактического обмера.`;
  switch (seed.geometryKind) {
    case "area_thickness":
      return {
        parameters: [
          userParameter("area_m2", "Площадь", "m2", project("площадь"), { minimum: 0.01 }),
          userParameter("thickness_m", "Толщина", "m", project("толщина"), { minimum: 0.01 }),
        ],
        volume: "area_m2 * thickness_m",
        contactArea: "area_m2",
        formworkArea: "area_m2 * 0 + area_m2",
      };
    case "linear_prism":
      return {
        parameters: [
          userParameter("length_m", "Длина", "m", project("длина"), { minimum: 0.01 }),
          userParameter("width_m", "Ширина", "m", project("ширина"), { minimum: 0.01 }),
          userParameter("height_m", "Высота", "m", project("высота"), { minimum: 0.01 }),
        ],
        volume: "length_m * width_m * height_m",
        contactArea: "length_m * width_m",
        formworkArea: "2 * length_m * height_m + 2 * width_m * height_m",
      };
    case "counted_prism":
      return {
        parameters: [
          userParameter("element_count", "Количество фундаментов", "pcs", project("количество"), { valueType: "integer", minimum: 1 }),
          userParameter("length_m", "Длина", "m", project("длина"), { minimum: 0.01 }),
          userParameter("width_m", "Ширина", "m", project("ширина"), { minimum: 0.01 }),
          userParameter("height_m", "Высота", "m", project("высота"), { minimum: 0.01 }),
        ],
        volume: "element_count * length_m * width_m * height_m",
        contactArea: "element_count * length_m * width_m",
        formworkArea: "element_count * (2 * length_m * height_m + 2 * width_m * height_m)",
      };
    case "wall":
      return {
        parameters: [
          userParameter("length_m", "Длина стены", "m", project("длина стены"), { minimum: 0.01 }),
          userParameter("height_m", "Высота стены", "m", project("высота стены"), { minimum: 0.01 }),
          userParameter("thickness_m", "Толщина стены", "m", project("толщина стены"), { minimum: 0.01 }),
        ],
        volume: "length_m * height_m * thickness_m",
        contactArea: "length_m * height_m",
        formworkArea: "2 * length_m * height_m",
      };
    case "column":
      return {
        parameters: [
          userParameter("element_count", "Количество колонн", "pcs", project("количество колонн"), { valueType: "integer", minimum: 1 }),
          userParameter("width_m", "Ширина сечения", "m", project("ширина сечения"), { minimum: 0.01 }),
          userParameter("depth_m", "Глубина сечения", "m", project("глубина сечения"), { minimum: 0.01 }),
          userParameter("height_m", "Высота колонны", "m", project("высота колонны"), { minimum: 0.01 }),
        ],
        volume: "element_count * width_m * depth_m * height_m",
        contactArea: "element_count * width_m * depth_m",
        formworkArea: "element_count * 2 * (width_m + depth_m) * height_m",
      };
    case "beam":
      return {
        parameters: [
          userParameter("element_count", "Количество балок", "pcs", project("количество балок"), { valueType: "integer", minimum: 1 }),
          userParameter("length_m", "Длина балки", "m", project("длина балки"), { minimum: 0.01 }),
          userParameter("width_m", "Ширина балки", "m", project("ширина балки"), { minimum: 0.01 }),
          userParameter("height_m", "Высота балки", "m", project("высота балки"), { minimum: 0.01 }),
        ],
        volume: "element_count * length_m * width_m * height_m",
        contactArea: "element_count * length_m * width_m",
        formworkArea: "element_count * length_m * (width_m + 2 * height_m)",
      };
    case "stairs":
      return {
        parameters: [
          userParameter("concrete_volume_m3", "Объём бетона", "m3", project("объём бетона"), { minimum: 0.01 }),
          userParameter("formwork_area_m2", "Площадь опалубки", "m2", project("площадь опалубки"), { minimum: 0.01 }),
        ],
        volume: "concrete_volume_m3",
        contactArea: "formwork_area_m2",
        formworkArea: "formwork_area_m2",
      };
    case "pit":
      return {
        parameters: [
          userParameter("base_length_m", "Длина днища", "m", project("длина днища"), { minimum: 0.01 }),
          userParameter("base_width_m", "Ширина днища", "m", project("ширина днища"), { minimum: 0.01 }),
          userParameter("bottom_thickness_m", "Толщина днища", "m", project("толщина днища"), { minimum: 0.01 }),
          userParameter("wall_perimeter_m", "Периметр стен", "m", project("периметр стен"), { minimum: 0.01 }),
          userParameter("wall_height_m", "Высота стен", "m", project("высота стен"), { minimum: 0.01 }),
          userParameter("wall_thickness_m", "Толщина стен", "m", project("толщина стен"), { minimum: 0.01 }),
        ],
        volume: "base_length_m * base_width_m * bottom_thickness_m + wall_perimeter_m * wall_height_m * wall_thickness_m",
        contactArea: "base_length_m * base_width_m + wall_perimeter_m * wall_height_m",
        formworkArea: "2 * wall_perimeter_m * wall_height_m",
      };
    case "volume":
      return {
        parameters: [userParameter("concrete_volume_m3", "Объём бетонной смеси", "m3", project("объём бетонной смеси"), { minimum: 0.01 })],
        volume: "concrete_volume_m3",
        contactArea: "concrete_volume_m3",
        formworkArea: "concrete_volume_m3",
      };
    case "repair":
      return {
        parameters: [
          userParameter("repair_area_m2", "Площадь ремонта", "m2", project("площадь ремонта"), { minimum: 0.01 }),
          userParameter("repair_depth_m", "Глубина ремонта", "m", project("глубина ремонта"), { minimum: 0.001 }),
        ],
        volume: "repair_area_m2 * repair_depth_m",
        contactArea: "repair_area_m2",
        formworkArea: "repair_area_m2",
      };
  }
}

function formula(formulaId: string, outputUnitId: string, source: string): ConcreteR6Formula {
  return { formulaId, outputUnitId, ...compileFormulaGraph(source) };
}

function buildDefinition(seed: DefinitionSeed): ConcreteR6Definition {
  const shape = geometry(seed);
  const source = krerBinding(seed.rateCode, seed.pdfPage);
  const reinforced = equals("reinforcement_required", true);
  const readyMix = equals("concrete_supply", "ready_mix");
  const siteBatch = equals("concrete_supply", "site_batch");
  const pump = equals("placement_method", "pump");
  const crane = equals("placement_method", "crane_bucket");
  const membrane = equals("curing_method", "membrane");
  const winter = equals("season", "winter");
  const joints = equals("joints_required", true);
  const waterproofing = equals("waterproofing_required", true);

  const parameters: ConcreteR6Parameter[] = [
    ...shape.parameters,
    userParameter("concrete_class", "Класс бетона", null, "Укажите класс бетона по рабочей документации.", {
      valueType: "enum", defaultValue: "B25", choices: ["B15", "B20", "B25", "B30", "B35", "B40"],
    }),
    userParameter("concrete_supply", "Источник бетонной смеси", null, "Выберите готовую смесь с РБУ или приготовление на площадке по утверждённому составу.", {
      valueType: "enum", defaultValue: "ready_mix", choices: ["ready_mix", "site_batch"],
    }),
    userParameter("placement_method", "Способ подачи бетона", null, "Выберите фактический способ подачи бетонной смеси.", {
      valueType: "enum", defaultValue: "pump", choices: ["pump", "crane_bucket", "direct_chute"],
    }),
    userParameter("curing_method", "Способ ухода за бетоном", null, "Выберите предусмотренный технологической картой способ ухода.", {
      valueType: "enum", defaultValue: "membrane", choices: ["membrane", "water"],
    }),
    userParameter("season", "Условия бетонирования", null, "Укажите обычные или зимние условия производства работ.", {
      valueType: "enum", defaultValue: "warm", choices: ["warm", "winter"],
    }),
    internalParameter("concrete_density_t_m3", "Плотность бетонной смеси", "t_per_m3", 2.4, "Проверяемое значение из паспорта бетонной смеси; не показывается как вопрос пользователю."),
  ];

  if (seed.concreteMaterial) {
    parameters.push(
      userParameter("concrete_delivery_distance_km", "Доставка бетонной смеси", "km", "Укажите маршрут автобетоносмесителя от РБУ до объекта.", { minimum: 0, defaultValue: 0 }),
      userParameter("cement_delivery_distance_km", "Доставка цемента", "km", "Только для приготовления смеси на площадке: укажите маршрут цементовоза или бортового автомобиля.", { minimum: 0, defaultValue: 0, requiredWhen: siteBatch }),
      userParameter("sand_delivery_distance_km", "Доставка песка", "km", "Только для приготовления смеси на площадке: укажите маршрут самосвала.", { minimum: 0, defaultValue: 0, requiredWhen: siteBatch }),
      userParameter("aggregate_delivery_distance_km", "Доставка щебня", "km", "Только для приготовления смеси на площадке: укажите маршрут самосвала.", { minimum: 0, defaultValue: 0, requiredWhen: siteBatch }),
      userParameter("water_delivery_distance_km", "Доставка воды", "km", "Укажите маршрут автоцистерны, если вода доставляется на объект.", { minimum: 0, defaultValue: 0, requiredWhen: siteBatch }),
    );
  }

  if (seed.reinforced) {
    parameters.push(
      userParameter("reinforcement_required", "Армирование", null, "Подтвердите наличие армирования по проекту.", { valueType: "boolean", defaultValue: true }),
      userParameter("reinforcement_mass_kg", "Масса арматуры", "kg", "Укажите итоговую массу по ведомости расхода стали.", { minimum: 0, requiredWhen: reinforced }),
      userParameter("binding_wire_mass_kg", "Масса вязальной проволоки", "kg", "Укажите массу по спецификации армирования.", { minimum: 0, requiredWhen: reinforced }),
      userParameter("reinforcement_delivery_distance_km", "Доставка арматуры", "km", "Укажите маршрут бортового автомобиля от поставщика до объекта.", { minimum: 0, defaultValue: 0, requiredWhen: reinforced }),
    );
  }
  if (seed.formwork) {
    parameters.push(
      userParameter("formwork_transport_mass_t", "Масса опалубки для доставки", "t", "Укажите транспортную массу выбранной опалубочной системы.", { minimum: 0, defaultValue: 0 }),
      userParameter("formwork_delivery_distance_km", "Доставка опалубки", "km", "Укажите маршрут бортового автомобиля или длинномера.", { minimum: 0, defaultValue: 0 }),
    );
  }
  if (seed.joints) {
    parameters.push(
      userParameter("joints_required", "Деформационные швы", null, "Подтвердите наличие швов по проекту.", { valueType: "boolean", defaultValue: false }),
      userParameter("joint_length_m", "Длина швов", "m", "Укажите суммарную проектную длину швов.", { minimum: 0, requiredWhen: joints }),
    );
  }
  if (seed.waterproofing) {
    parameters.push(
      userParameter("waterproofing_required", "Гидроизоляция", null, "Подтвердите наличие гидроизоляции в составе этой сметы.", { valueType: "boolean", defaultValue: false }),
      userParameter("waterproofing_area_m2", "Площадь гидроизоляции", "m2", "Укажите площадь по проекту.", { minimum: 0, requiredWhen: waterproofing }),
    );
  }
  parameters.push(
    userParameter("cement_kg_per_m3", "Цемент на кубометр", "kg_per_m3", "Только по утверждённому составу смеси.", { minimum: 0, requiredWhen: siteBatch }),
    userParameter("sand_t_per_m3", "Песок на кубометр", "t_per_m3", "Только по утверждённому составу смеси.", { minimum: 0, requiredWhen: siteBatch }),
    userParameter("aggregate_t_per_m3", "Щебень на кубометр", "t_per_m3", "Только по утверждённому составу смеси.", { minimum: 0, requiredWhen: siteBatch }),
    userParameter("water_m3_per_m3", "Вода на кубометр", "m3_per_m3", "Только по утверждённому составу смеси.", { minimum: 0, requiredWhen: siteBatch }),
  );

  const reinforcementExpression = seed.reinforced ? "reinforcement_mass_kg" : "0";
  const formulas: ConcreteR6Formula[] = [
    formula("concrete_volume", "m3", shape.volume),
    formula("contact_area", "m2", shape.contactArea),
    formula("formwork_area", "m2", shape.formworkArea),
    formula("reinforcement_mass", "kg", reinforcementExpression),
    formula("binding_wire_mass", "kg", seed.reinforced ? "binding_wire_mass_kg" : "0"),
    formula("cement_mass", "kg", `${shape.volume} * cement_kg_per_m3`),
    formula("sand_mass", "t", `${shape.volume} * sand_t_per_m3`),
    formula("aggregate_mass", "t", `${shape.volume} * aggregate_t_per_m3`),
    formula("mixing_water", "m3", `${shape.volume} * water_m3_per_m3`),
  ];
  if (seed.concreteMaterial) {
    formulas.push(
      formula("ready_mix_delivery", "t_km", `${shape.volume} * concrete_density_t_m3 * concrete_delivery_distance_km`),
      formula("cement_delivery", "t_km", `${shape.volume} * cement_kg_per_m3 / 1000 * cement_delivery_distance_km`),
      formula("sand_delivery", "t_km", `${shape.volume} * sand_t_per_m3 * sand_delivery_distance_km`),
      formula("aggregate_delivery", "t_km", `${shape.volume} * aggregate_t_per_m3 * aggregate_delivery_distance_km`),
      formula("water_delivery", "t_km", `${shape.volume} * water_m3_per_m3 * water_delivery_distance_km`),
    );
  }
  if (seed.reinforced) formulas.push(formula("reinforcement_delivery", "t_km", "reinforcement_mass_kg / 1000 * reinforcement_delivery_distance_km"));
  if (seed.formwork) formulas.push(formula("formwork_delivery", "t_km", "formwork_transport_mass_t * formwork_delivery_distance_km"));
  if (seed.joints) formulas.push(formula("joint_length", "m", "joint_length_m"));
  if (seed.waterproofing) formulas.push(formula("waterproofing_area", "m2", "waterproofing_area_m2"));

  const resources: ConcreteR6Resource[] = [];
  const addResource = (
    rowId: string,
    group: ConcreteR6ResourceGroup,
    titleRu: string,
    rowType: ConcreteR6Resource["rowType"],
    unitId: string,
    formulaId: string,
    inclusionAst: InclusionGraphAst = literalTrue,
    procurementEligible = false,
    normativeBinding: ConcreteR6NormativeBinding = source,
  ) => resources.push({ rowId, group, titleRu, rowType, unitId, formulaId, inclusionAst, procurementEligible, normativeBinding });

  if (seed.concreteMaterial) {
    addResource("ready_mix", "material", "Бетонная смесь проектного класса", "material", "m3", "concrete_volume", readyMix, true);
    addResource("cement", "material", "Портландцемент по утверждённому составу", "material", "kg", "cement_mass", siteBatch, true, projectBinding("утверждённый состав бетонной смеси"));
    addResource("sand", "material", "Песок для бетонной смеси", "material", "t", "sand_mass", siteBatch, true, projectBinding("утверждённый состав бетонной смеси"));
    addResource("aggregate", "material", "Щебень для бетонной смеси", "material", "t", "aggregate_mass", siteBatch, true, projectBinding("утверждённый состав бетонной смеси"));
    addResource("mixing_water", "material", "Вода для приготовления бетонной смеси", "material", "m3", "mixing_water", siteBatch, true, projectBinding("утверждённый состав бетонной смеси"));
  }
  if (seed.reinforced) {
    addResource("reinforcement", "material", "Арматурная сталь по ведомости", "material", "kg", "reinforcement_mass", reinforced, true, projectBinding("ведомость расхода стали"));
    addResource("binding_wire", "material", "Вязальная проволока по спецификации", "material", "kg", "binding_wire_mass", reinforced, true, projectBinding("спецификация армирования"));
  }
  if (seed.formwork) addResource("formwork", "material", "Опалубочная система", "material", "m2", "formwork_area", literalTrue, true);
  addResource("curing_membrane", "material", "Материал для укрытия бетона", "material", "m2", "contact_area", membrane, true, SN52_BINDING);
  if (seed.joints) addResource("joint_sealant", "material", "Герметик и заполнение деформационных швов", "material", "m", "joint_length", joints, true, projectBinding("ведомость деформационных швов"));
  if (seed.waterproofing) addResource("waterproofing", "material", "Гидроизоляционная система", "material", "m2", "waterproofing_area", waterproofing, true, projectBinding("проект гидроизоляции"));

  if (seed.formwork) {
    addResource("formwork_install", "construction_work", "Монтаж опалубки", "construction_work", "m2", "formwork_area");
    addResource("formwork_remove", "construction_work", "Демонтаж опалубки", "construction_work", "m2", "formwork_area");
  }
  if (seed.reinforced) addResource("reinforcement_install", "construction_work", "Монтаж арматурных каркасов", "construction_work", "kg", "reinforcement_mass", reinforced);
  if (seed.geometryKind === "repair") {
    addResource("repair_preparation", "construction_work", "Удаление ослабленного бетона и подготовка основания", "construction_work", "m2", "contact_area");
    addResource("repair_compound", "material", "Ремонтный состав для бетона", "material", "m3", "concrete_volume", literalTrue, true, projectBinding("проект ремонта и паспорт ремонтного состава"));
    addResource("repair_application", "construction_work", "Нанесение и уплотнение ремонтного состава", "construction_work", "m3", "concrete_volume");
  } else {
    addResource("concrete_placement", "construction_work", "Укладка бетонной смеси", "construction_work", "m3", "concrete_volume");
    addResource("concrete_compaction", "construction_work", "Уплотнение бетонной смеси", "construction_work", "m3", "concrete_volume");
  }
  addResource("curing", "construction_work", "Уход за бетоном", "construction_work", "m2", "contact_area");
  if (seed.joints) addResource("joint_install", "construction_work", "Устройство деформационных швов", "construction_work", "m", "joint_length", joints);
  if (seed.waterproofing) addResource("waterproofing_install", "construction_work", "Устройство гидроизоляции", "construction_work", "m2", "waterproofing_area", waterproofing);

  if (seed.geometryKind !== "repair") {
    addResource("concrete_pump", "machine_equipment", "Бетононасос", "machine_equipment", "m3", "concrete_volume", pump);
    addResource("crane_bucket", "machine_equipment", "Кран с бадьёй для бетонной смеси", "machine_equipment", "m3", "concrete_volume", crane);
    addResource("concrete_vibrator", "machine_equipment", "Глубинный вибратор", "machine_equipment", "m3", "concrete_volume");
    addResource("site_mixer", "machine_equipment", "Бетоносмеситель", "machine_equipment", "m3", "concrete_volume", siteBatch);
    addResource("winter_heating", "machine_equipment", "Комплект зимнего прогрева бетона", "machine_equipment", "m3", "concrete_volume", winter);
  } else {
    addResource("repair_equipment", "machine_equipment", "Оборудование для подготовки и нанесения ремонтного состава", "machine_equipment", "m2", "contact_area");
  }

  if (seed.concreteMaterial) {
    addResource("ready_mix_delivery", "delivery", "Доставка бетонной смеси автобетоносмесителями", "delivery", "t_km", "ready_mix_delivery", readyMix);
    addResource("cement_delivery", "delivery", "Доставка цемента цементовозом или бортовым автомобилем", "delivery", "t_km", "cement_delivery", siteBatch);
    addResource("sand_delivery", "delivery", "Доставка песка самосвалом", "delivery", "t_km", "sand_delivery", siteBatch);
    addResource("aggregate_delivery", "delivery", "Доставка щебня самосвалом", "delivery", "t_km", "aggregate_delivery", siteBatch);
    addResource("water_delivery", "delivery", "Доставка воды автоцистерной", "delivery", "t_km", "water_delivery", siteBatch);
  }
  if (seed.reinforced) addResource("reinforcement_delivery", "delivery", "Доставка арматурной стали бортовым автомобилем", "delivery", "t_km", "reinforcement_delivery", reinforced);
  if (seed.formwork) addResource("formwork_delivery", "delivery", "Доставка опалубочной системы бортовым автомобилем", "delivery", "t_km", "formwork_delivery");

  return {
    catalogId: `r6-concrete:${seed.key}`,
    titleRu: seed.titleRu,
    aliasesRu: seed.aliasesRu,
    geometryKind: seed.geometryKind,
    includedRu: ["реальные материалы по выбранной технологии", "основные строительные операции", "применимое оборудование", "отдельные грузопотоки по конкретным материалам и транспорту"],
    excludedRu: ["проектирование и служебные журналы как отдельные товарные строки", "повторная доставка каждого элемента", "скрытые цены и неподтверждённый состав смеси"],
    parameters,
    formulas,
    resources,
    normativeBinding: source,
  };
}

export const CONCRETE_R6_DEFINITIONS: readonly ConcreteR6Definition[] = Object.freeze(SEEDS.map(buildDefinition));

function normalizedText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ru-RU").replace(/ё/gu, "е").replace(/[^a-zа-я0-9]+/giu, " ").trim();
}

export function findConcreteDefinitionR6(query: string): ConcreteR6Definition | null {
  const normalized = normalizedText(query);
  if (!normalized) return null;
  if (/(?:асфальт|гипсокартон|ламинат|штукатур|обои|кирпич|газоблок|кабел|розет|светильник|кровл|черепиц|трубопровод|канализац|водоснабжен|вентиляц|воздуховод|радиатор|окн|двер|плитк[аи]|демонтаж|алмазн|резк[аи]|бурени|дроблен)/iu.test(normalized)) return null;
  const tokens = normalized.split(" ").filter((token) => token.length > 2);
  let selected: { definition: ConcreteR6Definition; score: number } | null = null;
  for (const definition of CONCRETE_R6_DEFINITIONS) {
    const candidates = [definition.titleRu, ...definition.aliasesRu].map(normalizedText);
    const score = Math.max(...candidates.map((candidate) => {
      if (candidate === normalized) return 1000;
      if (normalized.includes(candidate) || candidate.includes(normalized)) return 500 + Math.min(candidate.length, normalized.length);
      return tokens.reduce((sum, token) => sum + (candidate.includes(token) ? token.length : 0), 0);
    }));
    if (score > (selected?.score ?? 0)) selected = { definition, score };
  }
  return selected && selected.score >= 6 ? selected.definition : null;
}

function parameterValues(
  definition: ConcreteR6Definition,
  supplied: Readonly<Record<string, ConcreteR6Value>>,
): Record<string, ConcreteR6Value> {
  const values: Record<string, ConcreteR6Value> = {};
  for (const parameter of definition.parameters) {
    const value = supplied[parameter.parameterId] ?? parameter.defaultValue;
    const applicable = parameter.requiredWhen == null || evaluateInclusionGraph(parameter.requiredWhen, { ...values, ...supplied });
    if (parameter.required && applicable && value == null) throw new Error(`CONCRETE_R6_MISSING_PARAMETER:${parameter.parameterId}`);
    if (value != null) {
      if (parameter.minimum != null && typeof value === "number" && value < parameter.minimum) {
        throw new Error(`CONCRETE_R6_PARAMETER_BELOW_MINIMUM:${parameter.parameterId}`);
      }
      if (parameter.choices && !parameter.choices.includes(String(value))) {
        throw new Error(`CONCRETE_R6_INVALID_CHOICE:${parameter.parameterId}`);
      }
      values[parameter.parameterId] = value;
    }
  }
  return values;
}

function formulaParameterValues(
  values: Readonly<Record<string, ConcreteR6Value>>,
): Record<string, string | number | bigint> {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string | number] => typeof entry[1] !== "boolean"),
  );
}

export function compileConcreteR6Estimate(
  definitionOrCatalogId: ConcreteR6Definition | string,
  supplied: Readonly<Record<string, ConcreteR6Value>>,
): ConcreteR6CompiledEstimate {
  const definition = typeof definitionOrCatalogId === "string"
    ? CONCRETE_R6_DEFINITIONS.find((candidate) => candidate.catalogId === definitionOrCatalogId)
    : definitionOrCatalogId;
  if (!definition) throw new Error(`CONCRETE_R6_UNKNOWN_DEFINITION:${definitionOrCatalogId}`);
  const values = parameterValues(definition, supplied);
  const numericValues = formulaParameterValues(values);
  const formulaById = new Map(definition.formulas.map((candidate) => [candidate.formulaId, candidate]));
  const rows = definition.resources
    .filter((resource) => evaluateInclusionGraph(resource.inclusionAst, values))
    .map((resource) => {
      const targetFormula = formulaById.get(resource.formulaId);
      if (!targetFormula) throw new Error(`CONCRETE_R6_MISSING_FORMULA:${resource.formulaId}`);
      return { ...resource, quantity: evaluateFormulaGraph(targetFormula, numericValues) };
    })
    .filter((resource) => Number(resource.quantity) > 0);
  const groups = Object.fromEntries(
    (["material", "construction_work", "machine_equipment", "delivery"] as const)
      .map((group) => [group, rows.filter((row) => row.group === group)]),
  ) as Record<ConcreteR6ResourceGroup, ConcreteR6CompiledRow[]>;
  return { catalogId: definition.catalogId, titleRu: definition.titleRu, values, rows, groups };
}

export function sampleConcreteR6Input(definition: ConcreteR6Definition): Record<string, ConcreteR6Value> {
  const valueById: Record<string, ConcreteR6Value> = {
    area_m2: 100,
    thickness_m: 0.2,
    length_m: 20,
    width_m: 1.2,
    height_m: 2.5,
    depth_m: 0.5,
    element_count: 4,
    concrete_volume_m3: 25,
    formwork_area_m2: 80,
    base_length_m: 8,
    base_width_m: 5,
    bottom_thickness_m: 0.25,
    wall_perimeter_m: 26,
    wall_height_m: 2,
    wall_thickness_m: 0.25,
    repair_area_m2: 40,
    repair_depth_m: 0.04,
    reinforcement_mass_kg: 1800,
    binding_wire_mass_kg: 22,
    joint_length_m: 30,
    waterproofing_area_m2: 90,
    cement_kg_per_m3: 320,
    sand_t_per_m3: 0.72,
    aggregate_t_per_m3: 1.18,
    water_m3_per_m3: 0.18,
    concrete_delivery_distance_km: 18,
    cement_delivery_distance_km: 18,
    sand_delivery_distance_km: 18,
    aggregate_delivery_distance_km: 18,
    water_delivery_distance_km: 18,
    reinforcement_delivery_distance_km: 18,
    formwork_transport_mass_t: 12,
    formwork_delivery_distance_km: 18,
  };
  return Object.fromEntries(definition.parameters
    .map((parameter) => [parameter.parameterId, valueById[parameter.parameterId] ?? parameter.defaultValue])
    .filter((entry): entry is [string, ConcreteR6Value] => entry[1] != null));
}
