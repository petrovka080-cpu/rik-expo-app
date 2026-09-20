import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  PEDESTAL_EMBEDDED_ITEMS_FORMULAS,
  PEDESTAL_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
  PEDESTAL_EMBEDDED_ITEMS_NORM_ID,
  PEDESTAL_EMBEDDED_ITEMS_PARAMETERS,
  PEDESTAL_EMBEDDED_ITEMS_RESOURCES,
  PEDESTAL_EMBEDDED_ITEMS_SOURCE_ID,
  PEDESTAL_EMBEDDED_ITEMS_SOURCE_METADATA,
  PEDESTAL_EMBEDDED_ITEMS_TARGETS,
  pedestalEmbeddedItemsAcceptanceInputR1,
  type PedestalEmbeddedItemsContextKey,
} from "./pedestalEmbeddedItemsR1";
import {
  CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS,
  type ConcreteSlabEmbeddedItemsInputValueR1,
  type ConcreteSlabEmbeddedItemsParameterR1,
} from "./concreteSlabEmbeddedItemsR1";

type Json = Record<string, unknown>;

const OPTIONAL_DOCUMENTARY_PARAMETER_IDS = new Set([
  "approved_embedment_design_reference",
  "embedded_item_schedule_reference",
  "approved_placement_drawing_reference",
  "tolerance_specification_reference",
  "installation_method_statement_reference",
]);

const ORIGINAL_PARAMETER_BY_ID = new Map(
  CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS.map((parameter) => [parameter.parameter_id, parameter]),
);

