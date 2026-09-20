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

export const MONOLITHIC_REBAR_CAGE_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_reinforcement_frame_reinforce_standard";
export const MONOLITHIC_REBAR_CAGE_SOURCE_ID =
  "project_monolithic_rebar_cage_bbs_method_statement_v1";
export const MONOLITHIC_REBAR_CAGE_NORM_ID =
  "norm:project:monolithic_rebar_cage:bbs_method_statement:v1";
export const MONOLITHIC_REBAR_CAGE_PRODUCT_PROFILE_ID =
  "monolithic_rebar_cage_confirmed_bbs_v1";

export const MONOLITHIC_REBAR_CAGE_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая ведомость стержней (BBS), рабочий чертёж и ППР армирования",
  source_authority: "Проектная организация и утверждающий инженер проекта",
  source_document_version: "PROJECT_REVISION_EXPLICIT",
  definition_hash: "eh_monolithic_rebar_cage_project_bbs_r1",
  exact_locator: "Марки стержней Ø12/Ø16, ведомость проволоки, фиксаторов, соединений и ППР изготовления каркаса",
  use_restriction: "Массы, количества и трудоёмкость берутся только из BBS, ППР или производственной ведомости; коэффициент кг/м³ запрещён",
});

const CONDITIONAL_DETAILS = new Set([
  "mechanical_coupler_designation",
  "mechanical_coupler_quantity_piece",
  "welding_electrode_designation",
  "welding_electrode_mass_kg",
]);

