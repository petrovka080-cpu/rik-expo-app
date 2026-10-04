import type { CanonicalEstimateCompileCoreResult } from "../backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  STRIP_POUR_DEFAULT_REQUIRED_ROW_IDS,
  STRIP_POUR_INDEPENDENT_COMPLETENESS_MAP,
  STRIP_POUR_PROFILE_FORMULAS,
  STRIP_POUR_PROFILE_NORM_ID,
  STRIP_POUR_PROFILE_PARAMETERS,
  STRIP_POUR_PROFILE_RESOURCES,
  STRIP_POUR_PROFILE_RUNTIME_CLASSIFICATION,
  STRIP_POUR_PROFILE_RUNTIME_INPUT,
  STRIP_POUR_PROFILE_RUNTIME_SOURCE_IDS,
  STRIP_POUR_PROFILE_SOURCE_ID,
  STRIP_POUR_PROFILE_SOURCE_METADATA,
  compileConcretePlacementPreliminaryProfileForCatalogR1,
  type StripPourProfileParameter,
} from "./stripFoundationConcretePlacementPreliminaryProfileR1";

export const ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS = Object.freeze([
  {
    contextKey: "standard",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_standard",
    titleRu: "Бетонирование основания анкерной группы в стандартной зоне",
    contextRu: "стандартная зона",
    preliminaryContingencyPercent: 6,
    acceptanceVolumeM3: 8,
  },
  {
    contextKey: "high_load",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_high_load",
    titleRu: "Бетонирование основания анкерной группы в зоне высокой нагрузки",
    contextRu: "зона высокой нагрузки",
    preliminaryContingencyPercent: 10,
    acceptanceVolumeM3: 18,
  },
  {
    contextKey: "large_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_large_area",
    titleRu: "Бетонирование оснований анкерных групп на большом участке",
    contextRu: "большой участок",
    preliminaryContingencyPercent: 8,
    acceptanceVolumeM3: 36,
  },
  {
    contextKey: "repair",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_repair",
    titleRu: "Бетонирование ремонтного участка основания анкерной группы",
    contextRu: "локальный ремонт основания",
    preliminaryContingencyPercent: 4,
    acceptanceVolumeM3: 4,
  },
  {
    contextKey: "small_area",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_small_area",
    titleRu: "Бетонирование основания анкерной группы на малом участке",
    contextRu: "малый участок",
    preliminaryContingencyPercent: 4,
    acceptanceVolumeM3: 3,
  },
  {
    contextKey: "technical_room",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_technical_room",
    titleRu: "Бетонирование основания анкерной группы в техническом помещении",
    contextRu: "техническое помещение",
    preliminaryContingencyPercent: 5,
    acceptanceVolumeM3: 6,
  },
  {
    contextKey: "wet_zone",
    catalogId: "canonical-work:base:concrete_foundation_interior_anchor_group_pour_wet_zone",
    titleRu: "Бетонирование основания анкерной группы во влажной зоне",
    contextRu: "влажная зона",
    preliminaryContingencyPercent: 7,
    acceptanceVolumeM3: 12,
  },
] as const);

export type AnchorGroupConcretePlacementContextKey =
  (typeof ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS)[number]["contextKey"];

export const ANCHOR_GROUP_CONCRETE_PLACEMENT_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "product_profile_id",
  "pump_rated_output_m3_h",
  "vibrator_machine_h_per_m3",
] as const);

export const ANCHOR_GROUP_HIGH_LOAD_PROFILE_SOURCE_ID =
  "anchor_group_concrete_placement_high_load_preliminary_profile_r2";
export const ANCHOR_GROUP_HIGH_LOAD_PROFILE_NORM_ID =
  "profile:anchor-group-concrete-placement:high-load:r2";

function anchorRowId(value: string): string {
  return value.replace(/^strip-pour:/u, "anchor-group-pour:");
}

