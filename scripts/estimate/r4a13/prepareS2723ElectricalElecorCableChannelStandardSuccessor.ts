import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_CATALOG_ID,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_FORMULAS,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_NORM_ID,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_PARAMETERS,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_INPUT,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_SOURCE_IDS,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SHORT_INPUT,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_ID,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_METADATA,
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
  compileElectricalElecorCableChannelStandardS2723,
  electricalElecorCableChannelStandardMissingRows,
} from "../../../src/lib/estimate/v4/electricalElecorCableChannelStandardS2723";
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
  ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES.map((resource) => [
    resource.row_id,
    resource,
  ]),
);

const conditionByPrefix: readonly [string, string][] = [
  ["electrical-elecor:05:component:inner-corner", "inner_corner_count supplied; zero confirms not applicable"],
  ["electrical-elecor:05:operation:inner-corner", "inner_corner_count supplied; zero confirms not applicable"],
  ["electrical-elecor:05:component:outer-corner", "outer_corner_count supplied; zero confirms not applicable"],
  ["electrical-elecor:05:operation:outer-corner", "outer_corner_count supplied; zero confirms not applicable"],
  ["electrical-elecor:05:component:flat-angle", "flat_angle_count supplied; zero confirms not applicable"],
  ["electrical-elecor:05:operation:flat-angle", "flat_angle_count supplied; zero confirms not applicable"],
  ["electrical-elecor:05:component:tee", "tee_count supplied; zero confirms not applicable"],
  ["electrical-elecor:05:operation:tee", "tee_count supplied; zero confirms not applicable"],
  ["electrical-elecor:05:component:end-cap", "open_end_count supplied; zero confirms not applicable"],
  ["electrical-elecor:05:operation:end-cap", "open_end_count supplied; zero confirms not applicable"],
];

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
  entries: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((component) => component.requiredRowIds.map((rowId) => {
      const row = resourceById.get(rowId);
      const trace = (row?.source_metadata as Json | undefined)?.normativeTrace?.[0] as
        Json | undefined;
      return {
        operationId: component.semanticKey,
        expectedResourceId: rowId,
        condition: conditionByPrefix.find(([prefix]) => rowId.startsWith(prefix))?.[1]
          ?? "always in selected IEK ELECOR 40x25 standard installation profile",
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
  const first = await compileElectricalElecorCableChannelStandardS2723({
    ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SHORT_INPUT,
  });
  const complete = await compileElectricalElecorCableChannelStandardS2723({
    ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
  });
  const changed = await compileElectricalElecorCableChannelStandardS2723({
    ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
    route_length_m: 130,
  });
  const repacked = await compileElectricalElecorCableChannelStandardS2723({
    ...ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
    channel_transport_pack_m: 25,
  });
  const rowIds = new Set(complete.rows.map((row) => row.row_id));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_FORMULAS,
    resourceDefinitions: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES,
  });
  const expectedNeeds = [
    "electrical-elecor:05:component:inner-corner-sets",
    "electrical-elecor:05:component:outer-corner-sets",
    "electrical-elecor:05:component:flat-angle-sets",
    "electrical-elecor:05:component:tee-sets",
    "electrical-elecor:05:component:end-cap-sets",
    "electrical-elecor:05:operation:inner-corners",
    "electrical-elecor:05:operation:outer-corners",
    "electrical-elecor:05:operation:flat-angles",
    "electrical-elecor:05:operation:tees",
    "electrical-elecor:05:operation:end-caps",
  ].sort();
  const assertions = {
    firstEstimateAppearsImmediately: first.rows.length === 31,
    unknownNodesRemainVisible:
      JSON.stringify(first.preliminaryNeeds.map((need) => need.row_id).sort())
      === JSON.stringify(expectedNeeds),
    completeInputHasAllRows: complete.rows.length === 41 && complete.preliminaryNeeds.length === 0,
    sevenVisibleStages: new Set(complete.rows.map((row) => row.section)).size === 7,
    procurementSubset: complete.rows.filter((row) => row.included_in_procurement).length === 15,
    unknownPricesRemainNull: complete.rows.every((row) =>
      row.unit_price == null && row.amount == null),
    independentMapComplete:
      electricalElecorCableChannelStandardMissingRows(rowIds).length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    channelPacks: quantity(complete.rows, "electrical-elecor:02:material:channel-packs") === 5,
    channelOrderM: quantity(complete.rows, "electrical-elecor:02:control:channel-order") === 120,
    channelRemainderM: quantity(complete.rows, "electrical-elecor:02:control:channel-remainder") === 15,
    installedSections: quantity(complete.rows, "electrical-elecor:02:operation:cutting") === 50,
    fastenerPoints: quantity(complete.rows, "electrical-elecor:03:fastener:points") === 201,
    fastenerPackages: quantity(complete.rows, "electrical-elecor:03:fastener:packages") === 3,
    straightConnectorSets:
      quantity(complete.rows, "electrical-elecor:04:component:straight-connectors-net") === 49
      && quantity(complete.rows, "electrical-elecor:04:component:straight-connector-sets") === 13
      && quantity(complete.rows, "electrical-elecor:04:control:straight-connector-order") === 52
      && quantity(complete.rows, "electrical-elecor:04:control:straight-connector-remainder") === 3,
    nodeAccessorySets: [
      "electrical-elecor:05:component:inner-corner-sets",
      "electrical-elecor:05:component:outer-corner-sets",
      "electrical-elecor:05:component:flat-angle-sets",
      "electrical-elecor:05:component:tee-sets",
      "electrical-elecor:05:component:end-cap-sets",
    ].every((rowId) => quantity(complete.rows, rowId) === 1),
    routeChangeRecalculates:
      quantity(changed.rows, "electrical-elecor:02:material:channel-packs") === 6
      && quantity(changed.rows, "electrical-elecor:03:fastener:points") === 261
      && quantity(changed.rows, "electrical-elecor:04:component:straight-connector-sets") === 16,
    transportPackDoesNotChangeInstalledJoints:
      quantity(repacked.rows, "electrical-elecor:02:control:channel-order") === 125
      && quantity(repacked.rows, "electrical-elecor:04:component:straight-connectors-net") === 49
      && quantity(repacked.rows, "electrical-elecor:04:component:straight-connector-sets") === 13,
  };
  const failed = Object.entries(assertions).filter(([, value]) => !value).map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(`STOP_S27_23_ELECTRICAL_ELECOR_CABLE_CHANNEL_CORE:${failed.join(",")}`);
  }
  for (const rowId of rowIds) {
    const mutated = new Set(rowIds);
    mutated.delete(rowId);
    if (!electricalElecorCableChannelStandardMissingRows(mutated).includes(rowId)) {
      throw new Error(`STOP_S27_23_ELECTRICAL_ELECOR_REMOVAL_MUTATION:${rowId}`);
    }
  }
  return {
    status: "GREEN_S27_23_ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_CORE",
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
    serializedSha256: createHash("sha256").update(JSON.stringify({ first, complete, changed })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-23.electrical-elecor-cable-channel-standard-successor.v1",
  stopCode: "S27_23_ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD",
  applicationName: "s27-23-electrical-elecor-cable-channel-standard-successor",
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
    ?? ".release-runtime/r568/s27-23/electrical-elecor-cable-channel-standard-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/electrical-elecor-cable-channel-standard-s27-23.json",
    "src/lib/estimate/v4/electricalElecorCableChannelStandardS2723.ts",
    "tests/estimateNorms/electricalElecorCableChannelStandardS2723.contract.test.ts",
    "scripts/estimate/r4a13/fetchS2723IekCableChannelSources.mjs",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723ElectricalElecorCableChannelStandardSuccessor.ts",
  ],
  catalogId: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_CATALOG_ID,
  sourceId: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_ID,
  normId: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_NORM_ID,
  sourceMetadata: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_METADATA,
  parameterDefinitions: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_PARAMETERS,
  formulaDefinitions: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_FORMULAS,
  resourceDefinitions: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RESOURCES,
  shortInput: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SHORT_INPUT,
  acceptanceInput: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_ACCEPTANCE_INPUT,
  runtimeProfileInput: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_INPUT,
  runtimeProfileClassification:
    ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds:
    ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [22, 33, 41],
  benchmarkOrdinal: 0,
  validationScenario: "S27_23_ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_100_M",
  passport: {
    canonicalRuName: "монтаж кабель-канала IEK ELECOR 40×25 в стандартной зоне",
    workKey: "electrical_interior_cable_channel_install_standard",
    physicalResultRu:
      "Смонтированная открытая трасса кабель-канала IEK ELECOR 40×25 с совместимыми прямыми соединителями и подтверждёнными узловыми аксессуарами, закреплённая к фактическому основанию и закрытая крышкой.",
    includedScopeRu: [
      "обмер и разметка трассы, проверка основания и заполнения выбранного сечения",
      "кабель-канал CKK10-040-025-1-K01, резерв раскроя, упаковки по 24 м, заказ и остаток",
      "прямые соединители КМС и совместимые КМВ/КМН/КМП/КМТ/КМЗ по фактическим узлам",
      "крепёж к выбранному основанию, сверление, резка, оснастка, труд и механизмы",
      "доставка, уборка, вывоз отходов и итоговый контроль",
      "узловые аксессуары остаются видимыми уточнениями, пока раскладка не задана",
    ],
    excludedScopeRu: [
      "силовой или слаботочный кабель, его протяжка, разделка и подключение",
      "розетки, выключатели, автоматы, щиты и иные электроустановочные изделия",
      "проходки и огнезаделка, скрытая прокладка и огнестойкая кабельная линия",
      "неподтверждённые цены, несущая способность крепежа и выдуманные углы/ответвления",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "SURFACE_CABLE_CHANNEL_INSTALLATION",
    systemClass: "IEK_ELECOR_40X25_WHITE_STANDARD_INTERIOR_PRELIMINARY",
    primaryMeasureParameterId: "route_length_m",
    selectedPreliminaryProfile: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    unknownRouteNodesCreateVisibleDependentNeeds: true,
    profileAssumptionsVisibleAndEditable: true,
    cableAndDevicesExcluded: true,
  },
  binding: {
    rowId: "electrical-elecor:02:material:channel-packs",
    applicability: {
      technology_class: "IEK_ELECOR_40X25_SURFACE_CABLE_CHANNEL",
      source_id: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_ID,
      norm_id: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_NORM_ID,
      exact_locator: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_METADATA.exact_locator,
      quantity_basis: "ROUTE_LENGTH_X_VISIBLE_RESERVE_ROUNDED_TO_24_M_MANUFACTURER_PACKAGE",
      assumption_policy: "VISIBLE_EDITABLE_AND_REPLACEABLE_BY_ROUTE_LAYOUT_SUBSTRATE_AND_PPR",
    },
  },
  locator: {
    key: "electrical-elecor-cable-channel-standard-s27-23-balance-r2",
    payload: {
      kind: "MANUFACTURER_SYSTEM_TECHNOLOGY_MAP",
      sourcePackSha256: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
      officialManufacturerCatalog:
        ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_METADATA.official_url,
      restoredOfficialSnapshotManifest:
        ".release-runtime/r568/s27-23/q4-electrical-cable-channel-official-sources/manifest.json",
      independentCompletenessMap: true,
      replacesGenericOneParameterSixtyThreeRowProjection: true,
    },
  },
  search: {
    primaryUom: "м",
    canonicalNameRu: "монтаж кабель-канала IEK ELECOR 40×25 в стандартной зоне",
    aliases: [
      "монтаж кабель канала 100 м",
      "установка кабель-канала ELECOR 40x25",
      "открытая прокладка в пластиковом кабельном канале",
    ],
    shortScopeRu:
      "Монтаж открытой трассы кабель-канала IEK ELECOR 40×25 с упаковками, крепежом и совместимыми аксессуарами; кабель и устройства считаются отдельно.",
    keyDistinguishingParameters: ["route_length_m", "selected_system_reference", "substrate_profile"],
    clarificationFields: [
      "inner_corner_count", "outer_corner_count", "flat_angle_count", "tee_count", "open_end_count",
    ],
    includedBoundaries: [
      "трасса, канал, крепёж, прямые стыки, узловые аксессуары, раскрой, труд, механизмы и логистика",
      "автоматические количества от длины и отдельных фактов раскладки",
    ],
    excludedBoundaries: [
      "кабель, протяжка, оконцевание, устройства, проходки и огнезаделка",
      "скрытые универсальные нормы производительности или неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "кабель канал короб пластиковый ELECOR 40 25 КМС КМВ КМН КМП КМТ КМЗ открытая проводка",
    sourceProvenance: {
      sourcePackSha256: ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_S2723_SOURCE_PACK_SHA256,
      officialIekSnapshotsRestored: true,
      officialKgElectricalSnapshotsRestored: true,
      firstEstimateFromRouteLength: true,
      nodeCountsNeverInferredFromLength: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /кабель.*(?:протяж|подключ)|cable_(?:pull|termination)/iu,
    /розет|выключател|автомат|щит/iu,
    /огнезадел|firestop/iu,
  ],
  owner: "S27_23_ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD_SUCCESSOR",
  receiptFileStem: "S27_23_ELECTRICAL_ELECOR_CABLE_CHANNEL_STANDARD",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