function pileCapText(value: string): string {
  return value
    .replaceAll("бетонного пьедестала", "ростверка")
    .replaceAll("бетонным пьедесталом", "ростверком")
    .replaceAll("бетонном пьедестале", "ростверке")
    .replaceAll("Бетонный пьедестал", "Ростверк")
    .replaceAll("pedestal-embedded-items", "pile-cap-embedded-items")
    .replaceAll("project_pedestal_embedded_items_schedule", "project_pile_cap_embedded_items_schedule")
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
  parameter: ConcreteSlabEmbeddedItemsParameterR1,
): ConcreteSlabEmbeddedItemsParameterR1 {
  const original = ORIGINAL_PARAMETER_BY_ID.get(parameter.parameter_id);
  if (!original) {
    throw new Error(`PILE_CAP_EMBEDDED_ITEMS_PARAMETER_SEMANTICS_MISSING:${parameter.parameter_id}`);
  }
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

export const PILE_CAP_EMBEDDED_ITEMS_TARGETS = Object.freeze(
  PEDESTAL_EMBEDDED_ITEMS_TARGETS.map((target) => Object.freeze({
    ...target,
    catalogId: target.catalogId.replace("_pedestal_anchor_", "_pile_cap_anchor_"),
    titleRu: pileCapText(target.titleRu),
  })),
);

export type PileCapEmbeddedItemsContextKey =
  (typeof PILE_CAP_EMBEDDED_ITEMS_TARGETS)[number]["contextKey"];

export const PILE_CAP_EMBEDDED_ITEMS_PARAMETERS = Object.freeze(
  PEDESTAL_EMBEDDED_ITEMS_PARAMETERS.map(pileCapParameter),
);

export const PILE_CAP_EMBEDDED_ITEMS_FORMULAS = PEDESTAL_EMBEDDED_ITEMS_FORMULAS;

export const PILE_CAP_EMBEDDED_ITEMS_RESOURCES = Object.freeze(
  PEDESTAL_EMBEDDED_ITEMS_RESOURCES.map((resource) => {
    const adapted = adaptJson(resource);
    const titleSpecificationParameterIds =
      resource.row_id === "material:concrete:pedestal-embedded-items"
        ? ["embedded_item_designation"]
        : resource.row_id === "work:concrete:pedestal-embedded-items-layout"
          ? ["slab_location"]
          : resource.row_id === "work:concrete:pedestal-embedded-items-welding"
            ? ["approved_welding_procedure_reference"]
            : resource.row_id === "material:concrete:pedestal-embedded-items-welding-consumables"
              ? ["welding_consumable_designation"]
              : resource.row_id === "material:concrete:pedestal-embedded-items-temporary-support"
                ? ["temporary_support_designation"]
                : resource.row_id === "equipment:concrete:pedestal-embedded-items-lifting"
                  ? ["lifting_equipment_designation"]
                  : resource.row_id === "material:concrete:pedestal-embedded-items-coating"
                    ? ["coating_touchup_designation"]
                    : resource.row_id === "delivery:concrete:pedestal-embedded-items-equipment-mobilization"
                      ? ["mobilization_scope_reference"]
                      : null;
    return {
      ...adapted,
      row_id: resource.row_id.replaceAll("pedestal-embedded-items", "pile-cap-embedded-items"),
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

export const PILE_CAP_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS =
  PEDESTAL_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS;
export const PILE_CAP_EMBEDDED_ITEMS_SOURCE_ID = PEDESTAL_EMBEDDED_ITEMS_SOURCE_ID;
export const PILE_CAP_EMBEDDED_ITEMS_NORM_ID = PEDESTAL_EMBEDDED_ITEMS_NORM_ID;
export const PILE_CAP_EMBEDDED_ITEMS_SOURCE_METADATA = Object.freeze({
  ...PEDESTAL_EMBEDDED_ITEMS_SOURCE_METADATA,
  operation_class: "PLACE_AND_FIX_PROJECT_SPECIFIED_PILE_CAP_EMBEDDED_ITEMS_BEFORE_CONCRETING",
  documentary_references_optional: true,
  embedded_item_and_selected_method_designations_required: true,
  conditional_branch_quantities_never_invented: true,
  calculation_inputs_never_invented: true,
});

export function pileCapEmbeddedItemsAcceptanceInputR1(
  contextKey: PileCapEmbeddedItemsContextKey,
): Readonly<Record<string, ConcreteSlabEmbeddedItemsInputValueR1>> {
  const target = PILE_CAP_EMBEDDED_ITEMS_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PILE_CAP_EMBEDDED_ITEMS_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...pedestalEmbeddedItemsAcceptanceInputR1(contextKey as PedestalEmbeddedItemsContextKey),
    approved_embedment_design_reference: `DESIGN-PILE-CAP-EMBED-${reference}-REV-A`,
    embedded_item_schedule_reference: `SCHEDULE-PILE-CAP-EMBED-${reference}-REV-A`,
    approved_placement_drawing_reference: `DRAWING-PILE-CAP-EMBED-${reference}-REV-A`,
    slab_location: `Ростверк; ${target.contextRu}; захватка PILE-CAP-EMBED-${reference}`,
    tolerance_specification_reference: `TOL-PILE-CAP-EMBED-${reference}-REV-A`,
    installation_method_statement_reference: `MS-PILE-CAP-EMBED-${reference}-REV-A`,
    embedded_item_designation: `EMBEDDED-ITEM-PILE-CAP-${reference}-REV-A`,
  });
}

export async function compilePileCapEmbeddedItemsR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PILE_CAP_EMBEDDED_ITEMS_TARGETS[0].catalogId;
  if (!PILE_CAP_EMBEDDED_ITEMS_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`PILE_CAP_EMBEDDED_ITEMS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pile-cap-embedded-items-r1",
    catalogId,
    primaryMeasureParameterId: "embedded_item_count_piece",
    parameterDefinitions: [...PILE_CAP_EMBEDDED_ITEMS_PARAMETERS],
    formulaDefinitions: [...PILE_CAP_EMBEDDED_ITEMS_FORMULAS],
    resourceDefinitions: [...PILE_CAP_EMBEDDED_ITEMS_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 18,
    hashJson: async (value) => JSON.stringify(value),
  });
}
