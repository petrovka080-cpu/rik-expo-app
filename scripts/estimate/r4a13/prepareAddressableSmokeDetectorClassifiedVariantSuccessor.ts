import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_ACCEPTANCE_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_FORMULAS,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_NORM_ID,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_PARAMETERS,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_RESOURCES,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SHORT_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SOURCE_ID,
  ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SOURCE_METADATA,
  compileAddressableSmokeDetectorClassifiedVariantR1,
  resolveAddressableSmokeDetectorClassifiedVariant,
  type AddressableSmokeDetectorClassifiedVariantKey,
} from "../../../src/lib/estimate/v4/addressableSmokeDetectorClassifiedVariantsR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const currentReleasePath = resolve(
  "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId?: unknown;
  searchReleaseId?: unknown;
};
const variantKey = String(
  process.env.S276_F09_ADDRESSABLE_DETECTOR_VARIANT ?? "high_load",
) as AddressableSmokeDetectorClassifiedVariantKey;
const variant = resolveAddressableSmokeDetectorClassifiedVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const outputStem = variantKey.replace(/_/gu, "-");
const stopCode = `S276_F09_ADDRESSABLE_SMOKE_DETECTOR_${variantToken}`;

function requiredPointer(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`STOP_${stopCode}_CURRENT_POINTER_${field}`);
  }
  return value;
}

