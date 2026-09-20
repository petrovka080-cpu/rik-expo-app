import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  BELT_EMBEDDED_ITEMS_FORMULAS,
  BELT_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
  BELT_EMBEDDED_ITEMS_NORM_ID,
  BELT_EMBEDDED_ITEMS_PARAMETERS,
  BELT_EMBEDDED_ITEMS_RESOURCES,
  BELT_EMBEDDED_ITEMS_SOURCE_ID,
  BELT_EMBEDDED_ITEMS_SOURCE_METADATA,
  beltEmbeddedItemsAcceptanceInputR1,
  type BeltEmbeddedItemsContextKey,
} from "./beltEmbeddedItemsR1";
import type { ConcreteSlabEmbeddedItemsInputValueR1 } from "./concreteSlabEmbeddedItemsR1";

type Json = Record<string, unknown>;

export const COLUMN_BASE_EMBEDDED_ITEMS_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_anchor_standard", titleRu: "Монтаж закладных для столбчатого основания в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_anchor_high_load", titleRu: "Монтаж закладных для столбчатого основания в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_anchor_large_area", titleRu: "Монтаж закладных для столбчатого основания на большом участке", contextRu: "большой участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_anchor_small_area", titleRu: "Монтаж закладных для столбчатого основания на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_anchor_technical_room", titleRu: "Монтаж закладных для столбчатого основания в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_anchor_wet_zone", titleRu: "Монтаж закладных для столбчатого основания во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ColumnBaseEmbeddedItemsContextKey =
  (typeof COLUMN_BASE_EMBEDDED_ITEMS_TARGETS)[number]["contextKey"];

function columnBaseText(value: string): string {
  return value
    .replaceAll("монолитного пояса", "столбчатого основания")
    .replaceAll("Монолитный пояс", "Столбчатое основание")
    .replaceAll("belt-embedded-items", "column-base-embedded-items")
    .replaceAll("project_belt_embedded_items_schedule", "project_column_base_embedded_items_schedule");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return columnBaseText(value) as T;
  if (Array.isArray(value)) return value.map(adaptJson) as T;
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value as Json).map(([key, item]) => [key, adaptJson(item)]),
  ) as T;
  return value;
}

export const COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS = Object.freeze(
  BELT_EMBEDDED_ITEMS_PARAMETERS.map((parameter) => ({
    ...adaptJson(parameter),
    title_ru: columnBaseText(parameter.title_ru),
  })),
);

export const COLUMN_BASE_EMBEDDED_ITEMS_FORMULAS = BELT_EMBEDDED_ITEMS_FORMULAS;
export const COLUMN_BASE_EMBEDDED_ITEMS_RESOURCES = Object.freeze(
  BELT_EMBEDDED_ITEMS_RESOURCES.map((resource) => ({
    ...adaptJson(resource),
    row_id: resource.row_id.replaceAll("belt-embedded-items", "column-base-embedded-items"),
    title_ru: columnBaseText(resource.title_ru),
  })),
);

export const COLUMN_BASE_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS =
  BELT_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS;
export const COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_ID = BELT_EMBEDDED_ITEMS_SOURCE_ID;
export const COLUMN_BASE_EMBEDDED_ITEMS_NORM_ID = BELT_EMBEDDED_ITEMS_NORM_ID;
export const COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_METADATA = Object.freeze({
  ...BELT_EMBEDDED_ITEMS_SOURCE_METADATA,
  operation_class: "PLACE_AND_FIX_PROJECT_SPECIFIED_COLUMN_BASE_EMBEDDED_ITEMS_BEFORE_CONCRETING",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function columnBaseEmbeddedItemsAcceptanceInputR1(
  contextKey: ColumnBaseEmbeddedItemsContextKey,
): Readonly<Record<string, ConcreteSlabEmbeddedItemsInputValueR1>> {
  const target = COLUMN_BASE_EMBEDDED_ITEMS_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`COLUMN_BASE_EMBEDDED_ITEMS_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const input = beltEmbeddedItemsAcceptanceInputR1(contextKey as BeltEmbeddedItemsContextKey);
  return Object.freeze({
    ...input,
    approved_embedment_design_reference: `DESIGN-COLUMN-BASE-EMBED-${reference}-REV-A`,
    embedded_item_schedule_reference: `SCHEDULE-COLUMN-BASE-EMBED-${reference}-REV-A`,
    approved_placement_drawing_reference: `DRAWING-COLUMN-BASE-EMBED-${reference}-REV-A`,
    slab_location: `Столбчатое основание; ${target.contextRu}; захватка COLUMN-BASE-EMBED-${reference}`,
    tolerance_specification_reference: `TOL-COLUMN-BASE-EMBED-${reference}-REV-A`,
    installation_method_statement_reference: `MS-COLUMN-BASE-EMBED-${reference}-REV-A`,
    embedded_item_designation: `EMBEDDED-ITEM-COLUMN-BASE-${reference}-REV-A`,
  });
}

export async function compileColumnBaseEmbeddedItemsR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? COLUMN_BASE_EMBEDDED_ITEMS_TARGETS[0].catalogId;
  if (!COLUMN_BASE_EMBEDDED_ITEMS_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`COLUMN_BASE_EMBEDDED_ITEMS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.column-base-embedded-items-r1",
    catalogId,
    primaryMeasureParameterId: "embedded_item_count_piece",
    parameterDefinitions: [...COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS],
    formulaDefinitions: [...COLUMN_BASE_EMBEDDED_ITEMS_FORMULAS],
    resourceDefinitions: [...COLUMN_BASE_EMBEDDED_ITEMS_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 18,
    hashJson: async (value) => JSON.stringify(value),
  });
}
