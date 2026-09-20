import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../../../backendPlatform/canonicalEstimateCompileCore";
import { canonicalEstimateStableJson } from "../../../backendPlatform/canonicalEstimateDeterminism";
import { canonicalEstimateSha256HexText } from "../../../backendPlatform/canonicalEstimateSha256";
import { compileFormulaGraph, evaluateFormulaGraph } from "../../../backendPlatform/formulaGraph";
import type {
  ProfessionalDomainParameterDefinitionV1,
  ProfessionalDomainParameterSchemaV1,
  ProfessionalNormativeProfileV1,
  ProfessionalParameterConditionV1,
  ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory";
import {
  DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7,
  drywallDomainCalculationStrategyIdV7,
  drywallDomainProfessionalOwnerIdV7,
  type DrywallDomainCompletionFamilyV7,
  type DrywallDomainCompletionOperationV7,
  type DrywallDomainCompletionVariantV7,
} from "./drywallDomainCompletionProfessionalV7";
import { INTERIOR_FINISHES_DOMAIN_INVENTORY, type InteriorFinishesDomainInventoryRow } from "./inventory";
import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyPriceRouteV3,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
  ProfessionalEstimateScopeModeV4,
  ProfessionalNormativeRowTraceV3,
  ProfessionalResourceGraphNodeV3,
} from "../../professionalProjectAssemblyV4";

type Scalar = string | number | boolean;
export type Batch004R56ParameterDefinition = {
  parameterId: string;
  labelRu: string;
  inputType: "number" | "boolean" | "choice" | "text";
  unitId: string | null;
  minimum: number | null;
  maximum: number | null;
  choices: readonly string[];
  visibleWhen: ProfessionalParameterConditionV1;
  requiredWhen: ProfessionalParameterConditionV1;
  formulaConsumerIds: readonly string[];
  sourceOwnership: readonly string[];
  defaultValue: null;
  missingValuePolicy: "FAIL_CLOSED";
};
export type Batch004R56FormulaDefinition = {
  formulaId: string;
  expressionSource: string;
  inputParameterIds: readonly string[];
  outputUnitId: string;
};
export type Batch004R56ResourceDefinition = {
  rowId: string;
  ordinal: number;
  sectionRu: string;
  category: string;
  titleRu: string;
  formulaId: string;
  outputUnitId: string;
  inclusionCondition: string;
  costOwnership: "priced_resource" | "priced_unit_rate" | "informational_output";
  costOwnerId: string;
  semanticOwnerId: string;
  procurementOwnerId: string | null;
  procurementEligible: boolean;
  priceRoute: ProfessionalAssemblyPriceRouteV3 | null;
  resourceGraph: ProfessionalResourceGraphNodeV3 | null;
  normativeTrace: readonly ProfessionalNormativeRowTraceV3[];
  normativeSourceIds: readonly string[];
};

export type Batch004R56EngineeringSource = {
  sourceId: string;
  documentCode: string;
  edition: string;
  exactLocator: string;
  sourceRole: "WORK_EXECUTION" | "QUANTITY_NORM" | "PROJECT_INPUT" | "PRICE_INPUT";
  applicabilityRu: string;
  primary: boolean;
};

export type Batch004R56EngineeringSourcePack = {
  schemaVersion: "Batch004R56EngineeringSourcePack";
  catalogId: string;
  family: DrywallDomainCompletionFamilyV7;
  operation: DrywallDomainCompletionOperationV7;
  variant: DrywallDomainCompletionVariantV7;
  sources: readonly Batch004R56EngineeringSource[];
  quantitativeBindings: readonly {
    parameterId: string;
    formulaConsumerIds: readonly string[];
    sourceIds: readonly string[];
    hiddenDefault: false;
    missingValuePolicy: "FAIL_CLOSED";
  }[];
  sourcePackHash: string;
};

export type Batch004R56ContentPassport = {
  schemaVersion: "Batch004R56ContentPassport";
  catalogId: string;
  titleRu: string;
  aliasesRu: readonly string[];
  physicalResultRu: string;
  includedScopeRu: readonly string[];
  excludedScopeRu: readonly string[];
  family: DrywallDomainCompletionFamilyV7;
  operation: DrywallDomainCompletionOperationV7;
  variant: DrywallDomainCompletionVariantV7;
  variantApplicabilityRu: string;
  productionOwnerId: string;
  calculationStrategyId: string;
  parameterCount: number;
  formulaCount: number;
  resourceCount: number;
  engineeringSourcePack: Batch004R56EngineeringSourcePack;
  semanticOwners: readonly string[];
  costOwners: readonly string[];
  procurementOwners: readonly string[];
  predecessorNoiseRowsCarriedForwardCount: 0;
  hiddenQuantitativeAssumptionCount: 0;
  documentationBoqRowCount: 0;
  genericHourBoqRowCount: 0;
  deliveryBoqRowCount: 1;
  wasteHaulBoqRowCount: 1;
  disposition: "REAL_WORK";
};

export type Batch004R56CanonicalSuccessorDefinition = {
  executionContract: "MASTER_EXECUTION_TZ_R5_6_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU";
  batchId: "BATCH-004";
  successorVersion: "Batch004CanonicalSuccessorR56";
  disposition: "REAL_WORK";
  catalogId: string;
  titleRu: string;
  family: DrywallDomainCompletionFamilyV7;
  operation: DrywallDomainCompletionOperationV7;
  variant: DrywallDomainCompletionVariantV7;
  ownerId: string;
  calculationStrategyId: string;
  passport: Batch004R56ContentPassport;
  parameters: readonly Batch004R56ParameterDefinition[];
  formulas: readonly Batch004R56FormulaDefinition[];
  resources: readonly Batch004R56ResourceDefinition[];
  definitionSha256: string;
};

type ParsedId = Pick<Batch004R56CanonicalSuccessorDefinition, "family" | "operation" | "variant">;
type MeasureProfile = { parameterId: string; unitId: string; labelRu: string };
type ResourceBlueprint = {
  key: string;
  sectionRu: string;
  category: string;
  titleRu: string;
  expression: string;
  inputs: readonly string[];
  unitId: string;
  procurementEligible: boolean;
  resourceClass: string;
  inclusionCondition?: string;
};

function sha256(value: unknown): string {
  return canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
}

function parseCatalogId(catalogId: string): ParsedId {
  const match = catalogId.match(/^drywall_ceiling_interior_(.+)_(prepare|frame|align|insulate|clad|finish_joint|repair|install)_(large_area|small_area|standard|technical_room|wet_zone|high_load)$/u);
  if (!match) throw new Error(`BATCH004_R56_ID_PARSE_RED:${catalogId}`);
  return {
    family: match[1] as DrywallDomainCompletionFamilyV7,
    operation: match[2].toUpperCase() as DrywallDomainCompletionOperationV7,
    variant: match[3] as DrywallDomainCompletionVariantV7,
  };
}

