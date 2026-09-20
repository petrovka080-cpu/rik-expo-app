import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  PEDESTAL_CURING_FORMULAS,
  PEDESTAL_CURING_NORMATIVE_PARAMETER_IDS,
  PEDESTAL_CURING_NORM_ID,
  PEDESTAL_CURING_PARAMETERS,
  PEDESTAL_CURING_RESOURCES,
  PEDESTAL_CURING_SOURCE_ID,
  PEDESTAL_CURING_SOURCE_METADATA,
  PEDESTAL_CURING_TARGETS,
  pedestalCuringAcceptanceInputR1,
  type PedestalCuringContextKey,
} from "./pedestalCuringR1";
import {
  CONCRETE_SLAB_CURING_PARAMETERS,
  type ConcreteSlabCuringInputValueR1,
  type ConcreteSlabCuringParameterR1,
} from "./concreteSlabCuringR1";

type Json = Record<string, unknown>;

const OPTIONAL_DOCUMENTARY_PARAMETER_IDS = new Set([
  "concrete_mix_reference",
  "curing_method_statement_reference",
  "quality_plan_reference",
]);

const ORIGINAL_PARAMETER_BY_ID = new Map(
  CONCRETE_SLAB_CURING_PARAMETERS.map((parameter) => [parameter.parameter_id, parameter]),
);

function pileCapText(value: string): string {
  return value
    .replaceAll("бетонного пьедестала", "ростверка")
    .replaceAll("бетонным пьедесталом", "ростверком")
    .replaceAll("бетонном пьедестале", "ростверке")
    .replaceAll("Бетонный пьедестал", "Ростверк")
    .replaceAll("pedestal-curing", "pile-cap-curing")
    .replaceAll("project_pedestal_curing_schedule", "project_pile_cap_curing_schedule")
    .replaceAll("PEDESTAL", "PILE-CAP");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return pileCapText(value) as T;
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

function pileCapParameter(
  parameter: ConcreteSlabCuringParameterR1,
): ConcreteSlabCuringParameterR1 {
  const original = ORIGINAL_PARAMETER_BY_ID.get(parameter.parameter_id);
  if (!original) throw new Error(`PILE_CAP_CURING_PARAMETER_SEMANTICS_MISSING:${parameter.parameter_id}`);
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

export const PILE_CAP_CURING_TARGETS = Object.freeze(
  PEDESTAL_CURING_TARGETS.map((target) => Object.freeze({
    ...target,
    catalogId: target.catalogId.replace("_pedestal_cure_", "_pile_cap_cure_"),
    titleRu: pileCapText(target.titleRu),
  })),
);

export type PileCapCuringContextKey =
  (typeof PILE_CAP_CURING_TARGETS)[number]["contextKey"];

export const PILE_CAP_CURING_PARAMETERS = Object.freeze(
  PEDESTAL_CURING_PARAMETERS.map(pileCapParameter),
);

// ACI 308 defines curing independently of the concrete element shape.
export const PILE_CAP_CURING_FORMULAS = PEDESTAL_CURING_FORMULAS;

export const PILE_CAP_CURING_RESOURCES = Object.freeze(
  PEDESTAL_CURING_RESOURCES.map((resource) => {
    const adapted = adaptJson(resource);
    const titleSpecificationParameterIds =
      resource.row_id === "work:concrete:pedestal-curing"
        ? ["curing_location"]
        : resource.row_id === "material:concrete:curing-water"
          ? ["curing_water_source_reference"]
          : resource.row_id === "material:concrete:wet-curing-covering"
            ? ["wet_covering_material_designation"]
            : resource.row_id === "material:concrete:impervious-curing-sheet"
              ? ["impervious_sheet_designation"]
              : resource.row_id === "material:concrete:membrane-curing-compound"
                ? ["curing_compound_product_designation"]
                : resource.row_id === "equipment:concrete:curing-application"
                  ? ["application_equipment_designation"]
                  : resource.row_id === "delivery:concrete:curing-equipment-mobilization"
                    ? ["mobilization_scope_reference"]
                    : null;
    return {
      ...adapted,
      row_id: resource.row_id.replaceAll("pedestal-curing", "pile-cap-curing"),
      title_ru: pileCapText(resource.title_ru),
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

export const PILE_CAP_CURING_NORMATIVE_PARAMETER_IDS =
  PEDESTAL_CURING_NORMATIVE_PARAMETER_IDS;
export const PILE_CAP_CURING_SOURCE_ID = PEDESTAL_CURING_SOURCE_ID;
export const PILE_CAP_CURING_NORM_ID = PEDESTAL_CURING_NORM_ID;
export const PILE_CAP_CURING_SOURCE_METADATA = Object.freeze({
  ...PEDESTAL_CURING_SOURCE_METADATA,
  operation_class: "EXTERNAL_CURING_OF_PILE_CAP_CONCRETE",
  documentary_references_optional: true,
  curing_method_and_selected_resource_designations_required: true,
  conditional_branch_quantities_never_invented: true,
  calculation_inputs_never_invented: true,
});

export function pileCapCuringAcceptanceInputR1(
  contextKey: PileCapCuringContextKey,
): Readonly<Record<string, ConcreteSlabCuringInputValueR1>> {
  const target = PILE_CAP_CURING_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PILE_CAP_CURING_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...pedestalCuringAcceptanceInputR1(contextKey as PedestalCuringContextKey),
    concrete_mix_reference: `PILE-CAP-CURE-${reference}-MIX-REV-A`,
    curing_location: `Ростверк; ${target.contextRu}; захватка PILE-CAP-CURE-${reference}`,
    curing_method_statement_reference: `MS-PILE-CAP-CURE-${reference}-REV-A`,
    quality_plan_reference: `QP-PILE-CAP-CURE-${reference}-REV-A`,
  });
}

export async function compilePileCapCuringR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PILE_CAP_CURING_TARGETS[0].catalogId;
  if (!PILE_CAP_CURING_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`PILE_CAP_CURING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pile-cap-curing-r1",
    catalogId,
    primaryMeasureParameterId: "cured_concrete_volume_m3",
    parameterDefinitions: [...PILE_CAP_CURING_PARAMETERS],
    formulaDefinitions: [...PILE_CAP_CURING_FORMULAS],
    resourceDefinitions: [...PILE_CAP_CURING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}
