import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_CATALOG_ID,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_INDEPENDENT_COMPLETENESS_MAP,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_NORM_ID,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RUNTIME_CLASSIFICATION,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RUNTIME_INPUT,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RUNTIME_SOURCE_IDS,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SHORT_INPUT,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_ID,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_METADATA,
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256,
  compileStairsConcreteVibrationSmallAreaS2723,
  stairsConcreteVibrationSmallAreaMissingRows,
} from "../../../src/lib/estimate/v4/stairsConcreteVibrationSmallAreaS2723";
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
  STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RESOURCES.map(
    (resource) => [resource.row_id, resource],
  ),
);

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256,
  entries: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((component) => component.requiredRowIds.map((rowId) => {
      const row = resourceById.get(rowId);
      const trace = (row?.source_metadata as Json | undefined)?.normativeTrace?.[0] as
        Json | undefined;
      return {
        operationId: component.semanticKey,
        expectedResourceId: rowId,
        condition: "always in the shared atomic technology under the small-area catalog context",
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
  const first = await compileStairsConcreteVibrationSmallAreaS2723({
    ...STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SHORT_INPUT,
  });
  const changed = await compileStairsConcreteVibrationSmallAreaS2723({
    ...STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_ACCEPTANCE_INPUT,
    consolidated_concrete_volume_m3: 6,
  });
  const rowIds = new Set(first.rows.map((row) => row.row_id));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_FORMULAS,
    resourceDefinitions: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RESOURCES,
  });
  const assertions = {
    firstEstimateAppearsImmediately: first.rows.length === 22
      && first.preliminaryNeeds.length === 0,
    procurementSubset: first.rows.filter((row) => row.included_in_procurement).length === 11,
    distinctVariantOwner: first.rows.every((row) =>
      row.row_id.startsWith("concrete-stairs-vibration-small-area:")),
    unknownPricesRemainNull: first.rows.every((row) =>
      row.unit_price == null && row.amount == null),
    independentMapComplete: stairsConcreteVibrationSmallAreaMissingRows(rowIds).length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    automaticSmallAreaQuantities:
      quantity(first.rows, "concrete-stairs-vibration-small-area:03:labor:vibration-crew") === 3.75
      && quantity(first.rows, "concrete-stairs-vibration-small-area:03:equipment:active-vibrator") === 1
      && quantity(first.rows, "concrete-stairs-vibration-small-area:03:material:electricity") === 0.88
      && quantity(first.rows, "concrete-stairs-vibration-small-area:04:consumable:cleaning-water") === 0.025
      && quantity(first.rows, "concrete-stairs-vibration-small-area:04:labor:cleaning") === 0.25,
    volumeChangeRecalculates:
      quantity(changed.rows, "concrete-stairs-vibration-small-area:03:labor:vibration-crew") === 7.5
      && quantity(changed.rows, "concrete-stairs-vibration-small-area:03:equipment:active-vibrator") === 2
      && quantity(changed.rows, "concrete-stairs-vibration-small-area:03:material:electricity") === 1.76
      && quantity(changed.rows, "concrete-stairs-vibration-small-area:04:consumable:cleaning-water") === 0.025
      && quantity(changed.rows, "concrete-stairs-vibration-small-area:04:labor:cleaning") === 0.25,
    concreteSupplyNotDuplicated: !first.rows.some((row) =>
      /concrete-(?:supply|mix)|ready-mix/iu.test(row.row_id)),
  };
  const failed = Object.entries(assertions)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(`STOP_S27_23_STAIRS_CONCRETE_VIBRATION_SMALL_AREA_CORE:${failed.join(",")}`);
  }
  return {
    status: "GREEN_S27_23_STAIRS_CONCRETE_VIBRATION_SMALL_AREA_CORE",
    assertions,
    firstEstimate: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      procurementRowCount: first.rows.filter((row) => row.included_in_procurement).length,
    },
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ first, changed })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-23.stairs-concrete-vibration-small-area-successor.v1",
  stopCode: "S27_23_STAIRS_CONCRETE_VIBRATION_SMALL_AREA",
  applicationName: "s27-23-stairs-concrete-vibration-small-area-successor",
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
    ?? ".release-runtime/r568/s27-23/stairs-concrete-vibration-small-area-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-standard-s27-23.json",
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-small-area-s27-23.json",
    "src/lib/estimate/v4/stairsConcreteVibrationStandardS2723.ts",
    "src/lib/estimate/v4/stairsConcreteVibrationSmallAreaS2723.ts",
    "tests/estimateNorms/stairsConcreteVibrationSmallAreaS2723.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723StairsConcreteVibrationSmallAreaSuccessor.ts",
  ],
  catalogId: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_CATALOG_ID,
  sourceId: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_ID,
  normId: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_NORM_ID,
  sourceMetadata: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_METADATA,
  parameterDefinitions: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_PARAMETERS,
  formulaDefinitions: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_FORMULAS,
  resourceDefinitions: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RESOURCES,
  shortInput: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SHORT_INPUT,
  acceptanceInput: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_ACCEPTANCE_INPUT,
  runtimeProfileInput: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RUNTIME_INPUT,
  runtimeProfileClassification:
    STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds:
    STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [22, 17, 21],
  benchmarkOrdinal: 0,
  validationScenario: "S27_23_STAIRS_CONCRETE_VIBRATION_SMALL_AREA_3_M3",
  passport: {
    canonicalRuName: "виброуплотнение бетона малой захватки лестницы",
    workKey: "concrete_foundation_interior_stairs_concrete_vibrate_small_area",
    physicalResultRu:
      "Уплотнённый бетон малой захватки лестницы с рассчитанными трудом, механизмом, энергией, очисткой, контролем и логистикой.",
    includedScopeRu: [
      "общая атомарная технология глубинного вибрирования в отдельном контексте малой захватки",
      "рабочий и резервный вибратор, электрическая оснастка и энергия",
      "автоматический расчёт труда, машино-часов, очистки, контроля и логистики от объёма",
    ],
    excludedScopeRu: [
      "поставка и укладка бетона, опалубка, армирование, отделка и уход",
      "отдельная выдуманная норма ACI для малого участка и неподтверждённые цены",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "INTERNAL_VIBRATION_OF_FRESH_STAIR_CONCRETE",
    catalogContext: "SMALL_AREA",
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    selectedPreliminaryProfile: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_NORM_ID,
    sharedAtomicTechnology: true,
    distinctCatalogOwner: true,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisibleAndEditable: true,
  },
  binding: {
    rowId: "concrete-stairs-vibration-small-area:03:equipment:active-vibrator",
    applicability: {
      technology_class: "STAIR_CONCRETE_INTERNAL_VIBRATION",
      catalog_context: "SMALL_AREA",
      source_id: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_ID,
      norm_id: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_NORM_ID,
      exact_locator: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_METADATA.exact_locator,
      quantity_basis: "SMALL_AREA_CONCRETE_VOLUME_DIVIDED_BY_VISIBLE_MACHINE_PRODUCTIVITY",
      assumption_policy: "SHARED_METHOD_VISIBLE_ASSUMPTIONS_CONTEXT_DOES_NOT_CREATE_NEW_NORM",
    },
  },
  locator: {
    key: "stairs-concrete-vibration-small-area-s27-23-balance-r2",
    payload: {
      kind: "SHARED_ATOMIC_TECHNOLOGY_CONTEXT",
      sourcePackSha256: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256,
      sharedTechnologySourcePackSha256:
        "f2c4cc4f7c11e366a7a388781f19276b7c5248fa4572e930afd38813e3ccd11a",
      independentCompletenessMap: true,
      replacesGenericOneParameterFiftyNineRowProjection: true,
    },
  },
  search: {
    primaryUom: "м3",
    canonicalNameRu: "виброуплотнение бетона малой захватки лестницы",
    aliases: [
      "вибрирование бетона лестницы малая площадь",
      "вибратор бетона малой лестничной площадки",
      "уплотнение малой захватки лестницы",
    ],
    shortScopeRu:
      "Малая захватка лестницы: общая атомарная технология виброуплотнения без повторной поставки бетона.",
    keyDistinguishingParameters: [
      "consolidated_concrete_volume_m3", "approved_consolidation_method",
      "selected_vibrator_reference",
    ],
    clarificationFields: ["concrete_mix_reference", "placement_location"],
    includedBoundaries: [
      "вибрирование, труд, механизм, энергия, очистка, контроль и логистика",
      "отдельный малый контекст при общем расчётном ядре",
    ],
    excludedBoundaries: [
      "бетонная смесь, укладка, опалубка, армирование, отделка и уход",
      "искусственная отдельная производительность только из-за названия варианта",
    ],
    extraSearchTermsRu:
      "лестница малая площадь бетон вибрация глубинный вибратор irfu45 aci 309",
    sourceProvenance: {
      sourcePackSha256: STAIRS_CONCRETE_VIBRATION_SMALL_AREA_S2723_SOURCE_PACK_SHA256,
      sharedAtomicTechnology: true,
      distinctCatalogContext: true,
      firstEstimateFromConcreteVolume: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /concrete_(?:supply|place|finish|cure)|ready_mix/iu,
    /formwork|reinforcement|stair_design/iu,
  ],
  owner: "S27_23_STAIRS_CONCRETE_VIBRATION_SMALL_AREA_SUCCESSOR",
  receiptFileStem: "S27_23_STAIRS_CONCRETE_VIBRATION_SMALL_AREA",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