const FAMILY_PROFILE: Readonly<Record<DrywallDomainCompletionFamilyV7, {
  labelRu: string;
  frameMaterialRu: string;
  boardMaterialRu: string;
  insulationMaterialRu: string;
  repairMaterialRu: string;
  installWorkRu: string;
}>> = {
  bulkhead: {
    labelRu: "потолочный короб",
    frameMaterialRu: "Профили и соединители каркаса потолочного короба по проектной системе",
    boardMaterialRu: "Гипсокартонные листы для граней потолочного короба",
    insulationMaterialRu: "Проектная изоляция полости потолочного короба",
    repairMaterialRu: "Совместимый лист для восстановления потолочного короба",
    installWorkRu: "Комплексный монтаж потолочного короба по проектной геометрии",
  },
  curve: {
    labelRu: "криволинейная конструкция",
    frameMaterialRu: "Гибкие направляющие и профили криволинейного каркаса",
    boardMaterialRu: "Гибкие гипсокартонные листы проектного радиуса",
    insulationMaterialRu: "Гибкая изоляция криволинейной полости",
    repairMaterialRu: "Гибкий лист для восстановления криволинейного участка",
    installWorkRu: "Монтаж криволинейной гипсокартонной конструкции по шаблону",
  },
  drywall_ceiling: {
    labelRu: "подвесной потолок",
    frameMaterialRu: "Потолочные профили, подвесы и соединители выбранной системы",
    boardMaterialRu: "Гипсокартонные листы подвесного потолка",
    insulationMaterialRu: "Изоляция над подвесным потолком проектной плотности",
    repairMaterialRu: "Совместимый потолочный лист для локального восстановления",
    installWorkRu: "Комплексный монтаж плоского подвесного гипсокартонного потолка",
  },
  drywall_partition: {
    labelRu: "гипсокартонная перегородка",
    frameMaterialRu: "Направляющие и стоечные профили перегородки",
    boardMaterialRu: "Гипсокартонные листы обшивки перегородки",
    insulationMaterialRu: "Заполнение полости перегородки проектной плотности",
    repairMaterialRu: "Совместимый лист для ремонта перегородки",
    installWorkRu: "Комплексный монтаж гипсокартонной перегородки",
  },
  fire_partition: {
    labelRu: "огнестойкая перегородка",
    frameMaterialRu: "Профили сертифицированной огнестойкой перегородки",
    boardMaterialRu: "Огнестойкие гипсовые листы проектного класса",
    insulationMaterialRu: "Негорючее заполнение огнестойкой перегородки",
    repairMaterialRu: "Огнестойкий ремонтный лист совместимой системы",
    installWorkRu: "Комплексный монтаж сертифицированной огнестойкой перегородки",
  },
  joint: {
    labelRu: "деформационный или системный шов",
    frameMaterialRu: "Профили и закладные системного шва",
    boardMaterialRu: "Обрамляющие полосы гипсового листа системного шва",
    insulationMaterialRu: "Упругое заполнение и уплотнение системного шва",
    repairMaterialRu: "Совместимые материалы восстановления системного шва",
    installWorkRu: "Устройство системного шва по проектному узлу",
  },
  moisture_partition: {
    labelRu: "влагостойкая перегородка",
    frameMaterialRu: "Коррозионностойкие профили влагостойкой перегородки",
    boardMaterialRu: "Влагостойкие гипсовые листы проектного типа",
    insulationMaterialRu: "Влагостойкое заполнение полости перегородки",
    repairMaterialRu: "Влагостойкий ремонтный лист совместимой системы",
    installWorkRu: "Комплексный монтаж влагостойкой гипсокартонной перегородки",
  },
  niche: {
    labelRu: "ниша",
    frameMaterialRu: "Профили и усилители каркаса ниши",
    boardMaterialRu: "Гипсокартонные листы граней ниши",
    insulationMaterialRu: "Проектное заполнение полости ниши",
    repairMaterialRu: "Совместимый лист для восстановления ниши",
    installWorkRu: "Комплексное устройство гипсокартонной ниши",
  },
  revision_hatch: {
    labelRu: "ревизионный люк",
    frameMaterialRu: "Профили обрамления проёма ревизионного люка",
    boardMaterialRu: "Заводской ревизионный люк совместимого типа",
    insulationMaterialRu: "Уплотнение периметра ревизионного люка",
    repairMaterialRu: "Совместимые элементы восстановления ревизионного люка",
    installWorkRu: "Монтаж ревизионного люка с обрамлением проёма",
  },
  shaft: {
    labelRu: "шахтная облицовка",
    frameMaterialRu: "Шахтные профили и направляющие выбранной системы",
    boardMaterialRu: "Шахтные гипсовые плиты проектного класса",
    insulationMaterialRu: "Негорючее заполнение шахтной облицовки",
    repairMaterialRu: "Совместимая шахтная плита для локального восстановления",
    installWorkRu: "Комплексный монтаж шахтной гипсокартонной облицовки",
  },
  sound_partition: {
    labelRu: "звукоизоляционная перегородка",
    frameMaterialRu: "Профили акустически развязанного каркаса перегородки",
    boardMaterialRu: "Акустические гипсовые листы проектной системы",
    insulationMaterialRu: "Звукопоглощающее заполнение проектной плотности",
    repairMaterialRu: "Акустический ремонтный лист совместимой системы",
    installWorkRu: "Комплексный монтаж звукоизоляционной перегородки",
  },
  wall_cladding: {
    labelRu: "пристенная облицовка",
    frameMaterialRu: "Профили и кронштейны пристенной облицовки",
    boardMaterialRu: "Гипсокартонные листы пристенной облицовки",
    insulationMaterialRu: "Изоляция полости пристенной облицовки",
    repairMaterialRu: "Совместимый лист для восстановления пристенной облицовки",
    installWorkRu: "Комплексный монтаж гипсокартонной пристенной облицовки",
  },
};

const OPERATION_SCOPE: Readonly<Record<DrywallDomainCompletionOperationV7, {
  labelRu: string;
  physicalResultRu: (familyLabel: string) => string;
  workTitleRu: (familyLabel: string, installTitle: string) => string;
}>> = {
  PREPARE: {
    labelRu: "подготовка основания",
    physicalResultRu: (family) => `Основание для конструкции «${family}» подготовлено к следующей проектной операции.`,
    workTitleRu: (family) => `Подготовка основания для конструкции «${family}»`,
  },
  FRAME: {
    labelRu: "монтаж каркаса",
    physicalResultRu: (family) => `Каркас конструкции «${family}» смонтирован без повторного учёта обшивки.`,
    workTitleRu: (family) => `Монтаж каркаса конструкции «${family}»`,
  },
  ALIGN: {
    labelRu: "выравнивание каркаса",
    physicalResultRu: (family) => `Каркас конструкции «${family}» выровнен в проектное положение.`,
    workTitleRu: (family) => `Выравнивание каркаса конструкции «${family}»`,
  },
  INSULATE: {
    labelRu: "укладка изоляции",
    physicalResultRu: (family) => `Полость конструкции «${family}» заполнена проектной изоляцией.`,
    workTitleRu: (family) => `Укладка изоляции в конструкцию «${family}»`,
  },
  CLAD: {
    labelRu: "обшивка листами",
    physicalResultRu: (family) => `Конструкция «${family}» обшита проектными листами без повторного учёта каркаса.`,
    workTitleRu: (family) => `Монтаж листовой обшивки конструкции «${family}»`,
  },
  FINISH_JOINT: {
    labelRu: "отделка швов",
    physicalResultRu: (family) => `Швы конструкции «${family}» заделаны до проектного уровня подготовки.`,
    workTitleRu: (family) => `Заделка швов конструкции «${family}»`,
  },
  REPAIR: {
    labelRu: "локальный ремонт",
    physicalResultRu: (family) => `Подтверждённый дефектный участок конструкции «${family}» восстановлен.`,
    workTitleRu: (family) => `Локальный ремонт конструкции «${family}»`,
  },
  INSTALL: {
    labelRu: "комплексный монтаж",
    physicalResultRu: (family) => `Конструкция «${family}» смонтирована как единый выбранный маршрут без одновременного учёта стадий.`,
    workTitleRu: (_family, installTitle) => installTitle,
  },
};

const VARIANT_APPLICABILITY: Readonly<Record<DrywallDomainCompletionVariantV7, string>> = {
  standard: "Стандартная конфигурация без дополнительных variant-ресурсов.",
  large_area: "Большая площадь: деформационные швы учитываются только по явной проектной длине.",
  small_area: "Малая площадь: подрезанные кромки учитываются только по явной длине.",
  technical_room: "Техническое помещение: усиление проёмов считается по количеству и периметру.",
  wet_zone: "Влажная зона: совместимый влагозащитный материал считается по явной норме.",
  high_load: "Высокая нагрузка: усиление учитывается только по проектной длине в явно выбранном CLAD или INSTALL catalog variant.",
};

function measureProfile(parsed: ParsedId): MeasureProfile {
  if (parsed.family === "joint") return { parameterId: "joint_length_m", unitId: "m", labelRu: "Проектная длина системного шва" };
  if (parsed.family === "revision_hatch") return { parameterId: "opening_count_item", unitId: "item", labelRu: "Количество ревизионных люков" };
  if (parsed.operation === "FINISH_JOINT") return { parameterId: "joint_length_m", unitId: "m", labelRu: "Подтверждённая длина обрабатываемых швов" };
  if (parsed.operation === "REPAIR") return { parameterId: "defect_area_m2", unitId: "m2", labelRu: "Подтверждённая площадь дефектного участка" };
  return { parameterId: "area_m2", unitId: "m2", labelRu: "Проектная площадь конструкции" };
}

