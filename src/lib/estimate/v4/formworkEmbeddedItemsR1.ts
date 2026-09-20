import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  PILE_CAP_EMBEDDED_ITEMS_FORMULAS,
  PILE_CAP_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
  PILE_CAP_EMBEDDED_ITEMS_NORM_ID,
  PILE_CAP_EMBEDDED_ITEMS_PARAMETERS,
  PILE_CAP_EMBEDDED_ITEMS_RESOURCES,
  PILE_CAP_EMBEDDED_ITEMS_SOURCE_ID,
  PILE_CAP_EMBEDDED_ITEMS_SOURCE_METADATA,
  PILE_CAP_EMBEDDED_ITEMS_TARGETS,
  pileCapEmbeddedItemsAcceptanceInputR1,
  type PileCapEmbeddedItemsContextKey,
} from "./pileCapEmbeddedItemsR1";
import type { ConcreteSlabEmbeddedItemsInputValueR1 } from "./concreteSlabEmbeddedItemsR1";

type Json = Record<string, unknown>;

function formworkText(value: string): string {
  return value
    .replaceAll("ростверка", "опалубки")
    .replaceAll("ростверком", "опалубкой")
    .replaceAll("ростверке", "опалубке")
    .replaceAll("Ростверк", "Опалубка")
    .replaceAll("pile-cap-embedded-items", "formwork-embedded-items")
    .replaceAll("project_pile_cap_embedded_items_schedule", "project_formwork_embedded_items_schedule")
    .replaceAll("PILE_CAP", "FORMWORK")
    .replaceAll("pile_cap", "formwork")
    .replaceAll("PILE-CAP", "FORMWORK")
    .replaceAll("pile-cap", "formwork")
    .replaceAll("pile cap", "formwork");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return formworkText(value) as T;
  if (Array.isArray(value)) return value.map(adaptJson) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Json).map(([key, item]) => [key, adaptJson(item)]),
    ) as T;
  }
  return value;
}

export const FORMWORK_EMBEDDED_ITEMS_TARGETS = Object.freeze(
  PILE_CAP_EMBEDDED_ITEMS_TARGETS.map((target) => Object.freeze({
    ...target,
    catalogId: target.catalogId.replace("_pile_cap_anchor_", "_formwork_anchor_"),
    titleRu: formworkText(target.titleRu),
  })),
);

export type FormworkEmbeddedItemsContextKey =
  (typeof FORMWORK_EMBEDDED_ITEMS_TARGETS)[number]["contextKey"];

export const FORMWORK_EMBEDDED_ITEMS_PARAMETERS = Object.freeze(
  PILE_CAP_EMBEDDED_ITEMS_PARAMETERS.map(adaptJson),
);

export const FORMWORK_EMBEDDED_ITEMS_FORMULAS = PILE_CAP_EMBEDDED_ITEMS_FORMULAS;

export const FORMWORK_EMBEDDED_ITEMS_RESOURCES = Object.freeze(
  PILE_CAP_EMBEDDED_ITEMS_RESOURCES.map((resource) => adaptJson({
    ...resource,
    row_id: resource.row_id.replaceAll("pile-cap-embedded-items", "formwork-embedded-items"),
  })),
);

export const FORMWORK_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS =
  PILE_CAP_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS;
export const FORMWORK_EMBEDDED_ITEMS_SOURCE_ID = PILE_CAP_EMBEDDED_ITEMS_SOURCE_ID;
export const FORMWORK_EMBEDDED_ITEMS_NORM_ID = PILE_CAP_EMBEDDED_ITEMS_NORM_ID;
export const FORMWORK_EMBEDDED_ITEMS_SOURCE_METADATA = Object.freeze({
  ...adaptJson(PILE_CAP_EMBEDDED_ITEMS_SOURCE_METADATA),
  operation_class: "PLACE_AND_FIX_PROJECT_SPECIFIED_FORMWORK_EMBEDDED_ITEMS_BEFORE_CONCRETING",
  catalog_identity_scope: "FORMWORK_EMBEDDED_ITEMS_ONLY",
  documentary_references_optional: true,
  embedded_item_and_selected_method_designations_required: true,
  conditional_branch_quantities_never_invented: true,
  calculation_inputs_never_invented: true,
});

export function formworkEmbeddedItemsAcceptanceInputR1(
  contextKey: FormworkEmbeddedItemsContextKey,
): Readonly<Record<string, ConcreteSlabEmbeddedItemsInputValueR1>> {
  const target = FORMWORK_EMBEDDED_ITEMS_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`FORMWORK_EMBEDDED_ITEMS_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...pileCapEmbeddedItemsAcceptanceInputR1(contextKey as PileCapEmbeddedItemsContextKey),
    approved_embedment_design_reference: `DESIGN-FORMWORK-EMBED-${reference}-REV-A`,
    embedded_item_schedule_reference: `SCHEDULE-FORMWORK-EMBED-${reference}-REV-A`,
    approved_placement_drawing_reference: `DRAWING-FORMWORK-EMBED-${reference}-REV-A`,
    slab_location: `Опалубка; ${target.contextRu}; захватка FORMWORK-EMBED-${reference}`,
    tolerance_specification_reference: `TOL-FORMWORK-EMBED-${reference}-REV-A`,
    installation_method_statement_reference: `MS-FORMWORK-EMBED-${reference}-REV-A`,
    embedded_item_designation: `EMBEDDED-ITEM-FORMWORK-${reference}-REV-A`,
  });
}

export async function compileFormworkEmbeddedItemsR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? FORMWORK_EMBEDDED_ITEMS_TARGETS[0].catalogId;
  if (!FORMWORK_EMBEDDED_ITEMS_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`FORMWORK_EMBEDDED_ITEMS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.formwork-embedded-items-r1",
    catalogId,
    primaryMeasureParameterId: "embedded_item_count_piece",
    parameterDefinitions: [...FORMWORK_EMBEDDED_ITEMS_PARAMETERS],
    formulaDefinitions: [...FORMWORK_EMBEDDED_ITEMS_FORMULAS],
    resourceDefinitions: [...FORMWORK_EMBEDDED_ITEMS_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 18,
    hashJson: async (value) => JSON.stringify(value),
  });
}
