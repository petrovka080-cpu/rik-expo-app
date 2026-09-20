import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  CONCRETE_SLAB_CURING_FORMULAS,
  CONCRETE_SLAB_CURING_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_CURING_NORM_ID,
  CONCRETE_SLAB_CURING_PARAMETERS,
  CONCRETE_SLAB_CURING_RESOURCES,
  CONCRETE_SLAB_CURING_SOURCE_ID,
  CONCRETE_SLAB_CURING_SOURCE_METADATA,
  concreteSlabCuringAcceptanceInputR1,
  type ConcreteSlabCuringContextKey,
  type ConcreteSlabCuringInputValueR1,
  type ConcreteSlabCuringParameterR1,
} from "./concreteSlabCuringR1";

type Json = Record<string, unknown>;

export const ANCHOR_GROUP_CURING_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_cure_standard", titleRu: "Уход за бетоном основания анкерной группы в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_cure_high_load", titleRu: "Уход за бетоном основания анкерной группы в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_cure_large_area", titleRu: "Уход за бетоном оснований анкерных групп на большом участке", contextRu: "большой участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_cure_small_area", titleRu: "Уход за бетоном основания анкерной группы на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_cure_technical_room", titleRu: "Уход за бетоном основания анкерной группы в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_cure_wet_zone", titleRu: "Уход за бетоном основания анкерной группы во влажной зоне", contextRu: "влажная зона" },
] as const);

export type AnchorGroupCuringContextKey =
  (typeof ANCHOR_GROUP_CURING_TARGETS)[number]["contextKey"];

const OPTIONAL_DOCUMENTARY_PARAMETER_IDS = new Set<string>([
  "concrete_mix_reference",
  "curing_location",
  "curing_method_statement_reference",
  "curing_water_source_reference",
  "wet_covering_material_designation",
  "impervious_sheet_designation",
  "curing_compound_product_designation",
  "application_equipment_designation",
  "quality_plan_reference",
  "mobilization_scope_reference",
]);

function anchorGroupText(value: string): string {
  return value
    .replaceAll("бетонной плиты", "бетона основания анкерной группы")
    .replaceAll("бетонной плитой", "бетоном основания анкерной группы")
    .replaceAll("бетонной плите", "бетоне основания анкерной группы")
    .replaceAll("плиты", "основания анкерной группы")
    .replaceAll("concrete-slab-curing", "anchor-group-curing")
    .replaceAll("project_concrete_slab_curing_schedule", "project_anchor_group_curing_schedule")
    .replaceAll("slab-curing", "anchor-group-curing");
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
  parameter: ConcreteSlabCuringParameterR1,
): ConcreteSlabCuringParameterR1 {
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

export const ANCHOR_GROUP_CURING_PARAMETERS = Object.freeze(
  CONCRETE_SLAB_CURING_PARAMETERS.map(adaptParameter),
);

// The graph is deliberately shared with the accepted ACI 308 curing family:
// this family changes the catalog identity and human wording, not the arithmetic.
export const ANCHOR_GROUP_CURING_FORMULAS = CONCRETE_SLAB_CURING_FORMULAS;

export const ANCHOR_GROUP_CURING_RESOURCES = Object.freeze(
  CONCRETE_SLAB_CURING_RESOURCES.map((resource) => {
    const adapted = adaptJson(resource);
    return {
      ...adapted,
      row_id: resource.row_id
        .replace("work:concrete:slab-curing", "work:concrete:anchor-group-curing")
        .replace("service:concrete:slab-curing", "service:concrete:anchor-group-curing"),
      title_ru: anchorGroupText(resource.title_ru),
    };
  }),
);

export const ANCHOR_GROUP_CURING_NORMATIVE_PARAMETER_IDS =
  CONCRETE_SLAB_CURING_NORMATIVE_PARAMETER_IDS;

export const ANCHOR_GROUP_CURING_SOURCE_ID = CONCRETE_SLAB_CURING_SOURCE_ID;
export const ANCHOR_GROUP_CURING_NORM_ID = CONCRETE_SLAB_CURING_NORM_ID;
export const ANCHOR_GROUP_CURING_SOURCE_METADATA = Object.freeze({
  ...CONCRETE_SLAB_CURING_SOURCE_METADATA,
  norm_id: ANCHOR_GROUP_CURING_NORM_ID,
  operation_class: "EXTERNAL_CURING_OF_ANCHOR_GROUP_CAST_IN_PLACE_CONCRETE",
  quantity_basis: "APPROVED_PROJECT_CURING_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function anchorGroupCuringAcceptanceInputR1(
  contextKey: AnchorGroupCuringContextKey,
): Readonly<Record<string, ConcreteSlabCuringInputValueR1>> {
  const target = ANCHOR_GROUP_CURING_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`ANCHOR_GROUP_CURING_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...concreteSlabCuringAcceptanceInputR1(contextKey as ConcreteSlabCuringContextKey),
    concrete_mix_reference: `AG-CURE-${reference}-MIX-REV-A`,
    curing_location: `Основание анкерной группы; ${target.contextRu}; захватка AG-CURE-${reference}`,
    curing_method_statement_reference: `MS-AG-CURE-${reference}-REV-A`,
    quality_plan_reference: `QP-AG-CURE-${reference}-REV-A`,
  });
}

export async function compileAnchorGroupCuringR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ANCHOR_GROUP_CURING_TARGETS[0].catalogId;
  if (!ANCHOR_GROUP_CURING_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`ANCHOR_GROUP_CURING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.anchor-group-curing-r1",
    catalogId,
    primaryMeasureParameterId: "cured_concrete_volume_m3",
    parameterDefinitions: [...ANCHOR_GROUP_CURING_PARAMETERS],
    formulaDefinitions: [...ANCHOR_GROUP_CURING_FORMULAS],
    resourceDefinitions: [...ANCHOR_GROUP_CURING_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}