function operationBlueprints(parsed: ParsedId, measure: MeasureProfile): ResourceBlueprint[] {
  const family = FAMILY_PROFILE[parsed.family];
  const work = OPERATION_SCOPE[parsed.operation];
  const primary = measure.parameterId;
  const rows: ResourceBlueprint[] = [];
  const material = (input: Omit<ResourceBlueprint, "sectionRu" | "category" | "procurementEligible">): void => {
    rows.push({ ...input, sectionRu: "Материалы", category: "material", procurementEligible: true });
  };
  if (parsed.operation === "PREPARE") {
    const isDrywallCeiling = parsed.family === "drywall_ceiling";
    material({
      key: "compatible_primer",
      titleRu: isDrywallCeiling
        ? "Грунтовка для существующего потолка из ГКЛ — марку и расход уточнить по паспорту продукта"
        : "Грунтовка для существующей гипсокартонной поверхности — марку уточнить",
      expression: `${primary} * primer_consumption_kg_per_measure`,
      inputs: [primary, "primer_consumption_kg_per_measure"],
      unitId: "kg",
      resourceClass: "compatible substrate primer",
    });
    material({
      key: "substrate_patch_compound",
      titleRu: "Шпаклёвочная смесь для локального ремонта ГКЛ, швов и мест крепления",
      expression: `${primary} * substrate_patch_fraction * patch_compound_kg_per_measure`,
      inputs: [primary, "substrate_patch_fraction", "patch_compound_kg_per_measure"],
      unitId: "kg",
      resourceClass: "measured substrate patch compound",
    });
    if (isDrywallCeiling) {
      material({ key: "joint_repair_tape", titleRu: "Армирующая бумажная лента для ремонтируемых швов ГКЛ", expression: `${primary} * substrate_patch_fraction * joint_repair_tape_m_per_repair_m2`, inputs: [primary, "substrate_patch_fraction", "joint_repair_tape_m_per_repair_m2"], unitId: "m", resourceClass: "measured drywall joint repair tape" });
      material({ key: "work_zone_protection", titleRu: "Защитное укрытие пола и оборудования технического помещения", expression: primary, inputs: [primary], unitId: measure.unitId, resourceClass: "measured work-zone protective covering" });
      rows.push(
        { key: "condition_survey", sectionRu: "Работы", category: "labor", titleRu: "Осмотр потолка из ГКЛ и разметка дефектов, швов и мест крепления", expression: primary, inputs: [primary], unitId: measure.unitId, procurementEligible: false, resourceClass: "drywall ceiling condition survey" },
        { key: "surface_dust_removal", sectionRu: "Работы", category: "labor", titleRu: "Очистка и обеспыливание поверхности потолка из ГКЛ", expression: primary, inputs: [primary], unitId: measure.unitId, procurementEligible: false, resourceClass: "drywall ceiling cleaning and dust removal" },
        { key: "local_joint_repair", sectionRu: "Работы", category: "labor", titleRu: "Локальная заделка дефектов, швов и головок крепежа ГКЛ", expression: `${primary} * substrate_patch_fraction`, inputs: [primary, "substrate_patch_fraction"], unitId: measure.unitId, procurementEligible: false, resourceClass: "measured drywall local repair labor" },
        { key: "primer_application", sectionRu: "Работы", category: "labor", titleRu: "Нанесение грунтовки на подготовленный потолок из ГКЛ", expression: primary, inputs: [primary], unitId: measure.unitId, procurementEligible: false, resourceClass: "measured drywall ceiling primer application" },
        { key: "dust_extraction_equipment", sectionRu: "Механизмы", category: "equipment", titleRu: "Промышленный пылесос для обеспыливания и шлифования ГКЛ", expression: "preparation_equipment_shift_count", inputs: ["preparation_equipment_shift_count"], unitId: "shift", procurementEligible: true, resourceClass: "drywall preparation dust extraction equipment" },
      );
    }
  } else if (parsed.operation === "FRAME") {
    material({ key: "system_frame", titleRu: family.frameMaterialRu, expression: `${primary} * framing_profile_m_per_measure`, inputs: [primary, "framing_profile_m_per_measure"], unitId: "m", resourceClass: `${parsed.family} frame system` });
    material({ key: "frame_fasteners", titleRu: "Системный крепёж каркаса по типу основания", expression: `${primary} * framing_fastener_item_per_measure`, inputs: [primary, "framing_fastener_item_per_measure"], unitId: "item", resourceClass: `${parsed.family} frame fasteners` });
  } else if (parsed.operation === "ALIGN") {
    material({ key: "alignment_hardware", titleRu: "Регулировочные элементы и крепёж выравниваемого каркаса", expression: `${primary} * alignment_item_per_measure`, inputs: [primary, "alignment_item_per_measure"], unitId: "item", resourceClass: `${parsed.family} alignment hardware` });
  } else if (parsed.operation === "INSULATE") {
    material({ key: "system_insulation", titleRu: family.insulationMaterialRu, expression: `${primary} * insulation_m2_per_measure`, inputs: [primary, "insulation_m2_per_measure"], unitId: "m2", resourceClass: `${parsed.family} insulation` });
    if (["fire_partition", "moisture_partition", "sound_partition", "shaft"].includes(parsed.family)) {
      material({ key: "insulation_perimeter_seal", titleRu: "Совместимое уплотнение периметра изоляционного слоя", expression: `${primary} * perimeter_sealant_kg_per_measure`, inputs: [primary, "perimeter_sealant_kg_per_measure"], unitId: "kg", resourceClass: `${parsed.family} insulation perimeter seal` });
    }
  } else if (parsed.operation === "CLAD") {
    material({ key: "system_board", titleRu: family.boardMaterialRu, expression: `${primary} * board_layer_count * board_m2_per_measure_layer`, inputs: [primary, "board_layer_count", "board_m2_per_measure_layer"], unitId: "m2", resourceClass: `${parsed.family} cladding board` });
    material({ key: "board_fasteners", titleRu: "Системные винты листовой обшивки", expression: `${primary} * board_layer_count * board_fastener_item_per_measure_layer`, inputs: [primary, "board_layer_count", "board_fastener_item_per_measure_layer"], unitId: "item", resourceClass: `${parsed.family} board fasteners` });
  } else if (parsed.operation === "FINISH_JOINT") {
    material({ key: "joint_compound", titleRu: "Шпаклёвочная смесь для системных швов и мест крепления", expression: `${primary} * joint_compound_kg_per_measure`, inputs: [primary, "joint_compound_kg_per_measure"], unitId: "kg", resourceClass: `${parsed.family} joint compound` });
    material({ key: "joint_tape", titleRu: "Армирующая лента совместимой системы швов", expression: `${primary} * joint_tape_m_per_measure`, inputs: [primary, "joint_tape_m_per_measure"], unitId: "m", resourceClass: `${parsed.family} joint tape` });
  } else if (parsed.operation === "REPAIR") {
    material({ key: "repair_board", titleRu: family.repairMaterialRu, expression: `${primary} * repair_board_m2_per_measure`, inputs: [primary, "repair_board_m2_per_measure"], unitId: "m2", resourceClass: `${parsed.family} repair board` });
    material({ key: "repair_compound", titleRu: "Совместимый состав заделки кромок ремонтного участка", expression: `${primary} * repair_compound_kg_per_measure`, inputs: [primary, "repair_compound_kg_per_measure"], unitId: "kg", resourceClass: `${parsed.family} repair compound` });
  } else {
    material({ key: "install_frame", titleRu: family.frameMaterialRu, expression: `${primary} * install_profile_m_per_measure`, inputs: [primary, "install_profile_m_per_measure"], unitId: "m", resourceClass: `${parsed.family} complete-install frame` });
    material({ key: "install_board", titleRu: family.boardMaterialRu, expression: `${primary} * board_layer_count * install_board_m2_per_measure_layer`, inputs: [primary, "board_layer_count", "install_board_m2_per_measure_layer"], unitId: "m2", resourceClass: `${parsed.family} complete-install board` });
    material({ key: "install_fasteners", titleRu: "Крепёж комплексного монтажа выбранной системы", expression: `${primary} * install_fastener_item_per_measure`, inputs: [primary, "install_fastener_item_per_measure"], unitId: "item", resourceClass: `${parsed.family} complete-install fasteners` });
    material({ key: "install_joint_materials", titleRu: "Системная смесь и лента финишной заделки стыков", expression: `${primary} * install_joint_compound_kg_per_measure`, inputs: [primary, "install_joint_compound_kg_per_measure"], unitId: "kg", resourceClass: `${parsed.family} complete-install joint materials` });
    if (["fire_partition", "sound_partition", "shaft"].includes(parsed.family)) {
      material({ key: "install_insulation", titleRu: family.insulationMaterialRu, expression: `${primary} * install_insulation_m2_per_measure`, inputs: [primary, "install_insulation_m2_per_measure"], unitId: "m2", resourceClass: `${parsed.family} complete-install insulation` });
    }
  }
  rows.push({
    key: "operation_work",
    sectionRu: "Измеримая строительная операция",
    category: "labor",
    titleRu: work.workTitleRu(family.labelRu, family.installWorkRu),
    expression: primary,
    inputs: [primary],
    unitId: measure.unitId,
    procurementEligible: false,
    resourceClass: `${parsed.family} ${parsed.operation.toLowerCase()} measurable work`,
  });
  return rows;
}