export const ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS: readonly StripPourProfileParameter[] = Object.freeze(
  STRIP_POUR_PROFILE_PARAMETERS.map((parameter) => ({
    ...parameter,
    truth_metadata: {
      ...parameter.truth_metadata,
      contract: "rik-expo-app.anchor-group-concrete-placement-preliminary-profile-r2",
      semantic_parameter_key:
        `anchor-group-concrete-placement-profile:${parameter.parameter_id}`,
      ...(parameter.truth_metadata.effective_resource_quantity_v1 ? {
        effective_resource_quantity_v1: {
          ...(parameter.truth_metadata.effective_resource_quantity_v1 as Record<string, unknown>),
          sourceRowId: anchorRowId(String((parameter.truth_metadata.effective_resource_quantity_v1 as Record<string, unknown>).sourceRowId)),
        },
      } : { guide: {
        ...(parameter.truth_metadata.guide as Record<string, unknown>),
        guide_version: "anchor-group-concrete-placement-preliminary-profile-r2",
        applicability:
          "Отдельно заказанное бетонирование подготовленного основания анкерной группы; смежные работы не включаются автоматически.",
        source_document:
          (parameter.truth_metadata.guide as Record<string, unknown>).source_document
            === "selected_preliminary_strip_pour_profile_r1"
            ? ANCHOR_GROUP_HIGH_LOAD_PROFILE_SOURCE_ID
            : (parameter.truth_metadata.guide as Record<string, unknown>).source_document,
        ...(parameter.parameter_id === "plan_dimension_concrete_volume_m3"
          ? {
              guide_short_ru:
                "Введите объём основания анкерной группы по проектной геометрии или ведомости объёмов. Пример единицы — м³; пример не является нормой.",
            }
          : {}),
      } }),
    },
  })),
);

export const ANCHOR_GROUP_CONCRETE_PLACEMENT_FORMULAS =
  STRIP_POUR_PROFILE_FORMULAS;
export const ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES = Object.freeze(
  STRIP_POUR_PROFILE_RESOURCES.map((resource) => {
    const graph = resource.resource_graph as Record<string, unknown>;
    const source = resource.source_metadata as Record<string, unknown>;
    const mapped = {
      ...resource,
      id: resource.id.replace(/^resource-strip-pour-/u, "resource-anchor-group-pour-"),
      row_id: anchorRowId(resource.row_id),
      cost_owner_id: typeof resource.cost_owner_id === "string"
        ? anchorRowId(resource.cost_owner_id)
        : resource.cost_owner_id,
      resource_graph: {
        ...graph,
        semanticOwnerId: String(graph.semanticOwnerId ?? "")
          .replace(/^strip-foundation-concrete-placement-profile:/u,
            "anchor-group-concrete-placement-profile:")
          .replace(/strip-pour:/gu, "anchor-group-pour:"),
        preliminaryProfileId: graph.preliminaryProfileId === STRIP_POUR_PROFILE_NORM_ID
          ? ANCHOR_GROUP_HIGH_LOAD_PROFILE_NORM_ID
          : graph.preliminaryProfileId,
        ...(typeof graph.parentRowId === "string"
          ? { parentRowId: anchorRowId(graph.parentRowId) }
          : {}),
        ...(typeof graph.parentCostOwnerId === "string"
          ? { parentCostOwnerId: anchorRowId(graph.parentCostOwnerId) }
          : {}),
      },
      source_metadata: {
        ...source,
        normativeTrace: Array.isArray(source.normativeTrace)
          ? source.normativeTrace.map((entry) => {
              const trace = entry as Record<string, unknown>;
              const selectedProfile = trace.sourceId === "selected_preliminary_strip_pour_profile_r1"
                || trace.source_id === "selected_preliminary_strip_pour_profile_r1";
              return {
              ...trace,
              sourceId: selectedProfile ? ANCHOR_GROUP_HIGH_LOAD_PROFILE_SOURCE_ID : trace.sourceId,
              source_id: selectedProfile ? ANCHOR_GROUP_HIGH_LOAD_PROFILE_SOURCE_ID : trace.source_id,
              source_title: selectedProfile
                ? "Видимый заменяемый технологический профиль бетонирования основания анкерной группы"
                : trace.source_title,
              normVersion: selectedProfile
                ? "ANCHOR_GROUP_CONCRETE_PLACEMENT_PRELIMINARY_PROFILE_R2_2026-09-29"
                : trace.normVersion,
              source_document_version: selectedProfile
                ? "ANCHOR_GROUP_CONCRETE_PLACEMENT_PRELIMINARY_PROFILE_R2_2026-09-29"
                : trace.source_document_version,
              exact_locator: selectedProfile
                ? "Адаптация проверенного профиля отдельного бетонирования: проектные данные, ППР, график поставки, паспорт техники и план контроля заменяют видимые допущения."
                : trace.exact_locator,
              normId: trace.normId === STRIP_POUR_PROFILE_NORM_ID
                ? ANCHOR_GROUP_HIGH_LOAD_PROFILE_NORM_ID
                : trace.normId,
              norm_id: trace.norm_id === STRIP_POUR_PROFILE_NORM_ID
                ? ANCHOR_GROUP_HIGH_LOAD_PROFILE_NORM_ID
                : trace.norm_id,
            }})
          : source.normativeTrace,
      },
    };
    return Object.freeze({
      ...mapped,
      row_sha256: estimateDeterministicHash({ ...mapped, row_sha256: undefined }),
    });
  }),
);

