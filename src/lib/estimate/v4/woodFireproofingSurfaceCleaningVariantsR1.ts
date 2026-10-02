import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_ID =
  "official_sp_kr_54_101_2023_fireproofed_wood_cleaning_project_inputs_v1";
export const WOOD_FIREPROOFING_SURFACE_CLEANING_NORM_ID =
  "norm:kg:sp_kr_54_101_2023:fireproofed_wood_cleaning_direct_inputs:v1";
export const WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256 =
  "e28932e7b9f8ed54b6cb2e222ed1e0981db94a885ea2a698e7c7c33ebea87a6c";

export const WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 54-101:2023 и утверждённая технологическая карта очистки огнезащищённой деревянной поверхности",
  source_authority:
    "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики; изготовитель огнезащитной системы; ответственный инженер проекта",
  source_document_version:
    "SP_KR_54_101_2023_PLUS_APPROVED_FIREPROOF_SURFACE_CLEANING_METHOD",
  definition_hash: WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256,
  exact_locator:
    "СП КР 54-101:2023, §§10.24–10.27, печатная/PDF-страница 80: техническая документация, соблюдение технологии и проверка состояния огнезащищённой поверхности; утверждённые ведомость загрязнения, документация существующей системы, технологическая карта очистки и план обращения с отходами",
  use_restriction:
    "Источник требует учитывать техническую документацию и состояние огнезащищённой поверхности, но не задаёт универсальную технологию очистки, трудоёмкость, расход очистителя, укрывных материалов или отходы. Все количества, кроме подтверждённой площади, принимаются прямо из совместимой технологической карты и плана работ. Нанесение, ремонт, герметизация, инъектирование и усиление исключены.",
  source_kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_APPROVED_CLEANING_METHOD",
  official_url: "https://minstroy.gov.kg/ru/document/54/show",
  artifact_url:
    "https://minstroy.gov.kg/index.php/ru/state_program/download-pdf/5tekstrusskderevo_1002-80865814f343a9461.64636209.pdf",
  artifact_sha256: WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256,
  effective_from: "2024-01-10",
});

export const WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANTS = Object.freeze({
  small_area: Object.freeze({
    catalogId: "canonical-work:base:special_repair_interior_fireproof_clean_small_area",
    catalogVariant: "SMALL_AREA_SEARCH_IDENTITY",
    canonicalNameRu:
      "Совместимая очистка огнезащищённой деревянной поверхности малой площади",
    aliasesRu: [
      "очистка огнезащиты малая площадь",
      "очистка огнезащищённой древесины небольшой площади",
    ],
  }),
  standard: Object.freeze({
    catalogId: "canonical-work:base:special_repair_interior_fireproof_clean_standard",
    catalogVariant: "STANDARD_AREA_SEARCH_IDENTITY",
    canonicalNameRu:
      "Совместимая очистка огнезащищённой деревянной поверхности",
    aliasesRu: [
      "очистка огнезащиты",
      "очистка огнезащищённой деревянной конструкции",
    ],
  }),
});

export type WoodFireproofingSurfaceCleaningVariantKey =
  keyof typeof WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANTS;