function variantBlueprints(parsed: ParsedId, measure: MeasureProfile): ResourceBlueprint[] {
  const primary = measure.parameterId;
  if (parsed.variant === "standard") return [];
  if (parsed.variant === "large_area") return [{ key: "large_area_control_joint", sectionRu: "Материалы варианта", category: "material", titleRu: "Профиль деформационного шва большой площади", expression: "control_joint_length_m", inputs: ["control_joint_length_m"], unitId: "m", procurementEligible: true, resourceClass: "large-area control-joint profile" }];
  if (parsed.variant === "small_area") return [{ key: "small_area_edge_profile", sectionRu: "Материалы варианта", category: "material", titleRu: "Профиль или лента подрезанных кромок малого участка", expression: "small_area_edge_length_m", inputs: ["small_area_edge_length_m"], unitId: "m", procurementEligible: true, resourceClass: "small-area cut-edge treatment" }];
  if (parsed.variant === "technical_room") return [{ key: "technical_opening_reinforcement", sectionRu: "Материалы варианта", category: "material", titleRu: "Профиль усиления инженерных проёмов технического помещения", expression: "technical_opening_count * technical_opening_perimeter_m", inputs: ["technical_opening_count", "technical_opening_perimeter_m"], unitId: "m", procurementEligible: true, resourceClass: "technical-room opening reinforcement" }];
  if (parsed.variant === "high_load") return [{ key: "high_load_reinforcement", sectionRu: "Материалы варианта", category: "material", titleRu: "Проектное усиление зоны высокой нагрузки", expression: "high_load_reinforcement_length_m", inputs: ["high_load_reinforcement_length_m"], unitId: "m", procurementEligible: true, resourceClass: "high-load project reinforcement" }];
  const wetUnit = ["CLAD", "INSULATE", "INSTALL"].includes(parsed.operation) ? "m2" : "kg";
  const wetRate = wetUnit === "m2" ? "wet_zone_material_m2_per_measure" : "wet_zone_material_kg_per_measure";
  return [{ key: "wet_zone_material", sectionRu: "Материалы варианта", category: "material", titleRu: wetUnit === "m2" ? "Совместимый влагозащитный слой влажной зоны" : "Совместимый герметизирующий состав влажной зоны", expression: `${primary} * ${wetRate}`, inputs: [primary, wetRate], unitId: wetUnit, procurementEligible: true, resourceClass: "wet-zone compatible protection" }];
}

function logisticsBlueprints(parsed: ParsedId): ResourceBlueprint[] {
  const accessTitle = ["drywall_ceiling", "bulkhead"].includes(parsed.family)
    ? "Передвижная вышка-тура или подмости с ограждением для потолочных работ"
    : "Вышка-тура, подмости, леса или подъёмник — выбор по рабочей высоте и ППР";
  const rows: ResourceBlueprint[] = [
    { key: "incoming_delivery", sectionRu: "Логистика", category: "transport", titleRu: "Единая входящая доставка материалов по подтверждённой массе и маршруту", expression: "(delivery_mass_kg / 1000) * delivery_distance_km", inputs: ["delivery_mass_kg", "delivery_distance_km"], unitId: "t_km", procurementEligible: true, resourceClass: "consolidated incoming material transport", inclusionCondition: "work_included=true AND delivery_required=true" },
    { key: "waste_haul", sectionRu: "Отходы", category: "transport", titleRu: "Единый вывоз подтверждённой массы строительных отходов", expression: "(waste_mass_kg / 1000) * waste_haul_distance_km", inputs: ["waste_mass_kg", "waste_haul_distance_km"], unitId: "t_km", procurementEligible: true, resourceClass: "consolidated construction waste transport", inclusionCondition: "work_included=true AND waste_haul_required=true" },
    { key: "access_equipment", sectionRu: "Оборудование доступа", category: "equipment", titleRu: accessTitle, expression: "access_equipment_shift_count", inputs: ["access_equipment_shift_count"], unitId: "shift", procurementEligible: true, resourceClass: "conditional access equipment measured by shift", inclusionCondition: "work_included=true AND access_equipment_required=true" },
    { key: "access_temporary_works", sectionRu: "Временные работы", category: "labor", titleRu: "Монтаж, ежесменная проверка, перестановка и демонтаж средств доступа", expression: "access_equipment_shift_count", inputs: ["access_equipment_shift_count"], unitId: "shift", procurementEligible: false, resourceClass: "conditional access temporary works", inclusionCondition: "work_included=true AND access_equipment_required=true" },
    { key: "access_delivery_return", sectionRu: "Логистика средств доступа", category: "transport", titleRu: "Доставка и возврат вышки-туры, подмостей, лесов или подъёмника", expression: "access_delivery_trip_count", inputs: ["access_delivery_trip_count"], unitId: "trip", procurementEligible: true, resourceClass: "conditional access equipment delivery and return", inclusionCondition: "work_included=true AND access_equipment_required=true" },
  ];
  if (parsed.family === "drywall_ceiling" && ["CLAD", "INSTALL"].includes(parsed.operation)) {
    rows.push({ key: "drywall_board_lift", sectionRu: "Монтажное оборудование", category: "equipment", titleRu: "Подъёмник листов ГКЛ для монтажа потолка", expression: "access_equipment_shift_count", inputs: ["access_equipment_shift_count"], unitId: "shift", procurementEligible: true, resourceClass: "drywall ceiling board lift", inclusionCondition: "work_included=true AND access_equipment_required=true" });
  }
  return rows;
}

