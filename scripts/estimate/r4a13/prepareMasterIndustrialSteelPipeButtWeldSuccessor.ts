import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CATALOG_ID,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_FORMULAS,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_NORM_ID,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_PARAMETERS,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_RESOURCES,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_ID,
  INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA,
  compileIndustrialSteelPipeButtWeldR1,
} from "../../../src/lib/estimate/v4/industrialSteelPipeButtWeldR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const CONDITIONAL_INPUTS = [
  "root_purge_gas_mode", "root_purge_gas_designation", "root_purge_gas_quantity",
  "preheat_postweld_heat_treatment_mode",
  "preheat_postweld_heat_treatment_designation",
  "preheat_postweld_heat_treatment_quantity",
  "field_joint_coating_repair_mode",
  "field_joint_coating_repair_designation",
  "field_joint_coating_repair_quantity",
];

async function verifyCore(): Promise<Json> {
  const short = await compileIndustrialSteelPipeButtWeldR1({
    ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT,
  });
  const complete = await compileIndustrialSteelPipeButtWeldR1({
    ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
  });
  const conditional = await compileIndustrialSteelPipeButtWeldR1({
    ...INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ACCEPTANCE_INPUT,
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
  const needs = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  if (!(short.rows.length === 3
    && short.rows.find((row) => row.row_id === "rc09:steel_process_pipe_butt_weld")
      ?.quantity === "16"
    && short.rows.find((row) => row.row_id === "rc09:pipe_weld_ndt_control")
      ?.quantity === "16"
    && short.rows.find((row) => row.row_id === "rc09:pipe_weld_log_record")
      ?.quantity === "16"
    && short.preliminaryNeeds.length === 9)) {
    throw new Error("STOP_MASTER_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:welding_wire_sv08g2s_d1_2",
    "rc09:welding_shielding_gas_mixture",
    "rc09:pipe_weld_degreaser",
    "rc09:pipe_weld_grinding_disc",
    "rc09:inverter_welding_power_source",
    "rc09:pipe_internal_external_clamp",
    "rc09:root_purge_gas",
    "rc09:preheat_postweld_heat_treatment",
    "rc09:field_joint_coating_repair",
  ]) {
    if (!needs.has(rowId)) {
      throw new Error(`STOP_MASTER_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_NEED:${rowId}`);
    }
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 9
    && complete.rows.find((row) => row.row_id === "rc09:welding_wire_sv08g2s_d1_2")
      ?.quantity === "14.2"
    && complete.rows.find((row) => row.row_id === "rc09:welding_shielding_gas_mixture")
      ?.quantity === "7.1"
    && complete.rows.find((row) => row.row_id === "rc09:pipe_weld_grinding_disc")
      ?.quantity === "8")) {
    throw new Error("STOP_MASTER_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 12)) {
    throw new Error("STOP_MASTER_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/process.pipe.full.length|whole.pipeline.pressure.test|pipe.fitting|pipe.support/iu
    .test(serialized)) {
    throw new Error("STOP_MASTER_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_MASTER_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownJointCount: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT.joint_count,
      knownOutsideDiameterMm:
        INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT.outside_diameter_mm,
      knownWallThicknessMm:
        INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT.wall_thickness_mm,
      knownSteelGrade: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SHORT_INPUT.steel_grade,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-industrial-steel-pipe-butt-weld-successor.v1",
  stopCode: "MASTER_INDUSTRIAL_STEEL_PIPE_BUTT_WELD",
  applicationName: "r4-a13-6-master-industrial-steel-pipe-butt-weld-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "38459c68-a942-588c-ab32-3a304be75b65",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "d629eb6e-894f-58ef-9c27-ef47371c2ccc",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-industrial-steel-pipe-butt-weld-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/industrialSteelPipeButtWeldR1.ts",
    "tests/estimateNorms/industrialSteelPipeButtWeldR1.contract.test.ts",
    "scripts/estimate/r4a13/masterBenchmarkEvidence.shared.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterIndustrialSteelPipeButtWeldSuccessor.ts",
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
  verifyCore,
  expectedParentShape: [6, 54, 54],
  benchmarkOrdinal: 29,
  validationScenario: "MASTER_BENCHMARK_29_INDUSTRIAL_STEEL_PIPE_BUTT_WELD",
  passport: {
    canonicalRuName: "Сварка стыка стального технологического трубопровода Ø219×8 мм, сталь 09Г2С",
    workKey: "industrial_steel_pipe_butt_weld",
    physicalResultRu: "Стыки технологического трубопровода Ø219×8 мм из стали 09Г2С собраны, сварены, учтены в журнале и переданы на предусмотренный контроль",
    includedScopeRu: [
      "сборка и сварка известного количества стыков заданной геометрии и марки стали",
      "единица неразрушающего контроля и запись журнала на каждый известный стык",
      "сварочная проволока, защитный газ, обезжириватель, круги, сварочный источник и центратор только по утверждённым WPS/ППР и ведомости ресурсов",
      "продувка корня, подогрев/термообработка и ремонт покрытия только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "труба полной длины",
      "фасонные детали и опоры трубопровода",
      "гидравлическое или пневматическое испытание всего трубопровода",
      "исторические коэффициенты расхода материалов и машино-часов",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INDUSTRIAL_STEEL_PIPE_BUTT_WELD",
    pipeJoint: "STEEL_PROCESS_PIPE_D219X8_09G2S_BUTT_WELD",
    primaryMeasureParameterId: "joint_count",
    geometryParameters: ["joint_count", "outside_diameter_mm", "wall_thickness_mm"],
    knownScopeParameters: ["steel_grade"],
    wpsMethodResourceAndNdtPackageRequired: true,
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
      scope_mode: "KNOWN_JOINT_COUNT_GEOMETRY_STEEL_PLUS_DIRECT_PROJECT_WPS_RESOURCE_METHOD_AND_QA",
      source_id: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_ID,
      norm_id: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_NORM_ID,
      exact_locator: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_JOINT_CARDINALITY_PLUS_APPROVED_WPS_METHOD_RESOURCE_AND_QA_DOCUMENTATION",
    },
  },
  locator: {
    key: "industrial-steel-pipe-d219x8-09g2s-butt-weld-wps-ndt-package-required-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SOURCE_METADATA.exact_locator,
      geometryInputs: ["joint_count", "outside_diameter_mm", "wall_thickness_mm"],
      knownScopeInputs: ["steel_grade"],
      directProjectInputs: [
        "welding_wire_designation", "welding_wire_mass_kg",
        "shielding_gas_designation", "shielding_gas_volume_m3",
        "degreaser_designation", "degreaser_volume_l",
        "grinding_disc_designation", "grinding_disc_quantity",
        "welding_source_designation", "welding_source_machine_hours",
        "pipe_clamp_designation", "pipe_clamp_machine_hours",
      ],
      conditionalInputs: CONDITIONAL_INPUTS,
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Сварка стыка стального технологического трубопровода Ø219×8 мм, сталь 09Г2С",
    aliases: [
      "сварка стыков технологического трубопровода 219х8",
      "сварка трубы 09Г2С диаметр 219 мм",
      "стыковая сварка промышленного стального трубопровода",
      "industrial steel pipe butt weld",
    ],
    shortScopeRu: "Сварка 16 стыков трубы Ø219×8 мм из стали 09Г2С: работа, единицы НК и записи журнала доступны сразу; расходники, машино-часы и условные технологические операции добровольно уточняются по WPS/ППР.",
    keyDistinguishingParameters: [
      "joint_count", "outside_diameter_mm", "wall_thickness_mm", "steel_grade",
    ],
    clarificationFields: [
      "welding_wire_designation", "welding_wire_mass_kg",
      "shielding_gas_designation", "shielding_gas_volume_m3",
      "degreaser_designation", "degreaser_volume_l",
      "grinding_disc_designation", "grinding_disc_quantity",
      "welding_source_designation", "welding_source_machine_hours",
      "pipe_clamp_designation", "pipe_clamp_machine_hours",
      "root_purge_gas_mode", "preheat_postweld_heat_treatment_mode",
      "field_joint_coating_repair_mode",
    ],
    includedBoundaries: [
      "сборка и сварка по известному количеству стыков, геометрии и марке стали",
      "НК и запись журнала на известное количество стыков",
      "материалы и механизмы только по утверждённым WPS/ППР и ведомости ресурсов",
      "продувка, термообработка и ремонт покрытия по условным проектным ветвям",
    ],
    excludedBoundaries: [
      "полная длина трубопровода, фасонные детали и опоры",
      "испытание всего трубопровода",
      "исторические коэффициенты расхода и производительности",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: "сварка стык труба технологический трубопровод 219x8 09Г2С проволока Св-08Г2С газ Ar CO2 обезжириватель шлифовальный круг инвертор центратор НК журнал продувка корня подогрев термообработка ремонт покрытия",
    sourceProvenance: {
      exactExpandedPipelineWeldingOwner: true,
      knownJointCountGeometryAndSteel: true,
      exactProjectWpsMethodResourceAndNdtPackageRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /process.pipe.full.length/iu,
    /pipe.fitting/iu,
    /pipe.support/iu,
    /whole.pipeline.pressure.test/iu,
  ],
  owner: "MASTER_INDUSTRIAL_STEEL_PIPE_BUTT_WELD_SUCCESSOR",
  receiptFileStem: "MASTER_INDUSTRIAL_STEEL_PIPE_BUTT_WELD",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
