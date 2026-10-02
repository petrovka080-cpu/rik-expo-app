import sourcePack from "../../../../data/estimate-benchmarks/source-packs/asphalt-level-small-area-s2716.json";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

export const ASPHALT_LEVEL_SMALL_AREA_S2716_CATALOG_ID =
  "canonical-work:base:paving_roads_landscape_interior_asphalt_level_small_area";
export const ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_ID = "kg_krer_27_06_019_02_2015";
export const ASPHALT_LEVEL_SMALL_AREA_S2716_PROFILE_SOURCE_ID =
  "s26_4_selected_preliminary_profile_r1";
export const ASPHALT_LEVEL_SMALL_AREA_S2716_NORM_ID =
  "KRER-27-06-019-02-THICKNESS-INCREMENTS-S27-16";
export const ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_PACK_SHA256 =
  "c2e1cdacab20ffc7cf4cb6b22a209f1ba08f048f40d3bb47b7ba42ee2c381648";

export const ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_METADATA = Object.freeze({
  ...sourcePack.sourceMetadata,
  definition_hash: ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_PACK_SHA256,
});

type RuntimeClassification = "NORMATIVE" | "ASSUMPTION" | "DERIVED";

const USER_FACT_IDS = new Set(["area_m2", "layer_thickness_mm"]);
const BASELINE_INPUT = sourcePack.baseline.inputValues as Readonly<Record<string, unknown>>;
const BASELINE_CLASSIFICATION = sourcePack.baseline.inputClassification as
  Readonly<Record<string, RuntimeClassification | "VALIDATION_FIXTURE">>;
const BASELINE_SOURCE_IDS = sourcePack.baseline.normativeSourceIds as
  Readonly<Record<string, readonly string[]>>;

export const ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_INPUT = Object.freeze(
  Object.fromEntries(Object.entries(BASELINE_INPUT)
    .filter(([parameterId]) => !USER_FACT_IDS.has(parameterId))),
);

export const ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.entries(BASELINE_CLASSIFICATION)
    .filter(([parameterId]) => !USER_FACT_IDS.has(parameterId))),
) as Readonly<Record<string, RuntimeClassification>>;

export const ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.entries(BASELINE_SOURCE_IDS)
    .filter(([parameterId]) => !USER_FACT_IDS.has(parameterId))),
);

export const ASPHALT_LEVEL_SMALL_AREA_S2716_SHORT_INPUT = Object.freeze({
  area_m2: 100,
  layer_thickness_mm: 100,
});

export const ASPHALT_LEVEL_SMALL_AREA_S2716_ACCEPTANCE_INPUT = Object.freeze({
  ...ASPHALT_LEVEL_SMALL_AREA_S2716_SHORT_INPUT,
  ...ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_INPUT,
});

