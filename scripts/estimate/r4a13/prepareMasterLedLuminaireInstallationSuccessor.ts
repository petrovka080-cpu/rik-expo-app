import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
  LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  LED_LUMINAIRE_INSTALLATION_FORMULAS,
  LED_LUMINAIRE_INSTALLATION_NORM_ID,
  LED_LUMINAIRE_INSTALLATION_PARAMETERS,
  LED_LUMINAIRE_INSTALLATION_RESOURCES,
  LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
  LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA,
  compileLedLuminaireInstallationR1,
} from "../../../src/lib/estimate/v4/ledLuminaireInstallationR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
async function verifyCore(): Promise<Json> {
  const short = await compileLedLuminaireInstallationR1({
    ...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  });
  const complete = await compileLedLuminaireInstallationR1({
    ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
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
  if (!(short.rows.length === 2
    && short.rows.find((row) => row.row_id === "rc09:led_luminaire_install")?.quantity === "30"
    && short.rows.find((row) => row.row_id === "rc09:led_luminaire_36w_ip40")?.quantity === "30"
    && short.preliminaryNeeds.length === 8)) {
    throw new Error("STOP_MASTER_LED_LUMINAIRE_INSTALLATION_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:luminaire_mounting_anchor_set", "rc09:luminaire_terminal_connector",
    "rc09:luminaire_connection_wire_3x1_5", "rc09:luminaire_pe_lug",
    "rc09:luminaire_work_platform", "rc09:luminaire_pe_continuity_test",
    "rc09:separate_led_driver", "rc09:suspended_ceiling_reinforcement_adapter",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_MASTER_LED_LUMINAIRE_NEED:${rowId}`);
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 8
    && complete.rows.find((row) => row.row_id === "rc09:luminaire_connection_wire_3x1_5")
      ?.quantity === "18"
    && complete.rows.find((row) => row.row_id === "rc09:luminaire_work_platform")
      ?.quantity === "0.6")) {
    throw new Error("STOP_MASTER_LED_LUMINAIRE_INSTALLATION_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 10)) {
    throw new Error("STOP_MASTER_LED_LUMINAIRE_INSTALLATION_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/(lighting.cable.line|light.switch|distribution.board)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_LED_LUMINAIRE_INSTALLATION_ADJACENT_SCOPE");
  }
  return { status: "GREEN_MASTER_LED_LUMINAIRE_INSTALLATION_CORE",
    short: { rowCount: short.rows.length, preliminaryNeedCount: short.preliminaryNeeds.length,
      knownLuminaireCount: LED_LUMINAIRE_INSTALLATION_SHORT_INPUT.luminaire_count,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id) },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-led-luminaire-installation-successor.v1",
  stopCode: "MASTER_LED_LUMINAIRE_INSTALLATION",
  applicationName: "r4-a13-6-master-led-luminaire-installation-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "1dff5dca-83a9-5c4b-88dc-2d151c7e4b2c",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "dc6e6e8a-014b-5cb3-af6f-d8293c69601f",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-led-luminaire-installation-successor-v1"),
  sourcePaths: ["src/lib/estimate/v4/ledLuminaireInstallationR1.ts",
    "tests/estimateNorms/ledLuminaireInstallationR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterLedLuminaireInstallationSuccessor.ts"],
  catalogId: LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  sourceId: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
  normId: LED_LUMINAIRE_INSTALLATION_NORM_ID,
  sourceMetadata: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA,
  parameterDefinitions: LED_LUMINAIRE_INSTALLATION_PARAMETERS,
  formulaDefinitions: LED_LUMINAIRE_INSTALLATION_FORMULAS,
  resourceDefinitions: LED_LUMINAIRE_INSTALLATION_RESOURCES,
  shortInput: LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  acceptanceInput: LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 23,
  validationScenario: "MASTER_BENCHMARK_23_LED_LUMINAIRE_INSTALLATION",
  passport: {
    canonicalRuName: "Монтаж накладного светодиодного светильника 36 Вт IP40",
    workKey: "electrical_interior_lighting_install_standard",
    physicalResultRu: "Накладные LED-светильники 36 Вт IP40 закреплены на подтверждённом основании, подключены, PE-соединение и включение проверены",
    includedScopeRu: ["монтаж известного количества точных светильников",
      "сами светильники по известной спецификации",
      "крепёж только по основанию и узлу монтажа",
      "соединители, провод и PE-наконечники только по схеме подключения",
      "средство доступа и проверки только по ППР и программе QA",
      "отдельный драйвер и потолочный адаптер только по условным ветвям"],
    excludedScopeRu: ["кабельная линия освещения", "выключатели", "распределительный щит",
      "автоматические поштучные и погонные нормы", "неподтверждённые цены"],
  },
  applicability: { country: "KG", operationClass: "INSTALL_LED_LUMINAIRE",
    materialSystem: "SURFACE_LED_36W_IP40", primaryMeasureParameterId: "luminaire_count",
    geometryParameters: ["luminaire_count"],
    knownScopeParameters: ["rated_power", "ingress_protection", "mounting_type"],
    projectScheduleRequiredForAccessoriesAccessAndQa: true,
    conditionalScopeFailClosed: true, universalProductivityClaimed: false,
    universalConsumptionClaimed: false, lightingCableLineExcluded: true,
    lightSwitchExcluded: true, distributionBoardExcluded: true },
  binding: { rowId: "rc09:led_luminaire_install", applicability: {
    technology_class: "LED_LUMINAIRE_INSTALLATION",
    operation_class: "INSTALL_LED_LUMINAIRE", material_system: "SURFACE_LED_36W_IP40",
    scope_mode: "KNOWN_COUNT_AND_LUMINAIRE_IDENTITY_PLUS_DIRECT_PROJECT_MOUNTING_CONNECTION_ACCESS_QA_QUANTITIES",
    source_id: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
    norm_id: LED_LUMINAIRE_INSTALLATION_NORM_ID,
    exact_locator: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_linear_rates_claimed: false,
    quantity_basis: "KNOWN_LUMINAIRE_COUNT_AND_IDENTITY_PLUS_APPROVED_PROJECT_MOUNTING_CONNECTION_ACCESS_QA" } },
  locator: { key: "led-luminaire-installation-project-package-required-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
    exactLocator: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.exact_locator,
    geometryInputs: ["luminaire_count"],
    knownScopeInputs: ["rated_power", "ingress_protection", "mounting_type"],
    directProjectInputs: ["anchor_set_designation", "anchor_set_quantity_set",
      "terminal_connector_designation", "terminal_connector_quantity_piece",
      "connection_wire_designation", "connection_wire_length_m", "pe_lug_designation",
      "pe_lug_quantity_piece", "work_platform_designation", "work_platform_shift",
      "pe_test_designation", "pe_test_count"],
    conditionalInputs: ["separate_driver_mode", "separate_driver_designation",
      "separate_driver_quantity_piece", "ceiling_adapter_mode", "ceiling_adapter_designation",
      "ceiling_adapter_quantity_set"] } },
  search: { primaryUom: "pcs",
    canonicalNameRu: "Монтаж накладного светодиодного светильника 36 Вт IP40",
    aliases: ["монтаж LED светильника 36 Вт IP40", "установка накладного светильника",
      "подключение светодиодного светильника", "surface LED luminaire installation"],
    shortScopeRu: "Монтаж 30 накладных LED-светильников 36 Вт IP40; количество сразу даёт работу и сами светильники, а крепёж, соединение, доступ и испытания уточняются добровольно по проекту.",
    keyDistinguishingParameters: ["luminaire_count", "rated_power", "ingress_protection",
      "mounting_type"],
    clarificationFields: ["anchor_set_designation", "anchor_set_quantity_set",
      "terminal_connector_designation", "terminal_connector_quantity_piece",
      "connection_wire_designation", "connection_wire_length_m", "pe_lug_quantity_piece",
      "work_platform_shift", "pe_test_count", "separate_driver_mode", "ceiling_adapter_mode"],
    includedBoundaries: ["работа и точные светильники по известному количеству",
      "крепёж по основанию и узлу", "соединители, провод и PE-наконечники по схеме",
      "средство доступа и проверки по ППР и QA", "условные драйвер и потолочный адаптер"],
    excludedBoundaries: ["кабельная линия освещения", "выключатели",
      "распределительный щит", "неподтверждённые цены"],
    extraSearchTermsRu: "LED светильник 36 Вт IP40 накладной анкер клемма провод 3×1,5 PE наконечник вышка проверка драйвер потолочный адаптер",
    sourceProvenance: { exactSurfaceLed36wIp40Owner: true,
      exactMountingConnectionAccessQaPackageRequiredForAccessoryQuantities: true } },
  forbiddenAdjacentMatchers: [/lighting.cable.line|кабельн.*лини.*освещен/iu,
    /light.switch|выключател/iu, /distribution.board|распределительн.*щит/iu],
  owner: "MASTER_LED_LUMINAIRE_INSTALLATION_SUCCESSOR",
  receiptFileStem: "MASTER_LED_LUMINAIRE_INSTALLATION",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
