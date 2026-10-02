import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
  CAT6_TWISTED_PAIR_CABLE_CATALOG_ID,
  CAT6_TWISTED_PAIR_CABLE_FORMULAS,
  CAT6_TWISTED_PAIR_CABLE_NORM_ID,
  CAT6_TWISTED_PAIR_CABLE_PARAMETERS,
  CAT6_TWISTED_PAIR_CABLE_RESOURCES,
  CAT6_TWISTED_PAIR_CABLE_RUNTIME_CLASSIFICATION,
  CAT6_TWISTED_PAIR_CABLE_RUNTIME_INPUT,
  CAT6_TWISTED_PAIR_CABLE_RUNTIME_SOURCE_IDS,
  CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT,
  CAT6_TWISTED_PAIR_CABLE_SOURCE_ID,
  CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA,
  compileCat6TwistedPairCableR1,
} from "../../../src/lib/estimate/v4/cat6TwistedPairCableR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const MINIMUM_REAL_QUANTITY_NEEDS = Object.freeze({
  "rc09:cat6_cable_identification_label": ["label_quantity_piece"],
  "rc09:reusable_velcro_cable_tie": ["velcro_length_m"],
  "rc09:cat6_firestop_penetration": ["firestop_volume_l"],
  "rc09:structured_cable_certifier": ["certifier_shift"],
});

function quantity(result: Awaited<ReturnType<typeof compileCat6TwistedPairCableR1>>, rowId: string) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

