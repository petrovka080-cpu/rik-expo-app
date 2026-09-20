import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
  OPTICAL_FIBER_SPLICING_CATALOG_ID,
  OPTICAL_FIBER_SPLICING_FORMULAS,
  OPTICAL_FIBER_SPLICING_NORM_ID,
  OPTICAL_FIBER_SPLICING_PARAMETERS,
  OPTICAL_FIBER_SPLICING_RESOURCES,
  OPTICAL_FIBER_SPLICING_SHORT_INPUT,
  OPTICAL_FIBER_SPLICING_SOURCE_ID,
  OPTICAL_FIBER_SPLICING_SOURCE_METADATA,
  compileOpticalFiberSplicingR1,
} from "../../../src/lib/estimate/v4/opticalFiberSplicingR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileOpticalFiberSplicingR1({
    ...OPTICAL_FIBER_SPLICING_SHORT_INPUT,
  });
  const complete = await compileOpticalFiberSplicingR1({
    ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
  });
  const conditional = await compileOpticalFiberSplicingR1({
    ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
    pigtail_mode: "REQUIRED",
    pigtail_designation: "Пигтейл OS2 LC/UPC по спецификации",
    pigtail_quantity_piece: 48,
    splice_tray_mode: "REQUIRED",
    splice_tray_designation: "Кассета на 24 сварки по спецификации",
    splice_tray_quantity_piece: 2,
  });
  const needs = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  if (!(short.rows.length === 2
    && short.rows.find((row) => row.row_id === "rc09:optical_fiber_fusion_splice")
      ?.quantity === "48"
    && short.rows.find((row) => row.row_id === "rc09:fiber_otdr_measurement_protocol")
      ?.quantity === "48"
    && short.preliminaryNeeds.length === 8)) {
    throw new Error("STOP_MASTER_OPTICAL_FIBER_SPLICING_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:fiber_splice_heat_shrink_sleeve",
    "rc09:fiber_lint_free_wipe",
    "rc09:fiber_isopropyl_cleaner",
    "rc09:fiber_splice_identification_marker",
    "rc09:fiber_fusion_splicer",
    "rc09:optical_time_domain_reflectometer",
    "rc09:fiber_pigtail",
    "rc09:fiber_splice_tray",
  ]) {
    if (!needs.has(rowId)) throw new Error(`STOP_MASTER_OPTICAL_FIBER_NEED:${rowId}`);
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 8
    && complete.rows.find((row) => row.row_id === "rc09:fiber_splice_heat_shrink_sleeve")
      ?.quantity === "48"
    && complete.rows.find((row) => row.row_id === "rc09:optical_time_domain_reflectometer")
      ?.quantity === "1")) {
    throw new Error("STOP_MASTER_OPTICAL_FIBER_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 10)) {
    throw new Error("STOP_MASTER_OPTICAL_FIBER_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/(fiber.optic.cable.route|optical.distribution.frame|server.cabinet)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_OPTICAL_FIBER_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_MASTER_OPTICAL_FIBER_SPLICING_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownSpliceCount: OPTICAL_FIBER_SPLICING_SHORT_INPUT.splice_count,
      knownFiberStandard: OPTICAL_FIBER_SPLICING_SHORT_INPUT.fiber_standard,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-optical-fiber-splicing-successor.v1",
  stopCode: "MASTER_OPTICAL_FIBER_SPLICING",
  applicationName: "r4-a13-6-master-optical-fiber-splicing-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "b8c90afe-080f-5930-b22e-143e3682ab4d",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "00046fed-7519-5611-9d6a-d33c3fb26eaa",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-optical-fiber-splicing-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/opticalFiberSplicingR1.ts",
    "tests/estimateNorms/opticalFiberSplicingR1.contract.test.ts",
    "scripts/estimate/r4a13/masterBenchmarkEvidence.shared.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterOpticalFiberSplicingSuccessor.ts",
  ],
  catalogId: OPTICAL_FIBER_SPLICING_CATALOG_ID,
  sourceId: OPTICAL_FIBER_SPLICING_SOURCE_ID,
  normId: OPTICAL_FIBER_SPLICING_NORM_ID,
  sourceMetadata: OPTICAL_FIBER_SPLICING_SOURCE_METADATA,
  parameterDefinitions: OPTICAL_FIBER_SPLICING_PARAMETERS,
  formulaDefinitions: OPTICAL_FIBER_SPLICING_FORMULAS,
  resourceDefinitions: OPTICAL_FIBER_SPLICING_RESOURCES,
  shortInput: OPTICAL_FIBER_SPLICING_SHORT_INPUT,
  acceptanceInput: OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 25,
  validationScenario: "MASTER_BENCHMARK_25_OPTICAL_FIBER_SPLICING",
  passport: {
    canonicalRuName: "Сварка волокон SM G.652D с измерением затухания OTDR",
    workKey: "fiber_optic_connection",
    physicalResultRu: "Оптические волокна SM G.652D сварены, соединения защищены и промаркированы, а затухание каждого волокна измерено с записью протокола",
    includedScopeRu: [
      "сварка по известному количеству волокон",
      "индивидуальная запись измерения затухания по каждому известному волокну",
      "защитные гильзы, очистка и маркировка только по проектной спецификации и ППР",
      "смены сварочного аппарата и OTDR только по ППР и программе QA",
      "пигтейлы и кассеты только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "прокладка трассы волоконно-оптического кабеля",
      "оптический распределительный кросс",
      "серверный шкаф",
      "исторические погонные нормы расхода и производительности без источника",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "FUSION_SPLICE_SINGLE_MODE_OPTICAL_FIBER",
    fiberStandard: "SM_G652D",
    primaryMeasureParameterId: "splice_count",
    geometryParameters: ["splice_count"],
    knownScopeParameters: ["fiber_standard"],
    projectPackageRequiredForConsumablesEquipmentAndQa: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    fiberCableRouteExcluded: true,
    opticalDistributionFrameExcluded: true,
    serverCabinetExcluded: true,
  },
  binding: {
    rowId: "rc09:optical_fiber_fusion_splice",
    applicability: {
      technology_class: "OPTICAL_FIBER_FUSION_SPLICE",
      operation_class: "FUSION_SPLICE_SINGLE_MODE_OPTICAL_FIBER",
      fiber_standard: "SM_G652D",
      scope_mode:
        "KNOWN_SPLICE_COUNT_PLUS_DIRECT_PROJECT_CONSUMABLE_METHOD_EQUIPMENT_AND_QA_QUANTITIES",
      source_id: OPTICAL_FIBER_SPLICING_SOURCE_ID,
      norm_id: OPTICAL_FIBER_SPLICING_NORM_ID,
      exact_locator: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_scalar_rates_claimed: false,
      quantity_basis: "KNOWN_SPLICE_COUNT_PLUS_APPROVED_PROJECT_METHOD_AND_QA_DOCUMENTATION",
    },
  },
  locator: {
    key: "optical-fiber-splicing-project-package-required-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.exact_locator,
      geometryInputs: ["splice_count"],
      knownScopeInputs: ["fiber_standard"],
      directProjectInputs: [
        "sleeve_designation", "sleeve_quantity_piece",
        "wipe_designation", "wipe_quantity_piece",
        "cleaner_designation", "cleaner_volume_l",
        "marker_designation", "marker_quantity_piece",
        "fusion_splicer_designation", "fusion_splicer_shift",
        "otdr_designation", "otdr_shift",
      ],
      conditionalInputs: [
        "pigtail_mode", "pigtail_designation", "pigtail_quantity_piece",
        "splice_tray_mode", "splice_tray_designation", "splice_tray_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Сварка волокон SM G.652D с измерением затухания OTDR",
    aliases: [
      "сварка оптических волокон",
      "сварка ВОЛС G.652D",
      "fusion splice single mode fiber",
      "измерение затухания оптического волокна OTDR",
    ],
    shortScopeRu: "Сварка 48 волокон SM G.652D и 48 индивидуальных записей OTDR; расходные материалы, маркировка и смены оборудования добровольно уточняются только по проекту, ППР и программе измерений.",
    keyDistinguishingParameters: ["splice_count", "fiber_standard"],
    clarificationFields: [
      "sleeve_designation", "sleeve_quantity_piece",
      "wipe_quantity_piece", "cleaner_volume_l", "marker_quantity_piece",
      "fusion_splicer_shift", "otdr_shift", "pigtail_mode", "splice_tray_mode",
    ],
    includedBoundaries: [
      "сварка по количеству волокон",
      "защитные гильзы, очистка и маркировка по проектным документам",
      "сварочный аппарат и OTDR по ППР и программе QA",
      "индивидуальные записи измерения затухания",
      "условные пигтейлы и кассеты",
    ],
    excludedBoundaries: [
      "трасса волоконно-оптического кабеля",
      "оптический распределительный кросс",
      "серверный шкаф",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: "ВОЛС оптика SM G652D сварка волокно КДЗС гильза салфетка изопропанол маркер сварочный аппарат OTDR рефлектометр протокол пигтейл кассета",
    sourceProvenance: {
      exactOpticalFiberSplicingOwner: true,
      explicitSemanticSuccessorOfExpandedFiberOpticConnectionOwner: true,
      exactProjectMethodAndQaPackageRequiredForNonCountQuantities: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /fiber.optic.cable.route|трасс.*оптич.*кабел/iu,
    /optical.distribution.frame|оптич.*(?:кросс|распределител)/iu,
    /server.cabinet|серверн.*шкаф/iu,
  ],
  owner: "MASTER_OPTICAL_FIBER_SPLICING_SUCCESSOR",
  receiptFileStem: "MASTER_OPTICAL_FIBER_SPLICING",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
