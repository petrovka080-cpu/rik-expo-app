import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreResult } from "../backendPlatform/canonicalEstimateCompileCore";
import {
  COLUMN_BASE_EMBEDDED_ITEMS_FORMULAS, COLUMN_BASE_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS,
  COLUMN_BASE_EMBEDDED_ITEMS_NORM_ID, COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS,
  COLUMN_BASE_EMBEDDED_ITEMS_RESOURCES, COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_ID,
  COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_METADATA, columnBaseEmbeddedItemsAcceptanceInputR1,
  type ColumnBaseEmbeddedItemsContextKey,
} from "./columnBaseEmbeddedItemsR1";
import type { ConcreteSlabEmbeddedItemsInputValueR1 } from "./concreteSlabEmbeddedItemsR1";

type Json = Record<string, unknown>;
export const PEDESTAL_EMBEDDED_ITEMS_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_anchor_standard", titleRu: "Монтаж закладных для бетонного пьедестала в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_anchor_high_load", titleRu: "Монтаж закладных для бетонного пьедестала в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_anchor_large_area", titleRu: "Монтаж закладных для бетонного пьедестала на большом участке", contextRu: "большой участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_anchor_small_area", titleRu: "Монтаж закладных для бетонного пьедестала на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_anchor_technical_room", titleRu: "Монтаж закладных для бетонного пьедестала в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_anchor_wet_zone", titleRu: "Монтаж закладных для бетонного пьедестала во влажной зоне", contextRu: "влажная зона" },
] as const);
export type PedestalEmbeddedItemsContextKey = (typeof PEDESTAL_EMBEDDED_ITEMS_TARGETS)[number]["contextKey"];

function pedestalText(value: string): string {
  return value.replaceAll("столбчатого основания", "бетонного пьедестала")
    .replaceAll("Столбчатое основание", "Бетонный пьедестал")
    .replaceAll("column-base-embedded-items", "pedestal-embedded-items")
    .replaceAll("project_column_base_embedded_items_schedule", "project_pedestal_embedded_items_schedule");
}
function adaptJson<T>(value: T): T {
  if (typeof value === "string") return pedestalText(value) as T;
  if (Array.isArray(value)) return value.map(adaptJson) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Json).map(([key, item]) => [key, adaptJson(item)])) as T;
  return value;
}
export const PEDESTAL_EMBEDDED_ITEMS_PARAMETERS = Object.freeze(COLUMN_BASE_EMBEDDED_ITEMS_PARAMETERS.map((parameter) => ({ ...adaptJson(parameter), title_ru: pedestalText(parameter.title_ru) })));
export const PEDESTAL_EMBEDDED_ITEMS_FORMULAS = COLUMN_BASE_EMBEDDED_ITEMS_FORMULAS;
export const PEDESTAL_EMBEDDED_ITEMS_RESOURCES = Object.freeze(COLUMN_BASE_EMBEDDED_ITEMS_RESOURCES.map((resource) => ({
  ...adaptJson(resource), row_id: resource.row_id.replaceAll("column-base-embedded-items", "pedestal-embedded-items"), title_ru: pedestalText(resource.title_ru),
})));
export const PEDESTAL_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS = COLUMN_BASE_EMBEDDED_ITEMS_NORMATIVE_PARAMETER_IDS;
export const PEDESTAL_EMBEDDED_ITEMS_SOURCE_ID = COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_ID;
export const PEDESTAL_EMBEDDED_ITEMS_NORM_ID = COLUMN_BASE_EMBEDDED_ITEMS_NORM_ID;
export const PEDESTAL_EMBEDDED_ITEMS_SOURCE_METADATA = Object.freeze({
  ...COLUMN_BASE_EMBEDDED_ITEMS_SOURCE_METADATA,
  operation_class: "PLACE_AND_FIX_PROJECT_SPECIFIED_PEDESTAL_EMBEDDED_ITEMS_BEFORE_CONCRETING",
  documentary_references_optional: true, calculation_inputs_never_invented: true,
});
export function pedestalEmbeddedItemsAcceptanceInputR1(contextKey: PedestalEmbeddedItemsContextKey): Readonly<Record<string, ConcreteSlabEmbeddedItemsInputValueR1>> {
  const target = PEDESTAL_EMBEDDED_ITEMS_TARGETS.find((candidate) => candidate.contextKey === contextKey);
  if (!target) throw new Error(`PEDESTAL_EMBEDDED_ITEMS_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...columnBaseEmbeddedItemsAcceptanceInputR1(contextKey as ColumnBaseEmbeddedItemsContextKey),
    approved_embedment_design_reference: `DESIGN-PEDESTAL-EMBED-${reference}-REV-A`,
    embedded_item_schedule_reference: `SCHEDULE-PEDESTAL-EMBED-${reference}-REV-A`,
    approved_placement_drawing_reference: `DRAWING-PEDESTAL-EMBED-${reference}-REV-A`,
    slab_location: `Бетонный пьедестал; ${target.contextRu}; захватка PEDESTAL-EMBED-${reference}`,
    tolerance_specification_reference: `TOL-PEDESTAL-EMBED-${reference}-REV-A`,
    installation_method_statement_reference: `MS-PEDESTAL-EMBED-${reference}-REV-A`,
    embedded_item_designation: `EMBEDDED-ITEM-PEDESTAL-${reference}-REV-A`,
  });
}
export async function compilePedestalEmbeddedItemsR1(submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {}): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PEDESTAL_EMBEDDED_ITEMS_TARGETS[0].catalogId;
  if (!PEDESTAL_EMBEDDED_ITEMS_TARGETS.some((target) => target.catalogId === catalogId)) throw new Error(`PEDESTAL_EMBEDDED_ITEMS_CATALOG_UNSUPPORTED:${catalogId}`);
  return compileCanonicalEstimateCore({ operation: "compile", compilerVersion: "canonical-estimate-compiler.pedestal-embedded-items-r1", catalogId,
    primaryMeasureParameterId: "embedded_item_count_piece", parameterDefinitions: [...PEDESTAL_EMBEDDED_ITEMS_PARAMETERS],
    formulaDefinitions: [...PEDESTAL_EMBEDDED_ITEMS_FORMULAS], resourceDefinitions: [...PEDESTAL_EMBEDDED_ITEMS_RESOURCES],
    submittedParameters, confirmedParameters: {}, currencyCode: "KGS", priceItems: [], maximumResourceRows: 18,
    hashJson: async (value) => JSON.stringify(value) });
}