const PARAMETER_SPECS = Object.freeze([
  ["structure_volume_m3", "Объём монолитной конструкции", "decimal", "m3", null],
  ["bbs_confirmation_state", "Состояние подтверждённой BBS", "enum", null, ["CONFIRMED_SUMMARY_NOT_ATTACHED", "CONFIRMED_WITH_QUANTITIES"]],
  ["bbs_reference", "Ссылка на утверждённую BBS и ревизию", "text", null, null],
  ["rebar_d12_designation", "Класс и диаметр арматуры Ø12", "text", null, null],
  ["rebar_d12_mass_kg", "Масса арматуры Ø12 по BBS", "decimal", "kg", null],
  ["rebar_d16_designation", "Класс и диаметр арматуры Ø16", "text", null, null],
  ["rebar_d16_mass_kg", "Масса арматуры Ø16 по BBS", "decimal", "kg", null],
  ["binding_wire_designation", "Марка отожжённой вязальной проволоки", "text", null, null],
  ["binding_wire_mass_kg", "Масса вязальной проволоки по ведомости", "decimal", "kg", null],
  ["cover_spacer_designation", "Тип фиксатора защитного слоя", "text", null, null],
  ["cover_spacer_quantity_piece", "Количество фиксаторов защитного слоя", "decimal", "piece", null],
  ["cutting_bending_machine_designation", "Станок резки и гибки арматуры", "text", null, null],
  ["cutting_bending_machine_h", "Машино-часы станка резки и гибки", "decimal", "machine_hour", null],
  ["acceptance_record_designation", "Исполнительная запись приёмки каркаса", "text", null, null],
  ["acceptance_record_count", "Количество записей приёмки каркаса", "decimal", "document", null],
  ["mechanical_coupler_mode", "Механические муфты по BBS", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["mechanical_coupler_designation", "Тип механической муфты", "text", null, null],
  ["mechanical_coupler_quantity_piece", "Количество механических муфт", "decimal", "piece", null],
  ["welding_electrode_mode", "Сварочные соединения по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["welding_electrode_designation", "Марка электродов для арматуры", "text", null, null],
  ["welding_electrode_mass_kg", "Масса электродов для арматуры", "decimal", "kg", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  if (parameterId.startsWith("mechanical_coupler_") && parameterId !== "mechanical_coupler_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "mechanical_coupler_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "mechanical_coupler_mode", value: "NOT_REQUIRED" },
    };
  }
  if (parameterId.startsWith("welding_electrode_") && parameterId !== "welding_electrode_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "welding_electrode_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "welding_electrode_mode", value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type MonolithicRebarCageParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const MONOLITHIC_REBAR_CAGE_PARAMETERS:
readonly MonolithicRebarCageParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
        : valueType === "decimal"
          ? { min: 0.000_001 }
          : valueType === "text"
            ? { minLength: 1, maxLength: 1_000 }
            : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.monolithic-rebar-cage-r1",
      semantic_parameter_key: `monolithic-rebar-cage:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: "APPROVED_BBS_DRAWING_METHOD_STATEMENT_OR_QA_RECORD",
      preliminary_compilation_allowed: true,
      source_confirmation_required: true,
      guide: {
        guide_kind: "PROJECT_DEFINED",
        guide_short_ru: `${titleRu}: укажите значение из утверждённой BBS, рабочего чертежа, ППР или плана качества.`,
        source_role: "APPROVED_PROJECT_DOCUMENTATION",
        source_document: MONOLITHIC_REBAR_CAGE_SOURCE_ID,
        source_locator: MONOLITHIC_REBAR_CAGE_SOURCE_METADATA.exact_locator,
        guide_version: "monolithic-rebar-cage-r1",
        source_snapshot_hash: "1b46396dc89ff1c2ab41dc8679136187299674638297e7dfaf3f09c3f22e07a0",
        applicability: "Только для конкретной BBS; объём конструкции не преобразуется в массу арматуры.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  }),
));

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

export const MONOLITHIC_REBAR_CAGE_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("rebar_cage_assembly_weight_v1", "kg", "rebar_d12_mass_kg + rebar_d16_mass_kg"),
  formula("rebar_d12_mass_v1", "kg", "rebar_d12_mass_kg"),
  formula("rebar_d16_mass_v1", "kg", "rebar_d16_mass_kg"),
  formula("binding_wire_mass_v1", "kg", "binding_wire_mass_kg"),
  formula("cover_spacer_quantity_v1", "piece", "cover_spacer_quantity_piece"),
  formula("cutting_bending_machine_time_v1", "machine_hour", "cutting_bending_machine_h"),
  formula("acceptance_record_count_v1", "document", "acceptance_record_count"),
  formula("mechanical_coupler_quantity_v1", "piece", "mechanical_coupler_quantity_piece"),
  formula("welding_electrode_mass_v1", "kg", "welding_electrode_mass_kg"),
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
    semanticOwnerId: `monolithic-rebar-cage:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    scopeContextParameterIds: ["structure_volume_m3", "bbs_confirmation_state"],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: MONOLITHIC_REBAR_CAGE_SOURCE_ID,
      source_id: MONOLITHIC_REBAR_CAGE_SOURCE_ID,
      normId: MONOLITHIC_REBAR_CAGE_NORM_ID,
      norm_id: MONOLITHIC_REBAR_CAGE_NORM_ID,
      normVersion: MONOLITHIC_REBAR_CAGE_SOURCE_METADATA.source_document_version,
      source_title: MONOLITHIC_REBAR_CAGE_SOURCE_METADATA.source_title,
      exact_locator: MONOLITHIC_REBAR_CAGE_SOURCE_METADATA.exact_locator,
      source_definition_hash: MONOLITHIC_REBAR_CAGE_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "reinforcement kilograms per cubic metre",
      "automatic cutting, bending or installation productivity",
      "automatic tie-wire or spacer consumption",
      "ready-mix concrete, formwork or curing scope",
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

export const MONOLITHIC_REBAR_CAGE_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "work:rebar-cage:assemble-install", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Сборка, установка и фиксация арматурного каркаса по BBS", unitId: "kg", formulaId: "rebar_cage_assembly_weight_v1", procurementEligible: false, sourceRole: "APPROVED_BBS" }),
  resource({ rowId: "material:rebar-cage:a500c-d12", ordinal: 1, section: "Материалы", category: "material", titleRu: "Арматура A500C Ø12 по BBS", unitId: "kg", formulaId: "rebar_d12_mass_v1", procurementEligible: true, titleParameterIds: ["rebar_d12_designation", "bbs_reference"], sourceRole: "APPROVED_BBS" }),
  resource({ rowId: "material:rebar-cage:a500c-d16", ordinal: 2, section: "Материалы", category: "material", titleRu: "Арматура A500C Ø16 по BBS", unitId: "kg", formulaId: "rebar_d16_mass_v1", procurementEligible: true, titleParameterIds: ["rebar_d16_designation", "bbs_reference"], sourceRole: "APPROVED_BBS" }),
  resource({ rowId: "material:rebar-cage:annealed-tie-wire", ordinal: 3, section: "Материалы", category: "material", titleRu: "Проволока вязальная отожжённая Ø1,2 мм", unitId: "kg", formulaId: "binding_wire_mass_v1", procurementEligible: true, titleParameterIds: ["binding_wire_designation"], sourceRole: "APPROVED_BBS" }),
  resource({ rowId: "material:rebar-cage:cover-spacer-35", ordinal: 4, section: "Материалы", category: "material", titleRu: "Фиксатор защитного слоя 35 мм", unitId: "piece", formulaId: "cover_spacer_quantity_v1", procurementEligible: true, titleParameterIds: ["cover_spacer_designation"], sourceRole: "STRUCTURAL_DRAWING" }),
  resource({ rowId: "equipment:rebar-cage:cutting-bending-machine", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Станок резки и гибки арматуры", unitId: "machine_hour", formulaId: "cutting_bending_machine_time_v1", procurementEligible: true, titleParameterIds: ["cutting_bending_machine_designation"], sourceRole: "METHOD_STATEMENT" }),
  resource({ rowId: "service:rebar-cage:acceptance-record", ordinal: 6, section: "Контроль", category: "service", titleRu: "Исполнительная запись приёмки арматурного каркаса", unitId: "document", formulaId: "acceptance_record_count_v1", procurementEligible: true, titleParameterIds: ["acceptance_record_designation"], sourceRole: "PROJECT_QUALITY_PLAN" }),
  resource({ rowId: "material:rebar-cage:mechanical-couplers", ordinal: 7, section: "Условные материалы", category: "material", titleRu: "Механические муфты арматуры", unitId: "piece", formulaId: "mechanical_coupler_quantity_v1", inclusionAst: equals("mechanical_coupler_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["mechanical_coupler_designation"], sourceRole: "APPROVED_BBS" }),
  resource({ rowId: "material:rebar-cage:welding-electrodes", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Электроды для сварных соединений арматуры", unitId: "kg", formulaId: "welding_electrode_mass_v1", inclusionAst: equals("welding_electrode_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["welding_electrode_designation"], sourceRole: "APPROVED_BBS_AND_WELDING_PROCEDURE" }),
]);

export const MONOLITHIC_REBAR_CAGE_SHORT_INPUT = Object.freeze({
  structure_volume_m3: 20,
  bbs_confirmation_state: "CONFIRMED_SUMMARY_NOT_ATTACHED",
});

export const MONOLITHIC_REBAR_CAGE_ACCEPTANCE_INPUT = Object.freeze({
  structure_volume_m3: 20,
  bbs_confirmation_state: "CONFIRMED_WITH_QUANTITIES",
  bbs_reference: "BBS-RF-STD-REV-B",
  rebar_d12_designation: "A500C Ø12",
  rebar_d12_mass_kg: 640,
  rebar_d16_designation: "A500C Ø16",
  rebar_d16_mass_kg: 860,
  binding_wire_designation: "Проволока отожжённая Ø1,2 мм",
  binding_wire_mass_kg: 21,
  cover_spacer_designation: "Фиксатор защитного слоя 35 мм",
  cover_spacer_quantity_piece: 228,
  cutting_bending_machine_designation: "Станок резки и гибки арматуры по ППР",
  cutting_bending_machine_h: 12,
  acceptance_record_designation: "Акт освидетельствования арматурного каркаса",
  acceptance_record_count: 1,
  mechanical_coupler_mode: "NOT_REQUIRED",
  welding_electrode_mode: "NOT_REQUIRED",
});

export async function compileMonolithicRebarCageR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? MONOLITHIC_REBAR_CAGE_CATALOG_ID;
  if (catalogId !== MONOLITHIC_REBAR_CAGE_CATALOG_ID) {
    throw new Error(`MONOLITHIC_REBAR_CAGE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.monolithic-rebar-cage-r1",
    catalogId,
    primaryMeasureParameterId: null,
    parameterDefinitions: [...MONOLITHIC_REBAR_CAGE_PARAMETERS],
    formulaDefinitions: [...MONOLITHIC_REBAR_CAGE_FORMULAS],
    resourceDefinitions: [...MONOLITHIC_REBAR_CAGE_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const MONOLITHIC_REBAR_CAGE_SOURCE_SUMMARY = Object.freeze({
  sourceId: MONOLITHIC_REBAR_CAGE_SOURCE_ID,
  normId: MONOLITHIC_REBAR_CAGE_NORM_ID,
  productProfileId: MONOLITHIC_REBAR_CAGE_PRODUCT_PROFILE_ID,
  formula: "exact BBS masses by diameter; cage work quantity equals the sum of supplied bar masses",
  kgPerM3FactorRejected: true,
  automaticTieWireConsumptionRejected: true,
  automaticSpacerConsumptionRejected: true,
  automaticLaborProductivityRejected: true,
  automaticEquipmentProductivityRejected: true,
});
