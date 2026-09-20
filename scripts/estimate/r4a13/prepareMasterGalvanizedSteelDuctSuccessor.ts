import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  GALVANIZED_STEEL_DUCT_ACCEPTANCE_INPUT,
  GALVANIZED_STEEL_DUCT_CATALOG_ID,
  GALVANIZED_STEEL_DUCT_FORMULAS,
  GALVANIZED_STEEL_DUCT_NORM_ID,
  GALVANIZED_STEEL_DUCT_PARAMETERS,
  GALVANIZED_STEEL_DUCT_RESOURCES,
  GALVANIZED_STEEL_DUCT_SHORT_INPUT,
  GALVANIZED_STEEL_DUCT_SOURCE_ID,
  GALVANIZED_STEEL_DUCT_SOURCE_METADATA,
  compileGalvanizedSteelDuctR1,
} from "../../../src/lib/estimate/v4/galvanizedSteelDuctR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileGalvanizedSteelDuctR1({ ...GALVANIZED_STEEL_DUCT_SHORT_INPUT });
  const complete = await compileGalvanizedSteelDuctR1({
    ...GALVANIZED_STEEL_DUCT_ACCEPTANCE_INPUT,
  });
  const conditional = await compileGalvanizedSteelDuctR1({
    ...GALVANIZED_STEEL_DUCT_ACCEPTANCE_INPUT,
    thermal_insulation_mode: "REQUIRED",
    thermal_insulation_designation: "Теплоизоляция по спецификации",
    thermal_insulation_area_m2: 280,
    fireproofing_mode: "REQUIRED",
    fireproofing_designation: "Огнезащитное покрытие по проекту",
    fireproofing_area_m2: 42,
    flexible_connector_mode: "REQUIRED",
    flexible_connector_designation: "Гибкая вставка по узлу оборудования",
    flexible_connector_quantity_piece: 4,
  });
  const shortNeeds = new Map(short.preliminaryNeeds.map((need) => [need.row_id, need]));
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "rc09:galvanized_duct_install"
    && short.rows[0]?.quantity === "120"
    && short.preliminaryNeeds.length === 10)) {
    throw new Error("STOP_MASTER_GALVANIZED_STEEL_DUCT_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:rectangular_galvanized_duct_0_7mm",
    "rc09:duct_shaped_fittings_0_7mm",
    "rc09:duct_flange_sealing_tape",
    "rc09:duct_polymer_sealant_class_b",
    "rc09:duct_hanger_threaded_rod_m8",
    "rc09:duct_support_traverse",
    "rc09:duct_scissor_lift",
    "rc09:duct_thermal_insulation",
    "rc09:duct_fireproofing",
    "rc09:equipment_flexible_connector",
  ]) {
    if (!shortNeeds.has(rowId)) {
      throw new Error(`STOP_MASTER_GALVANIZED_STEEL_DUCT_SHORT_NEED:${rowId}`);
    }
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 8
    && complete.rows.find((row) =>
      row.row_id === "rc09:rectangular_galvanized_duct_0_7mm")?.quantity === "264"
    && complete.rows.find((row) =>
      row.row_id === "rc09:duct_scissor_lift")?.quantity === "1.8")) {
    throw new Error("STOP_MASTER_GALVANIZED_STEEL_DUCT_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 11)) {
    throw new Error("STOP_MASTER_GALVANIZED_STEEL_DUCT_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/(air.handling.unit|ventilation.fan|air.terminal|full.ventilation.system)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_GALVANIZED_STEEL_DUCT_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_MASTER_GALVANIZED_STEEL_DUCT_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownLengthM: GALVANIZED_STEEL_DUCT_SHORT_INPUT.length_m,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-galvanized-steel-duct-successor.v1",
  stopCode: "MASTER_GALVANIZED_STEEL_DUCT",
  applicationName: "r4-a13-6-master-galvanized-steel-duct-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "f232f0ca-56bf-5265-94dd-82841b2a89af",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "a340e794-8c92-5fd4-b0f4-ceeb6c4551e8",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-galvanized-steel-duct-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/galvanizedSteelDuctR1.ts",
    "tests/estimateNorms/galvanizedSteelDuctR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterGalvanizedSteelDuctSuccessor.ts",
  ],
  catalogId: GALVANIZED_STEEL_DUCT_CATALOG_ID,
  sourceId: GALVANIZED_STEEL_DUCT_SOURCE_ID,
  normId: GALVANIZED_STEEL_DUCT_NORM_ID,
  sourceMetadata: GALVANIZED_STEEL_DUCT_SOURCE_METADATA,
  parameterDefinitions: GALVANIZED_STEEL_DUCT_PARAMETERS,
  formulaDefinitions: GALVANIZED_STEEL_DUCT_FORMULAS,
  resourceDefinitions: GALVANIZED_STEEL_DUCT_RESOURCES,
  shortInput: GALVANIZED_STEEL_DUCT_SHORT_INPUT,
  acceptanceInput: GALVANIZED_STEEL_DUCT_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 19,
  validationScenario: "MASTER_BENCHMARK_19_GALVANIZED_STEEL_DUCT",
  passport: {
    canonicalRuName: "Монтаж воздуховода из оцинкованной стали",
    workKey: "ventilation_interior_duct_install_standard",
    physicalResultRu: "Трасса воздуховода из оцинкованной стали 0,7 мм класса герметичности B собрана и смонтирована по подтверждённой длине, ведомости элементов, узлам подвесов и ППР",
    includedScopeRu: [
      "сборка и монтаж указанной длины трассы воздуховода",
      "прямые секции и фасонные части только по утверждённой ведомости воздуховодов",
      "уплотнительная лента и герметик только по узлам фланцевых соединений",
      "резьбовые шпильки и траверсы только по раскладке подвесов",
      "ножничный подъёмник только по ППР и ведомости механизмов",
      "теплоизоляция, огнезащита и гибкие вставки только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "вентиляционные установки, вентиляторы и воздухораспределители",
      "полная система вентиляции здания",
      "автоматические погонные коэффициенты площадей, соединений, подвесов и механизмов",
      "неподтверждённые цены и неуказанные условные элементы",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_GALVANIZED_STEEL_DUCT",
    materialSystem: "GALVANIZED_STEEL_DUCT_0_7MM_AIRTIGHTNESS_B",
    primaryMeasureParameterId: "length_m",
    geometryParameters: ["length_m"],
    knownScopeParameters: ["steel_thickness_mm", "airtightness_class"],
    projectScheduleRequiredForNonWorkQuantities: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    fullVentilationSystemExcluded: true,
  },
  binding: {
    rowId: "rc09:galvanized_duct_install",
    applicability: {
      technology_class: "GALVANIZED_STEEL_DUCT",
      operation_class: "INSTALL_GALVANIZED_STEEL_DUCT",
      material_system: "GALVANIZED_STEEL_DUCT_0_7MM_AIRTIGHTNESS_B",
      scope_mode: "KNOWN_ROUTE_LENGTH_AND_IDENTITY_PLUS_DIRECT_SCHEDULE_LAYOUT_METHOD_QUANTITIES",
      source_id: GALVANIZED_STEEL_DUCT_SOURCE_ID,
      norm_id: GALVANIZED_STEEL_DUCT_NORM_ID,
      exact_locator: GALVANIZED_STEEL_DUCT_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      linear_consumption_or_productivity_rates_claimed: false,
      quantity_basis: "KNOWN_ROUTE_LENGTH_STEEL_THICKNESS_AIRTIGHTNESS_PLUS_APPROVED_SCHEDULE_LAYOUT_METHOD",
    },
  },
  locator: {
    key: "galvanized-steel-duct-project-package-required-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: GALVANIZED_STEEL_DUCT_SOURCE_METADATA.exact_locator,
      geometryInputs: ["length_m"],
      knownScopeInputs: ["steel_thickness_mm", "airtightness_class"],
      directScheduleInputs: [
        "duct_section_designation", "duct_section_area_m2",
        "shaped_fittings_designation", "shaped_fittings_area_m2",
        "sealing_tape_designation", "sealing_tape_length_m",
        "sealant_designation", "sealant_volume_l",
        "threaded_rod_designation", "threaded_rod_length_m",
        "support_traverse_designation", "support_traverse_quantity_piece",
        "scissor_lift_designation", "scissor_lift_shift",
      ],
      conditionalInputs: [
        "thermal_insulation_mode", "thermal_insulation_designation",
        "thermal_insulation_area_m2", "fireproofing_mode",
        "fireproofing_designation", "fireproofing_area_m2",
        "flexible_connector_mode", "flexible_connector_designation",
        "flexible_connector_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "m",
    canonicalNameRu: "Монтаж воздуховода из оцинкованной стали",
    aliases: [
      "оцинкованный воздуховод 0,7 мм класс B",
      "монтаж прямоугольного воздуховода из оцинкованной стали",
      "сборка оцинкованного вентиляционного воздуховода",
      "galvanized steel duct installation",
    ],
    shortScopeRu: "Монтаж указанной длины воздуховода из оцинкованной стали 0,7 мм класса B; длина сразу даёт объём работы, а секции, фасонные части, соединения, подвесы, механизмы и условные элементы уточняются добровольно по проекту и ППР.",
    keyDistinguishingParameters: ["length_m", "steel_thickness_mm", "airtightness_class"],
    clarificationFields: [
      "duct_section_designation", "duct_section_area_m2",
      "shaped_fittings_designation", "shaped_fittings_area_m2",
      "sealing_tape_designation", "sealing_tape_length_m",
      "sealant_designation", "sealant_volume_l", "threaded_rod_designation",
      "threaded_rod_length_m", "support_traverse_designation",
      "support_traverse_quantity_piece", "scissor_lift_designation",
      "scissor_lift_shift", "thermal_insulation_mode", "fireproofing_mode",
      "flexible_connector_mode",
    ],
    includedBoundaries: [
      "монтаж трассы по известной длине, толщине стали и классу герметичности",
      "прямые секции и фасонные части по ведомости воздуховодов",
      "уплотнение фланцев по узлам соединений",
      "шпильки и траверсы по раскладке подвесов",
      "подъёмник по ППР; изоляция, огнезащита и гибкие вставки по условным ветвям",
    ],
    excludedBoundaries: [
      "вентиляционная установка, вентилятор или воздухораспределитель",
      "полная система вентиляции здания",
      "автоматические погонные нормы материалов и механизмов",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: "воздуховод оцинкованный 0,7 класс B прямоугольный секция фасонная часть фланец лента герметик шпилька М8 траверса подъёмник теплоизоляция огнезащита гибкая вставка",
    sourceProvenance: {
      exactGalvanizedSteelDuctOwner: true,
      exactScheduleLayoutMethodPackageRequiredForNonWorkQuantities: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /air_handling_unit|вентиляционн.*установ/iu,
    /ventilation_fan|вентилятор/iu,
    /air_terminal|воздухораспределител/iu,
    /full_ventilation_system|полн.*систем.*вентиляц/iu,
  ],
  owner: "MASTER_GALVANIZED_STEEL_DUCT_SUCCESSOR",
  receiptFileStem: "MASTER_GALVANIZED_STEEL_DUCT",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
