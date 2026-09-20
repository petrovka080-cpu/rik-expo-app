import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  CONCRETE_SLAB_LEVELING_FORMULAS,
  CONCRETE_SLAB_LEVELING_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_LEVELING_NORM_ID,
  CONCRETE_SLAB_LEVELING_PARAMETERS,
  CONCRETE_SLAB_LEVELING_RESOURCES,
  CONCRETE_SLAB_LEVELING_SOURCE_ID,
  CONCRETE_SLAB_LEVELING_SOURCE_METADATA,
  concreteSlabLevelingAcceptanceInputR1,
  type ConcreteSlabLevelingContextKey,
  type ConcreteSlabLevelingInputValueR1,
  type ConcreteSlabLevelingParameterR1,
} from "./concreteSlabLevelingR1";

type Json = Record<string, unknown>;

export const BELT_LEVELING_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_belt_level_standard", titleRu: "Выравнивание бетона монолитного пояса в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_belt_level_high_load", titleRu: "Выравнивание бетона монолитного пояса в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_level_large_area", titleRu: "Выравнивание бетона монолитного пояса на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_belt_level_repair", titleRu: "Выравнивание бетона монолитного пояса на ремонтном участке", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_level_small_area", titleRu: "Выравнивание бетона монолитного пояса на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_belt_level_technical_room", titleRu: "Выравнивание бетона монолитного пояса в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_belt_level_wet_zone", titleRu: "Выравнивание бетона монолитного пояса во влажной зоне", contextRu: "влажная зона" },
] as const);

export type BeltLevelingContextKey =
  (typeof BELT_LEVELING_TARGETS)[number]["contextKey"];

const OPTIONAL_DOCUMENTARY_PARAMETER_IDS = new Set<string>([
  "concrete_mix_reference",
  "leveling_location",
  "target_elevation_and_slope_reference",
  "flatness_levelness_requirement_reference",
  "approved_leveling_method_designation",
  "leveling_method_statement_reference",
  "screed_guide_designation",
  "leveling_equipment_designation",
  "quality_plan_reference",
  "mobilization_scope_reference",
]);

function beltText(value: string): string {
  return value
    .replaceAll("свежеуложенной бетонной плиты", "свежеуложенного бетона монолитного пояса")
    .replaceAll("бетонной плиты", "бетона монолитного пояса")
    .replaceAll("бетонной плитой", "бетоном монолитного пояса")
    .replaceAll("бетонной плите", "бетоне монолитного пояса")
    .replaceAll("concrete-slab-leveling", "belt-leveling")
    .replaceAll("project_concrete_slab_leveling_schedule", "project_belt_leveling_schedule")
    .replaceAll("slab-leveling", "belt-leveling");
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

function withoutRequiredWhen(constraints: Json): Json {
  const { requiredWhen: _requiredWhen, ...rest } = constraints;
  return rest;
}

function adaptParameter(
  parameter: ConcreteSlabLevelingParameterR1,
): ConcreteSlabLevelingParameterR1 {
  const documentary = OPTIONAL_DOCUMENTARY_PARAMETER_IDS.has(parameter.parameter_id);
  const truthMetadata = adaptJson(parameter.truth_metadata);
  const { required_when: _requiredWhen, ...truthWithoutRequiredWhen } = truthMetadata;
  return {
    ...parameter,
    title_ru: beltText(parameter.title_ru),
    required: documentary ? false : parameter.required,
    constraints_json: documentary
      ? withoutRequiredWhen(adaptJson(parameter.constraints_json ?? {}))
      : adaptJson(parameter.constraints_json ?? {}),
    truth_metadata: documentary
      ? {
        ...truthWithoutRequiredWhen,
        preliminary_compilation_allowed: true,
        source_confirmation_required: false,
      }
      : truthMetadata,
  };
}

export const BELT_LEVELING_PARAMETERS = Object.freeze(
  CONCRETE_SLAB_LEVELING_PARAMETERS.map(adaptParameter),
);

export const BELT_LEVELING_FORMULAS = CONCRETE_SLAB_LEVELING_FORMULAS;

export const BELT_LEVELING_RESOURCES = Object.freeze(
  CONCRETE_SLAB_LEVELING_RESOURCES.map((resource) => {
    const adapted = adaptJson(resource);
    return {
      ...adapted,
      row_id: resource.row_id
        .replace("work:concrete:slab-leveling", "work:concrete:belt-leveling")
        .replace("equipment:concrete:slab-leveling", "equipment:concrete:belt-leveling")
        .replace("service:concrete:slab-leveling", "service:concrete:belt-leveling")
        .replace("delivery:concrete:slab-leveling", "delivery:concrete:belt-leveling"),
      title_ru: beltText(resource.title_ru),
    };
  }),
);

export const BELT_LEVELING_NORMATIVE_PARAMETER_IDS =
  CONCRETE_SLAB_LEVELING_NORMATIVE_PARAMETER_IDS;
export const BELT_LEVELING_SOURCE_ID = CONCRETE_SLAB_LEVELING_SOURCE_ID;
export const BELT_LEVELING_NORM_ID = CONCRETE_SLAB_LEVELING_NORM_ID;
export const BELT_LEVELING_SOURCE_METADATA = Object.freeze({
  ...CONCRETE_SLAB_LEVELING_SOURCE_METADATA,
  operation_class: "LEVEL_AND_STRIKE_OFF_FRESH_MONOLITHIC_BELT_CONCRETE",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function beltLevelingAcceptanceInputR1(
  contextKey: BeltLevelingContextKey,
): Readonly<Record<string, ConcreteSlabLevelingInputValueR1>> {
  const target = BELT_LEVELING_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`BELT_LEVELING_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...concreteSlabLevelingAcceptanceInputR1(contextKey as ConcreteSlabLevelingContextKey),
    concrete_mix_reference: `BELT-LEVEL-${reference}-MIX-REV-A`,
    leveling_location: `Монолитный пояс; ${target.contextRu}; захватка BELT-LEVEL-${reference}`,
    target_elevation_and_slope_reference: `ELEV-SLOPE-BELT-LEVEL-${reference}-REV-A`,
    flatness_levelness_requirement_reference: `FL-BELT-LEVEL-${reference}-REV-A`,
    leveling_method_statement_reference: `MS-BELT-LEVEL-${reference}-REV-A`,
    quality_plan_reference: `QP-BELT-LEVEL-${reference}-REV-A`,
  });
}

export async function compileBeltLevelingR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? BELT_LEVELING_TARGETS[0].catalogId;
  if (!BELT_LEVELING_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`BELT_LEVELING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.belt-leveling-r1",
    catalogId,
    primaryMeasureParameterId: "leveled_concrete_volume_m3",
    parameterDefinitions: [...BELT_LEVELING_PARAMETERS],
    formulaDefinitions: [...BELT_LEVELING_FORMULAS],
    resourceDefinitions: [...BELT_LEVELING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value),
  });
}
