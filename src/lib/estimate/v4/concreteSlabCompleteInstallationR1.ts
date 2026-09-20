import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import { NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA } from "./domainFactory";
import {
  CONCRETE_SLAB_CONCRETE_PLACEMENT_FORMULAS,
  CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS,
  CONCRETE_SLAB_CONCRETE_PLACEMENT_RESOURCES,
  concreteSlabConcretePlacementAcceptanceInputR1,
  type ConcreteSlabConcretePlacementContextKey,
} from "./concreteSlabConcretePlacementR1";
import {
  CONCRETE_SLAB_REINFORCEMENT_PARAMETERS,
  CONCRETE_SLAB_REINFORCEMENT_RESOURCES,
  concreteSlabReinforcementAcceptanceInputR1,
  type ConcreteSlabReinforcementContextKey,
} from "./concreteSlabReinforcementR1";
import {
  STRIP_FOUNDATION_REINFORCEMENT_FORMULAS,
} from "./stripFoundationReinforcementR1";
import {
  FORMWORK_DOKAFLEX_FORMULAS,
  FORMWORK_DOKAFLEX_PARAMETERS,
  FORMWORK_DOKAFLEX_RESOURCES,
  formworkDokaflexConcreteSlabAcceptanceInputR1,
  type FormworkDokaflexConcreteSlabContextKey,
} from "./formworkDokaflexConcreteSlabR1";
import {
  CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS,
  CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES,
  concreteSlabEmbeddedItemsAcceptanceInputR1,
  type ConcreteSlabEmbeddedItemsContextKey,
} from "./concreteSlabEmbeddedItemsR1";

type Json = Record<string, unknown>;
type InputValue = string | number | boolean;
type PublishedCanonicalEstimateParameterDefinition =
  CanonicalEstimateParameterDefinition & Readonly<{
    ordinal: number;
    unit_id: string | null;
    title_ru: string;
  }>;

export const CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_form_standard", titleRu: "Устройство бетонной плиты в стандартной зоне" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_form_high_load", titleRu: "Устройство бетонной плиты для высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_form_large_area", titleRu: "Устройство бетонной плиты на большой площади" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_form_repair", titleRu: "Устройство бетонной плиты с локальным ремонтом основания" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_form_small_area", titleRu: "Устройство бетонной плиты на малой площади" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_form_technical_room", titleRu: "Устройство бетонной плиты в техническом помещении" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_concrete_slab_form_wet_zone", titleRu: "Устройство бетонной плиты во влажной зоне" },
] as const);

export type ConcreteSlabCompleteInstallationContextKey =
  (typeof CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS)[number]["contextKey"];

export const CONCRETE_SLAB_COMPLETE_INSTALLATION_NORM_ID =
  "concrete_slab_complete_installation_project_composition_v1" as const;
export const CONCRETE_SLAB_COMPLETE_INSTALLATION_PRIMARY_SOURCE_ID =
  "src_professional_norm_pack_concrete_nrmca_cip31_selected_contingency_m3_m3_v1" as const;

export const CONCRETE_SLAB_COMPLETE_INSTALLATION_SOURCE_METADATA = Object.freeze({
  source_id: CONCRETE_SLAB_COMPLETE_INSTALLATION_PRIMARY_SOURCE_ID,
  source_document_version: "NRMCA CIP 31 + accepted component source set",
  source_title: "Полная бетонная плита: композиция принятых технологических компонентов",
  source_url: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_url,
  exact_locator:
    "Concrete volume and selected contingency use the accepted NRMCA CIP 31 route; reinforcement, formwork and embedments retain their own accepted source metadata and direct project schedules.",
  composition_identity_hash: estimateDeterministicHash({
    normId: CONCRETE_SLAB_COMPLETE_INSTALLATION_NORM_ID,
    componentContracts: [
      "concrete-slab-concrete-placement-r1",
      "concrete-slab-reinforcement-r1",
      "formwork-dokaflex-concrete-slab-r1",
      "concrete-slab-embedded-items-r1",
    ],
  }),
  definition_hash: "4a3ddb5690c0a535c8dc4afd1db813f19ad2703baefada00942b77754bdb0a79",
  universal_productivity_claimed: false,
  universal_consumption_claimed: false,
  quantity_basis: "GEOMETRY_AND_DIRECT_APPROVED_PROJECT_SCHEDULES",
});

const literalTrue: Json = Object.freeze({ kind: "literal", value: true });
const selected = (parameterId: string): Json => ({ kind: "parameter", id: parameterId });
const equals = (parameterId: string, value: unknown): Json => ({
  kind: "equals",
  parameterId,
  value,
});

function deepRename(value: unknown, ids: Readonly<Record<string, string>>): unknown {
  if (typeof value === "string") return ids[value] ?? value;
  if (Array.isArray(value)) return value.map((entry) => deepRename(entry, ids));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .map(([key, child]) => [key, deepRename(child, ids)]));
  }
  return value;
}