const PARAMETER_METADATA: Readonly<Record<string, { labelRu: string; unitId: string | null; minimum: number; maximum?: number }>> = {
  primer_consumption_kg_per_measure: { labelRu: "Расход выбранной грунтовки на единицу основания", unitId: "kg_per_measure", minimum: 0.000001 },
  substrate_patch_fraction: { labelRu: "Подтверждённая доля локального ремонта основания", unitId: "fraction", minimum: 0, maximum: 1 },
  patch_compound_kg_per_measure: { labelRu: "Расход ремонтного состава на единицу дефектного основания", unitId: "kg_per_measure", minimum: 0.000001 },
  framing_profile_m_per_measure: { labelRu: "Проектная длина профилей на единицу конструкции", unitId: "m_per_measure", minimum: 0.000001 },
  framing_fastener_item_per_measure: { labelRu: "Количество креплений каркаса на единицу конструкции", unitId: "item_per_measure", minimum: 0.000001 },
  alignment_item_per_measure: { labelRu: "Количество регулировочных элементов на единицу конструкции", unitId: "item_per_measure", minimum: 0.000001 },
  insulation_m2_per_measure: { labelRu: "Площадь изоляции на единицу конструкции", unitId: "m2_per_measure", minimum: 0.000001 },
  perimeter_sealant_kg_per_measure: { labelRu: "Расход уплотнения периметра на единицу конструкции", unitId: "kg_per_measure", minimum: 0.000001 },
  board_layer_count: { labelRu: "Проектное число слоёв листовой обшивки", unitId: "item", minimum: 1, maximum: 8 },
  board_m2_per_measure_layer: { labelRu: "Площадь листа на единицу конструкции и один слой", unitId: "m2_per_measure_layer", minimum: 0.000001 },
  board_fastener_item_per_measure_layer: { labelRu: "Крепёж листа на единицу конструкции и один слой", unitId: "item_per_measure_layer", minimum: 0.000001 },
  joint_compound_kg_per_measure: { labelRu: "Расход шпаклёвочной смеси на единицу шва", unitId: "kg_per_measure", minimum: 0.000001 },
  joint_tape_m_per_measure: { labelRu: "Длина армирующей ленты на единицу шва", unitId: "m_per_measure", minimum: 0.000001 },
  repair_board_m2_per_measure: { labelRu: "Площадь ремонтного листа на единицу дефекта", unitId: "m2_per_measure", minimum: 0.000001 },
  repair_compound_kg_per_measure: { labelRu: "Расход ремонтного состава на единицу дефекта", unitId: "kg_per_measure", minimum: 0.000001 },
  install_profile_m_per_measure: { labelRu: "Проектная длина профилей комплексного монтажа на единицу", unitId: "m_per_measure", minimum: 0.000001 },
  install_board_m2_per_measure_layer: { labelRu: "Площадь листа комплексного монтажа на единицу и слой", unitId: "m2_per_measure_layer", minimum: 0.000001 },
  install_fastener_item_per_measure: { labelRu: "Крепёж комплексного монтажа на единицу конструкции", unitId: "item_per_measure", minimum: 0.000001 },
  install_joint_compound_kg_per_measure: { labelRu: "Смесь заделки стыков комплексного монтажа на единицу", unitId: "kg_per_measure", minimum: 0.000001 },
  install_insulation_m2_per_measure: { labelRu: "Изоляция комплексного монтажа на единицу конструкции", unitId: "m2_per_measure", minimum: 0.000001 },
  control_joint_length_m: { labelRu: "Проектная длина деформационных швов большой площади", unitId: "m", minimum: 0 },
  small_area_edge_length_m: { labelRu: "Длина подрезанных кромок малого участка", unitId: "m", minimum: 0 },
  technical_opening_count: { labelRu: "Количество инженерных проёмов", unitId: "item", minimum: 0 },
  technical_opening_perimeter_m: { labelRu: "Средний проектный периметр инженерного проёма", unitId: "m_per_item", minimum: 0 },
  high_load_reinforcement_length_m: { labelRu: "Проектная длина усиления зоны высокой нагрузки", unitId: "m", minimum: 0 },
  wet_zone_material_m2_per_measure: { labelRu: "Площадь влагозащитного материала на единицу конструкции", unitId: "m2_per_measure", minimum: 0.000001 },
  wet_zone_material_kg_per_measure: { labelRu: "Расход герметизирующего состава на единицу конструкции", unitId: "kg_per_measure", minimum: 0.000001 },
  delivery_mass_kg: { labelRu: "Подтверждённая масса единой входящей доставки", unitId: "kg", minimum: 0 },
  delivery_distance_km: { labelRu: "Подтверждённое плечо единой входящей доставки", unitId: "km", minimum: 0 },
  waste_mass_kg: { labelRu: "Подтверждённая масса вывозимых отходов", unitId: "kg", minimum: 0 },
  waste_haul_distance_km: { labelRu: "Подтверждённое плечо вывоза отходов", unitId: "km", minimum: 0 },
  access_equipment_shift_count: { labelRu: "Подтверждённое число смен оборудования доступа", unitId: "shift", minimum: 0 },
  access_delivery_trip_count: { labelRu: "Количество рейсов доставки и возврата средств доступа", unitId: "trip", minimum: 0 },
  joint_repair_tape_m_per_repair_m2: { labelRu: "Длина армирующей ленты на м² локального ремонта ГКЛ", unitId: "m_per_m2", minimum: 0 },
  preparation_equipment_shift_count: { labelRu: "Число смен пылеудаления и малой механизации", unitId: "shift", minimum: 0 },
};

function conditionFor(parameterId: string): ProfessionalParameterConditionV1 {
  if (["delivery_mass_kg", "delivery_distance_km"].includes(parameterId)) return { kind: "EQUALS", parameter_id: "delivery_required", value: true };
  if (["waste_mass_kg", "waste_haul_distance_km"].includes(parameterId)) return { kind: "EQUALS", parameter_id: "waste_haul_required", value: true };
  if (["access_equipment_shift_count", "access_delivery_trip_count"].includes(parameterId)) return { kind: "EQUALS", parameter_id: "access_equipment_required", value: true };
  return { kind: "ALWAYS" };
}

function parameter(input: {
  parameterId: string;
  labelRu: string;
  inputType?: Batch004R56ParameterDefinition["inputType"];
  unitId?: string | null;
  minimum?: number | null;
  maximum?: number | null;
  choices?: readonly string[];
  requiredWhen?: ProfessionalParameterConditionV1;
}): Batch004R56ParameterDefinition {
  return {
    parameterId: input.parameterId,
    labelRu: input.labelRu,
    inputType: input.inputType ?? "number",
    unitId: input.unitId ?? null,
    minimum: input.minimum ?? null,
    maximum: input.maximum ?? null,
    choices: input.choices ?? [],
    visibleWhen: input.requiredWhen ?? { kind: "ALWAYS" },
    requiredWhen: input.requiredWhen ?? { kind: "ALWAYS" },
    formulaConsumerIds: [],
    sourceOwnership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "MATERIAL_PASSPORT", "VERIFIED_RATEBOOK"],
    defaultValue: null,
    missingValuePolicy: "FAIL_CLOSED",
  };
}

function parameterFor(parameterId: string, measure: MeasureProfile): Batch004R56ParameterDefinition {
  if (parameterId === measure.parameterId) return parameter({ parameterId, labelRu: measure.labelRu, unitId: measure.unitId, minimum: 0.000001 });
  if (parameterId.startsWith("unit_price_")) return parameter({ parameterId, labelRu: `Цена строки ${parameterId.slice("unit_price_".length)}`, unitId: "KGS_per_output_unit", minimum: 0.01 });
  const metadata = PARAMETER_METADATA[parameterId];
  if (!metadata) throw new Error(`BATCH004_R56_PARAMETER_METADATA_MISSING:${parameterId}`);
  return parameter({ parameterId, ...metadata, requiredWhen: conditionFor(parameterId) });
}

function normativeTrace(parsed: ParsedId, projectInput: string): readonly ProfessionalNormativeRowTraceV3[] {
  return [
    { source_id: "KG_SP_KR_65_101_2025", document_code: "СП КР 65-101:2025", edition: "2025", exact_locator: `Применимые требования к ${OPERATION_SCOPE[parsed.operation].labelRu}`, source_role: "WORK_EXECUTION", applicability: `Технология ${FAMILY_PROFILE[parsed.family].labelRu}; объём и расход вводятся явно.`, foreign_mandatory_for_kg: false },
    { source_id: parsed.operation === "REPAIR" ? "kg_krerr_2015_application_guidance" : "KG_KRER_10_05_011", document_code: parsed.operation === "REPAIR" ? "КРЕРр-2015" : "КРЕР 10-05-011", edition: parsed.operation === "REPAIR" ? "2015" : "действующая применимая часть", exact_locator: parsed.operation === "REPAIR" ? "Применимые указания к ремонтным работам" : "Таблица 10-05-011; только применимые ресурсы", source_role: "QUANTITY_NORM", applicability: "Не переносит полный состав расценки; каждая норма остаётся явным проверяемым input.", foreign_mandatory_for_kg: false },
    { source_id: "PROJECT_DRYWALL_SYSTEM_PASSPORT_R56", document_code: "Проект и паспорт комплектной системы", edition: "точная проектная ревизия", exact_locator: projectInput, source_role: "PROJECT_INPUT", applicability: "Определяет геометрию, тип материала, совместимость и проектные нормы; отсутствие данных закрывает расчёт.", foreign_mandatory_for_kg: false },
  ];
}

