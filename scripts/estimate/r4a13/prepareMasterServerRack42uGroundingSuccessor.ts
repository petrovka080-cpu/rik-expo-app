import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
  SERVER_RACK_42U_GROUNDING_CATALOG_ID,
  SERVER_RACK_42U_GROUNDING_FORMULAS,
  SERVER_RACK_42U_GROUNDING_NORM_ID,
  SERVER_RACK_42U_GROUNDING_PARAMETERS,
  SERVER_RACK_42U_GROUNDING_RESOURCES,
  SERVER_RACK_42U_GROUNDING_SHORT_INPUT,
  SERVER_RACK_42U_GROUNDING_SOURCE_ID,
  SERVER_RACK_42U_GROUNDING_SOURCE_METADATA,
  compileServerRack42uGroundingR1,
} from "../../../src/lib/estimate/v4/serverRack42uGroundingR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const CONDITIONAL_INPUTS = [
  "rack_plinth_mode", "rack_plinth_designation", "rack_plinth_quantity",
  "rack_pdu_mode", "rack_pdu_designation", "rack_pdu_quantity",
  "vertical_cable_organizer_mode", "vertical_cable_organizer_designation",
  "vertical_cable_organizer_quantity",
];

async function verifyCore(): Promise<Json> {
  const short = await compileServerRack42uGroundingR1({
    ...SERVER_RACK_42U_GROUNDING_SHORT_INPUT,
  });
  const complete = await compileServerRack42uGroundingR1({
    ...SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
  });
  const conditional = await compileServerRack42uGroundingR1({
    ...SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
    rack_plinth_mode: "REQUIRED",
    rack_plinth_designation: "Цоколь 100 мм по спецификации шкафа",
    rack_plinth_quantity: 6,
    rack_pdu_mode: "REQUIRED",
    rack_pdu_designation: "PDU 32 A по электрической спецификации",
    rack_pdu_quantity: 12,
    vertical_cable_organizer_mode: "REQUIRED",
    vertical_cable_organizer_designation: "Органайзер вертикальный по раскладке",
    vertical_cable_organizer_quantity: 12,
  });
  const needs = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  if (!(short.rows.length === 3
    && short.rows.find((row) => row.row_id === "rc09:server_rack_42u_install_ground")
      ?.quantity === "6"
    && short.rows.find((row) => row.row_id === "rc09:server_rack_42u_600x1200")
      ?.quantity === "6"
    && short.rows.find((row) => row.row_id === "rc09:rack_ground_continuity_test")
      ?.quantity === "6"
    && short.preliminaryNeeds.length === 9)) {
    throw new Error("STOP_MASTER_SERVER_RACK_42U_GROUNDING_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:server_rack_anchor_set",
    "rc09:server_rack_bonding_kit",
    "rc09:copper_pe_conductor_16mm2",
    "rc09:copper_lug_16mm2",
    "rc09:rack_cage_nut_bolt_m6",
    "rc09:rack_cable_organizer",
    "rc09:rack_plinth",
    "rc09:rack_pdu",
    "rc09:vertical_cable_organizer",
  ]) {
    if (!needs.has(rowId)) {
      throw new Error(`STOP_MASTER_SERVER_RACK_42U_GROUNDING_NEED:${rowId}`);
    }
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 9
    && complete.rows.find((row) => row.row_id === "rc09:copper_pe_conductor_16mm2")
      ?.quantity === "27"
    && complete.rows.find((row) => row.row_id === "rc09:copper_lug_16mm2")
      ?.quantity === "30"
    && complete.rows.find((row) => row.row_id === "rc09:rack_cage_nut_bolt_m6")
      ?.quantity === "132"
    && complete.rows.find((row) => row.row_id === "rc09:rack_cable_organizer")
      ?.quantity === "18")) {
    throw new Error("STOP_MASTER_SERVER_RACK_42U_GROUNDING_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 12)) {
    throw new Error("STOP_MASTER_SERVER_RACK_42U_GROUNDING_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/\bups\b|battery.system|server.room.cooling|server.room.fire.suppression|access.control|full.server.room/iu
    .test(serialized)) {
    throw new Error("STOP_MASTER_SERVER_RACK_42U_GROUNDING_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_MASTER_SERVER_RACK_42U_GROUNDING_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownRackCount: SERVER_RACK_42U_GROUNDING_SHORT_INPUT.rack_count,
      knownRackHeightU: SERVER_RACK_42U_GROUNDING_SHORT_INPUT.rack_height_u,
      knownRackDepthMm: SERVER_RACK_42U_GROUNDING_SHORT_INPUT.rack_depth_mm,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-server-rack-42u-grounding-successor.v1",
  stopCode: "MASTER_SERVER_RACK_42U_GROUNDING",
  applicationName: "r4-a13-6-master-server-rack-42u-grounding-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "85e5efc9-ef38-5355-afb1-7cdef3ac65ba",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "ae5630af-d216-5e7c-a21f-d12e7cc9e481",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-server-rack-42u-grounding-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/serverRack42uGroundingR1.ts",
    "tests/estimateNorms/serverRack42uGroundingR1.contract.test.ts",
    "scripts/estimate/r4a13/masterBenchmarkEvidence.shared.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterServerRack42uGroundingSuccessor.ts",
  ],
  catalogId: SERVER_RACK_42U_GROUNDING_CATALOG_ID,
  sourceId: SERVER_RACK_42U_GROUNDING_SOURCE_ID,
  normId: SERVER_RACK_42U_GROUNDING_NORM_ID,
  sourceMetadata: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA,
  parameterDefinitions: SERVER_RACK_42U_GROUNDING_PARAMETERS,
  formulaDefinitions: SERVER_RACK_42U_GROUNDING_FORMULAS,
  resourceDefinitions: SERVER_RACK_42U_GROUNDING_RESOURCES,
  shortInput: SERVER_RACK_42U_GROUNDING_SHORT_INPUT,
  acceptanceInput: SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [5, 52, 52],
  benchmarkOrdinal: 30,
  validationScenario: "MASTER_BENCHMARK_30_SERVER_RACK_42U_GROUNDING",
  passport: {
    canonicalRuName: "Монтаж и заземление серверного шкафа 42U глубиной 1200 мм",
    workKey: "server_rack_42u_grounding",
    physicalResultRu: "Серверные шкафы 42U глубиной 1200 мм установлены, закреплены, присоединены к защитному заземлению и индивидуально проверены",
    includedScopeRu: [
      "монтаж, анкеровка и заземление известного количества шкафов 42U заданной глубины",
      "серверные шкафы и индивидуальное измерение непрерывности защитного соединения",
      "анкеры, bonding kit, PE-проводник, наконечники, cage nuts и горизонтальные организаторы только по утверждённым спецификации, планам и узлам",
      "цоколь, PDU и вертикальный организатор только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "UPS и аккумуляторная система",
      "охлаждение серверного помещения",
      "пожаротушение и СКУД серверного помещения",
      "полный серверный зал",
      "исторические нормы количества комплектующих и длины PE-проводника",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_ANCHOR_AND_GROUND_SERVER_RACK_42U",
    rackSystem: "SERVER_RACK_42U_DEPTH_1200_PROJECT_WIDTH_AND_CONFIGURATION",
    primaryMeasureParameterId: "rack_count",
    geometryParameters: ["rack_count", "rack_height_u", "rack_depth_mm"],
    projectPackageRequiredForProductFixingBondingAccessoriesAndQa: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    fullServerRoomExcluded: true,
  },
  binding: {
    rowId: "rc09:server_rack_42u_install_ground",
    applicability: {
      technology_class: "SERVER_RACK_INSTALLATION_AND_GROUNDING",
      operation_class: "INSTALL_ANCHOR_AND_GROUND_SERVER_RACK_42U",
      rack_system: "SERVER_RACK_42U_DEPTH_1200_PROJECT_WIDTH_AND_CONFIGURATION",
      scope_mode: "KNOWN_RACK_COUNT_HEIGHT_DEPTH_PLUS_DIRECT_PROJECT_PRODUCT_FIXING_BONDING_ACCESSORIES_AND_QA",
      source_id: SERVER_RACK_42U_GROUNDING_SOURCE_ID,
      norm_id: SERVER_RACK_42U_GROUNDING_NORM_ID,
      exact_locator: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_RACK_CARDINALITY_PLUS_APPROVED_SCHEDULE_LAYOUT_DETAILS_AND_QA_DOCUMENTATION",
    },
  },
  locator: {
    key: "server-rack-42u-depth-1200-install-ground-project-package-required-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA.exact_locator,
      geometryInputs: ["rack_count", "rack_height_u", "rack_depth_mm"],
      directProjectInputs: [
        "rack_width_designation", "rack_designation",
        "anchor_set_designation", "anchor_set_quantity",
        "bonding_kit_designation", "bonding_kit_quantity",
        "pe_conductor_designation", "pe_conductor_length_m",
        "copper_lug_designation", "copper_lug_quantity",
        "cage_nut_bolt_designation", "cage_nut_bolt_quantity",
        "horizontal_cable_organizer_designation", "horizontal_cable_organizer_quantity",
      ],
      conditionalInputs: CONDITIONAL_INPUTS,
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Монтаж и заземление серверного шкафа 42U глубиной 1200 мм",
    aliases: [
      "монтаж серверного шкафа 42U 1200 мм",
      "заземление телекоммуникационного шкафа 42U",
      "установка серверной стойки 42U",
      "server rack 42U installation and grounding",
    ],
    shortScopeRu: "Монтаж и заземление шести шкафов 42U глубиной 1200 мм: работа, предварительная строка шкафа и индивидуальная проверка непрерывности доступны сразу; модель, крепление, PE-комплектующие и аксессуары добровольно уточняются по проекту.",
    keyDistinguishingParameters: ["rack_count", "rack_height_u", "rack_depth_mm"],
    clarificationFields: [
      "rack_width_designation", "rack_designation",
      "anchor_set_designation", "anchor_set_quantity",
      "bonding_kit_designation", "bonding_kit_quantity",
      "pe_conductor_designation", "pe_conductor_length_m",
      "copper_lug_designation", "copper_lug_quantity",
      "cage_nut_bolt_designation", "cage_nut_bolt_quantity",
      "horizontal_cable_organizer_designation", "horizontal_cable_organizer_quantity",
      "rack_plinth_mode", "rack_pdu_mode", "vertical_cable_organizer_mode",
    ],
    includedBoundaries: [
      "монтаж, анкеровка и заземление по известному количеству, высоте и глубине шкафов",
      "предварительная строка шкафа и индивидуальное измерение защитного соединения",
      "крепление, заземление и аксессуары по утверждённым спецификации, планам и узлам",
      "цоколь, PDU и вертикальные организаторы по условным проектным ветвям",
    ],
    excludedBoundaries: [
      "UPS, батареи, охлаждение, пожаротушение и СКУД",
      "полный серверный зал",
      "исторические коэффициенты длины и количества комплектующих",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: "серверный шкаф стойка 42U 1200 мм анкеровка заземление уравнивание потенциалов PE проводник 16 мм2 наконечник клеточная гайка M6 кабельный организатор PDU цоколь непрерывность защитного соединения",
    sourceProvenance: {
      exactExpandedDataCenterMepOwner: true,
      knownRackCountHeightAndDepth: true,
      exactProjectProductFixingBondingAccessoryAndQaPackageRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /\bups\b/iu,
    /battery.system/iu,
    /server.room.cooling/iu,
    /server.room.fire.suppression/iu,
    /access.control/iu,
    /full.server.room/iu,
  ],
  owner: "MASTER_SERVER_RACK_42U_GROUNDING_SUCCESSOR",
  receiptFileStem: "MASTER_SERVER_RACK_42U_GROUNDING",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
