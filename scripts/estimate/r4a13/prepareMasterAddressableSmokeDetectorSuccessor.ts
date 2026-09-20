import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID,
  ADDRESSABLE_SMOKE_DETECTOR_FORMULAS,
  ADDRESSABLE_SMOKE_DETECTOR_NORM_ID,
  ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS,
  ADDRESSABLE_SMOKE_DETECTOR_RESOURCES,
  ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID,
  ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA,
  compileAddressableSmokeDetectorR1,
} from "../../../src/lib/estimate/v4/addressableSmokeDetectorR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileAddressableSmokeDetectorR1({
    ...ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  });
  const complete = await compileAddressableSmokeDetectorR1({
    ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
  });
  const conditional = await compileAddressableSmokeDetectorR1({
    ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
    loop_isolator_mode: "REQUIRED",
    loop_isolator_designation: "Изолятор адресного шлейфа по схеме",
    loop_isolator_quantity_piece: 2,
    junction_box_mode: "REQUIRED",
    junction_box_designation: "Коробка E30 по узлу",
    junction_box_quantity_piece: 5,
  });
  const needs = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  if (!(short.rows.length === 4
    && short.rows.find((row) => row.row_id === "rc09:addressable_smoke_detector_install")
      ?.quantity === "25"
    && short.rows.find((row) => row.row_id === "rc09:addressable_optical_smoke_detector")
      ?.quantity === "25"
    && short.rows.find((row) => row.row_id === "rc09:addressable_detector_base")
      ?.quantity === "25"
    && short.rows.find((row) => row.row_id === "rc09:detector_address_label")
      ?.quantity === "25"
    && short.preliminaryNeeds.length === 6)) {
    throw new Error("STOP_MASTER_ADDRESSABLE_SMOKE_DETECTOR_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:detector_fire_resistant_fastener",
    "rc09:smoke_detector_test_aerosol",
    "rc09:smoke_detector_test_dispenser",
    "rc09:smoke_detector_activation_record",
    "rc09:addressable_loop_isolator",
    "rc09:fire_resistant_junction_box",
  ]) {
    if (!needs.has(rowId)) throw new Error(`STOP_MASTER_ADDRESSABLE_DETECTOR_NEED:${rowId}`);
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 8
    && complete.rows.find((row) => row.row_id === "rc09:detector_fire_resistant_fastener")
      ?.quantity === "25"
    && complete.rows.find((row) => row.row_id === "rc09:smoke_detector_activation_record")
      ?.quantity === "1")) {
    throw new Error("STOP_MASTER_ADDRESSABLE_SMOKE_DETECTOR_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 10)) {
    throw new Error("STOP_MASTER_ADDRESSABLE_SMOKE_DETECTOR_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/(fire.alarm.loop.cable|fire.alarm.control.panel|sounder|power.supply|full.fire.alarm.system)/iu
    .test(serialized)) {
    throw new Error("STOP_MASTER_ADDRESSABLE_SMOKE_DETECTOR_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_MASTER_ADDRESSABLE_SMOKE_DETECTOR_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownDetectorCount: ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT.detector_count,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-addressable-smoke-detector-successor.v1",
  stopCode: "MASTER_ADDRESSABLE_SMOKE_DETECTOR",
  applicationName: "r4-a13-6-master-addressable-smoke-detector-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "543a98e4-dbe0-54f6-a391-dc5ea53263b9",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "e554f701-7619-50d8-b188-b2f755fc8e50",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-addressable-smoke-detector-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/addressableSmokeDetectorR1.ts",
    "tests/estimateNorms/addressableSmokeDetectorR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterAddressableSmokeDetectorSuccessor.ts",
  ],
  catalogId: ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID,
  sourceId: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID,
  normId: ADDRESSABLE_SMOKE_DETECTOR_NORM_ID,
  sourceMetadata: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA,
  parameterDefinitions: ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS,
  formulaDefinitions: ADDRESSABLE_SMOKE_DETECTOR_FORMULAS,
  resourceDefinitions: ADDRESSABLE_SMOKE_DETECTOR_RESOURCES,
  shortInput: ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  acceptanceInput: ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 26,
  validationScenario: "MASTER_BENCHMARK_26_ADDRESSABLE_SMOKE_DETECTOR",
  passport: {
    canonicalRuName: "Монтаж адресного оптико-электронного дымового извещателя с базой",
    workKey: "electrical_interior_fire_alarm_install_standard",
    physicalResultRu: "Адресные дымовые извещатели с совместимыми базами установлены, промаркированы, адресованы и проверены по программе пусконаладки",
    includedScopeRu: [
      "монтаж по известному количеству извещателей",
      "один адресный оптический извещатель и одна совместимая база на установленное устройство",
      "индивидуальная адресная метка на установленное устройство",
      "крепёж, аэрозоль, тестовое оборудование и протоколы только по проекту, ППР и QA",
      "изоляторы шлейфа и огнестойкие коробки только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "кабель адресного шлейфа",
      "приёмно-контрольный прибор",
      "оповещатели и блок питания",
      "полная система пожарной сигнализации",
      "исторические нормы расхода аэрозоля, времени оборудования и количества протоколов",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_ADDRESSABLE_OPTICAL_SMOKE_DETECTOR",
    detectorSystem: "ADDRESSABLE_OPTICAL_SMOKE_WITH_MATCHED_BASE",
    primaryMeasureParameterId: "detector_count",
    geometryParameters: ["detector_count"],
    knownScopeParameters: ["detector_type", "base_type"],
    projectPackageRequiredForFixingTestingEquipmentAndQa: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    loopCableExcluded: true,
    controlPanelExcluded: true,
    sounderAndPowerExcluded: true,
    fullFireAlarmSystemExcluded: true,
  },
  binding: {
    rowId: "rc09:addressable_smoke_detector_install",
    applicability: {
      technology_class: "ADDRESSABLE_OPTICAL_SMOKE_DETECTOR",
      operation_class: "INSTALL_ADDRESSABLE_OPTICAL_SMOKE_DETECTOR",
      detector_system: "ADDRESSABLE_OPTICAL_SMOKE_WITH_MATCHED_BASE",
      scope_mode:
        "KNOWN_DEVICE_COUNT_TYPE_AND_BASE_PLUS_DIRECT_PROJECT_FIXING_TESTING_EQUIPMENT_AND_QA",
      source_id: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_ID,
      norm_id: ADDRESSABLE_SMOKE_DETECTOR_NORM_ID,
      exact_locator: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_qa_rates_claimed: false,
      quantity_basis: "KNOWN_DEVICE_CARDINALITY_PLUS_APPROVED_PROJECT_METHOD_AND_QA_DOCUMENTATION",
    },
  },
  locator: {
    key: "addressable-smoke-detector-project-package-required-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: ADDRESSABLE_SMOKE_DETECTOR_SOURCE_METADATA.exact_locator,
      geometryInputs: ["detector_count"],
      knownScopeInputs: ["detector_type", "base_type"],
      directProjectInputs: [
        "fastener_designation", "fastener_quantity_set",
        "aerosol_designation", "aerosol_volume_l",
        "dispenser_designation", "dispenser_machine_hour",
        "activation_protocol_designation", "activation_protocol_quantity_document",
      ],
      conditionalInputs: [
        "loop_isolator_mode", "loop_isolator_designation", "loop_isolator_quantity_piece",
        "junction_box_mode", "junction_box_designation", "junction_box_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Монтаж адресного оптико-электронного дымового извещателя с базой",
    aliases: [
      "монтаж адресного дымового пожарного извещателя",
      "адресный оптический дымовой датчик с базой",
      "addressable optical smoke detector installation",
      "установка адресного извещателя пожарной сигнализации",
    ],
    shortScopeRu: "Монтаж 25 адресных оптических дымовых извещателей с 25 совместимыми базами и адресными метками; крепёж, тестовый аэрозоль, оборудование и протоколы добровольно уточняются по проекту, ППР и программе ПНР.",
    keyDistinguishingParameters: ["detector_count", "detector_type", "base_type"],
    clarificationFields: [
      "fastener_designation", "fastener_quantity_set", "aerosol_volume_l",
      "dispenser_machine_hour", "activation_protocol_quantity_document",
      "loop_isolator_mode", "junction_box_mode",
    ],
    includedBoundaries: [
      "монтаж, адресный извещатель, совместимая база и адресная метка по количеству устройств",
      "крепёж по узлу фактического основания",
      "аэрозоль и тестовое оборудование по программе ПНР",
      "протоколы адресации и срабатывания по QA",
      "условные изоляторы шлейфа и огнестойкие коробки",
    ],
    excludedBoundaries: [
      "кабель шлейфа пожарной сигнализации",
      "приёмно-контрольный прибор",
      "оповещатели и блок питания",
      "полная система пожарной сигнализации",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: "АПС адресный дымовой оптический извещатель датчик база адрес метка крепёж аэрозоль тестер ПНР протокол изолятор шлейфа огнестойкая коробка",
    sourceProvenance: {
      exactAddressableSmokeDetectorOwner: true,
      knownDeviceBaseAndLabelCardinality: true,
      exactProjectMethodAndQaPackageRequiredForNonDeviceQuantities: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /fire.alarm.loop.cable|кабел.*шлейф/iu,
    /fire.alarm.control.panel|приемн.*контрол.*прибор/iu,
    /sounder|оповещател/iu,
    /power.supply|блок.*питан/iu,
    /full.fire.alarm.system|полн.*систем.*пожарн.*сигнал/iu,
  ],
  owner: "MASTER_ADDRESSABLE_SMOKE_DETECTOR_SUCCESSOR",
  receiptFileStem: "MASTER_ADDRESSABLE_SMOKE_DETECTOR",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
