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

export const SPLIT_SYSTEM_BLOCKS_CATALOG_ID =
  "canonical-work:base:heating_hvac_interior_split_install_standard";
export const SPLIT_SYSTEM_BLOCKS_SOURCE_ID = "project_split_system_blocks_package_v1";
export const SPLIT_SYSTEM_BLOCKS_NORM_ID = "norm:project:split_system_blocks:package:v1";

export const SPLIT_SYSTEM_BLOCKS_SOURCE_METADATA = Object.freeze({
  source_title: "Подтверждённое количество и длины трасс сплит-систем, спецификация оборудования, монтажные узлы, ППР и программа испытаний",
  source_authority: "Проектная организация, изготовитель выбранной сплит-системы и утверждающий инженер проекта",
  source_document_version: "PROJECT_SPLIT_SYSTEM_EQUIPMENT_ROUTE_METHOD_QA_REVISION_EXPLICIT",
  definition_hash: "eh_project_split_system_blocks_package_r1",
  exact_locator: "Количество комплектов, холодопроизводительность и длина каждой трассы; паспорта блоков и межблочных коммуникаций; узлы опор и проходок; ППР, программа опрессовки азотом, вакуумирования и пусконаладки",
  use_restriction: "Известные количество комплектов и длина каждой трассы определяют монтаж, число блоков и геометрические длины двух холодильных линий, двух изоляционных оболочек, дренажа и кабеля. Опоры, расход азота, дополнительный хладагент, огнестойкие проходки и декоративный короб берутся только из проекта, паспорта и ППР без исторических надбавок на метр.",
});

const CONDITIONAL_DETAILS = new Set([
  "additional_refrigerant_designation", "additional_refrigerant_mass_kg",
  "fire_rated_penetration_seal_designation", "fire_rated_penetration_seal_quantity_piece",
  "decorative_trunking_designation", "decorative_trunking_length_m",
]);

