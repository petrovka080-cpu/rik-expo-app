import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  FIRE_ALARM_CABLE_LAYING_ACCEPTANCE_INPUT,
  FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
  FIRE_ALARM_CABLE_LAYING_FORMULAS,
  FIRE_ALARM_CABLE_LAYING_NORM_ID,
  FIRE_ALARM_CABLE_LAYING_PARAMETERS,
  FIRE_ALARM_CABLE_LAYING_RESOURCES,
  FIRE_ALARM_CABLE_LAYING_SHORT_INPUT,
  FIRE_ALARM_CABLE_LAYING_SOURCE_ID,
  FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA,
  compileFireAlarmCableLayingVariantR1,
  fireAlarmCableLayingCompletenessMap,
  resolveFireAlarmCableLayingVariant,
  type FireAlarmCableLayingVariantKey,
} from "../../../src/lib/estimate/v4/fireAlarmCableLayingVariantsR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantKey = String(
  process.env.S273_F09_CABLE_LAYING_VARIANT ?? "high_load",
) as FireAlarmCableLayingVariantKey;
const variant = resolveFireAlarmCableLayingVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const stopCode = `S273_F09_FIRE_ALARM_CABLE_LAYING_${variantToken}`;
const outputStem = variantKey.replace(/_/gu, "-");

