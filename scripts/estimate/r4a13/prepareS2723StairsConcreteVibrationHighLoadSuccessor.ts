import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_CATALOG_ID,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_INDEPENDENT_COMPLETENESS_MAP,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_NORM_ID,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RUNTIME_CLASSIFICATION,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RUNTIME_INPUT,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RUNTIME_SOURCE_IDS,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SHORT_INPUT,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_ID,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_METADATA,
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
  compileStairsConcreteVibrationHighLoadS2723,
  stairsConcreteVibrationHighLoadMissingRows,
} from "../../../src/lib/estimate/v4/stairsConcreteVibrationHighLoadS2723";
import { CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT } from
  "./catalogFirstEstimateMinimumInputAudit.shared";
import {
  runMasterSingleDefinitionSuccessorR1,
  validateIndependentCompletenessMapReferences,
} from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const currentReleasePath = resolve(
  process.env.R4A13_CURRENT_RELEASE_PATH
    ?? "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId: string;
  searchReleaseId: string;
};
const resourceById = new Map(
  STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES.map(
    (resource) => [resource.row_id, resource],
  ),
);
const conditionParameterIds = [
  "high_load_placement_continuity_plan_reference",
  "high_load_geometry_reinforcement_layout_reference",
  "high_load_equipment_selection_plan_reference",
] as const;
const conditionControlRowIds = [
  "concrete-stairs-vibration-high-load:01:control:placement-continuity-plan",
  "concrete-stairs-vibration-high-load:01:control:geometry-reinforcement-layout",
  "concrete-stairs-vibration-high-load:02:control:equipment-selection-plan",
] as const;

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
  entries: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((component) => component.requiredRowIds.map((rowId) => {
      const row = resourceById.get(rowId);
      const trace = (row?.source_metadata as Json | undefined)?.normativeTrace?.[0] as
        Json | undefined;
      const contextParameters = ((row?.resource_graph as Json | undefined)
        ?.contextParameterIds as string[] | undefined) ?? [];
      return {
        operationId: component.semanticKey,
        expectedResourceId: rowId,
        condition: contextParameters.some((parameterId) => parameterId.startsWith("high_load_"))
          ? `visible need until project references are supplied: ${contextParameters.join(",")}`
          : "always in the selected high-load atomic vibration profile",
        sourceId: String(trace?.sourceId ?? ""),
        formulaId: String(row?.formula_id ?? ""),
        resolution: { kind: "ROW", rowId },
      };
    })),
});

function quantity(rows: readonly Json[], rowId: string): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
}

