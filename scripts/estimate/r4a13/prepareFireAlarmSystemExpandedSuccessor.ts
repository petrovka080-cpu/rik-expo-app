import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FIRE_ALARM_SYSTEM_EXPANDED_ACCEPTANCE_INPUT,
  FIRE_ALARM_SYSTEM_EXPANDED_ARTIFACT_SHA256,
  FIRE_ALARM_SYSTEM_EXPANDED_CATALOG_ID,
  FIRE_ALARM_SYSTEM_EXPANDED_FORMULAS,
  FIRE_ALARM_SYSTEM_EXPANDED_NORM_ID,
  FIRE_ALARM_SYSTEM_EXPANDED_PARAMETERS,
  FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE,
  FIRE_ALARM_SYSTEM_EXPANDED_RESOURCES,
  FIRE_ALARM_SYSTEM_EXPANDED_RUNTIME_CLASSIFICATION,
  FIRE_ALARM_SYSTEM_EXPANDED_RUNTIME_SOURCE_IDS,
  FIRE_ALARM_SYSTEM_EXPANDED_SHORT_INPUT,
  FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_ID,
  FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA,
  compileFireAlarmSystemExpandedR1,
  fireAlarmSystemExpandedCompletenessMap,
} from "../../../src/lib/estimate/v4/fireAlarmSystemExpandedR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const currentReleasePath = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId?: unknown; searchReleaseId?: unknown;
};
const stopCode = "S277_F09_FIRE_ALARM_SYSTEM_EXPANDED";

function requiredPointer(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`STOP_${stopCode}_CURRENT_POINTER_${field}`);
  }
  return value;
}

function rowQuantity(
  compiled: Awaited<ReturnType<typeof compileFireAlarmSystemExpandedR1>>,
  rowId: string,
): string | undefined {
  return compiled.rows.find((row) => row.row_id === rowId)?.quantity;
}

