import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
} from "../backendPlatform/canonicalEstimateCompileCore";
import {
  CONCRETE_SLAB_REPAIR_FORMULAS,
  CONCRETE_SLAB_REPAIR_GUIDE_SOURCE_ID,
  CONCRETE_SLAB_REPAIR_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_REPAIR_NORM_ID,
  CONCRETE_SLAB_REPAIR_PARAMETERS,
  CONCRETE_SLAB_REPAIR_RESOURCES,
  CONCRETE_SLAB_REPAIR_SOURCE_ID,
  CONCRETE_SLAB_REPAIR_SOURCE_METADATA,
  concreteSlabRepairAcceptanceInputR1,
  type ConcreteSlabRepairContextKey,
  type ConcreteSlabRepairInputValueR1,
  type ConcreteSlabRepairParameterR1,
} from "./concreteSlabRepairR1";

type Json = Record<string, unknown>;

export const BELT_REPAIR_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_belt_repair_standard", titleRu: "Ремонт бетона монолитного пояса в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_belt_repair_high_load", titleRu: "Ремонт бетона монолитного пояса в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_repair_large_area", titleRu: "Ремонт бетона монолитного пояса на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_belt_repair_repair", titleRu: "Ремонт бетона монолитного пояса на локальном ремонтном участке", contextRu: "локальный ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_repair_small_area", titleRu: "Ремонт бетона монолитного пояса на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_belt_repair_technical_room", titleRu: "Ремонт бетона монолитного пояса в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_belt_repair_wet_zone", titleRu: "Ремонт бетона монолитного пояса во влажной зоне", contextRu: "влажная зона" },
] as const);

export type BeltRepairContextKey =
  (typeof BELT_REPAIR_TARGETS)[number]["contextKey"];

function beltText(value: string): string {
  return value
    .replaceAll("бетонной плиты", "монолитного пояса")
    .replaceAll("бетонной плитой", "монолитным поясом")
    .replaceAll("бетонной плите", "монолитном поясе")
    .replaceAll("для любой плиты", "для любого монолитного пояса")
    .replaceAll("concrete-slab-repair", "belt-repair")
    .replaceAll("project_concrete_slab_repair_schedule", "project_belt_repair_schedule")
    .replaceAll("slab-repair", "belt-repair")
    .replaceAll("REPAIR_EXISTING_CONCRETE_SLAB", "REPAIR_EXISTING_MONOLITHIC_CONCRETE_BELT");
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
  parameter: ConcreteSlabRepairParameterR1,
): ConcreteSlabRepairParameterR1 {
  const documentary = parameter.value_type === "text";
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

export const BELT_REPAIR_PARAMETERS = Object.freeze(
  CONCRETE_SLAB_REPAIR_PARAMETERS.map(adaptParameter),
);

// ACI 562/546 method selection and the direct-quantity graph remain shared.
export const BELT_REPAIR_FORMULAS = CONCRETE_SLAB_REPAIR_FORMULAS;

export const BELT_REPAIR_RESOURCES = Object.freeze(
  CONCRETE_SLAB_REPAIR_RESOURCES.map((resource) => {
    const adapted = adaptJson(resource);
    return {
      ...adapted,
      row_id: resource.row_id.replaceAll("slab-repair", "belt-repair"),
      title_ru: beltText(resource.title_ru),
    };
  }),
);

export const BELT_REPAIR_NORMATIVE_PARAMETER_IDS =
  CONCRETE_SLAB_REPAIR_NORMATIVE_PARAMETER_IDS;
export const BELT_REPAIR_SOURCE_ID = CONCRETE_SLAB_REPAIR_SOURCE_ID;
export const BELT_REPAIR_GUIDE_SOURCE_ID = CONCRETE_SLAB_REPAIR_GUIDE_SOURCE_ID;
export const BELT_REPAIR_NORM_ID = CONCRETE_SLAB_REPAIR_NORM_ID;
export const BELT_REPAIR_SOURCE_METADATA = Object.freeze({
  ...CONCRETE_SLAB_REPAIR_SOURCE_METADATA,
  operation_class: "REPAIR_EXISTING_MONOLITHIC_CONCRETE_BELT",
  quantity_basis: "APPROVED_REPAIR_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function beltRepairAcceptanceInputR1(
  contextKey: BeltRepairContextKey,
): Readonly<Record<string, ConcreteSlabRepairInputValueR1>> {
  const target = BELT_REPAIR_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`BELT_REPAIR_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...concreteSlabRepairAcceptanceInputR1(contextKey as ConcreteSlabRepairContextKey),
    condition_assessment_reference: `ASSESS-BELT-REPAIR-${reference}-REV-A`,
    approved_repair_design_reference: `DESIGN-BELT-REPAIR-${reference}-REV-A`,
    approved_repair_method_designation: `METHOD-BELT-REPAIR-${reference}`,
    repair_method_statement_reference: `MS-BELT-REPAIR-${reference}-REV-A`,
    repair_material_designation: `MATERIAL-BELT-REPAIR-${reference}-REV-A`,
    quality_plan_reference: `QP-BELT-REPAIR-${reference}-REV-A`,
  });
}

export async function compileBeltRepairR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? BELT_REPAIR_TARGETS[0].catalogId;
  if (!BELT_REPAIR_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`BELT_REPAIR_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.belt-repair-r1",
    catalogId,
    primaryMeasureParameterId: "repair_scope_volume_m3",
    parameterDefinitions: [...BELT_REPAIR_PARAMETERS],
    formulaDefinitions: [...BELT_REPAIR_FORMULAS],
    resourceDefinitions: [...BELT_REPAIR_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}
