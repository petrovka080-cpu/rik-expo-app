import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreResult } from "../backendPlatform/canonicalEstimateCompileCore";
import {
  CONCRETE_SLAB_VIBRATION_FORMULAS,
  CONCRETE_SLAB_VIBRATION_NORMATIVE_PARAMETER_IDS,
  CONCRETE_SLAB_VIBRATION_NORM_ID,
  CONCRETE_SLAB_VIBRATION_PARAMETERS,
  CONCRETE_SLAB_VIBRATION_RESOURCES,
  CONCRETE_SLAB_VIBRATION_SOURCE_ID,
  CONCRETE_SLAB_VIBRATION_SOURCE_METADATA,
  concreteSlabVibrationAcceptanceInputR1,
  type ConcreteSlabVibrationContextKey,
  type ConcreteSlabVibrationInputValueR1,
} from "./concreteSlabVibrationR1";

type Json = Record<string, unknown>;

export const BELT_VIBRATION_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_belt_vibrate_standard", titleRu: "Виброуплотнение бетона монолитного пояса в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_belt_vibrate_high_load", titleRu: "Виброуплотнение бетона монолитного пояса в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_vibrate_large_area", titleRu: "Виброуплотнение бетона монолитного пояса на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_belt_vibrate_repair", titleRu: "Виброуплотнение бетона монолитного пояса на ремонтном участке", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_belt_vibrate_small_area", titleRu: "Виброуплотнение бетона монолитного пояса на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_belt_vibrate_technical_room", titleRu: "Виброуплотнение бетона монолитного пояса в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_belt_vibrate_wet_zone", titleRu: "Виброуплотнение бетона монолитного пояса во влажной зоне", contextRu: "влажная зона" },
] as const);

export type BeltVibrationContextKey = (typeof BELT_VIBRATION_TARGETS)[number]["contextKey"];

const OPTIONAL_DOCUMENTARY_PARAMETER_IDS = new Set([
  "concrete_mix_reference", "placement_location", "method_statement_reference",
  "equipment_schedule_reference", "quality_plan_reference", "mobilization_scope_reference",
]);

function beltText(value: string): string {
  return value
    .replaceAll("свежеуложенной бетонной смеси плиты", "свежеуложенного бетона монолитного пояса")
    .replaceAll("бетонной плиты", "бетона монолитного пояса")
    .replaceAll("плиты", "монолитного пояса")
    .replaceAll("concrete-slab-vibration", "belt-vibration")
    .replaceAll("project_concrete_slab_vibration_schedule", "project_belt_vibration_schedule")
    .replaceAll("slab-vibration", "belt-vibration");
}

function adaptJson<T>(value: T): T {
  if (typeof value === "string") return beltText(value) as T;
  if (Array.isArray(value)) return value.map(adaptJson) as T;
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value as Json).map(([key, item]) => [key, adaptJson(item)]),
  ) as T;
  return value;
}

export const BELT_VIBRATION_PARAMETERS = Object.freeze(
  CONCRETE_SLAB_VIBRATION_PARAMETERS.map((parameter) => {
    const documentary = OPTIONAL_DOCUMENTARY_PARAMETER_IDS.has(parameter.parameter_id);
    const truthMetadata = adaptJson(parameter.truth_metadata);
    return {
      ...parameter,
      title_ru: beltText(parameter.title_ru),
      required: documentary ? false : parameter.required,
      constraints_json: adaptJson(parameter.constraints_json ?? {}),
      truth_metadata: documentary ? {
        ...truthMetadata,
        preliminary_compilation_allowed: true,
        source_confirmation_required: false,
      } : truthMetadata,
    };
  }),
);

export const BELT_VIBRATION_FORMULAS = CONCRETE_SLAB_VIBRATION_FORMULAS;
export const BELT_VIBRATION_RESOURCES = Object.freeze(
  CONCRETE_SLAB_VIBRATION_RESOURCES.map((resource) => {
    const adapted = adaptJson(resource);
    return {
      ...adapted,
      row_id: resource.row_id
        .replace("work:concrete:slab-vibration", "work:concrete:belt-vibration")
        .replace("service:concrete:slab-vibration", "service:concrete:belt-vibration"),
      title_ru: beltText(resource.title_ru),
    };
  }),
);
export const BELT_VIBRATION_NORMATIVE_PARAMETER_IDS = CONCRETE_SLAB_VIBRATION_NORMATIVE_PARAMETER_IDS;
export const BELT_VIBRATION_SOURCE_ID = CONCRETE_SLAB_VIBRATION_SOURCE_ID;
export const BELT_VIBRATION_NORM_ID = CONCRETE_SLAB_VIBRATION_NORM_ID;
export const BELT_VIBRATION_SOURCE_METADATA = Object.freeze({
  ...CONCRETE_SLAB_VIBRATION_SOURCE_METADATA,
  operation_class: "INTERNAL_VIBRATION_OF_FRESH_MONOLITHIC_BELT_CONCRETE",
  documentary_references_optional: true,
  calculation_inputs_never_invented: true,
});

export function beltVibrationAcceptanceInputR1(contextKey: BeltVibrationContextKey):
Readonly<Record<string, ConcreteSlabVibrationInputValueR1>> {
  const target = BELT_VIBRATION_TARGETS.find((candidate) => candidate.contextKey === contextKey);
  if (!target) throw new Error(`BELT_VIBRATION_CONTEXT_UNSUPPORTED:${contextKey}`);
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...concreteSlabVibrationAcceptanceInputR1(contextKey as ConcreteSlabVibrationContextKey),
    concrete_mix_reference: `BELT-VIB-${reference}-MIX-REV-A`,
    placement_location: `Монолитный пояс; ${target.contextRu}; захватка BELT-VIB-${reference}`,
    method_statement_reference: `MS-BELT-VIB-${reference}-REV-A`,
    equipment_schedule_reference: `EQ-BELT-VIB-${reference}-REV-A`,
    quality_plan_reference: `QP-BELT-VIB-${reference}-REV-A`,
    mobilization_scope_reference: `LOG-BELT-VIB-${reference}-RETURN-INCLUDED`,
  });
}

export async function compileBeltVibrationR1(submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {}): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? BELT_VIBRATION_TARGETS[0].catalogId;
  if (!BELT_VIBRATION_TARGETS.some((target) => target.catalogId === catalogId)) throw new Error(`BELT_VIBRATION_CATALOG_UNSUPPORTED:${catalogId}`);
  return compileCanonicalEstimateCore({
    operation: "compile", compilerVersion: "canonical-estimate-compiler.belt-vibration-r1",
    catalogId, primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    parameterDefinitions: [...BELT_VIBRATION_PARAMETERS], formulaDefinitions: [...BELT_VIBRATION_FORMULAS],
    resourceDefinitions: [...BELT_VIBRATION_RESOURCES], submittedParameters, confirmedParameters: {},
    currencyCode: "KGS", priceItems: [], maximumResourceRows: 8,
    hashJson: async (value) => JSON.stringify(value),
  });
}
