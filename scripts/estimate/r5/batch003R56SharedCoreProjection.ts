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
    operationLabelRu: "подготовка основания",
    physicalResultRu: "Подготовленное основание плоского потолка, пригодное для следующей проектной операции.",
    workTitleRu: "Подготовка основания плоского потолка",
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
  requiredWhen?: ProfessionalParameterConditionV1;
}): Batch003R56ParameterDefinition {
  return {
    parameterId: input.parameterId,
    labelRu: input.labelRu,
    inputType: input.inputType ?? "number",
    unitId: input.unitId ?? null,
    minimum: input.minimum ?? null,
    maximum: input.maximum ?? null,
    choices: [],
    visibleWhen: { kind: "ALWAYS" },
    requiredWhen: input.requiredWhen ?? { kind: "ALWAYS" },
    formulaConsumerIds: [],
    sourceOwnership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "VERIFIED_RATEBOOK"],
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
    normativeTrace: canonicalTrace({ repair: input.repair, projectInput: `Параметры формулы ${input.formula.formulaId}` }),
    normativeSourceIds: [
      "KG_SP_KR_65_101_2025",
      input.repair ? "kg_krerr_2015_application_guidance" : "KG_KRER_10_05_011",
      "PROJECT_DRYWALL_SYSTEM_PASSPORT_R56",
    ],
  };
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
      const isAccess = parameterId.startsWith("access_equipment_");
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

  const retainedMaterialRows = rows.filter((row) =>
    row.category === "material"
    && row.procurement_eligible
    && row.price_route_v3?.kind === "RUNTIME_VALIDATED_INPUT"
    && !REMOVED_COMMON_MATERIAL_KEYS.has(rowKey(row.row_id)),
  );
  const materialFormulas: Batch003R56FormulaDefinition[] = retainedMaterialRows.map((row) => ({
    formulaId: `${catalogId}:successor-r56:formula:material:${rowKey(row.row_id)}`,
    expressionSource: row.formula.expression,
    inputParameterIds: [...row.formula.input_parameter_ids],
    outputUnitId: row.formula.output_unit_id,
  }));
  const materialResources: Batch003R56ResourceDefinition[] = retainedMaterialRows.map((row, ordinal) => {
    const key = rowKey(row.row_id);
    const semanticOwnerId = `${ownerId}:successor-r56:material:${key}`;
    return {
      rowId: `${catalogId}:successor-r56:row:material:${key}`,
      ordinal,
      sectionRu: row.section,
      category: row.category,
      titleRu: row.title_ru,
      formulaId: materialFormulas[ordinal].formulaId,
      outputUnitId: row.formula.output_unit_id,
      inclusionCondition: row.inclusion_condition,
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
  const customFormulas = [operationWorkFormula, deliveryFormula, wasteHaulFormula, accessEquipmentFormula];
  const customResources = [
    customResource({
      catalogId,
      ownerId,
      operation: parts.contract.operation,
      key: "operation_work",
      ordinal: materialResources.length,
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
      ordinal: materialResources.length + 1,
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
      ordinal: materialResources.length + 2,
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
      ordinal: materialResources.length + 3,
      sectionRu: "Оборудование доступа",
      category: "equipment",
      titleRu: "Оборудование доступа к рабочей зоне по проектному ППР",
      formula: accessEquipmentFormula,
      priceParameterId: "unit_price_successor_access_equipment_kgs",
      inclusionCondition: "work_included=true AND access_equipment_required=true",
      resourceClass: "conditional access equipment measured by shift",
      repair,
    }),
  ];
  const formulas = [...materialFormulas, ...customFormulas];
  const resources = [...materialResources, ...customResources];

  const customParameters = [
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
    customParameter({
      parameterId: "access_equipment_shift_count",
      labelRu: "Подтвержденное число смен оборудования доступа",
      unitId: "shift",
      minimum: 0,
      requiredWhen: { kind: "EQUALS", parameter_id: "access_equipment_required", value: true },
    }),
    customParameter({ parameterId: "unit_price_successor_operation_work_kgs", labelRu: "Цена измеримой строительной операции", unitId: `KGS/${operationScope.quantityUnitId}`, minimum: 0 }),
    customParameter({ parameterId: "unit_price_successor_delivery_kgs", labelRu: "Цена единой входящей доставки", unitId: "KGS/t_km", minimum: 0 }),
    customParameter({ parameterId: "unit_price_successor_waste_haul_kgs", labelRu: "Цена единого вывоза отходов", unitId: "KGS/t_km", minimum: 0 }),
    customParameter({ parameterId: "unit_price_successor_access_equipment_kgs", labelRu: "Цена смены оборудования доступа", unitId: "KGS/shift", minimum: 0 }),
  ];
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
      defaultValue: null,
      missingValuePolicy: "FAIL_CLOSED",
    });
  }
  for (const parameter of customParameters) parameterCandidates.set(parameter.parameterId, parameter);
  const requiredParameterIds = new Set<string>([
    "work_included",
    "estimate_scope_mode",
    "project_type",
    "product_profile_id",
    "price_basis_reference",
    "price_basis_date",
    "access_equipment_required",
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

function inclusionAst(resource: Batch003R56ResourceDefinition): Record<string, unknown> {
  const workIncluded = { kind: "parameter", id: "work_included" };
  if (resource.inclusionCondition === "work_included=true") return workIncluded;
  if (resource.inclusionCondition === "work_included=true AND scope_mode=FULL_APPLICABLE_SCOPE") {
    return {
      kind: "and",
      operands: [
        workIncluded,
        { kind: "equals", parameterId: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" },
      ],
    };
  }
  if (resource.inclusionCondition === "work_included=true AND access_equipment_required=true") {
    return {
      kind: "and",
      operands: [
        workIncluded,
        { kind: "equals", parameterId: "access_equipment_required", value: true },
      ],
    };
  }
  throw new Error(`BATCH003_R56_INCLUSION_UNSUPPORTED:${resource.rowId}:${resource.inclusionCondition}`);
}

export async function compileBatch003R56ThroughSharedCore(input: {
  definition: Batch003R56CanonicalSuccessorDefinition;
  values: Readonly<Record<string, Scalar>>;
  operation?: "compile" | "recalculate";
}): Promise<CanonicalEstimateCompileCoreResult> {
  const parameterDefinitions = input.definition.parameters.map((parameter) => ({
    parameter_id: parameter.parameterId,
    value_type: valueType(parameter),
    required: parameter.requiredWhen.kind === "ALWAYS",
    default_value: null,
    constraints_json: constraints(parameter),
    truth_metadata: {
      value_source_role: "EXPLICIT_NO_HIDDEN_DEFAULT",
      formula_consumers: parameter.formulaConsumerIds,
      resource_branch_consumers: input.definition.resources
        .filter((resource) => parameter.formulaConsumerIds.includes(resource.formulaId))
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
      inclusion_ast: inclusionAst(resource),
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
      throw new Error(`BATCH003_R56_PRICE_INPUT_MISSING:${input.definition.catalogId}:${resource.rowId}`);
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
