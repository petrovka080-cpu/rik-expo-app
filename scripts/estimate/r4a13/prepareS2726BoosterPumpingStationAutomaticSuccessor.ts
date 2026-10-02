import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  BOOSTER_PUMPING_STATION_ACCEPTANCE_INPUT, BOOSTER_PUMPING_STATION_CATALOG_ID,
  BOOSTER_PUMPING_STATION_FORMULAS, BOOSTER_PUMPING_STATION_NORM_ID,
  BOOSTER_PUMPING_STATION_KNOWN_SCOPE_PARAMETERS,
  BOOSTER_PUMPING_STATION_PARAMETERS, BOOSTER_PUMPING_STATION_RESOURCES,
  BOOSTER_PUMPING_STATION_RUNTIME_CLASSIFICATION, BOOSTER_PUMPING_STATION_RUNTIME_INPUT,
  BOOSTER_PUMPING_STATION_RUNTIME_SOURCE_IDS, BOOSTER_PUMPING_STATION_SHORT_INPUT,
  BOOSTER_PUMPING_STATION_SOURCE_ID, BOOSTER_PUMPING_STATION_SOURCE_METADATA,
  compileBoosterPumpingStationR1,
} from "../../../src/lib/estimate/v4/boosterPumpingStationR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileBoosterPumpingStationR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const close = (actual: string | null, expected: number, tolerance = 0.000_001) =>
  actual != null && Math.abs(Number(actual) - expected) <= tolerance;
const CONDITIONAL_INPUT = Object.freeze({
  bps_room_ventilation_upgrade_mode: "REQUIRED",
  bps_room_ventilation_upgrade_designation: "ROOM-VENT-UPGRADE-12ACH",
  bps_room_ventilation_upgrade_quantity_set: 1,
  bps_floor_strengthening_mode: "REQUIRED",
  bps_floor_strengthening_designation: "CFRP-FLOOR-STRENGTHENING-BPS",
  bps_floor_strengthening_quantity_set: 1,
  bps_standby_generator_mode: "REQUIRED",
  bps_standby_generator_designation: "DIESEL-GENSET-200KVA-ATS",
  bps_standby_generator_quantity_set: 1,
});

