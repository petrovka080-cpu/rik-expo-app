import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  BELT_CURING_FORMULAS,
  BELT_CURING_NORMATIVE_PARAMETER_IDS,
  BELT_CURING_NORM_ID,
  BELT_CURING_PARAMETERS,
  BELT_CURING_RESOURCES,
  BELT_CURING_SOURCE_ID,
  BELT_CURING_SOURCE_METADATA,
  beltCuringAcceptanceInputR1,
  type BeltCuringContextKey,
} from "./beltCuringR1";
import type { ConcreteSlabCuringInputValueR1 } from "./concreteSlabCuringR1";

type Json = Record<string, unknown>;

export const COLUMN_BASE_CURING_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_cure_standard", titleRu: "Уход за бетоном столбчатого основания в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_cure_high_load", titleRu: "Уход за бетоном столбчатого основания в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_cure_large_area", titleRu: "Уход за бетоном столбчатого основания на большом участке", contextRu: "большой участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_cure_small_area", titleRu: "Уход за бетоном столбчатого основания на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_cure_technical_room", titleRu: "Уход за бетоном столбчатого основания в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_column_base_cure_wet_zone", titleRu: "Уход за бетоном столбчатого основания во влажной зоне", contextRu: "влажная зона" },
] as const);

export type ColumnBaseCuringContextKey =
  (typeof COLUMN_BASE_CURING_TARGETS)[number]["contextKey"];

function columnBaseText(value: string): string {
  return value
    .replaceAll("монолитного пояса", "столбчатого основания")
    .replaceAll("монолитным поясом", "столбчатым основанием")
    .replaceAll("монолитном поясе", "столбчатом основании")
    .replaceAll("Монолитный пояс", "Столбчатое основание")
    .replaceAll("belt-curing", "column-base-curing")
    .replaceAll("project_belt_curing_schedule", "project_column_base_curing_schedule");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return columnBaseText(value) as T;
  if (Array.isArray(value)) return value.map(adaptJson) as T;
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value as Json).map(([key, item]) => [key, adaptJson(item)]),
  ) as T;
  return value;
}

export const COLUMN_BASE_CURING_PARAMETERS = Object.freeze(
  BELT_CURING_PARAMETERS.map((parameter) => ({
    ...adaptJson(parameter),
    title_ru: columnBaseText(parameter.title_ru),
  })),
);

// The accepted ACI 308 calculation graph is shared; only the catalog element changes.
export const COLUMN_BASE_CURING_FORMULAS = BELT_CURING_FORMULAS;

export const COLUMN_BASE_CURING_RESOURCES = Object.freeze(
  BELT_CURING_RESOURCES.map((resource) => ({
    ...adaptJson(resource),
    row_id: resource.row_id.replaceAll("belt-curing", "column-base-curing"),
    title_ru: columnBaseText(resource.title_ru),
  })),
);

export const COLUMN_BASE_CURING_NORMATIVE_PARAMETER_IDS =
  BELT_CURING_NORMATIVE_PARAMETER_IDS;
export const COLUMN_BASE_CURING_SOURCE_ID = BELT_CURING_SOURCE_ID;
export const COLUMN_BASE_CURING_NORM_ID = BELT_CURING_NORM_ID;
export const COLUMN_BASE_CURING_SOURCE_METADATA = Object.freeze({
  ...BELT_CURING_SOURCE_METADATA,
  operation_class: "EXTERNAL_CURING_OF_COLUMN_BASE_CONCRETE",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function columnBaseCuringAcceptanceInputR1(
  contextKey: ColumnBaseCuringContextKey,
): Readonly<Record<string, ConcreteSlabCuringInputValueR1>> {
  const target = COLUMN_BASE_CURING_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`COLUMN_BASE_CURING_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  const input = beltCuringAcceptanceInputR1(contextKey as BeltCuringContextKey);
  return Object.freeze({
    ...input,
    concrete_mix_reference: `COLUMN-BASE-CURE-${reference}-MIX-REV-A`,
    curing_location: `Столбчатое основание; ${target.contextRu}; захватка COLUMN-BASE-CURE-${reference}`,
    curing_method_statement_reference: `MS-COLUMN-BASE-CURE-${reference}-REV-A`,
    quality_plan_reference: `QP-COLUMN-BASE-CURE-${reference}-REV-A`,
  });
}

export async function compileColumnBaseCuringR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? COLUMN_BASE_CURING_TARGETS[0].catalogId;
  if (!COLUMN_BASE_CURING_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`COLUMN_BASE_CURING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.column-base-curing-r1",
    catalogId,
    primaryMeasureParameterId: "cured_concrete_volume_m3",
    parameterDefinitions: [...COLUMN_BASE_CURING_PARAMETERS],
    formulaDefinitions: [...COLUMN_BASE_CURING_FORMULAS],
    resourceDefinitions: [...COLUMN_BASE_CURING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}
