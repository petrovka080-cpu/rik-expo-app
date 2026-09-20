import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreResult } from "../backendPlatform/canonicalEstimateCompileCore";
import {
  BELT_REPAIR_FORMULAS, BELT_REPAIR_GUIDE_SOURCE_ID,
  BELT_REPAIR_NORMATIVE_PARAMETER_IDS, BELT_REPAIR_NORM_ID,
  BELT_REPAIR_PARAMETERS, BELT_REPAIR_RESOURCES, BELT_REPAIR_SOURCE_ID,
  BELT_REPAIR_SOURCE_METADATA, beltRepairAcceptanceInputR1,
  type BeltRepairContextKey,
} from "./beltRepairR1";
import type { ConcreteSlabRepairInputValueR1 } from "./concreteSlabRepairR1";

type Json = Record<string, unknown>;

export const COLUMN_BASE_REPAIR_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_repair_standard", titleRu: "Ремонт столбчатого основания в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_repair_high_load", titleRu: "Ремонт столбчатого основания в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_repair_large_area", titleRu: "Ремонт столбчатого основания на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_repair_repair", titleRu: "Локальный ремонт столбчатого основания", contextRu: "локальный ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_repair_small_area", titleRu: "Ремонт столбчатого основания на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_repair_technical_room", titleRu: "Ремонт столбчатого основания в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_repair_wet_zone", titleRu: "Ремонт столбчатого основания во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ColumnBaseRepairContextKey = (typeof COLUMN_BASE_REPAIR_TARGETS)[number]["contextKey"];

function columnBaseText(value: string): string {
  return value
    .replaceAll("монолитного пояса", "столбчатого основания")
    .replaceAll("монолитным поясом", "столбчатым основанием")
    .replaceAll("монолитном поясе", "столбчатом основании")
    .replaceAll("любого монолитного пояса", "любого столбчатого основания")
    .replaceAll("belt-repair", "column-base-repair")
    .replaceAll("project_belt_repair_schedule", "project_column_base_repair_schedule")
    .replaceAll("REPAIR_EXISTING_MONOLITHIC_CONCRETE_BELT", "REPAIR_EXISTING_CONCRETE_COLUMN_BASE");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return columnBaseText(value) as T;
  if (Array.isArray(value)) return value.map(adaptJson) as T;
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value as Json).map(([key, item]) => [key, adaptJson(item)]),
  ) as T;
  return value;
}

export const COLUMN_BASE_REPAIR_PARAMETERS = Object.freeze(BELT_REPAIR_PARAMETERS.map((parameter) => ({
  ...adaptJson(parameter), title_ru: columnBaseText(parameter.title_ru),
})));
export const COLUMN_BASE_REPAIR_FORMULAS = BELT_REPAIR_FORMULAS;
export const COLUMN_BASE_REPAIR_RESOURCES = Object.freeze(BELT_REPAIR_RESOURCES.map((resource) => ({
  ...adaptJson(resource),
  row_id: resource.row_id.replaceAll("belt-repair", "column-base-repair"),
  title_ru: columnBaseText(resource.title_ru),
})));
export const COLUMN_BASE_REPAIR_NORMATIVE_PARAMETER_IDS = BELT_REPAIR_NORMATIVE_PARAMETER_IDS;
export const COLUMN_BASE_REPAIR_SOURCE_ID = BELT_REPAIR_SOURCE_ID;
export const COLUMN_BASE_REPAIR_GUIDE_SOURCE_ID = BELT_REPAIR_GUIDE_SOURCE_ID;
export const COLUMN_BASE_REPAIR_NORM_ID = BELT_REPAIR_NORM_ID;
export const COLUMN_BASE_REPAIR_SOURCE_METADATA = Object.freeze({
  ...BELT_REPAIR_SOURCE_METADATA,
  operation_class: "REPAIR_EXISTING_CONCRETE_COLUMN_BASE",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function columnBaseRepairAcceptanceInputR1(contextKey: ColumnBaseRepairContextKey):
Readonly<Record<string, ConcreteSlabRepairInputValueR1>> {
  const target = COLUMN_BASE_REPAIR_TARGETS.find((candidate) => candidate.contextKey === contextKey);
  if (!target) throw new Error(`COLUMN_BASE_REPAIR_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...beltRepairAcceptanceInputR1(contextKey as BeltRepairContextKey),
    condition_assessment_reference: `ASSESS-COLUMN-BASE-REPAIR-${reference}-REV-A`,
    approved_repair_design_reference: `DESIGN-COLUMN-BASE-REPAIR-${reference}-REV-A`,
    approved_repair_method_designation: `METHOD-COLUMN-BASE-REPAIR-${reference}`,
    repair_method_statement_reference: `MS-COLUMN-BASE-REPAIR-${reference}-REV-A`,
    repair_material_designation: `MATERIAL-COLUMN-BASE-REPAIR-${reference}-REV-A`,
    quality_plan_reference: `QP-COLUMN-BASE-REPAIR-${reference}-REV-A`,
  });
}

export async function compileColumnBaseRepairR1(submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {}): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? COLUMN_BASE_REPAIR_TARGETS[0].catalogId;
  if (!COLUMN_BASE_REPAIR_TARGETS.some((target) => target.catalogId === catalogId)) throw new Error(`COLUMN_BASE_REPAIR_CATALOG_UNSUPPORTED:${catalogId}`);
  return compileCanonicalEstimateCore({
    operation: "compile", compilerVersion: "canonical-estimate-compiler.column-base-repair-r1",
    catalogId, primaryMeasureParameterId: "repair_scope_volume_m3",
    parameterDefinitions: [...COLUMN_BASE_REPAIR_PARAMETERS], formulaDefinitions: [...COLUMN_BASE_REPAIR_FORMULAS],
    resourceDefinitions: [...COLUMN_BASE_REPAIR_RESOURCES], submittedParameters, confirmedParameters: {},
    currencyCode: "KGS", priceItems: [], maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}
