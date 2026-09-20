import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA,
} from "./domainFactory";
import {
  STAIRS_CONCRETE_PLACEMENT_FORMULAS,
  STAIRS_CONCRETE_PLACEMENT_PARAMETERS,
  STAIRS_CONCRETE_PLACEMENT_RESOURCES,
  stairsConcretePlacementAcceptanceInputR1,
  type StairsConcretePlacementContextKey,
} from "./stairsConcretePlacementR1";
import {
  STAIRS_REINFORCEMENT_PARAMETERS,
  STAIRS_REINFORCEMENT_RESOURCES,
  stairsReinforcementAcceptanceInputR1,
  type StairsReinforcementContextKey,
} from "./stairsReinforcementR1";
import { STRIP_FOUNDATION_REINFORCEMENT_FORMULAS } from "./stripFoundationReinforcementR1";
import {
  STAIRS_PROJECT_FORMWORK_FORMULAS,
  STAIRS_PROJECT_FORMWORK_PARAMETERS,
  STAIRS_PROJECT_FORMWORK_RESOURCES,
  stairsProjectFormworkAcceptanceInputR1,
  type StairsProjectFormworkContextKey,
} from "./stairsProjectFormworkR1";

type Json = Record<string, any>;
type InputValue = string | number | boolean;
type PublishedParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata?: Json;
};