export const ASPHALT_LEVEL_SMALL_AREA_S2716_PARAMETERS:
readonly CanonicalEstimateParameterDefinition[] = Object.freeze(
  sourcePack.parameterSpecs.map((spec) => {
    const userFact = USER_FACT_IDS.has(spec.parameterId);
    const classification = ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_CLASSIFICATION[
      spec.parameterId
    ] ?? null;
    const normative = classification === "NORMATIVE";
    return {
      parameter_id: spec.parameterId,
      ordinal: spec.ordinal,
      value_type: spec.valueType,
      unit_id: spec.unitId,
      title_ru: spec.titleRu,
      required: spec.required,
      default_value: spec.defaultValue,
      constraints_json: spec.constraints,
      truth_metadata: {
        contract: "rik-expo-app.s27-21.asphalt-level-small-area-independent-owner.v1",
        semantic_parameter_key: `asphalt-level-small-area-s27-21:${spec.parameterId}`,
        visibility_role: userFact ? "USER_INPUT" : "INTERNAL_ONLY",
        value_source_role: userFact ? "USER_MEASURED" : normative
          ? "OFFICIAL_NORM" : classification === "DERIVED"
            ? "BACKEND_DERIVED" : "VISIBLE_PRELIMINARY_PROFILE_ASSUMPTION",
        input_origin_class: userFact
          ? "KNOWN_WORK_SCOPE" : "SELECTED_PRELIMINARY_LEVELING_PROFILE",
        preliminary_compilation_allowed: !userFact,
        source_confirmation_required: false,
        guide: {
          guide_kind: userFact ? "MEASUREMENT_RULE" : normative
            ? "MANDATORY_NORM_VALUE" : "PRACTICE_REFERENCE",
          guide_short_ru: spec.parameterId === "area_m2"
            ? "Введите площадь выравниваемого участка в м²."
            : spec.parameterId === "layer_thickness_mm"
              ? "Введите общую толщину по проекту или обмеру в мм, кратно 5 мм."
              : "Значение профиля заменяется проектом, ППР или фактическим маршрутом.",
          source_role: normative ? "KG_KRER_27_06_019_02" : "VISIBLE_PRELIMINARY_PROFILE",
          source_document: normative
            ? ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_ID
            : ASPHALT_LEVEL_SMALL_AREA_S2716_PROFILE_SOURCE_ID,
          source_locator: normative
            ? ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_METADATA.exact_locator
            : "baseline in asphalt-level-small-area-s2716 independent source pack",
          guide_version: "asphalt-level-small-area-s27-21-independent-owner",
          source_snapshot_hash: ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_PACK_SHA256,
          applicability: ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_METADATA.use_restriction,
          verified_at: "2026-09-30T00:00:00+06:00",
          guide_validation_policy: "FIRST_ESTIMATE_NOW_REPLACE_ASSUMPTIONS_WITH_PROJECT_DATA",
        },
        hidden_default_forbidden: userFact,
        runtime_profile_value: !userFact,
        runtime_profile_classification: classification,
        synthetic: false,
      },
    } as CanonicalEstimateParameterDefinition;
  }),
);

export const ASPHALT_LEVEL_SMALL_AREA_S2716_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  sourcePack.formulaSpecs.map((spec) => {
    const compiled = compileFormulaGraph(spec.expression);
    return {
      formula_id: spec.formulaId,
      output_unit_id: spec.outputUnitId,
      expression_source: spec.expression,
      ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
    };
  }),
);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const profilePolicy =
  "Площадь и общая толщина — факты пользователя. Ресурсы и числовые нормы взяты из КРЕР 27-06-019-02; логистика и организация — видимые заменяемые ориентиры.";

function normIdForSource(sourceId: string): string {
  if (sourceId === ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_ID) {
    return ASPHALT_LEVEL_SMALL_AREA_S2716_NORM_ID;
  }
  if (sourceId === "s27_16_geometry") return "AREA_TIMES_THICKNESS";
  if (sourceId === "napa_faa_asphalt_paving_handbook_2025") {
    return "NAPA_FAA_ASPHALT_PAVING_HANDBOOK_2025";
  }
  if (sourceId === "asphalt_institute_engineering_faq") {
    return "ASPHALT_INSTITUTE_ENGINEERING_FAQ";
  }
  return "S26_4_SELECTED_PRELIMINARY_PROFILE_R1";
}

