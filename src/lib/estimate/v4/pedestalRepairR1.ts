import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  COLUMN_BASE_REPAIR_FORMULAS,
  COLUMN_BASE_REPAIR_GUIDE_SOURCE_ID,
  COLUMN_BASE_REPAIR_NORMATIVE_PARAMETER_IDS,
  COLUMN_BASE_REPAIR_NORM_ID,
  COLUMN_BASE_REPAIR_PARAMETERS,
  COLUMN_BASE_REPAIR_RESOURCES,
  COLUMN_BASE_REPAIR_SOURCE_ID,
  COLUMN_BASE_REPAIR_SOURCE_METADATA,
  COLUMN_BASE_REPAIR_TARGETS,
  columnBaseRepairAcceptanceInputR1,
  type ColumnBaseRepairContextKey,
} from "./columnBaseRepairR1";
import {
  CONCRETE_SLAB_REPAIR_PARAMETERS,
  type ConcreteSlabRepairInputValueR1,
  type ConcreteSlabRepairParameterR1,
} from "./concreteSlabRepairR1";

type Json = Record<string, unknown>;

const OPTIONAL_DOCUMENTARY_PARAMETER_IDS = new Set([
  "condition_assessment_reference",
  "approved_repair_design_reference",
  "repair_method_statement_reference",
  "quality_plan_reference",
]);

const ORIGINAL_PARAMETER_BY_ID = new Map(
  CONCRETE_SLAB_REPAIR_PARAMETERS.map((parameter) => [parameter.parameter_id, parameter]),
);

function pedestalText(value: string): string {
  return value
    .replaceAll("столбчатого основания", "бетонного пьедестала")
    .replaceAll("столбчатым основанием", "бетонным пьедесталом")
    .replaceAll("столбчатом основании", "бетонном пьедестале")
    .replaceAll("столбчатое основание", "бетонный пьедестал")
    .replaceAll("Столбчатое основание", "Бетонный пьедестал")
    .replaceAll("column-base-repair", "pedestal-repair")
    .replaceAll("project_column_base_repair_schedule", "project_pedestal_repair_schedule")
    .replaceAll("REPAIR_EXISTING_CONCRETE_COLUMN_BASE", "REPAIR_EXISTING_CONCRETE_PEDESTAL");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return pedestalText(value) as T;
  if (Array.isArray(value)) return value.map(adaptJson) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Json).map(([key, item]) => [key, adaptJson(item)]),
    ) as T;
  }
  return value;
}

function withoutRequiredWhen(value: Json): Json {
  const { requiredWhen: _requiredWhen, ...rest } = value;
  return rest;
}

function pedestalParameter(
  parameter: ConcreteSlabRepairParameterR1,
): ConcreteSlabRepairParameterR1 {
  const original = ORIGINAL_PARAMETER_BY_ID.get(parameter.parameter_id);
  if (!original) throw new Error(`PEDESTAL_REPAIR_PARAMETER_SEMANTICS_MISSING:${parameter.parameter_id}`);
  const adapted = adaptJson(parameter);
  const semanticOriginal = adaptJson(original);
  if (!OPTIONAL_DOCUMENTARY_PARAMETER_IDS.has(parameter.parameter_id)) {
    return {
      ...adapted,
      required: semanticOriginal.required,
      constraints_json: semanticOriginal.constraints_json,
      truth_metadata: semanticOriginal.truth_metadata,
    };
  }
  const { required_when: _requiredWhen, ...truthWithoutRequiredWhen } =
    semanticOriginal.truth_metadata;
  return {
    ...adapted,
    required: false,
    constraints_json: withoutRequiredWhen(semanticOriginal.constraints_json ?? {}),
    truth_metadata: {
      ...truthWithoutRequiredWhen,
      preliminary_compilation_allowed: true,
      source_confirmation_required: false,
    },
  };
}

export const PEDESTAL_REPAIR_TARGETS = Object.freeze(
  COLUMN_BASE_REPAIR_TARGETS.map((target) => Object.freeze({
    ...target,
    catalogId: target.catalogId.replace("_column_base_repair_", "_pedestal_repair_"),
    titleRu: pedestalText(target.titleRu),
  })),
);

export type PedestalRepairContextKey =
  (typeof PEDESTAL_REPAIR_TARGETS)[number]["contextKey"];

export const PEDESTAL_REPAIR_PARAMETERS = Object.freeze(
  COLUMN_BASE_REPAIR_PARAMETERS.map(pedestalParameter),
);