async function verifyCore(): Promise<Json> {
  const short = await compileFireAlarmCableLayingVariantR1(variantKey, {
    ...FIRE_ALARM_CABLE_LAYING_SHORT_INPUT,
  });
  const complete = await compileFireAlarmCableLayingVariantR1(variantKey, {
    ...FIRE_ALARM_CABLE_LAYING_ACCEPTANCE_INPUT,
  });
  const noOptionalBranches = await compileFireAlarmCableLayingVariantR1(variantKey, {
    ...FIRE_ALARM_CABLE_LAYING_SHORT_INPUT,
    fastener_designation: "Крепление по проекту",
    fastener_quantity_piece: 200,
    integrity_test_count: 1,
    labeling_mode: "NOT_REQUIRED",
    junction_box_mode: "NOT_REQUIRED",
    emi_protection_mode: "NOT_REQUIRED",
  });
  if (!(short.rows.length === 2
    && short.rows.every((row) => row.quantity === "120")
    && short.preliminaryNeeds.length === 6)) {
    throw new Error(`STOP_${stopCode}_SHORT_COMPOSITION`);
  }
  if (!(complete.rows.length === 8
    && complete.preliminaryNeeds.length === 0
    && complete.rows.find((row) =>
      row.row_id === "f09:fire_alarm_line_metallic_protection")?.quantity === "15")) {
    throw new Error(`STOP_${stopCode}_COMPLETE_FIXTURE`);
  }
  if (!(noOptionalBranches.rows.length === 4
    && noOptionalBranches.preliminaryNeeds.length === 0)) {
    throw new Error(`STOP_${stopCode}_OPTIONAL_BRANCHES`);
  }
  const actualRows = JSON.stringify(FIRE_ALARM_CABLE_LAYING_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    formula_id: row.formula_id,
  })));
  if (/connection_end|addressable_smoke_detector|control_panel|system_commission|boiler|radiator|heating/iu
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
      rows: short.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
      rows: complete.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    noOptionalBranches: {
      rowCount: noOptionalBranches.rows.length,
      preliminaryNeedCount: noOptionalBranches.preliminaryNeeds.length,
    },
    hiddenReserveApplied: false,
    classificationFactorApplied: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, complete, noOptionalBranches }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-fire-alarm-cable-laying-${outputStem}-successor.v1`,
  stopCode,
  applicationName: `s27-3-f09-fire-alarm-cable-laying-${outputStem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "d4360c55-8403-5334-ae48-c00d170aae4e",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "758fde4c-1bc8-53fd-8ced-1529e97289a6",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-fire-current-lineage/`
      + `fire-alarm-cable-laying-${outputStem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/fireAlarmCableLayingVariantsR1.ts",
    "tests/estimateNorms/fireAlarmCableLayingVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireAlarmCableLayingVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: FIRE_ALARM_CABLE_LAYING_SOURCE_ID,
  normId: FIRE_ALARM_CABLE_LAYING_NORM_ID,
  sourceMetadata: FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA,
  parameterDefinitions: FIRE_ALARM_CABLE_LAYING_PARAMETERS,
  formulaDefinitions: FIRE_ALARM_CABLE_LAYING_FORMULAS,
  resourceDefinitions: FIRE_ALARM_CABLE_LAYING_RESOURCES,
  shortInput: FIRE_ALARM_CABLE_LAYING_SHORT_INPUT,
  acceptanceInput: FIRE_ALARM_CABLE_LAYING_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [19, 8, 8],
  benchmarkOrdinal: 0,
  validationScenario: `F09_FIRE_ALARM_CABLE_LAYING_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `electrical_interior_fire_alarm_lay_${variantKey}`,
    physicalResultRu:
      "Линия пожарной сигнализации проложена по подтверждённому маршруту выбранным проектом способом с проектными креплениями и применимыми средствами защиты",
    includedScopeRu: [
      "прокладка по подтверждённой чистой длине маршрута",
      "чистая длина выбранного проектом кабеля без скрытого запаса",
      "крепление и контроль целостности по прямым проектным количествам",
      "маркировка, коробки и металлическая защита только по условным проектным ветвям",
      "заземление экранирующих элементов при выбранной металлической защите",
    ],
    excludedScopeRu: [
      "универсальный запас кабеля, шаг крепежа или число коробок",
      "подключение концов кабеля к приборам или клеммам",
      "поставка и монтаж извещателей, приборов и блоков питания",
      "системная пусконаладка и испытания сценариев",
      "коэффициент количества или трудоёмкости из классификационного суффикса",
      "неподтверждённые нормы труда и цены",
    ],
    independentCompletenessMap: fireAlarmCableLayingCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass: "LAY_FIRE_ALARM_CABLE_LINE",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "route_length_m",
    geometryParameters: ["route_length_m"],
    technicalSelectionParameters: [
      "cable_designation",
      "conductor_material",
      "conductor_diameter_mm",
      "line_class",
      "routing_method",
    ],
    directProjectParameters: [
      "fastener_quantity_piece",
      "integrity_test_count",
      "label_quantity_piece",
      "junction_box_quantity_piece",
      "metallic_protection_length_m",
      "grounding_connection_count",
    ],
    officialTechnicalBoundarySource: FIRE_ALARM_CABLE_LAYING_SOURCE_ID,
    officialArtifactSha256: FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
    universalClassificationFactorClaimed: false,
    universalWasteFactorClaimed: false,
    universalProductivityClaimed: false,
    electricalConnectionExcluded: true,
    deviceInstallationExcluded: true,
    systemCommissioningExcluded: true,
  },
  binding: {
    rowId: "f09:fire_alarm_line_laying",
    applicability: {
      technology_class: "FIRE_ALARM_CABLE_LINE",
      operation_class: "LAY_FIRE_ALARM_CABLE_LINE",
      catalog_variant: variant.catalogVariant,
      source_id: FIRE_ALARM_CABLE_LAYING_SOURCE_ID,
      norm_id: FIRE_ALARM_CABLE_LAYING_NORM_ID,
      exact_locator: FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
      quantity_basis: "CONFIRMED_ROUTE_LENGTH_AND_DIRECT_APPROVED_PROJECT_INPUTS",
      universal_classification_factor_claimed: false,
      universal_waste_factor_claimed: false,
      adjacent_scope_excluded: true,
    },
  },
  locator: {
    key: `sp-kr-21-101-2024-fire-alarm-cable-laying-${outputStem}-v1`,
    payload: {
      kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_PROJECT_INPUTS_REQUIRED",
      catalogVariant: variant.catalogVariant,
      clauses: ["12.57", "12.58", "12.59", "12.64", "12.66", "12.69", "12.70", "12.71", "12.72"],
      printedPages: [60, 61, 62],
      pdfPages: [168, 169, 170],
      exactLocator: FIRE_ALARM_CABLE_LAYING_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
      routeQuantityRule: "ONE_TO_ONE_CONFIRMED_ROUTE_LENGTH_NO_HIDDEN_RESERVE",
      directProjectInputsRequired: true,
      universalClassificationFactorClaimed: false,
      universalWasteFactorClaimed: false,
      universalProductivityClaimed: false,
    },
  },
  search: {
    primaryUom: "m",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `прокладка кабеля пожарной сигнализации ${variantKey}`,
      `прокладка шлейфа АПС ${variantKey}`,
      `fire alarm cable line laying ${outputStem}`,
    ],
    shortScopeRu:
      "Прокладка выбранной проектом линии пожарной сигнализации по подтверждённой длине маршрута; кабель учитывается без скрытого запаса, остальные количества — только по проекту.",
    keyDistinguishingParameters: [
      "route_length_m",
      "cable_designation",
      "line_class",
      "routing_method",
    ],
    clarificationFields: [
      "fastener_quantity_piece",
      "integrity_test_count",
      "labeling_mode",
      "junction_box_mode",
      "emi_protection_mode",
    ],
    includedBoundaries: [
      "прокладка линии по длине маршрута",
      "чистая длина проектного кабеля",
      "крепления и проверка целостности по проекту",
      "условные маркеры, коробки и защита от наводок",
    ],
    excludedBoundaries: [
      "автоматический запас кабеля и шаг крепежа",
      "подключение концов",
      "монтаж приборов и извещателей",
      "системная пусконаладка",
      "скрытый коэффициент классификационного суффикса",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `АПС пожарная сигнализация кабель шлейф линия маршрут прокладка медная жила коробка защита наводки ${variantKey}`,
    sourceProvenance: {
      officialSpKr211012024Clauses1257To1272: true,
      exactOfficialArtifactSha256: FIRE_ALARM_CABLE_LAYING_ARTIFACT_SHA256,
      oneToOneConfirmedRouteLength: true,
      directApprovedProjectInputsRequired: true,
      universalClassificationFactorRejected: true,
      universalWasteFactorRejected: true,
      universalRatesRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /connection_end|присоединен.*конц/iu,
    /addressable_smoke_detector|монтаж.*извещател/iu,
    /control_panel|поставка.*при[её]мно-контрол/iu,
    /system_commission|системн.*пусконалад/iu,
    /boiler|radiator|heating|кот[её]л|радиатор|отоплен/iu,
  ],
  owner: `${stopCode}_SUCCESSOR`,
  receiptFileStem: stopCode,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
