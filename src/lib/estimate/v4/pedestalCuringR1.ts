import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  COLUMN_BASE_CURING_FORMULAS,
  COLUMN_BASE_CURING_NORMATIVE_PARAMETER_IDS,
  COLUMN_BASE_CURING_NORM_ID,
  COLUMN_BASE_CURING_PARAMETERS,
  COLUMN_BASE_CURING_RESOURCES,
  COLUMN_BASE_CURING_SOURCE_ID,
  COLUMN_BASE_CURING_SOURCE_METADATA,
  columnBaseCuringAcceptanceInputR1,
  type ColumnBaseCuringContextKey,
} from "./columnBaseCuringR1";
import type { ConcreteSlabCuringInputValueR1 } from "./concreteSlabCuringR1";

type Json = Record<string, unknown>;

export const PEDESTAL_CURING_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_cure_standard", titleRu: "Уход за бетоном пьедестала в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_cure_high_load", titleRu: "Уход за бетоном пьедестала в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_cure_large_area", titleRu: "Уход за бетоном пьедестала на большом участке", contextRu: "большой участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_cure_small_area", titleRu: "Уход за бетоном пьедестала на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_cure_technical_room", titleRu: "Уход за бетоном пьедестала в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_pedestal_cure_wet_zone", titleRu: "Уход за бетоном пьедестала во влажной зоне", contextRu: "влажная зона" },
] as const);

export type PedestalCuringContextKey =
  (typeof PEDESTAL_CURING_TARGETS)[number]["contextKey"];

function pedestalText(value: string): string {
  return value
    .replaceAll("столбчатого основания", "бетонного пьедестала")
    .replaceAll("столбчатым основанием", "бетонным пьедесталом")
    .replaceAll("столбчатом основании", "бетонном пьедестале")
    .replaceAll("Столбчатое основание", "Бетонный пьедестал")
    .replaceAll("column-base-curing", "pedestal-curing")
    .replaceAll("project_column_base_curing_schedule", "project_pedestal_curing_schedule");
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

export const PEDESTAL_CURING_PARAMETERS = Object.freeze(
  COLUMN_BASE_CURING_PARAMETERS.map((parameter) => ({
    ...adaptJson(parameter),
    title_ru: pedestalText(parameter.title_ru),
  })),
);

// ACI 308 defines the curing operation independently of the concrete element shape.
export const PEDESTAL_CURING_FORMULAS = COLUMN_BASE_CURING_FORMULAS;

export const PEDESTAL_CURING_RESOURCES = Object.freeze(
  COLUMN_BASE_CURING_RESOURCES.map((resource) => ({
    ...adaptJson(resource),
    row_id: resource.row_id.replaceAll("column-base-curing", "pedestal-curing"),
    title_ru: pedestalText(resource.title_ru),
  })),
);

export const PEDESTAL_CURING_NORMATIVE_PARAMETER_IDS =
  COLUMN_BASE_CURING_NORMATIVE_PARAMETER_IDS;
export const PEDESTAL_CURING_SOURCE_ID = COLUMN_BASE_CURING_SOURCE_ID;
export const PEDESTAL_CURING_NORM_ID = COLUMN_BASE_CURING_NORM_ID;
export const PEDESTAL_CURING_SOURCE_METADATA = Object.freeze({
  ...COLUMN_BASE_CURING_SOURCE_METADATA,
  operation_class: "EXTERNAL_CURING_OF_PEDESTAL_CONCRETE",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function pedestalCuringAcceptanceInputR1(
  contextKey: PedestalCuringContextKey,
): Readonly<Record<string, ConcreteSlabCuringInputValueR1>> {
  const target = PEDESTAL_CURING_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`PEDESTAL_CURING_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...columnBaseCuringAcceptanceInputR1(contextKey as ColumnBaseCuringContextKey),
    concrete_mix_reference: `PEDESTAL-CURE-${reference}-MIX-REV-A`,
    curing_location: `Бетонный пьедестал; ${target.contextRu}; захватка PEDESTAL-CURE-${reference}`,
    curing_method_statement_reference: `MS-PEDESTAL-CURE-${reference}-REV-A`,
    quality_plan_reference: `QP-PEDESTAL-CURE-${reference}-REV-A`,
  });
}

export async function compilePedestalCuringR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PEDESTAL_CURING_TARGETS[0].catalogId;
  if (!PEDESTAL_CURING_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`PEDESTAL_CURING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pedestal-curing-r1",
    catalogId,
    primaryMeasureParameterId: "cured_concrete_volume_m3",
    parameterDefinitions: [...PEDESTAL_CURING_PARAMETERS],
    formulaDefinitions: [...PEDESTAL_CURING_FORMULAS],
    resourceDefinitions: [...PEDESTAL_CURING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}
