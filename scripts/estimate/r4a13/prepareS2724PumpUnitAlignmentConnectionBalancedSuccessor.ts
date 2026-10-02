import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
  PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID,
  PUMP_UNIT_ALIGNMENT_CONNECTION_FORMULAS,
  PUMP_UNIT_ALIGNMENT_CONNECTION_NORM_ID,
  PUMP_UNIT_ALIGNMENT_CONNECTION_PARAMETERS,
  PUMP_UNIT_ALIGNMENT_CONNECTION_RESOURCES,
  PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_CLASSIFICATION,
  PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_INPUT,
  PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_SOURCE_IDS,
  PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
  PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID,
  PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA,
  compilePumpUnitAlignmentConnectionR1,
} from "../../../src/lib/estimate/v4/pumpUnitAlignmentConnectionR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(
  result: Awaited<ReturnType<typeof compilePumpUnitAlignmentConnectionR1>>,
  rowId: string,
) {
  return result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
}

async function verifyCore(): Promise<Json> {
  const first = await compilePumpUnitAlignmentConnectionR1({
    ...PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
  });
  const complete = await compilePumpUnitAlignmentConnectionR1({
    ...PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
  });
  const balanced = await compilePumpUnitAlignmentConnectionR1({
    ...PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
    pump_retained_spare_set: 1,
    pump_supplier_pack_size_set: 2,
  });
  const conditional = await compilePumpUnitAlignmentConnectionR1({
    ...PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
    vibration_isolator_mode: "REQUIRED",
    vibration_isolator_designation: "Виброизоляторы по чертежу насосной рамы",
    vibration_isolator_quantity_set: 2,
    flexible_connector_mode: "REQUIRED",
    flexible_connector_designation: "Гибкие вставки по схеме обвязки",
    flexible_connector_quantity_set: 4,
  });
  const needs = new Set(first.preliminaryNeeds.map((need) => need.row_id));
  if (!(first.rows.length === 9 && first.preliminaryNeeds.length === 15
    && quantity(first, "rc09:pump_unit_install_align") === "2"
    && quantity(first, "rc09:pump_motor_baseframe_45m3h_55m") === "2"
    && quantity(first, "rc09:pump_vibration_qh_current_test") === "2")) {
    throw new Error("STOP_S27_24_PUMP_UNIT_FIRST_ESTIMATE");
  }
  for (const rowId of [
    "rc09:pump_anchor_bolt_set", "rc09:pump_alignment_shim_set",
    "rc09:non_shrink_pump_base_grout", "rc09:pump_flange_gasket_fastener_set",
    "rc09:laser_shaft_alignment_tool", "rc09:pump_vibration_isolator",
    "rc09:pump_flexible_connector", "rc09:pump_test_record",
    "rc09:labor:pump-installation-alignment", "rc09:labor:pump-testing",
    "rc09:equipment:pump-lifting", "rc09:equipment:pump-torque-tool",
    "rc09:equipment:pump-vibration-analyzer", "rc09:logistics:pump-delivery",
    "rc09:logistics:pump-waste-removal",
  ]) if (!needs.has(rowId)) throw new Error(`STOP_S27_24_PUMP_UNIT_NEED:${rowId}`);
  if (!(complete.rows.length === 22 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:pump_anchor_bolt_set") === "2"
    && quantity(complete, "rc09:non_shrink_pump_base_grout") === "84"
    && quantity(complete, "rc09:pump_flange_gasket_fastener_set") === "4"
    && quantity(complete, "rc09:labor:pump-installation-alignment") === "36"
    && quantity(complete, "rc09:equipment:pump-lifting") === "8"
    && quantity(complete, "rc09:logistics:pump-delivery") === "1")) {
    throw new Error("STOP_S27_24_PUMP_UNIT_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:pump-balance:installed-net") === "2"
    && quantity(balanced, "rc09:pump-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:pump-balance:total-need") === "3"
    && quantity(balanced, "rc09:pump-balance:package-count") === "2"
    && quantity(balanced, "rc09:pump_motor_baseframe_45m3h_55m") === "4"
    && quantity(balanced, "rc09:pump-balance:remainder") === "2"
    && quantity(balanced, "rc09:pump-balance:surplus-beyond-reserve") === "1")) {
    throw new Error("STOP_S27_24_PUMP_UNIT_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 24 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_PUMP_UNIT_CONDITIONAL_PROFILE");
  }
  const ownedRows = PUMP_UNIT_ALIGNMENT_CONNECTION_RESOURCES
    .map((row) => `${row.row_id} ${row.title_ru}`).join("\n");
  if (/(?:pumping.station.collectors|water.reservoir|pumping.station.automation|full.pumping.station)/iu
    .test(ownedRows)) {
    throw new Error("STOP_S27_24_PUMP_UNIT_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_PUMP_UNIT_ALIGNMENT_CONNECTION_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      knownPumpCount: PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT.pump_count,
      knownDesignFlowM3H: PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT.design_flow_m3_h,
      knownDesignHeadM: PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT.design_head_m,
      visibleRowIds: first.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: first.preliminaryNeeds.map((need) => need.row_id) },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedSet: quantity(balanced, "rc09:pump-balance:installed-net"),
      retainedSpareSet: quantity(balanced, "rc09:pump-balance:retained-spare"),
      totalNeedSet: quantity(balanced, "rc09:pump-balance:total-need"),
      packageCount: quantity(balanced, "rc09:pump-balance:package-count"),
      orderedSet: quantity(balanced, "rc09:pump_motor_baseframe_45m3h_55m"),
      remainderSet: quantity(balanced, "rc09:pump-balance:remainder"),
      surplusBeyondReserveSet:
        quantity(balanced, "rc09:pump-balance:surplus-beyond-reserve"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    "rik-expo-app.s27-24.pump-unit-alignment-connection-balanced-successor.v2",
  stopCode: "S27_24_PUMP_UNIT_ALIGNMENT_CONNECTION_BALANCED",
  applicationName: "s27-24-pump-unit-alignment-connection-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "319691ac-e781-547c-91e7-209b588ef913",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "04642700-99f6-5f59-b908-e8055f2100b4",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-24/pump-unit-alignment-connection-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/pump-unit-alignment-connection-balanced-s27-24.json",
    "src/lib/estimate/v4/pumpUnitAlignmentConnectionR1.ts",
    "tests/estimateNorms/pumpUnitAlignmentConnectionR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724PumpUnitAlignmentConnectionBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724PumpUnitAlignmentConnectionBalancedIndependent.ts",
  ],
  catalogId: PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID,
  sourceId: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID,
  normId: PUMP_UNIT_ALIGNMENT_CONNECTION_NORM_ID,
  sourceMetadata: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA,
  parameterDefinitions: PUMP_UNIT_ALIGNMENT_CONNECTION_PARAMETERS,
  formulaDefinitions: PUMP_UNIT_ALIGNMENT_CONNECTION_FORMULAS,
  resourceDefinitions: PUMP_UNIT_ALIGNMENT_CONNECTION_RESOURCES,
  shortInput: PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
  acceptanceInput: PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT,
  runtimeProfileInput: PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_INPUT,
  runtimeProfileClassification: PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [20, 10, 10],
  benchmarkOrdinal: 27,
  validationScenario: "MASTER_BENCHMARK_27_PUMP_UNIT_ALIGNMENT_CONNECTION_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Монтаж, центровка и подключение насосного агрегата на раме",
    workKey: "plumbing_interior_pump_install_standard",
    physicalResultRu:
      "Выбранные насосные агрегаты Q=45 м³/ч, H=55 м смонтированы на рамах, отцентрованы, присоединены и индивидуально испытаны",
    includedScopeRu: [
      "монтаж, обвязка и центровка известного количества насосных агрегатов точной выбранной марки",
      "видимый баланс агрегатов: монтаж, резерв, упаковка, заказ и остаток",
      "анкеры, регулировочные пластины, безусадочная подливка и фланцевые комплекты по проекту",
      "труд монтажников и наладчиков, грузоподъёмный механизм, инструмент затяжки, лазерный прибор и анализатор по ППР",
      "индивидуальный контроль соосности, вибрации, Q/H и тока с отдельными актами",
      "доставка и вывоз отходов по проектным планам",
      "виброизоляторы и гибкие вставки только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "коллекторы насосной станции", "резервуар воды", "автоматика насосной станции",
      "полная насосная станция", "автоматический выбор насоса или гидравлический расчёт",
      "универсальные нормы расхода, производительности или неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_ALIGN_CONNECT_PUMP_UNIT",
    pumpConfiguration: "PUMP_MOTOR_ON_BASEFRAME",
    primaryMeasureParameterId: "pump_count",
    knownScopeParameters: [
      "pump_unit_product_designation", "design_flow_m3_h", "design_head_m",
      "pump_configuration",
    ],
    visibleProcurementBalance: true,
    projectPackageRequiredForFoundationPipingLaborEquipmentTestingAndLogistics: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    pumpingStationCollectorsExcluded: true,
    waterReservoirExcluded: true,
    pumpingStationAutomationExcluded: true,
    fullPumpingStationExcluded: true,
  },
  binding: {
    rowId: "rc09:pump_unit_install_align",
    applicability: {
      technology_class: "PUMP_UNIT_ON_BASEFRAME",
      operation_class: "INSTALL_ALIGN_CONNECT_PUMP_UNIT",
      pump_configuration: "PUMP_MOTOR_ON_BASEFRAME",
      scope_mode:
        "KNOWN_SELECTED_PUMP_Q_H_PLUS_VISIBLE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID,
      norm_id: PUMP_UNIT_ALIGNMENT_CONNECTION_NORM_ID,
      exact_locator: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis:
        "KNOWN_PUMP_CARDINALITY_PLUS_VISIBLE_PACKAGING_AND_APPROVED_PROJECT_METHOD_QA_LOGISTICS",
    },
  },
  locator: {
    key: "pump-unit-alignment-connection-project-balance-s27-24-v2",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.exact_locator,
      sourcePackSha256: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: [
        "pump_count", "pump_unit_product_designation", "design_flow_m3_h",
        "design_head_m", "pump_configuration",
      ],
      visiblePreliminaryBalanceInputs:
        Object.keys(PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_INPUT),
      directProjectInputs: [
        "anchor_set_designation", "anchor_set_quantity",
        "shim_set_designation", "shim_set_quantity",
        "base_grout_designation", "base_grout_mass_kg",
        "flange_set_designation", "flange_set_quantity",
        "alignment_tool_designation", "alignment_tool_shift",
        "pump_test_record_designation", "pump_test_record_quantity_document",
        "pump_installation_alignment_labor_h", "pump_testing_labor_h",
        "pump_lifting_equipment_machine_h", "pump_torque_tool_machine_h",
        "pump_vibration_analyzer_machine_h", "pump_delivery_trip_count",
        "pump_waste_removal_trip_count",
      ],
      conditionalInputs: [
        "vibration_isolator_mode", "vibration_isolator_designation",
        "vibration_isolator_quantity_set", "flexible_connector_mode",
        "flexible_connector_designation", "flexible_connector_quantity_set",
      ],
    },
  },
  search: {
    primaryUom: "set",
    canonicalNameRu: "Монтаж, центровка и подключение насосного агрегата на раме",
    aliases: [
      "монтаж насоса на фундаментную раму", "центровка насоса и электродвигателя",
      "подключение насосного агрегата 45 м3/ч 55 м",
      "pump unit installation alignment connection",
    ],
    shortScopeRu:
      "Монтаж двух выбранных насосных агрегатов PUMP-Q45-H55 на раме, Q=45 м³/ч и H=55 м, с видимым закупочным балансом; проектные материалы, труд, механизмы, испытания и логистика уточняются по документам.",
    keyDistinguishingParameters: [
      "pump_count", "pump_unit_product_designation", "design_flow_m3_h",
      "design_head_m", "pump_configuration",
    ],
    clarificationFields: PUMP_UNIT_ALIGNMENT_CONNECTION_PARAMETERS
      .map((parameter) => parameter.parameter_id)
      .filter((parameterId) => ![
        "pump_count", "pump_unit_product_designation", "design_flow_m3_h",
        "design_head_m", "pump_configuration",
      ].includes(parameterId)),
    includedBoundaries: [
      "выбранные насосные агрегаты, их монтаж, обвязка, центровка и закупочный баланс",
      "проектные анкеры, пластины, подливка, фланцевые комплекты, труд и механизмы",
      "индивидуальные испытания, акты и логистика",
      "условные виброизоляторы и гибкие вставки",
    ],
    excludedBoundaries: [
      "коллекторы и резервуар насосной станции", "автоматика и полная насосная станция",
      "автоматический гидравлический выбор", "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      "насос агрегат двигатель рама Q H резерв упаковка заказ анкеры пластины безусадочная подливка фланец лазерная центровка вибрация ток грузоподъёмный механизм труд испытание акт доставка",
    sourceProvenance: {
      exactPumpUnitOwner: true,
      exactSelectedPumpAndPassportQHRequired: true,
      visibleProcurementBalance: true,
      exactProjectFoundationPipingLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /pumping.station.collectors|коллектор.*насосн.*станц/iu,
    /water.reservoir|резервуар.*вод/iu,
    /pumping.station.automation|автоматик.*насосн.*станц/iu,
    /full.pumping.station|полн.*насосн.*станц/iu,
  ],
  owner: "S27_24_PUMP_UNIT_ALIGNMENT_CONNECTION_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_PUMP_UNIT_ALIGNMENT_CONNECTION_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
