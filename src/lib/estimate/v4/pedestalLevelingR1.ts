import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  COLUMN_BASE_LEVELING_FORMULAS,
  COLUMN_BASE_LEVELING_NORMATIVE_PARAMETER_IDS,
  COLUMN_BASE_LEVELING_NORM_ID,
  COLUMN_BASE_LEVELING_PARAMETERS,
  COLUMN_BASE_LEVELING_RESOURCES,
  COLUMN_BASE_LEVELING_SOURCE_ID,
  COLUMN_BASE_LEVELING_SOURCE_METADATA,
  COLUMN_BASE_LEVELING_TARGETS,
  columnBaseLevelingAcceptanceInputR1,
  type ColumnBaseLevelingContextKey,
} from "./columnBaseLevelingR1";
import type { ConcreteSlabLevelingInputValueR1 } from "./concreteSlabLevelingR1";

type Json = Record<string, unknown>;

function pedestalText(value: string): string {
  return value
    .replaceAll("столбчатого основания", "бетонного пьедестала")
    .replaceAll("столбчатым основанием", "бетонным пьедесталом")
    .replaceAll("столбчатом основании", "бетонном пьедестале")
    .replaceAll("столбчатое основание", "бетонный пьедестал")
    .replaceAll("Столбчатое основание", "Бетонный пьедестал")
    .replaceAll("column-base-leveling", "pedestal-leveling")
    .replaceAll("project_column_base_leveling_schedule", "project_pedestal_leveling_schedule");
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

export const PEDESTAL_LEVELING_TARGETS = Object.freeze(
  COLUMN_BASE_LEVELING_TARGETS.map((target) => Object.freeze({
    ...target,
    catalogId: target.catalogId.replace("_column_base_level_", "_pedestal_level_"),
    titleRu: pedestalText(target.titleRu),
  })),
);

export type PedestalLevelingContextKey =
  (typeof PEDESTAL_LEVELING_TARGETS)[number]["contextKey"];

export const PEDESTAL_LEVELING_PARAMETERS = Object.freeze(
  COLUMN_BASE_LEVELING_PARAMETERS.map((parameter) => ({
    ...adaptJson(parameter),
    title_ru: pedestalText(parameter.title_ru),
  })),
);

// ACI 302 defines the leveling operation independently of the concrete element shape.
export const PEDESTAL_LEVELING_FORMULAS = COLUMN_BASE_LEVELING_FORMULAS;

export const PEDESTAL_LEVELING_RESOURCES = Object.freeze(
  COLUMN_BASE_LEVELING_RESOURCES.map((resource) => ({
    ...adaptJson(resource),
    row_id: resource.row_id.replaceAll("column-base-leveling", "pedestal-leveling"),
    title_ru: pedestalText(resource.title_ru),
  })),
);

export const PEDESTAL_LEVELING_NORMATIVE_PARAMETER_IDS =
  COLUMN_BASE_LEVELING_NORMATIVE_PARAMETER_IDS;
export const PEDESTAL_LEVELING_SOURCE_ID = COLUMN_BASE_LEVELING_SOURCE_ID;
export const PEDESTAL_LEVELING_NORM_ID = COLUMN_BASE_LEVELING_NORM_ID;
export const PEDESTAL_LEVELING_SOURCE_METADATA = Object.freeze({
  ...COLUMN_BASE_LEVELING_SOURCE_METADATA,
  operation_class: "LEVEL_AND_STRIKE_OFF_FRESH_PEDESTAL_CONCRETE",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function pedestalLevelingAcceptanceInputR1(
  contextKey: PedestalLevelingContextKey,
): Readonly<Record<string, ConcreteSlabLevelingInputValueR1>> {
  const target = PEDESTAL_LEVELING_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PEDESTAL_LEVELING_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...columnBaseLevelingAcceptanceInputR1(contextKey as ColumnBaseLevelingContextKey),
    concrete_mix_reference: `PEDESTAL-LEVEL-${reference}-MIX-REV-A`,
    leveling_location: `Бетонный пьедестал; ${target.contextRu}; захватка PEDESTAL-LEVEL-${reference}`,
    target_elevation_and_slope_reference: `ELEV-SLOPE-PEDESTAL-LEVEL-${reference}-REV-A`,
    flatness_levelness_requirement_reference: `FL-PEDESTAL-LEVEL-${reference}-REV-A`,
    leveling_method_statement_reference: `MS-PEDESTAL-LEVEL-${reference}-REV-A`,
    quality_plan_reference: `QP-PEDESTAL-LEVEL-${reference}-REV-A`,
  });
}

export async function compilePedestalLevelingR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PEDESTAL_LEVELING_TARGETS[0].catalogId;
  if (!PEDESTAL_LEVELING_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`PEDESTAL_LEVELING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pedestal-leveling-r1",
    catalogId,
    primaryMeasureParameterId: "leveled_concrete_volume_m3",
    parameterDefinitions: [...PEDESTAL_LEVELING_PARAMETERS],
    formulaDefinitions: [...PEDESTAL_LEVELING_FORMULAS],
    resourceDefinitions: [...PEDESTAL_LEVELING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value),
  });
}