function withoutRequiredWhen(constraints: unknown): Json | null {
  if (!constraints || typeof constraints !== "object" || Array.isArray(constraints)) {
    return constraints as Json | null;
  }
  const copy = { ...(constraints as Json) };
  delete copy.requiredWhen;
  return copy;
}

function stageParameterMap(
  parameters: readonly CanonicalEstimateParameterDefinition[],
  prefix: string,
  shared: Readonly<Record<string, string>> = {},
): Readonly<Record<string, string>> {
  return Object.fromEntries(parameters.map((parameter) => [
    parameter.parameter_id,
    shared[parameter.parameter_id] ?? `${prefix}_${parameter.parameter_id}`,
  ]));
}

function projectStageParameters(
  parameters: readonly CanonicalEstimateParameterDefinition[],
  ids: Readonly<Record<string, string>>,
): PublishedCanonicalEstimateParameterDefinition[] {
  return parameters.map((parameter) => {
    const renamed = deepRename(parameter, ids) as CanonicalEstimateParameterDefinition
      & Partial<PublishedCanonicalEstimateParameterDefinition>;
    return {
      ...renamed,
      parameter_id: ids[parameter.parameter_id]!,
      ordinal: Number(renamed.ordinal ?? 0),
      unit_id: typeof renamed.unit_id === "string" ? renamed.unit_id : null,
      title_ru: typeof renamed.title_ru === "string"
        ? renamed.title_ru
        : ids[parameter.parameter_id]!,
      // A complete-work draft remains compilable when the user has not yet
      // received a project schedule. Missing formula inputs become explicit
      // preliminary needs in the shared core; they are never guessed.
      required: false,
      default_value: null,
      constraints_json: withoutRequiredWhen(deepRename(parameter.constraints_json, ids)),
    };
  });
}

function projectStageFormulas(
  formulas: readonly CanonicalEstimateFormulaDefinition[],
  ids: Readonly<Record<string, string>>,
): CanonicalEstimateFormulaDefinition[] {
  return formulas.map((formula) => {
    const renamed = deepRename(formula, ids) as CanonicalEstimateFormulaDefinition;
    return {
      ...renamed,
      ast_sha256: estimateDeterministicHash(renamed.ast),
    };
  });
}

function projectStageResources(
  resources: readonly CanonicalEstimateResourceDefinition[],
  ids: Readonly<Record<string, string>>,
  stageCondition: Json,
): CanonicalEstimateResourceDefinition[] {
  return resources.map((resource) => {
    const renamed = deepRename(resource, ids) as CanonicalEstimateResourceDefinition;
    const physicalBinding = renamed.resource_graph.professionalPhysicalNormBindingV1;
    if (physicalBinding && typeof physicalBinding === "object" && !Array.isArray(physicalBinding)) {
      const binding = physicalBinding as Json;
      const existingProjection = binding.parameter_projection_v1;
      const projection = existingProjection && typeof existingProjection === "object"
        && !Array.isArray(existingProjection)
        ? existingProjection as Json
        : {};
      const existingAliases = projection.aliases;
      binding.parameter_projection_v1 = {
        ...projection,
        aliases: {
          ...(existingAliases && typeof existingAliases === "object"
            && !Array.isArray(existingAliases) ? existingAliases as Json : {}),
          ...ids,
        },
      };
    }
    const inclusion = renamed.inclusion_ast ?? literalTrue;
    const projected = {
      ...renamed,
      inclusion_ast: {
        kind: "and",
        operands: [stageCondition, inclusion],
      },
    };
    const { row_sha256: _previousHash, ...hashInput } = projected;
    return {
      ...projected,
      row_sha256: estimateDeterministicHash(hashInput),
    };
  });
}

const PLACEMENT_PARAMETER_IDS = stageParameterMap(
  CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS,
  "placement",
  { plan_dimension_concrete_volume_m3: "slab_concrete_volume_m3" },
);
const REINFORCEMENT_PARAMETER_IDS = stageParameterMap(
  CONCRETE_SLAB_REINFORCEMENT_PARAMETERS,
  "reinforcement",
);
const FORMWORK_PARAMETER_IDS = stageParameterMap(
  FORMWORK_DOKAFLEX_PARAMETERS,
  "formwork",
  { slab_support_condition: "slab_support_condition" },
);
const EMBEDDED_PARAMETER_IDS = stageParameterMap(
  CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS,
  "embedded",
);

