import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  SEWER_PUMPING_STATION_ACCEPTANCE_INPUT, SEWER_PUMPING_STATION_CATALOG_ID,
  SEWER_PUMPING_STATION_FORMULAS, SEWER_PUMPING_STATION_NORM_ID,
  SEWER_PUMPING_STATION_PARAMETERS, SEWER_PUMPING_STATION_RESOURCES,
  SEWER_PUMPING_STATION_RUNTIME_CLASSIFICATION, SEWER_PUMPING_STATION_RUNTIME_INPUT,
  SEWER_PUMPING_STATION_RUNTIME_SOURCE_IDS, SEWER_PUMPING_STATION_SHORT_INPUT,
  SEWER_PUMPING_STATION_SOURCE_ID, SEWER_PUMPING_STATION_SOURCE_METADATA,
  compileSewerPumpingStationR1,
} from "../../../src/lib/estimate/v4/sewerPumpingStationR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileSewerPumpingStationR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = ["sps_station_count", "sps_station_type",
  "sps_station_designation", "sps_wet_well_material", "sps_wet_well_diameter_mm",
  "sps_wet_well_depth_mm", "sps_design_flow_lps", "sps_design_head_m",
  "sps_pump_unit_installed_piece", "sps_pump_designation", "sps_duty_pump_count",
  "sps_standby_pump_count", "sps_motor_power_kw"];
const CONDITIONAL_INPUT = Object.freeze({
  sps_bypass_pumping_mode: "REQUIRED", sps_bypass_pumping_designation: "BYPASS-PUMP-Q60-H20",
  sps_bypass_pumping_machine_h: 72,
  sps_dewatering_mode: "REQUIRED", sps_dewatering_designation: "WELLPOINT-DW-100",
  sps_dewatering_machine_h: 96,
  sps_odor_control_mode: "REQUIRED", sps_odor_control_designation: "CARBON-FILTER-500",
  sps_odor_control_set_count: 1,
});