export const STAIRS_COMPLETE_INSTALLATION_TARGETS = Object.freeze([
  { contextKey: "standard", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_form_standard", titleRu: "Полное устройство монолитной бетонной лестницы в стандартной зоне", contextRu: "стандартная зона" },
  { contextKey: "high_load", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_form_high_load", titleRu: "Полное устройство монолитной бетонной лестницы в зоне высокой нагрузки", contextRu: "зона высокой нагрузки" },
  { contextKey: "large_area", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_form_large_area", titleRu: "Полное устройство монолитной бетонной лестницы на большом участке", contextRu: "большой участок" },
  { contextKey: "repair", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_form_repair", titleRu: "Полное устройство монолитной бетонной лестницы на ремонтном участке", contextRu: "ремонтный участок" },
  { contextKey: "small_area", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_form_small_area", titleRu: "Полное устройство монолитной бетонной лестницы на малом участке", contextRu: "малый участок" },
  { contextKey: "technical_room", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_form_technical_room", titleRu: "Полное устройство монолитной бетонной лестницы в техническом помещении", contextRu: "техническое помещение" },
  { contextKey: "wet_zone", catalogId: "canonical-work:base:concrete_foundation_interior_stairs_concrete_form_wet_zone", titleRu: "Полное устройство монолитной бетонной лестницы во влажной зоне", contextRu: "влажная зона" },
] as const);

export type StairsCompleteInstallationContextKey =
  (typeof STAIRS_COMPLETE_INSTALLATION_TARGETS)[number]["contextKey"];

export const STAIRS_COMPLETE_INSTALLATION_NORM_ID =
  "stairs_complete_installation_project_composition_v1" as const;
export const STAIRS_COMPLETE_INSTALLATION_PRIMARY_SOURCE_ID =
  "src_professional_norm_pack_concrete_nrmca_cip31_selected_contingency_m3_m3_v1" as const;
export const STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA = Object.freeze({
  source_id: STAIRS_COMPLETE_INSTALLATION_PRIMARY_SOURCE_ID,
  source_document_version: "NRMCA CIP 31 + accepted reinforcement and RICS NRM 2 component sources",
  source_title: "Полная монолитная лестница: композиция принятых технологических компонентов",
  source_url: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_url,
  exact_locator:
    "Concrete volume and selected contingency use the accepted NRMCA CIP 31 route; reinforcement retains the approved bar-schedule route; stairs formwork uses RICS NRM 2 measured contact area plus direct project schedules without automatic system selection.",
  definition_hash: "61e89a3019dab6da69a3bafcc557ea78b6da10d38d0e8c781803cf98b28bb369",
  verified_at: "2026-09-18T00:00:00+06:00",
  universal_productivity_claimed: false,
  universal_consumption_claimed: false,
  quantity_basis: "GEOMETRY_AND_DIRECT_APPROVED_PROJECT_SCHEDULES",
});

const literalTrue: Json = Object.freeze({ kind: "literal", value: true });
const selected = (parameterId: string): Json => ({ kind: "parameter", id: parameterId });

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
): PublishedParameter[] {
  return parameters.map((parameter) => {
    const renamed = deepRename(parameter, ids) as CanonicalEstimateParameterDefinition
      & Partial<PublishedParameter>;
    return {
      ...renamed,
      parameter_id: ids[parameter.parameter_id]!,
      ordinal: Number(renamed.ordinal ?? 0),
      unit_id: typeof renamed.unit_id === "string" ? renamed.unit_id : null,
      title_ru: typeof renamed.title_ru === "string"
        ? renamed.title_ru
        : ids[parameter.parameter_id]!,
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
    return { ...renamed, ast_sha256: estimateDeterministicHash(renamed.ast) };
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
      const projection = binding.parameter_projection_v1
        && typeof binding.parameter_projection_v1 === "object"
        && !Array.isArray(binding.parameter_projection_v1)
        ? binding.parameter_projection_v1 as Json
        : {};
      binding.parameter_projection_v1 = {
        ...projection,
        aliases: {
          ...(projection.aliases && typeof projection.aliases === "object"
            && !Array.isArray(projection.aliases) ? projection.aliases as Json : {}),
          ...ids,
        },
      };
    }
    const projected = {
      ...renamed,
      inclusion_ast: {
        kind: "and",
        operands: [stageCondition, renamed.inclusion_ast ?? literalTrue],
      },
    };
    const { row_sha256: _previousHash, ...hashInput } = projected;
    return { ...projected, row_sha256: estimateDeterministicHash(hashInput) };
  });
}

const PLACEMENT_IDS = stageParameterMap(
  STAIRS_CONCRETE_PLACEMENT_PARAMETERS,
  "placement",
  { plan_dimension_concrete_volume_m3: "stairs_concrete_volume_m3" },
);
const REINFORCEMENT_IDS = stageParameterMap(
  STAIRS_REINFORCEMENT_PARAMETERS,
  "reinforcement",
);
const FORMWORK_IDS = stageParameterMap(
  STAIRS_PROJECT_FORMWORK_PARAMETERS,
  "formwork",
);

function selectorParameter(parameterId: string, titleRu: string): PublishedParameter {
  return {
    parameter_id: parameterId,
    ordinal: 0,
    value_type: "boolean",
    unit_id: null,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: {},
    truth_metadata: {
      contract: "rik-expo-app.stairs-complete-installation-r1",
      semantic_parameter_key: `stairs-complete:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_DOCUMENTATION",
      input_origin_class: "USER_CONFIRMED_SCOPE_SELECTION",
      preliminary_compilation_allowed: false,
      source_confirmation_required: true,
      guide: {
        guide_kind: "PROJECT_DEFINED",
        guide_short_ru: `${titleRu}. Выберите только подтверждённый проектом вариант.`,
        source_role: "APPROVED_PROJECT_DOCUMENTATION",
        source_document: STAIRS_COMPLETE_INSTALLATION_NORM_ID,
        guide_version: "stairs-complete-installation-r1",
        source_snapshot_hash: STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA.definition_hash,
        applicability:
          "Неизвестная применимость компонента не заменяется предположением; при выборе компонента появляются только его расчётные карточки.",
        verified_at: STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA.verified_at,
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  };
}

const projectedPlacementParameters = projectStageParameters(
  STAIRS_CONCRETE_PLACEMENT_PARAMETERS,
  PLACEMENT_IDS,
).map((parameter) => parameter.parameter_id === "stairs_concrete_volume_m3"
  ? {
      ...parameter,
      required: true,
      constraints_json: { min: 0.001 },
      truth_metadata: {
        ...(parameter.truth_metadata ?? {}),
        guide: {
          guide_kind: "MEASUREMENT_RULE",
          guide_short_ru: "Укажите подтверждённый объём бетона маршей и площадок в м³; приложение не выводит его из одного числа ступеней.",
          source_role: "USER_MEASURED_OR_APPROVED_PROJECT_GEOMETRY",
          source_document: STAIRS_COMPLETE_INSTALLATION_NORM_ID,
          guide_version: "stairs-complete-installation-r1",
          source_snapshot_hash: STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA.definition_hash,
          applicability: "Объём по утверждённой геометрии монолитной лестницы.",
          verified_at: STAIRS_COMPLETE_INSTALLATION_SOURCE_METADATA.verified_at,
        },
      },
    }
  : parameter);

export const STAIRS_COMPLETE_INSTALLATION_PARAMETERS:
readonly PublishedParameter[] = Object.freeze([
  selectorParameter("reinforcement_applicable", "Армирование лестницы предусмотрено проектом"),
  selectorParameter("temporary_formwork_applicable", "Требуется временная опалубка лестницы"),
  ...projectedPlacementParameters,
  ...projectStageParameters(STAIRS_REINFORCEMENT_PARAMETERS, REINFORCEMENT_IDS),
  ...projectStageParameters(STAIRS_PROJECT_FORMWORK_PARAMETERS, FORMWORK_IDS),
].map((parameter, ordinal) => ({ ...parameter, ordinal })));

export const STAIRS_COMPLETE_INSTALLATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  ...projectStageFormulas(STAIRS_CONCRETE_PLACEMENT_FORMULAS, PLACEMENT_IDS),
  ...projectStageFormulas(STRIP_FOUNDATION_REINFORCEMENT_FORMULAS, REINFORCEMENT_IDS),
  ...projectStageFormulas(STAIRS_PROJECT_FORMWORK_FORMULAS, FORMWORK_IDS),
]);

const stageResources = [
  ...projectStageResources(STAIRS_CONCRETE_PLACEMENT_RESOURCES, PLACEMENT_IDS, literalTrue),
  ...projectStageResources(
    STAIRS_REINFORCEMENT_RESOURCES,
    REINFORCEMENT_IDS,
    selected("reinforcement_applicable"),
  ),
  ...projectStageResources(
    STAIRS_PROJECT_FORMWORK_RESOURCES,
    FORMWORK_IDS,
    selected("temporary_formwork_applicable"),
  ),
];

export const STAIRS_COMPLETE_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  stageResources.map((resource, ordinal) => {
    const projected = { ...resource, ordinal };
    const { row_sha256: _previousHash, ...hashInput } = projected;
    return { ...projected, row_sha256: estimateDeterministicHash(hashInput) };
  }),
);

export const STAIRS_COMPLETE_INSTALLATION_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "stairs_concrete_volume_m3",
] as const);

function mapInput(
  input: Readonly<Record<string, InputValue>>,
  ids: Readonly<Record<string, string>>,
): Record<string, InputValue> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [ids[key] ?? key, value]));
}

export function stairsCompleteInstallationAcceptanceInputR1(
  contextKey: StairsCompleteInstallationContextKey,
): Readonly<Record<string, InputValue>> {
  const target = STAIRS_COMPLETE_INSTALLATION_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) throw new Error(`STAIRS_COMPLETE_CONTEXT_UNSUPPORTED:${contextKey}`);
  return Object.freeze({
    reinforcement_applicable: true,
    temporary_formwork_applicable: true,
    ...mapInput(stairsConcretePlacementAcceptanceInputR1(
      contextKey as StairsConcretePlacementContextKey,
    ), PLACEMENT_IDS),
    ...mapInput(stairsReinforcementAcceptanceInputR1(
      contextKey as StairsReinforcementContextKey,
    ), REINFORCEMENT_IDS),
    ...mapInput(stairsProjectFormworkAcceptanceInputR1(
      contextKey as StairsProjectFormworkContextKey,
    ), FORMWORK_IDS),
  });
}

function assertUnique(values: readonly string[], code: string): void {
  if (new Set(values).size !== values.length) throw new Error(code);
}
assertUnique(
  STAIRS_COMPLETE_INSTALLATION_PARAMETERS.map((parameter) => parameter.parameter_id),
  "STAIRS_COMPLETE_PARAMETER_DUPLICATE",
);
assertUnique(
  STAIRS_COMPLETE_INSTALLATION_FORMULAS.map((formula) => formula.formula_id),
  "STAIRS_COMPLETE_FORMULA_DUPLICATE",
);
assertUnique(
  STAIRS_COMPLETE_INSTALLATION_RESOURCES.map((resource) => resource.row_id),
  "STAIRS_COMPLETE_ROW_DUPLICATE",
);

export async function compileStairsCompleteInstallationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? STAIRS_COMPLETE_INSTALLATION_TARGETS[0].catalogId;
  if (!STAIRS_COMPLETE_INSTALLATION_TARGETS.some((target) => target.catalogId === catalogId)) {
    throw new Error(`STAIRS_COMPLETE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.stairs-complete-installation-r1",
    catalogId,
    primaryMeasureParameterId: "stairs_concrete_volume_m3",
    parameterDefinitions: [...STAIRS_COMPLETE_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...STAIRS_COMPLETE_INSTALLATION_FORMULAS],
    resourceDefinitions: [...STAIRS_COMPLETE_INSTALLATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 96,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