const PARAMETER_SPECS = Object.freeze([
  ["cleaning_area_m2", "Площадь очистки огнезащищённой деревянной поверхности", "decimal", "m2", null],
  ["existing_fireproof_system_designation", "Обозначение существующей огнезащитной системы", "text", null, null],
  ["contamination_description", "Описание подтверждённого загрязнения", "text", null, null],
  ["cleaning_method_designation", "Совместимый способ очистки по технологической карте", "text", null, null],
  ["cleaning_labor_man_hour", "Трудоёмкость очистки", "decimal", "man_hour", null],
  ["dust_extraction_equipment_machine_hour", "Время оборудования для удаления пыли", "decimal", "machine_hour", null],
  ["manual_cleaning_tool_machine_hour", "Время ручного механизированного инструмента", "decimal", "machine_hour", null],
  ["approved_cleaner_mode", "Требуется совместимый жидкий очиститель", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["approved_cleaner_designation", "Совместимый очиститель", "text", null, null],
  ["approved_cleaner_volume_l", "Объём совместимого очистителя", "decimal", "l", null],
  ["wipe_designation", "Салфетки или ветошь по технологической карте", "text", null, null],
  ["wipe_quantity_piece", "Количество салфеток или единиц ветоши", "decimal", "pcs", null],
  ["masking_mode", "Требуется укрытие смежных поверхностей", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["masking_material_designation", "Укрывной материал", "text", null, null],
  ["masking_area_m2", "Площадь укрывного материала", "decimal", "m2", null],
  ["waste_bag_designation", "Мешок или тара для собранных загрязнений", "text", null, null],
  ["waste_bag_quantity_piece", "Количество мешков или единиц тары", "decimal", "pcs", null],
  ["collected_waste_mass_kg", "Масса собранных загрязнений и расходников", "decimal", "kg", null],
  ["waste_transport_mode", "Требуется отдельная перевозка отходов", "enum", null, ["HANDOVER_ON_SITE", "TRANSPORT_REQUIRED"]],
  ["waste_transport_trip_count", "Количество рейсов перевозки отходов", "decimal", "trip", null],
  ["readiness_protocol_document_count", "Количество протоколов готовности поверхности", "integer", "document", null],
] as const);

const CONDITIONAL_BRANCHES: Readonly<Record<string, Readonly<{
  parameterId: string;
  requiredValue: InputValue;
  forbiddenValue: InputValue;
}>>> = Object.freeze({
  approved_cleaner_designation: {
    parameterId: "approved_cleaner_mode", requiredValue: "REQUIRED", forbiddenValue: "NOT_REQUIRED",
  },
  approved_cleaner_volume_l: {
    parameterId: "approved_cleaner_mode", requiredValue: "REQUIRED", forbiddenValue: "NOT_REQUIRED",
  },
  masking_material_designation: {
    parameterId: "masking_mode", requiredValue: "REQUIRED", forbiddenValue: "NOT_REQUIRED",
  },
  masking_area_m2: {
    parameterId: "masking_mode", requiredValue: "REQUIRED", forbiddenValue: "NOT_REQUIRED",
  },
  waste_transport_trip_count: {
    parameterId: "waste_transport_mode",
    requiredValue: "TRANSPORT_REQUIRED",
    forbiddenValue: "HANDOVER_ON_SITE",
  },
});

const KNOWN_SCOPE = new Set([
  "cleaning_area_m2",
  "existing_fireproof_system_designation",
  "contamination_description",
]);

export type WoodFireproofingSurfaceCleaningParameter =
  CanonicalEstimateParameterDefinition & {
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
    truth_metadata: Json;
  };

export const WOOD_FIREPROOFING_SURFACE_CLEANING_PARAMETERS:
readonly WoodFireproofingSurfaceCleaningParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => {
    const branch = CONDITIONAL_BRANCHES[parameterId];
    return {
      parameter_id: parameterId,
      ordinal,
      value_type: valueType,
      unit_id: unitId,
      title_ru: titleRu,
      required: branch === undefined,
      default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...(branch ? {
          requiredWhen: {
            kind: "equals", parameterId: branch.parameterId, value: branch.requiredValue,
          },
          forbiddenWhen: {
            kind: "equals", parameterId: branch.parameterId, value: branch.forbiddenValue,
          },
        } : {}),
      },
      truth_metadata: {
        contract: "rik-expo-app.wood-fireproofing-surface-cleaning-variants-r1",
        semantic_parameter_key: `wood-fireproofing-surface-cleaning:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.has(parameterId)
          ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.has(parameterId)
          ? "CONFIRMED_FIREPROOFED_WOOD_CLEANING_SCOPE"
          : "APPROVED_COMPATIBLE_CLEANING_METHOD_OR_WASTE_PLAN",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.has(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: parameterId === "cleaning_area_m2"
            ? "Укажите подтверждённую площадь существующей огнезащищённой деревянной поверхности, подлежащую очистке."
            : KNOWN_SCOPE.has(parameterId)
              ? `${titleRu}: укажите по ведомости состояния и документации существующей системы.`
              : `${titleRu}: укажите прямое значение по совместимой технологической карте или плану обращения с отходами.`,
          source_role: KNOWN_SCOPE.has(parameterId)
            ? "APPROVED_FIREPROOFING_SCOPE_OR_CONFIRMED_MEASUREMENT"
            : "APPROVED_COMPATIBLE_CLEANING_METHOD_OR_WASTE_PLAN",
          source_document: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_ID,
          source_locator: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_METADATA.exact_locator,
          guide_version: "wood-fireproofing-surface-cleaning-r1",
          source_snapshot_hash: WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256,
          applicability:
            "Только совместимая очистка существующей огнезащищённой деревянной поверхности; нанесение, ремонт, герметизация, инъектирование и усиление исключены.",
          verified_at: "2026-09-25T00:00:00+06:00",
          guide_validation_policy:
            "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        synthetic: false,
      },
    };
  },
));

function formula(formulaId: string, outputUnitId: string, parameterId: string) {
  const compiled = compileFormulaGraph(parameterId);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: parameterId,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

const FORMULA_SPECS = Object.freeze([
  ["wood_fireproofing_cleaning_area_v1", "m2", "cleaning_area_m2"],
  ["wood_fireproofing_cleaning_labor_v1", "man_hour", "cleaning_labor_man_hour"],
  ["wood_fireproofing_dust_extraction_time_v1", "machine_hour", "dust_extraction_equipment_machine_hour"],
  ["wood_fireproofing_manual_tool_time_v1", "machine_hour", "manual_cleaning_tool_machine_hour"],
  ["wood_fireproofing_cleaner_volume_v1", "l", "approved_cleaner_volume_l"],
  ["wood_fireproofing_wipe_quantity_v1", "pcs", "wipe_quantity_piece"],
  ["wood_fireproofing_masking_area_v1", "m2", "masking_area_m2"],
  ["wood_fireproofing_waste_bag_quantity_v1", "pcs", "waste_bag_quantity_piece"],
  ["wood_fireproofing_collected_waste_mass_v1", "kg", "collected_waste_mass_kg"],
  ["wood_fireproofing_waste_transport_v1", "trip", "waste_transport_trip_count"],
  ["wood_fireproofing_readiness_protocol_v1", "document", "readiness_protocol_document_count"],
] as const);

export const WOOD_FIREPROOFING_SURFACE_CLEANING_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(FORMULA_SPECS.map(
  ([formulaId, unitId, parameterId]) => formula(formulaId, unitId, parameterId),
));

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({
  kind: "equals",
  parameterId,
  value,
});

const ROW_SPECS = Object.freeze([
  ["f09:wood_fireproofing_cleaned_area", "Объём работ", "construction_work", "Совместимая очистка огнезащищённой деревянной поверхности", false, literalTrue, ["existing_fireproof_system_designation", "cleaning_method_designation"]],
  ["f09:wood_fireproofing_cleaning_labor", "Труд", "construction_work", "Труд по очистке без повреждения огнезащитной системы", false, literalTrue, ["cleaning_method_designation"]],
  ["f09:wood_fireproofing_dust_extraction_equipment", "Оборудование", "equipment", "Оборудование для удаления пыли и сухих загрязнений", true, literalTrue, []],
  ["f09:wood_fireproofing_manual_cleaning_tool", "Оборудование", "equipment", "Ручной механизированный инструмент совместимой очистки", true, literalTrue, []],
  ["f09:wood_fireproofing_approved_cleaner", "Условные материалы", "material", "Совместимый очиститель огнезащищённой поверхности", true, equals("approved_cleaner_mode", "REQUIRED"), ["approved_cleaner_designation"]],
  ["f09:wood_fireproofing_cleaning_wipes", "Материалы", "material", "Салфетки или ветошь для совместимой очистки", true, literalTrue, ["wipe_designation"]],
  ["f09:wood_fireproofing_masking_material", "Условные материалы", "material", "Укрывной материал для защиты смежных поверхностей", true, equals("masking_mode", "REQUIRED"), ["masking_material_designation"]],
  ["f09:wood_fireproofing_waste_bags", "Материалы", "material", "Мешки или тара для собранных загрязнений", true, literalTrue, ["waste_bag_designation"]],
  ["f09:wood_fireproofing_collected_waste", "Отходы", "service", "Сбор загрязнений и использованных расходников", true, literalTrue, []],
  ["f09:wood_fireproofing_waste_transport", "Перевозка", "service", "Перевозка отходов очистки к утверждённому получателю", true, equals("waste_transport_mode", "TRANSPORT_REQUIRED"), []],
  ["f09:wood_fireproofing_surface_readiness_protocol", "Документация", "service", "Протокол готовности очищенной огнезащищённой поверхности", true, literalTrue, []],
] as const);

export const WOOD_FIREPROOFING_SURFACE_CLEANING_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROW_SPECS.map(
  ([rowId, section, category, titleRu, procurementEligible, inclusionAst,
    titleParameterIds], ordinal) => {
    const [formulaId, unitId] = FORMULA_SPECS[ordinal];
    const resourceGraph = {
      formulaId,
      normalizedUom: unitId,
      semanticOwnerId: `wood-fireproofing-surface-cleaning:${rowId}`,
      costOwner: ordinal === 0 ? "scope" : "resource",
      costTreatment: ordinal === 0 ? "INFORMATIONAL_SCOPE" : "OWN_COST",
      payable: ordinal !== 0,
      noDoubleCount: true,
      ...(titleParameterIds.length > 0 ? {
        titleSpecificationParameterIds: [...titleParameterIds],
        titleSpecificationMode: "APPEND",
        titleSpecificationSeparator: " — ",
      } : {}),
      scopeContextParameterIds: [
        "cleaning_area_m2",
        "existing_fireproof_system_designation",
        "contamination_description",
      ],
    };
    const sourceMetadata = {
      truth_contract_version: "R3",
      synthetic: false,
      sourceRole: ordinal === 0
        ? "CONFIRMED_FIREPROOFED_WOOD_CLEANING_SCOPE"
        : "APPROVED_COMPATIBLE_CLEANING_METHOD_OR_WASTE_PLAN",
      normativeTrace: [{
        sourceId: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_ID,
        source_id: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_ID,
        normId: WOOD_FIREPROOFING_SURFACE_CLEANING_NORM_ID,
        norm_id: WOOD_FIREPROOFING_SURFACE_CLEANING_NORM_ID,
        normVersion:
          WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_METADATA.source_document_version,
        source_title: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_METADATA.source_title,
        exact_locator: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_METADATA.exact_locator,
        source_definition_hash: WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256,
      }],
      quantityBasis: ordinal === 0
        ? "CONFIRMED_FIREPROOFED_WOOD_CLEANING_AREA_INFORMATIONAL_SCOPE"
        : "DIRECT_APPROVED_COMPATIBLE_CLEANING_METHOD_OR_WASTE_PLAN_INPUT",
      excludedUnownedAssumptions: [
        "universal cleaning productivity or consumption rate",
        "automatic cleaner, masking or waste quantity",
        "coating application, repair, sealing, injection or strengthening",
        "metal, concrete, cable or penetration fireproofing",
        "invented price",
      ],
    };
    return {
      id: `resource-${rowId.replace(/:/gu, "-")}`,
      row_id: rowId,
      ordinal,
      section,
      category,
      title_ru: titleRu,
      unit_id: unitId,
      formula_id: formulaId,
      inclusion_ast: inclusionAst,
      resource_graph: resourceGraph,
      procurement_eligible: procurementEligible,
      cost_owner_id: rowId,
      source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({
        rowId, ordinal, section, category, titleRu, unitId, formulaId,
        procurementEligible, inclusionAst, resourceGraph, sourceMetadata,
      }),
    };
  },
));

export const WOOD_FIREPROOFING_SURFACE_CLEANING_SHORT_INPUT = Object.freeze({
  cleaning_area_m2: 100,
  existing_fireproof_system_designation:
    "Существующая огнезащитная система деревянной конструкции по ведомости",
  contamination_description: "Пыль и сухие эксплуатационные загрязнения по акту осмотра",
  cleaning_method_designation: "Сухая совместимая очистка по технологической карте",
  approved_cleaner_mode: "NOT_REQUIRED",
  masking_mode: "NOT_REQUIRED",
  waste_transport_mode: "HANDOVER_ON_SITE",
});

export const WOOD_FIREPROOFING_SURFACE_CLEANING_ACCEPTANCE_INPUT = Object.freeze({
  ...WOOD_FIREPROOFING_SURFACE_CLEANING_SHORT_INPUT,
  cleaning_method_designation:
    "Комбинированная совместимая очистка по технологической карте",
  cleaning_labor_man_hour: 20,
  dust_extraction_equipment_machine_hour: 4,
  manual_cleaning_tool_machine_hour: 8,
  approved_cleaner_mode: "REQUIRED",
  approved_cleaner_designation:
    "Очиститель, письменно совместимый с существующей огнезащитной системой",
  approved_cleaner_volume_l: 5,
  wipe_designation: "Безворсовые салфетки по технологической карте",
  wipe_quantity_piece: 50,
  masking_mode: "REQUIRED",
  masking_material_designation: "Укрывной материал для смежных поверхностей",
  masking_area_m2: 120,
  waste_bag_designation: "Мешок для собранных загрязнений по плану отходов",
  waste_bag_quantity_piece: 10,
  collected_waste_mass_kg: 15,
  waste_transport_mode: "TRANSPORT_REQUIRED",
  waste_transport_trip_count: 1,
  readiness_protocol_document_count: 1,
});

export function resolveWoodFireproofingSurfaceCleaningVariant(
  variantKey: string,
): (typeof WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANTS)[
  WoodFireproofingSurfaceCleaningVariantKey
] {
  if (!Object.prototype.hasOwnProperty.call(
    WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANTS,
    variantKey,
  )) {
    throw new Error(`WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANT_UNSUPPORTED:${variantKey}`);
  }
  return WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANTS[
    variantKey as WoodFireproofingSurfaceCleaningVariantKey
  ];
}

export function woodFireproofingSurfaceCleaningCompletenessMap(
  variantKey: WoodFireproofingSurfaceCleaningVariantKey,
) {
  const variant = WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANTS[variantKey];
  return Object.freeze({
    contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
    sourceKind: "PROJECT_SYSTEM",
    generatedFromCurrentRows: false,
    evidenceSha256: WOOD_FIREPROOFING_SURFACE_CLEANING_ARTIFACT_SHA256,
    evidenceReferences: [
      WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_METADATA.official_url,
      "СП КР 54-101:2023, §§10.24–10.27, printed/PDF page 80",
      "approved contamination statement, compatible cleaning method and waste plan",
    ],
    catalogVariant: `${variant.catalogVariant}_NO_HIDDEN_QUANTITY_FACTOR`,
    entries: ROW_SPECS.map(([rowId, , category, titleRu], ordinal) => ({
      operationId: rowId.replace("f09:", ""),
      expectedResourceId: `required-operation:${rowId.replace("f09:", "")}`,
      category,
      specification: titleRu,
      condition: ordinal === 4
        ? "approved_cleaner_mode=REQUIRED"
        : ordinal === 6
          ? "masking_mode=REQUIRED"
          : ordinal === 9
            ? "waste_transport_mode=TRANSPORT_REQUIRED"
            : "wood_fireproofing_surface_cleaning_selected",
      sourceId: WOOD_FIREPROOFING_SURFACE_CLEANING_SOURCE_ID,
      unitId: FORMULA_SPECS[ordinal][1],
      quantityRule: ordinal === 0
        ? "CONFIRMED_FIREPROOFED_WOOD_CLEANING_AREA_INFORMATIONAL_SCOPE"
        : "DIRECT_APPROVED_COMPATIBLE_CLEANING_METHOD_OR_WASTE_PLAN_INPUT",
      detailPrinciple:
        "CLEANING_ONLY_NO_COATING_REPAIR_SEALING_INJECTION_OR_STRENGTHENING",
      priceRelation: ordinal === 0 ? "INFORMATIONAL_SCOPE" : "OWN_COST_OR_HONESTLY_UNKNOWN",
      formulaId: FORMULA_SPECS[ordinal][0],
      resolution: { kind: "ROW", rowId },
    })),
  });
}

export async function compileWoodFireproofingSurfaceCleaningVariantR1(
  variantKey: WoodFireproofingSurfaceCleaningVariantKey,
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const variant = WOOD_FIREPROOFING_SURFACE_CLEANING_VARIANTS[variantKey];
  const catalogId = options.catalogId ?? variant.catalogId;
  if (catalogId !== variant.catalogId) {
    throw new Error(`WOOD_FIREPROOFING_SURFACE_CLEANING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion:
      `canonical-estimate-compiler.wood-fireproofing-surface-cleaning-${variantKey}-r1`,
    catalogId,
    primaryMeasureParameterId: "cleaning_area_m2",
    parameterDefinitions: [...WOOD_FIREPROOFING_SURFACE_CLEANING_PARAMETERS],
    formulaDefinitions: [...WOOD_FIREPROOFING_SURFACE_CLEANING_FORMULAS],
    resourceDefinitions: [...WOOD_FIREPROOFING_SURFACE_CLEANING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 16,
    hashJson: async (value) => JSON.stringify(value),
  });
}
