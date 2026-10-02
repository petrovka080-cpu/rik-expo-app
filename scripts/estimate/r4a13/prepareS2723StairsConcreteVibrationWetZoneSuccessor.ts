import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_CATALOG_ID,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_INDEPENDENT_COMPLETENESS_MAP,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_NORM_ID,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RUNTIME_CLASSIFICATION,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RUNTIME_INPUT,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RUNTIME_SOURCE_IDS,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SHORT_INPUT,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_ID,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_METADATA,
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
  compileStairsConcreteVibrationWetZoneS2723,
  stairsConcreteVibrationWetZoneMissingRows,
} from "../../../src/lib/estimate/v4/stairsConcreteVibrationWetZoneS2723";
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
  STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RESOURCES.map(
    (resource) => [resource.row_id, resource],
  ),
);

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
  entries: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((component) => component.requiredRowIds.map((rowId) => {
      const row = resourceById.get(rowId);
      const trace = (row?.source_metadata as Json | undefined)?.normativeTrace?.[0] as
        Json | undefined;
      return {
        operationId: component.semanticKey,
        expectedResourceId: rowId,
        condition: rowId.includes(":02:equipment:")
          ? "visible need until wet_zone_electrical_plan_reference is supplied"
          : "always in the wet-zone stair-concrete vibration profile",
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
  const first = await compileStairsConcreteVibrationWetZoneS2723({
    ...STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SHORT_INPUT,
  });
  const complete = await compileStairsConcreteVibrationWetZoneS2723({
    ...STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_ACCEPTANCE_INPUT,
  });
  const changed = await compileStairsConcreteVibrationWetZoneS2723({
    ...STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_ACCEPTANCE_INPUT,
    consolidated_concrete_volume_m3: 20,
  });
  const rowIds = new Set(complete.rows.map((row) => row.row_id));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_FORMULAS,
    resourceDefinitions: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RESOURCES,
  });
  const expectedNeeds = [
    "concrete-stairs-vibration-wet-zone:02:equipment:electrical-protection",
    "concrete-stairs-vibration-wet-zone:02:equipment:extension-cable",
  ];
  const assertions = {
    firstEstimateAppearsImmediately: first.rows.length === 24
      && first.preliminaryNeeds.length === 2,
    electricalNeedsRemainVisible: JSON.stringify(
      first.preliminaryNeeds.map((need) => need.row_id).sort(),
    ) === JSON.stringify(expectedNeeds),
    firstProcurementSubset: first.rows.filter((row) => row.included_in_procurement).length === 9,
    clarificationRestoresAllRows: complete.rows.length === 26
      && complete.preliminaryNeeds.length === 0,
    completeProcurementSubset:
      complete.rows.filter((row) => row.included_in_procurement).length === 11,
    unknownPricesRemainNull: complete.rows.every((row) =>
      row.unit_price == null && row.amount == null),
    independentMapComplete: stairsConcreteVibrationWetZoneMissingRows(rowIds).length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    manufacturerWetControlsPresent: [
      "concrete-stairs-vibration-wet-zone:02:control:ip67-class-i",
      "concrete-stairs-vibration-wet-zone:02:control:bodyguard-integrated",
      "concrete-stairs-vibration-wet-zone:02:operation:bodyguard-check",
      "concrete-stairs-vibration-wet-zone:02:control:project-electrical-plan",
    ].every((rowId) => rowIds.has(rowId)),
    automaticWetZoneQuantities:
      quantity(complete.rows, "concrete-stairs-vibration-wet-zone:03:labor:vibration-crew") === 18.75
      && quantity(complete.rows, "concrete-stairs-vibration-wet-zone:03:equipment:active-vibrator") === 5
      && quantity(complete.rows, "concrete-stairs-vibration-wet-zone:03:material:electricity") === 4.4
      && quantity(complete.rows, "concrete-stairs-vibration-wet-zone:04:consumable:cleaning-water") === 0.025
      && quantity(complete.rows, "concrete-stairs-vibration-wet-zone:04:labor:cleaning") === 0.25,
    volumeChangeRecalculates:
      quantity(changed.rows, "concrete-stairs-vibration-wet-zone:03:labor:vibration-crew") === 25
      && quantity(changed.rows, "concrete-stairs-vibration-wet-zone:03:equipment:active-vibrator") === 6.666666667
      && quantity(changed.rows, "concrete-stairs-vibration-wet-zone:03:material:electricity") === 5.866666667
      && quantity(changed.rows, "concrete-stairs-vibration-wet-zone:04:consumable:cleaning-water") === 0.025
      && quantity(changed.rows, "concrete-stairs-vibration-wet-zone:04:labor:cleaning") === 0.25,
  };
  const failed = Object.entries(assertions)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(`STOP_S27_23_STAIRS_CONCRETE_VIBRATION_WET_ZONE_CORE:${failed.join(",")}`);
  }
  return {
    status: "GREEN_S27_23_STAIRS_CONCRETE_VIBRATION_WET_ZONE_CORE",
    assertions,
    firstEstimate: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      procurementRowCount: first.rows.filter((row) => row.included_in_procurement).length,
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
  contract: "rik-expo-app.s27-23.stairs-concrete-vibration-wet-zone-successor.v1",
  stopCode: "S27_23_STAIRS_CONCRETE_VIBRATION_WET_ZONE",
  applicationName: "s27-23-stairs-concrete-vibration-wet-zone-successor",
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
    ?? ".release-runtime/r568/s27-23/stairs-concrete-vibration-wet-zone-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-standard-s27-23.json",
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-wet-zone-s27-23.json",
    "src/lib/estimate/v4/stairsConcreteVibrationStandardS2723.ts",
    "src/lib/estimate/v4/stairsConcreteVibrationContextAdapterS2723.ts",
    "src/lib/estimate/v4/stairsConcreteVibrationWetZoneS2723.ts",
    "tests/estimateNorms/stairsConcreteVibrationWetZoneS2723.contract.test.ts",
    "scripts/estimate/r4a13/fetchS2723StairsWetZoneVibrationSources.mjs",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723StairsConcreteVibrationWetZoneSuccessor.ts",
  ],
  catalogId: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_CATALOG_ID,
  sourceId: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_ID,
  normId: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_NORM_ID,
  sourceMetadata: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_METADATA,
  parameterDefinitions: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_PARAMETERS,
  formulaDefinitions: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_FORMULAS,
  resourceDefinitions: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RESOURCES,
  shortInput: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SHORT_INPUT,
  acceptanceInput: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_ACCEPTANCE_INPUT,
  runtimeProfileInput: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RUNTIME_INPUT,
  runtimeProfileClassification:
    STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [23, 17, 25],
  benchmarkOrdinal: 0,
  validationScenario: "S27_23_STAIRS_CONCRETE_VIBRATION_WET_ZONE_15_M3",
  passport: {
    canonicalRuName: "виброуплотнение бетона лестницы во влажной зоне",
    workKey: "concrete_foundation_interior_stairs_concrete_vibrate_wet_zone",
    physicalResultRu:
      "Уплотнённый бетон лестницы во влажной зоне с полным атомарным составом и явным контролем IP67, защитного заземления, Bodyguard и проектной схемы временного питания.",
    includedScopeRu: [
      "общая атомарная технология виброуплотнения с отдельным владельцем влажной зоны",
      "проверка IP67, класса I, Bodyguard, кабеля, вилки и защитного проводника",
      "видимые зависимые строки электрозащиты и удлинителя до уточнения проектной схемы",
      "автоматический труд, механизм, энергия, очистка, контроль и логистика от объёма",
    ],
    excludedScopeRu: [
      "поставка и укладка бетона, опалубка, армирование, отделка и уход",
      "утверждение, что IP67 или Bodyguard отменяют проектную схему временного электроснабжения",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "INTERNAL_VIBRATION_OF_FRESH_STAIR_CONCRETE",
    catalogContext: "WET_ZONE",
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    selectedPreliminaryProfile: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_NORM_ID,
    sharedAtomicTechnology: true,
    wetZoneElectricalControlsAdded: true,
    unknownElectricalPlanCreatesVisibleNeeds: true,
    firstEstimateBeforeOptionalClarification: true,
  },
  binding: {
    rowId: "concrete-stairs-vibration-wet-zone:02:control:bodyguard-integrated",
    applicability: {
      technology_class: "STAIR_CONCRETE_INTERNAL_VIBRATION_WET_ZONE",
      source_id: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_ID,
      norm_id: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_NORM_ID,
      exact_locator: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_METADATA.exact_locator,
      quantity_basis: "ONE_EQUIPMENT_CONTROL_SCOPE_PER_SELECTED_WET_ZONE_PROFILE",
      assumption_policy: "MANUFACTURER_FACTS_DO_NOT_REPLACE_PROJECT_TEMPORARY_ELECTRICAL_PLAN",
    },
  },
  locator: {
    key: "stairs-concrete-vibration-wet-zone-s27-23-balance-r2",
    payload: {
      kind: "SHARED_ATOMIC_TECHNOLOGY_WITH_WET_ZONE_CONTROLS",
      sourcePackSha256: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
      restoredOfficialSnapshotManifest:
        ".release-runtime/r568/s27-23/q7-stairs-wet-zone-vibration-official-sources/manifest.json",
      independentCompletenessMap: true,
      replacesGenericOneParameterFiftyNineRowProjection: true,
    },
  },
  search: {
    primaryUom: "м3",
    canonicalNameRu: "виброуплотнение бетона лестницы во влажной зоне",
    aliases: [
      "вибрирование бетона лестницы влажная зона",
      "вибратор ip67 лестница бетон",
      "bodyguard вибратор бетон влажная зона",
    ],
    shortScopeRu:
      "Влажная зона: атомарное виброуплотнение с IP67, классом I, Bodyguard и видимой зависимостью от проектной схемы питания.",
    keyDistinguishingParameters: [
      "consolidated_concrete_volume_m3", "selected_vibrator_reference",
      "wet_zone_electrical_plan_reference",
    ],
    clarificationFields: [
      "wet_zone_electrical_plan_reference", "concrete_mix_reference", "placement_location",
    ],
    includedBoundaries: [
      "вибрирование, электрические проверки, труд, механизм, энергия, очистка и логистика",
      "зависимые электрические строки остаются видимыми до уточнения схемы",
    ],
    excludedBoundaries: [
      "бетонная смесь, укладка, опалубка, армирование, отделка и уход",
      "подмена проекта временного электроснабжения паспортом оборудования",
    ],
    extraSearchTermsRu:
      "лестница влажная зона бетон вибрация irfu45 ip67 bodyguard защитное заземление",
    sourceProvenance: {
      sourcePackSha256: STAIRS_CONCRETE_VIBRATION_WET_ZONE_S2723_SOURCE_PACK_SHA256,
      officialAciAndWackerSnapshotsRestored: true,
      manufacturerWetEnvironmentFactsExplicit: true,
      firstEstimateRetainsElectricalNeeds: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /concrete_(?:supply|place|finish|cure)|ready_mix/iu,
    /formwork|reinforcement|stair_design/iu,
  ],
  owner: "S27_23_STAIRS_CONCRETE_VIBRATION_WET_ZONE_SUCCESSOR",
  receiptFileStem: "S27_23_STAIRS_CONCRETE_VIBRATION_WET_ZONE",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