async function verifyCore(): Promise<Json> {
  const short = await compileFireAlarmSystemExpandedR1(FIRE_ALARM_SYSTEM_EXPANDED_SHORT_INPUT);
  const edited = await compileFireAlarmSystemExpandedR1({
    ...FIRE_ALARM_SYSTEM_EXPANDED_ACCEPTANCE_INPUT,
    protected_area_m2: 500,
    device_reserve_factor: 1.1,
    smoke_detector_density_pcs_m2: 0.1,
    manual_call_point_density_pcs_m2: 0.02,
    sounder_density_pcs_m2: 0.03,
    visual_alarm_density_pcs_m2: 0.015,
    interface_module_density_pcs_m2: 0.004,
    panel_capacity_point: 100,
    loop_capacity_point: 60,
    cable_length_rate_m_m2: 3,
    cable_reserve_factor: 1.15,
    containment_share: 0.8,
    junction_box_interval_m: 30,
    cable_fastener_spacing_m: 0.4,
  });
  if (!(short.rows.length === 37 && short.preliminaryNeeds.length === 0
    && rowQuantity(short, "f09:fire_alarm_system_detector") === "84"
    && rowQuantity(short, "f09:fire_alarm_system_manual_call_point") === "11"
    && rowQuantity(short, "f09:fire_alarm_system_panel") === "1"
    && rowQuantity(short, "f09:fire_alarm_system_loop_isolator") === "5"
    && rowQuantity(short, "f09:fire_alarm_system_cable") === "2640"
    && rowQuantity(short, "f09:fire_alarm_system_containment") === "1980"
    && rowQuantity(short, "f09:fire_alarm_system_cable_fastener") === "3960"
    && rowQuantity(short, "f09:fire_alarm_system_waste_container") === "6")) {
    throw new Error(`STOP_${stopCode}_AUTOMATIC_FIRST_ESTIMATE`);
  }
  if (!(edited.rows.length === 37 && edited.preliminaryNeeds.length === 0
    && rowQuantity(edited, "f09:fire_alarm_system_detector") === "55"
    && rowQuantity(edited, "f09:fire_alarm_system_manual_call_point") === "11"
    && rowQuantity(edited, "f09:fire_alarm_system_interface_module") === "3"
    && rowQuantity(edited, "f09:fire_alarm_system_panel") === "1"
    && rowQuantity(edited, "f09:fire_alarm_system_cable") === "1725"
    && rowQuantity(edited, "f09:fire_alarm_system_containment") === "1380"
    && rowQuantity(edited, "f09:fire_alarm_system_junction_box") === "58"
    && rowQuantity(edited, "f09:fire_alarm_system_cable_fastener") === "3450")) {
    throw new Error(`STOP_${stopCode}_EDITED_PROFILE_COMPOSITION`);
  }
  const actualRows = JSON.stringify(FIRE_ALARM_SYSTEM_EXPANDED_RESOURCES.map((row) => ({
    row_id: row.row_id, title_ru: row.title_ru, category: row.category,
  })));
  if (/розет|выключател|узо|молниезащит|распределительный щит|отоплен|канализац/iu
    .test(actualRows)) {
    throw new Error(`STOP_${stopCode}_GENERIC_OR_ADJACENT_SCOPE`);
  }
  return {
    status: `GREEN_${stopCode}_CORE`,
    catalogId: FIRE_ALARM_SYSTEM_EXPANDED_CATALOG_ID,
    automaticFirstEstimate: { rowCount: short.rows.length, preliminaryNeedCount: 0,
      quantities: short.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })) },
    editedProfile: { rowCount: edited.rows.length, preliminaryNeedCount: 0,
      quantities: edited.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })) },
    runtimeProfileParameters: Object.keys(FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE),
    allUnverifiedRatesClassifiedAsAssumptions: true,
    classificationFactorApplied: false,
    genericBuildingElectricalSubstituteRejected: true,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ short, edited })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-7.f09-fire-alarm-system-expanded-automatic-successor.v1",
  stopCode,
  applicationName: "s27-7-f09-fire-alarm-system-expanded-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (43).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "94ad8582e8e5c43aa4479d8e5c1db285f5220f6888cf2eae29c146b6202bcf66",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? requiredPointer(currentRelease.definitionReleaseId, "DEFINITION_RELEASE_ID"),
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? requiredPointer(currentRelease.searchReleaseId, "SEARCH_RELEASE_ID"),
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-7/f09-fire-current-lineage/fire-alarm-system-expanded-automatic-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/fireAlarmSystemExpandedR1.ts",
    "tests/estimateNorms/fireAlarmSystemExpandedR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireAlarmSystemExpandedSuccessor.ts",
  ],
  catalogId: FIRE_ALARM_SYSTEM_EXPANDED_CATALOG_ID,
  sourceId: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_ID,
  normId: FIRE_ALARM_SYSTEM_EXPANDED_NORM_ID,
  sourceMetadata: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA,
  parameterDefinitions: FIRE_ALARM_SYSTEM_EXPANDED_PARAMETERS,
  formulaDefinitions: FIRE_ALARM_SYSTEM_EXPANDED_FORMULAS,
  resourceDefinitions: FIRE_ALARM_SYSTEM_EXPANDED_RESOURCES,
  shortInput: FIRE_ALARM_SYSTEM_EXPANDED_SHORT_INPUT,
  acceptanceInput: FIRE_ALARM_SYSTEM_EXPANDED_ACCEPTANCE_INPUT,
  runtimeProfileInput: FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE,
  runtimeProfileClassification: FIRE_ALARM_SYSTEM_EXPANDED_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: FIRE_ALARM_SYSTEM_EXPANDED_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [58, 37, 37],
  benchmarkOrdinal: 0,
  validationScenario: "F09_COMPLETE_ADDRESSABLE_FIRE_ALARM_SYSTEM",
  passport: {
    canonicalRuName: "Полная адресная система пожарной сигнализации",
    workKey: "fire_alarm_system",
    physicalResultRu:
      "Полная адресная система пожарной сигнализации смонтирована, подключена, испытана, введена в эксплуатационную готовность и документирована",
    includedScopeRu: [
      "приёмно-контрольные приборы, извещатели, базы, оповещатели, изоляторы и интерфейсные модули",
      "резервированные источники питания и аккумуляторные батареи",
      "огнестойкие кабели, системы прокладки, коробки, крепёж, маркировка, оконцевание и заделка проходок",
      "монтаж устройств, приборов, кабелей, трасс и электрические присоединения",
      "измерительное оборудование, индивидуальные и системные испытания, адресация и пусконаладка",
      "протоколы, исполнительная документация, обучение персонала и обращение с отходами",
    ],
    excludedScopeRu: ["общая силовая электрика здания, розетки, выключатели и УЗО",
      "спринклерная система, пожарные гидранты, насосная станция и дымоудаление",
      "скрытый коэффициент варианта",
      "официальные универсальные нормы из предварительного профиля",
      "неподтверждённые цены"],
    independentCompletenessMap: fireAlarmSystemExpandedCompletenessMap(),
  },
  applicability: {
    country: "KG",
    operationClass: "COMPLETE_ADDRESSABLE_FIRE_ALARM_SYSTEM",
    catalogVariant: "COMPLETE_SYSTEM_SEARCH_IDENTITY",
    primaryMeasureParameterId: "protected_area_m2",
    knownScopeParameters: Object.keys(FIRE_ALARM_SYSTEM_EXPANDED_SHORT_INPUT),
    visibleEditablePreliminaryProfileParameters:
      Object.keys(FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE),
    officialTechnicalBoundarySource: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_ID,
    officialArtifactSha256: FIRE_ALARM_SYSTEM_EXPANDED_ARTIFACT_SHA256,
    preliminaryRatesClaimedAsOfficialNorms: false,
    automaticFirstEstimateClaimed: true,
    approvedProjectRequiredBeforeExecution: true,
    genericBuildingElectricalSubstituteRejected: true,
  },
  binding: {
    rowId: "f09:fire_alarm_system_area",
    applicability: {
      technology_class: "COMPLETE_ADDRESSABLE_FIRE_ALARM_SYSTEM",
      operation_class: "COMPLETE_ADDRESSABLE_FIRE_ALARM_SYSTEM",
      catalog_variant: "COMPLETE_SYSTEM_SEARCH_IDENTITY",
      scope_mode: "KNOWN_SCOPE_PLUS_VISIBLE_EDITABLE_PRELIMINARY_PROFILE",
      source_id: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_ID,
      norm_id: FIRE_ALARM_SYSTEM_EXPANDED_NORM_ID,
      exact_locator: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: FIRE_ALARM_SYSTEM_EXPANDED_ARTIFACT_SHA256,
      universal_classification_factor_claimed: false,
      quantity_basis:
        "AREA_TIMES_VISIBLE_PROFILE_RATES_WITH_CAPACITIES_AND_CEIL_FOR_DISCRETE_RESOURCES",
    },
  },
  locator: {
    key: "sp-kr-21-101-2024-complete-addressable-fire-alarm-system-v1",
    payload: {
      kind: "OFFICIAL_BOUNDARY_PLUS_VISIBLE_EDITABLE_COMPLETE_SYSTEM_PROFILE",
      catalogVariant: "COMPLETE_SYSTEM_SEARCH_IDENTITY",
      exactLocator: FIRE_ALARM_SYSTEM_EXPANDED_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: FIRE_ALARM_SYSTEM_EXPANDED_ARTIFACT_SHA256,
      knownScopeInputs: Object.keys(FIRE_ALARM_SYSTEM_EXPANDED_SHORT_INPUT),
      profileInputs: Object.keys(FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE),
      preliminaryRatesClaimedAsOfficialNorms: false,
      universalClassificationFactorClaimed: false,
      genericBuildingElectricalSubstituteRejected: true,
    },
  },
  search: {
    primaryUom: "m2",
    canonicalNameRu: "Полная адресная система пожарной сигнализации",
    aliases: ["монтаж системы пожарной сигнализации", "полная АПС",
      "автоматическая пожарная сигнализация", "complete addressable fire alarm system"],
    shortScopeRu:
      "Полная адресная пожарная сигнализация: приборы, извещатели, оповещение, питание, огнестойкие линии, крепёж, монтаж, испытания, ПНР, документы и отходы.",
    keyDistinguishingParameters: Object.keys(FIRE_ALARM_SYSTEM_EXPANDED_SHORT_INPUT),
    clarificationFields: Object.keys(FIRE_ALARM_SYSTEM_EXPANDED_PRELIMINARY_PROFILE),
    includedBoundaries: ["приборы, устройства и резервное питание",
      "огнестойкие кабельные линии, трассы, коробки, крепёж и проходки",
      "монтаж, подключения, испытания, ПНР, документы, обучение и отходы"],
    excludedBoundaries: ["общая силовая электрика здания, розетки, выключатели и УЗО",
      "спринклеры, гидранты, насосная станция и дымоудаление",
      "скрытый классификационный коэффициент и неподтверждённые цены"],
    extraSearchTermsRu:
      "пожарная сигнализация АПС адресная извещатель прибор оповещатель огнестойкий кабель шлейф ПНР",
    sourceProvenance: {
      officialSpKr211012024TechnicalBoundary: true,
      exactOfficialArtifactSha256: FIRE_ALARM_SYSTEM_EXPANDED_ARTIFACT_SHA256,
      visibleEditableCompleteSystemProfile: true,
      preliminaryRatesClaimedAsOfficialNorms: false,
      universalClassificationFactorRejected: true,
      genericBuildingElectricalSubstituteRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [/розет|выключател|узо|молниезащит|распределительный щит/iu,
    /отоплен|канализац|спринклер|гидрант|насосная станция|дымоудален/iu],
  owner: "S277_F09_FIRE_ALARM_SYSTEM_EXPANDED_SUCCESSOR",
  receiptFileStem: "01_S277_F09_FIRE_ALARM_SYSTEM_EXPANDED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