const PARAMETER_SPECS = Object.freeze([
  ["system_count", "Количество монтируемых сплит-систем", "integer", "set", null],
  ["cooling_capacity_kw", "Холодопроизводительность одного комплекта", "decimal", "kw", null],
  ["route_length_each_m", "Длина трассы каждого комплекта", "decimal", "m", null],
  ["support_designation", "Опора наружного блока по проектному узлу", "text", null, null],
  ["support_quantity_set", "Количество комплектов опор наружных блоков", "decimal", "set", null],
  ["nitrogen_test_designation", "Опрессовка сухим азотом по программе испытаний", "text", null, null],
  ["nitrogen_volume_m3", "Объём сухого азота по программе испытаний", "decimal", "m3", null],
  ["additional_refrigerant_mode", "Дополнительный хладагент требуется по паспорту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["additional_refrigerant_designation", "Дополнительный хладагент по паспорту", "text", null, null],
  ["additional_refrigerant_mass_kg", "Масса дополнительного хладагента", "decimal", "kg", null],
  ["fire_rated_penetration_seal_mode", "Огнестойкая заделка проходки требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["fire_rated_penetration_seal_designation", "Огнестойкая заделка проходки по проекту", "text", null, null],
  ["fire_rated_penetration_seal_quantity_piece", "Количество огнестойких проходок", "decimal", "pcs", null],
  ["decorative_trunking_mode", "Декоративный короб трассы требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["decorative_trunking_designation", "Декоративный короб трассы по проекту", "text", null, null],
  ["decorative_trunking_length_m", "Длина декоративного короба", "decimal", "m", null],
] as const);

const KNOWN_SCOPE = ["system_count", "cooling_capacity_kw", "route_length_each_m"];

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("additional_refrigerant_")
    ? "additional_refrigerant_mode"
    : parameterId.startsWith("fire_rated_penetration_seal_")
      ? "fire_rated_penetration_seal_mode"
      : parameterId.startsWith("decorative_trunking_")
        ? "decorative_trunking_mode"
        : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type SplitSystemBlocksParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const SPLIT_SYSTEM_BLOCKS_PARAMETERS:
readonly SplitSystemBlocksParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues
        ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text"
            ? { minLength: 1, maxLength: 1_000 }
            : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.split-system-blocks-r1",
      semantic_parameter_key: `split-system-blocks:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_EQUIPMENT_ROUTE_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "route_length_each_m"
          ? "Укажите длину одной трассы между внутренним и наружным блоками по обмеру или плану."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по заданию и маркировке выбранного оборудования.`
            : `${titleRu}: укажите по проектному узлу, паспорту оборудования, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_SPLIT_SYSTEM_SCOPE"
          : "APPROVED_PROJECT_EQUIPMENT_ROUTE_METHOD_OR_QA_DOCUMENTATION",
        source_document: SPLIT_SYSTEM_BLOCKS_SOURCE_ID,
        source_locator: SPLIT_SYSTEM_BLOCKS_SOURCE_METADATA.exact_locator,
        guide_version: "split-system-blocks-r1",
        source_snapshot_hash: "cb546855d5a34e515a6e982c2b3a80b4c9dfced933ef3994f9ed72772f7c9479",
        applicability: "Только для монтажа указанных внутренних и наружных блоков отдельных сплит-систем 3,5 кВт с трассой 8 м на комплект; общая VRF-система и полное электроснабжение здания не включаются.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const SPLIT_SYSTEM_BLOCKS_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("split_system_install_commission_count_v1", "set", "system_count"),
  formula("split_system_indoor_outdoor_quantity_v1", "set", "system_count"),
  formula("refrigeration_copper_pipe_pair_length_v1", "m", "system_count * route_length_each_m * 2"),
  formula("closed_cell_pipe_insulation_pair_length_v1", "m", "system_count * route_length_each_m * 2"),
  formula("condensate_drain_pipe_length_v1", "m", "system_count * route_length_each_m"),
  formula("split_interconnect_cable_length_v1", "m", "system_count * route_length_each_m"),
  formula("outdoor_unit_support_quantity_v1", "set", "support_quantity_set"),
  formula("dry_nitrogen_test_volume_v1", "m3", "nitrogen_volume_m3"),
  formula("split_system_vacuum_commission_count_v1", "test", "system_count"),
  formula("additional_refrigerant_mass_v1", "kg", "additional_refrigerant_mass_kg"),
  formula("fire_rated_penetration_seal_quantity_v1", "pcs", "fire_rated_penetration_seal_quantity_piece"),
  formula("decorative_trunking_length_v1", "m", "decorative_trunking_length_m"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  inclusionAst?: Json;
  procurementEligible: boolean;
  titleParameterIds?: string[];
  sourceRole: string;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `split-system-blocks:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: SPLIT_SYSTEM_BLOCKS_SOURCE_ID,
      source_id: SPLIT_SYSTEM_BLOCKS_SOURCE_ID,
      normId: SPLIT_SYSTEM_BLOCKS_NORM_ID,
      norm_id: SPLIT_SYSTEM_BLOCKS_NORM_ID,
      normVersion: SPLIT_SYSTEM_BLOCKS_SOURCE_METADATA.source_document_version,
      source_title: SPLIT_SYSTEM_BLOCKS_SOURCE_METADATA.source_title,
      exact_locator: SPLIT_SYSTEM_BLOCKS_SOURCE_METADATA.exact_locator,
      source_definition_hash: SPLIT_SYSTEM_BLOCKS_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "historical drain or cable allowance per system",
      "automatic wall-bracket selection",
      "automatic nitrogen or refrigerant consumption",
      "automatic fire-rated penetration seal or decorative trunking",
      "building VRF system or full electrical distribution",
      "invented price",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

export const SPLIT_SYSTEM_BLOCKS_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:split_system_install_commission", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Монтаж блоков, трассы и пусконаладка сплит-системы 3,5 кВт", unitId: "set", formulaId: "split_system_install_commission_count_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_SPLIT_SYSTEM_SCOPE" }),
  resource({ rowId: "rc09:split_system_indoor_outdoor_3_5kw", ordinal: 1, section: "Оборудование", category: "material", titleRu: "Комплект внутреннего и наружного блока сплит-системы 3,5 кВт", unitId: "set", formulaId: "split_system_indoor_outdoor_quantity_v1", procurementEligible: true, sourceRole: "USER_SUPPLIED_OR_APPROVED_SPLIT_SYSTEM_SCOPE" }),
  resource({ rowId: "rc09:refrigeration_copper_pipe_pair", ordinal: 2, section: "Материалы", category: "material", titleRu: "Медные холодильные трубы двух диаметров по паспорту выбранной сплит-системы", unitId: "m", formulaId: "refrigeration_copper_pipe_pair_length_v1", procurementEligible: true, sourceRole: "KNOWN_ROUTE_GEOMETRY_AND_EQUIPMENT_PASSPORT" }),
  resource({ rowId: "rc09:closed_cell_pipe_insulation_pair", ordinal: 3, section: "Материалы", category: "material", titleRu: "Закрытоячеистая теплоизоляция двух медных труб по паспорту системы", unitId: "m", formulaId: "closed_cell_pipe_insulation_pair_length_v1", procurementEligible: true, sourceRole: "KNOWN_ROUTE_GEOMETRY_AND_EQUIPMENT_PASSPORT" }),
  resource({ rowId: "rc09:condensate_drain_pipe_d20", ordinal: 4, section: "Материалы", category: "material", titleRu: "Труба дренажная ПВХ Ø20 мм для конденсата без неуказанного запаса", unitId: "m", formulaId: "condensate_drain_pipe_length_v1", procurementEligible: true, sourceRole: "KNOWN_ROUTE_GEOMETRY" }),
  resource({ rowId: "rc09:split_interconnect_cable", ordinal: 5, section: "Материалы", category: "material", titleRu: "Кабель межблочный медный негорючий по паспорту оборудования без неуказанного запаса", unitId: "m", formulaId: "split_interconnect_cable_length_v1", procurementEligible: true, sourceRole: "KNOWN_ROUTE_GEOMETRY_AND_EQUIPMENT_PASSPORT" }),
  resource({ rowId: "rc09:outdoor_unit_wall_bracket", ordinal: 6, section: "Материалы", category: "material", titleRu: "Комплект опор наружного блока с виброопорами по проектному узлу", unitId: "set", formulaId: "outdoor_unit_support_quantity_v1", procurementEligible: true, titleParameterIds: ["support_designation"], sourceRole: "APPROVED_SUPPORT_DETAIL" }),
  resource({ rowId: "rc09:dry_nitrogen_pressure_test", ordinal: 7, section: "Материалы", category: "material", titleRu: "Азот технический сухой для опрессовки холодильного контура", unitId: "m3", formulaId: "dry_nitrogen_test_volume_v1", procurementEligible: true, titleParameterIds: ["nitrogen_test_designation"], sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "rc09:split_system_vacuum_leak_commission", ordinal: 8, section: "Контроль", category: "service", titleRu: "Вакуумирование, проверка герметичности и пусконаладка сплит-системы", unitId: "test", formulaId: "split_system_vacuum_commission_count_v1", procurementEligible: true, sourceRole: "USER_SUPPLIED_OR_APPROVED_SPLIT_SYSTEM_SCOPE" }),
  resource({ rowId: "rc09:additional_refrigerant", ordinal: 9, section: "Условные материалы", category: "material", titleRu: "Дополнительный хладагент по паспорту оборудования и фактической трассе", unitId: "kg", formulaId: "additional_refrigerant_mass_v1", inclusionAst: equals("additional_refrigerant_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["additional_refrigerant_designation"], sourceRole: "APPROVED_EQUIPMENT_PASSPORT" }),
  resource({ rowId: "rc09:fire_rated_penetration_seal", ordinal: 10, section: "Условные материалы", category: "material", titleRu: "Огнестойкая заделка проходки трассы", unitId: "pcs", formulaId: "fire_rated_penetration_seal_quantity_v1", inclusionAst: equals("fire_rated_penetration_seal_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["fire_rated_penetration_seal_designation"], sourceRole: "APPROVED_FIRE_SAFETY_PROJECT" }),
  resource({ rowId: "rc09:decorative_trunking", ordinal: 11, section: "Условные материалы", category: "material", titleRu: "Декоративный короб для открытого участка трассы", unitId: "m", formulaId: "decorative_trunking_length_v1", inclusionAst: equals("decorative_trunking_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["decorative_trunking_designation"], sourceRole: "APPROVED_ROUTE_LAYOUT" }),
]);

export const SPLIT_SYSTEM_BLOCKS_SHORT_INPUT = Object.freeze({
  system_count: 4,
  cooling_capacity_kw: 3.5,
  route_length_each_m: 8,
});

export const SPLIT_SYSTEM_BLOCKS_ACCEPTANCE_INPUT = Object.freeze({
  ...SPLIT_SYSTEM_BLOCKS_SHORT_INPUT,
  support_designation: "Комплект настенных опор с виброопорами по проектному узлу",
  support_quantity_set: 4,
  nitrogen_test_designation: "Опрессовка сухим азотом по программе испытаний",
  nitrogen_volume_m3: 0.32,
  additional_refrigerant_mode: "NOT_REQUIRED",
  fire_rated_penetration_seal_mode: "NOT_REQUIRED",
  decorative_trunking_mode: "NOT_REQUIRED",
});

export async function compileSplitSystemBlocksR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? SPLIT_SYSTEM_BLOCKS_CATALOG_ID;
  if (catalogId !== SPLIT_SYSTEM_BLOCKS_CATALOG_ID) {
    throw new Error(`SPLIT_SYSTEM_BLOCKS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.split-system-blocks-r1",
    catalogId,
    primaryMeasureParameterId: "system_count",
    parameterDefinitions: [...SPLIT_SYSTEM_BLOCKS_PARAMETERS],
    formulaDefinitions: [...SPLIT_SYSTEM_BLOCKS_FORMULAS],
    resourceDefinitions: [...SPLIT_SYSTEM_BLOCKS_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 16,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const SPLIT_SYSTEM_BLOCKS_SOURCE_SUMMARY = Object.freeze({
  sourceId: SPLIT_SYSTEM_BLOCKS_SOURCE_ID,
  normId: SPLIT_SYSTEM_BLOCKS_NORM_ID,
  formula: "known system count and per-system route length give work, equipment count and direct geometric communication lengths; exact supports, nitrogen and conditional quantities come from approved project, passport, method and QA evidence",
});
