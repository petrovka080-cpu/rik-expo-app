import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
  VVGNG_LS_POWER_CABLE_CATALOG_ID,
  VVGNG_LS_POWER_CABLE_FORMULAS,
  VVGNG_LS_POWER_CABLE_NORM_ID,
  VVGNG_LS_POWER_CABLE_PARAMETERS,
  VVGNG_LS_POWER_CABLE_RESOURCES,
  VVGNG_LS_POWER_CABLE_RUNTIME_CLASSIFICATION,
  VVGNG_LS_POWER_CABLE_RUNTIME_INPUT,
  VVGNG_LS_POWER_CABLE_RUNTIME_SOURCE_IDS,
  VVGNG_LS_POWER_CABLE_SHORT_INPUT,
  VVGNG_LS_POWER_CABLE_SOURCE_ID,
  VVGNG_LS_POWER_CABLE_SOURCE_METADATA,
  compileVvgngLsPowerCableR1,
  vvgngLsPowerCableIndependentCompositionR1,
} from "../../../src/lib/estimate/v4/vvgngLsPowerCableR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const MINIMUM_REAL_QUANTITY_NEEDS = Object.freeze({
  "rc09:fire_resistant_cable_marker": ["marker_quantity_piece"],
  "rc09:halogen_free_cable_clamp": ["clamp_quantity_piece","cable_fixing_mode","cable_fixing_layout_reference"],
  "rc09:cable_gland_for_5x6": ["gland_quantity_piece"],
  "rc09:copper_lug_6mm2": ["lug_quantity_piece"],
  "rc09:firestop_cable_penetration_compound": ["firestop_quantity_kg"],
  "rc09:power_cable_insulation_continuity_test": ["test_count"],
});

function quantity(result: Awaited<ReturnType<typeof compileVvgngLsPowerCableR1>>, rowId: string) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

