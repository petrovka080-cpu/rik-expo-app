import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT, VVGNG_LS_POWER_CABLE_CATALOG_ID,
  VVGNG_LS_POWER_CABLE_FORMULAS, VVGNG_LS_POWER_CABLE_NORM_ID,
  VVGNG_LS_POWER_CABLE_PARAMETERS, VVGNG_LS_POWER_CABLE_RESOURCES,
  VVGNG_LS_POWER_CABLE_SHORT_INPUT, VVGNG_LS_POWER_CABLE_SOURCE_ID,
  VVGNG_LS_POWER_CABLE_SOURCE_METADATA, compileVvgngLsPowerCableR1,
} from "../../../src/lib/estimate/v4/vvgngLsPowerCableR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
async function verifyCore(): Promise<Json> {
  const short = await compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_SHORT_INPUT });
  const complete = await compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT });
  const conditional = await compileVvgngLsPowerCableR1({
    ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
    cable_tray_mode: "REQUIRED", cable_tray_designation: "Лоток по проекту",
    cable_tray_length_m: 90, protective_pipe_mode: "REQUIRED",
    protective_pipe_designation: "Труба по узлу", protective_pipe_length_m: 12,
    pulling_lubricant_mode: "REQUIRED", pulling_lubricant_designation: "Смазка по ППР",
    pulling_lubricant_quantity_kg: 2.5,
  });
  const needs = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  if (!(short.rows.length === 2
    && short.rows.find((row) => row.row_id === "rc09:vvgng_ls_cable_lay")?.quantity === "150"
    && short.rows.find((row) => row.row_id === "rc09:vvgng_a_ls_5x6_cable")?.quantity === "150"
    && short.preliminaryNeeds.length === 9)) {
    throw new Error("STOP_MASTER_VVGNG_LS_POWER_CABLE_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:fire_resistant_cable_marker", "rc09:halogen_free_cable_clamp",
    "rc09:cable_gland_for_5x6", "rc09:copper_lug_6mm2",
    "rc09:firestop_cable_penetration_compound", "rc09:power_cable_insulation_continuity_test",
    "rc09:cable_tray", "rc09:cable_protective_pipe", "rc09:cable_pulling_lubricant",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_MASTER_VVGNG_LS_CABLE_NEED:${rowId}`);
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 8
    && complete.rows.find((row) => row.row_id === "rc09:fire_resistant_cable_marker")
      ?.quantity === "12"
    && complete.rows.find((row) => row.row_id === "rc09:power_cable_insulation_continuity_test")
      ?.quantity === "3")) throw new Error("STOP_MASTER_VVGNG_LS_CABLE_COMPLETE_FIXTURE");
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 11)) {
    throw new Error("STOP_MASTER_VVGNG_LS_CABLE_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/(switchboard|building.full.power.system)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_VVGNG_LS_CABLE_ADJACENT_SCOPE");
  }
  return { status: "GREEN_MASTER_VVGNG_LS_POWER_CABLE_CORE",
    short: { rowCount: short.rows.length, preliminaryNeedCount: short.preliminaryNeeds.length,
      knownLengthM: VVGNG_LS_POWER_CABLE_SHORT_INPUT.length_m,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id) },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-vvgng-ls-power-cable-successor.v1",
  stopCode: "MASTER_VVGNG_LS_POWER_CABLE",
  applicationName: "r4-a13-6-master-vvgng-ls-power-cable-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "c573cc71-0a6b-5893-8928-2e56350b9a05",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "be86c1fe-c7dc-522f-8644-2d4309a0b53c",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-vvgng-ls-power-cable-successor-v1"),
  sourcePaths: ["src/lib/estimate/v4/vvgngLsPowerCableR1.ts",
    "tests/estimateNorms/vvgngLsPowerCableR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterVvgngLsPowerCableSuccessor.ts"],
  catalogId: VVGNG_LS_POWER_CABLE_CATALOG_ID, sourceId: VVGNG_LS_POWER_CABLE_SOURCE_ID,
  normId: VVGNG_LS_POWER_CABLE_NORM_ID, sourceMetadata: VVGNG_LS_POWER_CABLE_SOURCE_METADATA,
  parameterDefinitions: VVGNG_LS_POWER_CABLE_PARAMETERS,
  formulaDefinitions: VVGNG_LS_POWER_CABLE_FORMULAS,
  resourceDefinitions: VVGNG_LS_POWER_CABLE_RESOURCES,
  shortInput: VVGNG_LS_POWER_CABLE_SHORT_INPUT,
  acceptanceInput: VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT, verifyCore,
  expectedParentShape: [1, 63, 63], benchmarkOrdinal: 22,
  validationScenario: "MASTER_BENCHMARK_22_VVGNG_LS_POWER_CABLE",
  passport: {
    canonicalRuName: "Прокладка силового кабеля ВВГнг(А)-LS 5×6 мм²",
    workKey: "electrical_interior_vvg_cable_lay_standard",
    physicalResultRu: "Силовой кабель ВВГнг(А)-LS 5×6 мм² проложен по подтверждённому маршруту, промаркирован, оконцован, проходки заделаны и электроизмерения выполнены",
    includedScopeRu: ["прокладка по известной длине маршрута",
      "чистая длина точного кабеля без скрытого запаса",
      "маркеры и крепёж только по журналу и раскладке",
      "вводы и наконечники только по ведомости оконцеваний",
      "огнезащитный состав и испытания только по узлам и программе QA",
      "лоток, защитная труба и смазка только по условным ветвям"],
    excludedScopeRu: ["распределительный щит", "полная система электроснабжения здания",
      "автоматический процент запаса и погонные нормы", "неподтверждённые цены"],
  },
  applicability: { country: "KG", operationClass: "LAY_VVGNG_LS_POWER_CABLE",
    materialSystem: "VVGNG_A_LS_5X6_MM2", primaryMeasureParameterId: "length_m",
    geometryParameters: ["length_m"],
    knownScopeParameters: ["cable_mark", "core_count", "conductor_area_mm2"],
    projectScheduleRequiredForNonCableQuantities: true, conditionalScopeFailClosed: true,
    universalProductivityClaimed: false, universalConsumptionClaimed: false,
    switchboardExcluded: true, fullBuildingPowerSystemExcluded: true },
  binding: { rowId: "rc09:vvgng_ls_cable_lay", applicability: {
    technology_class: "VVGNG_LS_POWER_CABLE", operation_class: "LAY_VVGNG_LS_POWER_CABLE",
    material_system: "VVGNG_A_LS_5X6_MM2",
    scope_mode: "KNOWN_ROUTE_AND_CABLE_IDENTITY_PLUS_DIRECT_LAYOUT_TERMINATION_FIRESTOP_QA_QUANTITIES",
    source_id: VVGNG_LS_POWER_CABLE_SOURCE_ID, norm_id: VVGNG_LS_POWER_CABLE_NORM_ID,
    exact_locator: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_linear_rates_claimed: false,
    quantity_basis: "KNOWN_NET_ROUTE_AND_CABLE_IDENTITY_PLUS_APPROVED_PROJECT_TERMINATION_FIRESTOP_QA" } },
  locator: { key: "vvgng-ls-power-cable-project-package-required-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
    exactLocator: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.exact_locator,
    geometryInputs: ["length_m"],
    knownScopeInputs: ["cable_mark", "core_count", "conductor_area_mm2"],
    directProjectInputs: ["marker_designation", "marker_quantity_piece", "clamp_designation",
      "clamp_quantity_piece", "gland_designation", "gland_quantity_piece",
      "lug_designation", "lug_quantity_piece", "firestop_designation",
      "firestop_quantity_kg", "test_designation", "test_count"],
    conditionalInputs: ["cable_tray_mode", "cable_tray_designation", "cable_tray_length_m",
      "protective_pipe_mode", "protective_pipe_designation", "protective_pipe_length_m",
      "pulling_lubricant_mode", "pulling_lubricant_designation",
      "pulling_lubricant_quantity_kg"] } },
  search: { primaryUom: "m", canonicalNameRu: "Прокладка силового кабеля ВВГнг(А)-LS 5×6 мм²",
    aliases: ["силовой кабель ВВГнг А LS 5х6", "прокладка кабеля 5×6 мм²",
      "монтаж негорючего кабеля LS", "VVGng LS power cable laying"],
    shortScopeRu: "Прокладка ВВГнг(А)-LS 5×6 мм² по маршруту 150 м; длина сразу даёт работу и чистую длину кабеля, а маркировка, крепёж, оконцевания, проходки и испытания уточняются добровольно по проекту.",
    keyDistinguishingParameters: ["length_m", "cable_mark", "core_count", "conductor_area_mm2"],
    clarificationFields: ["marker_designation", "marker_quantity_piece", "clamp_designation",
      "clamp_quantity_piece", "gland_designation", "gland_quantity_piece", "lug_designation",
      "lug_quantity_piece", "firestop_designation", "firestop_quantity_kg", "test_count",
      "cable_tray_mode", "protective_pipe_mode", "pulling_lubricant_mode"],
    includedBoundaries: ["работа и чистая длина кабеля по маршруту",
      "маркировка и крепёж по журналу и раскладке", "вводы и наконечники по оконцеваниям",
      "проходки и электроизмерения по проекту и QA", "условные лоток, труба и смазка"],
    excludedBoundaries: ["распределительный щит", "полная система электроснабжения",
      "неподтверждённый запас кабеля", "неподтверждённые цены"],
    extraSearchTermsRu: "ВВГнг А LS 5×6 кабель маршрут бирка хомут ввод наконечник проходка изоляция непрерывность PE лоток труба смазка",
    sourceProvenance: { exactVvgngLsCableOwner: true,
      exactRouteTerminationFirestopQaPackageRequiredForNonCableQuantities: true } },
  forbiddenAdjacentMatchers: [/switchboard|распределительн.*щит/iu,
    /building_full_power_system|полн.*систем.*электроснабжен/iu],
  owner: "MASTER_VVGNG_LS_POWER_CABLE_SUCCESSOR",
  receiptFileStem: "MASTER_VVGNG_LS_POWER_CABLE",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
