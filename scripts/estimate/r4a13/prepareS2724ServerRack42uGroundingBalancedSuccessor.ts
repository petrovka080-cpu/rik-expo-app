import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
  SERVER_RACK_42U_GROUNDING_CATALOG_ID,
  SERVER_RACK_42U_GROUNDING_FORMULAS,
  SERVER_RACK_42U_GROUNDING_NORM_ID,
  SERVER_RACK_42U_GROUNDING_PARAMETERS,
  SERVER_RACK_42U_GROUNDING_RESOURCES,
  SERVER_RACK_42U_GROUNDING_RUNTIME_CLASSIFICATION,
  SERVER_RACK_42U_GROUNDING_RUNTIME_INPUT,
  SERVER_RACK_42U_GROUNDING_RUNTIME_SOURCE_IDS,
  SERVER_RACK_42U_GROUNDING_SHORT_INPUT,
  SERVER_RACK_42U_GROUNDING_SOURCE_ID,
  SERVER_RACK_42U_GROUNDING_SOURCE_METADATA,
  compileServerRack42uGroundingR1,
} from "../../../src/lib/estimate/v4/serverRack42uGroundingR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileServerRack42uGroundingR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

const CONDITIONAL_INPUT = Object.freeze({
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

async function verifyCore(): Promise<Json> {
  const first = await compileServerRack42uGroundingR1({
    ...SERVER_RACK_42U_GROUNDING_SHORT_INPUT,
  });
  const complete = await compileServerRack42uGroundingR1({
    ...SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
  });
  const balanced = await compileServerRack42uGroundingR1({
    ...SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
    rack_retained_spare_piece: 1,
    rack_supplier_pack_size_piece: 4,
  });
  const conditional = await compileServerRack42uGroundingR1({
    ...SERVER_RACK_42U_GROUNDING_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  if (!(first.rows.length === 9 && first.preliminaryNeeds.length === 17
    && quantity(first, "rc09:server_rack_42u_install_ground") === "6"
    && quantity(first, "rc09:server_rack_42u_600x1200") === "6"
    && quantity(first, "rc09:rack_ground_continuity_test") === "6"
    && quantity(first, "rc09:server-rack-balance:package-count") === "6")) {
    throw new Error("STOP_S27_24_SERVER_RACK_FIRST_ESTIMATE");
  }
  for (const rowId of [
    "rc09:server_rack_anchor_set", "rc09:server_rack_bonding_kit",
    "rc09:copper_pe_conductor_16mm2", "rc09:copper_lug_16mm2",
    "rc09:rack_cage_nut_bolt_m6", "rc09:rack_cable_organizer",
    "rc09:rack_plinth", "rc09:rack_pdu", "rc09:vertical_cable_organizer",
    "rc09:rack_ground_continuity_report",
    "rc09:labor:rack-installation-grounding", "rc09:labor:rack-grounding-test",
    "rc09:equipment:rack-handling", "rc09:equipment:rack-torque-tool",
    "rc09:equipment:ground-continuity-tester",
    "rc09:logistics:rack-delivery", "rc09:logistics:rack-packaging-removal",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_SERVER_RACK_NEED:${rowId}`);
  if (!(complete.rows.length === 23 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:server_rack_42u_600x1200") === "6"
    && quantity(complete, "rc09:copper_pe_conductor_16mm2") === "27"
    && quantity(complete, "rc09:labor:rack-installation-grounding") === "72"
    && quantity(complete, "rc09:equipment:ground-continuity-tester") === "6"
    && quantity(complete, "rc09:logistics:rack-delivery") === "1")) {
    throw new Error("STOP_S27_24_SERVER_RACK_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:server-rack-balance:installed-net") === "6"
    && quantity(balanced, "rc09:server-rack-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:server-rack-balance:total-need") === "7"
    && quantity(balanced, "rc09:server-rack-balance:package-count") === "2"
    && quantity(balanced, "rc09:server_rack_42u_600x1200") === "8"
    && quantity(balanced, "rc09:server-rack-balance:remainder") === "2"
    && quantity(balanced, "rc09:server-rack-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_SERVER_RACK_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 26 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_SERVER_RACK_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:server_rack_42u_install_ground", "rc09:rack_ground_continuity_test",
    "rc09:rack_ground_continuity_report",
  ]) {
    const graph = SERVER_RACK_42U_GROUNDING_RESOURCES
      .find((row) => row.row_id === rowId)?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_SERVER_RACK_DOUBLE_COST:${rowId}`);
    }
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  if (/\bups\b|battery.system|server.room.cooling|fire.suppression|access.control|full.server.room/iu
    .test(serialized)) {
    throw new Error("STOP_S27_24_SERVER_RACK_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S27_24_SERVER_RACK_42U_GROUNDING_BALANCED_CORE",
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      knownRackCount: SERVER_RACK_42U_GROUNDING_SHORT_INPUT.rack_count,
      knownRackHeightU: SERVER_RACK_42U_GROUNDING_SHORT_INPUT.rack_height_u,
      knownRackWidth: SERVER_RACK_42U_GROUNDING_SHORT_INPUT.rack_width_designation,
      knownRackDepthMm: SERVER_RACK_42U_GROUNDING_SHORT_INPUT.rack_depth_mm,
      knownRackDesignation: SERVER_RACK_42U_GROUNDING_SHORT_INPUT.rack_designation,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:server-rack-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:server-rack-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:server-rack-balance:total-need"),
      packageCount: quantity(balanced, "rc09:server-rack-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:server_rack_42u_600x1200"),
      remainderPiece: quantity(balanced, "rc09:server-rack-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:server-rack-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.server-rack-42u-grounding-balanced-successor.v2",
  stopCode: "S27_24_SERVER_RACK_42U_GROUNDING_BALANCED",
  applicationName: "s27-24-server-rack-42u-grounding-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "f6042df3-58b5-5cd9-ae58-18dccf611eb9",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "e7b087a0-6459-5a28-a97a-b2b126090ca4",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/server-rack-42u-grounding-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/server-rack-42u-grounding-balanced-s27-24.json",
    "src/lib/estimate/v4/serverRack42uGroundingR1.ts",
    "tests/estimateNorms/serverRack42uGroundingR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724ServerRack42uGroundingBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724ServerRack42uGroundingBalancedIndependent.ts",
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
  runtimeProfileInput: SERVER_RACK_42U_GROUNDING_RUNTIME_INPUT,
  runtimeProfileClassification: SERVER_RACK_42U_GROUNDING_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: SERVER_RACK_42U_GROUNDING_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [26, 12, 12],
  benchmarkOrdinal: 30,
  validationScenario: "MASTER_BENCHMARK_30_SERVER_RACK_42U_GROUNDING_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж и заземление серверного шкафа 42U 600×1200 мм",
    workKey: "server_rack_42u_grounding",
    physicalResultRu: "Шкафы RACK-42U-600X1200 установлены, закреплены, присоединены к защитному заземлению и проверены",
    includedScopeRu: [
      "монтаж, анкеровка и заземление известных шкафов 42U",
      "видимый закупочный баланс серверных шкафов",
      "анкеры, bonding kit, PE-проводник, наконечники, cage nuts и организаторы по проекту",
      "труд монтажников, электромонтажников и электролаборатории",
      "механизм перемещения, тарированный инструмент и измеритель непрерывности",
      "контроль, акт, доставка и вывоз упаковки",
      "цоколь, PDU и вертикальный организатор только по условным ветвям",
    ],
    excludedScopeRu: [
      "UPS и аккумуляторная система",
      "охлаждение, пожаротушение и СКУД серверного помещения",
      "полный серверный зал",
      "автоматический выбор модели и универсальные нормы расхода или производительности",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_ANCHOR_AND_GROUND_SERVER_RACK_42U",
    rackSystem: "SERVER_RACK_42U_600X1200_EXPLICIT_MODEL",
    primaryMeasureParameterId: "rack_count",
    knownScopeParameters: [
      "rack_height_u", "rack_width_designation", "rack_depth_mm", "rack_designation",
    ],
    visibleProcurementBalance: true,
    projectAccessoryLaborEquipmentQaAndLogisticsPackageRequired: true,
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
      rack_system: "SERVER_RACK_42U_600X1200_EXPLICIT_MODEL",
      scope_mode: "KNOWN_RACK_IDENTITY_GEOMETRY_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: SERVER_RACK_42U_GROUNDING_SOURCE_ID,
      norm_id: SERVER_RACK_42U_GROUNDING_NORM_ID,
      exact_locator: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_RACK_CARDINALITY_AND_IDENTITY_PLUS_VISIBLE_PACKAGING_AND_APPROVED_PROJECT_PACKAGE",
    },
  },
  locator: {
    key: "server-rack-42u-grounding-project-balance-s27-24-v2",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA.exact_locator,
      sourcePackSha256: SERVER_RACK_42U_GROUNDING_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "rack_count", "rack_height_u", "rack_width_designation", "rack_depth_mm",
        "rack_designation",
      ],
      visiblePreliminaryBalanceInputs:
        Object.keys(SERVER_RACK_42U_GROUNDING_RUNTIME_INPUT),
      directProjectInputs: SERVER_RACK_42U_GROUNDING_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => ![
          "rack_count", "rack_height_u", "rack_width_designation", "rack_depth_mm",
          "rack_designation", ...Object.keys(SERVER_RACK_42U_GROUNDING_RUNTIME_INPUT),
          "rack_plinth_mode", "rack_plinth_designation", "rack_plinth_quantity",
          "rack_pdu_mode", "rack_pdu_designation", "rack_pdu_quantity",
          "vertical_cable_organizer_mode", "vertical_cable_organizer_designation",
          "vertical_cable_organizer_quantity",
        ].includes(parameterId)),
      conditionalInputs: [
        "rack_plinth_mode", "rack_plinth_designation", "rack_plinth_quantity",
        "rack_pdu_mode", "rack_pdu_designation", "rack_pdu_quantity",
        "vertical_cable_organizer_mode", "vertical_cable_organizer_designation",
        "vertical_cable_organizer_quantity",
      ],
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Монтаж и заземление серверного шкафа 42U 600×1200 мм",
    aliases: [
      "монтаж серверного шкафа 42U 600х1200",
      "заземление телекоммуникационного шкафа 42U",
      "установка серверной стойки RACK-42U-600X1200",
      "server rack 42U installation and grounding",
    ],
    shortScopeRu: "Монтаж и заземление 6 шкафов RACK-42U-600X1200 с закупочным балансом; проектные комплектующие, труд, механизмы, контроль и логистика уточняются по документам.",
    keyDistinguishingParameters: [
      "rack_count", "rack_height_u", "rack_width_designation", "rack_depth_mm",
      "rack_designation",
    ],
    clarificationFields: SERVER_RACK_42U_GROUNDING_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "rack_count", "rack_height_u", "rack_width_designation", "rack_depth_mm",
        "rack_designation",
      ].includes(parameterId)),
    includedBoundaries: [
      "монтаж, анкеровка и заземление известных шкафов",
      "комплектующие и видимый закупочный баланс",
      "труд, механизмы, контроль, акт и логистика",
      "условные цоколь, PDU и вертикальный организатор",
    ],
    excludedBoundaries: [
      "UPS, батареи, охлаждение, пожаротушение и СКУД",
      "полный серверный зал",
      "автоматический выбор модели и неподтверждённые цены",
    ],
    extraSearchTermsRu: "серверный шкаф стойка 42U 600 1200 монтаж анкеровка заземление PE bonding kit клеточная гайка PDU организатор непрерывность акт труд механизм доставка",
    sourceProvenance: {
      exactExpandedDataCenterMepOwner: true,
      knownRackIdentityAndGeometry: true,
      visibleIndependentProcurementBalance: true,
      exactProjectAccessoryLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /\bups\b|ибп/iu,
    /battery.system|аккумуляторн.*систем/iu,
    /server.room.cooling|охлажден.*серверн/iu,
    /fire.suppression|пожаротушен/iu,
    /access.control|скуд/iu,
    /full.server.room|полн.*серверн.*зал/iu,
  ],
  owner: "S27_24_SERVER_RACK_42U_GROUNDING_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_SERVER_RACK_42U_GROUNDING_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
