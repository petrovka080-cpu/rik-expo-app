import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_CATALOG_ID,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_INDEPENDENT_COMPLETENESS_MAP,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_NORM_ID,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RUNTIME_CLASSIFICATION,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RUNTIME_INPUT,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RUNTIME_SOURCE_IDS,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SHORT_INPUT,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_ID,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_METADATA,
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_PACK_SHA256,
  compileStairsConcreteVibrationTechnicalRoomS2723,
  stairsConcreteVibrationTechnicalRoomMissingRows,
} from "../../../src/lib/estimate/v4/stairsConcreteVibrationTechnicalRoomS2723";
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
  STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES.map(
    (resource) => [resource.row_id, resource],
  ),
);

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256:
    STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_PACK_SHA256,
  entries:
    STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
      .flatMap((component) => component.requiredRowIds.map((rowId) => {
        const row = resourceById.get(rowId);
        const trace = (row?.source_metadata as Json | undefined)?.normativeTrace?.[0] as
          Json | undefined;
        const contextParameters = ((row?.resource_graph as Json | undefined)
          ?.contextParameterIds as string[] | undefined) ?? [];
        return {
          operationId: component.semanticKey,
          expectedResourceId: rowId,
          condition: contextParameters.some((parameterId) =>
            parameterId.startsWith("technical_room_"))
            ? `visible need until project references are supplied: ${contextParameters.join(",")}`
            : "always in the selected technical-room atomic vibration profile",
          sourceId: String(trace?.sourceId ?? ""),
          formulaId: String(row?.formula_id ?? ""),
          resolution: { kind: "ROW", rowId },
        };
      })),
});

const conditionParameterIds = [
  "technical_room_method_statement_reference",
  "technical_room_access_ventilation_plan_reference",
  "technical_room_power_route_reference",
  "technical_room_hazardous_area_classification_reference",
  "technical_room_continuity_standby_decision_reference",
  "technical_room_wash_water_plan_reference",
] as const;

const conditionControlRowIds = [
  "concrete-stairs-vibration-technical-room:01:control:method-statement",
  "concrete-stairs-vibration-technical-room:01:control:access-ventilation-plan",
  "concrete-stairs-vibration-technical-room:02:control:temporary-power-route",
  "concrete-stairs-vibration-technical-room:01:control:hazardous-area-classification",
  "concrete-stairs-vibration-technical-room:03:control:continuity-standby-decision",
  "concrete-stairs-vibration-technical-room:04:control:wash-water-plan",
] as const;

function quantity(rows: readonly Json[], rowId: string): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
}