async function verifyCore(): Promise<Json> {
  const first = await compileBoosterPumpingStationR1({ ...BOOSTER_PUMPING_STATION_SHORT_INPUT });
  const changedArrangement = await compileBoosterPumpingStationR1({
    ...BOOSTER_PUMPING_STATION_SHORT_INPUT,
    bps_pump_installed_piece_per_skid: 4,
    bps_duty_pump_count_per_skid: 3,
    bps_standby_pump_count_per_skid: 1,
  });
  const changedProcurement = await compileBoosterPumpingStationR1({
    ...BOOSTER_PUMPING_STATION_SHORT_INPUT,
    bps_skid_length_m: 4,
    bps_skid_width_m: 2,
    bps_grout_thickness_m: 0.08,
    bps_cable_supplier_drum_length_m: 50,
    bps_cable_available_stock_m: 40,
  });
  const conditional = await compileBoosterPumpingStationR1({
    ...BOOSTER_PUMPING_STATION_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 52 && first.preliminaryNeeds.length === 0
    && quantity(first, "rc09:bps_skid_package") === "1"
    && quantity(first, "rc09:bps_pump_units") === "3"
    && quantity(first, "rc09:bps_isolation_valves") === "8"
    && quantity(first, "rc09:bps_nonshrink_grout") === "0.4725"
    && quantity(first, "rc09:bps_power_cable") === "200"
    && quantity(first, "rc09:labor:bps-mechanical") === "144")) {
    throw new Error("STOP_S27_26_BOOSTER_PUMPING_STATION_AUTOMATIC_FIRST_ESTIMATE");
  }
  if (!(quantity(changedArrangement, "rc09:bps_pump_units") === "4"
    && quantity(changedArrangement, "rc09:bps_isolation_valves") === "10"
    && quantity(changedArrangement, "rc09:bps_check_valves") === "4"
    && quantity(changedArrangement, "rc09:bps_flexible_connectors") === "8"
    && quantity(changedArrangement, "rc09:bps_cable_terminations") === "4")) {
    throw new Error("STOP_S27_26_BOOSTER_PUMPING_STATION_ARRANGEMENT_RECALCULATION");
  }
  if (!(close(quantity(changedProcurement, "rc09:bps-grout-balance:installed-net"), 0.64)
    && close(quantity(changedProcurement, "rc09:bps_nonshrink_grout"), 0.672)
    && close(quantity(changedProcurement, "rc09:bps-cable-balance:net-order-need"), 139.8)
    && quantity(changedProcurement, "rc09:bps_power_cable") === "150")) {
    throw new Error("STOP_S27_26_BOOSTER_PUMPING_STATION_PROCUREMENT_RECALCULATION");
  }
  if (conditional.rows.length !== 55 || conditional.preliminaryNeeds.length !== 0) {
    throw new Error("STOP_S27_26_BOOSTER_PUMPING_STATION_CONDITIONAL_PROFILE");
  }
  if (/r4_a6_pump_station|golden_rate|normFactor/iu
    .test(JSON.stringify(BOOSTER_PUMPING_STATION_FORMULAS))) {
    throw new Error("STOP_S27_26_BOOSTER_PUMPING_STATION_LEGACY_COEFFICIENT");
  }
  if (/excavat|foundation|sewer|fire|external_network/iu
    .test(JSON.stringify(BOOSTER_PUMPING_STATION_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_26_BOOSTER_PUMPING_STATION_ADJACENT_SCOPE");
  }
  for (const rowId of [
    "rc09:bps_anchors", "rc09:bps_nonshrink_grout", "rc09:bps_flanged_joint_sets",
    "rc09:bps_power_cable", "rc09:bps_cable_terminations", "rc09:bps_test_water",
    "rc09:bps_disinfection_reagent", "rc09:equipment:bps-lifting",
    "rc09:logistics:bps-delivery", "rc09:bps_asbuilt",
  ]) {
    if (!BOOSTER_PUMPING_STATION_RESOURCES.some((resource) => resource.row_id === rowId)) {
      throw new Error(`STOP_S27_26_BOOSTER_PUMPING_STATION_COMPLETION_CHAIN:${rowId}`);
    }
  }
  const serialized = JSON.stringify({ first, changedArrangement, changedProcurement, conditional });
  return {
    status: "GREEN_S27_26_BOOSTER_PUMPING_STATION_AUTOMATIC_CORE",
    ordinaryInputCount: Object.keys(BOOSTER_PUMPING_STATION_SHORT_INPUT).length,
    visibleProfileInputCount: Object.keys(BOOSTER_PUMPING_STATION_RUNTIME_INPUT).length,
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: BOOSTER_PUMPING_STATION_SHORT_INPUT },
    arrangement: { pumpCount: quantity(changedArrangement, "rc09:bps_pump_units"),
      isolationValveCount: quantity(changedArrangement, "rc09:bps_isolation_valves") },
    procurement: {
      baselineOrderedCableM: quantity(first, "rc09:bps_power_cable"),
      changedNetOrderNeedM: quantity(changedProcurement, "rc09:bps-cable-balance:net-order-need"),
      changedOrderedCableM: quantity(changedProcurement, "rc09:bps_power_cable"),
      changedGroutOrderM3: quantity(changedProcurement, "rc09:bps_nonshrink_grout"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-26.booster-pumping-station-automatic-successor.v1",
  stopCode: "S27_26_BOOSTER_PUMPING_STATION_AUTOMATIC",
  applicationName: "s27-26-booster-pumping-station-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (66).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "c0cc1dc8b4bccbd1025f6c78426bd4f3d3dd464254b2aa534fea0d8e576ff91b",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "07c1ae30-73f7-51fa-a70e-e780a768f955",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "00846d78-ab09-5153-b7b6-3bb0e3dc4b9e",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-26/booster-pumping-station-automatic-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/booster-pumping-station-automatic-s27-25.json",
    "src/lib/estimate/v4/automaticConstructionOwnerR1.ts",
    "src/lib/estimate/v4/boosterPumpingStationR1.ts",
    "tests/estimateNorms/boosterPumpingStationR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2726BoosterPumpingStationAutomaticSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2726BoosterPumpingStationAutomaticIndependent.ts",
  ],
  catalogId: BOOSTER_PUMPING_STATION_CATALOG_ID,
  sourceId: BOOSTER_PUMPING_STATION_SOURCE_ID, normId: BOOSTER_PUMPING_STATION_NORM_ID,
  sourceMetadata: BOOSTER_PUMPING_STATION_SOURCE_METADATA,
  parameterDefinitions: BOOSTER_PUMPING_STATION_PARAMETERS,
  formulaDefinitions: BOOSTER_PUMPING_STATION_FORMULAS,
  resourceDefinitions: BOOSTER_PUMPING_STATION_RESOURCES,
  shortInput: BOOSTER_PUMPING_STATION_SHORT_INPUT,
  acceptanceInput: BOOSTER_PUMPING_STATION_ACCEPTANCE_INPUT,
  runtimeProfileInput: BOOSTER_PUMPING_STATION_RUNTIME_INPUT,
  runtimeProfileClassification: BOOSTER_PUMPING_STATION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: BOOSTER_PUMPING_STATION_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [71, 45, 45], benchmarkOrdinal: 63,
  validationScenario: "Q5_BOOSTER_PUMPING_STATION_AUTOMATIC_S27_26",
  passport: {
    canonicalRuName: "Монтаж заводской повысительной насосной установки",
    workKey: "booster_pumping_station",
    physicalResultRu: "Skid BPS-SKID-Q90-H45-2D1S смонтирован, испытан и принят в существующем помещении",
    includedScopeRu: [
      "заводской skid, насосы 2+1, внутренние коллекторы и гидропневматические баки",
      "арматура, соединители, анкеры, раствор, кабель, НКУ, ЧРП, ПЛК и КИП",
      "расходники, труд, механизмы, испытания, дезинфекция, документы и логистика",
      "модернизация помещения и резервный генератор только по условным ветвям",
    ],
    excludedScopeRu: [
      "отдельностоящее здание насосной, земляные работы, наружные сети, КНС и пожарная насосная",
      "неподтверждённые изменения помещения и внешние сети",
      "неподтверждённые материалы, оборудование и цены",
    ],
  },
  applicability: {
    country: "KG", operationClass: "FACTORY_POTABLE_WATER_BOOSTER_SKID_EXISTING_ROOM",
    skidAssembly: "BPS_SKID_Q90_H45_2D1S_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "bps_skid_count",
    knownScopeParameters: [...BOOSTER_PUMPING_STATION_KNOWN_SCOPE_PARAMETERS],
    ordinaryUserInputCount: Object.keys(BOOSTER_PUMPING_STATION_SHORT_INPUT).length,
    automaticAssemblyLaborEquipmentAndProcurement: true,
    visibleEditablePreliminaryProfile: true,
    visiblePowerCableProcurementBalance: true,
    directProjectMechanicalElectricalControlsLaborEquipmentQaAndLogisticsRequired: true,
    conditionalRoomAlterationsAndGeneratorFailClosed: true,
    derivedAccessoriesAsOrdinaryQuestionsForbidden: true,
    freestandingSewerFireAndExternalWorksExcluded: true,
  },
  binding: { rowId: "rc09:bps_acceptance", applicability: {
    technology_class: "FACTORY_ASSEMBLED_VARIABLE_SPEED_BOOSTER_SKID",
    operation_class: "BOOSTER_SKID_INSTALLATION_EXISTING_ROOM",
    skid_assembly: "BPS_SKID_Q90_H45_2D1S_EXPLICIT_PROJECT",
    scope_mode: "SEVEN_PRIMARY_FACTS_PLUS_VISIBLE_PROFILE_AND_AUTOMATIC_RESOURCE_GRAPH",
    source_id: BOOSTER_PUMPING_STATION_SOURCE_ID, norm_id: BOOSTER_PUMPING_STATION_NORM_ID,
    exact_locator: BOOSTER_PUMPING_STATION_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "PRIMARY_TIE_IN_GEOMETRY_PLUS_VISIBLE_EDITABLE_MANUFACTURER_PROFILE" } },
  locator: { key: "booster-pumping-station-skid-automatic-s27-25-v1",
    payload: { kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
      exactLocator: BOOSTER_PUMPING_STATION_SOURCE_METADATA.exact_locator,
      sourcePackSha256: BOOSTER_PUMPING_STATION_SOURCE_METADATA.artifact_sha256,
      ordinaryKnownInputs: Object.keys(BOOSTER_PUMPING_STATION_SHORT_INPUT),
      visibleEditableProfileInputs: Object.keys(BOOSTER_PUMPING_STATION_RUNTIME_INPUT),
      automaticFormulaIds: BOOSTER_PUMPING_STATION_FORMULAS.map((formula) => formula.formula_id),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT) } },
  search: {
    primaryUom: "piece", canonicalNameRu: "Монтаж заводской повысительной насосной установки",
    aliases: ["повысительная насосная установка в существующем помещении",
      "заводской насосный skid с частотным регулированием", "factory variable-speed booster pump skid"],
    shortScopeRu: "Один BPS-SKID-Q90-H45-2D1S в существующем помещении: 90 м3/ч при 45 м, насосы 2+1, коллекторы, два бака и силовой кабель; остальные ресурсы только по проекту.",
    keyDistinguishingParameters: [...BOOSTER_PUMPING_STATION_KNOWN_SCOPE_PARAMETERS],
    clarificationFields: [],
    includedBoundaries: ["skid, насосы, коллекторы, баки, арматура, КИП, электрика и автоматика",
      "анкеры, раствор, труд, механизмы, испытания, документы и логистика",
      "условные изменения помещения и резервный генератор только по проекту"],
    excludedBoundaries: ["отдельностоящая насосная, земляные работы, наружная сеть, КНС и пожарная насосная",
      "автоматические количества по числу насосов, длинам или геометрии", "неподтверждённые цены"],
    extraSearchTermsRu: "повысительная насосная установка skid существующее помещение насосы 2+1 ЧРП ПЛК",
    sourceProvenance: { exactExpandedBoosterPumpingStationOwner: true,
      sevenPrimaryFactIngress: true,
      automaticAssemblyLaborEquipmentAndProcurement: true,
      visiblePreliminaryProfileRequiresProjectConfirmation: true },
  },
  forbiddenAdjacentMatchers: [/excavat|котлован/iu, /foundation|фундамент/iu,
    /sewer|канализац/iu, /fire|пожарн/iu, /external.network|наружн.*сет/iu],
  owner: "S27_26_BOOSTER_PUMPING_STATION_AUTOMATIC_SUCCESSOR",
  receiptFileStem: "S27_26_BOOSTER_PUMPING_STATION_AUTOMATIC",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