async function verifyCore(): Promise<Json> {
  const short = await compileAddressableSmokeDetectorClassifiedVariantR1(variantKey, {
    ...ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SHORT_INPUT,
  });
  const complete = await compileAddressableSmokeDetectorClassifiedVariantR1(variantKey, {
    ...ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_ACCEPTANCE_INPUT,
  });
  if (!(short.rows.length === 4
    && short.rows.every((row) => row.quantity === "25")
    && short.preliminaryNeeds.length === 6)) {
    throw new Error(`STOP_${stopCode}_SHORT_COMPOSITION`);
  }
  if (!(complete.rows.length === 8 && complete.preliminaryNeeds.length === 0)) {
    throw new Error(`STOP_${stopCode}_COMPLETE_FIXTURE`);
  }
  const actualRows = JSON.stringify(
    ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_RESOURCES.map((row) => ({
      row_id: row.row_id,
      title_ru: row.title_ru,
      category: row.category,
    })),
  );
  if (/fire_alarm_loop_cable|control_panel|sounder|power_supply|full_fire_alarm_system/iu
    .test(actualRows)) {
    throw new Error(`STOP_${stopCode}_ADJACENT_SCOPE`);
  }
  return {
    status: `GREEN_${stopCode}_CORE`,
    variantKey,
    catalogId: variant.catalogId,
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
      quantities: complete.rows.map((row) => row.quantity),
    },
    classificationFactorApplied: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, complete }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract:
    `rik-expo-app.s27-6.f09-addressable-smoke-detector-${outputStem}-successor.v1`,
  stopCode,
  applicationName:
    `s27-6-f09-addressable-smoke-detector-${outputStem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (42).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "223a3809cd2c861685ead3d1e701f7150572333a069f334c14f21f69541401d3",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? requiredPointer(currentRelease.definitionReleaseId, "DEFINITION_RELEASE_ID"),
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? requiredPointer(currentRelease.searchReleaseId, "SEARCH_RELEASE_ID"),
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-6/f09-fire-current-lineage/`
      + `addressable-smoke-detector-${outputStem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/addressableSmokeDetectorR1.ts",
    "src/lib/estimate/v4/addressableSmokeDetectorClassifiedVariantsR1.ts",
    "tests/estimateNorms/addressableSmokeDetectorR1.contract.test.ts",
    "tests/estimateNorms/addressableSmokeDetectorClassifiedVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareAddressableSmokeDetectorClassifiedVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SOURCE_ID,
  normId: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_NORM_ID,
  sourceMetadata: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SOURCE_METADATA,
  projectSourcePackagePath: process.env.S279_ADDRESSABLE_PROJECT_SOURCE_PACKAGE_PATH,
  parameterDefinitions: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_PARAMETERS,
  formulaDefinitions: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_FORMULAS,
  resourceDefinitions: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_RESOURCES,
  shortInput: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SHORT_INPUT,
  acceptanceInput: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 0,
  validationScenario: `F09_ADDRESSABLE_SMOKE_DETECTOR_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `electrical_interior_fire_alarm_install_${variantKey}`,
    physicalResultRu:
      `${variant.canonicalNameRu}: устройства с совместимыми базами установлены, промаркированы, адресованы и проверены по утверждённой программе`,
    includedScopeRu: [
      "монтаж по известному количеству адресных дымовых извещателей",
      "один адресный извещатель, одна совместимая база и одна адресная метка на устройство",
      "крепёж, аэрозоль, тестовое оборудование и протоколы только по прямым данным проекта, ППР и программы ПНР",
      "изоляторы шлейфа и огнестойкие коробки только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "кабель шлейфа и приёмно-контрольный прибор",
      "оповещатели, блок питания и полная система пожарной сигнализации",
      "коэффициент количества, расхода или трудоёмкости только из классификационного суффикса",
      "исторические нормы расхода аэрозоля и неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_ADDRESSABLE_OPTICAL_SMOKE_DETECTOR",
    catalogVariant: variant.catalogVariant,
    detectorSystem: "ADDRESSABLE_OPTICAL_SMOKE_WITH_MATCHED_BASE",
    primaryMeasureParameterId: "detector_count",
    geometryParameters: ["detector_count"],
    knownScopeParameters: ["detector_type", "base_type"],
    projectPackageRequiredForFixingTestingEquipmentAndQa: true,
    conditionalScopeFailClosed: true,
    universalClassificationFactorClaimed: false,
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
      catalog_variant: variant.catalogVariant,
      detector_system: "ADDRESSABLE_OPTICAL_SMOKE_WITH_MATCHED_BASE",
      scope_mode:
        "KNOWN_DEVICE_COUNT_TYPE_AND_BASE_PLUS_DIRECT_PROJECT_FIXING_TESTING_EQUIPMENT_AND_QA",
      source_id: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SOURCE_ID,
      norm_id: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_NORM_ID,
      exact_locator: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SOURCE_METADATA.exact_locator,
      universal_classification_factor_claimed: false,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_qa_rates_claimed: false,
      quantity_basis:
        "KNOWN_DEVICE_CARDINALITY_PLUS_APPROVED_PROJECT_METHOD_AND_QA_DOCUMENTATION",
    },
  },
  locator: {
    key: `addressable-smoke-detector-${outputStem}-project-package-required-v1`,
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      catalogVariant: variant.catalogVariant,
      exactLocator: ADDRESSABLE_SMOKE_DETECTOR_CLASSIFIED_SOURCE_METADATA.exact_locator,
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
      universalClassificationFactorClaimed: false,
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      ...variant.aliasesRu,
      `addressable optical smoke detector installation ${outputStem}`,
    ],
    shortScopeRu:
      "Монтаж адресных оптических дымовых извещателей с совместимыми базами и адресными метками; классификационный суффикс не создаёт скрытого коэффициента количества или расхода.",
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
      "протоколы адресации и срабатывания",
      "условные изоляторы шлейфа и огнестойкие коробки",
    ],
    excludedBoundaries: [
      "кабель шлейфа пожарной сигнализации",
      "приёмно-контрольный прибор, оповещатели и блок питания",
      "полная система пожарной сигнализации",
      "скрытый коэффициент классификационного суффикса",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `АПС адресный дымовой извещатель база адрес метка крепёж аэрозоль тестер ПНР протокол ${variantKey}`,
    sourceProvenance: {
      exactAddressableSmokeDetectorOwner: true,
      knownDeviceBaseAndLabelCardinality: true,
      exactProjectMethodAndQaPackageRequiredForNonDeviceQuantities: true,
      universalClassificationFactorRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /fire.alarm.loop.cable|кабел.*шлейф/iu,
    /fire.alarm.control.panel|при[её]мн.*контрол.*прибор/iu,
    /sounder|оповещател/iu,
    /power.supply|блок.*питан/iu,
    /full.fire.alarm.system|полн.*систем.*пожарн.*сигнал/iu,
  ],
  owner: `${stopCode}_SUCCESSOR`,
  receiptFileStem: stopCode,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
