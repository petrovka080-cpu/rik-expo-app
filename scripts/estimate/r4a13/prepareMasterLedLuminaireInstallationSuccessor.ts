import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
  LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  LED_LUMINAIRE_INSTALLATION_FORMULAS,
  LED_LUMINAIRE_INSTALLATION_NORM_ID,
  LED_LUMINAIRE_INSTALLATION_PARAMETERS,
  LED_LUMINAIRE_INSTALLATION_RESOURCES,
  LED_LUMINAIRE_INSTALLATION_RUNTIME_CLASSIFICATION,
  LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT,
  LED_LUMINAIRE_INSTALLATION_RUNTIME_SOURCE_IDS,
  LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
  LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA,
  compileLedLuminaireInstallationR1,
} from "../../../src/lib/estimate/v4/ledLuminaireInstallationR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileLedLuminaireInstallationR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

async function verifyCore(): Promise<Json> {
  const short = await compileLedLuminaireInstallationR1({
    ...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  });
  const complete = await compileLedLuminaireInstallationR1({
    ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
  });
  const balanced = await compileLedLuminaireInstallationR1({
    ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
    luminaire_retained_spare_piece: 3,
    luminaire_supplier_pack_size_piece: 8,
  });
  const conditional = await compileLedLuminaireInstallationR1({
    ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
    separate_driver_mode: "REQUIRED",
    separate_driver_designation: "Драйвер по ведомости светильников",
    separate_driver_quantity_piece: 30,
    ceiling_adapter_mode: "REQUIRED",
    ceiling_adapter_designation: "Адаптер усиления по узлу потолка",
    ceiling_adapter_quantity_set: 30,
  });
  const needs = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  if (!(short.rows.length === 8
    && quantity(short, "rc09:led_luminaire_install") === "30"
    && quantity(short, "rc09:led_luminaire_36w_ip40") === "30"
    && quantity(short, "led:balance:installed-net") === "30"
    && quantity(short, "led:balance:retained-spare") === "0"
    && quantity(short, "led:balance:package-count") === "30"
    && short.preliminaryNeeds.length === 15)) {
    throw new Error("STOP_MASTER_LED_LUMINAIRE_INSTALLATION_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:luminaire_mounting_anchor_set", "rc09:luminaire_terminal_connector",
    "rc09:luminaire_connection_wire_3x1_5", "rc09:luminaire_pe_lug",
    "rc09:luminaire_work_platform", "rc09:luminaire_pe_continuity_test",
    "led:labor:installation", "led:labor:testing",
    "led:equipment:drilling-tool", "led:equipment:installation-tool",
    "led:equipment:tester", "led:logistics:delivery", "led:logistics:waste-removal",
    "rc09:separate_led_driver", "rc09:suspended_ceiling_reinforcement_adapter",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_MASTER_LED_LUMINAIRE_NEED:${rowId}`);
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 21
    && quantity(complete, "rc09:luminaire_connection_wire_3x1_5") === "18"
    && quantity(complete, "rc09:luminaire_work_platform") === "0.6"
    && quantity(complete, "led:labor:installation") === "18"
    && quantity(complete, "led:equipment:tester") === "3"
    && quantity(complete, "led:logistics:delivery") === "1")) {
    throw new Error("STOP_MASTER_LED_LUMINAIRE_INSTALLATION_COMPLETE_FIXTURE");
  }
  if (!(quantity(balanced, "led:balance:installed-net") === "30"
    && quantity(balanced, "led:balance:retained-spare") === "3"
    && quantity(balanced, "led:balance:total-need") === "33"
    && quantity(balanced, "led:balance:package-count") === "5"
    && quantity(balanced, "rc09:led_luminaire_36w_ip40") === "40"
    && quantity(balanced, "led:balance:remainder") === "10"
    && quantity(balanced, "led:balance:surplus-beyond-reserve") === "7")) {
    throw new Error("STOP_MASTER_LED_LUMINAIRE_INSTALLATION_PROCUREMENT_BALANCE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 23)) {
    throw new Error("STOP_MASTER_LED_LUMINAIRE_INSTALLATION_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, balanced, conditional });
  if (/(lighting.cable.line|light.switch|distribution.board)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_LED_LUMINAIRE_INSTALLATION_ADJACENT_SCOPE");
  }
  return { status: "GREEN_S27_23_LED_LUMINAIRE_INSTALLATION_BALANCED_CORE",
    short: { rowCount: short.rows.length, preliminaryNeedCount: short.preliminaryNeeds.length,
      knownLuminaireCount: LED_LUMINAIRE_INSTALLATION_SHORT_INPUT.luminaire_count,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id) },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "led:balance:installed-net"),
      retainedSparePiece: quantity(balanced, "led:balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "led:balance:total-need"),
      packageCount: quantity(balanced, "led:balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:led_luminaire_36w_ip40"),
      remainderPiece: quantity(balanced, "led:balance:remainder"),
      surplusBeyondReservePiece: quantity(balanced, "led:balance:surplus-beyond-reserve"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-23.led-luminaire-installation-balanced-successor.v1",
  stopCode: "S27_23_LED_LUMINAIRE_INSTALLATION_BALANCED",
  applicationName: "s27-23-led-luminaire-installation-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "2dd8c955-95d3-5736-aa50-093bad9e4f9b",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "32bf116e-d349-502c-a74d-fa764b93b50d",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-23/led-luminaire-installation-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/led-luminaire-installation-balanced-s27-23.json",
    "src/lib/estimate/v4/ledLuminaireInstallationR1.ts",
    "tests/estimateNorms/ledLuminaireInstallationR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterLedLuminaireInstallationSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2723LedLuminaireInstallationIndependent.ts",
  ],
  catalogId: LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  sourceId: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
  normId: LED_LUMINAIRE_INSTALLATION_NORM_ID,
  sourceMetadata: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA,
  parameterDefinitions: LED_LUMINAIRE_INSTALLATION_PARAMETERS,
  formulaDefinitions: LED_LUMINAIRE_INSTALLATION_FORMULAS,
  resourceDefinitions: LED_LUMINAIRE_INSTALLATION_RESOURCES,
  shortInput: LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  acceptanceInput: LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
  runtimeProfileInput: LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT,
  runtimeProfileClassification: LED_LUMINAIRE_INSTALLATION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: LED_LUMINAIRE_INSTALLATION_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [22, 10, 10],
  benchmarkOrdinal: 23,
  validationScenario: "MASTER_BENCHMARK_23_LED_LUMINAIRE_INSTALLATION",
  passport: {
    canonicalRuName: "Монтаж накладного светодиодного светильника 36 Вт IP40",
    workKey: "electrical_interior_lighting_install_standard",
    physicalResultRu: "Накладные LED-светильники 36 Вт IP40 закреплены на подтверждённом основании, подключены, PE-соединение и включение проверены",
    includedScopeRu: ["монтаж известного количества точных светильников",
      "видимый баланс установленных светильников, резерва, упаковки, заказа и остатка",
      "крепёж только по основанию и узлу монтажа",
      "соединители, провод и PE-наконечники только по схеме подключения",
      "труд, монтажное и измерительное оборудование только по ППР и программе QA",
      "доставка и вывоз отходов только по проектному плану логистики",
      "отдельный драйвер и потолочный адаптер только по условным ветвям"],
    excludedScopeRu: ["кабельная линия освещения", "выключатели", "распределительный щит",
      "автоматические поштучные и погонные нормы", "неподтверждённые цены"],
  },
  applicability: { country: "KG", operationClass: "INSTALL_LED_LUMINAIRE",
    materialSystem: "SURFACE_LED_36W_IP40", primaryMeasureParameterId: "luminaire_count",
    geometryParameters: ["luminaire_count"],
    knownScopeParameters: ["rated_power", "ingress_protection", "mounting_type"],
    visibleProcurementBalance: true,
    projectScheduleRequiredForLaborMachineryAccessoriesAccessAndQa: true,
    conditionalScopeFailClosed: true, universalProductivityClaimed: false,
    universalConsumptionClaimed: false, lightingCableLineExcluded: true,
    lightSwitchExcluded: true, distributionBoardExcluded: true },
  binding: { rowId: "rc09:led_luminaire_install", applicability: {
    technology_class: "LED_LUMINAIRE_INSTALLATION",
    operation_class: "INSTALL_LED_LUMINAIRE", material_system: "SURFACE_LED_36W_IP40",
    scope_mode: "KNOWN_COUNT_PLUS_VISIBLE_PROCUREMENT_BALANCE_AND_PROJECT_RESOURCE_SCHEDULE",
    source_id: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
    norm_id: LED_LUMINAIRE_INSTALLATION_NORM_ID,
    exact_locator: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_linear_rates_claimed: false,
    quantity_basis: "NET_INSTALLED_COUNT_PLUS_VISIBLE_SPARE_PACKAGING_AND_APPROVED_PROJECT_RESOURCES" } },
  locator: { key: "led-luminaire-installation-krerm-project-balance-s27-23-v2", payload: {
    kind: "OFFICIAL_GUIDANCE_AND_PROJECT_DOCUMENT_PACKAGE_REQUIRED",
    exactLocator: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.exact_locator,
    geometryInputs: ["luminaire_count"],
    knownScopeInputs: ["rated_power", "ingress_protection", "mounting_type"],
    officialGuidanceArtifactSha256: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.artifact_sha256,
    visiblePreliminaryBalanceInputs: Object.keys(LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT),
    directProjectInputs: ["anchor_set_designation", "anchor_set_quantity_set",
      "terminal_connector_designation", "terminal_connector_quantity_piece",
      "connection_wire_designation", "connection_wire_length_m", "pe_lug_designation",
      "pe_lug_quantity_piece", "work_platform_designation", "work_platform_shift",
      "pe_test_designation", "pe_test_count", "luminaire_installation_labor_h",
      "luminaire_testing_labor_h", "luminaire_drilling_tool_machine_h",
      "luminaire_installation_tool_machine_h", "luminaire_tester_machine_h",
      "luminaire_delivery_trip_count", "luminaire_waste_removal_trip_count"],
    conditionalInputs: ["separate_driver_mode", "separate_driver_designation",
      "separate_driver_quantity_piece", "ceiling_adapter_mode", "ceiling_adapter_designation",
      "ceiling_adapter_quantity_set"] } },
  search: { primaryUom: "pcs",
    canonicalNameRu: "Монтаж накладного светодиодного светильника 36 Вт IP40",
    aliases: ["монтаж LED светильника 36 Вт IP40", "установка накладного светильника",
      "подключение светодиодного светильника", "surface LED luminaire installation"],
    shortScopeRu: "Монтаж 30 накладных LED-светильников 36 Вт IP40 с видимым балансом изделий; проектные комплектующие, труд, оборудование, логистика и испытания остаются точечными уточнениями до получения ППР и ведомостей.",
    keyDistinguishingParameters: ["luminaire_count", "rated_power", "ingress_protection",
      "mounting_type"],
    clarificationFields: ["luminaire_retained_spare_piece",
      "luminaire_supplier_pack_size_piece", "anchor_set_designation", "anchor_set_quantity_set",
      "terminal_connector_designation", "terminal_connector_quantity_piece",
      "connection_wire_designation", "connection_wire_length_m", "pe_lug_quantity_piece",
      "work_platform_shift", "pe_test_count", "luminaire_installation_labor_h",
      "luminaire_testing_labor_h", "luminaire_drilling_tool_machine_h",
      "luminaire_installation_tool_machine_h", "luminaire_tester_machine_h",
      "luminaire_delivery_trip_count", "luminaire_waste_removal_trip_count",
      "separate_driver_mode", "ceiling_adapter_mode"],
    includedBoundaries: ["операция и точные светильники по известному количеству",
      "видимый баланс резерва, упаковки, заказа и остатка",
      "крепёж по основанию и узлу", "соединители, провод и PE-наконечники по схеме",
      "труд, средство доступа, инструмент и проверки по ППР и QA",
      "логистика по проектному плану", "условные драйвер и потолочный адаптер"],
    excludedBoundaries: ["кабельная линия освещения", "выключатели",
      "распределительный щит", "неподтверждённые цены"],
    extraSearchTermsRu: "LED светильник 36 Вт IP40 накладной резерв упаковка заказ остаток труд анкер клемма провод 3×1,5 PE наконечник вышка инструмент проверка доставка драйвер потолочный адаптер",
    sourceProvenance: { exactSurfaceLed36wIp40Owner: true,
      officialKrermGuidanceCaptured: true,
      visibleProcurementBalance: true,
      exactMountingConnectionAccessQaPackageRequiredForResourceQuantities: true } },
  forbiddenAdjacentMatchers: [/lighting.cable.line|кабельн.*лини.*освещен/iu,
    /light.switch|выключател/iu, /distribution.board|распределительн.*щит/iu],
  owner: "S27_23_LED_LUMINAIRE_INSTALLATION_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_23_LED_LUMINAIRE_INSTALLATION_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
