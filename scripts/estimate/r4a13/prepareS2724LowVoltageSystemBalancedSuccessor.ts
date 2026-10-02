import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  LOW_VOLTAGE_SYSTEM_ACCEPTANCE_INPUT, LOW_VOLTAGE_SYSTEM_CATALOG_ID,
  LOW_VOLTAGE_SYSTEM_FORMULAS, LOW_VOLTAGE_SYSTEM_NORM_ID,
  LOW_VOLTAGE_SYSTEM_PARAMETERS, LOW_VOLTAGE_SYSTEM_RESOURCES,
  LOW_VOLTAGE_SYSTEM_RUNTIME_CLASSIFICATION, LOW_VOLTAGE_SYSTEM_RUNTIME_INPUT,
  LOW_VOLTAGE_SYSTEM_RUNTIME_SOURCE_IDS, LOW_VOLTAGE_SYSTEM_SHORT_INPUT,
  LOW_VOLTAGE_SYSTEM_SOURCE_ID, LOW_VOLTAGE_SYSTEM_SOURCE_METADATA,
  compileLowVoltageSystemR1,
} from "../../../src/lib/estimate/v4/lowVoltageSystemR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileLowVoltageSystemR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  lvs_fiber_backbone_mode: "REQUIRED", lvs_fiber_cable_designation: "FO SM G.652D по проекту",
  lvs_fiber_cable_length_m: 300, lvs_fiber_termination_designation: "LC/UPC по схеме",
  lvs_fiber_termination_quantity_piece: 24, lvs_active_uplink_mode: "REQUIRED",
  lvs_active_uplink_designation: "Uplink-коммутатор по архитектуре",
  lvs_active_uplink_quantity_piece: 2,
});