export const ASPHALT_LEVEL_SMALL_AREA_S2716_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  sourcePack.resourceSpecs.map((spec) => {
    const sourceId = spec.sourceId ?? ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_ID;
    const costTreatment = spec.costTreatment as
      "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "INFORMATIONAL_SCOPE" | "CONTROL_OR_DOCUMENT";
    const resourceGraph = {
      formulaId: spec.formulaId,
      normalizedUom: spec.unitId,
      semanticOwnerId: `asphalt-level-small-area-s27-21:${spec.rowId}`,
      costOwner: costTreatment === "OWN_COST" ? "resource" : "scope",
      costTreatment,
      payable: costTreatment === "OWN_COST",
      noDoubleCount: true,
      primaryMeasureParameterId: "area_m2",
      preliminaryProfileId: ASPHALT_LEVEL_SMALL_AREA_S2716_NORM_ID,
      ...(spec.parentRowId ? { parentCostOwnerId: spec.parentRowId } : {}),
      visibleAssumptionPolicy: profilePolicy,
      ...(spec.rowId === "asphalt:control:geometric-compacted-volume" ? {
        quantityPurpose: "GEOMETRIC_CONTROL_ONLY_NOT_PROCUREMENT_MASS",
      } : {}),
    };
    const sourceMetadata = {
      truth_contract_version: "R3",
      synthetic: false,
      sourceRole: sourceId === ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_ID
        ? "OFFICIAL_KG_RESOURCE_NORM" : "TECHNOLOGY_AND_QA_CROSSCHECK",
      sourcePackSha256: ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_PACK_SHA256,
      selectedCatalogId: ASPHALT_LEVEL_SMALL_AREA_S2716_CATALOG_ID,
      applicability: ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_METADATA.use_restriction,
      normativeTrace: [{
        sourceId,
        source_id: sourceId,
        normId: normIdForSource(sourceId),
        norm_id: normIdForSource(sourceId),
        normVersion: ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_METADATA.source_document_version,
        source_title: ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_METADATA.source_title,
        exact_locator: ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_METADATA.exact_locator,
        source_definition_hash: ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_PACK_SHA256,
      }],
      excludedAdjacentScope: [
        "milling",
        "base_repair",
        "new_aggregate_base",
        "drainage",
        "curbs",
        "road_marking",
      ],
    };
    const titleRu = spec.rowId === "asphalt:material:hot-dense-fine-mix"
      ? "Горячая асфальтобетонная смесь для выравнивающего слоя"
      : spec.titleRu;
    return {
      id: `resource-${spec.rowId.replace(/:/gu, "-")}`,
      row_id: spec.rowId,
      ordinal: spec.ordinal,
      section: spec.section,
      category: spec.category,
      title_ru: titleRu,
      unit_id: spec.unitId,
      formula_id: spec.formulaId,
      inclusion_ast: literalTrue,
      resource_graph: resourceGraph,
      procurement_eligible: spec.procurementEligible,
      cost_owner_id: spec.costOwnerId,
      source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ spec, titleRu, resourceGraph, sourceMetadata }),
    } as CanonicalEstimateResourceDefinition;
  }),
);

export const ASPHALT_LEVEL_SMALL_AREA_S2716_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "NORMATIVE_OPERATION_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: ASPHALT_LEVEL_SMALL_AREA_S2716_SOURCE_PACK_SHA256,
  sourcePackPath:
    "data/estimate-benchmarks/source-packs/asphalt-level-small-area-s2716.json",
  entries: sourcePack.independentCompletenessEntries,
});

export function asphaltMassFromGeometryS2716(input: Readonly<{
  areaM2: number;
  thicknessMm: number;
  densityTPerM3: number;
  wastePercent: number;
}>): Readonly<{ volumeM3: number; netMassT: number; orderMassT: number }> {
  const volumeM3 = input.areaM2 * input.thicknessMm / 1000;
  const netMassT = volumeM3 * input.densityTPerM3;
  return Object.freeze({
    volumeM3,
    netMassT,
    orderMassT: Number((netMassT * (1 + input.wastePercent / 100)).toFixed(12)),
  });
}

export async function compileAsphaltLevelSmallAreaS2716(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ASPHALT_LEVEL_SMALL_AREA_S2716_CATALOG_ID;
  if (catalogId !== ASPHALT_LEVEL_SMALL_AREA_S2716_CATALOG_ID) {
    throw new Error(`ASPHALT_LEVEL_SMALL_AREA_S2716_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.asphalt-level-small-area-s27-21.v2",
    catalogId,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...ASPHALT_LEVEL_SMALL_AREA_S2716_PARAMETERS],
    formulaDefinitions: [...ASPHALT_LEVEL_SMALL_AREA_S2716_FORMULAS],
    resourceDefinitions: [...ASPHALT_LEVEL_SMALL_AREA_S2716_RESOURCES],
    submittedParameters,
    confirmedParameters: ASPHALT_LEVEL_SMALL_AREA_S2716_RUNTIME_INPUT,
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: ASPHALT_LEVEL_SMALL_AREA_S2716_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
