import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  BELT_LEVELING_FORMULAS,
  BELT_LEVELING_NORMATIVE_PARAMETER_IDS,
  BELT_LEVELING_NORM_ID,
  BELT_LEVELING_PARAMETERS,
  BELT_LEVELING_RESOURCES,
  BELT_LEVELING_SOURCE_ID,
  BELT_LEVELING_SOURCE_METADATA,
  beltLevelingAcceptanceInputR1,
  type BeltLevelingContextKey,
} from "./beltLevelingR1";
import type { ConcreteSlabLevelingInputValueR1 } from "./concreteSlabLevelingR1";

type Json = Record<string, unknown>;

export const COLUMN_BASE_LEVELING_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_level_standard", titleRu: "Выравнивание бетона столбчатого основания в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_level_high_load", titleRu: "Выравнивание бетона столбчатого основания в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_level_large_area", titleRu: "Выравнивание бетона столбчатого основания на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_level_repair", titleRu: "Выравнивание бетона столбчатого основания на ремонтном участке", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_level_small_area", titleRu: "Выравнивание бетона столбчатого основания на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_level_technical_room", titleRu: "Выравнивание бетона столбчатого основания в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_level_wet_zone", titleRu: "Выравнивание бетона столбчатого основания во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ColumnBaseLevelingContextKey =
  (typeof COLUMN_BASE_LEVELING_TARGETS)[number]["contextKey"];

function columnBaseText(value: string): string {
  return value
    .replaceAll("свежеуложенного бетона монолитного пояса", "свежеуложенного бетона столбчатого основания")
    .replaceAll("бетона монолитного пояса", "бетона столбчатого основания")
    .replaceAll("бетоном монолитного пояса", "бетоном столбчатого основания")
    .replaceAll("бетоне монолитного пояса", "бетоне столбчатого основания")
    .replaceAll("Монолитный пояс", "Столбчатое основание")
    .replaceAll("belt-leveling", "column-base-leveling")
    .replaceAll("project_belt_leveling_schedule", "project_column_base_leveling_schedule");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return columnBaseText(value) as T;
  if (Array.isArray(value)) return value.map(adaptJson) as T;
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value as Json).map(([key, item]) => [key, adaptJson(item)]),
  ) as T;
  return value;
}

export const COLUMN_BASE_LEVELING_PARAMETERS = Object.freeze(
  BELT_LEVELING_PARAMETERS.map((parameter) => ({
    ...adaptJson(parameter),
    title_ru: columnBaseText(parameter.title_ru),
  })),
);
export const COLUMN_BASE_LEVELING_FORMULAS = BELT_LEVELING_FORMULAS;
export const COLUMN_BASE_LEVELING_RESOURCES = Object.freeze(
  BELT_LEVELING_RESOURCES.map((resource) => ({
    ...adaptJson(resource),
    row_id: resource.row_id.replaceAll("belt-leveling", "column-base-leveling"),
    title_ru: columnBaseText(resource.title_ru),
  })),
);

export const COLUMN_BASE_LEVELING_NORMATIVE_PARAMETER_IDS =
  BELT_LEVELING_NORMATIVE_PARAMETER_IDS;
export const COLUMN_BASE_LEVELING_SOURCE_ID = BELT_LEVELING_SOURCE_ID;
export const COLUMN_BASE_LEVELING_NORM_ID = BELT_LEVELING_NORM_ID;
export const COLUMN_BASE_LEVELING_SOURCE_METADATA = Object.freeze({
  ...BELT_LEVELING_SOURCE_METADATA,
  operation_class: "LEVEL_AND_STRIKE_OFF_FRESH_COLUMN_BASE_CONCRETE",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function columnBaseLevelingAcceptanceInputR1(
  contextKey: ColumnBaseLevelingContextKey,
): Readonly<Record<string, ConcreteSlabLevelingInputValueR1>> {
  const target = COLUMN_BASE_LEVELING_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`COLUMN_BASE_LEVELING_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const input = beltLevelingAcceptanceInputR1(contextKey as BeltLevelingContextKey);
  return Object.freeze({
    ...input,
    concrete_mix_reference: `COLUMN-BASE-LEVEL-${reference}-MIX-REV-A`,
    leveling_location: `Столбчатое основание; ${target.contextRu}; захватка COLUMN-BASE-LEVEL-${reference}`,
    target_elevation_and_slope_reference: `ELEV-SLOPE-COLUMN-BASE-LEVEL-${reference}-REV-A`,
    flatness_levelness_requirement_reference: `FL-COLUMN-BASE-LEVEL-${reference}-REV-A`,
    leveling_method_statement_reference: `MS-COLUMN-BASE-LEVEL-${reference}-REV-A`,
    quality_plan_reference: `QP-COLUMN-BASE-LEVEL-${reference}-REV-A`,
  });
}

export async function compileColumnBaseLevelingR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? COLUMN_BASE_LEVELING_TARGETS[0].catalogId;
  if (!COLUMN_BASE_LEVELING_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`COLUMN_BASE_LEVELING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.column-base-leveling-r1",
    catalogId,
    primaryMeasureParameterId: "leveled_concrete_volume_m3",
    parameterDefinitions: [...COLUMN_BASE_LEVELING_PARAMETERS],
    formulaDefinitions: [...COLUMN_BASE_LEVELING_FORMULAS],
    resourceDefinitions: [...COLUMN_BASE_LEVELING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value),
  });
}
