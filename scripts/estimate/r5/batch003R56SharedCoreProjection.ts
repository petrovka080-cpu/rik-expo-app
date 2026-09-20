import { createHash } from "node:crypto";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../../../src/lib/estimate/estimateDeterministicHash";
import type { ProfessionalParameterConditionV1 } from "../../../src/lib/estimate/v4/domainFactory";
import {
  DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallFlatCeilingProfessionalPackagePartsV6,
  buildIndividualDrywallFlatCeilingEstimatePassportV6,
  drywallFlatCeilingCalculationStrategyIdV6,
  drywallFlatCeilingProfessionalOwnerIdV6,
  type IndividualProfessionalEstimatePassportV6,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import type {
  ProfessionalAssemblyPriceRouteV3,
  ProfessionalNormativeRowTraceV3,
  ProfessionalResourceGraphNodeV3,
} from "../../../src/lib/estimate/v4/professionalProjectAssemblyV4";

type Scalar = string | number | boolean;

export type Batch003R56ParameterDefinition = {
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
  required: boolean;
  defaultValue: null;
  missingValuePolicy: "FAIL_CLOSED";
};

export type Batch003R56FormulaDefinition = {
  formulaId: string;
  expressionSource: string;
  inputParameterIds: readonly string[];
  outputUnitId: string;
};

export type Batch003R56ResourceDefinition = {
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
  titleSpecificationParameterIds?: readonly string[];
  titleSpecificationMode?: "APPEND" | "REPLACE";
  titleSpecificationSeparator?: " — " | " ";
};

export type Batch003R56CanonicalSuccessorDefinition = {
  executionContract: "MASTER_EXECUTION_TZ_R5_6_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU";
  batchId: "BATCH-003";
  successorVersion: "Batch003CanonicalSuccessorR56";
  disposition: "REAL_WORK";
  catalogId: string;
  titleRu: string;
  operation: string;
  variant: string;
  ownerId: string;
  calculationStrategyId: string;
  passport: Batch003R56ContentPassport;
  predecessorPassport: IndividualProfessionalEstimatePassportV6;
  parameters: readonly Batch003R56ParameterDefinition[];
  formulas: readonly Batch003R56FormulaDefinition[];
  resources: readonly Batch003R56ResourceDefinition[];
  definitionSha256: string;
};

export type Batch003R56ContentPassport = {
  schemaVersion: "Batch003R56ContentPassport";
  catalogId: string;
  titleRu: string;
  aliasesRu: readonly string[];
  physicalResultRu: string;
  includedScopeRu: readonly string[];
  excludedScopeRu: readonly string[];
  operation: string;
  variant: string;
  productionOwnerId: string;
  calculationStrategyId: string;
  parameterCount: number;
  formulaCount: number;
  resourceCount: number;
  engineeringSourcePack: IndividualProfessionalEstimatePassportV6["engineeringSourcePack"];
  semanticOwners: readonly string[];
  costOwners: readonly string[];
  procurementOwners: readonly string[];
  removedPredecessorRowCount: number;
  predecessorNoiseRowsCarriedForwardCount: 0;
  hiddenQuantitativeAssumptionCount: 0;
  documentationBoqRowCount: 0;
  genericHourBoqRowCount: 0;
  disposition: "REAL_WORK";
};

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalEstimateStableJson(value), "utf8").digest("hex");
}

const REMOVED_COMMON_MATERIAL_KEYS = new Set([
  "existing_finish_protection",
  "ppe_consumables",
  "barriers_and_warning_signs",
  "control_benchmark_markers",
  "floor_protection_board",
  "protective_film",
  "masking_sealing_tape",
  "trial_area_material",
  "frame_hidden_labels",
  "surface_protection_sheet",
  "repair_equipment_protection",
  "technical_equipment_protection",
]);

const OPERATION_SCOPE: Readonly<Record<string, {
  operationLabelRu: string;
  physicalResultRu: string;
  workTitleRu: string;
  quantityParameterId: string;
  quantityExpression: string;
  quantityUnitId: string;
}>> = {
  PREPARE: {
    operationLabelRu: "подготовка существующего потолка из ГКЛ",
    physicalResultRu: "Осмотренный, очищенный, локально отремонтированный и загрунтованный существующий потолок из ГКЛ, готовый к следующей отделочной операции.",
    workTitleRu: "Укрытие оборудования и пола перед подготовкой потолка из ГКЛ",
    quantityParameterId: "area_m2",
    quantityExpression: "area_m2",
    quantityUnitId: "m2",
  },
  FRAME: {
    operationLabelRu: "монтаж каркаса",
    physicalResultRu: "Смонтированный и выверенный несущий каркас плоского подвесного потолка без обшивки.",
    workTitleRu: "Монтаж несущего каркаса плоского потолка",
    quantityParameterId: "area_m2",
    quantityExpression: "area_m2",
    quantityUnitId: "m2",
  },
  ALIGN: {
    operationLabelRu: "выравнивание каркаса",
    physicalResultRu: "Каркас плоского потолка, выровненный в проектную плоскость без повторного учета его монтажа.",
    workTitleRu: "Выравнивание каркаса плоского потолка",
    quantityParameterId: "area_m2",
    quantityExpression: "area_m2",
    quantityUnitId: "m2",
  },
  INSULATE: {
    operationLabelRu: "укладка изоляции",
    physicalResultRu: "Уложенный проектный слой изоляции в готовом каркасе плоского потолка.",
    workTitleRu: "Укладка изоляции в плоский потолок",
    quantityParameterId: "area_m2",
    quantityExpression: "area_m2",
    quantityUnitId: "m2",
  },
  CLAD: {
    operationLabelRu: "обшивка листами",
    physicalResultRu: "Обшитая гипсокартонными листами плоскость потолка без повторного учета каркаса и отделки швов.",
    workTitleRu: "Монтаж гипсокартонной обшивки потолка",
    quantityParameterId: "area_m2",
    quantityExpression: "area_m2",
    quantityUnitId: "m2",
  },
  FINISH_JOINT: {
    operationLabelRu: "отделка швов",
    physicalResultRu: "Заделанные и подготовленные к проектной финишной отделке швы гипсокартонной обшивки.",
    workTitleRu: "Заделка и финишная обработка швов",
    quantityParameterId: "joint_length_m",
    quantityExpression: "joint_length_m",
    quantityUnitId: "m",
  },
  REPAIR: {
    operationLabelRu: "локальный ремонт",
    physicalResultRu: "Восстановленный подтвержденный дефектный участок плоского гипсокартонного потолка.",
    workTitleRu: "Локальный ремонт плоского гипсокартонного потолка",
    quantityParameterId: "defect_area_m2",
    quantityExpression: "defect_area_m2",
    quantityUnitId: "m2",
  },
};

function rowKey(rowId: string): string {
  return rowId.split(":row:")[1] ?? rowId;
}

function customParameter(input: {
  parameterId: string;
  labelRu: string;
  inputType?: Batch003R56ParameterDefinition["inputType"];
  unitId?: string | null;
  minimum?: number | null;
  maximum?: number | null;
  choices?: readonly string[];
  visibleWhen?: ProfessionalParameterConditionV1;
  requiredWhen?: ProfessionalParameterConditionV1;
  required?: boolean;
}): Batch003R56ParameterDefinition {
  return {
    parameterId: input.parameterId,
    labelRu: input.labelRu,
    inputType: input.inputType ?? "number",
    unitId: input.unitId ?? null,
    minimum: input.minimum ?? null,
    maximum: input.maximum ?? null,
    choices: input.choices ?? [],
    visibleWhen: input.visibleWhen ?? { kind: "ALWAYS" },
    requiredWhen: input.requiredWhen ?? { kind: "ALWAYS" },
    formulaConsumerIds: [],
    sourceOwnership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "VERIFIED_RATEBOOK"],
    required: input.required ?? true,
    defaultValue: null,
    missingValuePolicy: "FAIL_CLOSED",
  };
}

function canonicalTrace(input: { repair: boolean; projectInput: string }): readonly ProfessionalNormativeRowTraceV3[] {
  return [
    {
      source_id: "KG_SP_KR_65_101_2025",
      document_code: "СП КР 65-101:2025",
      edition: "2025",
      exact_locator: "Правила производства и приемки отделочных работ",
      source_role: "WORK_EXECUTION",
      applicability: "Определяет технологическую применимость и приемку, но не создает скрытый объем или цену.",
      foreign_mandatory_for_kg: false,
    },
    {
      source_id: input.repair ? "kg_krerr_2015_application_guidance" : "KG_KRER_10_05_011",
      document_code: input.repair ? "КРЕРр-2015" : "КРЕР 10-05-011",
      edition: input.repair ? "2015" : "Сборник № 15",
      exact_locator: input.repair ? "Указания по применению и проектная дефектная ведомость" : "Таблица 10-05-011, измеритель 100 м²",
      source_role: "QUANTITY_NORM",
      applicability: "Используется только как проверяемая база расценки; частичная операция не наследует полный состав автоматически.",
      foreign_mandatory_for_kg: false,
    },
    {
      source_id: "PROJECT_DRYWALL_SYSTEM_PASSPORT_R56",
      document_code: "Проект/системный паспорт",
      edition: "точная проектная ревизия",
      exact_locator: input.projectInput,
      source_role: "PROJECT_INPUT",
      applicability: "Объем и совместимость вводятся явно; при отсутствии данных расчет закрывается с ошибкой.",
      foreign_mandatory_for_kg: false,
    },
  ];
}

