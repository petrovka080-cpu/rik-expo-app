import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  STEEL_PANEL_RADIATOR_ACCEPTANCE_INPUT,
  STEEL_PANEL_RADIATOR_CATALOG_ID,
  STEEL_PANEL_RADIATOR_FORMULAS,
  STEEL_PANEL_RADIATOR_NORM_ID,
  STEEL_PANEL_RADIATOR_PARAMETERS,
  STEEL_PANEL_RADIATOR_RESOURCES,
  STEEL_PANEL_RADIATOR_SHORT_INPUT,
  STEEL_PANEL_RADIATOR_SOURCE_ID,
  STEEL_PANEL_RADIATOR_SOURCE_METADATA,
  compileSteelPanelRadiatorR1,
} from "../../../src/lib/estimate/v4/steelPanelRadiatorR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileSteelPanelRadiatorR1({ ...STEEL_PANEL_RADIATOR_SHORT_INPUT });
  const complete = await compileSteelPanelRadiatorR1({
    ...STEEL_PANEL_RADIATOR_ACCEPTANCE_INPUT,
  });
  const conditional = await compileSteelPanelRadiatorR1({
    ...STEEL_PANEL_RADIATOR_ACCEPTANCE_INPUT,
    thermostatic_head_mode: "REQUIRED",
    thermostatic_head_designation: "Термостатическая головка по спецификации",
    thermostatic_head_quantity_piece: 8,
    concealed_pipe_insulation_mode: "REQUIRED",
    concealed_pipe_insulation_designation: "Теплоизоляция скрытой подводки по узлу",
    concealed_pipe_insulation_length_m: 24,
  });
  const shortNeeds = new Map(short.preliminaryNeeds.map((need) => [need.row_id, need]));
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "rc09:panel_radiator_install"
    && short.rows[0]?.quantity === "8"
    && short.preliminaryNeeds.length === 9)) {
    throw new Error("STOP_MASTER_STEEL_PANEL_RADIATOR_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:steel_panel_radiator_type22_500x1000",
    "rc09:radiator_wall_bracket",
    "rc09:thermostatic_radiator_valve",
    "rc09:radiator_lockshield_valve",
    "rc09:manual_air_vent",
    "rc09:radiator_connection_fitting_set",
    "rc09:radiator_connection_leak_test",
    "rc09:radiator_thermostatic_head",
    "rc09:concealed_pipe_insulation",
  ]) {
    if (!shortNeeds.has(rowId)) {
      throw new Error(`STOP_MASTER_STEEL_PANEL_RADIATOR_SHORT_NEED:${rowId}`);
    }
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 8
    && complete.rows.find((row) =>
      row.row_id === "rc09:steel_panel_radiator_type22_500x1000")?.quantity === "8"
    && complete.rows.find((row) =>
      row.row_id === "rc09:radiator_connection_leak_test")?.quantity === "8")) {
    throw new Error("STOP_MASTER_STEEL_PANEL_RADIATOR_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 10)) {
    throw new Error("STOP_MASTER_STEEL_PANEL_RADIATOR_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/(heating.full.distribution|building.heating.balance)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_STEEL_PANEL_RADIATOR_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_MASTER_STEEL_PANEL_RADIATOR_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownRadiatorCount: STEEL_PANEL_RADIATOR_SHORT_INPUT.radiator_count,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-steel-panel-radiator-successor.v1",
  stopCode: "MASTER_STEEL_PANEL_RADIATOR",
  applicationName: "r4-a13-6-master-steel-panel-radiator-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "a33132c9-4e26-5e2f-9ad6-b0510cf36327",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "7197bd5b-3d8b-5f17-9518-a84d965709f1",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-steel-panel-radiator-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/steelPanelRadiatorR1.ts",
    "tests/estimateNorms/steelPanelRadiatorR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSteelPanelRadiatorSuccessor.ts",
  ],
  catalogId: STEEL_PANEL_RADIATOR_CATALOG_ID,
  sourceId: STEEL_PANEL_RADIATOR_SOURCE_ID,
  normId: STEEL_PANEL_RADIATOR_NORM_ID,
  sourceMetadata: STEEL_PANEL_RADIATOR_SOURCE_METADATA,
  parameterDefinitions: STEEL_PANEL_RADIATOR_PARAMETERS,
  formulaDefinitions: STEEL_PANEL_RADIATOR_FORMULAS,
  resourceDefinitions: STEEL_PANEL_RADIATOR_RESOURCES,
  shortInput: STEEL_PANEL_RADIATOR_SHORT_INPUT,
  acceptanceInput: STEEL_PANEL_RADIATOR_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 18,
  validationScenario: "MASTER_BENCHMARK_18_STEEL_PANEL_RADIATOR",
  passport: {
    canonicalRuName: "Монтаж стального панельного радиатора",
    workKey: "heating_hvac_interior_radiator_install_standard",
    physicalResultRu: "Стальные панельные радиаторы тип 22, 500×1000 мм установлены и подключены по подтверждённому количеству и нижней схеме подключения с предусмотренной проверкой герметичности",
    includedScopeRu: [
      "монтаж и подключение указанного количества стальных панельных радиаторов тип 22, 500×1000 мм",
      "радиаторы и расчётные комплекты кронштейнов только по спецификации и паспорту",
      "термостатические и запорно-настроечные клапаны, воздухоотводчики и фитинги только по узлу подключения",
      "проверка герметичности только по программе испытаний",
      "термостатические головки и изоляция скрытой подводки только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "полная разводка системы отопления и балансировка здания",
      "автоматический коэффициент один прибор или один комплект на радиатор",
      "автоматические количества кронштейнов, клапанов, фитингов или испытаний",
      "неподтверждённые цены и неуказанные условные элементы",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_STEEL_PANEL_RADIATOR",
    materialSystem: "STEEL_PANEL_RADIATOR_TYPE22_500X1000_BOTTOM_CONNECTION",
    primaryMeasureParameterId: "radiator_count",
    geometryParameters: ["radiator_count", "radiator_height_mm", "radiator_length_mm"],
    knownScopeParameters: ["radiator_type", "connection_type"],
    projectScheduleRequiredForNonWorkQuantities: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    fullHeatingDistributionExcluded: true,
    wholeBuildingBalancingExcluded: true,
  },
  binding: {
    rowId: "rc09:panel_radiator_install",
    applicability: {
      technology_class: "STEEL_PANEL_RADIATOR",
      operation_class: "INSTALL_STEEL_PANEL_RADIATOR",
      material_system: "STEEL_PANEL_RADIATOR_TYPE22_500X1000_BOTTOM_CONNECTION",
      scope_mode: "KNOWN_RADIATOR_COUNT_AND_IDENTITY_PLUS_DIRECT_PRODUCT_CONNECTION_METHOD_QA_QUANTITIES",
      source_id: STEEL_PANEL_RADIATOR_SOURCE_ID,
      norm_id: STEEL_PANEL_RADIATOR_NORM_ID,
      exact_locator: STEEL_PANEL_RADIATOR_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      item_count_consumption_or_productivity_rates_claimed: false,
      quantity_basis: "KNOWN_RADIATOR_COUNT_TYPE_DIMENSIONS_CONNECTION_PLUS_APPROVED_SCHEDULE_DETAILS_METHOD_AND_QA_PLAN",
    },
  },
  locator: {
    key: "steel-panel-radiator-project-package-required-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: STEEL_PANEL_RADIATOR_SOURCE_METADATA.exact_locator,
      geometryInputs: ["radiator_count", "radiator_height_mm", "radiator_length_mm"],
      knownScopeInputs: ["radiator_type", "connection_type"],
      directScheduleInputs: [
        "radiator_designation", "radiator_quantity_piece",
        "bracket_designation", "bracket_quantity_set",
        "thermostatic_valve_designation", "thermostatic_valve_quantity_piece",
        "lockshield_valve_designation", "lockshield_valve_quantity_piece",
        "air_vent_designation", "air_vent_quantity_piece",
        "fitting_set_designation", "fitting_set_quantity_set",
        "leak_test_designation", "leak_test_count_test",
      ],
      conditionalInputs: [
        "thermostatic_head_mode", "thermostatic_head_designation",
        "thermostatic_head_quantity_piece", "concealed_pipe_insulation_mode",
        "concealed_pipe_insulation_designation", "concealed_pipe_insulation_length_m",
      ],
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Монтаж стального панельного радиатора",
    aliases: [
      "стальной панельный радиатор тип 22 500×1000",
      "установка радиатора нижнее подключение",
      "монтаж панельной батареи отопления",
      "steel panel radiator type 22",
    ],
    shortScopeRu: "Монтаж указанного количества стальных панельных радиаторов тип 22, 500×1000 мм с нижним подключением; количество сразу даёт объём работ, а приборы, кронштейны, клапаны, воздухоотводчики, фитинги, проверки и условные элементы уточняются добровольно по проекту.",
    keyDistinguishingParameters: [
      "radiator_count", "radiator_type", "radiator_height_mm", "radiator_length_mm",
      "connection_type",
    ],
    clarificationFields: [
      "radiator_designation", "radiator_quantity_piece", "bracket_designation",
      "bracket_quantity_set", "thermostatic_valve_designation",
      "thermostatic_valve_quantity_piece", "lockshield_valve_designation",
      "lockshield_valve_quantity_piece", "air_vent_designation", "air_vent_quantity_piece",
      "fitting_set_designation", "fitting_set_quantity_set", "leak_test_designation",
      "leak_test_count_test", "thermostatic_head_mode", "concealed_pipe_insulation_mode",
    ],
    includedBoundaries: [
      "монтаж и подключение радиаторов по известному количеству, типу, размерам и схеме",
      "радиаторы и кронштейны выбранной системы",
      "клапаны, воздухоотводчики и фитинги по узлу подключения",
      "проверка герметичности по программе испытаний",
      "термоголовки и изоляция скрытой подводки только по условным проектным ветвям",
    ],
    excludedBoundaries: [
      "полная разводка системы отопления",
      "балансировка отопления всего здания",
      "автоматические нормы приборов, комплектов, клапанов, фитингов или испытаний",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: "радиатор панельный тип 22 500 1000 нижнее подключение кронштейн термостатический клапан запорный клапан воздухоотводчик фитинг герметичность термоголовка изоляция",
    sourceProvenance: {
      exactSteelPanelRadiatorOwner: true,
      exactProductConnectionMethodAndQaPackageRequiredForNonWorkQuantities: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /heating_full_distribution|полн.*разводк.*отоплен/iu,
    /building_heating_balance|балансировк.*здани/iu,
  ],
  owner: "MASTER_STEEL_PANEL_RADIATOR_SUCCESSOR",
  receiptFileStem: "MASTER_STEEL_PANEL_RADIATOR",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
