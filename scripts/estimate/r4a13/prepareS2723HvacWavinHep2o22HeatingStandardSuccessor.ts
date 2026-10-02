import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_CATALOG_ID,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_FORMULAS,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_NORM_ID,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_PARAMETERS,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_INPUT,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_SOURCE_IDS,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SHORT_INPUT,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_ID,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_METADATA,
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
  compileHvacWavinHep2o22HeatingStandardS2723,
  hvacWavinHep2o22HeatingStandardMissingRows,
} from "../../../src/lib/estimate/v4/hvacWavinHep2o22HeatingStandardS2723";
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
  HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES.map((resource) => [resource.row_id, resource]),
);

const conditionByPrefix: readonly [string, string][] = [
  ["hvac-hep2o22:03:", "support_count supplied from a verified support layout"],
  ["hvac-hep2o22:04:", "prepared_pipe_end_count supplied from verified joint topology"],
  ["hvac-hep2o22:05:component:straight", "straight_connector_count supplied; zero confirms not applicable"],
  ["hvac-hep2o22:05:operation:straight", "straight_connector_count supplied; zero confirms not applicable"],
  ["hvac-hep2o22:05:component:elbow", "elbow_count supplied; zero confirms not applicable"],
  ["hvac-hep2o22:05:operation:elbow", "elbow_count supplied; zero confirms not applicable"],
  ["hvac-hep2o22:05:component:tee", "tee_count supplied; zero confirms not applicable"],
  ["hvac-hep2o22:05:operation:tee", "tee_count supplied; zero confirms not applicable"],
  ["hvac-hep2o22:05:component:threaded", "threaded_adapter_count supplied; zero confirms not applicable"],
  ["hvac-hep2o22:05:operation:threaded", "threaded_adapter_count supplied; zero confirms not applicable"],
  ["hvac-hep2o22:05:consumable:ptfe", "threaded_adapter_count supplied; zero confirms not applicable"],
  ["hvac-hep2o22:05:component:stop", "stop_end_count supplied; zero confirms not applicable"],
  ["hvac-hep2o22:05:operation:stop", "stop_end_count supplied; zero confirms not applicable"],
  ["hvac-hep2o22:05:labor:", "all route fitting counts supplied from verified joint topology"],
  ["hvac-hep2o22:06:labor:support", "support_count supplied from a verified support layout"],
];

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
  entries: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_INDEPENDENT_COMPLETENESS_MAP.entries
    .flatMap((component) => component.requiredRowIds.map((rowId) => {
      const row = resourceById.get(rowId);
      const trace = (row?.source_metadata as Json | undefined)?.normativeTrace?.[0] as
        Json | undefined;
      return {
        operationId: component.semanticKey,
        expectedResourceId: rowId,
        condition: conditionByPrefix.find(([prefix]) => rowId.startsWith(prefix))?.[1]
          ?? "always in selected Wavin Hep2O 22 mm accessible heating-route profile",
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
  const first = await compileHvacWavinHep2o22HeatingStandardS2723({
    ...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SHORT_INPUT,
  });
  const complete = await compileHvacWavinHep2o22HeatingStandardS2723({
    ...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT,
  });
  const changed = await compileHvacWavinHep2o22HeatingStandardS2723({
    ...HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT,
    route_length_m: 130,
    support_count: 261,
  });
  const rowIds = new Set(complete.rows.map((row) => row.row_id));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_FORMULAS,
    resourceDefinitions: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES,
  });
  const assertions = {
    firstEstimateAppearsImmediately:
      first.rows.length === 40 && first.preliminaryNeeds.length === 28,
    firstEstimateHasProcurement:
      first.rows.filter((row) => row.included_in_procurement).length === 10,
    unknownLayoutResourcesRemainVisible: first.preliminaryNeeds.every((need) =>
      /hvac-hep2o22:(?:03|04|05|06:labor:support)/u.test(need.row_id)),
    completeInputHasAllRows: complete.rows.length === 68 && complete.preliminaryNeeds.length === 0,
    eightVisibleStages: new Set(complete.rows.map((row) => row.section)).size === 8,
    procurementSubset: complete.rows.filter((row) => row.included_in_procurement).length === 23,
    unknownPricesRemainNull: complete.rows.every((row) => row.unit_price == null && row.amount == null),
    independentMapComplete: hvacWavinHep2o22HeatingStandardMissingRows(rowIds).length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    pipeQuantityBalance:
      quantity(complete.rows, "hvac-hep2o22:02:material:pipe-expected-waste") === 5
      && quantity(complete.rows, "hvac-hep2o22:02:material:pipe-reserve") === 5
      && quantity(complete.rows, "hvac-hep2o22:02:control:required-sections") === 19
      && quantity(complete.rows, "hvac-hep2o22:02:control:available-before-losses") === 20,
    pipeBundles: quantity(complete.rows, "hvac-hep2o22:02:material:pipe-bundles") === 1,
    orderedPipeM: quantity(complete.rows, "hvac-hep2o22:02:control:ordered-length") === 120,
    pipeRemainderM: quantity(complete.rows, "hvac-hep2o22:02:control:pipe-remainder") === 15,
    supportPoints: quantity(complete.rows, "hvac-hep2o22:03:fastener:supports") === 201,
    smartSleeves: quantity(complete.rows, "hvac-hep2o22:04:component:smartsleeves") === 40,
    highTestPressure: quantity(complete.rows, "hvac-hep2o22:07:control:test-pressure") === 6,
    fullWavinTestRegime:
      quantity(complete.rows, "hvac-hep2o22:07:control:low-test-pressure") === 0.75
      && quantity(complete.rows, "hvac-hep2o22:07:control:low-test-hold") === 45
      && quantity(complete.rows, "hvac-hep2o22:07:control:high-pressure-pump") === 15
      && quantity(complete.rows, "hvac-hep2o22:07:control:reduced-test-pressure") === 2
      && quantity(complete.rows, "hvac-hep2o22:07:control:test-record") === 45,
    systemWater: quantity(complete.rows, "hvac-hep2o22:07:material:test-water") === 0.024605739,
    routeChangeRecalculates:
      quantity(changed.rows, "hvac-hep2o22:02:control:required-sections") === 24
      && quantity(changed.rows, "hvac-hep2o22:02:material:pipe-bundles") === 2
      && quantity(changed.rows, "hvac-hep2o22:02:control:ordered-length") === 240
      && quantity(changed.rows, "hvac-hep2o22:02:control:available-before-losses") === 110
      && quantity(changed.rows, "hvac-hep2o22:02:control:pipe-remainder") === 103.5
      && quantity(changed.rows, "hvac-hep2o22:03:fastener:supports") === 261
      && quantity(changed.rows, "hvac-hep2o22:06:labor:route-installation") === 32.5
      && quantity(changed.rows, "hvac-hep2o22:07:operation:high-pressure-test") === 2,
  };
  const failed = Object.entries(assertions).filter(([, value]) => !value).map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(`STOP_S27_23_HVAC_WAVIN_HEP2O22_HEATING_CORE:${failed.join(",")}`);
  }
  for (const rowId of rowIds) {
    const mutated = new Set(rowIds);
    mutated.delete(rowId);
    if (!hvacWavinHep2o22HeatingStandardMissingRows(mutated).includes(rowId)) {
      throw new Error(`STOP_S27_23_HVAC_WAVIN_HEP2O22_REMOVAL_MUTATION:${rowId}`);
    }
  }
  return {
    status: "GREEN_S27_23_HVAC_WAVIN_HEP2O22_HEATING_CORE",
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
  contract: "rik-expo-app.s27-23.hvac-wavin-hep2o22-heating-successor.v1",
  stopCode: "S27_23_HVAC_WAVIN_HEP2O22_HEATING",
  applicationName: "s27-23-hvac-wavin-hep2o22-heating-successor",
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
    ?? ".release-runtime/r568/s27-23/hvac-wavin-hep2o22-heating-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/hvac-wavin-hep2o22-heating-standard-s27-23.json",
    "src/lib/estimate/v4/hvacWavinHep2o22HeatingStandardS2723.ts",
    "tests/estimateNorms/hvacWavinHep2o22HeatingStandardS2723.contract.test.ts",
    "scripts/estimate/r4a13/fetchS2723WavinHep2oHeatingSources.mjs",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723HvacWavinHep2o22HeatingStandardSuccessor.ts",
  ],
  catalogId: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_CATALOG_ID,
  sourceId: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_ID,
  normId: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_NORM_ID,
  sourceMetadata: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_METADATA,
  parameterDefinitions: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_PARAMETERS,
  formulaDefinitions: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_FORMULAS,
  resourceDefinitions: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RESOURCES,
  shortInput: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SHORT_INPUT,
  acceptanceInput: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_ACCEPTANCE_INPUT,
  runtimeProfileInput: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_INPUT,
  runtimeProfileClassification: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [40, 43, 62],
  benchmarkOrdinal: 0,
  validationScenario: "S27_23_HVAC_WAVIN_HEP2O22_HEATING_100_M",
  passport: {
    canonicalRuName: "монтаж внутренней отопительной трассы Wavin Hep2O 22 мм",
    workKey: "heating_hvac_interior_heating_pipe_install_standard",
    physicalResultRu:
      "Смонтированная доступная горизонтальная трасса водяного отопления Wavin Hep2O Barrier 22 мм с проектными фитингами и опорами, испытанная, заполненная и освобождённая от воздуха.",
    includedScopeRu: [
      "обмер, применимость системы, разметка трассы, соединений и опор",
      "труба, резерв, заводские пачки, раскрой, заказ и расчётный остаток",
      "клипсы, анкеры, винты, сверление, расходная оснастка, труд и механизмы",
      "подготовленные концы, SmartSleeve, In4Sure, соединители, отводы, тройники, адаптеры и заглушки по фактической раскладке",
      "низкое и высокое гидравлические испытания, заполнение, удаление воздуха и совместимый ингибитор",
      "доставка, уборка, вывоз отходов и итоговый контроль",
    ],
    excludedScopeRu: [
      "гидравлический расчёт и выбор диаметра вместо проектировщика",
      "радиаторы, котлы, насосы, арматура, коллекторы и автоматика",
      "теплоизоляция, проходки, огнезаделка, скрытая прокладка и восстановление отделки",
      "неподтверждённые цены и выдуманная геометрия фитингов или опор",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "INTERNAL_HEATING_PIPE_ROUTE_INSTALLATION",
    systemClass: "WAVIN_HEP2O_BARRIER_22_ACCESSIBLE_HORIZONTAL_PRELIMINARY",
    primaryMeasureParameterId: "route_length_m",
    selectedPreliminaryProfile: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    unknownLayoutCreatesVisibleDependentNeeds: true,
    profileAssumptionsVisibleAndEditable: true,
    hydraulicDesignAndAdjacentSystemsExcluded: true,
  },
  binding: {
    rowId: "hvac-hep2o22:02:material:pipe-bundles",
    applicability: {
      technology_class: "WAVIN_HEP2O22_INTERNAL_HEATING_ROUTE",
      source_id: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_ID,
      norm_id: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_NORM_ID,
      exact_locator: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_METADATA.exact_locator,
      quantity_basis: "ROUTE_LENGTH_X_VISIBLE_RESERVE_ROUNDED_TO_6_M_SECTIONS_AND_20_SECTION_BUNDLES",
      assumption_policy: "VISIBLE_EDITABLE_AND_REPLACEABLE_BY_PROJECT_HYDRAULICS_LAYOUT_SUBSTRATE_AND_METHOD",
    },
  },
  locator: {
    key: "hvac-wavin-hep2o22-heating-standard-s27-23-balance-r2",
    payload: {
      kind: "MANUFACTURER_SYSTEM_TECHNOLOGY_MAP",
      sourcePackSha256: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
      officialManufacturerGuide: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_METADATA.official_url,
      restoredOfficialSnapshotManifest:
        ".release-runtime/r568/s27-23/q6-wavin-hep2o-official-sources/manifest.json",
      independentCompletenessMap: true,
      replacesGenericOneParameterSixtyThreeRowProjection: true,
    },
  },
  search: {
    primaryUom: "м",
    canonicalNameRu: "монтаж внутренней отопительной трассы Wavin Hep2O 22 мм",
    aliases: [
      "монтаж трубы отопления hep2o 22 мм 100 м",
      "прокладка внутреннего трубопровода отопления wavin",
      "монтаж полибутиленовой трубы отопления push-fit",
    ],
    shortScopeRu:
      "Доступная горизонтальная трасса водяного отопления Wavin Hep2O Barrier 22 мм: труба, опоры, фитинги по раскладке, SmartSleeve, испытание, заполнение и удаление воздуха.",
    keyDistinguishingParameters: ["route_length_m", "selected_system_reference", "service_profile"],
    clarificationFields: [
      "support_count", "prepared_pipe_end_count", "straight_connector_count", "elbow_count",
      "tee_count", "threaded_adapter_count", "stop_end_count",
    ],
    includedBoundaries: [
      "трасса, труба, опоры, крепёж, фитинги, расходники, труд, механизмы, испытание, заполнение и логистика",
      "автоматические количества от длины и отдельные факты раскладки без скрытых догадок",
    ],
    excludedBoundaries: [
      "радиаторы, котлы, насосы, арматура, изоляция, проходки, огнезаделка и строительное восстановление",
      "скрытые универсальные нормы производительности и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "отопление труба hep2o wavin 22 barrier hxx06 hd1 hd5 hd10 smartsleeve push-fit опора опрессовка",
    sourceProvenance: {
      sourcePackSha256: HVAC_WAVIN_HEP2O22_HEATING_STANDARD_S2723_SOURCE_PACK_SHA256,
      officialWavinSnapshotsRestored: true,
      officialKgKrer18SnapshotsRestored: true,
      firstEstimateFromRouteLength: true,
      layoutCountsNeverInferredFromLength: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /radiator|boiler|pump_install|valve_install|thermal_insulation/iu,
    /firestop|penetration|concealed_finish/iu,
  ],
  owner: "S27_23_HVAC_WAVIN_HEP2O22_HEATING_STANDARD_SUCCESSOR",
  receiptFileStem: "S27_23_HVAC_WAVIN_HEP2O22_HEATING_STANDARD",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