const selectorParameter = (
  parameterId: string,
  titleRu: string,
  valueType: "boolean" | "enum",
  constraints: Json,
): PublishedCanonicalEstimateParameterDefinition => ({
  parameter_id: parameterId,
  ordinal: 0,
  value_type: valueType,
  unit_id: null,
  title_ru: titleRu,
  required: true,
  default_value: null,
  constraints_json: constraints,
  truth_metadata: {
    contract: "rik-expo-app.concrete-slab-complete-installation-r1",
    semantic_parameter_key: `concrete-slab-complete:${parameterId}`,
    visibility_role: "USER_INPUT",
    value_source_role: "PROJECT_DOCUMENTATION",
    input_origin_class: "USER_CONFIRMED_SCOPE_SELECTION",
    preliminary_compilation_allowed: false,
    source_confirmation_required: true,
    guide: {
      guide_kind: "PROJECT_DEFINED",
      guide_short_ru: `${titleRu}. Выберите только подтверждённый проектом вариант.`,
      source_role: "APPROVED_PROJECT_DOCUMENTATION",
      source_document: CONCRETE_SLAB_COMPLETE_INSTALLATION_NORM_ID,
      guide_version: "concrete-slab-complete-installation-r1",
      source_snapshot_hash: CONCRETE_SLAB_COMPLETE_INSTALLATION_SOURCE_METADATA.definition_hash,
      applicability:
        "Только подтверждённая проектом применимость компонента; неизвестное значение не подменяется предположением.",
      verified_at: "2026-09-18T00:00:00+06:00",
    },
  },
});

const projectedPlacementParameters = projectStageParameters(
  CONCRETE_SLAB_CONCRETE_PLACEMENT_PARAMETERS,
  PLACEMENT_PARAMETER_IDS,
).map((parameter) => parameter.parameter_id === "slab_concrete_volume_m3"
  ? {
      ...parameter,
      required: true,
      constraints_json: { min: 0.001 },
      truth_metadata: {
        ...(parameter.truth_metadata ?? {}),
        guide: {
          guide_kind: "MEASUREMENT_RULE",
          guide_short_ru: "Укажите подтверждённый объём плиты в м³. Если объём ещё неизвестен, сначала внесите размеры в проектный расчёт объёма.",
          source_role: "USER_MEASURED_OR_APPROVED_PROJECT_GEOMETRY",
          source_document: CONCRETE_SLAB_COMPLETE_INSTALLATION_NORM_ID,
          guide_version: "concrete-slab-complete-installation-r1",
          source_snapshot_hash: CONCRETE_SLAB_COMPLETE_INSTALLATION_SOURCE_METADATA.definition_hash,
          applicability:
            "Подтверждённый объём монолитной бетонной плиты по геометрии или утверждённой проектной ведомости.",
          verified_at: "2026-09-18T00:00:00+06:00",
        },
      },
    }
  : parameter);

export const CONCRETE_SLAB_COMPLETE_INSTALLATION_PARAMETERS:
readonly PublishedCanonicalEstimateParameterDefinition[] = Object.freeze([
  selectorParameter(
    "slab_support_condition",
    "Конструктивный тип плиты",
    "enum",
    { values: ["SLAB_ON_GRADE", "SUSPENDED_ELEVATED_FLOOR_SLAB"] },
  ),
  selectorParameter(
    "reinforcement_applicable",
    "Армирование предусмотрено проектом",
    "boolean",
    {},
  ),
  selectorParameter(
    "embedded_items_applicable",
    "В плите предусмотрены закладные изделия",
    "boolean",
    {},
  ),
  ...projectedPlacementParameters,
  ...projectStageParameters(
    CONCRETE_SLAB_REINFORCEMENT_PARAMETERS,
    REINFORCEMENT_PARAMETER_IDS,
  ),
  ...projectStageParameters(FORMWORK_DOKAFLEX_PARAMETERS, FORMWORK_PARAMETER_IDS)
    .filter((parameter) => parameter.parameter_id !== "slab_support_condition"),
  ...projectStageParameters(
    CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS,
    EMBEDDED_PARAMETER_IDS,
  ),
].map((parameter, ordinal) => ({ ...parameter, ordinal })));

export const CONCRETE_SLAB_COMPLETE_INSTALLATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  ...projectStageFormulas(
    CONCRETE_SLAB_CONCRETE_PLACEMENT_FORMULAS,
    PLACEMENT_PARAMETER_IDS,
  ),
  ...projectStageFormulas(
    STRIP_FOUNDATION_REINFORCEMENT_FORMULAS,
    REINFORCEMENT_PARAMETER_IDS,
  ),
  ...projectStageFormulas(FORMWORK_DOKAFLEX_FORMULAS, FORMWORK_PARAMETER_IDS),
  ...projectStageFormulas(
    CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS,
    EMBEDDED_PARAMETER_IDS,
  ),
]);