function customFormula(catalogId: string, key: string, expressionSource: string, inputParameterIds: readonly string[], outputUnitId: string): Batch003R56FormulaDefinition {
  return {
    formulaId: `${catalogId}:successor-r56:formula:${key}`,
    expressionSource,
    inputParameterIds,
    outputUnitId,
  };
}

function visibleMaterialTitle(operation: string, key: string, currentTitleRu: string): string {
  if (operation !== "PREPARE") return currentTitleRu;
  if (key === "base_repair_compound") {
    return "Шпаклёвочная смесь для локального ремонта ГКЛ, швов и мест крепления";
  }
  if (key === "compatible_substrate_primer") {
    return "Грунтовка для существующего потолка из ГКЛ — марку уточнить по паспорту материала";
  }
  return currentTitleRu;
}

function customResource(input: {
  catalogId: string;
  ownerId: string;
  operation: string;
  key: string;
  ordinal: number;
  sectionRu: string;
  category: string;
  titleRu: string;
  formula: Batch003R56FormulaDefinition;
  priceParameterId: string;
  inclusionCondition?: string;
  resourceClass: string;
  procurementEligible?: boolean;
  repair: boolean;
  titleSpecificationParameterIds?: readonly string[];
  titleSpecificationMode?: "APPEND" | "REPLACE";
  titleSpecificationSeparator?: " — " | " ";
  additionalNormativeTrace?: readonly ProfessionalNormativeRowTraceV3[];
  additionalNormativeSourceIds?: readonly string[];
}): Batch003R56ResourceDefinition {
  const semanticOwnerId = `${input.ownerId}:row:${input.key}`;
  return {
    rowId: `${input.catalogId}:successor-r56:row:${input.key}`,
    ordinal: input.ordinal,
    sectionRu: input.sectionRu,
    category: input.category,
    titleRu: input.titleRu,
    formulaId: input.formula.formulaId,
    outputUnitId: input.formula.outputUnitId,
    inclusionCondition: input.inclusionCondition ?? "work_included=true",
    costOwnership: "priced_resource",
    costOwnerId: `${input.catalogId}:successor-r56:cost:${input.key}`,
    semanticOwnerId,
    procurementOwnerId: input.procurementEligible ? `${semanticOwnerId}:procurement` : null,
    procurementEligible: input.procurementEligible ?? false,
    priceRoute: {
      kind: "RUNTIME_VALIDATED_INPUT",
      unit_price_parameter_id: input.priceParameterId,
      price_basis_reference_parameter_id: "price_basis_reference",
      price_basis_date_parameter_id: "price_basis_date",
      currency_from_request: true,
      minimum_exclusive: 0,
    },
    resourceGraph: {
      graph_version: "ProfessionalResourceGraphV3",
      typed_child_boundary: input.operation as ProfessionalResourceGraphNodeV3["typed_child_boundary"],
      resource_class: input.resourceClass,
      dependency_ids: [],
      non_cost_dependencies_only: false,
      context_parameter_ids: ["estimate_scope_mode", "project_type", "product_profile_id"],
      forbidden_cost_scopes: [],
    },
    normativeTrace: [
      ...canonicalTrace({ repair: input.repair, projectInput: `Параметры формулы ${input.formula.formulaId}` }),
      ...(input.additionalNormativeTrace ?? []),
    ],
    normativeSourceIds: [
      "KG_SP_KR_65_101_2025",
      input.repair ? "kg_krerr_2015_application_guidance" : "KG_KRER_10_05_011",
      "PROJECT_DRYWALL_SYSTEM_PASSPORT_R56",
      ...(input.additionalNormativeSourceIds ?? []),
    ],
    ...(input.titleSpecificationParameterIds
      ? { titleSpecificationParameterIds: input.titleSpecificationParameterIds }
      : {}),
    ...(input.titleSpecificationMode
      ? { titleSpecificationMode: input.titleSpecificationMode }
      : {}),
    ...(input.titleSpecificationSeparator
      ? { titleSpecificationSeparator: input.titleSpecificationSeparator }
      : {}),
  };
}