// ACI 562/546 method selection and the direct-quantity graph remain shared.
export const PEDESTAL_REPAIR_FORMULAS = COLUMN_BASE_REPAIR_FORMULAS;

export const PEDESTAL_REPAIR_RESOURCES = Object.freeze(
  COLUMN_BASE_REPAIR_RESOURCES.map((resource) => {
    const adapted = adaptJson(resource);
    const titleSpecificationParameterIds =
      resource.row_id === "work:concrete:column-base-repair-substrate"
        ? ["approved_repair_method_designation"]
        : resource.row_id === "material:concrete:column-base-repair-material"
          ? ["repair_material_designation"]
          : resource.row_id === "material:concrete:column-base-repair-bonding-agent"
            ? ["bonding_agent_designation"]
            : resource.row_id === "material:concrete:column-base-repair-rebar-treatment"
              ? ["reinforcement_treatment_designation"]
              : resource.row_id === "material:concrete:column-base-repair-curing"
                ? ["curing_material_designation"]
                : resource.row_id === "equipment:concrete:column-base-repair-removal"
                  ? ["removal_equipment_designation"]
                  : resource.row_id === "equipment:concrete:column-base-repair-mixing"
                    ? ["mixing_equipment_designation"]
                    : resource.row_id === "equipment:concrete:column-base-repair-dust-control"
                      ? ["dust_control_equipment_designation"]
                      : resource.row_id === "service:concrete:column-base-repair-waste-disposal"
                        ? ["waste_route_reference"]
                        : null;
    return {
      ...adapted,
      row_id: resource.row_id.replaceAll("column-base-repair", "pedestal-repair"),
      title_ru: pedestalText(resource.title_ru),
      resource_graph: titleSpecificationParameterIds == null
        ? adapted.resource_graph
        : {
            ...adapted.resource_graph,
            titleSpecificationParameterIds,
            titleSpecificationMode: "APPEND",
          },
    };
  }),
);

export const PEDESTAL_REPAIR_NORMATIVE_PARAMETER_IDS =
  COLUMN_BASE_REPAIR_NORMATIVE_PARAMETER_IDS;
export const PEDESTAL_REPAIR_SOURCE_ID = COLUMN_BASE_REPAIR_SOURCE_ID;
export const PEDESTAL_REPAIR_GUIDE_SOURCE_ID = COLUMN_BASE_REPAIR_GUIDE_SOURCE_ID;
export const PEDESTAL_REPAIR_NORM_ID = COLUMN_BASE_REPAIR_NORM_ID;
export const PEDESTAL_REPAIR_SOURCE_METADATA = Object.freeze({
  ...COLUMN_BASE_REPAIR_SOURCE_METADATA,
  operation_class: "REPAIR_EXISTING_CONCRETE_PEDESTAL",
  quantity_basis: "APPROVED_REPAIR_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
  documentary_references_optional: true,
  repair_technology_and_material_designation_required: true,
  conditional_branch_quantities_never_invented: true,
  calculation_inputs_never_invented: true,
});

export function pedestalRepairAcceptanceInputR1(
  contextKey: PedestalRepairContextKey,
): Readonly<Record<string, ConcreteSlabRepairInputValueR1>> {
  const target = PEDESTAL_REPAIR_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PEDESTAL_REPAIR_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...columnBaseRepairAcceptanceInputR1(contextKey as ColumnBaseRepairContextKey),
    condition_assessment_reference: `ASSESS-PEDESTAL-REPAIR-${reference}-REV-A`,
    approved_repair_design_reference: `DESIGN-PEDESTAL-REPAIR-${reference}-REV-A`,
    approved_repair_method_designation: `METHOD-PEDESTAL-REPAIR-${reference}`,
    repair_method_statement_reference: `MS-PEDESTAL-REPAIR-${reference}-REV-A`,
    repair_material_designation: `MATERIAL-PEDESTAL-REPAIR-${reference}-REV-A`,
    quality_plan_reference: `QP-PEDESTAL-REPAIR-${reference}-REV-A`,
  });
}

export async function compilePedestalRepairR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PEDESTAL_REPAIR_TARGETS[0].catalogId;
  if (!PEDESTAL_REPAIR_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`PEDESTAL_REPAIR_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pedestal-repair-r1",
    catalogId,
    primaryMeasureParameterId: "repair_scope_volume_m3",
    parameterDefinitions: [...PEDESTAL_REPAIR_PARAMETERS],
    formulaDefinitions: [...PEDESTAL_REPAIR_FORMULAS],
    resourceDefinitions: [...PEDESTAL_REPAIR_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}