export const ANCHOR_GROUP_CONCRETE_PLACEMENT_SOURCE_METADATA = Object.freeze({
  ...STRIP_POUR_PROFILE_SOURCE_METADATA,
  source_title:
    "Предварительный технологический профиль отдельного бетонирования подготовленного основания анкерной группы",
  source_document_version:
    "ANCHOR_GROUP_CONCRETE_PLACEMENT_PRELIMINARY_PROFILE_R2_2026-09-29",
  use_restriction:
    "Только бетонирование уже подготовленного основания анкерной группы. Земляные работы, арматура, закладные детали и опалубка учитываются отдельными работами. Значения профиля видимы и заменяются проектом, ППР, паспортом выбранной техники, графиком поставки и планом контроля.",
});

export const ANCHOR_GROUP_HIGH_LOAD_PROFILE_RUNTIME_INPUT = Object.freeze({
  ...STRIP_POUR_PROFILE_RUNTIME_INPUT,
  selected_contingency_percent: 10,
});

export const ANCHOR_GROUP_HIGH_LOAD_PROFILE_RUNTIME_CLASSIFICATION =
  STRIP_POUR_PROFILE_RUNTIME_CLASSIFICATION;
export const ANCHOR_GROUP_HIGH_LOAD_PROFILE_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.entries(STRIP_POUR_PROFILE_RUNTIME_SOURCE_IDS).map(
    ([parameterId, sourceIds]) => [parameterId, sourceIds.map((sourceId) =>
      sourceId === STRIP_POUR_PROFILE_SOURCE_ID
        ? ANCHOR_GROUP_HIGH_LOAD_PROFILE_SOURCE_ID
        : sourceId)],
  )),
);

export const ANCHOR_GROUP_HIGH_LOAD_DEFAULT_REQUIRED_ROW_IDS = Object.freeze(
  STRIP_POUR_DEFAULT_REQUIRED_ROW_IDS.map(anchorRowId),
);
export const ANCHOR_GROUP_HIGH_LOAD_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  ...STRIP_POUR_INDEPENDENT_COMPLETENESS_MAP,
  entries: STRIP_POUR_INDEPENDENT_COMPLETENESS_MAP.entries.map((entry) => ({
    ...entry,
    resolution: entry.resolution.kind === "NOT_APPLICABLE"
      ? entry.resolution
      : {
          ...entry.resolution,
          rowId: anchorRowId(String(entry.resolution.rowId)),
          ...(typeof entry.resolution.parentRowId === "string"
            ? { parentRowId: anchorRowId(entry.resolution.parentRowId) }
            : {}),
        },
  })),
});

