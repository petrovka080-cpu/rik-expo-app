import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  PEDESTAL_LEVELING_FORMULAS,
  PEDESTAL_LEVELING_NORMATIVE_PARAMETER_IDS,
  PEDESTAL_LEVELING_NORM_ID,
  PEDESTAL_LEVELING_PARAMETERS,
  PEDESTAL_LEVELING_RESOURCES,
  PEDESTAL_LEVELING_SOURCE_ID,
  PEDESTAL_LEVELING_SOURCE_METADATA,
  PEDESTAL_LEVELING_TARGETS,
  pedestalLevelingAcceptanceInputR1,
  type PedestalLevelingContextKey,
} from "./pedestalLevelingR1";
import {
  CONCRETE_SLAB_LEVELING_PARAMETERS,
  type ConcreteSlabLevelingInputValueR1,
  type ConcreteSlabLevelingParameterR1,
} from "./concreteSlabLevelingR1";

type Json = Record<string, unknown>;

const OPTIONAL_DOCUMENTARY_PARAMETER_IDS = new Set([
  "concrete_mix_reference",
  "target_elevation_and_slope_reference",
  "flatness_levelness_requirement_reference",
  "leveling_method_statement_reference",
  "quality_plan_reference",
]);

const ORIGINAL_PARAMETER_BY_ID = new Map(
  CONCRETE_SLAB_LEVELING_PARAMETERS.map((parameter) => [parameter.parameter_id, parameter]),
);

function pileCapText(value: string): string {
  return value
    .replaceAll("бетонного пьедестала", "ростверка")
    .replaceAll("бетонным пьедесталом", "ростверком")
    .replaceAll("бетонном пьедестале", "ростверке")
    .replaceAll("бетонный пьедестал", "ростверк")
    .replaceAll("Бетонный пьедестал", "Ростверк")
    .replaceAll("pedestal-leveling", "pile-cap-leveling")
    .replaceAll("project_pedestal_leveling_schedule", "project_pile_cap_leveling_schedule")
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
  parameter: ConcreteSlabLevelingParameterR1,
): ConcreteSlabLevelingParameterR1 {
  const original = ORIGINAL_PARAMETER_BY_ID.get(parameter.parameter_id);
  if (!original) throw new Error(`PILE_CAP_LEVELING_PARAMETER_SEMANTICS_MISSING:${parameter.parameter_id}`);
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

export const PILE_CAP_LEVELING_TARGETS = Object.freeze(
  PEDESTAL_LEVELING_TARGETS.map((target) => Object.freeze({
    ...target,
    catalogId: target.catalogId.replace("_pedestal_level_", "_pile_cap_level_"),
    titleRu: pileCapText(target.titleRu),
  })),
);

export type PileCapLevelingContextKey =
  (typeof PILE_CAP_LEVELING_TARGETS)[number]["contextKey"];

export const PILE_CAP_LEVELING_PARAMETERS = Object.freeze(
  PEDESTAL_LEVELING_PARAMETERS.map(pileCapParameter),
);

// ACI 302 defines leveling independently of the concrete element shape.
export const PILE_CAP_LEVELING_FORMULAS = PEDESTAL_LEVELING_FORMULAS;

export const PILE_CAP_LEVELING_RESOURCES = Object.freeze(
  PEDESTAL_LEVELING_RESOURCES.map((resource) => {
    const adapted = adaptJson(resource);
    const titleSpecificationParameterIds =
      resource.row_id === "work:concrete:pedestal-leveling"
        ? ["leveling_location", "approved_leveling_method_designation"]
        : resource.row_id === "material:concrete:screed-guides"
          ? ["screed_guide_designation"]
          : resource.row_id === "equipment:concrete:pedestal-leveling"
            ? ["leveling_equipment_designation"]
            : resource.row_id === "delivery:concrete:pedestal-leveling-equipment-mobilization"
              ? ["mobilization_scope_reference"]
              : null;
    return {
      ...adapted,
      row_id: resource.row_id.replaceAll("pedestal-leveling", "pile-cap-leveling"),
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

export const PILE_CAP_LEVELING_NORMATIVE_PARAMETER_IDS =
  PEDESTAL_LEVELING_NORMATIVE_PARAMETER_IDS;
export const PILE_CAP_LEVELING_SOURCE_ID = PEDESTAL_LEVELING_SOURCE_ID;
export const PILE_CAP_LEVELING_NORM_ID = PEDESTAL_LEVELING_NORM_ID;
export const PILE_CAP_LEVELING_SOURCE_METADATA = Object.freeze({
  ...PEDESTAL_LEVELING_SOURCE_METADATA,
  operation_class: "LEVEL_AND_STRIKE_OFF_FRESH_PILE_CAP_CONCRETE",
  documentary_references_optional: true,
  leveling_method_and_selected_resource_designations_required: true,
  conditional_branch_quantities_never_invented: true,
  calculation_inputs_never_invented: true,
});

export function pileCapLevelingAcceptanceInputR1(
  contextKey: PileCapLevelingContextKey,
): Readonly<Record<string, ConcreteSlabLevelingInputValueR1>> {
  const target = PILE_CAP_LEVELING_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PILE_CAP_LEVELING_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...pedestalLevelingAcceptanceInputR1(contextKey as PedestalLevelingContextKey),
    concrete_mix_reference: `PILE-CAP-LEVEL-${reference}-MIX-REV-A`,
    leveling_location: `Ростверк; ${target.contextRu}; захватка PILE-CAP-LEVEL-${reference}`,
    target_elevation_and_slope_reference: `ELEV-SLOPE-PILE-CAP-LEVEL-${reference}-REV-A`,
    flatness_levelness_requirement_reference: `FL-PILE-CAP-LEVEL-${reference}-REV-A`,
    leveling_method_statement_reference: `MS-PILE-CAP-LEVEL-${reference}-REV-A`,
    quality_plan_reference: `QP-PILE-CAP-LEVEL-${reference}-REV-A`,
  });
}

export async function compilePileCapLevelingR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PILE_CAP_LEVELING_TARGETS[0].catalogId;
  if (!PILE_CAP_LEVELING_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`PILE_CAP_LEVELING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pile-cap-leveling-r1",
    catalogId,
    primaryMeasureParameterId: "leveled_concrete_volume_m3",
    parameterDefinitions: [...PILE_CAP_LEVELING_PARAMETERS],
    formulaDefinitions: [...PILE_CAP_LEVELING_FORMULAS],
    resourceDefinitions: [...PILE_CAP_LEVELING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value),
  });
}
