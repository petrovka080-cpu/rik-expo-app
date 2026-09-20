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

export const ANCHOR_GROUP_LEVELING_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_level_standard", titleRu: "Выравнивание бетона основания анкерной группы в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_level_high_load", titleRu: "Выравнивание бетона основания анкерной группы в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_level_large_area", titleRu: "Выравнивание бетона оснований анкерных групп на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_level_repair", titleRu: "Выравнивание бетона основания анкерной группы на ремонтном участке", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_level_small_area", titleRu: "Выравнивание бетона основания анкерной группы на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_level_technical_room", titleRu: "Выравнивание бетона основания анкерной группы в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_level_wet_zone", titleRu: "Выравнивание бетона основания анкерной группы во влажной зоне", contextRu: "влажная зона" },
] as const);

export type AnchorGroupLevelingContextKey =
  (typeof ANCHOR_GROUP_LEVELING_TARGETS)[number]["contextKey"];

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

function anchorGroupText(value: string): string {
  return value
    .replaceAll("свежеуложенной бетонной плиты", "свежеуложенного бетона основания анкерной группы")
    .replaceAll("бетонной плиты", "бетона основания анкерной группы")
    .replaceAll("бетонной плитой", "бетоном основания анкерной группы")
    .replaceAll("бетонной плите", "бетоне основания анкерной группы")
    .replaceAll("concrete-slab-leveling", "anchor-group-leveling")
    .replaceAll("project_concrete_slab_leveling_schedule", "project_anchor_group_leveling_schedule")
    .replaceAll("slab-leveling", "anchor-group-leveling");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return anchorGroupText(value) as T;
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
    title_ru: anchorGroupText(parameter.title_ru),
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

export const ANCHOR_GROUP_LEVELING_PARAMETERS = Object.freeze(
  CONCRETE_SLAB_LEVELING_PARAMETERS.map(adaptParameter),
);

export const ANCHOR_GROUP_LEVELING_FORMULAS = CONCRETE_SLAB_LEVELING_FORMULAS;

export const ANCHOR_GROUP_LEVELING_RESOURCES = Object.freeze(
  CONCRETE_SLAB_LEVELING_RESOURCES.map((resource) => {
    const adapted = adaptJson(resource);
    return {
      ...adapted,
      row_id: resource.row_id
        .replace("work:concrete:slab-leveling", "work:concrete:anchor-group-leveling")
        .replace("equipment:concrete:slab-leveling", "equipment:concrete:anchor-group-leveling")
        .replace("service:concrete:slab-leveling", "service:concrete:anchor-group-leveling")
        .replace("delivery:concrete:slab-leveling", "delivery:concrete:anchor-group-leveling"),
      title_ru: anchorGroupText(resource.title_ru),
    };
  }),
);

export const ANCHOR_GROUP_LEVELING_NORMATIVE_PARAMETER_IDS =
  CONCRETE_SLAB_LEVELING_NORMATIVE_PARAMETER_IDS;
export const ANCHOR_GROUP_LEVELING_SOURCE_ID = CONCRETE_SLAB_LEVELING_SOURCE_ID;
export const ANCHOR_GROUP_LEVELING_NORM_ID = CONCRETE_SLAB_LEVELING_NORM_ID;
export const ANCHOR_GROUP_LEVELING_SOURCE_METADATA = Object.freeze({
  ...CONCRETE_SLAB_LEVELING_SOURCE_METADATA,
  operation_class: "LEVEL_AND_STRIKE_OFF_FRESH_ANCHOR_GROUP_CONCRETE",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function anchorGroupLevelingAcceptanceInputR1(
  contextKey: AnchorGroupLevelingContextKey,
): Readonly<Record<string, ConcreteSlabLevelingInputValueR1>> {
  const target = ANCHOR_GROUP_LEVELING_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`ANCHOR_GROUP_LEVELING_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...concreteSlabLevelingAcceptanceInputR1(contextKey as ConcreteSlabLevelingContextKey),
    concrete_mix_reference: `AG-LEVEL-${reference}-MIX-REV-A`,
    leveling_location: `Основание анкерной группы; ${target.contextRu}; захватка AG-LEVEL-${reference}`,
    target_elevation_and_slope_reference: `ELEV-SLOPE-AG-LEVEL-${reference}-REV-A`,
    flatness_levelness_requirement_reference: `FL-AG-LEVEL-${reference}-REV-A`,
    leveling_method_statement_reference: `MS-AG-LEVEL-${reference}-REV-A`,
    quality_plan_reference: `QP-AG-LEVEL-${reference}-REV-A`,
  });
}

export async function compileAnchorGroupLevelingR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ANCHOR_GROUP_LEVELING_TARGETS[0].catalogId;
  if (!ANCHOR_GROUP_LEVELING_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`ANCHOR_GROUP_LEVELING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.anchor-group-leveling-r1",
    catalogId,
    primaryMeasureParameterId: "leveled_concrete_volume_m3",
    parameterDefinitions: [...ANCHOR_GROUP_LEVELING_PARAMETERS],
    formulaDefinitions: [...ANCHOR_GROUP_LEVELING_FORMULAS],
    resourceDefinitions: [...ANCHOR_GROUP_LEVELING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value),
  });
}
