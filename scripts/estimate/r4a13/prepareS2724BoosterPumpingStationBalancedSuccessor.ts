import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  BOOSTER_PUMPING_STATION_ACCEPTANCE_INPUT, BOOSTER_PUMPING_STATION_CATALOG_ID,
  BOOSTER_PUMPING_STATION_FORMULAS, BOOSTER_PUMPING_STATION_NORM_ID,
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
const KNOWN_SCOPE_PARAMETERS = [
  "bps_skid_count", "bps_skid_designation", "bps_skid_type", "bps_duty",
  "bps_design_flow_m3_h", "bps_design_head_m", "bps_pump_installed_piece",
  "bps_pump_designation", "bps_duty_pump_count", "bps_standby_pump_count",
  "bps_motor_power_kw", "bps_suction_manifold_installed_m",
  "bps_suction_manifold_designation", "bps_discharge_manifold_installed_m",
  "bps_discharge_manifold_designation", "bps_pressure_vessel_installed_piece",
  "bps_pressure_vessel_designation", "bps_power_cable_installed_m", "bps_power_cable_designation",
];
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
  const complete = await compileBoosterPumpingStationR1({ ...BOOSTER_PUMPING_STATION_ACCEPTANCE_INPUT });
  const balanced = await compileBoosterPumpingStationR1({ ...BOOSTER_PUMPING_STATION_ACCEPTANCE_INPUT,
    bps_power_cable_retained_spare_m: 15, bps_power_cable_supplier_drum_length_m: 100 });
  const conditional = await compileBoosterPumpingStationR1({
    ...BOOSTER_PUMPING_STATION_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 14 && first.preliminaryNeeds.length === 31
    && quantity(first, "rc09:bps_acceptance") === "1"
    && quantity(first, "rc09:bps_pump_units") === "3"
    && quantity(first, "rc09:bps_pressure_vessels") === "2"
    && quantity(first, "rc09:bps_power_cable") === "160")) {
    throw new Error("STOP_S27_24_BOOSTER_PUMPING_STATION_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:bps_isolation_valves") === "8"
    && quantity(complete, "rc09:bps_nonshrink_grout") === "0.45"
    && quantity(complete, "rc09:labor:bps-mechanical") === "144"
    && quantity(complete, "rc09:equipment:bps-lifting") === "24"
    && quantity(complete, "rc09:logistics:bps-delivery") === "6")) {
    throw new Error("STOP_S27_24_BOOSTER_PUMPING_STATION_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:bps-cable-balance:installed-net") === "160"
    && quantity(balanced, "rc09:bps-cable-balance:retained-spare") === "15"
    && quantity(balanced, "rc09:bps-cable-balance:total-need") === "175"
    && quantity(balanced, "rc09:bps-cable-balance:drum-count") === "2"
    && quantity(balanced, "rc09:bps_power_cable") === "200"
    && quantity(balanced, "rc09:bps-cable-balance:remainder") === "40"
    && quantity(balanced, "rc09:bps-cable-balance:surplus-beyond-spare") === "25")) {
    throw new Error("STOP_S27_24_BOOSTER_PUMPING_STATION_PROCUREMENT_BALANCE");
  }
  if (conditional.rows.length !== 45 || conditional.preliminaryNeeds.length !== 0) {
    throw new Error("STOP_S27_24_BOOSTER_PUMPING_STATION_CONDITIONAL_PROFILE");
  }
  if (/\*\s*(?:110|25|16|8|6|4|2|1\.2|0\.35)|r4_a6_pump_station/iu
    .test(JSON.stringify(BOOSTER_PUMPING_STATION_FORMULAS))) {
    throw new Error("STOP_S27_24_BOOSTER_PUMPING_STATION_LEGACY_COEFFICIENT");
  }
  if (/excavat|foundation|sewer|fire|external_network/iu
    .test(JSON.stringify(BOOSTER_PUMPING_STATION_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_BOOSTER_PUMPING_STATION_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_BOOSTER_PUMPING_STATION_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: BOOSTER_PUMPING_STATION_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedM: quantity(balanced, "rc09:bps-cable-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:bps-cable-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:bps-cable-balance:total-need"),
      drumCount: quantity(balanced, "rc09:bps-cable-balance:drum-count"),
      orderedM: quantity(balanced, "rc09:bps_power_cable"),
      remainderM: quantity(balanced, "rc09:bps-cable-balance:remainder"),
      surplusM: quantity(balanced, "rc09:bps-cable-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.booster-pumping-station-balanced-successor.v1",
  stopCode: "S27_24_BOOSTER_PUMPING_STATION_BALANCED",
  applicationName: "s27-24-booster-pumping-station-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "e4d76e95-0a96-5d27-876d-aa110bb94afa",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "4e098825-9e34-5c2d-a9f2-7b0f04fd6152",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/booster-pumping-station-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/booster-pumping-station-skid-power-cable-balanced-s27-24.json",
    "src/lib/estimate/v4/boosterPumpingStationR1.ts",
    "tests/estimateNorms/boosterPumpingStationR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724BoosterPumpingStationBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724BoosterPumpingStationBalancedIndependent.ts",
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
  verifyCore, expectedParentShape: [24, 31, 31], benchmarkOrdinal: 63,
  validationScenario: "Q5_BOOSTER_PUMPING_STATION_BALANCED_S27_24",
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
      "автоматические объёмы по числу насосов, длинам или геометрии",
      "неподтверждённые материалы, оборудование и цены",
    ],
  },
  applicability: {
    country: "KG", operationClass: "FACTORY_POTABLE_WATER_BOOSTER_SKID_EXISTING_ROOM",
    skidAssembly: "BPS_SKID_Q90_H45_2D1S_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "bps_skid_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visiblePowerCableProcurementBalance: true,
    directProjectMechanicalElectricalControlsLaborEquipmentQaAndLogisticsRequired: true,
    conditionalRoomAlterationsAndGeneratorFailClosed: true,
    pumpCountOrLengthDerivedAccessoriesForbidden: true,
    freestandingSewerFireAndExternalWorksExcluded: true,
  },
  binding: { rowId: "rc09:bps_acceptance", applicability: {
    technology_class: "FACTORY_ASSEMBLED_VARIABLE_SPEED_BOOSTER_SKID",
    operation_class: "BOOSTER_SKID_INSTALLATION_EXISTING_ROOM",
    skid_assembly: "BPS_SKID_Q90_H45_2D1S_EXPLICIT_PROJECT",
    scope_mode: "KNOWN_SKID_SCOPE_PLUS_VISIBLE_CABLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: BOOSTER_PUMPING_STATION_SOURCE_ID, norm_id: BOOSTER_PUMPING_STATION_NORM_ID,
    exact_locator: BOOSTER_PUMPING_STATION_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_SKID_SCOPE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_CABLE_DRUM" } },
  locator: { key: "booster-pumping-station-factory-skid-power-cable-balance-s27-24-v1",
    payload: { kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: BOOSTER_PUMPING_STATION_SOURCE_METADATA.exact_locator,
      sourcePackSha256: BOOSTER_PUMPING_STATION_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(BOOSTER_PUMPING_STATION_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(BOOSTER_PUMPING_STATION_RUNTIME_INPUT),
      directProjectInputs: BOOSTER_PUMPING_STATION_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(BOOSTER_PUMPING_STATION_SHORT_INPUT, id)
          && !["room_ventilation_upgrade", "floor_strengthening", "standby_generator"]
            .some((branch) => id.startsWith(`bps_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT) } },
  search: {
    primaryUom: "piece", canonicalNameRu: "Монтаж заводской повысительной насосной установки",
    aliases: ["повысительная насосная установка в существующем помещении",
      "заводской насосный skid с частотным регулированием", "factory variable-speed booster pump skid"],
    shortScopeRu: "Один BPS-SKID-Q90-H45-2D1S в существующем помещении: 90 м3/ч при 45 м, насосы 2+1, коллекторы, два бака и силовой кабель; остальные ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: BOOSTER_PUMPING_STATION_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(BOOSTER_PUMPING_STATION_SHORT_INPUT, id)),
    includedBoundaries: ["skid, насосы, коллекторы, баки, арматура, КИП, электрика и автоматика",
      "анкеры, раствор, труд, механизмы, испытания, документы и логистика",
      "условные изменения помещения и резервный генератор только по проекту"],
    excludedBoundaries: ["отдельностоящая насосная, земляные работы, наружная сеть, КНС и пожарная насосная",
      "автоматические количества по числу насосов, длинам или геометрии", "неподтверждённые цены"],
    extraSearchTermsRu: "повысительная насосная установка skid существующее помещение насосы 2+1 ЧРП ПЛК",
    sourceProvenance: { exactExpandedBoosterPumpingStationOwner: true,
      knownFactorySkidPumpsManifoldsVesselsAndCableIdentity: true,
      visibleIndependentPowerCableProcurementBalance: true,
      exactProjectAccessoriesLaborEquipmentQaAndLogisticsRequired: true },
  },
  forbiddenAdjacentMatchers: [/excavat|котлован/iu, /foundation|фундамент/iu,
    /sewer|канализац/iu, /fire|пожарн/iu, /external.network|наружн.*сет/iu],
  owner: "S27_24_BOOSTER_PUMPING_STATION_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_BOOSTER_PUMPING_STATION_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
