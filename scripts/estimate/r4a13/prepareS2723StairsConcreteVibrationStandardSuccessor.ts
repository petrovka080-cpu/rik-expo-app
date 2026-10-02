import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_CATALOG_ID,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_NORM_ID,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_SOURCE_IDS,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SHORT_INPUT,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_ID,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_METADATA,
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256,
  compileStairsConcreteVibrationStandardS2723,
  stairsConcreteVibrationStandardMissingRows,
} from "../../../src/lib/estimate/v4/stairsConcreteVibrationStandardS2723";
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
  STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES.map(
    (resource) => [resource.row_id, resource],
  ),
);

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256,
  entries: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((component) => component.requiredRowIds.map((rowId) => {
      const row = resourceById.get(rowId);
      const trace = (row?.source_metadata as Json | undefined)?.normativeTrace?.[0] as
        Json | undefined;
      return {
        operationId: component.semanticKey,
        expectedResourceId: rowId,
        condition: "always in the selected atomic stair-concrete internal-vibration profile",
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
  const first = await compileStairsConcreteVibrationStandardS2723({
    ...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SHORT_INPUT,
  });
  const changed = await compileStairsConcreteVibrationStandardS2723({
    ...STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
    consolidated_concrete_volume_m3: 18,
  });
  const rowIds = new Set(first.rows.map((row) => row.row_id));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS,
    resourceDefinitions: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES,
  });
  const assertions = {
    firstEstimateAppearsImmediately: first.rows.length === 22
      && first.preliminaryNeeds.length === 0,
    sixVisibleStages: new Set(first.rows.map((row) => row.section)).size === 6,
    procurementSubset: first.rows.filter((row) => row.included_in_procurement).length === 11,
    unknownPricesRemainNull: first.rows.every((row) =>
      row.unit_price == null && row.amount == null),
    independentMapComplete: stairsConcreteVibrationStandardMissingRows(rowIds).length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    volumeScope: quantity(first.rows,
      "concrete-stairs-vibration:01:control:scope-volume") === 12,
    automaticLabor: quantity(first.rows,
      "concrete-stairs-vibration:03:labor:vibration-crew") === 15,
    automaticMachineTime: quantity(first.rows,
      "concrete-stairs-vibration:03:equipment:active-vibrator") === 4,
    automaticElectricity: quantity(first.rows,
      "concrete-stairs-vibration:03:material:electricity") === 3.52,
    automaticCleaningWater: quantity(first.rows,
      "concrete-stairs-vibration:04:consumable:cleaning-water") === 0.025,
    cleaningLaborChargedOnce: quantity(first.rows,
      "concrete-stairs-vibration:04:labor:cleaning") === 0.25,
    volumeChangeRecalculates:
      quantity(changed.rows, "concrete-stairs-vibration:03:labor:vibration-crew") === 22.5
      && quantity(changed.rows, "concrete-stairs-vibration:03:equipment:active-vibrator") === 6
      && quantity(changed.rows, "concrete-stairs-vibration:03:material:electricity") === 5.28
      && quantity(changed.rows, "concrete-stairs-vibration:04:consumable:cleaning-water") === 0.025
      && quantity(changed.rows, "concrete-stairs-vibration:04:labor:cleaning") === 0.25,
    concreteSupplyNotDuplicated: !first.rows.some((row) =>
      /concrete-(?:supply|mix)|ready-mix/iu.test(row.row_id)),
  };
  const failed = Object.entries(assertions)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(`STOP_S27_23_STAIRS_CONCRETE_VIBRATION_CORE:${failed.join(",")}`);
  }
  for (const rowId of rowIds) {
    const mutated = new Set(rowIds);
    mutated.delete(rowId);
    if (!stairsConcreteVibrationStandardMissingRows(mutated).includes(rowId)) {
      throw new Error(`STOP_S27_23_STAIRS_CONCRETE_VIBRATION_REMOVAL_MUTATION:${rowId}`);
    }
  }
  return {
    status: "GREEN_S27_23_STAIRS_CONCRETE_VIBRATION_CORE",
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
  contract: "rik-expo-app.s27-23.stairs-concrete-vibration-successor.v1",
  stopCode: "S27_23_STAIRS_CONCRETE_VIBRATION",
  applicationName: "s27-23-stairs-concrete-vibration-successor",
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
    ?? ".release-runtime/r568/s27-23/stairs-concrete-vibration-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-standard-s27-23.json",
    "src/lib/estimate/v4/stairsConcreteVibrationStandardS2723.ts",
    "tests/estimateNorms/stairsConcreteVibrationStandardS2723.contract.test.ts",
    "scripts/estimate/r4a13/fetchS2723StairsConcreteVibrationSources.mjs",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723StairsConcreteVibrationStandardSuccessor.ts",
  ],
  catalogId: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_CATALOG_ID,
  sourceId: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_ID,
  normId: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_NORM_ID,
  sourceMetadata: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_METADATA,
  parameterDefinitions: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_PARAMETERS,
  formulaDefinitions: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_FORMULAS,
  resourceDefinitions: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RESOURCES,
  shortInput: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SHORT_INPUT,
  acceptanceInput: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_ACCEPTANCE_INPUT,
  runtimeProfileInput: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_INPUT,
  runtimeProfileClassification:
    STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [22, 17, 21],
  benchmarkOrdinal: 0,
  validationScenario: "S27_23_STAIRS_CONCRETE_VIBRATION_12_M3",
  passport: {
    canonicalRuName: "виброуплотнение свежеуложенного бетона лестницы",
    workKey: "concrete_foundation_interior_stairs_concrete_vibrate_standard",
    physicalResultRu:
      "Уплотнённый глубинным вибратором свежеуложенный бетон лестничного марша и площадки с учтёнными трудом, механизмом, электричеством, очисткой, контролем и логистикой.",
    includedScopeRu: [
      "проверка применимости способа и пригодности выбранной вибробулавы",
      "подготовка рабочего и резервного вибратора, электрозащиты и удлинителя",
      "автоматический расчёт труда, машино-часов, смен аренды и электроэнергии от объёма",
      "очистка оборудования, вода, расходная оснастка и сбор промывочной воды",
      "запись контроля, доставка, возврат и согласованное удаление промывочной воды",
    ],
    excludedScopeRu: [
      "поставка и укладка бетонной смеси, опалубка, армирование, отделка и уход",
      "конструктивный расчёт лестницы и выбор смеси вместо проектировщика",
      "скрытая универсальная производительность и неподтверждённые цены",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "INTERNAL_VIBRATION_OF_FRESH_STAIR_CONCRETE",
    systemClass: "ACI_309_METHOD_WACKER_IRFU45_PRELIMINARY_SELECTION",
    primaryMeasureParameterId: "consolidated_concrete_volume_m3",
    selectedPreliminaryProfile: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisibleAndEditable: true,
    approvedMethodAndEquipmentScheduleOverridePreliminaryValues: true,
    adjacentConcreteOperationsExcluded: true,
  },
  binding: {
    rowId: "concrete-stairs-vibration:03:equipment:active-vibrator",
    applicability: {
      technology_class: "STAIR_CONCRETE_INTERNAL_VIBRATION",
      source_id: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_ID,
      norm_id: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_NORM_ID,
      exact_locator: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_METADATA.exact_locator,
      quantity_basis: "CONCRETE_VOLUME_DIVIDED_BY_VISIBLE_EDITABLE_MACHINE_PRODUCTIVITY",
      assumption_policy:
        "ACI_APPLICABILITY_ONLY_PRODUCTIVITY_VISIBLE_EDITABLE_AND_REPLACEABLE_BY_APPROVED_METHOD",
    },
  },
  locator: {
    key: "stairs-concrete-vibration-standard-s27-23-balance-r2",
    payload: {
      kind: "ATOMIC_CONCRETE_TECHNOLOGY_MAP",
      sourcePackSha256: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256,
      officialAciPreview: sourcePackUrl("ACI_309_CONSOLIDATION_PREVIEW_2026_10_01"),
      officialWackerTechnicalData: sourcePackUrl("WACKER_NEUSON_IRFU_TECHNICAL_DATA_2026_10_01"),
      restoredOfficialSnapshotManifest:
        ".release-runtime/r568/s27-23/q7-stairs-concrete-vibration-official-sources/manifest.json",
      independentCompletenessMap: true,
      replacesGenericOneParameterFiftyNineRowProjection: true,
    },
  },
  search: {
    primaryUom: "м3",
    canonicalNameRu: "виброуплотнение бетона лестницы глубинным вибратором",
    aliases: [
      "вибрирование бетона лестничного марша",
      "уплотнение бетона лестницы глубинным вибратором",
      "вибратор для бетона лестничной площадки",
    ],
    shortScopeRu:
      "Атомарное виброуплотнение бетона лестницы: труд, рабочий и резервный вибратор, энергия, очистка, контроль и логистика без повторной поставки бетона.",
    keyDistinguishingParameters: [
      "consolidated_concrete_volume_m3", "approved_consolidation_method",
      "selected_vibrator_reference",
    ],
    clarificationFields: ["concrete_mix_reference", "placement_location"],
    includedBoundaries: [
      "глубинное вибрирование, труд, механизм, энергия, оснастка, очистка, контроль и логистика",
      "автоматические часы от объёма и видимой редактируемой производительности",
    ],
    excludedBoundaries: [
      "бетонная смесь, укладка, опалубка, армирование, отделка, уход и проектирование",
      "скрытая производительность ACI и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "лестница бетон вибрация глубинный вибратор булавы irfu45 aci 309 уплотнение",
    sourceProvenance: {
      sourcePackSha256: STAIRS_CONCRETE_VIBRATION_STANDARD_S2723_SOURCE_PACK_SHA256,
      officialAciSnapshotRestored: true,
      officialWackerSnapshotRestored: true,
      firstEstimateFromConcreteVolume: true,
      productivityIsVisibleAssumptionNotAciNorm: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /concrete_(?:supply|place|finish|cure)|ready_mix/iu,
    /formwork|reinforcement|stair_design/iu,
  ],
  owner: "S27_23_STAIRS_CONCRETE_VIBRATION_STANDARD_SUCCESSOR",
  receiptFileStem: "S27_23_STAIRS_CONCRETE_VIBRATION_STANDARD",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

function sourcePackUrl(sourceId: string): string | null {
  const raw = JSON.parse(readFileSync(resolve(
    "data/estimate-benchmarks/source-packs/stairs-concrete-vibration-standard-s27-23.json",
  ), "utf8")) as { sources: Array<{ sourceId: string; officialUrl: string | null }> };
  return raw.sources.find((source) => source.sourceId === sourceId)?.officialUrl ?? null;
}
