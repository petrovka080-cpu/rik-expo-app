import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  PEDESTAL_VIBRATION_FORMULAS,
  PEDESTAL_VIBRATION_NORMATIVE_PARAMETER_IDS,
  PEDESTAL_VIBRATION_NORM_ID,
  PEDESTAL_VIBRATION_PARAMETERS,
  PEDESTAL_VIBRATION_RESOURCES,
  PEDESTAL_VIBRATION_SOURCE_ID,
  PEDESTAL_VIBRATION_SOURCE_METADATA,
  PEDESTAL_VIBRATION_TARGETS,
  pedestalVibrationAcceptanceInputR1,
  type PedestalVibrationContextKey,
} from "./pedestalVibrationR1";
import {
  CONCRETE_SLAB_VIBRATION_PARAMETERS,
  type ConcreteSlabVibrationInputValueR1,
  type ConcreteSlabVibrationParameterR1,
} from "./concreteSlabVibrationR1";

type Json = Record<string, unknown>;

const OPTIONAL_DOCUMENTARY_PARAMETER_IDS = new Set([
  "concrete_mix_reference",
  "method_statement_reference",
  "equipment_schedule_reference",
  "quality_plan_reference",
]);

const PRELIMINARY_AFTER_KNOWN_VOLUME_PARAMETER_IDS = new Set(
  CONCRETE_SLAB_VIBRATION_PARAMETERS
    .map((parameter) => parameter.parameter_id)
    .filter((parameterId) => ![
      "consolidated_concrete_volume_m3",
      "vibration_worker_h",
    ].includes(parameterId)),
);

const ORIGINAL_PARAMETER_BY_ID = new Map(
  CONCRETE_SLAB_VIBRATION_PARAMETERS.map((parameter) => [parameter.parameter_id, parameter]),
);