function sourcePack(
  parsed: ParsedId,
  catalogId: string,
  formulas: readonly Batch004R56FormulaDefinition[],
  resources: readonly Batch004R56ResourceDefinition[],
): Batch004R56EngineeringSourcePack {
  const sources: Batch004R56EngineeringSource[] = [
    { sourceId: "KG_SP_KR_65_101_2025", documentCode: "СП КР 65-101:2025", edition: "2025", exactLocator: `Применимые разделы: ${OPERATION_SCOPE[parsed.operation].labelRu}`, sourceRole: "WORK_EXECUTION", applicabilityRu: `Семейство ${FAMILY_PROFILE[parsed.family].labelRu}, вариант ${parsed.variant}.`, primary: true },
    { sourceId: parsed.operation === "REPAIR" ? "kg_krerr_2015_application_guidance" : "KG_KRER_10_05_011", documentCode: parsed.operation === "REPAIR" ? "КРЕРр-2015" : "КРЕР 10-05-011", edition: parsed.operation === "REPAIR" ? "2015" : "применимая действующая часть", exactLocator: parsed.operation === "REPAIR" ? "Указания по ремонтным работам" : "Таблица 10-05-011", sourceRole: "QUANTITY_NORM", applicabilityRu: "Только применимые нормы с явными inputs; без полного переноса состава.", primary: true },
    { sourceId: "PROJECT_DRYWALL_SYSTEM_PASSPORT_R56", documentCode: "Проект/паспорт комплектной системы", edition: "точная проектная ревизия", exactLocator: "product_profile_id + system_passport_reference + material_certificate_reference", sourceRole: "PROJECT_INPUT", applicabilityRu: "Источник проектной геометрии, расхода, совместимости и variant-параметров.", primary: true },
    { sourceId: "PROJECT_SUPPLIER_OR_CONTRACT_PRICE_R56", documentCode: "Коммерческое предложение/договор", edition: "price_basis_date", exactLocator: "price_basis_reference", sourceRole: "PRICE_INPUT", applicabilityRu: "Цена каждой физической строки вводится отдельно и проверяется как положительная.", primary: false },
  ];
  const consumers = new Map<string, Set<string>>();
  for (const formula of formulas) for (const input of formula.inputParameterIds) {
    const set = consumers.get(input) ?? new Set<string>();
    set.add(formula.formulaId);
    consumers.set(input, set);
  }
  for (const resource of resources) {
    if (resource.priceRoute?.kind !== "RUNTIME_VALIDATED_INPUT") continue;
    const parameterId = resource.priceRoute.unit_price_parameter_id;
    const set = consumers.get(parameterId) ?? new Set<string>();
    set.add(`price-route:${resource.rowId}`);
    consumers.set(parameterId, set);
  }
  const quantitativeBindings = [...consumers.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([parameterId, consumerIds]) => ({
    parameterId,
    formulaConsumerIds: [...consumerIds].sort(),
    sourceIds: parameterId.startsWith("unit_price_") ? ["PROJECT_SUPPLIER_OR_CONTRACT_PRICE_R56"] : ["PROJECT_DRYWALL_SYSTEM_PASSPORT_R56", "KG_SP_KR_65_101_2025"],
    hiddenDefault: false as const,
    missingValuePolicy: "FAIL_CLOSED" as const,
  }));
  const withoutHash = { schemaVersion: "Batch004R56EngineeringSourcePack" as const, catalogId, ...parsed, sources, quantitativeBindings };
  return { ...withoutHash, sourcePackHash: sha256(withoutHash) };
}