function buildDrywallPreparationScopeR4A13(input: {
  catalogId: string;
  ownerId: string;
}): {
  formulas: readonly Batch003R56FormulaDefinition[];
  resources: readonly Batch003R56ResourceDefinition[];
  parameters: readonly Batch003R56ParameterDefinition[];
} {
  const rows = [
    ["protection_cover", "Материалы защиты помещения", "material", "Укрывная полиэтиленовая плёнка и защитный картон для подтверждённой площади оборудования и пола", "m2", "protected_area_m2", "unit_price_successor_protection_cover_kgs", true, "work area protection material"],
    ["masking_tape", "Материалы защиты помещения", "material", "Малярная лента для герметизации укрытий и защиты примыканий", "m", "protection_perimeter_m", "unit_price_successor_masking_tape_kgs", true, "masking and protection tape"],
    ["waste_bags", "Материалы для уборки", "material", "Прочные мешки для подтверждённого объёма пыли и отходов локального ремонта ГКЛ", "item", "waste_bag_count", "unit_price_successor_waste_bags_kgs", true, "repair waste bags"],
    ["primer", "Грунтование", "material", "Выбранная грунтовка, совместимая с картонной поверхностью ГКЛ", "kg", "area_m2 * primer_kg_per_m2 * primer_layer_count", "unit_price_successor_primer_kgs", true, "selected compatible drywall primer"],
    ["finish_paste", "Сплошное финишное шпаклевание", "material", "Финишная шпаклёвочная паста выбранного продукта", "kg", "area_m2 * finish_paste_consumption_kg_m2 * (1 + finish_paste_order_reserve_percent / 100)", "unit_price_successor_finish_paste_kgs", true, "selected finish paste for thin continuous skim coat"],
    ["finish_abrasive", "Шлифование", "material", "Абразивный круг P240, совместимый с выбранной шлифовальной машиной", "item", "ceil(area_m2 / finish_abrasive_productivity_m2_per_item)", "unit_price_successor_finish_abrasive_kgs", true, "P240 compatible sanding disc"],
    ["joint_compound", "Локальный ремонт", "material", "Шпаклёвочная смесь для ремонта швов и локальных дефектов ГКЛ", "kg", "area_m2 * repair_area_share_percent / 100 * repair_compound_kg_per_repair_m2", "unit_price_successor_joint_compound_kgs", true, "drywall joint repair compound"],
    ["joint_tape", "Локальный ремонт", "material", "Бумажная армирующая лента для ремонтируемых швов ГКЛ", "m", "repair_joint_length_m", "unit_price_successor_joint_tape_kgs", true, "drywall paper joint tape"],
    ["abrasive", "Локальный ремонт", "material", "Абразивная сетка зернистостью P120–P180 для шлифования отремонтированных участков ГКЛ", "item", "ceil(area_m2 * repair_area_share_percent / 100 / abrasive_productivity_m2_per_item)", "unit_price_successor_abrasive_kgs", true, "drywall abrasive mesh"],
    ["condition_survey", "Подготовительные работы", "labor", "Осмотр потолка из ГКЛ, простукивание и разметка трещин, отслоений и повреждённых швов", "m2", "area_m2", "unit_price_successor_condition_survey_kgs", false, "drywall ceiling condition survey"],
    ["room_protection", "Подготовительные работы", "labor", "Укрытие оборудования, пола, кабельных трасс и инженерных установок помещения", "m2", "protected_area_m2", "unit_price_successor_room_protection_kgs", false, "technical room protection work"],
    ["surface_cleaning", "Подготовительные работы", "labor", "Очистка потолка из ГКЛ от пыли, слабых участков и загрязнений", "m2", "area_m2", "unit_price_successor_surface_cleaning_kgs", false, "drywall ceiling surface cleaning"],
    ["defect_opening", "Локальный ремонт", "labor", "Расшивка трещин и удаление непрочных участков шпаклёвки в местах локального ремонта", "m", "repair_joint_length_m", "unit_price_successor_defect_opening_kgs", false, "drywall defect opening"],
    ["joint_repair", "Локальный ремонт", "labor", "Локальный ремонт повреждений и швов ГКЛ шпаклёвочной смесью с бумажной лентой", "m", "repair_joint_length_m", "unit_price_successor_joint_repair_kgs", false, "drywall joint repair work"],
    ["sanding", "Локальный ремонт", "labor", "Шлифование и повторное обеспыливание отремонтированных участков потолка из ГКЛ", "m2", "area_m2 * repair_area_share_percent / 100", "unit_price_successor_sanding_kgs", false, "local repaired area sanding"],
    ["primer_application", "Грунтование", "labor", "Нанесение выбранной грунтовки на очищенную поверхность потолка из ГКЛ", "m2", "area_m2 * primer_layer_count", "unit_price_successor_primer_application_kgs", false, "drywall ceiling primer application"],
    ["finish_paste_application", "Сплошное финишное шпаклевание", "labor", "Сплошное финишное шпаклевание существующего потолка из ГКЛ выбранной пастой", "m2", "area_m2", "unit_price_successor_finish_paste_application_kgs", false, "thin continuous finish paste application"],
    ["finish_sanding", "Шлифование", "labor", "Шлифование финишно шпаклёванного потолка абразивом P240 или мельче", "m2", "area_m2", "unit_price_successor_finish_sanding_kgs", false, "finish coat sanding"],
    ["post_sanding_dust_removal", "Обеспыливание", "labor", "Обеспыливание потолка после финишного шлифования", "m2", "area_m2", "unit_price_successor_post_sanding_dust_removal_kgs", false, "post-sanding dust removal"],
    ["readiness_control", "Контроль результата", "labor", "Контроль сухости, прочности и готовности потолка из ГКЛ к следующей отделочной операции", "m2", "area_m2", "unit_price_successor_readiness_control_kgs", false, "drywall ceiling readiness control"],
    ["access_operations", "Работы со средствами доступа", "labor", "Подготовка, проверка, перестановка и завершение работы с подтверждённым средством доступа", "shift", "access_equipment_shift_count", "unit_price_successor_access_operations_kgs", false, "selected access system operations"],
    ["dust_extractor", "Механизация подготовки", "equipment", "Промышленный строительный пылесос класса пыли M с насадкой для потолка", "shift", "dust_extractor_shift_count", "unit_price_successor_dust_extractor_kgs", true, "construction dust extraction equipment"],
    ["access_equipment", "Средства доступа", "equipment", "Средство доступа выбранного типа для подтверждённых условий рабочей зоны", "shift", "access_equipment_shift_count", "unit_price_successor_access_equipment_kgs", true, "selected elevated work access system"],
    ["fall_protection", "Защита от падения", "equipment", "Система защиты от падения выбранного типа для подтверждённой численности бригады", "set", "fall_protection_set_count", "unit_price_successor_fall_protection_kgs", true, "selected fall protection system"],
    ["work_light", "Освещение рабочей зоны", "equipment", "Переносное рабочее освещение для контроля поверхности потолка", "shift", "work_lighting_shift_count", "unit_price_successor_work_light_kgs", true, "temporary work lighting"],
    ["material_delivery", "Логистика материалов", "transport", "Доставка выбранных материалов на объект", "trip", "material_delivery_trip_count", "unit_price_successor_material_delivery_kgs", true, "material delivery"],
    ["access_delivery", "Логистика средств доступа", "transport", "Доставка подтверждённого средства доступа на объект", "trip", "access_delivery_trip_count", "unit_price_successor_access_delivery_kgs", true, "access equipment inbound delivery"],
    ["access_return", "Логистика средств доступа", "transport", "Возврат подтверждённого средства доступа поставщику", "trip", "access_return_trip_count", "unit_price_successor_access_return_kgs", true, "access equipment return"],
    ["waste_removal", "Вынос и вывоз отходов", "transport", "Вынос и вывоз подтверждённого объёма упаковки, пыли и отходов", "trip", "waste_removal_trip_count", "unit_price_successor_waste_removal_kgs", true, "confirmed preparation waste removal"],
  ] as const;
  const formulas = rows.map(([key, , , , unitId, expression]) =>
    customFormula(
      input.catalogId,
      key,
      expression,
      [...new Set(compileFormulaGraph(expression).inputParameterIds)],
      unitId,
    )
  );
  const repairKeys = new Set(["waste_bags", "joint_compound", "joint_tape", "abrasive", "defect_opening", "joint_repair", "sanding"]);
  const primerKeys = new Set(["primer", "primer_application"]);
  const thinFinishKeys = new Set([
    "finish_paste",
    "finish_abrasive",
    "finish_paste_application",
    "finish_sanding",
    "post_sanding_dust_removal",
  ]);
  const accessKeys = new Set(["access_operations", "access_equipment", "access_delivery", "access_return"]);
  const finishPasteTrace: ProfessionalNormativeRowTraceV3 = {
    source_id: "KNAUF_ROTBAND_PASTA_PROFI_IL_2025_02",
    document_code: "Информационный лист КНАУФ-Ротбанд Паста Профи",
    edition: "02/2025",
    exact_locator: "стр. 2: расход 0,48 кг/м² при слое 0,3 мм; грунтование не требуется; шлифование P240 или мельче; удалить пыль",
    source_role: "QUANTITY_NORM",
    applicability: "Только выбранная тонкая сплошная финишная обработка КНАУФ-Ротбанд Паста Профи по подготовленному основанию; иные продукты требуют собственного паспорта.",
    foreign_mandatory_for_kg: false,
  };
  const resources = rows.map(([key, sectionRu, category, titleRu, , , priceParameterId, procurementEligible, resourceClass], ordinal) =>
    customResource({
      catalogId: input.catalogId,
      ownerId: input.ownerId,
      operation: "PREPARE",
      key,
      ordinal,
      sectionRu,
      category,
      titleRu,
      formula: formulas[ordinal],
      priceParameterId,
      inclusionCondition: repairKeys.has(key)
        ? "work_included=true AND repair_requirement_state=REQUIRED"
        : primerKeys.has(key)
          ? "work_included=true AND primer_requirement_state=REQUIRED"
        : thinFinishKeys.has(key)
          ? "work_included=true AND preparation_operation=THIN_FINISH_PASTE"
        : key === "access_delivery" || key === "access_return"
          ? "work_included=true AND elevated_work_requirement_state=REQUIRED AND access_transport_pricing_mode=SEPARATE_LEGS"
        : accessKeys.has(key)
          ? "work_included=true AND elevated_work_requirement_state=REQUIRED"
          : key === "fall_protection"
            ? "work_included=true AND fall_protection_requirement_state=REQUIRED"
            : key === "dust_extractor"
              ? "work_included=true AND dust_extractor_requirement_state=REQUIRED"
            : "work_included=true",
      resourceClass,
      procurementEligible,
      repair: false,
      ...(key === "finish_paste"
        ? {
            titleSpecificationParameterIds: ["finish_product_reference"],
            titleSpecificationMode: "REPLACE" as const,
          }
        : key === "finish_abrasive"
          ? {
              titleSpecificationParameterIds: ["finish_abrasive_product_reference"],
              titleSpecificationMode: "REPLACE" as const,
            }
          : key === "primer"
            ? {
                titleSpecificationParameterIds: ["primer_product_reference"],
                titleSpecificationMode: "REPLACE" as const,
              }
            : {}),
      ...(thinFinishKeys.has(key)
        ? {
            additionalNormativeTrace: [finishPasteTrace],
            additionalNormativeSourceIds: [finishPasteTrace.source_id],
          }
        : {}),
    })
  );
  const requiredWhen = (parameterId: string, value: string | boolean): ProfessionalParameterConditionV1 => ({
    kind: "EQUALS",
    parameter_id: parameterId,
    value,
  });
  const state = (parameterId: string, labelRu: string, choices: readonly string[]) => customParameter({
    parameterId,
    labelRu,
    inputType: "choice",
    choices,
  });
  const parameters = [
    customParameter({ parameterId: "area_m2", labelRu: "Площадь существующего потолка из ГКЛ", unitId: "m2", minimum: 0.000001 }),
    state("preparation_operation", "Выбранная операция подготовки потолка", ["CLEAN_ONLY", "LOCAL_REPAIR", "JOINT_REPAIR", "FULL_LEVELING", "THIN_FINISH_PASTE", "PRIMER_ONLY"]),
    customParameter({ parameterId: "finish_product_reference", labelRu: "Точное наименование выбранной финишной шпаклёвки", inputType: "text", requiredWhen: requiredWhen("preparation_operation", "THIN_FINISH_PASTE") }),
    customParameter({ parameterId: "finish_paste_consumption_kg_m2", labelRu: "Паспортный расход выбранной финишной пасты", unitId: "kg/m2", minimum: 0.000001, maximum: 50, requiredWhen: requiredWhen("preparation_operation", "THIN_FINISH_PASTE") }),
    customParameter({ parameterId: "finish_paste_order_reserve_percent", labelRu: "Отдельно выбранный резерв заказа финишной пасты", unitId: "percent", minimum: 0, maximum: 100, requiredWhen: requiredWhen("preparation_operation", "THIN_FINISH_PASTE") }),
    customParameter({ parameterId: "finish_paste_package_kg", labelRu: "Масса выбранной заводской упаковки финишной пасты", unitId: "kg", minimum: 0.000001, maximum: 1000, requiredWhen: requiredWhen("preparation_operation", "THIN_FINISH_PASTE") }),
    customParameter({ parameterId: "finish_abrasive_product_reference", labelRu: "Точное наименование совместимого абразивного круга", inputType: "text", requiredWhen: requiredWhen("preparation_operation", "THIN_FINISH_PASTE") }),
    customParameter({ parameterId: "finish_abrasive_productivity_m2_per_item", labelRu: "Подтверждённая площадь шлифования одним абразивным кругом", unitId: "m2/item", minimum: 0.000001, requiredWhen: requiredWhen("preparation_operation", "THIN_FINISH_PASTE") }),
    state("repair_requirement_state", "Нужен ли локальный ремонт дефектов и швов", ["REQUIRED", "NOT_REQUIRED", "NEEDS_SITE_INPUT"]),
    customParameter({ parameterId: "repair_area_share_percent", labelRu: "Доля площади потолка с локальными повреждениями", unitId: "percent", minimum: 0, maximum: 100, requiredWhen: requiredWhen("repair_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "repair_compound_kg_per_repair_m2", labelRu: "Расход выбранной шпаклёвочной смеси на 1 м² локального ремонта", unitId: "kg/m2", minimum: 0.000001, maximum: 50, requiredWhen: requiredWhen("repair_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "repair_joint_length_m", labelRu: "Общая длина повреждённых швов и трещин потолка из ГКЛ", unitId: "m", minimum: 0, requiredWhen: requiredWhen("repair_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "abrasive_productivity_m2_per_item", labelRu: "Площадь обработки одной абразивной сеткой выбранной марки", unitId: "m2/item", minimum: 0.000001, requiredWhen: requiredWhen("repair_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "waste_bag_count", labelRu: "Подтверждённое количество мешков для пыли и отходов ремонта", unitId: "item", minimum: 0, requiredWhen: requiredWhen("repair_requirement_state", "REQUIRED") }),
    state("primer_requirement_state", "Требуется ли грунтование для выбранной операции и основания", ["REQUIRED", "NOT_REQUIRED_BY_SELECTED_SYSTEM", "NOT_REQUIRED", "NEEDS_PRODUCT_OR_SUBSTRATE_INPUT"]),
    customParameter({ parameterId: "primer_product_reference", labelRu: "Точное наименование выбранной грунтовки", inputType: "text", requiredWhen: requiredWhen("primer_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "primer_kg_per_m2", labelRu: "Паспортный расход выбранной грунтовки на один слой", unitId: "kg/m2", minimum: 0.000001, maximum: 10, requiredWhen: requiredWhen("primer_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "primer_layer_count", labelRu: "Число слоёв грунтовки по паспорту материала", unitId: "item", minimum: 1, maximum: 10, requiredWhen: requiredWhen("primer_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "protected_area_m2", labelRu: "Подтверждённая площадь оборудования и пола, требующая укрытия", unitId: "m2", minimum: 0 }),
    customParameter({ parameterId: "protection_perimeter_m", labelRu: "Подтверждённая длина границ укрытия и защищаемых примыканий", unitId: "m", minimum: 0 }),
    state("dust_extractor_requirement_state", "Нужен ли отдельный промышленный пылесос", ["REQUIRED", "INCLUDED_IN_CONTRACTOR_SCOPE", "NOT_REQUIRED", "NEEDS_SITE_INPUT"]),
    customParameter({ parameterId: "dust_extractor_shift_count", labelRu: "Подтверждённое число смен промышленного пылесоса", unitId: "shift", minimum: 0.000001, requiredWhen: requiredWhen("dust_extractor_requirement_state", "REQUIRED") }),
    state("elevated_work_requirement_state", "Состояние потребности в средствах доступа", ["REQUIRED", "NOT_REQUIRED", "NEEDS_SITE_INPUT"]),
    customParameter({ parameterId: "working_height_m", labelRu: "Рабочая высота от пола до потолка", unitId: "m", minimum: 0.000001, maximum: 300 }),
    state("access_environment", "Среда установки средства доступа", ["INDOOR", "OUTDOOR", "MIXED"]),
    state("access_system_type", "Выбранный тип средства доступа", ["MOBILE_TOWER", "FRAME_SCAFFOLD", "SCISSOR_LIFT", "ARTICULATED_BOOM_LIFT", "OWNED_COMPATIBLE_EQUIPMENT"]),
    customParameter({ parameterId: "access_platform_height_m", labelRu: "Высота рабочей площадки выбранного средства доступа", unitId: "m", minimum: 0.000001, maximum: 300, requiredWhen: requiredWhen("elevated_work_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "access_horizontal_reach_m", labelRu: "Требуемый горизонтальный вылет рабочей площадки", unitId: "m", minimum: 0, maximum: 300, requiredWhen: requiredWhen("elevated_work_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "access_route_clear_width_m", labelRu: "Подтверждённая свободная ширина маршрута подачи", unitId: "m", minimum: 0.000001, maximum: 100, requiredWhen: requiredWhen("elevated_work_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "access_base_load_capacity_kg_m2", labelRu: "Допустимая нагрузка на основание в зоне установки", unitId: "kg/m2", minimum: 0.000001, requiredWhen: requiredWhen("elevated_work_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "access_platform_load_kg", labelRu: "Расчётная нагрузка на рабочую площадку", unitId: "kg", minimum: 0.000001, requiredWhen: requiredWhen("elevated_work_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "access_restrictions", labelRu: "Ограничения рабочей зоны и маршрута подачи", inputType: "text", requiredWhen: requiredWhen("elevated_work_requirement_state", "REQUIRED") }),
    state("access_supply_mode", "Способ обеспечения средством доступа", ["RENTAL", "CONTRACTOR_OWNED", "CUSTOMER_PROVIDED", "INCLUDED_IN_MAIN_CONTRACT"]),
    customParameter({ parameterId: "access_equipment_shift_count", labelRu: "Подтверждённое число смен средства доступа", unitId: "shift", minimum: 0.000001, requiredWhen: requiredWhen("elevated_work_requirement_state", "REQUIRED") }),
    state("fall_protection_requirement_state", "Состояние потребности в отдельной защите от падения", ["REQUIRED", "INCLUDED_IN_ACCESS_SYSTEM", "NOT_REQUIRED", "NEEDS_SITE_INPUT"]),
    customParameter({ parameterId: "fall_protection_system_reference", labelRu: "Выбранная система защиты от падения", inputType: "text", requiredWhen: requiredWhen("fall_protection_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "fall_protection_set_count", labelRu: "Подтверждённое число комплектов защиты от падения", unitId: "set", minimum: 0.000001, requiredWhen: requiredWhen("fall_protection_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "height_worker_count", labelRu: "Численность бригады, одновременно работающей на высоте", unitId: "item", minimum: 1, requiredWhen: requiredWhen("fall_protection_requirement_state", "REQUIRED") }),
    customParameter({ parameterId: "work_lighting_shift_count", labelRu: "Подтверждённое число смен переносного рабочего освещения", unitId: "shift", minimum: 0 }),
    customParameter({ parameterId: "material_delivery_trip_count", labelRu: "Подтверждённое число рейсов доставки выбранных материалов", unitId: "trip", minimum: 0 }),
    state("access_transport_pricing_mode", "Как учитывается логистика средства доступа", ["SEPARATE_LEGS", "ROUND_TRIP_INCLUDED", "INCLUDED_IN_RENTAL", "OWN_TRANSPORT"]),
    customParameter({ parameterId: "access_delivery_trip_count", labelRu: "Подтверждённое число рейсов доставки средства доступа", unitId: "trip", minimum: 0, requiredWhen: requiredWhen("access_transport_pricing_mode", "SEPARATE_LEGS") }),
    customParameter({ parameterId: "access_return_trip_count", labelRu: "Подтверждённое число рейсов возврата средства доступа", unitId: "trip", minimum: 0, requiredWhen: requiredWhen("access_transport_pricing_mode", "SEPARATE_LEGS") }),
    customParameter({ parameterId: "waste_removal_trip_count", labelRu: "Подтверждённое число рейсов вывоза упаковки, пыли и отходов", unitId: "trip", minimum: 0 }),
    ...rows.map(([key, , , titleRu, unitId, , priceParameterId]) => customParameter({
      parameterId: priceParameterId,
      labelRu: `Цена: ${titleRu}`,
      unitId: `KGS/${unitId}`,
      minimum: 0,
      required: false,
    })),
  ];
  return { formulas, resources, parameters };
}

function buildP113FrameScopeR4A13(input: {
  catalogId: string;
  ownerId: string;
}): {
  formulas: readonly Batch003R56FormulaDefinition[];
  resources: readonly Batch003R56ResourceDefinition[];
  parameters: readonly Batch003R56ParameterDefinition[];
} {
  const rows = [
    ["p113_ceiling_profile", "Профили каркаса", "Профиль потолочный ПП 60×27", "m", "area_m2 * 2.9", "unit_price_successor_p113_ceiling_profile_kgs", "ceiling profile PP 60x27"],
    ["p113_perimeter_track", "Профили каркаса", "Профиль направляющий ПН 28×27", "m", "2 * (room_length_m + room_width_m)", "unit_price_successor_p113_perimeter_track_kgs", "perimeter track PN 28x27"],
    ["p113_profile_extensions", "Соединители каркаса", "Удлинитель профиля ПП 60×27", "item", "ceil(area_m2 * 0.2)", "unit_price_successor_p113_profile_extensions_kgs", "PP 60x27 profile extension"],
    ["p113_single_level_connectors", "Соединители каркаса", "Соединитель одноуровневый для ПП 60×27", "item", "ceil(area_m2 * 1.7)", "unit_price_successor_p113_single_level_connectors_kgs", "single-level PP 60x27 connector"],
    ["p113_direct_hangers", "Подвесы каркаса", "Прямой подвес для профиля ПП 60×27", "item", "ceil(area_m2 * 0.7)", "unit_price_successor_p113_direct_hangers_kgs", "selected direct hanger for PP 60x27"],
    ["p113_hanger_anchors", "Крепёж каркаса", "Анкерный элемент прямого подвеса к несущему основанию", "item", "ceil(area_m2 * 0.7)", "unit_price_successor_p113_hanger_anchors_kgs", "hanger anchor selected for structural substrate"],
    ["p113_ln9_screws", "Крепёж каркаса", "Шуруп LN 9 для соединения металлических профилей", "item", "ceil(area_m2 * 1.4)", "unit_price_successor_p113_ln9_screws_kgs", "LN 9 metal framing screw"],
    ["p113_perimeter_fasteners", "Крепёж каркаса", "Крепёж направляющего ПН 28×27 к выбранному основанию", "item", "ceil(2 * (room_length_m + room_width_m) * 2)", "unit_price_successor_p113_perimeter_fasteners_kgs", "substrate-compatible perimeter track fastener"],
    ["p113_sealing_tape", "Уплотнение примыканий", "Лента уплотнительная под направляющий профиль ПН 28×27", "m", "2 * (room_length_m + room_width_m)", "unit_price_successor_p113_sealing_tape_kgs", "perimeter sealing tape"],
  ] as const;
  const formulas = rows.map(([key, , , unitId, expression]) =>
    customFormula(
      input.catalogId,
      key,
      expression,
      compileFormulaGraph(expression).inputParameterIds,
      unitId,
    )
  );
  const sourceTrace: ProfessionalNormativeRowTraceV3 = {
    source_id: "KNAUF_P113_SYSTEM_PAGE_2026",
    document_code: "КНАУФ П 113 — одноуровневый металлический каркас",
    edition: "страница производителя, проверено 2026-09-08",
    exact_locator: "Состав системы на 1 м²: ПП 2,9 м; удлинитель 0,2 шт.; одноуровневый соединитель 1,7 шт.; подвес и анкер 0,7 шт.; LN 9 1,4 шт.; крепёж ПН 2 шт./м; значения ориентировочные",
    source_role: "QUANTITY_NORM",
    applicability: "Только явно выбранный предварительный вариант КНАУФ П 113; периметр берётся из геометрии, штучные количества округляются вверх и уточняются по проекту.",
    foreign_mandatory_for_kg: false,
  };
  const resources = rows.map(([key, sectionRu, titleRu, , , priceParameterId, resourceClass], ordinal) =>
    customResource({
      catalogId: input.catalogId,
      ownerId: input.ownerId,
      operation: "FRAME",
      key,
      ordinal,
      sectionRu,
      category: "material",
      titleRu,
      formula: formulas[ordinal],
      priceParameterId,
      inclusionCondition: key === "p113_sealing_tape"
        ? "work_included=true AND frame_quantity_basis=P113_TYPICAL_PRELIMINARY AND perimeter_sealing_required=true"
        : "work_included=true AND frame_quantity_basis=P113_TYPICAL_PRELIMINARY",
      resourceClass,
      procurementEligible: true,
      repair: false,
      additionalNormativeTrace: [sourceTrace],
      additionalNormativeSourceIds: [sourceTrace.source_id],
    })
  );
  const p113When: ProfessionalParameterConditionV1 = {
    kind: "EQUALS",
    parameter_id: "frame_quantity_basis",
    value: "P113_TYPICAL_PRELIMINARY",
  };
  const parameters = [
    customParameter({
      parameterId: "frame_quantity_basis",
      labelRu: "Основание количества деталей каркаса",
      inputType: "choice",
      choices: ["PROJECT_TAKEOFF", "P113_TYPICAL_PRELIMINARY"],
    }),
    customParameter({ parameterId: "room_length_m", labelRu: "Длина помещения по внутреннему контуру", unitId: "m", minimum: 0.000001, requiredWhen: p113When }),
    customParameter({ parameterId: "room_width_m", labelRu: "Ширина помещения по внутреннему контуру", unitId: "m", minimum: 0.000001, requiredWhen: p113When }),
    customParameter({ parameterId: "perimeter_sealing_required", labelRu: "Предусмотрена уплотнительная лента по полному периметру", inputType: "boolean", requiredWhen: p113When }),
    ...rows.map(([key, , titleRu, unitId, , priceParameterId]) => customParameter({
      parameterId: priceParameterId,
      labelRu: `Цена: ${titleRu}`,
      unitId: `KGS/${unitId}`,
      minimum: 0,
      required: false,
    })),
  ];
  return { formulas, resources, parameters };
}

function buildSuccessorEngineeringSourcePack(
  predecessor: IndividualProfessionalEstimatePassportV6["engineeringSourcePack"],
  formulas: readonly Batch003R56FormulaDefinition[],
  resources: readonly Batch003R56ResourceDefinition[],
): IndividualProfessionalEstimatePassportV6["engineeringSourcePack"] {
  const predecessorBindings = new Map(
    predecessor.quantitativeBindings.map((binding) => [binding.parameterId, binding] as const),
  );
  const consumers = new Map<string, Set<string>>();
  for (const formula of formulas) {
    for (const parameterId of formula.inputParameterIds) {
      const parameterConsumers = consumers.get(parameterId) ?? new Set<string>();
      parameterConsumers.add(formula.formulaId);
      consumers.set(parameterId, parameterConsumers);
    }
  }
  for (const resource of resources) {
    if (resource.priceRoute?.kind !== "RUNTIME_VALIDATED_INPUT") continue;
    const parameterId = resource.priceRoute.unit_price_parameter_id;
    const parameterConsumers = consumers.get(parameterId) ?? new Set<string>();
    parameterConsumers.add(`price-route:${resource.rowId}`);
    consumers.set(parameterId, parameterConsumers);
  }
  const repair = resources.some((resource) => resource.resourceGraph?.typed_child_boundary === "REPAIR");
  const quantitativeBindings = [...consumers.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([parameterId, parameterConsumers]) => {
      const inherited = predecessorBindings.get(parameterId);
      if (inherited) {
        return {
          ...inherited,
          formulaConsumerIds: [...parameterConsumers].sort(),
        };
      }
      const isPrice = parameterId.startsWith("unit_price_");
      const isAccess = parameterId.startsWith("access_") || parameterId === "working_height_m";
      const isRate = /(?:rate_|fraction|productivity)/u.test(parameterId);
      return {
        parameterId,
        formulaConsumerIds: [...parameterConsumers].sort(),
        sourceIds: isPrice
          ? ["PROJECT_SUPPLIER_OR_CONTRACT_PRICE_R56"]
          : isAccess
            ? ["PROJECT_DRYWALL_SYSTEM_PASSPORT_R56", "KG_SN_KR_12_01_2018"]
            : isRate
              ? [
                  repair ? "kg_krerr_2015_application_guidance" : "KG_KRER_10_05_011",
                  "PROJECT_DRYWALL_SYSTEM_PASSPORT_R56",
                ]
              : ["PROJECT_DRYWALL_SYSTEM_PASSPORT_R56", "KG_SP_KR_65_101_2025"],
        valueSourceRole: isPrice
          ? "SUPPLIER_OR_CONTRACT_PRICE" as const
          : isRate
            ? "VERIFIED_RATEBOOK_OR_PROJECT_CALCULATION" as const
            : "PROJECT_OR_SITE_MEASUREMENT" as const,
        hiddenDefault: false as const,
        missingValuePolicy: "FAIL_CLOSED" as const,
      };
    });
  const withoutHash = {
    ...predecessor,
    quantitativeBindings,
    hiddenQuantitativeAssumptionCount: 0 as const,
    unboundFormulaInputCount: 0 as const,
    sourcePackHash: undefined,
  };
  const { sourcePackHash: _removed, ...hashable } = withoutHash;
  return { ...hashable, sourcePackHash: estimateDeterministicHash(hashable) };
}

function buildDefinitionWithoutHash(catalogId: string) {
  if (!(DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6 as readonly string[]).includes(catalogId)) {
    throw new Error(`BATCH003_R56_DEFINITION_OUTSIDE_SCOPE:${catalogId}`);
  }
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((candidate) => candidate.catalog_id === catalogId);
  if (!inventory) throw new Error(`BATCH003_R56_INVENTORY_MISSING:${catalogId}`);
  const parts = buildDrywallFlatCeilingProfessionalPackagePartsV6(inventory);
  if (!parts) throw new Error(`BATCH003_R56_PARTS_MISSING:${catalogId}`);
  const predecessorPassport = buildIndividualDrywallFlatCeilingEstimatePassportV6(inventory, parts);
  const rows = parts.child_assemblies.flatMap((child) => child.rows);
  const operationScope = OPERATION_SCOPE[parts.contract.operation];
  if (!operationScope) throw new Error(`BATCH003_R56_OPERATION_SCOPE_MISSING:${catalogId}:${parts.contract.operation}`);
  const ownerId = drywallFlatCeilingProfessionalOwnerIdV6(catalogId);
  const repair = parts.contract.operation === "REPAIR";
  const prepare = parts.contract.operation === "PREPARE";
  const frame = parts.contract.operation === "FRAME";
  const preparationScope = prepare
    ? buildDrywallPreparationScopeR4A13({ catalogId, ownerId })
    : null;
  const frameScope = frame
    ? buildP113FrameScopeR4A13({ catalogId, ownerId })
    : null;

  const retainedMaterialRows = prepare
    ? []
    : rows.filter((row) =>
        row.category === "material"
        && row.procurement_eligible
        && row.price_route_v3?.kind === "RUNTIME_VALIDATED_INPUT"
        && !REMOVED_COMMON_MATERIAL_KEYS.has(rowKey(row.row_id)),
      );
  const materialFormulas: Batch003R56FormulaDefinition[] = retainedMaterialRows.map((row) => {
    const key = rowKey(row.row_id);
    if (parts.contract.operation === "PREPARE" && key === "base_repair_compound") {
      return {
        formulaId: `${catalogId}:successor-r56:formula:material:${key}`,
        expressionSource: "area_m2 * repair_area_share_percent / 100 * repair_compound_kg_per_repair_m2",
        inputParameterIds: ["area_m2", "repair_area_share_percent", "repair_compound_kg_per_repair_m2"],
        outputUnitId: "kg",
      };
    }
    if (parts.contract.operation === "PREPARE" && key === "compatible_substrate_primer") {
      return {
        formulaId: `${catalogId}:successor-r56:formula:material:${key}`,
        expressionSource: "area_m2 * primer_kg_per_m2",
        inputParameterIds: ["area_m2", "primer_kg_per_m2"],
        outputUnitId: "kg",
      };
    }
    return {
      formulaId: `${catalogId}:successor-r56:formula:material:${key}`,
      expressionSource: row.formula.expression,
      inputParameterIds: [...row.formula.input_parameter_ids],
      outputUnitId: row.formula.output_unit_id,
    };
  });
  const materialResources: Batch003R56ResourceDefinition[] = retainedMaterialRows.map((row, ordinal) => {
    const key = rowKey(row.row_id);
    const semanticOwnerId = `${ownerId}:successor-r56:material:${key}`;
    return {
      rowId: `${catalogId}:successor-r56:row:material:${key}`,
      ordinal,
      sectionRu: row.section,
      category: row.category,
      titleRu: visibleMaterialTitle(parts.contract.operation, key, row.title_ru),
      formulaId: materialFormulas[ordinal].formulaId,
      outputUnitId: row.formula.output_unit_id,
      inclusionCondition: frame
        ? `${row.inclusion_condition} AND frame_quantity_basis=PROJECT_TAKEOFF`
        : row.inclusion_condition,
      costOwnership: "priced_resource" as const,
      costOwnerId: `${catalogId}:successor-r56:cost:material:${key}`,
      semanticOwnerId,
      procurementOwnerId: `${semanticOwnerId}:procurement`,
      procurementEligible: true,
      priceRoute: row.price_route_v3 ?? null,
      resourceGraph: row.resource_graph_node_v3 ?? null,
      normativeTrace: [...(row.normative_trace_v3 ?? [])],
      normativeSourceIds: [...row.normative_source_ids],
    };
  });
  const frameResources = (frameScope?.resources ?? []).map((resource) => ({
    ...resource,
    ordinal: materialResources.length + resource.ordinal,
  }));
  const scopedMaterialResources = [...materialResources, ...frameResources];

  const operationWorkFormula = customFormula(
    catalogId,
    "operation_work",
    operationScope.quantityExpression,
    [operationScope.quantityParameterId],
    operationScope.quantityUnitId,
  );
  const deliveryFormula = customFormula(
    catalogId,
    "incoming_delivery",
    "(delivery_mass_kg / 1000) * delivery_distance_km",
    ["delivery_mass_kg", "delivery_distance_km"],
    "t_km",
  );
  const wasteHaulFormula = customFormula(
    catalogId,
    "waste_haul",
    "(waste_mass_kg / 1000) * waste_haul_distance_km",
    ["waste_mass_kg", "waste_haul_distance_km"],
    "t_km",
  );
  const accessEquipmentFormula = customFormula(
    catalogId,
    "access_equipment",
    "access_equipment_shift_count",
    ["access_equipment_shift_count"],
    "shift",
  );
  const accessTemporaryWorksFormula = customFormula(
    catalogId,
    "access_temporary_works",
    "access_equipment_shift_count",
    ["access_equipment_shift_count"],
    "shift",
  );
  const accessDeliveryReturnFormula = customFormula(
    catalogId,
    "access_delivery_return",
    "access_delivery_trip_count",
    ["access_delivery_trip_count"],
    "trip",
  );
  const preparationFormulas = prepare
      ? [
        customFormula(catalogId, "work_zone_protection", "area_m2", ["area_m2"], "m2"),
        customFormula(catalogId, "joint_repair_tape", "repair_joint_length_m", ["repair_joint_length_m"], "m"),
        customFormula(catalogId, "condition_survey", "area_m2", ["area_m2"], "m2"),
        customFormula(catalogId, "surface_dust_removal", "area_m2", ["area_m2"], "m2"),
        customFormula(catalogId, "local_joint_repair", "repair_joint_length_m", ["repair_joint_length_m"], "m"),
        customFormula(catalogId, "primer_application", "area_m2", ["area_m2"], "m2"),
        customFormula(catalogId, "dust_extraction_equipment", "preparation_equipment_shift_count", ["preparation_equipment_shift_count"], "shift"),
      ]
    : [];
  const customFormulas = [
    operationWorkFormula,
    deliveryFormula,
    wasteHaulFormula,
    accessEquipmentFormula,
    accessTemporaryWorksFormula,
    accessDeliveryReturnFormula,
    ...preparationFormulas,
    ...(frameScope?.formulas ?? []),
  ];
  const customResources: Batch003R56ResourceDefinition[] = [
    customResource({
      catalogId,
      ownerId,
      operation: parts.contract.operation,
      key: "operation_work",
      ordinal: scopedMaterialResources.length,
      sectionRu: "Строительная работа",
      category: "labor",
      titleRu: operationScope.workTitleRu,
      formula: operationWorkFormula,
      priceParameterId: "unit_price_successor_operation_work_kgs",
      resourceClass: "measurable construction operation",
      repair,
    }),
    customResource({
      catalogId,
      ownerId,
      operation: parts.contract.operation,
      key: "incoming_delivery",
      ordinal: scopedMaterialResources.length + 1,
      sectionRu: "Логистика",
      category: "transport",
      titleRu: "Единая входящая доставка материалов по подтвержденной массе и маршруту",
      formula: deliveryFormula,
      priceParameterId: "unit_price_successor_delivery_kgs",
      resourceClass: "consolidated incoming material transport",
      procurementEligible: true,
      repair,
    }),
    customResource({
      catalogId,
      ownerId,
      operation: parts.contract.operation,
      key: "waste_haul",
      ordinal: scopedMaterialResources.length + 2,
      sectionRu: "Отходы",
      category: "transport",
      titleRu: "Единый вывоз подтвержденной массы строительных отходов",
      formula: wasteHaulFormula,
      priceParameterId: "unit_price_successor_waste_haul_kgs",
      resourceClass: "consolidated construction waste transport",
      procurementEligible: true,
      repair,
    }),
    customResource({
      catalogId,
      ownerId,
      operation: parts.contract.operation,
      key: "access_equipment",
      ordinal: scopedMaterialResources.length + 3,
      sectionRu: "Оборудование доступа",
      category: "equipment",
      titleRu: "Передвижная вышка-тура или подмости с ограждением — тип уточнить по рабочей высоте",
      formula: accessEquipmentFormula,
      priceParameterId: "unit_price_successor_access_equipment_kgs",
      inclusionCondition: "work_included=true AND access_equipment_required=true",
      resourceClass: "conditional access equipment measured by shift",
      procurementEligible: true,
      repair,
    }),
    customResource({
      catalogId,
      ownerId,
      operation: parts.contract.operation,
      key: "access_temporary_works",
      ordinal: scopedMaterialResources.length + 4,
      sectionRu: "Работы со средствами доступа",
      category: "labor",
      titleRu: "Монтаж, ежесменная проверка, перестановка и демонтаж вышки-туры или подмостей",
      formula: accessTemporaryWorksFormula,
      priceParameterId: "unit_price_successor_access_temporary_works_kgs",
      inclusionCondition: "work_included=true AND access_equipment_required=true",
      resourceClass: "conditional access temporary works measured by shift",
      repair,
    }),
    customResource({
      catalogId,
      ownerId,
      operation: parts.contract.operation,
      key: "access_delivery_return",
      ordinal: scopedMaterialResources.length + 5,
      sectionRu: "Логистика средств доступа",
      category: "transport",
      titleRu: "Доставка и возврат вышки-туры, подмостей или подъёмника",
      formula: accessDeliveryReturnFormula,
      priceParameterId: "unit_price_successor_access_delivery_return_kgs",
      inclusionCondition: "work_included=true AND access_equipment_required=true",
      resourceClass: "conditional access equipment delivery and return",
      procurementEligible: true,
      repair,
    }),
  ];
  if (prepare) {
    const [protectionFormula, tapeFormula, surveyFormula, cleaningFormula, repairFormula, primerFormula, dustFormula] = preparationFormulas;
    const startOrdinal = customResources.length + scopedMaterialResources.length;
    customResources.push(
      customResource({ catalogId, ownerId, operation: parts.contract.operation, key: "work_zone_protection", ordinal: startOrdinal, sectionRu: "Защита помещения", category: "material", titleRu: "Укрывная плёнка и защитное покрытие оборудования и пола технического помещения", formula: protectionFormula, priceParameterId: "unit_price_successor_work_zone_protection_kgs", resourceClass: "work zone protection material", procurementEligible: true, repair }),
      customResource({ catalogId, ownerId, operation: parts.contract.operation, key: "joint_repair_tape", ordinal: startOrdinal + 1, sectionRu: "Материалы для ремонта швов", category: "material", titleRu: "Армирующая бумажная лента для ремонта повреждённых швов ГКЛ", formula: tapeFormula, priceParameterId: "unit_price_successor_joint_repair_tape_kgs", resourceClass: "drywall joint reinforcing tape", procurementEligible: true, repair }),
      customResource({ catalogId, ownerId, operation: parts.contract.operation, key: "condition_survey", ordinal: startOrdinal + 2, sectionRu: "Подготовительные работы", category: "labor", titleRu: "Осмотр потолка из ГКЛ, простукивание и разметка трещин, отслоений и повреждённых швов", formula: surveyFormula, priceParameterId: "unit_price_successor_condition_survey_kgs", resourceClass: "drywall ceiling condition survey", repair }),
      customResource({ catalogId, ownerId, operation: parts.contract.operation, key: "surface_dust_removal", ordinal: startOrdinal + 3, sectionRu: "Подготовительные работы", category: "labor", titleRu: "Очистка потолка из ГКЛ от пыли, слабых участков и загрязнений перед ремонтом", formula: cleaningFormula, priceParameterId: "unit_price_successor_surface_dust_removal_kgs", resourceClass: "drywall ceiling surface cleaning", repair }),
      customResource({ catalogId, ownerId, operation: parts.contract.operation, key: "local_joint_repair", ordinal: startOrdinal + 4, sectionRu: "Локальный ремонт", category: "labor", titleRu: "Расшивка и восстановление повреждённых швов и мест крепления ГКЛ с армирующей лентой", formula: repairFormula, priceParameterId: "unit_price_successor_local_joint_repair_kgs", resourceClass: "drywall joint local repair measured by confirmed length", repair }),
      customResource({ catalogId, ownerId, operation: parts.contract.operation, key: "primer_application", ordinal: startOrdinal + 5, sectionRu: "Грунтование", category: "labor", titleRu: "Нанесение грунтовки на подготовленный потолок из ГКЛ", formula: primerFormula, priceParameterId: "unit_price_successor_primer_application_kgs", resourceClass: "drywall ceiling primer application", repair }),
      customResource({ catalogId, ownerId, operation: parts.contract.operation, key: "dust_extraction_equipment", ordinal: startOrdinal + 6, sectionRu: "Механизация подготовки", category: "equipment", titleRu: "Промышленный строительный пылесос для очистки потолка и рабочей зоны", formula: dustFormula, priceParameterId: "unit_price_successor_dust_extraction_equipment_kgs", resourceClass: "construction dust extraction equipment", procurementEligible: true, repair }),
    );
  }
  const formulas = preparationScope?.formulas ?? [...materialFormulas, ...customFormulas];
  const resources = preparationScope?.resources ?? [...scopedMaterialResources, ...customResources];

  const legacyCustomParameters = [
    customParameter({
      parameterId: operationScope.quantityParameterId,
      labelRu: `Подтвержденный физический объем: ${operationScope.operationLabelRu}`,
      unitId: operationScope.quantityUnitId,
      minimum: 0,
    }),
    customParameter({ parameterId: "delivery_mass_kg", labelRu: "Подтвержденная масса единой входящей доставки", unitId: "kg", minimum: 0 }),
    customParameter({ parameterId: "delivery_distance_km", labelRu: "Подтвержденное плечо единой входящей доставки", unitId: "km", minimum: 0 }),
    customParameter({ parameterId: "waste_mass_kg", labelRu: "Подтвержденная масса вывозимых отходов", unitId: "kg", minimum: 0 }),
    customParameter({ parameterId: "waste_haul_distance_km", labelRu: "Подтвержденное плечо вывоза отходов", unitId: "km", minimum: 0 }),
    customParameter({ parameterId: "access_equipment_required", labelRu: "Требуется оборудование доступа по ППР", inputType: "boolean" }),
    customParameter({ parameterId: "working_height_m", labelRu: "Рабочая высота от пола до потолка", unitId: "m", minimum: 0, maximum: 300 }),
    customParameter({
      parameterId: "access_equipment_shift_count",
      labelRu: "Подтвержденное число смен оборудования доступа",
      unitId: "shift",
      minimum: 0,
      requiredWhen: { kind: "EQUALS", parameter_id: "access_equipment_required", value: true },
    }),
    customParameter({ parameterId: "access_delivery_trip_count", labelRu: "Количество рейсов доставки и возврата средств доступа", unitId: "trip", minimum: 0, requiredWhen: { kind: "EQUALS", parameter_id: "access_equipment_required", value: true } }),
    customParameter({ parameterId: "unit_price_successor_operation_work_kgs", labelRu: "Цена измеримой строительной операции", unitId: `KGS/${operationScope.quantityUnitId}`, minimum: 0 }),
    customParameter({ parameterId: "unit_price_successor_delivery_kgs", labelRu: "Цена единой входящей доставки", unitId: "KGS/t_km", minimum: 0 }),
    customParameter({ parameterId: "unit_price_successor_waste_haul_kgs", labelRu: "Цена единого вывоза отходов", unitId: "KGS/t_km", minimum: 0 }),
    customParameter({ parameterId: "unit_price_successor_access_equipment_kgs", labelRu: "Цена смены оборудования доступа", unitId: "KGS/shift", minimum: 0 }),
    customParameter({ parameterId: "unit_price_successor_access_temporary_works_kgs", labelRu: "Цена монтажа, проверки, перестановки и демонтажа средств доступа", unitId: "KGS/shift", minimum: 0 }),
    customParameter({ parameterId: "unit_price_successor_access_delivery_return_kgs", labelRu: "Цена доставки и возврата средств доступа", unitId: "KGS/trip", minimum: 0 }),
    ...(prepare
      ? [
          customParameter({ parameterId: "repair_joint_length_m", labelRu: "Подтверждённая длина повреждённых швов и трещин ГКЛ", unitId: "m", minimum: 0 }),
          customParameter({ parameterId: "repair_area_share_percent", labelRu: "Доля площади потолка с локальными дефектами", unitId: "percent", minimum: 0, maximum: 100 }),
          customParameter({ parameterId: "repair_compound_kg_per_repair_m2", labelRu: "Расход шпаклёвочной смеси на 1 м² локального ремонта", unitId: "kg/m2", minimum: 0, maximum: 50 }),
          customParameter({ parameterId: "primer_kg_per_m2", labelRu: "Расход грунтовки на 1 м² потолка по паспорту материала", unitId: "kg/m2", minimum: 0, maximum: 10 }),
          customParameter({ parameterId: "preparation_equipment_shift_count", labelRu: "Число смен промышленного пылесоса", unitId: "shift", minimum: 0 }),
          customParameter({ parameterId: "unit_price_successor_work_zone_protection_kgs", labelRu: "Цена защиты пола и оборудования помещения", unitId: "KGS/m2", minimum: 0 }),
          customParameter({ parameterId: "unit_price_successor_joint_repair_tape_kgs", labelRu: "Цена армирующей ленты для ремонта швов ГКЛ", unitId: "KGS/m", minimum: 0 }),
          customParameter({ parameterId: "unit_price_successor_condition_survey_kgs", labelRu: "Цена осмотра и разметки дефектов потолка", unitId: "KGS/m2", minimum: 0 }),
          customParameter({ parameterId: "unit_price_successor_surface_dust_removal_kgs", labelRu: "Цена очистки потолка перед ремонтом", unitId: "KGS/m2", minimum: 0 }),
          customParameter({ parameterId: "unit_price_successor_local_joint_repair_kgs", labelRu: "Цена ремонта швов и мест крепления ГКЛ", unitId: "KGS/m", minimum: 0 }),
          customParameter({ parameterId: "unit_price_successor_primer_application_kgs", labelRu: "Цена нанесения грунтовки на потолок", unitId: "KGS/m2", minimum: 0 }),
          customParameter({ parameterId: "unit_price_successor_dust_extraction_equipment_kgs", labelRu: "Цена смены промышленного строительного пылесоса", unitId: "KGS/shift", minimum: 0 }),
        ]
      : []),
  ];
  const customParameters = preparationScope?.parameters
    ?? [...legacyCustomParameters, ...(frameScope?.parameters ?? [])];
  const parameterCandidates = new Map<string, Batch003R56ParameterDefinition>();
  for (const parameter of parts.schema.parameters) {
    parameterCandidates.set(parameter.parameter_id, {
      parameterId: parameter.parameter_id,
      labelRu: parameter.label_ru,
      inputType: parameter.input_type,
      unitId: parameter.unit_id,
      minimum: parameter.minimum ?? null,
      maximum: parameter.maximum ?? null,
      choices: parameter.choices?.map((choice) => choice.value) ?? [],
      visibleWhen: parameter.visible_when,
      requiredWhen: parameter.required_when,
      formulaConsumerIds: [],
      sourceOwnership: [...parameter.source_ownership],
      required: parameter.priority === "P0",
      defaultValue: null,
      missingValuePolicy: "FAIL_CLOSED",
    });
  }
  for (const parameter of customParameters) parameterCandidates.set(parameter.parameterId, parameter);
  const requiredParameterIds = new Set<string>(prepare
    ? [
        "work_included",
        "estimate_scope_mode",
        ...customParameters.map((parameter) => parameter.parameterId),
      ]
    : [
        "work_included",
        "estimate_scope_mode",
        "project_type",
        "product_profile_id",
        "price_basis_reference",
        "price_basis_date",
        "access_equipment_required",
        "working_height_m",
        ...(frameScope?.parameters.map((parameter) => parameter.parameterId) ?? []),
      ]);
  const consumersByParameterId = new Map<string, Set<string>>();
  for (const formula of formulas) {
    for (const parameterId of formula.inputParameterIds) {
      requiredParameterIds.add(parameterId);
      const consumers = consumersByParameterId.get(parameterId) ?? new Set<string>();
      consumers.add(formula.formulaId);
      consumersByParameterId.set(parameterId, consumers);
    }
  }
  for (const resource of resources) {
    if (resource.priceRoute?.kind !== "RUNTIME_VALIDATED_INPUT") continue;
    const priceParameterId = resource.priceRoute.unit_price_parameter_id;
    requiredParameterIds.add(priceParameterId);
    const consumers = consumersByParameterId.get(priceParameterId) ?? new Set<string>();
    consumers.add(`price-route:${resource.rowId}`);
    consumersByParameterId.set(priceParameterId, consumers);
  }
  const parameters = [...requiredParameterIds]
    .sort()
    .map((parameterId) => {
      const parameter = parameterCandidates.get(parameterId);
      if (!parameter) throw new Error(`BATCH003_R56_PARAMETER_MISSING:${catalogId}:${parameterId}`);
      return {
        ...parameter,
        required: parameterId.startsWith("unit_price_") ? false : parameter.required,
        formulaConsumerIds: [...(consumersByParameterId.get(parameterId) ?? [])].sort(),
      };
    });
  const engineeringSourcePack = buildSuccessorEngineeringSourcePack(
    predecessorPassport.engineeringSourcePack,
    formulas,
    resources,
  );
  const passport: Batch003R56ContentPassport = {
    schemaVersion: "Batch003R56ContentPassport",
    catalogId,
    titleRu: inventory.localized_name_ru,
    aliasesRu: [`${operationScope.operationLabelRu}: ${parts.contract.variant}`],
    physicalResultRu: operationScope.physicalResultRu,
    includedScopeRu: [
      operationScope.physicalResultRu,
      "Только явно рассчитанные физические материалы этой операции.",
      "Одна входящая доставка, один вывоз отходов и условное оборудование доступа без повторного учета.",
    ],
    excludedScopeRu: [
      "Документы, журналы, акты, контроль и приемка как строки сметы.",
      "Универсальные человеко-часы и машино-часы.",
      "Повторные доставка, погрузка, разгрузка, ППЭ и временное обустройство.",
      ...parts.contract.forbidden_cost_scope,
    ],
    operation: parts.contract.operation,
    variant: parts.contract.variant,
    productionOwnerId: ownerId,
    calculationStrategyId: drywallFlatCeilingCalculationStrategyIdV6(catalogId),
    parameterCount: parameters.length,
    formulaCount: formulas.length,
    resourceCount: resources.length,
    engineeringSourcePack,
    semanticOwners: resources.map((resource) => resource.semanticOwnerId).sort(),
    costOwners: resources.map((resource) => resource.costOwnerId).sort(),
    procurementOwners: resources.flatMap((resource) => resource.procurementOwnerId ? [resource.procurementOwnerId] : []).sort(),
    removedPredecessorRowCount: rows.length - retainedMaterialRows.length,
    predecessorNoiseRowsCarriedForwardCount: 0,
    hiddenQuantitativeAssumptionCount: 0,
    documentationBoqRowCount: 0,
    genericHourBoqRowCount: 0,
    disposition: "REAL_WORK",
  };
  return {
    executionContract: "MASTER_EXECUTION_TZ_R5_6_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU" as const,
    batchId: "BATCH-003" as const,
    successorVersion: "Batch003CanonicalSuccessorR56" as const,
    disposition: "REAL_WORK" as const,
    catalogId,
    titleRu: inventory.localized_name_ru,
    operation: parts.contract.operation,
    variant: parts.contract.variant,
    ownerId,
    calculationStrategyId: drywallFlatCeilingCalculationStrategyIdV6(catalogId),
    passport,
    predecessorPassport,
    parameters,
    formulas,
    resources,
  };
}

export function buildBatch003R56CanonicalSuccessorDefinition(
  catalogId: string,
): Batch003R56CanonicalSuccessorDefinition {
  const withoutHash = buildDefinitionWithoutHash(catalogId);
  return { ...withoutHash, definitionSha256: sha256(withoutHash) };
}

export function buildAllBatch003R56CanonicalSuccessorDefinitions(): readonly Batch003R56CanonicalSuccessorDefinition[] {
  return DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6.map(buildBatch003R56CanonicalSuccessorDefinition);
}

function valueType(parameter: Batch003R56ParameterDefinition): "decimal" | "boolean" | "enum" | "text" {
  if (parameter.inputType === "number") return "decimal";
  if (parameter.inputType === "boolean") return "boolean";
  if (parameter.inputType === "choice") return "enum";
  return "text";
}

function constraints(parameter: Batch003R56ParameterDefinition): Record<string, unknown> {
  return {
    ...(parameter.minimum == null ? {} : { min: parameter.minimum }),
    ...(parameter.maximum == null ? {} : { max: parameter.maximum }),
    ...(parameter.choices.length === 0 ? {} : { values: parameter.choices }),
    ...(parameter.inputType !== "text" ? {} : { maxLength: 1_000 }),
    ...(parameter.requiredWhen.kind !== "EQUALS"
      ? {}
      : { requiredWhen: { parameterId: parameter.requiredWhen.parameter_id, equals: parameter.requiredWhen.value } }),
  };
}

function inclusionAst(
  resource: Batch003R56ResourceDefinition,
  formulaInputParameterIds: readonly string[],
): Record<string, unknown> {
  const operands: Record<string, unknown>[] = [];
  for (const clause of resource.inclusionCondition.split(/\s+AND\s+/u)) {
    const match = /^([a-z][a-z0-9_]*)=(.+)$/u.exec(clause.trim());
    if (!match) {
      throw new Error(`BATCH003_R56_INCLUSION_UNSUPPORTED:${resource.rowId}:${resource.inclusionCondition}`);
    }
    const parameterId = match[1] === "scope_mode" ? "estimate_scope_mode" : match[1];
    const value = match[2] === "true" ? true : match[2] === "false" ? false : match[2];
    operands.push(parameterId === "work_included" && value === true
      ? { kind: "parameter", id: parameterId }
      : { kind: "equals", parameterId, value });
  }
  for (const parameterId of formulaInputParameterIds) {
    operands.push({ kind: "present", parameterId });
  }
  return operands.length === 1 ? operands[0] : { kind: "and", operands };
}

export async function compileBatch003R56ThroughSharedCore(input: {
  definition: Batch003R56CanonicalSuccessorDefinition;
  values: Readonly<Record<string, Scalar>>;
  operation?: "compile" | "recalculate";
}): Promise<CanonicalEstimateCompileCoreResult> {
  const parameterDefinitions = input.definition.parameters.map((parameter) => ({
    parameter_id: parameter.parameterId,
    value_type: valueType(parameter),
    required: parameter.required && parameter.requiredWhen.kind === "ALWAYS",
    default_value: null,
    constraints_json: constraints(parameter),
      truth_metadata: {
      value_source_role: "EXPLICIT_NO_HIDDEN_DEFAULT",
      ...(input.definition.operation === "PREPARE" && parameter.required
        ? { preliminary_compilation_allowed: true }
        : {}),
        formula_consumers: parameter.formulaConsumerIds,
        resource_branch_consumers: input.definition.resources
        .filter((resource) => parameter.formulaConsumerIds.includes(resource.formulaId)
          || resource.titleSpecificationParameterIds?.includes(parameter.parameterId)
          || resource.inclusionCondition.split(/\s+AND\s+/u)
            .some((clause) => clause.trim().startsWith(`${parameter.parameterId}=`)))
        .map((resource) => resource.rowId),
      engineering_source_pack_hash: input.definition.passport.engineeringSourcePack.sourcePackHash,
    },
  }));
  const formulaDefinitions = input.definition.formulas.map((formula) => {
    const compiled = compileFormulaGraph(formula.expressionSource);
    const declared = [...formula.inputParameterIds].sort();
    if (canonicalEstimateStableJson(compiled.inputParameterIds) !== canonicalEstimateStableJson(declared)) {
      throw new Error(`BATCH003_R56_FORMULA_INPUT_DRIFT:${input.definition.catalogId}:${formula.formulaId}`);
    }
    return {
      formula_id: formula.formulaId,
      ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: sha256(compiled.ast),
    };
  });
  const resourceDefinitions = input.definition.resources.map((resource) => {
    const resourceGraph = {
      contract: "real-professional-estimates-r5.6.batch003-resource-graph.v1",
      domain: "interior_finishes",
      operation: input.definition.operation,
      variant: input.definition.variant,
      semanticOwnerId: resource.semanticOwnerId,
      procurementOwnerId: resource.procurementOwnerId,
      sourceResourceGraph: resource.resourceGraph,
      ...(resource.titleSpecificationParameterIds
        ? { titleSpecificationParameterIds: resource.titleSpecificationParameterIds }
        : {}),
      ...(resource.titleSpecificationMode
        ? { titleSpecificationMode: resource.titleSpecificationMode }
        : {}),
      ...(resource.titleSpecificationSeparator
        ? { titleSpecificationSeparator: resource.titleSpecificationSeparator }
        : {}),
    };
    const sourceMetadata = {
      normativeTrace: resource.normativeTrace,
      normativeSourceIds: resource.normativeSourceIds,
      engineeringSourcePackHash: input.definition.passport.engineeringSourcePack.sourcePackHash,
      priceRoute: resource.priceRoute,
    };
    return {
      id: resource.rowId,
      row_id: resource.rowId,
      ordinal: resource.ordinal,
      section: resource.sectionRu,
      category: resource.category,
      title_ru: resource.titleRu,
      unit_id: resource.outputUnitId,
      formula_id: resource.formulaId,
      inclusion_ast: inclusionAst(
        resource,
        input.definition.formulas.find((formula) => formula.formulaId === resource.formulaId)?.inputParameterIds ?? [],
      ),
      resource_graph: resourceGraph,
      procurement_eligible: resource.procurementEligible,
      cost_owner_id: resource.costOwnerId,
      source_metadata: sourceMetadata,
      row_sha256: sha256({ resource, resourceGraph, sourceMetadata }),
    };
  });
  const priceItems = input.definition.resources.flatMap((resource) => {
    if (resource.priceRoute?.kind !== "RUNTIME_VALIDATED_INPUT") return [];
    const unitPrice = input.values[resource.priceRoute.unit_price_parameter_id];
    if (typeof unitPrice !== "number" && typeof unitPrice !== "string") {
      return [];
    }
    return [{
      price_key: resource.costOwnerId,
      unit_id: resource.outputUnitId,
      currency_code: "KGS",
      unit_price: unitPrice,
      snapshot_id: "batch003-r56-explicit-price-snapshot",
      estimate_price_snapshot: { route_id: "batch003-r56-explicit-price-route" },
    }];
  });
  return compileCanonicalEstimateCore({
    operation: input.operation ?? "compile",
    compilerVersion: "canonical-estimate-compile-core-r1",
    catalogId: input.definition.catalogId,
    parameterDefinitions,
    formulaDefinitions,
    resourceDefinitions,
    submittedParameters: { ...input.values },
    confirmedParameters: {},
    currencyCode: "KGS",
    priceSnapshotIds: ["batch003-r56-explicit-price-snapshot"],
    priceItems,
    maximumResourceRows: 300,
    hashJson: sha256,
  });
}
