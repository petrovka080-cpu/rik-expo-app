import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  COLUMN_BASE_VIBRATION_FORMULAS,
  COLUMN_BASE_VIBRATION_NORMATIVE_PARAMETER_IDS,
  COLUMN_BASE_VIBRATION_NORM_ID,
  COLUMN_BASE_VIBRATION_PARAMETERS,
  COLUMN_BASE_VIBRATION_RESOURCES,
  COLUMN_BASE_VIBRATION_SOURCE_ID,
  COLUMN_BASE_VIBRATION_SOURCE_METADATA,
  COLUMN_BASE_VIBRATION_TARGETS,
  columnBaseVibrationAcceptanceInputR1,
  type ColumnBaseVibrationContextKey,
} from "./columnBaseVibrationR1";
import type { ConcreteSlabVibrationInputValueR1 } from "./concreteSlabVibrationR1";

type Json = Record<string, unknown>;

function pedestalText(value: string): string {
  return value
    .replaceAll("бетона столбчатого основания", "бетона бетонного пьедестала")
    .replaceAll("столбчатого основания", "бетонного пьедестала")
    .replaceAll("столбчатым основанием", "бетонным пьедесталом")
    .replaceAll("столбчатом основании", "бетонном пьедестале")
    .replaceAll("столбчатое основание", "бетонный пьедестал")
    .replaceAll("Столбчатое основание", "Бетонный пьедестал")
    .replaceAll("column-base-vibration", "pedestal-vibration")
    .replaceAll("project_column_base_vibration_schedule", "project_pedestal_vibration_schedule");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return pedestalText(value) as T;
  if (Array.isArray(value)) return value.map(adaptJson) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Json).map(([key, item]) => [key, adaptJson(item)]),
    ) as T;
  }
  return value;
}

export const PEDESTAL_VIBRATION_TARGETS = Object.freeze(
  COLUMN_BASE_VIBRATION_TARGETS.map((target) => Object.freeze({
    ...target,
    catalogId: target.catalogId.replace("_column_base_vibrate_", "_pedestal_vibrate_"),
    titleRu: pedestalText(target.titleRu),
  })),
);

export type PedestalVibrationContextKey =
  (typeof PEDESTAL_VIBRATION_TARGETS)[number]["contextKey"];

export const PEDESTAL_VIBRATION_PARAMETERS = Object.freeze(
  COLUMN_BASE_VIBRATION_PARAMETERS.map((parameter) => ({
    ...adaptJson(parameter),
    title_ru: pedestalText(parameter.title_ru),
  })),
);

// ACI 309 defines internal vibration independently of the concrete element shape.
export const PEDESTAL_VIBRATION_FORMULAS = COLUMN_BASE_VIBRATION_FORMULAS;

export const PEDESTAL_VIBRATION_RESOURCES = Object.freeze(
  COLUMN_BASE_VIBRATION_RESOURCES.map((resource) => ({
    ...adaptJson(resource),
    row_id: resource.row_id.replaceAll("column-base-vibration", "pedestal-vibration"),
    title_ru: pedestalText(resource.title_ru),
  })),
);

export const PEDESTAL_VIBRATION_NORMATIVE_PARAMETER_IDS =
  COLUMN_BASE_VIBRATION_NORMATIVE_PARAMETER_IDS;
export const PEDESTAL_VIBRATION_SOURCE_ID = COLUMN_BASE_VIBRATION_SOURCE_ID;
export const PEDESTAL_VIBRATION_NORM_ID = COLUMN_BASE_VIBRATION_NORM_ID;
export const PEDESTAL_VIBRATION_SOURCE_METADATA = Object.freeze({
  ...COLUMN_BASE_VIBRATION_SOURCE_METADATA,
  operation_class: "INTERNAL_VIBRATION_OF_FRESH_PEDESTAL_CONCRETE",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function pedestalVibrationAcceptanceInputR1(
  contextKey: PedestalVibrationContextKey,
): Readonly<Record<string, ConcreteSlabVibrationInputValueR1>> {
  const target = PEDESTAL_VIBRATION_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PEDESTAL_VIBRATION_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...columnBaseVibrationAcceptanceInputR1(contextKey as ColumnBaseVibrationContextKey),
    concrete_mix_reference: `PEDESTAL-VIB-${reference}-MIX-REV-A`,
    placement_location: `Бетонный пьедестал; ${target.contextRu}; захватка PEDESTAL-VIB-${reference}`,
    method_statement_reference: `MS-PEDESTAL-VIB-${reference}-REV-A`,
    equipment_schedule_reference: `EQ-PEDESTAL-VIB-${reference}-REV-A`,
    quality_plan_reference: `QP-PEDESTAL-VIB-${reference}-REV-A`,
    mobilization_scope_reference: `LOG-PEDESTAL-VIB-${reference}-RETURN-INCLUDED`,
  });
}

export async function compilePedestalVibrationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PEDESTAL_VIBRATION_TARGETS[0].catalogId;
  if (!PEDESTAL_VIBRATION_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`PEDESTAL_VIBRATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pedestal-vibration-r1",
    catalogId,
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    parameterDefinitions: [...PEDESTAL_VIBRATION_PARAMETERS],
    formulaDefinitions: [...PEDESTAL_VIBRATION_FORMULAS],
    resourceDefinitions: [...PEDESTAL_VIBRATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value),
  });
}