async function verifyCore(): Promise<Json> {
  const first = await compileStairsConcreteVibrationTechnicalRoomS2723({
    ...STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SHORT_INPUT,
  });
  const complete = await compileStairsConcreteVibrationTechnicalRoomS2723({
    ...STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_ACCEPTANCE_INPUT,
  });
  const changed = await compileStairsConcreteVibrationTechnicalRoomS2723({
    ...STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_ACCEPTANCE_INPUT,
    consolidated_concrete_volume_m3: 18,
  });
  const rowIds = new Set(complete.rows.map((row) => row.row_id));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_FORMULAS,
    resourceDefinitions: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES,
  });
  const observedMissingParameters = new Set(
    first.preliminaryNeeds.flatMap((need) => need.missing_parameter_ids),
  );
  const assertions = {
    firstEstimateAppearsImmediately:
      first.rows.length === 3 && first.preliminaryNeeds.length === 25,
    allSixProjectConditionsRemainVisible:
      conditionParameterIds.every((parameterId) => observedMissingParameters.has(parameterId))
      && observedMissingParameters.size === conditionParameterIds.length,
    noPrematureProcurement:
      first.rows.filter((row) => row.included_in_procurement).length === 0,
    clarificationRestoresAllRows:
      complete.rows.length === 28 && complete.preliminaryNeeds.length === 0,
    completeProcurementSubset:
      complete.rows.filter((row) => row.included_in_procurement).length === 11,
    unknownPricesRemainNull:
      complete.rows.every((row) => row.unit_price == null && row.amount == null),
    independentMapComplete:
      stairsConcreteVibrationTechnicalRoomMissingRows(rowIds).length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    projectConditionControlsPresent:
      conditionControlRowIds.every((rowId) => rowIds.has(rowId)),
    automaticQuantities:
      quantity(complete.rows,
        "concrete-stairs-vibration-technical-room:03:labor:vibration-crew") === 15
      && quantity(complete.rows,
        "concrete-stairs-vibration-technical-room:03:equipment:active-vibrator") === 4
      && quantity(complete.rows,
        "concrete-stairs-vibration-technical-room:03:equipment:rental-shifts") === 1
      && quantity(complete.rows,
        "concrete-stairs-vibration-technical-room:03:material:electricity") === 3.52
      && quantity(complete.rows,
        "concrete-stairs-vibration-technical-room:04:consumable:cleaning-water") === 0.025
      && quantity(complete.rows,
        "concrete-stairs-vibration-technical-room:04:labor:cleaning") === 0.25,
    volumeChangeRecalculatesWithoutRepeatingCleaning:
      quantity(changed.rows,
        "concrete-stairs-vibration-technical-room:03:labor:vibration-crew") === 22.5
      && quantity(changed.rows,
        "concrete-stairs-vibration-technical-room:03:equipment:active-vibrator") === 6
      && quantity(changed.rows,
        "concrete-stairs-vibration-technical-room:03:material:electricity") === 5.28
      && quantity(changed.rows,
        "concrete-stairs-vibration-technical-room:04:consumable:cleaning-water") === 0.025
      && quantity(changed.rows,
        "concrete-stairs-vibration-technical-room:04:labor:cleaning") === 0.25,
    concreteSupplyNotDuplicated: !complete.rows.some((row) =>
      /concrete-(?:supply|mix)|ready-mix/iu.test(row.row_id)),
  };
  const failed = Object.entries(assertions)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(
      `STOP_S27_23_STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_CORE:${failed.join(",")}`,
    );
  }
  return {
    status: "GREEN_S27_23_STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_CORE",
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
  contract:
    "rik-expo-app.s27-23.stairs-concrete-vibration-technical-room-successor.v1",
  stopCode: "S27_23_STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM",
  applicationName: "s27-23-stairs-concrete-vibration-technical-room-successor",
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
    ?? ".release-runtime/r568/s27-23/stairs-concrete-vibration-technical-room-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-standard-s27-23.json",
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-technical-room-s27-23.json",
    "src/lib/estimate/v4/stairsConcreteVibrationStandardS2723.ts",
    "src/lib/estimate/v4/stairsConcreteVibrationContextAdapterS2723.ts",
    "src/lib/estimate/v4/stairsConcreteVibrationTechnicalRoomS2723.ts",
    "tests/estimateNorms/stairsConcreteVibrationTechnicalRoomS2723.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723StairsConcreteVibrationTechnicalRoomSuccessor.ts",
  ],
  catalogId: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_CATALOG_ID,
  sourceId: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_ID,
  normId: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_NORM_ID,
  sourceMetadata: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_METADATA,
  parameterDefinitions: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_PARAMETERS,
  formulaDefinitions: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_FORMULAS,
  resourceDefinitions: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RESOURCES,
  shortInput: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SHORT_INPUT,
  acceptanceInput: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_ACCEPTANCE_INPUT,
  runtimeProfileInput: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RUNTIME_INPUT,
  runtimeProfileClassification:
    STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds:
    STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [1, 59, 59],
  benchmarkOrdinal: 0,
  validationScenario: "S27_23_STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_12_M3",
  passport: {
    canonicalRuName:
      "виброуплотнение бетона лестницы технического помещения",
    workKey:
      "concrete_foundation_interior_stairs_concrete_vibrate_technical_room",
    physicalResultRu:
      "Уплотнённый бетон лестницы технического помещения в границах атомарной операции с явной проверкой метода, доступа, вентиляции, питания, классификации зоны, непрерывности и промывочной воды.",
    includedScopeRu: [
      "атомарная технология внутреннего виброуплотнения с отдельным владельцем контекста технического помещения",
      "видимые проектные условия метода, доступа и вентиляции, временного питания, классификации зоны, резервирования и промывочной воды",
      "автоматический труд, механизм, энергия, очистка, контроль и логистика от подтверждённого объёма",
    ],
    excludedScopeRu: [
      "поставка и укладка бетона, опалубка, армирование, отделка и уход",
      "автоматическое признание помещения влажным, взрывоопасным или замкнутым только по названию",
      "утверждение производительности вибратора производителем или ACI",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "INTERNAL_VIBRATION_OF_FRESH_STAIR_CONCRETE",
    catalogContext: "TECHNICAL_ROOM",
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    selectedPreliminaryProfile:
      STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_NORM_ID,
    sharedAtomicTechnology: true,
    projectConditionGateCount: conditionParameterIds.length,
    unknownProjectConditionsCreateVisibleNeeds: true,
    roomLabelDoesNotInferHazardClassification: true,
    firstEstimateBeforeClarification: true,
  },
  binding: {
    rowId:
      "concrete-stairs-vibration-technical-room:01:control:method-statement",
    applicability: {
      technology_class: "STAIR_CONCRETE_INTERNAL_VIBRATION_TECHNICAL_ROOM",
      source_id: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_ID,
      norm_id: STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_NORM_ID,
      exact_locator:
        STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_METADATA.exact_locator,
      quantity_basis:
        "SHARED_ATOMIC_VOLUME_CORE_GATED_BY_SIX_VISIBLE_PROJECT_CONDITIONS",
      assumption_policy:
        "ROOM_LABEL_NEVER_REPLACES_APPROVED_PROJECT_CONDITION_DOCUMENTS",
    },
  },
  locator: {
    key: "stairs-concrete-vibration-technical-room-s27-23",
    payload: {
      kind: "SHARED_ATOMIC_TECHNOLOGY_WITH_PROJECT_CONDITION_GATES",
      sourcePackSha256:
        STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_PACK_SHA256,
      independentCompletenessMap: true,
      projectConditionGateCount: conditionParameterIds.length,
      replacesGenericOneParameterFiftyNineRowProjection: true,
    },
  },
  search: {
    primaryUom: "м3",
    canonicalNameRu:
      "виброуплотнение бетона лестницы технического помещения",
    aliases: [
      "вибрирование бетона лестницы технического помещения",
      "глубинный вибратор лестница техпомещение",
      "уплотнение бетона лестницы в технической комнате",
    ],
    shortScopeRu:
      "Атомарное виброуплотнение бетона лестницы технического помещения с шестью явными проектными условиями; неизвестные условия сохраняют зависимые строки как уточнения.",
    keyDistinguishingParameters: [
      "consolidated_concrete_volume_m3",
      "technical_room_method_statement_reference",
      "technical_room_hazardous_area_classification_reference",
    ],
    clarificationFields: [...conditionParameterIds, "concrete_mix_reference", "placement_location"],
    includedBoundaries: [
      "виброуплотнение, труд, механизмы, энергия, очистка, контроль и логистика",
      "зависимые строки остаются видимыми до предоставления проектных ссылок",
    ],
    excludedBoundaries: [
      "бетонная смесь, укладка, опалубка, армирование, отделка и уход",
      "скрытые предположения о вентиляции, питании, опасной зоне или резервировании",
    ],
    extraSearchTermsRu:
      "лестница техническое помещение бетон вибрация ППР вентиляция временное питание опасная зона резервный вибратор промывочная вода",
    sourceProvenance: {
      sourcePackSha256:
        STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_S2723_SOURCE_PACK_SHA256,
      officialAciAndWackerSnapshotsReused: true,
      projectConditionReferencesRequired: true,
      firstEstimateRetainsDependentNeeds: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /concrete_(?:supply|place|finish|cure)|ready_mix/iu,
    /formwork|reinforcement|stair_design/iu,
  ],
  owner: "S27_23_STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM_SUCCESSOR",
  receiptFileStem: "S27_23_STAIRS_CONCRETE_VIBRATION_TECHNICAL_ROOM",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