export function anchorGroupConcretePlacementMissingRequiredRowsR2(
  actualRowIds: ReadonlySet<string>,
  options: Readonly<{ constructionJointMode?: "NONE" | "WATERSTOP" }> = {},
): readonly string[] {
  const expected = options.constructionJointMode === "WATERSTOP"
    ? ANCHOR_GROUP_HIGH_LOAD_INDEPENDENT_COMPLETENESS_MAP.entries.flatMap((entry) =>
      entry.resolution.kind !== "NOT_APPLICABLE" && entry.resolution.rowId
        ? [entry.resolution.rowId]
        : [])
    : ANCHOR_GROUP_HIGH_LOAD_DEFAULT_REQUIRED_ROW_IDS;
  return expected.filter((rowId) => !actualRowIds.has(rowId));
}

export const ANCHOR_GROUP_HIGH_LOAD_PROFILE_SHORT_INPUT = Object.freeze({
  plan_dimension_concrete_volume_m3: 20,
});

export function anchorGroupConcretePlacementAcceptanceInputR1(
  contextKey: AnchorGroupConcretePlacementContextKey,
): Readonly<Record<string, string | number | boolean>> {
  const target = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS.find(
    (candidate) => candidate.contextKey === contextKey,
  );
  if (!target) {
    throw new Error(`ANCHOR_GROUP_CONCRETE_PLACEMENT_CONTEXT_UNSUPPORTED:${contextKey}`);
  }
  const reference = contextKey.toUpperCase().replace(/_/gu, "-");
  return Object.freeze({
    ...STRIP_POUR_PROFILE_RUNTIME_INPUT,
    plan_dimension_concrete_volume_m3: target.acceptanceVolumeM3,
    selected_contingency_percent: target.preliminaryContingencyPercent,
    mixture_designation: contextKey === "wet_zone" ? "B25 W8 F150 P4" : "B25 W6 F150 P4",
    plan_volume_calculation_reference: `AG-POUR-${reference}-VOLUME-REV-A`,
    mix_design_or_project_specification_reference: `AG-POUR-${reference}-MIX-REV-A`,
    placement_location:
      `Основание анкерной группы; ${target.contextRu}; захватка AG-POUR-${reference}`,
    contingency_selection_justification:
      `Видимое предварительное значение для захватки AG-POUR-${reference}; заменить подтверждённым расчётом заказа.`,
    delivery_schedule_and_truck_capacity:
      `Предварительно автобетоносмесители 8 м³; заменить графиком поставщика для AG-POUR-${reference}.`,
    producer_order_confirmation: "PRELIMINARY_NOT_ORDERED",
    estimator_approval_reference: "PRELIMINARY_ESTIMATE",
  });
}

export async function compileAnchorGroupConcretePlacementR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId
    ?? ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS[0].catalogId;
  const target = ANCHOR_GROUP_CONCRETE_PLACEMENT_TARGETS.find(
    (candidate) => candidate.catalogId === catalogId,
  );
  if (!target) {
    throw new Error(`ANCHOR_GROUP_CONCRETE_PLACEMENT_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileConcretePlacementPreliminaryProfileForCatalogR1({
    selected_contingency_percent: target.preliminaryContingencyPercent,
    ...submittedParameters,
  }, {
    catalogId,
    compilerVersion:
      "canonical-estimate-compiler.anchor-group-concrete-placement-preliminary-profile-r2",
    parameterDefinitions: ANCHOR_GROUP_CONCRETE_PLACEMENT_PARAMETERS,
    formulaDefinitions: ANCHOR_GROUP_CONCRETE_PLACEMENT_FORMULAS,
    resourceDefinitions: ANCHOR_GROUP_CONCRETE_PLACEMENT_RESOURCES,
    confirmedParameters: {
      ...STRIP_POUR_PROFILE_RUNTIME_INPUT,
      selected_contingency_percent: target.preliminaryContingencyPercent,
    },
  });
}