function pileCapText(value: string): string {
  return value
    .replaceAll("бетона бетонного пьедестала", "бетона ростверка")
    .replaceAll("бетонного пьедестала", "ростверка")
    .replaceAll("бетонным пьедесталом", "ростверком")
    .replaceAll("бетонном пьедестале", "ростверке")
    .replaceAll("бетонный пьедестал", "ростверк")
    .replaceAll("Бетонный пьедестал", "Ростверк")
    .replaceAll("pedestal-vibration", "pile-cap-vibration")
    .replaceAll("project_pedestal_vibration_schedule", "project_pile_cap_vibration_schedule")
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

function pileCapParameter(
  parameter: ConcreteSlabVibrationParameterR1,
): ConcreteSlabVibrationParameterR1 {
  const original = ORIGINAL_PARAMETER_BY_ID.get(parameter.parameter_id);
  if (!original) throw new Error(`PILE_CAP_VIBRATION_PARAMETER_SEMANTICS_MISSING:${parameter.parameter_id}`);
  const adapted = adaptJson(parameter);
  const semanticOriginal = adaptJson(original);
  if (!OPTIONAL_DOCUMENTARY_PARAMETER_IDS.has(parameter.parameter_id)) {
    return {
      ...adapted,
      required: semanticOriginal.required,
      constraints_json: semanticOriginal.constraints_json,
      truth_metadata: {
        ...semanticOriginal.truth_metadata,
        preliminary_compilation_allowed:
          PRELIMINARY_AFTER_KNOWN_VOLUME_PARAMETER_IDS.has(parameter.parameter_id),
      },
    };
  }
  return {
    ...adapted,
    required: false,
    constraints_json: semanticOriginal.constraints_json,
    truth_metadata: {
      ...semanticOriginal.truth_metadata,
      preliminary_compilation_allowed: true,
      source_confirmation_required: false,
    },
  };
}

export const PILE_CAP_VIBRATION_TARGETS = Object.freeze(
  PEDESTAL_VIBRATION_TARGETS.map((target) => Object.freeze({
    ...target,
    catalogId: target.catalogId.replace("_pedestal_vibrate_", "_pile_cap_vibrate_"),
    titleRu: pileCapText(target.titleRu),
  })),
);

export type PileCapVibrationContextKey =
  (typeof PILE_CAP_VIBRATION_TARGETS)[number]["contextKey"];

export const PILE_CAP_VIBRATION_PARAMETERS = Object.freeze(
  PEDESTAL_VIBRATION_PARAMETERS
    .filter((parameter) => parameter.parameter_id !== "vibration_worker_h")
    .map(pileCapParameter),
);

// ACI 309 defines internal vibration independently of the concrete element shape.
// It does not provide universal labour productivity. The preliminary work row
// therefore uses the confirmed concrete volume, while machine time, quality
// records and separate mobilisation remain unresolved until project data is
// supplied.
export const PILE_CAP_VIBRATION_FORMULAS = Object.freeze(
  PEDESTAL_VIBRATION_FORMULAS.filter(
    (formula) => formula.formula_id !== "slab_vibration_labor_v1",
  ),
);

export const PILE_CAP_VIBRATION_RESOURCES = Object.freeze(
  PEDESTAL_VIBRATION_RESOURCES.map((resource) => {
    const adapted = adaptJson(resource);
    const isWorkScope = resource.row_id === "work:concrete:pedestal-vibration";
    const titleSpecificationParameterIds =
      isWorkScope
        ? ["placement_location", "approved_consolidation_method"]
        : resource.row_id === "delivery:concrete:internal-vibrator-mobilization"
          ? ["mobilization_scope_reference"]
          : null;
    return {
      ...adapted,
      row_id: resource.row_id.replaceAll("pedestal-vibration", "pile-cap-vibration"),
      title_ru: pileCapText(resource.title_ru),
      unit_id: isWorkScope ? "m3" : adapted.unit_id,
      formula_id: isWorkScope ? "slab_vibration_scope_volume_v1" : adapted.formula_id,
      resource_graph: titleSpecificationParameterIds == null
        ? adapted.resource_graph
        : {
            ...adapted.resource_graph,
            ...(isWorkScope ? {
              formulaId: "slab_vibration_scope_volume_v1",
              normalizedUom: "m3",
              inputParameterIds: [
                "consolidated_concrete_volume_m3",
                "placement_location",
                "approved_consolidation_method",
              ],
            } : {}),
            titleSpecificationParameterIds,
            titleSpecificationMode: "APPEND",
          },
      source_metadata: isWorkScope
        ? {
            ...adapted.source_metadata,
            quantitySourceRole: "USER_CONFIRMED_CONCRETE_VOLUME",
            preliminaryQuantityBasis: "CONSOLIDATED_CONCRETE_VOLUME_M3",
            universalProductivityClaimed: false,
          }
        : adapted.source_metadata,
    };
  }),
);

export const PILE_CAP_VIBRATION_NORMATIVE_PARAMETER_IDS =
  PEDESTAL_VIBRATION_NORMATIVE_PARAMETER_IDS;
export const PILE_CAP_VIBRATION_SOURCE_ID = PEDESTAL_VIBRATION_SOURCE_ID;
export const PILE_CAP_VIBRATION_NORM_ID = PEDESTAL_VIBRATION_NORM_ID;
export const PILE_CAP_VIBRATION_SOURCE_METADATA = Object.freeze({
  ...PEDESTAL_VIBRATION_SOURCE_METADATA,
  operation_class: "INTERNAL_VIBRATION_OF_FRESH_PILE_CAP_CONCRETE",
  documentary_references_optional: true,
  consolidation_method_and_location_required: true,
  calculation_inputs_never_invented: true,
});

export function pileCapVibrationAcceptanceInputR1(
  contextKey: PileCapVibrationContextKey,
): Readonly<Record<string, ConcreteSlabVibrationInputValueR1>> {
  const target = PILE_CAP_VIBRATION_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PILE_CAP_VIBRATION_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const pedestalValues = pedestalVibrationAcceptanceInputR1(
    contextKey as PedestalVibrationContextKey,
  );
  return Object.freeze({
    ...Object.fromEntries(
      Object.entries(pedestalValues).filter(([parameterId]) => parameterId !== "vibration_worker_h"),
    ),
    concrete_mix_reference: `PILE-CAP-VIB-${reference}-MIX-REV-A`,
    placement_location: `Ростверк; ${target.contextRu}; захватка PILE-CAP-VIB-${reference}`,
    method_statement_reference: `MS-PILE-CAP-VIB-${reference}-REV-A`,
    equipment_schedule_reference: `EQ-PILE-CAP-VIB-${reference}-REV-A`,
    quality_plan_reference: `QP-PILE-CAP-VIB-${reference}-REV-A`,
    mobilization_scope_reference: `LOG-PILE-CAP-VIB-${reference}-RETURN-INCLUDED`,
  });
}

export async function compilePileCapVibrationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PILE_CAP_VIBRATION_TARGETS[0].catalogId;
  if (!PILE_CAP_VIBRATION_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`PILE_CAP_VIBRATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pile-cap-vibration-r1",
    catalogId,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    parameterDefinitions: [...PILE_CAP_VIBRATION_PARAMETERS],
    formulaDefinitions: [...PILE_CAP_VIBRATION_FORMULAS],
    resourceDefinitions: [...PILE_CAP_VIBRATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value),
  });
}