function buildDefinitionWithoutHash(catalogId: string): Omit<Batch004R56CanonicalSuccessorDefinition, "definitionSha256"> {
  if (!(DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7 as readonly string[]).includes(catalogId)) throw new Error(`BATCH004_R56_OUTSIDE_SCOPE:${catalogId}`);
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((entry) => entry.catalog_id === catalogId);
  if (!inventory) throw new Error(`BATCH004_R56_INVENTORY_MISSING:${catalogId}`);
  const parsed = parseCatalogId(catalogId);
  const measure = measureProfile(parsed);
  const blueprints = [...operationBlueprints(parsed, measure), ...variantBlueprints(parsed, measure), ...logisticsBlueprints(parsed)];
  if (new Set(blueprints.map((entry) => entry.key)).size !== blueprints.length) throw new Error(`BATCH004_R56_ROW_DUPLICATE:${catalogId}`);
  const formulas: Batch004R56FormulaDefinition[] = blueprints.map((entry) => ({
    formulaId: `${catalogId}:successor-r56:formula:${entry.key}`,
    expressionSource: entry.expression,
    inputParameterIds: [...entry.inputs],
    outputUnitId: entry.unitId,
  }));
  const ownerId = drywallDomainProfessionalOwnerIdV7(catalogId);
  const resources: Batch004R56ResourceDefinition[] = blueprints.map((entry, ordinal) => {
    const semanticOwnerId = `${ownerId}:successor-r56:row:${entry.key}`;
    const priceParameterId = `unit_price_${entry.key}`;
    const priceRoute: ProfessionalAssemblyPriceRouteV3 = { kind: "RUNTIME_VALIDATED_INPUT", unit_price_parameter_id: priceParameterId, price_basis_reference_parameter_id: "price_basis_reference", price_basis_date_parameter_id: "price_basis_date", currency_from_request: true, minimum_exclusive: 0 };
    const resourceGraph: ProfessionalResourceGraphNodeV3 = { graph_version: "ProfessionalResourceGraphV3", typed_child_boundary: parsed.operation as ProfessionalResourceGraphNodeV3["typed_child_boundary"], resource_class: entry.resourceClass, dependency_ids: [], non_cost_dependencies_only: false, context_parameter_ids: [measure.parameterId, "product_profile_id", "system_passport_reference"], forbidden_cost_scopes: ["documentation", "journal", "internal control", "generic worker hour", "generic machine hour", "duplicate logistics"] };
    return {
      rowId: `${catalogId}:successor-r56:row:${entry.key}`,
      ordinal,
      sectionRu: entry.sectionRu,
      category: entry.category,
      titleRu: entry.titleRu,
      formulaId: formulas[ordinal].formulaId,
      outputUnitId: entry.unitId,
      inclusionCondition: entry.inclusionCondition ?? "work_included=true",
      costOwnership: "priced_resource",
      costOwnerId: `${catalogId}:successor-r56:cost:${entry.key}`,
      semanticOwnerId,
      procurementOwnerId: entry.procurementEligible ? `${semanticOwnerId}:procurement` : null,
      procurementEligible: entry.procurementEligible,
      priceRoute,
      resourceGraph,
      normativeTrace: normativeTrace(parsed, `Формула ${formulas[ordinal].formulaId}`),
      normativeSourceIds: ["KG_SP_KR_65_101_2025", parsed.operation === "REPAIR" ? "kg_krerr_2015_application_guidance" : "KG_KRER_10_05_011", "PROJECT_DRYWALL_SYSTEM_PASSPORT_R56"],
    };
  });
  const candidates = new Map<string, Batch004R56ParameterDefinition>([
    ["work_included", parameter({ parameterId: "work_included", labelRu: "Включить выбранную работу", inputType: "boolean" })],
    ["estimate_scope_mode", parameter({ parameterId: "estimate_scope_mode", labelRu: "Режим состава сметы", inputType: "choice", choices: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"] })],
    ["project_type", parameter({ parameterId: "project_type", labelRu: "Тип объекта", inputType: "text" })],
    ["product_profile_id", parameter({ parameterId: "product_profile_id", labelRu: "Точная комплектная система", inputType: "text" })],
    ["system_passport_reference", parameter({ parameterId: "system_passport_reference", labelRu: "Паспорт комплектной системы", inputType: "text" })],
    ["material_certificate_reference", parameter({ parameterId: "material_certificate_reference", labelRu: "Сертификат выбранной партии", inputType: "text" })],
    ["price_basis_reference", parameter({ parameterId: "price_basis_reference", labelRu: "Основание цен", inputType: "text" })],
    ["price_basis_date", parameter({ parameterId: "price_basis_date", labelRu: "Дата основания цен", inputType: "text" })],
    ["delivery_required", parameter({ parameterId: "delivery_required", labelRu: "Доставка оплачивается отдельно", inputType: "boolean" })],
    ["waste_haul_required", parameter({ parameterId: "waste_haul_required", labelRu: "Вывоз отходов входит в scope", inputType: "boolean" })],
    ["access_equipment_required", parameter({ parameterId: "access_equipment_required", labelRu: "Требуется оборудование доступа по ППР", inputType: "boolean" })],
    ["working_height_m", parameter({ parameterId: "working_height_m", labelRu: "Рабочая высота", unitId: "m", minimum: 0, maximum: 300 })],
  ]);
  if (parsed.operation === "REPAIR") {
    candidates.set("normative_rate_code", parameter({
      parameterId: "normative_rate_code",
      labelRu: "Точный применимый код расценки КРЕРр-2015",
      inputType: "text",
    }));
  }
  const requiredIds = new Set(candidates.keys());
  const consumers = new Map<string, Set<string>>();
  for (const formula of formulas) for (const input of formula.inputParameterIds) {
    requiredIds.add(input);
    const set = consumers.get(input) ?? new Set<string>();
    set.add(formula.formulaId);
    consumers.set(input, set);
  }
  for (const resource of resources) {
    const priceId = resource.priceRoute?.kind === "RUNTIME_VALIDATED_INPUT" ? resource.priceRoute.unit_price_parameter_id : null;
    if (!priceId) continue;
    requiredIds.add(priceId);
    const set = consumers.get(priceId) ?? new Set<string>();
    set.add(`price-route:${resource.rowId}`);
    consumers.set(priceId, set);
  }
  for (const id of requiredIds) if (!candidates.has(id)) candidates.set(id, parameterFor(id, measure));
  const parameters = [...requiredIds].sort().map((id) => ({ ...candidates.get(id)!, formulaConsumerIds: [...(consumers.get(id) ?? [])].sort() }));
  const engineeringSourcePack = sourcePack(parsed, catalogId, formulas, resources);
  const operation = OPERATION_SCOPE[parsed.operation];
  const family = FAMILY_PROFILE[parsed.family];
  const passport: Batch004R56ContentPassport = {
    schemaVersion: "Batch004R56ContentPassport",
    catalogId,
    titleRu: inventory.localized_name_ru,
    aliasesRu: [`${operation.labelRu}: ${family.labelRu}`, `${family.labelRu}: ${parsed.variant}`],
    physicalResultRu: operation.physicalResultRu(family.labelRu),
    includedScopeRu: [operation.physicalResultRu(family.labelRu), "Только применимые материалы, измеримая операция, одна доставка, один вывоз и условное оборудование доступа."],
    excludedScopeRu: ["Документы, журналы, акты и внутренний контроль как строки сметы.", "Универсальные человеко-часы и машино-часы.", "Повторная доставка, погрузка, разгрузка и внутренние перемещения отдельными строками.", parsed.operation === "INSTALL" ? "Одновременный учёт отдельных стадий PREPARE/FRAME/ALIGN/INSULATE/CLAD/FINISH_JOINT." : "Комплексный INSTALL-маршрут в той же смете."],
    ...parsed,
    variantApplicabilityRu: VARIANT_APPLICABILITY[parsed.variant],
    productionOwnerId: ownerId,
    calculationStrategyId: drywallDomainCalculationStrategyIdV7(catalogId),
    parameterCount: parameters.length,
    formulaCount: formulas.length,
    resourceCount: resources.length,
    engineeringSourcePack,
    semanticOwners: resources.map((entry) => entry.semanticOwnerId).sort(),
    costOwners: resources.map((entry) => entry.costOwnerId).sort(),
    procurementOwners: resources.flatMap((entry) => entry.procurementOwnerId ? [entry.procurementOwnerId] : []).sort(),
    predecessorNoiseRowsCarriedForwardCount: 0,
    hiddenQuantitativeAssumptionCount: 0,
    documentationBoqRowCount: 0,
    genericHourBoqRowCount: 0,
    deliveryBoqRowCount: 1,
    wasteHaulBoqRowCount: 1,
    disposition: "REAL_WORK",
  };
  return {
    executionContract: "MASTER_EXECUTION_TZ_R5_6_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU",
    batchId: "BATCH-004",
    successorVersion: "Batch004CanonicalSuccessorR56",
    disposition: "REAL_WORK",
    catalogId,
    titleRu: inventory.localized_name_ru,
    ...parsed,
    ownerId,
    calculationStrategyId: drywallDomainCalculationStrategyIdV7(catalogId),
    passport,
    parameters,
    formulas,
    resources,
  };
}

export function buildBatch004R56CanonicalSuccessorDefinition(catalogId: string): Batch004R56CanonicalSuccessorDefinition {
  const withoutHash = buildDefinitionWithoutHash(catalogId);
  return { ...withoutHash, definitionSha256: sha256(withoutHash) };
}

export function buildAllBatch004R56CanonicalSuccessorDefinitions(): readonly Batch004R56CanonicalSuccessorDefinition[] {
  return DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7.map(buildBatch004R56CanonicalSuccessorDefinition);
}

export type DrywallDomainCompletionSuccessorPackagePartsR56 = {
  contract: {
    group: DrywallDomainCompletionOperationV7;
    variant: DrywallDomainCompletionVariantV7;
    catalogId: string;
    successorVersion: "Batch004CanonicalSuccessorR56";
  };
  schema: ProfessionalDomainParameterSchemaV1;
  child_assemblies: readonly ProfessionalChildAssemblyV4[];
  normative_profile: ProfessionalNormativeProfileV1;
  required_stages: readonly string[];
  optional_stages: readonly string[];
  resource_policy: ProfessionalResourceCompletenessPolicyV1;
};

const BOTH_SCOPE_MODES_R56: readonly ProfessionalEstimateScopeModeV4[] = [
  "MINIMAL_EXPLICIT_SCOPE",
  "FULL_APPLICABLE_SCOPE",
];

function assemblyRole(parameterId: string): ProfessionalAssemblyParameterDefinitionV4["role"] {
  if (parameterId === "work_included") return "SCOPE_TRIGGER";
  if (parameterId === "normative_rate_code") return "NORM_RATE";
  if (parameterId === "price_basis_reference" || parameterId === "price_basis_date") return "PRICE_SOURCE_REFERENCE";
  if (parameterId.startsWith("unit_price_")) return "PRICE_INPUT";
  if (parameterId.startsWith("delivery_") || parameterId.startsWith("waste_") || parameterId.startsWith("access_equipment_")) {
    return "LOGISTICS_VALUE";
  }
  if (parameterId.includes("passport") || parameterId.includes("certificate") || parameterId === "product_profile_id") {
    return "MATERIAL_PASSPORT_VALUE";
  }
  return "PROJECT_QUANTITY";
}

export function buildDrywallDomainCompletionSuccessorPackagePartsR56(
  inventory: InteriorFinishesDomainInventoryRow,
): DrywallDomainCompletionSuccessorPackagePartsR56 | null {
  if (!(DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7 as readonly string[]).includes(inventory.catalog_id)) return null;
  const definition = buildBatch004R56CanonicalSuccessorDefinition(inventory.catalog_id);
  const parameters: ProfessionalDomainParameterDefinitionV1[] = definition.parameters.map((entry) => ({
    parameter_id: entry.parameterId,
    label_ru: entry.labelRu,
    unit_id: entry.unitId,
    priority: entry.requiredWhen.kind === "ALWAYS" ? "P0" : "P1",
    input_type: entry.inputType,
    ...(entry.choices.length > 0 ? { choices: entry.choices.map((value) => ({ value, label_ru: value })) } : {}),
    ...(entry.inputType === "number" ? {
      minimum: entry.minimum ?? 0,
      maximum: entry.maximum ?? 1_000_000_000_000,
    } : {}),
    visible_when: entry.visibleWhen,
    required_when: entry.requiredWhen,
    formula_consumers: entry.formulaConsumerIds,
    source_ownership: entry.sourceOwnership,
  }));
  const schema: ProfessionalDomainParameterSchemaV1 = {
    schema_id: `${definition.catalogId}:successor-r56:parameter-schema`,
    schema_version: "5.6.0",
    technology_id: inventory.canonical_technology_id,
    parameters,
    quantity_alternatives: [[r56MeasureParameterId(definition)]],
    derived_parameter_rules: [],
  };
  const assemblyParameters: ProfessionalAssemblyParameterDefinitionV4[] = definition.parameters.map((entry) => ({
    parameter_id: entry.parameterId,
    title_ru: entry.labelRu,
    role: assemblyRole(entry.parameterId),
    unit_id: entry.unitId,
    required_for: entry.requiredWhen.kind === "ALWAYS" ? BOTH_SCOPE_MODES_R56 : [],
  }));
  const formulaById = new Map(definition.formulas.map((formula) => [formula.formulaId, formula]));
  const rows: ProfessionalAssemblyRowDefinitionV4[] = definition.resources.map((resource) => {
    const formulaDefinition = formulaById.get(resource.formulaId);
    if (!formulaDefinition) throw new Error(`BATCH004_R56_PRODUCTION_FORMULA_MISSING:${resource.rowId}`);
    const compiled = compileFormulaGraph(formulaDefinition.expressionSource);
    const formula: ProfessionalAssemblyFormulaV4 = {
      formula_id: formulaDefinition.formulaId,
      expression: formulaDefinition.expressionSource,
      input_parameter_ids: formulaDefinition.inputParameterIds,
      output_unit_id: formulaDefinition.outputUnitId,
      calculate: (values) => Number(evaluateFormulaGraph(compiled, { ...values })),
    };
    return {
      row_id: resource.rowId,
      section: resource.sectionRu,
      category: resource.category as ProfessionalAssemblyRowDefinitionV4["category"],
      title_ru: resource.titleRu,
      formula,
      cost_ownership: resource.costOwnership,
      cost_owner_id: resource.costOwnerId,
      semantic_owner: resource.semanticOwnerId,
      normative_source_ids: resource.normativeSourceIds,
      inclusion_condition: resource.inclusionCondition,
      procurement_eligible: resource.procurementEligible,
      ...(resource.normativeTrace.length > 0 ? { normative_trace_v3: resource.normativeTrace } : {}),
      ...(resource.priceRoute ? { price_route_v3: resource.priceRoute } : {}),
      ...(resource.resourceGraph ? { resource_graph_node_v3: resource.resourceGraph } : {}),
      normative_proof_bundle_id_v3: `Batch004R56NormativeProof:${definition.catalogId}`,
      professional_proof_bundle_id_v3: `Batch004R56ProfessionalProof:${definition.catalogId}`,
    };
  });
  const child: ProfessionalChildAssemblyV4 = {
    child_passport_id: `${definition.catalogId}:successor-r56:child-passport`,
    child_passport_version: "5.6.0",
    domain_owner: "interior_finishes_complete_r56",
    assembly_id: `${definition.catalogId}:successor-r56:assembly`,
    title_ru: definition.passport.physicalResultRu,
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true],
    supported_scope_modes: BOTH_SCOPE_MODES_R56,
    parameters: assemblyParameters,
    rows,
  };
  return {
    contract: {
      group: definition.operation,
      variant: definition.variant,
      catalogId: definition.catalogId,
      successorVersion: definition.successorVersion,
    },
    schema,
    child_assemblies: [child],
    normative_profile: {
      profile_id: `${definition.catalogId}:successor-r56:kg-profile`,
      profile_version: "5.6.0",
      technology_id: inventory.canonical_technology_id,
      jurisdiction: "KG",
      // The applicability registry owns published normative sources. Project
      // passports and supplier prices remain fail-closed parameter/price
      // routes on the rows and must not be presented as normative documents.
      requested_source_ids: [...new Set([
        ...definition.passport.engineeringSourcePack.sources
          .filter((source) => source.sourceRole === "WORK_EXECUTION" || source.sourceRole === "QUANTITY_NORM")
          .map((source) => source.sourceId),
        "KG_DRYWALL_MATERIAL_CONFORMITY_ROUTE",
      ])],
      requested_source_types: ["WORK_EXECUTION_STANDARD", "RESOURCE_ESTIMATE_NORM", "MATERIAL_STANDARD"],
      rejected_foreign_source_ids: ["RU_GESN_10", "RU_FER_10", "ISO_6308_WITHDRAWN"],
    },
    required_stages: [definition.operation, "CONSOLIDATED_LOGISTICS", "WASTE_HAUL"],
    optional_stages: ["ACCESS_EQUIPMENT_WHEN_REQUIRED"],
    resource_policy: {
      policy_id: `${definition.catalogId}:successor-r56:resource-policy`,
      technology_id: inventory.canonical_technology_id,
      required_categories: ["material", "labor", "transport", "equipment"],
      optional_categories: [],
      forbidden_generic_rows: ["Материалы", "Работы", "Оборудование", "Другое", "Комплект работ", "Исполнительная документация"],
      one_bundle_resource_replacement_forbidden: true,
    },
  };
}

function r56MeasureParameterId(definition: Batch004R56CanonicalSuccessorDefinition): string {
  if (definition.family === "joint") return "joint_length_m";
  if (definition.family === "revision_hatch") return "opening_count_item";
  if (definition.operation === "FINISH_JOINT") return "joint_length_m";
  if (definition.operation === "REPAIR") return "defect_area_m2";
  return "area_m2";
}

function valueType(parameterDefinition: Batch004R56ParameterDefinition): "decimal" | "boolean" | "enum" | "text" {
  if (parameterDefinition.inputType === "number") return "decimal";
  if (parameterDefinition.inputType === "boolean") return "boolean";
  if (parameterDefinition.inputType === "choice") return "enum";
  return "text";
}

function inclusionAst(resource: Batch004R56ResourceDefinition): Record<string, unknown> {
  const work = { kind: "parameter", id: "work_included" };
  if (resource.inclusionCondition === "work_included=true") return work;
  const match = resource.inclusionCondition.match(/^work_included=true AND (delivery_required|waste_haul_required|access_equipment_required)=true$/u);
  if (!match) throw new Error(`BATCH004_R56_INCLUSION_UNSUPPORTED:${resource.rowId}`);
  return { kind: "and", operands: [work, { kind: "equals", parameterId: match[1], value: true }] };
}

export async function compileBatch004R56ThroughSharedCore(input: {
  definition: Batch004R56CanonicalSuccessorDefinition;
  values: Readonly<Record<string, Scalar>>;
  operation?: "compile" | "recalculate";
}): Promise<CanonicalEstimateCompileCoreResult> {
  const parameterDefinitions = input.definition.parameters.map((entry) => ({
    parameter_id: entry.parameterId,
    value_type: valueType(entry),
    required: entry.requiredWhen.kind === "ALWAYS",
    default_value: null,
    constraints_json: {
      ...(entry.minimum == null ? {} : { min: entry.minimum }),
      ...(entry.maximum == null ? {} : { max: entry.maximum }),
      ...(entry.choices.length === 0 ? {} : { values: entry.choices }),
      ...(entry.inputType === "text" ? { maxLength: 1_000 } : {}),
      ...(entry.requiredWhen.kind === "EQUALS" ? { requiredWhen: { parameterId: entry.requiredWhen.parameter_id, equals: entry.requiredWhen.value } } : {}),
    },
    truth_metadata: { value_source_role: "EXPLICIT_NO_HIDDEN_DEFAULT", formula_consumers: entry.formulaConsumerIds, engineering_source_pack_hash: input.definition.passport.engineeringSourcePack.sourcePackHash },
  }));
  const formulaDefinitions = input.definition.formulas.map((entry) => {
    const compiled = compileFormulaGraph(entry.expressionSource);
    if (canonicalEstimateStableJson(compiled.inputParameterIds) !== canonicalEstimateStableJson([...entry.inputParameterIds].sort())) throw new Error(`BATCH004_R56_FORMULA_INPUT_DRIFT:${entry.formulaId}`);
    return { formula_id: entry.formulaId, ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds, ast_sha256: sha256(compiled.ast) };
  });
  const resourceDefinitions = input.definition.resources.map((entry) => {
    const resourceGraph = { contract: "real-professional-estimates-r5.6.batch004-resource-graph.v1", domain: "interior_finishes", family: input.definition.family, operation: input.definition.operation, variant: input.definition.variant, semanticOwnerId: entry.semanticOwnerId, procurementOwnerId: entry.procurementOwnerId, sourceResourceGraph: entry.resourceGraph };
    const sourceMetadata = { normativeTrace: entry.normativeTrace, normativeSourceIds: entry.normativeSourceIds, engineeringSourcePackHash: input.definition.passport.engineeringSourcePack.sourcePackHash, priceRoute: entry.priceRoute };
    return { id: entry.rowId, row_id: entry.rowId, ordinal: entry.ordinal, section: entry.sectionRu, category: entry.category, title_ru: entry.titleRu, unit_id: entry.outputUnitId, formula_id: entry.formulaId, inclusion_ast: inclusionAst(entry), resource_graph: resourceGraph, procurement_eligible: entry.procurementEligible, cost_owner_id: entry.costOwnerId, source_metadata: sourceMetadata, row_sha256: sha256({ entry, resourceGraph, sourceMetadata }) };
  });
  const priceItems = input.definition.resources.map((entry) => {
    if (entry.priceRoute?.kind !== "RUNTIME_VALIDATED_INPUT") throw new Error(`BATCH004_R56_PRICE_ROUTE_MISSING:${entry.rowId}`);
    const unitPrice = input.values[entry.priceRoute.unit_price_parameter_id];
    if (typeof unitPrice !== "number" && typeof unitPrice !== "string") throw new Error(`BATCH004_R56_PRICE_INPUT_MISSING:${entry.rowId}`);
    return { price_key: entry.costOwnerId, unit_id: entry.outputUnitId, currency_code: "KGS", unit_price: unitPrice, snapshot_id: "batch004-r56-explicit-price-snapshot", estimate_price_snapshot: { route_id: "batch004-r56-explicit-price-route" } };
  });
  return compileCanonicalEstimateCore({ operation: input.operation ?? "compile", compilerVersion: "canonical-estimate-compile-core-r1", catalogId: input.definition.catalogId, parameterDefinitions, formulaDefinitions, resourceDefinitions, submittedParameters: { ...input.values }, confirmedParameters: {}, currencyCode: "KGS", priceSnapshotIds: ["batch004-r56-explicit-price-snapshot"], priceItems, maximumResourceRows: 100, hashJson: sha256 });
}
