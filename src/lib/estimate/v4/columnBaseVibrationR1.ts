import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreResult } from "../backendPlatform/canonicalEstimateCompileCore";
import {
  BELT_VIBRATION_FORMULAS, BELT_VIBRATION_NORMATIVE_PARAMETER_IDS,
  BELT_VIBRATION_NORM_ID, BELT_VIBRATION_PARAMETERS, BELT_VIBRATION_RESOURCES,
  BELT_VIBRATION_SOURCE_ID, BELT_VIBRATION_SOURCE_METADATA,
  beltVibrationAcceptanceInputR1, type BeltVibrationContextKey,
} from "./beltVibrationR1";
import type { ConcreteSlabVibrationInputValueR1 } from "./concreteSlabVibrationR1";

type Json = Record<string, unknown>;
export const COLUMN_BASE_VIBRATION_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_vibrate_standard", titleRu: "Виброуплотнение бетона столбчатого основания в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_vibrate_high_load", titleRu: "Виброуплотнение бетона столбчатого основания в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_vibrate_large_area", titleRu: "Виброуплотнение бетона столбчатого основания на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_vibrate_repair", titleRu: "Виброуплотнение бетона столбчатого основания на ремонтном участке", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_vibrate_small_area", titleRu: "Виброуплотнение бетона столбчатого основания на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_vibrate_technical_room", titleRu: "Виброуплотнение бетона столбчатого основания в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_vibrate_wet_zone", titleRu: "Виброуплотнение бетона столбчатого основания во влажной зоне", contextRu: "влажная зона" },
] as const);
export type ColumnBaseVibrationContextKey = (typeof COLUMN_BASE_VIBRATION_TARGETS)[number]["contextKey"];

function columnBaseText(value: string): string {
  return value.replaceAll("бетона монолитного пояса", "бетона столбчатого основания")
    .replaceAll("монолитного пояса", "столбчатого основания")
    .replaceAll("Монолитный пояс", "Столбчатое основание")
    .replaceAll("belt-vibration", "column-base-vibration")
    .replaceAll("project_belt_vibration_schedule", "project_column_base_vibration_schedule");
}
function adaptJson<T>(value: T): T {
  if (typeof value === "string") return columnBaseText(value) as T;
  if (Array.isArray(value)) return value.map(adaptJson) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Json).map(([key, item]) => [key, adaptJson(item)])) as T;
  return value;
}
export const COLUMN_BASE_VIBRATION_PARAMETERS = Object.freeze(BELT_VIBRATION_PARAMETERS.map((parameter) => ({ ...adaptJson(parameter), title_ru: columnBaseText(parameter.title_ru) })));
export const COLUMN_BASE_VIBRATION_FORMULAS = BELT_VIBRATION_FORMULAS;
export const COLUMN_BASE_VIBRATION_RESOURCES = Object.freeze(BELT_VIBRATION_RESOURCES.map((resource) => ({
  ...adaptJson(resource), row_id: resource.row_id.replaceAll("belt-vibration", "column-base-vibration"), title_ru: columnBaseText(resource.title_ru),
})));
export const COLUMN_BASE_VIBRATION_NORMATIVE_PARAMETER_IDS = BELT_VIBRATION_NORMATIVE_PARAMETER_IDS;
export const COLUMN_BASE_VIBRATION_SOURCE_ID = BELT_VIBRATION_SOURCE_ID;
export const COLUMN_BASE_VIBRATION_NORM_ID = BELT_VIBRATION_NORM_ID;
export const COLUMN_BASE_VIBRATION_SOURCE_METADATA = Object.freeze({
  ...BELT_VIBRATION_SOURCE_METADATA, operation_class: "INTERNAL_VIBRATION_OF_FRESH_COLUMN_BASE_CONCRETE",
  documentary_references_optional: true, calculation_inputs_never_invented: true,
});
export function columnBaseVibrationAcceptanceInputR1(contextKey: ColumnBaseVibrationContextKey): Readonly<Record<string, ConcreteSlabVibrationInputValueR1>> {
  const target = COLUMN_BASE_VIBRATION_TARGETS.find((candidate) => candidate.contextKey === contextKey);
  if (!target) throw new Error(`COLUMN_BASE_VIBRATION_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...beltVibrationAcceptanceInputR1(contextKey as BeltVibrationContextKey),
    concrete_mix_reference: `COLUMN-BASE-VIB-${reference}-MIX-REV-A`,
    placement_location: `Столбчатое основание; ${target.contextRu}; захватка COLUMN-BASE-VIB-${reference}`,
    method_statement_reference: `MS-COLUMN-BASE-VIB-${reference}-REV-A`,
    equipment_schedule_reference: `EQ-COLUMN-BASE-VIB-${reference}-REV-A`,
    quality_plan_reference: `QP-COLUMN-BASE-VIB-${reference}-REV-A`,
    mobilization_scope_reference: `LOG-COLUMN-BASE-VIB-${reference}-RETURN-INCLUDED`,
  });
}
export async function compileColumnBaseVibrationR1(submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {}): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? COLUMN_BASE_VIBRATION_TARGETS[0].catalogId;
  if (!COLUMN_BASE_VIBRATION_TARGETS.some((target) => target.catalogId === catalogId)) throw new Error(`COLUMN_BASE_VIBRATION_CATALOG_UNSUPPORTED:${catalogId}`);
  return compileCanonicalEstimateCore({ operation: "compile", compilerVersion: "canonical-estimate-compiler.column-base-vibration-r1", catalogId,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3", parameterDefinitions: [...COLUMN_BASE_VIBRATION_PARAMETERS],
    formulaDefinitions: [...COLUMN_BASE_VIBRATION_FORMULAS], resourceDefinitions: [...COLUMN_BASE_VIBRATION_RESOURCES],
    submittedParameters, confirmedParameters: {}, currencyCode: "KGS", priceItems: [], maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value) });
}