async function verifyCore(): Promise<Json> {
  const first = await compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_SHORT_INPUT });
  const complete = await compileVvgngLsPowerCableR1({
    ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
  });
  const balanced = await compileVvgngLsPowerCableR1({
    ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
    cable_expected_loss_ratio: 0.05,
    cable_retained_reserve_m: 5,
    cable_supplier_cut_increment_m: 100,
  });
  const conditional = await compileVvgngLsPowerCableR1({
    ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
    cable_tray_mode: "REQUIRED",
    cable_tray_designation: "Лоток по проекту",
    cable_tray_length_m: 90,
    protective_pipe_mode: "REQUIRED",
    protective_pipe_designation: "Труба по узлу",
    protective_pipe_length_m: 12,
    pulling_lubricant_mode: "REQUIRED",
    pulling_lubricant_designation: "Смазка по ППР",
    pulling_lubricant_quantity_kg: 2.5,
  });
  const firstNeeds = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  const requiredFirstNeeds = [
    "rc09:fire_resistant_cable_marker",
    "rc09:halogen_free_cable_clamp",
    "rc09:cable_gland_for_5x6",
    "rc09:copper_lug_6mm2",
    "rc09:firestop_cable_penetration_compound",
    "rc09:power_cable_insulation_continuity_test",
    "rc09:cable_tray",
    "rc09:cable_protective_pipe",
    "rc09:cable_pulling_lubricant",
    "vvgng:labor:installation",
    "vvgng:labor:testing",
    "vvgng:equipment:reel-stand",
    "vvgng:equipment:pulling-device",
    "vvgng:equipment:crimp-tool",
    "vvgng:equipment:installation-tester",
    "vvgng:logistics:delivery",
    "vvgng:logistics:waste-removal",
  ];
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 24
    && quantity(first, "rc09:vvgng_ls_cable_lay") === "150"
    && quantity(first, "rc09:vvgng_a_ls_5x6_cable") === "150"
    && requiredFirstNeeds.every((rowId) => firstNeeds.has(rowId)))) {
    throw new Error("STOP_S2723_VVGNG_FIRST_ESTIMATE");
  }
  for (const [rowId, missingParameterIds] of Object.entries(MINIMUM_REAL_QUANTITY_NEEDS)) {
    const need = first.preliminaryNeeds.find((item) => item.row_id === rowId);
    if (JSON.stringify([...(need?.missing_parameter_ids??[])].sort()) !== JSON.stringify([...missingParameterIds].sort())) {
      throw new Error(`STOP_S2724_VVGNG_MINIMUM_REAL_FACTS:${rowId}`);
    }
  }
  if (!(complete.rows.length === 22 && complete.preliminaryNeeds.length === 7
    && quantity(complete, "vvgng:labor:installation") === "24"
    && quantity(complete, "vvgng:equipment:installation-tester") === "3"
    && quantity(complete, "vvgng:logistics:delivery") === "1")) {
    throw new Error("STOP_S2723_VVGNG_COMPLETE_RESOURCES");
  }
  if (!(quantity(balanced, "vvgng:balance:installed-net-length") === "150"
    && quantity(balanced, "vvgng:balance:expected-loss") === "7.5"
    && quantity(balanced, "vvgng:balance:retained-reserve") === "5"
    && quantity(balanced, "vvgng:balance:total-need") === "162.5"
    && quantity(balanced, "rc09:vvgng_a_ls_5x6_cable") === "200"
    && quantity(balanced, "vvgng:balance:remainder-after-installation-loss") === "42.5"
    && quantity(balanced, "vvgng:balance:surplus-beyond-reserve") === "37.5")) {
    throw new Error("STOP_S2723_VVGNG_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 25 && conditional.preliminaryNeeds.length === 7)) {
    throw new Error("STOP_S2723_VVGNG_CONDITIONAL_RESOURCES");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  if (/(switchboard|building.full.power.system)/iu.test(serialized)) {
    throw new Error("STOP_S2723_VVGNG_ADJACENT_SCOPE");
  }
  return {
    status: "SOURCE_ONLY_PRODUCER_CASES_NOT_COMPOSITION_SOURCE_OR_OBJECT_ACCEPTANCE",
    full:false,publicationAllowed:false,sourceAuthorityPromoted:false,newQuantityNorms:0,
    firstEstimate: {
      rows: first.rows.length,
      preliminaryNeeds: first.preliminaryNeeds.length,
      missingScalarFacts: first.preliminaryNeeds
        .flatMap((need) => need.missing_parameter_ids).length,
      optionalProductDesignationQuestionsRemoved: 6,
      orderLengthM: quantity(first, "rc09:vvgng_a_ls_5x6_cable"),
    },
    complete: { rows: complete.rows.length, preliminaryNeeds: complete.preliminaryNeeds.length },
    balanced: {
      installedM: quantity(balanced, "vvgng:balance:installed-net-length"),
      expectedLossM: quantity(balanced, "vvgng:balance:expected-loss"),
      retainedReserveM: quantity(balanced, "vvgng:balance:retained-reserve"),
      totalNeedM: quantity(balanced, "vvgng:balance:total-need"),
      orderedM: quantity(balanced, "rc09:vvgng_a_ls_5x6_cable"),
      remainderM: quantity(balanced, "vvgng:balance:remainder-after-installation-loss"),
      surplusBeyondReserveM: quantity(balanced, "vvgng:balance:surplus-beyond-reserve"),
    },
    conditional: { rows: conditional.rows.length, preliminaryNeeds: conditional.preliminaryNeeds.length },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.vvgng-ls-power-cable-minimum-clarifications.v3",
  stopCode: "S27_24_VVGNG_LS_MINIMUM_CLARIFICATIONS",
  applicationName: "s27-24-vvgng-ls-minimum-clarification-successor-r3",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "2dad23c6-cf6b-5306-a5f8-cf816f1c196f",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "105bdd91-b768-588a-a377-f3e5400bc15a",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/vvgng-ls-minimum-clarification-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/vvgng-ls-power-cable-balanced-s27-23.json",
    "data/estimate-benchmarks/source-packs/vvgng-ls-minimum-clarification-audit-s27-24.json",
    "src/lib/estimate/v4/vvgngLsPowerCableR1.ts",
    "tests/estimateNorms/vvgngLsPowerCableR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
    "src/lib/estimate/backendPlatform/catalogSearchIntent.ts",
    "src/lib/estimate/backendPlatform/catalogSearchIntent.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723VvgngLsPowerCableBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2723VvgngLsPowerCableIndependent.ts",
  ],
  catalogId: VVGNG_LS_POWER_CABLE_CATALOG_ID,
  sourceId: VVGNG_LS_POWER_CABLE_SOURCE_ID,
  normId: VVGNG_LS_POWER_CABLE_NORM_ID,
  sourceMetadata: VVGNG_LS_POWER_CABLE_SOURCE_METADATA,
  parameterDefinitions: VVGNG_LS_POWER_CABLE_PARAMETERS,
  formulaDefinitions: VVGNG_LS_POWER_CABLE_FORMULAS,
  resourceDefinitions: VVGNG_LS_POWER_CABLE_RESOURCES,
  shortInput: VVGNG_LS_POWER_CABLE_SHORT_INPUT,
  acceptanceInput: VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
  runtimeProfileInput: VVGNG_LS_POWER_CABLE_RUNTIME_INPUT,
  runtimeProfileClassification: VVGNG_LS_POWER_CABLE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: VVGNG_LS_POWER_CABLE_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [36, 25, 25],
  benchmarkOrdinal: 22,
  validationScenario: "S27_24_VVGNG_LS_MINIMUM_CLARIFICATIONS_150_M",
  passport: {
    independentCompletenessMap:vvgngLsPowerCableIndependentCompositionR1(),
    canonicalRuName: "Прокладка силового кабеля ВВГнг(А)-LS 5×6 мм²",
    workKey: "electrical_interior_vvg_cable_lay_standard",
    physicalResultRu: "Силовой кабель ВВГнг(А)-LS 5×6 мм² проложен по подтверждённому маршруту, промаркирован, оконцован, проходки заделаны и электроизмерения выполнены",
    includedScopeRu: [
      "видимый баланс чистой длины, потерь, резерва, заказа и остатка",
      "маркировка, крепёж, вводы, наконечники и проходки по проекту",
      "труд, размотка, протяжка, опрессовка и измерительный комплект по ППР и QA",
      "доставка и вывоз отходов по плану логистики",
      "лоток, защитная труба и смазка только по условным ветвям",
    ],
    excludedScopeRu: [
      "распределительный щит",
      "полная система электроснабжения здания",
      "универсальная производительность без таблицы КРЕРм или ППР",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "LAY_VVGNG_LS_POWER_CABLE",
    materialSystem: "VVGNG_A_LS_5X6_MM2",
    primaryMeasureParameterId: "length_m",
    geometryParameters: ["length_m"],
    visibleProcurementBalance: true,
    projectScheduleRequiredForLaborMachineryAndAccessories: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    switchboardExcluded: true,
    fullBuildingPowerSystemExcluded: true,
  },
  binding: {
    rowId: "rc09:vvgng_ls_cable_lay",
    applicability: {
      technology_class: "VVGNG_LS_POWER_CABLE",
      operation_class: "LAY_VVGNG_LS_POWER_CABLE",
      material_system: "VVGNG_A_LS_5X6_MM2",
      scope_mode: "KNOWN_ROUTE_PLUS_VISIBLE_BALANCE_AND_PROJECT_RESOURCE_SCHEDULE",
      source_id: VVGNG_LS_POWER_CABLE_SOURCE_ID,
      norm_id: VVGNG_LS_POWER_CABLE_NORM_ID,
      exact_locator: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      historical_linear_rates_claimed: false,
      quantity_basis:
        "NET_ROUTE_PLUS_VISIBLE_LOSS_RESERVE_CUT_INCREMENT_AND_APPROVED_PROJECT_RESOURCES",
    },
  },
  locator: {
    key: "vvgng-ls-power-cable-krerm-project-balance-s27-24-v4",
    payload: {
      kind: "OFFICIAL_GUIDANCE_AND_PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      officialGuidanceArtifactSha256:
        VVGNG_LS_POWER_CABLE_SOURCE_METADATA.artifact_sha256,
      officialGuidanceLocator: "КРЕРм-2015, Указания по применению, п. 2.9.2",
      visiblePreliminaryBalanceInputs: Object.keys(VVGNG_LS_POWER_CABLE_RUNTIME_INPUT),
      projectResourceInputs: [
        "cable_installation_labor_h", "cable_testing_labor_h",
        "cable_reel_stand_machine_h", "cable_pulling_device_machine_h",
        "cable_crimp_tool_machine_h", "installation_tester_machine_h",
        "cable_delivery_trip_count", "cable_waste_removal_trip_count",
      ],
      minimumClarificationAudit: {
        visibleDependentRows: 17,
        optionalProductDesignationQuestionsRemoved: 6,
        numericRatesInvented: false,
      },
    },
  },
  search: {
    primaryUom: "m",
    canonicalNameRu: "Прокладка силового кабеля ВВГнг(А)-LS 5×6 мм²",
    aliases: [
      "силовой кабель ВВГнг А LS 5х6",
      "прокладка кабеля 5×6 мм²",
      "монтаж негорючего кабеля LS",
      "VVGng LS power cable laying",
    ],
    shortScopeRu: "Прокладка ВВГнг(А)-LS 5×6 мм² с видимым балансом кабеля; проектные комплектующие, труд, механизмы, логистика и испытания остаются видимыми уточнениями до получения ППР и ведомостей.",
    keyDistinguishingParameters: [
      "length_m", "cable_mark", "core_count", "conductor_area_mm2",
    ],
    clarificationFields: [
      "cable_expected_loss_ratio", "cable_retained_reserve_m",
      "cable_supplier_cut_increment_m", "marker_quantity_piece",
      "clamp_quantity_piece", "gland_quantity_piece", "lug_quantity_piece",
      "firestop_quantity_kg", "test_count", "cable_installation_labor_h",
      "cable_testing_labor_h", "cable_reel_stand_machine_h",
      "cable_pulling_device_machine_h", "cable_crimp_tool_machine_h",
      "installation_tester_machine_h", "cable_delivery_trip_count",
      "cable_waste_removal_trip_count", "cable_tray_mode",
      "protective_pipe_mode", "pulling_lubricant_mode",
    ],
    includedBoundaries: [
      "прокладка и баланс кабеля по маршруту",
      "проектные комплектующие, труд, механизмы, логистика и испытания",
      "условные лоток, защитная труба и смазка",
    ],
    excludedBoundaries: [
      "распределительный щит",
      "полная система электроснабжения",
      "скрытая производительность или процент потерь",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "ВВГнг А LS 5×6 кабель маршрут потери резерв заказ остаток бирка хомут ввод наконечник проходка труд протяжка опрессовка измерения",
    sourceProvenance: {
      officialKrermGuidanceSection292: true,
      exactProjectPackageRequiredForResourceQuantities: true,
      visibleReplaceableCableBalance: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /switchboard|распределительн.*щит/iu,
    /building_full_power_system|полн.*систем.*электроснабжен/iu,
  ],
  owner: "S27_24_VVGNG_LS_MINIMUM_CLARIFICATION_SUCCESSOR_R3",
  receiptFileStem: "S27_24_VVGNG_LS_MINIMUM_CLARIFICATION_R3",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
