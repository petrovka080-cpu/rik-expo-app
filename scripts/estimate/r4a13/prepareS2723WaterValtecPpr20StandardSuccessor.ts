import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
  WATER_VALTEC_PPR20_STANDARD_S2723_CATALOG_ID,
  WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS,
  WATER_VALTEC_PPR20_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP,
  WATER_VALTEC_PPR20_STANDARD_S2723_NORM_ID,
  WATER_VALTEC_PPR20_STANDARD_S2723_PARAMETERS,
  WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES,
  WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT,
  WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_SOURCE_IDS,
  WATER_VALTEC_PPR20_STANDARD_S2723_SHORT_INPUT,
  WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_ID,
  WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_METADATA,
  WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
  compileWaterValtecPpr20StandardS2723,
  waterValtecPpr20StandardMissingRows,
} from "../../../src/lib/estimate/v4/waterValtecPpr20StandardS2723";
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
  WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES.map((resource) => [resource.row_id, resource]),
);

const conditionByPrefix: readonly [string, string][] = [
  ["water-ppr20:04:", "straight_coupling_count supplied from route layout; zero confirms not applicable"],
  ["water-ppr20:05:component:elbow", "elbow_count supplied; zero confirms not applicable"],
  ["water-ppr20:05:operation:elbow", "elbow_count supplied; zero confirms not applicable"],
  ["water-ppr20:05:component:tee", "tee_count supplied; zero confirms not applicable"],
  ["water-ppr20:05:operation:tee", "tee_count supplied; zero confirms not applicable"],
  ["water-ppr20:05:component:threaded", "threaded_transition_count supplied; zero confirms not applicable"],
  ["water-ppr20:05:operation:threaded", "threaded_transition_count supplied; zero confirms not applicable"],
  ["water-ppr20:05:component:terminal", "terminal_cap_count supplied; zero confirms not applicable"],
  ["water-ppr20:05:operation:terminal", "terminal_cap_count supplied; zero confirms not applicable"],
];

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
  entries: WATER_VALTEC_PPR20_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((component) => component.requiredRowIds.map((rowId) => {
      const row = resourceById.get(rowId);
      const trace = (row?.source_metadata as Json | undefined)?.normativeTrace?.[0] as
        Json | undefined;
      return {
        operationId: component.semanticKey,
        expectedResourceId: rowId,
        condition: conditionByPrefix.find(([prefix]) => rowId.startsWith(prefix))?.[1]
          ?? "always in selected VALTEC PP-R 20 standard internal-water profile",
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
  const first = await compileWaterValtecPpr20StandardS2723({
    ...WATER_VALTEC_PPR20_STANDARD_S2723_SHORT_INPUT,
  });
  const complete = await compileWaterValtecPpr20StandardS2723({
    ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
  });
  const changed = await compileWaterValtecPpr20StandardS2723({
    ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
    route_length_m: 130,
  });
  const changedNodes = await compileWaterValtecPpr20StandardS2723({
    ...WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
    elbow_count: 10,
  });
  const rowIds = new Set(complete.rows.map((row) => row.row_id));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS,
    resourceDefinitions: WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES,
  });
  const assertions = {
    firstEstimateAppearsImmediately:
      first.rows.length === 34 && first.preliminaryNeeds.length === 18,
    firstEstimateHasProcurement:
      first.rows.filter((row) => row.included_in_procurement).length === 12,
    unknownRouteNodesRemainVisible: first.preliminaryNeeds.every((need) =>
      /water-ppr20:(?:04|05|06:labor:straight-fusion)/u.test(need.row_id)),
    completeInputHasAllRows: complete.rows.length === 52 && complete.preliminaryNeeds.length === 0,
    eightVisibleStages: new Set(complete.rows.map((row) => row.section)).size === 8,
    procurementSubset: complete.rows.filter((row) => row.included_in_procurement).length === 21,
    unknownPricesRemainNull: complete.rows.every((row) =>
      row.unit_price == null && row.amount == null),
    independentMapComplete: waterValtecPpr20StandardMissingRows(rowIds).length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    pipeSections: quantity(complete.rows, "water-ppr20:02:material:pipe-sections") === 27,
    pipeOrderM: quantity(complete.rows, "water-ppr20:02:control:pipe-order") === 108,
    pipeRemainderM: quantity(complete.rows, "water-ppr20:02:control:pipe-remainder") === 3,
    supportPoints: quantity(complete.rows, "water-ppr20:03:fastener:support-points") === 201,
    straightCouplings:
      quantity(complete.rows, "water-ppr20:04:component:straight-couplings") === 24,
    totalFusionBalance:
      quantity(complete.rows, "water-ppr20:04:operation:socket-fusion") === 48
      && quantity(complete.rows, "water-ppr20:05:control:total-fusion-sockets") === 76
      && quantity(complete.rows, "water-ppr20:04:equipment:fusion-machine") === 3.223333333
      && quantity(complete.rows, "water-ppr20:06:labor:straight-fusion") === 4
      && quantity(complete.rows, "water-ppr20:05:labor:node-installation") === 1.6,
    pressureTestRule: quantity(complete.rows, "water-ppr20:07:control:test-pressure") === 6,
    flushingWater: quantity(complete.rows, "water-ppr20:07:material:flushing-water") === 0.0411,
    routeChangeRecalculates:
      quantity(changed.rows, "water-ppr20:02:material:pipe-sections") === 35
      && quantity(changed.rows, "water-ppr20:02:control:pipe-order") === 140
      && quantity(changed.rows, "water-ppr20:03:fastener:support-points") === 261
      && quantity(changed.rows, "water-ppr20:06:labor:route-installation") === 32.5
      && quantity(changed.rows, "water-ppr20:07:operation:pressure-test") === 2,
    nodeChangeRecalculatesAllFusionConsumers:
      quantity(changedNodes.rows, "water-ppr20:05:control:total-fusion-sockets") === 80
      && quantity(changedNodes.rows, "water-ppr20:04:equipment:fusion-machine") === 3.366666667
      && quantity(changedNodes.rows, "water-ppr20:05:consumable:cleaning-wipes") === 32
      && quantity(changedNodes.rows, "water-ppr20:05:labor:node-installation") === 1.8
      && quantity(changedNodes.rows, "water-ppr20:02:control:pipe-order") === 108,
  };
  const failed = Object.entries(assertions).filter(([, value]) => !value).map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(`STOP_S27_23_WATER_VALTEC_PPR20_STANDARD_CORE:${failed.join(",")}`);
  }
  for (const rowId of rowIds) {
    const mutated = new Set(rowIds);
    mutated.delete(rowId);
    if (!waterValtecPpr20StandardMissingRows(mutated).includes(rowId)) {
      throw new Error(`STOP_S27_23_WATER_VALTEC_PPR20_REMOVAL_MUTATION:${rowId}`);
    }
  }
  return {
    status: "GREEN_S27_23_WATER_VALTEC_PPR20_STANDARD_CORE",
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
  contract: "rik-expo-app.s27-23.water-valtec-ppr20-standard-successor.v1",
  stopCode: "S27_23_WATER_VALTEC_PPR20_STANDARD",
  applicationName: "s27-23-water-valtec-ppr20-standard-successor",
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
    ?? ".release-runtime/r568/s27-23/water-valtec-ppr20-standard-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/water-valtec-ppr20-standard-s27-23.json",
    "src/lib/estimate/v4/waterValtecPpr20StandardS2723.ts",
    "tests/estimateNorms/waterValtecPpr20StandardS2723.contract.test.ts",
    "scripts/estimate/r4a13/fetchS2723ValtecPprSources.mjs",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723WaterValtecPpr20StandardSuccessor.ts",
  ],
  catalogId: WATER_VALTEC_PPR20_STANDARD_S2723_CATALOG_ID,
  sourceId: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_ID,
  normId: WATER_VALTEC_PPR20_STANDARD_S2723_NORM_ID,
  sourceMetadata: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_METADATA,
  parameterDefinitions: WATER_VALTEC_PPR20_STANDARD_S2723_PARAMETERS,
  formulaDefinitions: WATER_VALTEC_PPR20_STANDARD_S2723_FORMULAS,
  resourceDefinitions: WATER_VALTEC_PPR20_STANDARD_S2723_RESOURCES,
  shortInput: WATER_VALTEC_PPR20_STANDARD_S2723_SHORT_INPUT,
  acceptanceInput: WATER_VALTEC_PPR20_STANDARD_S2723_ACCEPTANCE_INPUT,
  runtimeProfileInput: WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_INPUT,
  runtimeProfileClassification: WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WATER_VALTEC_PPR20_STANDARD_S2723_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [35, 37, 51],
  benchmarkOrdinal: 0,
  validationScenario: "S27_23_WATER_VALTEC_PPR20_STANDARD_100_M",
  passport: {
    canonicalRuName: "монтаж внутреннего трубопровода VALTEC PP-R 20 мм в стандартной зоне",
    workKey: "plumbing_interior_ppr_pipe_install_standard",
    physicalResultRu:
      "Смонтированная открытая внутренняя трасса ХВС из трубы VALTEC PP-R PN25 20x3,4 мм с проектными фитингами и опорами, испытанная и промытая.",
    includedScopeRu: [
      "обмер и разметка трассы, проверка применимости выбранной системы",
      "труба, резерв, четырёхметровые отрезки, заказ, остаток, масса и раскрой",
      "опоры, крепёж, сверление, расходная оснастка, труд и механизмы",
      "прямые муфты, повороты, ответвления, переходы и окончания по фактической раскладке",
      "полифузионная сварка, гидравлическое испытание, промывка и контролируемый слив",
      "доставка, уборка, вывоз отходов и итоговый контроль",
    ],
    excludedScopeRu: [
      "гидравлический расчёт и подбор диаметра вместо проектировщика",
      "подключённые приборы, арматура, счётчики и оборудование",
      "теплоизоляция, проходки, огнезаделка, скрытая прокладка и восстановление отделки",
      "неподтверждённые цены и выдуманные повороты или ответвления",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "INTERNAL_PPR_COLD_WATER_ROUTE_INSTALLATION",
    systemClass: "VALTEC_VTP700_PPR_PN25_20X3_4_STANDARD_OPEN_PRELIMINARY",
    primaryMeasureParameterId: "route_length_m",
    selectedPreliminaryProfile: WATER_VALTEC_PPR20_STANDARD_S2723_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    unknownRouteNodesCreateVisibleDependentNeeds: true,
    profileAssumptionsVisibleAndEditable: true,
    hydraulicDesignAndAdjacentSystemsExcluded: true,
  },
  binding: {
    rowId: "water-ppr20:02:material:pipe-sections",
    applicability: {
      technology_class: "VALTEC_PPR20_INTERNAL_COLD_WATER_ROUTE",
      source_id: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_ID,
      norm_id: WATER_VALTEC_PPR20_STANDARD_S2723_NORM_ID,
      exact_locator: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_METADATA.exact_locator,
      quantity_basis: "ROUTE_LENGTH_X_VISIBLE_RESERVE_ROUNDED_TO_4_M_MANUFACTURER_SECTIONS",
      assumption_policy: "VISIBLE_EDITABLE_AND_REPLACEABLE_BY_PROJECT_ROUTE_SUBSTRATE_AND_METHOD",
    },
  },
  locator: {
    key: "water-valtec-ppr20-standard-s27-23-balance-r2",
    payload: {
      kind: "MANUFACTURER_SYSTEM_TECHNOLOGY_MAP",
      sourcePackSha256: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
      officialManufacturerPassport: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_METADATA.official_url,
      restoredOfficialSnapshotManifest:
        ".release-runtime/r568/s27-23/q5-valtec-ppr-official-sources/manifest.json",
      independentCompletenessMap: true,
      replacesGenericOneParameterSixtyThreeRowProjection: true,
    },
  },
  search: {
    primaryUom: "м",
    canonicalNameRu: "монтаж внутреннего трубопровода VALTEC PP-R 20 мм в стандартной зоне",
    aliases: [
      "монтаж трубы ппр 20 мм 100 м",
      "прокладка внутреннего водопровода valtec ppr",
      "монтаж полипропиленового трубопровода хвс",
    ],
    shortScopeRu:
      "Открытая внутренняя трасса ХВС VALTEC PP-R PN25 20x3,4 мм: труба, опоры, фитинги по раскладке, сварка, испытание и промывка.",
    keyDistinguishingParameters: ["route_length_m", "selected_system_reference", "service_profile"],
    clarificationFields: [
      "straight_coupling_count", "elbow_count", "tee_count",
      "threaded_transition_count", "terminal_cap_count",
    ],
    includedBoundaries: [
      "трасса, труба, опоры, фитинги, расходники, труд, механизмы, испытание, промывка и логистика",
      "автоматические количества от длины и отдельные факты раскладки без скрытых догадок",
    ],
    excludedBoundaries: [
      "приборы, арматура, изоляция, проходки, огнезаделка и строительное восстановление",
      "скрытые универсальные нормы производительности и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "ppr pp-r полипропиленовая труба водопровод хвс valtec vtp700 20 3.4 муфта сварка",
    sourceProvenance: {
      sourcePackSha256: WATER_VALTEC_PPR20_STANDARD_S2723_SOURCE_PACK_SHA256,
      officialValtecSnapshotsRestored: true,
      officialKgWaterSnapshotsRestored: true,
      firstEstimateFromRouteLength: true,
      fittingCountsNeverInferredFromLength: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /fixture|water_meter|valve_install|thermal_insulation/iu,
    /firestop|penetration|concealed_finish/iu,
  ],
  owner: "S27_23_WATER_VALTEC_PPR20_STANDARD_SUCCESSOR",
  receiptFileStem: "S27_23_WATER_VALTEC_PPR20_STANDARD",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