async function verifyCore(): Promise<Json> {
  const first = await compileSewerPumpingStationR1({ ...SEWER_PUMPING_STATION_SHORT_INPUT });
  const complete = await compileSewerPumpingStationR1({ ...SEWER_PUMPING_STATION_ACCEPTANCE_INPUT });
  const balanced = await compileSewerPumpingStationR1({ ...SEWER_PUMPING_STATION_ACCEPTANCE_INPUT,
    sps_pump_retained_spare_piece: 1, sps_pump_supplier_package_quantity_piece: 2 });
  const conditional = await compileSewerPumpingStationR1({
    ...SEWER_PUMPING_STATION_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 34
    && quantity(first, "rc09:sps_acceptance") === "1"
    && quantity(first, "rc09:sps_pump_units") === "3")) {
    throw new Error("STOP_S27_24_SEWER_PUMPING_STATION_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 39 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:sps_wet_well_shell") === "1"
    && quantity(complete, "rc09:sps_isolation_valves") === "4"
    && quantity(complete, "rc09:sps_check_valves") === "3"
    && quantity(complete, "rc09:sps_internal_cable") === "180"
    && quantity(complete, "rc09:sps_excavation") === "240"
    && quantity(complete, "rc09:labor:sps-mechanical-installation") === "160"
    && quantity(complete, "rc09:equipment:sps-crane") === "48"
    && quantity(complete, "rc09:logistics:sps-material-delivery") === "14")) {
    throw new Error("STOP_S27_24_SEWER_PUMPING_STATION_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:sps-pump-balance:installed-net") === "3"
    && quantity(balanced, "rc09:sps-pump-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:sps-pump-balance:total-need") === "4"
    && quantity(balanced, "rc09:sps-pump-balance:package-count") === "2"
    && quantity(balanced, "rc09:sps_pump_units") === "4"
    && quantity(balanced, "rc09:sps-pump-balance:remainder") === "1"
    && quantity(balanced, "rc09:sps-pump-balance:surplus-beyond-spare") === "0")) {
    throw new Error("STOP_S27_24_SEWER_PUMPING_STATION_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 42 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_SEWER_PUMPING_STATION_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:sps_acceptance", "rc09:sps_functional_tests",
    "rc09:sps_electrical_tests", "rc09:sps_asbuilt_documents"]) {
    const graph = SEWER_PUMPING_STATION_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_SEWER_PUMPING_STATION_DOUBLE_COST:${rowId}`);
    }
  }
  if (/station_count\s*\*|design_(?:flow|head)\w*\s*\*|wet_well_(?:diameter|depth)\w*\s*\*|golden_rate|normFactor/iu
    .test(JSON.stringify(SEWER_PUMPING_STATION_FORMULAS))) {
    throw new Error("STOP_S27_24_SEWER_PUMPING_STATION_LEGACY_COEFFICIENT");
  }
  if (/sewer_pipe_lm|inspection_manhole|hydraulic_testing_lm|rc09:pbb_|rc09:hyd_/iu
    .test(JSON.stringify(SEWER_PUMPING_STATION_RESOURCES))) {
    throw new Error("STOP_S27_24_SEWER_PUMPING_STATION_NETWORK_TEMPLATE_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return { status: "GREEN_S27_24_SEWER_PUMPING_STATION_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: SEWER_PUMPING_STATION_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedPiece: quantity(balanced, "rc09:sps-pump-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:sps-pump-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:sps-pump-balance:total-need"),
      packageCount: quantity(balanced, "rc09:sps-pump-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:sps_pump_units"),
      remainderPiece: quantity(balanced, "rc09:sps-pump-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:sps-pump-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.sewer-pumping-station-balanced-successor.v1",
  stopCode: "S27_24_SEWER_PUMPING_STATION_BALANCED",
  applicationName: "s27-24-sewer-pumping-station-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "dbd046df-4e91-5fd8-abe0-dbce9dc04747",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "c33b379e-6b83-50d2-b9af-deeabecc3f97",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/sewer-pumping-station-balanced-successor"),
  sourcePaths: ["data/estimate-benchmarks/source-packs/sewer-pumping-station-balanced-s27-24.json",
    "src/lib/estimate/v4/sewerPumpingStationR1.ts",
    "tests/estimateNorms/sewerPumpingStationR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724SewerPumpingStationBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724SewerPumpingStationBalancedIndependent.ts"],
  catalogId: SEWER_PUMPING_STATION_CATALOG_ID, sourceId: SEWER_PUMPING_STATION_SOURCE_ID,
  normId: SEWER_PUMPING_STATION_NORM_ID, sourceMetadata: SEWER_PUMPING_STATION_SOURCE_METADATA,
  parameterDefinitions: SEWER_PUMPING_STATION_PARAMETERS,
  formulaDefinitions: SEWER_PUMPING_STATION_FORMULAS,
  resourceDefinitions: SEWER_PUMPING_STATION_RESOURCES,
  shortInput: SEWER_PUMPING_STATION_SHORT_INPUT,
  acceptanceInput: SEWER_PUMPING_STATION_ACCEPTANCE_INPUT,
  runtimeProfileInput: SEWER_PUMPING_STATION_RUNTIME_INPUT,
  runtimeProfileClassification: SEWER_PUMPING_STATION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: SEWER_PUMPING_STATION_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 47,
  validationScenario: "Q5_SEWER_PUMPING_STATION_BALANCED_S27_24",
  passport: { canonicalRuName: "Монтаж комплектной канализационной насосной станции",
    workKey: "sewer_pumping_station",
    physicalResultRu: "Одна комплектная КНС SPS-GRP-D2400-H6500-Q45-H18-2D1S с тремя насосами FLYGT-N-3153-22KW смонтирована, испытана и принята",
    includedScopeRu: ["подземная GRP мокрая камера D2400 H6500 и схема 2 рабочих + 1 резервный насос",
      "насосы, направляющие, арматура, внутренний коллектор, уровнемеры, шкаф управления и кабели",
      "вентиляция, доступ и безопасность, основание, раствор, земляные работы, труд, механизмы, QA, логистика и баланс насосов",
      "байпасная перекачка, водоотлив и удаление запахов только по условным ветвям"],
    excludedScopeRu: ["наружные самотечные и напорные сети и колодцы",
      "внешнее электроснабжение, невыбранные здания и очистное оборудование",
      "автоматические объёмы по количеству, расходу, напору или размерам", "неподтверждённые цены"] },
  applicability: { country: "KG", operationClass: "PREFABRICATED_GRP_SEWER_PUMPING_STATION",
    stationAssembly: "SPS_GRP_D2400_H6500_Q45_H18_2D1S_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "sps_station_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visiblePumpUnitProcurementBalance: true,
    directProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalOperatingScopeFailClosed: true, countFlowHeadOrDimensionDerivedQuantitiesForbidden: true,
    externalNetworksPowerBuildingsAndTreatmentEquipmentExcluded: true },
  binding: { rowId: "rc09:sps_acceptance", applicability: {
    technology_class: "PREFABRICATED_GRP_WET_WELL_SPS",
    operation_class: "PREFABRICATED_GRP_SEWER_PUMPING_STATION",
    station_assembly: "SPS_GRP_D2400_H6500_Q45_H18_2D1S_EXPLICIT_PROJECT",
    scope_mode: "KNOWN_SPS_IDENTITY_PLUS_VISIBLE_PUMP_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: SEWER_PUMPING_STATION_SOURCE_ID, norm_id: SEWER_PUMPING_STATION_NORM_ID,
    exact_locator: SEWER_PUMPING_STATION_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_SPS_IDENTITY_PLUS_APPROVED_PROJECT_AND_MANUFACTURER_PACKAGE" } },
  locator: { key: "sewer-pumping-station-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED", exactLocator: SEWER_PUMPING_STATION_SOURCE_METADATA.exact_locator,
    sourcePackSha256: SEWER_PUMPING_STATION_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(SEWER_PUMPING_STATION_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(SEWER_PUMPING_STATION_RUNTIME_INPUT),
    directProjectInputs: SEWER_PUMPING_STATION_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(SEWER_PUMPING_STATION_SHORT_INPUT, id)
        && !id.startsWith("sps_bypass_pumping_") && !id.startsWith("sps_dewatering_")
        && !id.startsWith("sps_odor_control_")),
    conditionalInputs: ["sps_bypass_pumping_mode", "sps_bypass_pumping_designation",
      "sps_bypass_pumping_machine_h", "sps_dewatering_mode", "sps_dewatering_designation",
      "sps_dewatering_machine_h", "sps_odor_control_mode", "sps_odor_control_designation",
      "sps_odor_control_set_count"] } },
  search: { primaryUom: "piece", canonicalNameRu: "Монтаж комплектной канализационной насосной станции",
    aliases: ["комплектная КНС из стеклопластика", "подземная мокрая камера с погружными насосами",
      "КНС 45 л/с 18 м", "prefabricated GRP sewage pumping station"],
    shortScopeRu: "Одна комплектная GRP КНС SPS-GRP-D2400-H6500-Q45-H18-2D1S: D2400 H6500, 45 л/с, 18 м, три насоса 22 кВт по схеме 2+1; ресурсы по проекту и изготовителю.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: SEWER_PUMPING_STATION_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(SEWER_PUMPING_STATION_SHORT_INPUT, id)),
    includedBoundaries: ["мокрая камера, насосы, направляющие, арматура, коллектор, датчики, автоматика и кабели",
      "вентиляция, доступ, основание, земляные работы, труд, механизмы, испытания, логистика и баланс насосов",
      "условные байпасная перекачка, водоотлив и удаление запахов только по проекту"],
    excludedBoundaries: ["наружные сети, колодцы и внешнее электроснабжение",
      "невыбранные здания и оборудование очистки", "автоматические объёмы по расходу, напору или размерам",
      "неподтверждённые материалы и цены"],
    extraSearchTermsRu: "КНС канализационная насосная станция мокрая камера стеклопластик погружной насос 2 рабочих 1 резервный",
    sourceProvenance: { exactExpandedSewerPumpingStationOwner: true,
      knownSelectedStationIdentityHydraulicsGeometryAndPumpArrangement: true,
      visibleIndependentPumpUnitProcurementBalance: true,
      exactProjectMaterialLaborEquipmentQaAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/sewer.pipe|канализац.*труб/iu,
    /inspection.manhole|смотров.*колод/iu, /treatment.plant|очистн.*сооруж/iu],
  owner: "S27_24_SEWER_PUMPING_STATION_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_SEWER_PUMPING_STATION_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