async function verifyCore(): Promise<Json> {
  const short = await compileCat6TwistedPairCableR1({ ...CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT });
  const complete = await compileCat6TwistedPairCableR1({
    ...CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
  });
  const balanced = await compileCat6TwistedPairCableR1({
    ...CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
    cable_expected_loss_ratio: 0.05,
    cable_retained_reserve_m: 15,
    cable_supplier_cut_increment_m: 305,
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
  if (!(short.rows.length === 9
    && quantity(short, "rc09:cat6_cable_lay") === "300"
    && quantity(short, "rc09:uutp_cat6_4pair_lszh") === "300"
    && quantity(short, "rc09:cat6_route_continuity_check") === "12"
    && short.preliminaryNeeds.length === 15)) {
    throw new Error("STOP_MASTER_CAT6_TWISTED_PAIR_CABLE_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:cat6_cable_identification_label", "rc09:reusable_velcro_cable_tie",
    "rc09:cat6_firestop_penetration", "rc09:structured_cable_certifier",
    "rc09:cat6_keystone", "rc09:cat6_patch_panel", "rc09:cat6_information_outlet",
    "rc09:cable_j_hook", "cat6:labor:installation", "cat6:labor:termination-labeling",
    "cat6:labor:testing", "cat6:equipment:payoff", "cat6:equipment:termination-tool",
    "cat6:logistics:delivery", "cat6:logistics:waste-removal",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_MASTER_CAT6_CABLE_NEED:${rowId}`);
  for (const [rowId, missingParameterIds] of Object.entries(MINIMUM_REAL_QUANTITY_NEEDS)) {
    const need = short.preliminaryNeeds.find((item) => item.row_id === rowId);
    if (JSON.stringify(need?.missing_parameter_ids) !== JSON.stringify(missingParameterIds)) {
      throw new Error(`STOP_S2724_CAT6_MINIMUM_REAL_FACTS:${rowId}`);
    }
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 20
    && quantity(complete, "rc09:cat6_cable_identification_label") === "24"
    && quantity(complete, "rc09:structured_cable_certifier") === "3"
    && quantity(complete, "cat6:labor:installation") === "32"
    && quantity(complete, "cat6:equipment:termination-tool") === "6"
    && quantity(complete, "cat6:logistics:delivery") === "1")) {
    throw new Error("STOP_MASTER_CAT6_CABLE_COMPLETE_FIXTURE");
  }
  if (!(quantity(balanced, "cat6:balance:installed-net-length") === "300"
    && quantity(balanced, "cat6:balance:expected-loss") === "15"
    && quantity(balanced, "cat6:balance:retained-reserve") === "15"
    && quantity(balanced, "cat6:balance:total-need") === "330"
    && quantity(balanced, "rc09:uutp_cat6_4pair_lszh") === "610"
    && quantity(balanced, "cat6:balance:remainder-after-installation-loss") === "295"
    && quantity(balanced, "cat6:balance:surplus-beyond-reserve") === "280")) {
    throw new Error("STOP_S2724_CAT6_PROCUREMENT_BALANCE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 24)) {
    throw new Error("STOP_MASTER_CAT6_CABLE_CONDITIONAL_FIXTURE");
  }
  if (!(complete.rows.find((row) => row.row_id === "rc09:cat6_cable_lay")
      ?.included_in_estimate === false
    && complete.rows.find((row) => row.row_id === "rc09:cat6_route_continuity_check")
      ?.included_in_estimate === false)) {
    throw new Error("STOP_S2724_CAT6_DOUBLE_COST");
  }
  const serialized = JSON.stringify({ short, complete, balanced, conditional });
  if (/(network.switch|server.rack|full.structured.cabling.system)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_CAT6_CABLE_ADJACENT_SCOPE");
  }
  return { status: "GREEN_S27_24_CAT6_TWISTED_PAIR_CABLE_BALANCED_CORE",
    short: { rowCount: short.rows.length, preliminaryNeedCount: short.preliminaryNeeds.length,
      missingScalarFacts: short.preliminaryNeeds
        .flatMap((need) => need.missing_parameter_ids).length,
      optionalProductDesignationQuestionsRemoved: 4,
      knownLengthM: CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT.length_m,
      knownLineCount: CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT.line_count,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id) },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedM: quantity(balanced, "cat6:balance:installed-net-length"),
      expectedLossM: quantity(balanced, "cat6:balance:expected-loss"),
      retainedReserveM: quantity(balanced, "cat6:balance:retained-reserve"),
      totalNeedM: quantity(balanced, "cat6:balance:total-need"),
      orderedM: quantity(balanced, "rc09:uutp_cat6_4pair_lszh"),
      remainderM: quantity(balanced, "cat6:balance:remainder-after-installation-loss"),
      surplusBeyondReserveM: quantity(balanced, "cat6:balance:surplus-beyond-reserve"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.cat6-twisted-pair-cable-balanced-successor.v2",
  stopCode: "S27_24_CAT6_TWISTED_PAIR_CABLE_BALANCED",
  applicationName: "s27-24-cat6-twisted-pair-cable-balanced-successor-r2",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "bebf54fa-d1e1-53b9-ace5-c78cc8031b16",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "141556a0-61d7-5732-b61e-b148be6dc4a7",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/cat6-twisted-pair-cable-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/cat6-twisted-pair-cable-balanced-s27-24.json",
    "src/lib/estimate/v4/cat6TwistedPairCableR1.ts",
    "tests/estimateNorms/cat6TwistedPairCableR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
    "scripts/estimate/r4a13/masterBenchmarkEvidence.shared.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterCat6TwistedPairCableSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724Cat6TwistedPairCableIndependent.ts",
  ],
  catalogId: CAT6_TWISTED_PAIR_CABLE_CATALOG_ID,
  sourceId: CAT6_TWISTED_PAIR_CABLE_SOURCE_ID,
  normId: CAT6_TWISTED_PAIR_CABLE_NORM_ID,
  sourceMetadata: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA,
  parameterDefinitions: CAT6_TWISTED_PAIR_CABLE_PARAMETERS,
  formulaDefinitions: CAT6_TWISTED_PAIR_CABLE_FORMULAS,
  resourceDefinitions: CAT6_TWISTED_PAIR_CABLE_RESOURCES,
  shortInput: CAT6_TWISTED_PAIR_CABLE_SHORT_INPUT,
  acceptanceInput: CAT6_TWISTED_PAIR_CABLE_ACCEPTANCE_INPUT,
  runtimeProfileInput: CAT6_TWISTED_PAIR_CABLE_RUNTIME_INPUT,
  runtimeProfileClassification: CAT6_TWISTED_PAIR_CABLE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: CAT6_TWISTED_PAIR_CABLE_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [23, 11, 11], benchmarkOrdinal: 24,
  validationScenario: "S27_24_BENCHMARK_24_CAT6_TWISTED_PAIR_CABLE_BALANCE_300_M_12_LINES",
  passport: {
    canonicalRuName: "Прокладка кабеля U/UTP Cat.6, 4 пары, LSZH",
    workKey: "site_telecom_connection",
    physicalResultRu: "Линии U/UTP Cat.6 LSZH проложены по подтверждённым трассам, промаркированы, проходки заделаны и целостность каждой линии проверена",
    includedScopeRu: ["прокладка по известной длине трасс",
      "видимый баланс чистой длины, потерь, резерва, заказа и остатка",
      "проверка целостности по известному количеству линий",
      "маркировка, Velcro и firestop только по проектным документам",
      "труд, инструмент и смены сертификационного тестера только по ППР и программе QA",
      "доставка и вывоз отходов только по плану логистики",
      "keystone, patch-panel, розетки и J-hook только по условным ветвям"],
    excludedScopeRu: ["сетевой коммутатор", "серверный шкаф", "полная система СКС",
    "скрытый процент запаса и погонные нормы", "неподтверждённые цены"],
  },
  applicability: { country: "KG", operationClass: "LAY_CAT6_TWISTED_PAIR_CABLE",
    materialSystem: "U_UTP_CAT6_4PAIR_LSZH", primaryMeasureParameterId: "length_m",
    geometryParameters: ["length_m", "line_count"], knownScopeParameters: ["cable_type"],
    visibleProcurementBalance: true,
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
    quantity_basis: "NET_ROUTE_PLUS_VISIBLE_LOSS_RESERVE_CUT_INCREMENT_AND_APPROVED_PROJECT_RESOURCES" } },
  locator: { key: "cat6-twisted-pair-cable-krerm-project-balance-s27-24-v2", payload: {
    kind: "OFFICIAL_GUIDANCE_AND_PROJECT_DOCUMENT_PACKAGE_REQUIRED",
    officialGuidanceArtifactSha256: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.artifact_sha256,
    officialGuidanceLocator: "КРЕРм-2015, Указания по применению, п. 2.9.2",
    exactLocator: CAT6_TWISTED_PAIR_CABLE_SOURCE_METADATA.exact_locator,
    geometryInputs: ["length_m", "line_count"], knownScopeInputs: ["cable_type"],
    visiblePreliminaryBalanceInputs: Object.keys(CAT6_TWISTED_PAIR_CABLE_RUNTIME_INPUT),
    directProjectInputs: ["label_designation", "label_quantity_piece", "velcro_designation",
      "velcro_length_m", "firestop_designation", "firestop_volume_l", "certifier_designation",
      "certifier_shift"],
    conditionalInputs: ["keystone_mode", "keystone_designation", "keystone_quantity_piece",
      "patch_panel_mode", "patch_panel_designation", "patch_panel_quantity_piece",
      "information_outlet_mode", "information_outlet_designation",
      "information_outlet_quantity_piece", "j_hook_mode", "j_hook_designation",
      "j_hook_quantity_piece"],
    projectResourceInputs: ["cat6_installation_labor_h",
      "cat6_termination_labeling_labor_h", "cat6_testing_labor_h",
      "cat6_payoff_equipment_machine_h", "cat6_termination_tool_machine_h",
      "cat6_delivery_trip_count", "cat6_waste_removal_trip_count"] } },
  search: { primaryUom: "m", canonicalNameRu: "Прокладка кабеля U/UTP Cat.6, 4 пары, LSZH",
    aliases: ["кабель витая пара Cat 6 LSZH", "прокладка U UTP Cat.6",
      "монтаж кабеля СКС категории 6", "Cat6 twisted pair cable laying"],
    shortScopeRu: "Прокладка 300 м U/UTP Cat.6 LSZH для 12 линий с видимым балансом кабеля; маркировка, крепление, проходки, труд, инструмент, tester shifts и логистика остаются локальными уточнениями по проекту и ППР.",
    keyDistinguishingParameters: ["length_m", "line_count", "cable_type"],
    clarificationFields: ["label_designation", "label_quantity_piece", "velcro_designation",
      "velcro_length_m", "firestop_volume_l", "certifier_shift", "keystone_mode",
      "patch_panel_mode", "information_outlet_mode", "j_hook_mode",
      "cat6_installation_labor_h", "cat6_termination_labeling_labor_h",
      "cat6_testing_labor_h", "cat6_payoff_equipment_machine_h",
      "cat6_termination_tool_machine_h", "cat6_delivery_trip_count",
      "cat6_waste_removal_trip_count"],
    includedBoundaries: ["работа и баланс закупки кабеля по трассам",
      "проверка целостности по количеству линий", "маркировка, Velcro и firestop по проекту",
      "сертификационный тестер по программе QA", "условные пассивные компоненты и J-hook"],
    excludedBoundaries: ["сетевой коммутатор", "серверный шкаф", "полная СКС",
      "неподтверждённые цены"],
    extraSearchTermsRu: "U UTP Cat6 4 пары LSZH СКС кабель линия этикетка Velcro проходка тестер continuity keystone patch panel розетка J hook",
    sourceProvenance: { exactCat6CableOwner: true,
      explicitSemanticSuccessorOfExpandedSiteTelecomOwner: true,
      officialKrermGuidanceSection292: true,
      visibleReplaceableCableBalance: true,
      exactRouteLabelFirestopSupportQaPackageRequiredForNonCableQuantities: true } },
  forbiddenAdjacentMatchers: [/network.switch|сетев.*коммутатор/iu,
    /server.rack|серверн.*шкаф/iu, /full.structured.cabling.system|полн.*систем.*СКС/iu],
  owner: "S27_24_CAT6_TWISTED_PAIR_CABLE_BALANCED_SUCCESSOR_R2",
  receiptFileStem: "S27_24_CAT6_TWISTED_PAIR_CABLE_BALANCED_R2",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
