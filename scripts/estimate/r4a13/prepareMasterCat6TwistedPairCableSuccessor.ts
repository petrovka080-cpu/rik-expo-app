import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
  CAT6_TWISTED_PAIR_CABLE_CATALOG_ID,
  CAT6_TWISTED_PAIR_CABLE_FORMULAS,
  CAT6_TWISTED_PAIR_CABLE_NORM_ID,
  CAT6_TWISTED_PAIR_CABLE_PARAMETERS,
  CAT6_TWISTED_PAIR_CABLE_RESOURCES,
  CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT,
  CAT6_TWISTED_PAIR_CABLE_SOURCE_ID,
  CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA,
  compileCat6TwistedPairCableR1,
} from "../../../src/lib/estimate/v4/cat6TwistedPairCableR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
async function verifyCore(): Promise<Json> {
  const short = await compileCat6TwistedPairCableR1({ ...CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT });
  const complete = await compileCat6TwistedPairCableR1({
    ...CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
  });
  const conditional = await compileCat6TwistedPairCableR1({
    ...CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
    keystone_mode: "REQUIRED", keystone_designation: "Keystone Cat.6 по спецификации",
    keystone_quantity_piece: 24, patch_panel_mode: "REQUIRED",
    patch_panel_designation: "Патч-панель Cat.6 по спецификации", patch_panel_quantity_piece: 1,
    information_outlet_mode: "REQUIRED",
    information_outlet_designation: "Розетка Cat.6 по плану",
    information_outlet_quantity_piece: 12,
    j_hook_mode: "REQUIRED", j_hook_designation: "J-hook по раскладке", j_hook_quantity_piece: 60,
  });
  const needs = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  if (!(short.rows.length === 3
    && short.rows.find((row) => row.row_id === "rc09:cat6_cable_lay")?.quantity === "300"
    && short.rows.find((row) => row.row_id === "rc09:uutp_cat6_4pair_lszh")?.quantity === "300"
    && short.rows.find((row) => row.row_id === "rc09:cat6_route_continuity_check")
      ?.quantity === "12"
    && short.preliminaryNeeds.length === 8)) {
    throw new Error("STOP_MASTER_CAT6_TWISTED_PAIR_CABLE_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:cat6_cable_identification_label", "rc09:reusable_velcro_cable_tie",
    "rc09:cat6_firestop_penetration", "rc09:structured_cable_certifier",
    "rc09:cat6_keystone", "rc09:cat6_patch_panel", "rc09:cat6_information_outlet",
    "rc09:cable_j_hook",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_MASTER_CAT6_CABLE_NEED:${rowId}`);
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 7
    && complete.rows.find((row) => row.row_id === "rc09:cat6_cable_identification_label")
      ?.quantity === "24"
    && complete.rows.find((row) => row.row_id === "rc09:structured_cable_certifier")
      ?.quantity === "3")) throw new Error("STOP_MASTER_CAT6_CABLE_COMPLETE_FIXTURE");
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 11)) {
    throw new Error("STOP_MASTER_CAT6_CABLE_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/(network.switch|server.rack|full.structured.cabling.system)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_CAT6_CABLE_ADJACENT_SCOPE");
  }
  return { status: "GREEN_MASTER_CAT6_TWISTED_PAIR_CABLE_CORE",
    short: { rowCount: short.rows.length, preliminaryNeedCount: short.preliminaryNeeds.length,
      knownLengthM: CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT.length_m,
      knownLineCount: CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT.line_count,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id) },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-cat6-twisted-pair-cable-successor.v1",
  stopCode: "MASTER_CAT6_TWISTED_PAIR_CABLE",
  applicationName: "r4-a13-6-master-cat6-twisted-pair-cable-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "abdfb50d-5f5c-5c4a-bf56-c863ff6cbc5e",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "6c5e3874-0362-52cd-876f-7d41876e5196",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-cat6-twisted-pair-cable-successor-v1"),
  sourcePaths: ["src/lib/estimate/v4/cat6TwistedPairCableR1.ts",
    "tests/estimateNorms/cat6TwistedPairCableR1.contract.test.ts",
    "scripts/estimate/r4a13/masterBenchmarkEvidence.shared.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterCat6TwistedPairCableSuccessor.ts"],
  catalogId: CAT6_TWISTED_PAIR_CABLE_CATALOG_ID,
  sourceId: CAT6_TWISTED_PAIR_CABLE_SOURCE_ID,
  normId: CAT6_TWISTED_PAIR_CABLE_NORM_ID,
  sourceMetadata: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA,
  parameterDefinitions: CAT6_TWISTED_PAIR_CABLE_PARAMETERS,
  formulaDefinitions: CAT6_TWISTED_PAIR_CABLE_FORMULAS,
  resourceDefinitions: CAT6_TWISTED_PAIR_CABLE_RESOURCES,
  shortInput: CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT,
  acceptanceInput: CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [6, 45, 45], benchmarkOrdinal: 24,
  validationScenario: "MASTER_BENCHMARK_24_CAT6_TWISTED_PAIR_CABLE",
  passport: {
    canonicalRuName: "Прокладка кабеля U/UTP Cat.6, 4 пары, LSZH",
    workKey: "site_telecom_connection",
    physicalResultRu: "Линии U/UTP Cat.6 LSZH проложены по подтверждённым трассам, промаркированы, проходки заделаны и целостность каждой линии проверена",
    includedScopeRu: ["прокладка по известной длине трасс",
      "чистая длина точного кабеля без скрытого запаса",
      "проверка целостности по известному количеству линий",
      "маркировка, Velcro и firestop только по проектным документам",
      "смены сертификационного тестера только по программе QA",
      "keystone, patch-panel, розетки и J-hook только по условным ветвям"],
    excludedScopeRu: ["сетевой коммутатор", "серверный шкаф", "полная система СКС",
      "автоматический процент запаса и погонные нормы", "неподтверждённые цены"],
  },
  applicability: { country: "KG", operationClass: "LAY_CAT6_TWISTED_PAIR_CABLE",
    materialSystem: "U_UTP_CAT6_4PAIR_LSZH", primaryMeasureParameterId: "length_m",
    geometryParameters: ["length_m", "line_count"], knownScopeParameters: ["cable_type"],
    projectScheduleRequiredForLabelFirestopSupportAndCertification: true,
    conditionalScopeFailClosed: true, universalProductivityClaimed: false,
    universalConsumptionClaimed: false, networkSwitchExcluded: true,
    serverRackExcluded: true, fullStructuredCablingSystemExcluded: true },
  binding: { rowId: "rc09:cat6_cable_lay", applicability: {
    technology_class: "CAT6_TWISTED_PAIR_CABLE",
    operation_class: "LAY_CAT6_TWISTED_PAIR_CABLE", material_system: "U_UTP_CAT6_4PAIR_LSZH",
    scope_mode: "KNOWN_ROUTE_LINE_COUNT_AND_CABLE_IDENTITY_PLUS_DIRECT_LABEL_FIRESTOP_SUPPORT_QA_QUANTITIES",
    source_id: CAT6_TWISTED_PAIR_CABLE_SOURCE_ID, norm_id: CAT6_TWISTED_PAIR_CABLE_NORM_ID,
    exact_locator: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_linear_rates_claimed: false,
    quantity_basis: "KNOWN_NET_ROUTE_LINE_COUNT_AND_CABLE_IDENTITY_PLUS_APPROVED_PROJECT_AND_QA" } },
  locator: { key: "cat6-twisted-pair-cable-project-package-required-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
    exactLocator: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.exact_locator,
    geometryInputs: ["length_m", "line_count"], knownScopeInputs: ["cable_type"],
    directProjectInputs: ["label_designation", "label_quantity_piece", "velcro_designation",
      "velcro_length_m", "firestop_designation", "firestop_volume_l", "certifier_designation",
      "certifier_shift"],
    conditionalInputs: ["keystone_mode", "keystone_designation", "keystone_quantity_piece",
      "patch_panel_mode", "patch_panel_designation", "patch_panel_quantity_piece",
      "information_outlet_mode", "information_outlet_designation",
      "information_outlet_quantity_piece", "j_hook_mode", "j_hook_designation",
      "j_hook_quantity_piece"] } },
  search: { primaryUom: "m", canonicalNameRu: "Прокладка кабеля U/UTP Cat.6, 4 пары, LSZH",
    aliases: ["кабель витая пара Cat 6 LSZH", "прокладка U UTP Cat.6",
      "монтаж кабеля СКС категории 6", "Cat6 twisted pair cable laying"],
    shortScopeRu: "Прокладка 300 м U/UTP Cat.6 LSZH для 12 линий; длина сразу даёт работу и чистый кабель, линии — проверки, а маркировка, крепление, проходки и tester shifts уточняются добровольно по проекту.",
    keyDistinguishingParameters: ["length_m", "line_count", "cable_type"],
    clarificationFields: ["label_designation", "label_quantity_piece", "velcro_designation",
      "velcro_length_m", "firestop_volume_l", "certifier_shift", "keystone_mode",
      "patch_panel_mode", "information_outlet_mode", "j_hook_mode"],
    includedBoundaries: ["работа и чистая длина кабеля по трассам",
      "проверка целостности по количеству линий", "маркировка, Velcro и firestop по проекту",
      "сертификационный тестер по программе QA", "условные пассивные компоненты и J-hook"],
    excludedBoundaries: ["сетевой коммутатор", "серверный шкаф", "полная СКС",
      "неподтверждённые цены"],
    extraSearchTermsRu: "U UTP Cat6 4 пары LSZH СКС кабель линия этикетка Velcro проходка тестер continuity keystone patch panel розетка J hook",
    sourceProvenance: { exactCat6CableOwner: true,
      explicitSemanticSuccessorOfExpandedSiteTelecomOwner: true,
      exactRouteLabelFirestopSupportQaPackageRequiredForNonCableQuantities: true } },
  forbiddenAdjacentMatchers: [/network.switch|сетев.*коммутатор/iu,
    /server.rack|серверн.*шкаф/iu, /full.structured.cabling.system|полн.*систем.*СКС/iu],
  owner: "MASTER_CAT6_TWISTED_PAIR_CABLE_SUCCESSOR",
  receiptFileStem: "MASTER_CAT6_TWISTED_PAIR_CABLE",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
