import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID,
  CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES,
  CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID,
  CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA,
  concreteSlabEmbeddedItemsAcceptanceInputR1,
  type ConcreteSlabEmbeddedItemsContextKey,
  type ConcreteSlabEmbeddedItemsInputValueR1,
} from "./concreteSlabEmbeddedItemsR1";

type Json = Record<string, unknown>;

export const BELT_EMBEDDED_ITEMS_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_belt_anchor_standard", titleRu: "Монтаж закладных для монолитного пояса в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_belt_anchor_high_load", titleRu: "Монтаж закладных для монолитного пояса в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_anchor_large_area", titleRu: "Монтаж закладных для монолитного пояса на большом участке", contextRu: "большой участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_anchor_small_area", titleRu: "Монтаж закладных для монолитного пояса на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_belt_anchor_technical_room", titleRu: "Монтаж закладных для монолитного пояса в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_belt_anchor_wet_zone", titleRu: "Монтаж закладных для монолитного пояса во влажной зоне", contextRu: "влажная зона" },
] as const);

export type BeltEmbeddedItemsContextKey =
  (typeof BELT_EMBEDDED_ITEMS_TARGETS)[number]["contextKey"];

function beltText(value: string): string {
  return value
    .replaceAll("бетонной плиты", "монолитного пояса")
    .replaceAll("Бетонная плита", "Монолитный пояс")
    .replaceAll("плиты", "монолитного пояса")
    .replaceAll("concrete-slab-embedded-items", "belt-embedded-items")
    .replaceAll("project_concrete_slab_embedded_items_schedule", "project_belt_embedded_items_schedule")
    .replaceAll("slab-embedded-items", "belt-embedded-items");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return beltText(value) as T;
  if (Array.isArray(value)) return value.map((item) => adaptJson(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json).map(
      ([key, item]) => [key, adaptJson(item)],
    )) as T;
  }
  return value;
}

export const BELT_EMBEDDED_ITEMS_PARAMETERS = Object.freeze(
  CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS.map((parameter) => {
    const documentary = parameter.value_type === "text";
    const constraints = adaptJson(parameter.constraints_json ?? {});
    const {
      requiredWhen: _requiredWhen,
      ...constraintsWithoutRequiredWhen
    } = constraints;
    const truth = adaptJson(parameter.truth_metadata);
    const {
      required_when: _truthRequiredWhen,
      ...truthWithoutRequiredWhen
    } = truth;
    return {
      ...parameter,
      title_ru: beltText(parameter.title_ru),
      required: documentary ? false : parameter.required,
      constraints_json: documentary ? constraintsWithoutRequiredWhen : constraints,
      truth_metadata: documentary ? {
        ...truthWithoutRequiredWhen,
        preliminary_compilation_allowed: true,
        source_confirmation_required: false,
      } : truth,
    };
  }),
);

export const BELT_EMBEDDED_ITEMS_FORMULAS = CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS;

export const BELT_EMBEDDED_ITEMS_RESOURCES = Object.freeze(
  CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES.map((resource) => {
    const adapted = adaptJson(resource);
    return {
      ...adapted,
      row_id: resource.row_id.replaceAll("slab-embedded-items", "belt-embedded-items"),
      title_ru: beltText(resource.title_ru),
    };
  }),
);

export const BELT_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS =
  CONCRETE_SLAB_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS;
export const BELT_EMBEDDED_ITEMS_SOURCE_ID = CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_ID;
export const BELT_EMBEDDED_ITEMS_NORM_ID = CONCRETE_SLAB_EMBEDDED_ITEMS_NORM_ID;
export const BELT_EMBEDDED_ITEMS_SOURCE_METADATA = Object.freeze({
  ...CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA,
  operation_class: "PLACE_AND_FIX_PROJECT_SPECIFIED_BELT_EMBEDDED_ITEMS_BEFORE_CONCRETING",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function beltEmbeddedItemsAcceptanceInputR1(
  contextKey: BeltEmbeddedItemsContextKey,
): Readonly<Record<string, ConcreteSlabEmbeddedItemsInputValueR1>> {
  const target = BELT_EMBEDDED_ITEMS_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`BELT_EMBEDDED_ITEMS_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const input = concreteSlabEmbeddedItemsAcceptanceInputR1(
    contextKey as ConcreteSlabEmbeddedItemsContextKey,
  );
  return Object.freeze({
    ...input,
    approved_embedment_design_reference: `DESIGN-BELT-EMBED-${reference}-REV-A`,
    embedded_item_schedule_reference: `SCHEDULE-BELT-EMBED-${reference}-REV-A`,
    approved_placement_drawing_reference: `DRAWING-BELT-EMBED-${reference}-REV-A`,
    slab_location: `Монолитный пояс; ${target.contextRu}; захватка BELT-EMBED-${reference}`,
    tolerance_specification_reference: `TOL-BELT-EMBED-${reference}-REV-A`,
    installation_method_statement_reference: `MS-BELT-EMBED-${reference}-REV-A`,
    embedded_item_designation: `EMBEDDED-ITEM-BELT-${reference}-REV-A`,
  });
}

export async function compileBeltEmbeddedItemsR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? BELT_EMBEDDED_ITEMS_TARGETS[0].catalogId;
  if (!BELT_EMBEDDED_ITEMS_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`BELT_EMBEDDED_ITEMS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.belt-embedded-items-r1",
    catalogId,
    primaryMeasureParameterId: "embedded_item_count_piece",
    parameterDefinitions: [...BELT_EMBEDDED_ITEMS_PARAMETERS],
    formulaDefinitions: [...BELT_EMBEDDED_ITEMS_FORMULAS],
    resourceDefinitions: [...BELT_EMBEDDED_ITEMS_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 18,
    hashJson: async (value) => JSON.stringify(value),
  });
}