async function verifyCore(): Promise<Json> {
  const first = await compileStairsConcreteVibrationHighLoadS2723({
    ...STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SHORT_INPUT,
  });
  const complete = await compileStairsConcreteVibrationHighLoadS2723({
    ...STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_ACCEPTANCE_INPUT,
  });
  const changed = await compileStairsConcreteVibrationHighLoadS2723({
    ...STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_ACCEPTANCE_INPUT,
    consolidated_concrete_volume_m3: 30,
  });
  const rowIds = new Set(complete.rows.map((row) => row.row_id));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_FORMULAS,
    resourceDefinitions: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES,
  });
  const observedMissingParameters = new Set(
    first.preliminaryNeeds.flatMap((need) => need.missing_parameter_ids),
  );
  const assertions = {
    firstEstimateAppearsImmediately:
      first.rows.length === 2 && first.preliminaryNeeds.length === 23,
    threeProjectConditionsRemainVisible:
      conditionParameterIds.every((id) => observedMissingParameters.has(id))
      && observedMissingParameters.size === conditionParameterIds.length,
    noPrematureProcurement:
      first.rows.filter((row) => row.included_in_procurement).length === 0,
    clarificationRestoresAllRows:
      complete.rows.length === 25 && complete.preliminaryNeeds.length === 0,
    completeProcurementSubset:
      complete.rows.filter((row) => row.included_in_procurement).length === 11,
    unknownPricesRemainNull:
      complete.rows.every((row) => row.unit_price == null && row.amount == null),
    independentMapComplete:
      stairsConcreteVibrationHighLoadMissingRows(rowIds).length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    projectConditionControlsPresent:
      conditionControlRowIds.every((rowId) => rowIds.has(rowId)),
    noHighLoadMultiplierInvented:
      quantity(complete.rows,
        "concrete-stairs-vibration-high-load:03:labor:vibration-crew") === 30
      && quantity(complete.rows,
        "concrete-stairs-vibration-high-load:03:equipment:active-vibrator") === 8
      && quantity(complete.rows,
        "concrete-stairs-vibration-high-load:03:equipment:rental-shifts") === 1
      && quantity(complete.rows,
        "concrete-stairs-vibration-high-load:03:material:electricity") === 7.04,
    volumeChangeRecalculatesWithoutRepeatingCleaning:
      quantity(changed.rows,
        "concrete-stairs-vibration-high-load:03:labor:vibration-crew") === 37.5
      && quantity(changed.rows,
        "concrete-stairs-vibration-high-load:03:equipment:active-vibrator") === 10
      && quantity(changed.rows,
        "concrete-stairs-vibration-high-load:03:equipment:rental-shifts") === 2
      && quantity(changed.rows,
        "concrete-stairs-vibration-high-load:03:material:electricity") === 8.8
      && quantity(changed.rows,
        "concrete-stairs-vibration-high-load:04:consumable:cleaning-water") === 0.025
      && quantity(changed.rows,
        "concrete-stairs-vibration-high-load:04:labor:cleaning") === 0.25,
    concreteSupplyNotDuplicated: !complete.rows.some((row) =>
      /concrete-(?:supply|mix)|ready-mix/iu.test(row.row_id)),
  };
  const failed = Object.entries(assertions)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(
      `STOP_S27_23_STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_CORE:${failed.join(",")}`,
    );
  }
  return {
    status: "GREEN_S27_23_STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_CORE",
    assertions,
    firstEstimate: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      procurementRowCount: first.rows.filter((row) => row.included_in_procurement).length,
      missingProjectConditionIds: [...observedMissingParameters].sort(),
    },
    completeEstimate: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
      procurementRowCount: complete.rows.filter((row) => row.included_in_procurement).length,
    },
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ first, complete, changed })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-23.stairs-concrete-vibration-high-load-successor.v1",
  stopCode: "S27_23_STAIRS_CONCRETE_VIBRATION_HIGH_LOAD",
  applicationName: "s27-23-stairs-concrete-vibration-high-load-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (63).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "e1c70828ba30bb4dae395c2766f8ff7e13467ec51592198f4722a64edf8126ca",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? currentRelease.definitionReleaseId,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? currentRelease.searchReleaseId,
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-23/stairs-concrete-vibration-high-load-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-standard-s27-23.json",
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-high-load-s27-23.json",
    "src/lib/estimate/v4/stairsConcreteVibrationStandardS2723.ts",
    "src/lib/estimate/v4/stairsConcreteVibrationContextAdapterS2723.ts",
    "src/lib/estimate/v4/stairsConcreteVibrationHighLoadS2723.ts",
    "tests/estimateNorms/stairsConcreteVibrationHighLoadS2723.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723StairsConcreteVibrationHighLoadSuccessor.ts",
  ],
  catalogId: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_CATALOG_ID,
  sourceId: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_ID,
  normId: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_NORM_ID,
  sourceMetadata: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_METADATA,
  parameterDefinitions: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_PARAMETERS,
  formulaDefinitions: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_FORMULAS,
  resourceDefinitions: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RESOURCES,
  shortInput: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SHORT_INPUT,
  acceptanceInput: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_ACCEPTANCE_INPUT,
  runtimeProfileInput: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RUNTIME_INPUT,
  runtimeProfileClassification:
    STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: "S27_23_STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_24_M3",
  passport: {
    canonicalRuName: "виброуплотнение бетона лестницы для высокой нагрузки",
    workKey: "concrete_foundation_interior_stairs_concrete_vibrate_high_load",
    physicalResultRu:
      "Уплотнённый бетон лестницы высокой нагрузки в границах атомарной операции с явной сверкой геометрии, армирования, непрерывности и оборудования.",
    includedScopeRu: [
      "атомарное внутреннее виброуплотнение без скрытого коэффициента высокой нагрузки",
      "видимые проектные условия последовательности, геометрии/армирования и выбора оборудования",
      "автоматический труд, механизм, аренда, энергия, очистка, контроль и логистика от объёма и редактируемого профиля",
    ],
    excludedScopeRu: [
      "поставка и укладка бетона, опалубка, армирование, отделка и уход",
      "автоматическое увеличение производительности, диаметра булавы или числа машин по названию",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "INTERNAL_VIBRATION_OF_FRESH_STAIR_CONCRETE",
    catalogContext: "HIGH_LOAD",
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    selectedPreliminaryProfile: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_NORM_ID,
    sharedAtomicTechnology: true,
    projectConditionGateCount: conditionParameterIds.length,
    highLoadMultiplierInvented: false,
    firstEstimateBeforeClarification: true,
  },
  binding: {
    rowId: "concrete-stairs-vibration-high-load:01:control:placement-continuity-plan",
    applicability: {
      technology_class: "STAIR_CONCRETE_INTERNAL_VIBRATION_HIGH_LOAD",
      source_id: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_ID,
      norm_id: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_NORM_ID,
      exact_locator: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_METADATA.exact_locator,
      quantity_basis:
        "SHARED_ATOMIC_VOLUME_CORE_GATED_BY_GEOMETRY_CONTINUITY_AND_EQUIPMENT_PLAN",
      assumption_policy: "HIGH_LOAD_LABEL_NEVER_CREATES_A_HIDDEN_MULTIPLIER",
    },
  },
  locator: {
    key: "stairs-concrete-vibration-high-load-s27-23",
    payload: {
      kind: "SHARED_ATOMIC_TECHNOLOGY_WITH_HIGH_LOAD_PROJECT_GATES",
      sourcePackSha256: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
      independentCompletenessMap: true,
      projectConditionGateCount: conditionParameterIds.length,
      highLoadMultiplierInvented: false,
      replacesGenericOneParameterFiftyNineRowProjection: true,
    },
  },
  search: {
    primaryUom: "м3",
    canonicalNameRu: "виброуплотнение бетона лестницы для высокой нагрузки",
    aliases: [
      "вибрирование бетона высоконагруженной лестницы",
      "вибратор бетон лестница высокая нагрузка",
      "уплотнение бетона усиленной лестницы",
    ],
    shortScopeRu:
      "Атомарное виброуплотнение без скрытого high-load коэффициента; зависимые строки ждут планы непрерывности, геометрии/армирования и оборудования.",
    keyDistinguishingParameters: [
      "consolidated_concrete_volume_m3",
      "high_load_geometry_reinforcement_layout_reference",
      "high_load_equipment_selection_plan_reference",
    ],
    clarificationFields: [...conditionParameterIds, "active_vibrator_count",
      "backup_vibrator_count", "vibrator_head_diameter_mm"],
    includedBoundaries: [
      "виброуплотнение, труд, механизмы, аренда, энергия, очистка, контроль и логистика",
      "зависимые строки видимы до проектного подтверждения",
    ],
    excludedBoundaries: [
      "бетонная смесь, укладка, опалубка, армирование, отделка и уход",
      "скрытый коэффициент высокой нагрузки или неподтверждённое число машин",
    ],
    extraSearchTermsRu:
      "лестница высокая нагрузка бетон вибрация геометрия армирование непрерывность резервный вибратор оборудование",
    sourceProvenance: {
      sourcePackSha256: STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_S2723_SOURCE_PACK_SHA256,
      officialAciAndWackerSnapshotsReused: true,
      projectConditionReferencesRequired: true,
      hiddenHighLoadMultiplierForbidden: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /concrete_(?:supply|place|finish|cure)|ready_mix/iu,
    /formwork|stair_design|:(?:material|operation):reinforcement/iu,
  ],
  owner: "S27_23_STAIRS_CONCRETE_VIBRATION_HIGH_LOAD_SUCCESSOR",
  receiptFileStem: "S27_23_STAIRS_CONCRETE_VIBRATION_HIGH_LOAD",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