async function verifyCore(): Promise<Json> {
  const first = await compileLowVoltageSystemR1({ ...LOW_VOLTAGE_SYSTEM_SHORT_INPUT });
  const complete = await compileLowVoltageSystemR1({ ...LOW_VOLTAGE_SYSTEM_ACCEPTANCE_INPUT });
  const balanced = await compileLowVoltageSystemR1({ ...LOW_VOLTAGE_SYSTEM_ACCEPTANCE_INPUT,
    lvs_outlet_retained_spare_piece: 4, lvs_outlet_supplier_pack_size_piece: 25 });
  const conditional = await compileLowVoltageSystemR1({ ...LOW_VOLTAGE_SYSTEM_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT });
  if (!(first.rows.length === 11 && first.preliminaryNeeds.length === 22
    && quantity(first, "rc09:lvs_information_outlet") === "48"
    && quantity(first, "rc09:lvs_patch_panel") === "2"
    && quantity(first, "rc09:lvs_permanent_link_test") === "48"))
    throw new Error("STOP_S27_24_LOW_VOLTAGE_FIRST_ESTIMATE");
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  for (const rowId of [
    "rc09:lvs_copper_cable", "rc09:lvs_patch_cord", "rc09:lvs_cable_manager",
    "rc09:lvs_faceplate_backbox", "rc09:lvs_containment", "rc09:lvs_firestop",
    "rc09:lvs_termination", "rc09:lvs_label", "rc09:lvs_fastening",
    "rc09:lvs_consumable", "rc09:lvs_grounding_conductor", "rc09:lvs_test_report",
    "rc09:lvs_fiber_cable", "rc09:lvs_fiber_termination", "rc09:lvs_active_uplink",
    "rc09:labor:lvs-cable-component-install", "rc09:labor:lvs-termination-labeling",
    "rc09:labor:lvs-certification-documentation", "rc09:equipment:lvs-access",
    "rc09:equipment:lvs-certification-tester", "rc09:logistics:lvs-delivery",
    "rc09:logistics:lvs-packaging-removal",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_LOW_VOLTAGE_NEED:${rowId}`);
  if (!(complete.rows.length === 30 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:lvs_copper_cable") === "2400"
    && quantity(complete, "rc09:lvs_patch_cord") === "96"
    && quantity(complete, "rc09:lvs_containment") === "500"
    && quantity(complete, "rc09:lvs_termination") === "96"
    && quantity(complete, "rc09:labor:lvs-cable-component-install") === "160"
    && quantity(complete, "rc09:equipment:lvs-certification-tester") === "40"
    && quantity(complete, "rc09:logistics:lvs-delivery") === "3"))
    throw new Error("STOP_S27_24_LOW_VOLTAGE_COMPLETE_PROFILE");
  if (!(quantity(balanced, "rc09:lvs-outlet-balance:installed-net") === "48"
    && quantity(balanced, "rc09:lvs-outlet-balance:retained-spare") === "4"
    && quantity(balanced, "rc09:lvs-outlet-balance:total-need") === "52"
    && quantity(balanced, "rc09:lvs-outlet-balance:package-count") === "3"
    && quantity(balanced, "rc09:lvs_information_outlet") === "75"
    && quantity(balanced, "rc09:lvs-outlet-balance:remainder") === "27"
    && quantity(balanced, "rc09:lvs-outlet-balance:surplus-beyond-spare") === "23"))
    throw new Error("STOP_S27_24_LOW_VOLTAGE_PROCUREMENT_BALANCE");
  if (!(conditional.rows.length === 33 && conditional.preliminaryNeeds.length === 0))
    throw new Error("STOP_S27_24_LOW_VOLTAGE_CONDITIONAL_PROFILE");
  for (const rowId of ["rc09:lvs_system_install_certification", "rc09:lvs_permanent_link_test",
    "rc09:lvs_outlet_register", "rc09:lvs_test_report"]) {
    const graph = LOW_VOLTAGE_SYSTEM_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE")
      throw new Error(`STOP_S27_24_LOW_VOLTAGE_DOUBLE_COST:${rowId}`);
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  if (/cctv|access.control|fire.alarm|electrical.distribution|rack.cabinet/iu.test(serialized))
    throw new Error("STOP_S27_24_LOW_VOLTAGE_ADJACENT_SCOPE");
  return { status: "GREEN_S27_24_LOW_VOLTAGE_SYSTEM_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: LOW_VOLTAGE_SYSTEM_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: { installedPiece: quantity(balanced, "rc09:lvs-outlet-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:lvs-outlet-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:lvs-outlet-balance:total-need"),
      packageCount: quantity(balanced, "rc09:lvs-outlet-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:lvs_information_outlet"),
      remainderPiece: quantity(balanced, "rc09:lvs-outlet-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:lvs-outlet-balance:surplus-beyond-spare") },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex") };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.low-voltage-system-balanced-successor.v1",
  stopCode: "S27_24_LOW_VOLTAGE_SYSTEM_BALANCED",
  applicationName: "s27-24-low-voltage-system-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "c3f7e9ac-9115-578c-a0d2-bb9e3d8b7fff",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "d0f016e2-2e13-5de6-ae82-81606665c0e5",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/low-voltage-system-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/low-voltage-system-balanced-s27-24.json",
    "src/lib/estimate/v4/lowVoltageSystemR1.ts",
    "tests/estimateNorms/lowVoltageSystemR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724LowVoltageSystemBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724LowVoltageSystemBalancedIndependent.ts",
  ],
  catalogId: LOW_VOLTAGE_SYSTEM_CATALOG_ID, sourceId: LOW_VOLTAGE_SYSTEM_SOURCE_ID,
  normId: LOW_VOLTAGE_SYSTEM_NORM_ID, sourceMetadata: LOW_VOLTAGE_SYSTEM_SOURCE_METADATA,
  parameterDefinitions: LOW_VOLTAGE_SYSTEM_PARAMETERS,
  formulaDefinitions: LOW_VOLTAGE_SYSTEM_FORMULAS,
  resourceDefinitions: LOW_VOLTAGE_SYSTEM_RESOURCES,
  shortInput: LOW_VOLTAGE_SYSTEM_SHORT_INPUT, acceptanceInput: LOW_VOLTAGE_SYSTEM_ACCEPTANCE_INPUT,
  runtimeProfileInput: LOW_VOLTAGE_SYSTEM_RUNTIME_INPUT,
  runtimeProfileClassification: LOW_VOLTAGE_SYSTEM_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: LOW_VOLTAGE_SYSTEM_RUNTIME_SOURCE_IDS, verifyCore,
  expectedParentShape: [5, 58, 58], benchmarkOrdinal: 35,
  validationScenario: "Q4_LOW_VOLTAGE_SYSTEM_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж и сертификация структурированной кабельной системы",
    workKey: "low_voltage_system",
    physicalResultRu: "СКС на 48 розеток JACK-RJ45-CAT6 и двух панелях PP-24-CAT6 смонтирована, промаркирована и сертифицирована",
    includedScopeRu: ["информационные модули, патч-панели, патч-корды и организаторы",
      "медные кабели, рамки, коробки, кабеленесущая система и проходки",
      "окончания, маркировка, крепёж, расходники и заземление",
      "труд монтажа, окончания, сертификации и документации",
      "подъём, сертификационный тестер, реестр, протоколы и логистика",
      "оптическая магистраль и активный uplink только по условным ветвям"],
    excludedScopeRu: ["шкафы и активное сетевое оборудование без явной ветви",
      "CCTV, СКУД, пожарная сигнализация и силовое распределение",
      "расчёт розеток или трасс только по площади", "неподтверждённые цены"],
  },
  applicability: { country: "KG", operationClass: "STRUCTURED_CABLING_INSTALLATION_AND_CERTIFICATION",
    lowVoltageSystem: "CAT6_STRUCTURED_CABLING_EXPLICIT_OUTLET_AND_PATCHING_SCHEDULE",
    primaryMeasureParameterId: "lvs_system_count",
    knownScopeParameters: ["lvs_information_outlet_count", "lvs_outlet_designation",
      "lvs_copper_cable_category", "lvs_patch_panel_count", "lvs_patch_panel_designation"],
    visibleProcurementBalance: true,
    projectLayoutRouteMaterialLaborEquipmentCertificationAndLogisticsRequired: true,
    conditionalScopeFailClosed: true, floorAreaDerivedQuantitiesForbidden: true,
    adjacentSystemsExcluded: true },
  binding: { rowId: "rc09:lvs_system_install_certification", applicability: {
    technology_class: "STRUCTURED_CABLING", operation_class: "STRUCTURED_CABLING_INSTALLATION_AND_CERTIFICATION",
    low_voltage_system: "CAT6_STRUCTURED_CABLING_EXPLICIT_OUTLET_AND_PATCHING_SCHEDULE",
    scope_mode: "KNOWN_OUTLET_PATCHING_IDENTITY_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
    source_id: LOW_VOLTAGE_SYSTEM_SOURCE_ID, norm_id: LOW_VOLTAGE_SYSTEM_NORM_ID,
    exact_locator: LOW_VOLTAGE_SYSTEM_SOURCE_METADATA.exact_locator,
    universal_productivity_claimed: false, universal_consumption_claimed: false,
    historical_project_rates_claimed: false,
    quantity_basis: "KNOWN_SYSTEM_OUTLET_CATEGORY_PATCH_PANEL_PLUS_APPROVED_PROJECT_PACKAGE" } },
  locator: { key: "low-voltage-system-project-balance-s27-24-v1", payload: {
    kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
    exactLocator: LOW_VOLTAGE_SYSTEM_SOURCE_METADATA.exact_locator,
    sourcePackSha256: LOW_VOLTAGE_SYSTEM_SOURCE_METADATA.artifact_sha256,
    knownScopeInputs: Object.keys(LOW_VOLTAGE_SYSTEM_SHORT_INPUT),
    visiblePreliminaryBalanceInputs: Object.keys(LOW_VOLTAGE_SYSTEM_RUNTIME_INPUT),
    directProjectInputs: LOW_VOLTAGE_SYSTEM_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(LOW_VOLTAGE_SYSTEM_SHORT_INPUT, id)
        && !id.startsWith("lvs_fiber_") && !id.startsWith("lvs_active_uplink_")),
    conditionalInputs: ["lvs_fiber_backbone_mode", "lvs_fiber_cable_designation",
      "lvs_fiber_cable_length_m", "lvs_fiber_termination_designation",
      "lvs_fiber_termination_quantity_piece", "lvs_active_uplink_mode",
      "lvs_active_uplink_designation", "lvs_active_uplink_quantity_piece"] } },
  search: { primaryUom: "system", canonicalNameRu: "Монтаж и сертификация структурированной кабельной системы",
    aliases: ["монтаж СКС", "структурированная кабельная система Cat6",
      "информационные розетки и патч-панели", "structured cabling installation certification"],
    shortScopeRu: "Одна СКС: 48 розеток JACK-RJ45-CAT6 и 2 панели PP-24-CAT6; трассы, комплектующие, труд и сертификация уточняются по проекту.",
    keyDistinguishingParameters: ["lvs_system_count", "lvs_information_outlet_count",
      "lvs_outlet_designation", "lvs_copper_cable_category", "lvs_patch_panel_count",
      "lvs_patch_panel_designation"],
    clarificationFields: LOW_VOLTAGE_SYSTEM_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(LOW_VOLTAGE_SYSTEM_SHORT_INPUT, id)),
    includedBoundaries: ["пассивные компоненты, кабели, трассы и сертификация СКС",
      "труд, тестер, документация, логистика и баланс модулей",
      "условная оптика и активный uplink только по проекту"],
    excludedBoundaries: ["шкафы, CCTV, СКУД, пожарная сигнализация и силовое распределение",
      "автоматическое наполнение по площади или статической трассе 432 м",
      "неподтверждённая активная сеть и цены"],
    extraSearchTermsRu: "СКС Cat6 розетка RJ45 патч-панель патч-корд кабель permanent link сертификация маркировка",
    sourceProvenance: { exactExpandedStructuredCablingOwner: true,
      knownOutletCategoryAndPatching: true, visibleIndependentOutletProcurementBalance: true,
      exactProjectRouteMaterialLaborEquipmentCertificationAndLogisticsRequired: true } },
  forbiddenAdjacentMatchers: [/cctv|видеонаблюден/iu, /access.control|скуд/iu,
    /fire.alarm|пожарн.*сигнализац/iu, /electrical.distribution|силов.*распределен/iu,
    /rack.cabinet|шкаф.*сервер/iu],
  owner: "S27_24_LOW_VOLTAGE_SYSTEM_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_LOW_VOLTAGE_SYSTEM_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