const stageResources = [
  ...projectStageResources(
    CONCRETE_SLAB_CONCRETE_PLACEMENT_RESOURCES,
    PLACEMENT_PARAMETER_IDS,
    literalTrue,
  ),
  ...projectStageResources(
    CONCRETE_SLAB_REINFORCEMENT_RESOURCES,
    REINFORCEMENT_PARAMETER_IDS,
    selected("reinforcement_applicable"),
  ),
  ...projectStageResources(
    FORMWORK_DOKAFLEX_RESOURCES,
    FORMWORK_PARAMETER_IDS,
    equals("slab_support_condition", "SUSPENDED_ELEVATED_FLOOR_SLAB"),
  ),
  ...projectStageResources(
    CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES,
    EMBEDDED_PARAMETER_IDS,
    selected("embedded_items_applicable"),
  ),
];

export const CONCRETE_SLAB_COMPLETE_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  stageResources.map((resource, ordinal) => {
    const projected = { ...resource, ordinal };
    const { row_sha256: _previousHash, ...hashInput } = projected;
    return { ...projected, row_sha256: estimateDeterministicHash(hashInput) };
  }),
);

export const CONCRETE_SLAB_COMPLETE_INSTALLATION_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "slab_concrete_volume_m3",
] as const);

function mapInput(
  input: Readonly<Record<string, InputValue>>,
  ids: Readonly<Record<string, string>>,
): Record<string, InputValue> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [ids[key] ?? key, value]));
}

export function concreteSlabCompleteInstallationAcceptanceInputR1(
  contextKey: ConcreteSlabCompleteInstallationContextKey,
): Readonly<Record<string, InputValue>> {
  const target = CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`CONCRETE_SLAB_COMPLETE_CONTEXT_UNSUPPORTED:${contextKey}`);
  const placement = concreteSlabConcretePlacementAcceptanceInputR1(
    contextKey as ConcreteSlabConcretePlacementContextKey,
  );
  const reinforcement = concreteSlabReinforcementAcceptanceInputR1(
    contextKey as ConcreteSlabReinforcementContextKey,
  );
  const formwork = formworkDokaflexConcreteSlabAcceptanceInputR1(
    contextKey as FormworkDokaflexConcreteSlabContextKey,
  );
  const embeddedApplicable = contextKey !== "repair";
  const embedded = embeddedApplicable
    ? concreteSlabEmbeddedItemsAcceptanceInputR1(
        contextKey as ConcreteSlabEmbeddedItemsContextKey,
      )
    : {};
  return Object.freeze({
    slab_support_condition: "SUSPENDED_ELEVATED_FLOOR_SLAB",
    reinforcement_applicable: true,
    embedded_items_applicable: embeddedApplicable,
    ...mapInput(placement, PLACEMENT_PARAMETER_IDS),
    ...mapInput(reinforcement, REINFORCEMENT_PARAMETER_IDS),
    ...mapInput(formwork, FORMWORK_PARAMETER_IDS),
    ...mapInput(embedded, EMBEDDED_PARAMETER_IDS),
  });
}

function assertDefinitionShape(): void {
  const assertUnique = (values: readonly string[], code: string): void => {
    if (new Set(values).size !== values.length) throw new Error(code);
  };
  assertUnique(
    CONCRETE_SLAB_COMPLETE_INSTALLATION_PARAMETERS.map((parameter) => parameter.parameter_id),
    "CONCRETE_SLAB_COMPLETE_PARAMETER_DUPLICATE",
  );
  assertUnique(
    CONCRETE_SLAB_COMPLETE_INSTALLATION_FORMULAS.map((formula) => formula.formula_id),
    "CONCRETE_SLAB_COMPLETE_FORMULA_DUPLICATE",
  );
  assertUnique(
    CONCRETE_SLAB_COMPLETE_INSTALLATION_RESOURCES.map((resource) => resource.id),
    "CONCRETE_SLAB_COMPLETE_RESOURCE_DUPLICATE",
  );
  assertUnique(
    CONCRETE_SLAB_COMPLETE_INSTALLATION_RESOURCES.map((resource) => resource.row_id),
    "CONCRETE_SLAB_COMPLETE_ROW_DUPLICATE",
  );
}

assertDefinitionShape();

export async function compileConcreteSlabCompleteInstallationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS[0].catalogId;
  if (!CONCRETE_SLAB_COMPLETE_INSTALLATION_TARGETS.some(
    (target) => target.catalogId === catalogId,
  )) {
    throw new Error(`CONCRETE_SLAB_COMPLETE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.concrete-slab-complete-installation-r1",
    catalogId,
    primaryMeasureParameterId: "slab_concrete_volume_m3",
    parameterDefinitions: [...CONCRETE_SLAB_COMPLETE_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...CONCRETE_SLAB_COMPLETE_INSTALLATION_FORMULAS],
    resourceDefinitions: [...CONCRETE_SLAB_COMPLETE_INSTALLATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 96,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
