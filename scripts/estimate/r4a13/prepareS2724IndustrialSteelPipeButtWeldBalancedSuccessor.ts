import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_FORMULAS,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_NORM_ID,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PARAMETERS,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RESOURCES,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_CLASSIFICATION,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_INPUT,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_SOURCE_IDS,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_ID,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA,
  compileIndustrialSteelPipeButtWeldR1,
} from "../../../src/lib/estimate/v4/industrialSteelPipeButtWeldR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compileIndustrialSteelPipeButtWeldR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

const CONDITIONAL_INPUT = Object.freeze({
  root_purge_gas_mode: "REQUIRED",
  root_purge_gas_designation: "Аргон для продувки корня по WPS",
  root_purge_gas_quantity: 5.4,
  preheat_postweld_heat_treatment_mode: "REQUIRED",
  preheat_postweld_heat_treatment_designation: "Индукционный подогрев по WPS",
  preheat_postweld_heat_treatment_quantity: 12,
  field_joint_coating_repair_mode: "REQUIRED",
  field_joint_coating_repair_designation: "Система покрытия по проекту",
  field_joint_coating_repair_quantity: 6.8,
});

async function verifyCore(): Promise<Json> {
  const first = await compileIndustrialSteelPipeButtWeldR1({
    ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
  });
  const complete = await compileIndustrialSteelPipeButtWeldR1({
    ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
  });
  const balanced = await compileIndustrialSteelPipeButtWeldR1({
    ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
    welding_wire_retained_reserve_kg: 0.5,
    welding_wire_supplier_pack_size_kg: 5,
    shielding_gas_retained_reserve_m3: 1,
    shielding_gas_supplier_pack_size_m3: 5,
  });
  const conditional = await compileIndustrialSteelPipeButtWeldR1({
    ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  if (!(first.rows.length === 5 && first.preliminaryNeeds.length === 26
    && quantity(first, "rc09:steel_process_pipe_butt_weld") === "16"
    && quantity(first, "rc09:pipe_weld_ndt_control") === "16"
    && quantity(first, "rc09:pipe_weld_log_record") === "16")) {
    throw new Error("STOP_S27_24_INDUSTRIAL_WELD_FIRST_ESTIMATE");
  }
  for (const rowId of [
    "rc09:welding_wire_sv08g2s_d1_2", "rc09:welding_shielding_gas_mixture",
    "rc09:pipe_weld_degreaser", "rc09:pipe_weld_grinding_disc",
    "rc09:inverter_welding_power_source", "rc09:pipe_internal_external_clamp",
    "rc09:root_purge_gas", "rc09:preheat_postweld_heat_treatment",
    "rc09:field_joint_coating_repair", "rc09:pipe_weld_ndt_report",
    "rc09:labor:weld-fitup", "rc09:labor:weld-ndt",
    "rc09:equipment:weld-edge-grinder", "rc09:equipment:weld-ndt-instrument",
    "rc09:logistics:weld-delivery", "rc09:logistics:weld-waste-removal",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_INDUSTRIAL_WELD_NEED:${rowId}`);
  if (!(complete.rows.length === 28 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:welding_wire_sv08g2s_d1_2") === "15"
    && quantity(complete, "rc09:welding_shielding_gas_mixture") === "8"
    && quantity(complete, "rc09:pipe_weld_grinding_disc") === "8"
    && quantity(complete, "rc09:labor:weld-fitup") === "96"
    && quantity(complete, "rc09:equipment:weld-ndt-instrument") === "12"
    && quantity(complete, "rc09:logistics:weld-delivery") === "1")) {
    throw new Error("STOP_S27_24_INDUSTRIAL_WELD_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:welding-wire-balance:installed-net") === "14.2"
    && quantity(balanced, "rc09:welding-wire-balance:retained-reserve") === "0.5"
    && quantity(balanced, "rc09:welding-wire-balance:total-need") === "14.7"
    && quantity(balanced, "rc09:welding-wire-balance:package-count") === "3"
    && quantity(balanced, "rc09:welding_wire_sv08g2s_d1_2") === "15"
    && quantity(balanced, "rc09:welding-wire-balance:remainder") === "0.8"
    && quantity(balanced, "rc09:welding-wire-balance:surplus-beyond-reserve") === "0.3"
    && quantity(balanced, "rc09:shielding-gas-balance:installed-net") === "7.1"
    && quantity(balanced, "rc09:shielding-gas-balance:retained-reserve") === "1"
    && quantity(balanced, "rc09:shielding-gas-balance:total-need") === "8.1"
    && quantity(balanced, "rc09:shielding-gas-balance:package-count") === "2"
    && quantity(balanced, "rc09:welding_shielding_gas_mixture") === "10"
    && quantity(balanced, "rc09:shielding-gas-balance:remainder") === "2.9"
    && quantity(balanced, "rc09:shielding-gas-balance:surplus-beyond-reserve") === "1.9")) {
    throw new Error("STOP_S27_24_INDUSTRIAL_WELD_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 31 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_INDUSTRIAL_WELD_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:steel_process_pipe_butt_weld", "rc09:pipe_weld_ndt_control",
    "rc09:pipe_weld_log_record", "rc09:pipe_weld_ndt_report",
  ]) {
    const graph = INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RESOURCES
      .find((row) => row.row_id === rowId)?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_INDUSTRIAL_WELD_DOUBLE_COST:${rowId}`);
    }
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  if (/process.pipe.full.length|whole.pipeline.pressure.test|pipe.fitting|pipe.support/iu
    .test(serialized)) {
    throw new Error("STOP_S27_24_INDUSTRIAL_WELD_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S27_24_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_BALANCED_CORE",
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      knownJointCount: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT.joint_count,
      knownOutsideDiameterMm:
        INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT.outside_diameter_mm,
      knownWallThicknessMm:
        INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT.wall_thickness_mm,
      knownWps:
        INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT.welding_procedure_designation,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      weldingWire: {
        installedKg: quantity(balanced, "rc09:welding-wire-balance:installed-net"),
        retainedReserveKg:
          quantity(balanced, "rc09:welding-wire-balance:retained-reserve"),
        totalNeedKg: quantity(balanced, "rc09:welding-wire-balance:total-need"),
        packageCount: quantity(balanced, "rc09:welding-wire-balance:package-count"),
        orderedKg: quantity(balanced, "rc09:welding_wire_sv08g2s_d1_2"),
        remainderKg: quantity(balanced, "rc09:welding-wire-balance:remainder"),
        surplusKg:
          quantity(balanced, "rc09:welding-wire-balance:surplus-beyond-reserve"),
      },
      shieldingGas: {
        installedM3: quantity(balanced, "rc09:shielding-gas-balance:installed-net"),
        retainedReserveM3:
          quantity(balanced, "rc09:shielding-gas-balance:retained-reserve"),
        totalNeedM3: quantity(balanced, "rc09:shielding-gas-balance:total-need"),
        packageCount: quantity(balanced, "rc09:shielding-gas-balance:package-count"),
        orderedM3: quantity(balanced, "rc09:welding_shielding_gas_mixture"),
        remainderM3: quantity(balanced, "rc09:shielding-gas-balance:remainder"),
        surplusM3:
          quantity(balanced, "rc09:shielding-gas-balance:surplus-beyond-reserve"),
      },
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    "rik-expo-app.s27-24.industrial-steel-pipe-butt-weld-balanced-successor.v2",
  stopCode: "S27_24_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_BALANCED",
  applicationName: "s27-24-industrial-steel-pipe-butt-weld-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "9249e85e-467d-59d6-9f23-e0cffc2053b4",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "471bacaf-81bf-55cf-b934-202e8874e5a6",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/industrial-steel-pipe-butt-weld-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/industrial-steel-pipe-butt-weld-balanced-s27-24.json",
    "src/lib/estimate/v4/industrialSteelPipeButtWeldR1.ts",
    "tests/estimateNorms/industrialSteelPipeButtWeldR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724IndustrialSteelPipeButtWeldBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724IndustrialSteelPipeButtWeldBalancedIndependent.ts",
  ],
  catalogId: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID,
  sourceId: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_ID,
  normId: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_NORM_ID,
  sourceMetadata: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA,
  parameterDefinitions: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PARAMETERS,
  formulaDefinitions: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_FORMULAS,
  resourceDefinitions: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RESOURCES,
  shortInput: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
  acceptanceInput: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
  runtimeProfileInput: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_INPUT,
  runtimeProfileClassification:
    INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [25, 12, 12],
  benchmarkOrdinal: 29,
  validationScenario:
    "MASTER_BENCHMARK_29_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_BALANCED_S27_24",
  passport: {
    canonicalRuName:
      "Сварка стыка стального технологического трубопровода Ø219×8 мм, сталь 09Г2С",
    workKey: "industrial_steel_pipe_butt_weld",
    physicalResultRu:
      "Стыки трубы Ø219×8 мм из стали 09Г2С собраны и сварены по WPS-219-GMAW, проконтролированы и зарегистрированы",
    includedScopeRu: [
      "сборка и сварка известного количества стыков по выбранному WPS",
      "видимые закупочные балансы сварочной проволоки и защитного газа",
      "обезжириватель и шлифовальные круги по ведомости ресурсов",
      "труд трубопроводчиков, сварщиков и специалистов НК",
      "сварочный источник, центратор, шлифовальная машина и прибор НК по ППР",
      "контроль, акты, журнал сварки, доставка и вывоз отходов",
      "продувка, термообработка и ремонт покрытия только по условным ветвям",
    ],
    excludedScopeRu: [
      "полная длина технологического трубопровода",
      "фасонные детали и опоры трубопровода",
      "испытание всего трубопровода",
      "автоматический выбор WPS, технологии сварки или метода НК",
      "универсальные нормы расхода, производительности и неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INDUSTRIAL_STEEL_PIPE_BUTT_WELD",
    pipeJoint: "STEEL_PROCESS_PIPE_D219X8_09G2S_BUTT_WELD",
    primaryMeasureParameterId: "joint_count",
    knownScopeParameters: [
      "outside_diameter_mm", "wall_thickness_mm", "steel_grade",
      "welding_procedure_designation",
    ],
    visibleProcurementBalance: true,
    wpsMethodResourceLaborEquipmentNdtAndLogisticsPackageRequired: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    wholePipelineExcluded: true,
  },
  binding: {
    rowId: "rc09:steel_process_pipe_butt_weld",
    applicability: {
      technology_class: "INDUSTRIAL_PIPELINE_WELDING",
      operation_class: "INDUSTRIAL_STEEL_PIPE_BUTT_WELD",
      pipe_joint: "STEEL_PROCESS_PIPE_D219X8_09G2S_BUTT_WELD",
      scope_mode:
        "KNOWN_JOINT_GEOMETRY_STEEL_WPS_PLUS_VISIBLE_BALANCES_AND_DIRECT_PROJECT_RESOURCES",
      source_id: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_ID,
      norm_id: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_NORM_ID,
      exact_locator: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis:
        "KNOWN_JOINT_CARDINALITY_PLUS_VISIBLE_PACKAGING_AND_APPROVED_WPS_METHOD_QA_LOGISTICS",
    },
  },
  locator: {
    key: "industrial-steel-pipe-butt-weld-project-balance-s27-24-v2",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.exact_locator,
      sourcePackSha256:
        INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "joint_count", "outside_diameter_mm", "wall_thickness_mm", "steel_grade",
        "welding_procedure_designation",
      ],
      visiblePreliminaryBalanceInputs:
        Object.keys(INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RUNTIME_INPUT),
      directProjectInputs: [
        "welding_wire_designation", "welding_wire_mass_kg",
        "shielding_gas_designation", "shielding_gas_volume_m3",
        "degreaser_designation", "degreaser_volume_l",
        "grinding_disc_designation", "grinding_disc_quantity",
        "welding_source_designation", "welding_source_machine_hours",
        "pipe_clamp_designation", "pipe_clamp_machine_hours",
        "ndt_report_designation", "ndt_report_quantity_document",
        "weld_fitup_labor_h", "ndt_inspection_labor_h",
        "edge_grinder_machine_h", "ndt_instrument_machine_h",
        "weld_delivery_trip_count", "weld_waste_removal_trip_count",
      ],
      conditionalInputs: [
        "root_purge_gas_mode", "root_purge_gas_designation",
        "root_purge_gas_quantity", "preheat_postweld_heat_treatment_mode",
        "preheat_postweld_heat_treatment_designation",
        "preheat_postweld_heat_treatment_quantity",
        "field_joint_coating_repair_mode",
        "field_joint_coating_repair_designation",
        "field_joint_coating_repair_quantity",
      ],
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu:
      "Сварка стыка стального технологического трубопровода Ø219×8 мм, сталь 09Г2С",
    aliases: [
      "сварка стыков технологического трубопровода 219х8",
      "сварка трубы 09Г2С диаметр 219 мм",
      "стыковая сварка промышленного стального трубопровода",
      "industrial steel pipe butt weld",
    ],
    shortScopeRu:
      "Сварка 16 стыков трубы Ø219×8 мм, сталь 09Г2С, по WPS-219-GMAW с закупочными балансами проволоки и газа; проектные расходники, труд, механизмы, НК и логистика уточняются по документам.",
    keyDistinguishingParameters: [
      "joint_count", "outside_diameter_mm", "wall_thickness_mm", "steel_grade",
      "welding_procedure_designation",
    ],
    clarificationFields: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "joint_count", "outside_diameter_mm", "wall_thickness_mm", "steel_grade",
        "welding_procedure_designation",
      ].includes(parameterId)),
    includedBoundaries: [
      "сборка и сварка известных стыков по выбранному WPS",
      "расходники и их закупочные балансы, труд и механизмы",
      "НК, акты, журнал, доставка и вывоз отходов",
      "условная продувка, термообработка и защита покрытия",
    ],
    excludedBoundaries: [
      "полная длина трубы, фасонные детали и опоры",
      "испытание всего трубопровода",
      "автоматический выбор WPS или НК и неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "сварка стык труба технологический трубопровод 219x8 09Г2С WPS проволока газ упаковка резерв обезжириватель круг инвертор центратор шлифмашина НК акт журнал труд доставка",
    sourceProvenance: {
      exactExpandedPipelineWeldingOwner: true,
      knownJointGeometrySteelAndSelectedWps: true,
      visibleIndependentProcurementBalances: true,
      exactProjectWpsLaborEquipmentNdtAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /process.pipe.full.length|полн.*длин.*труб/iu,
    /pipe.fitting|фасонн.*детал/iu,
    /pipe.support|опор.*трубопровод/iu,
    /whole.pipeline.pressure.test|испытан.*всего.*трубопровод/iu,
  ],
  owner: "S27_24_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
