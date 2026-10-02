import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  FIRE_ALARM_ELECTRICAL_CONNECTION_ACCEPTANCE_INPUT,
  FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
  FIRE_ALARM_ELECTRICAL_CONNECTION_FORMULAS,
  FIRE_ALARM_ELECTRICAL_CONNECTION_NORM_ID,
  FIRE_ALARM_ELECTRICAL_CONNECTION_PARAMETERS,
  FIRE_ALARM_ELECTRICAL_CONNECTION_RESOURCES,
  FIRE_ALARM_ELECTRICAL_CONNECTION_SHORT_INPUT,
  FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_ID,
  FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA,
  compileFireAlarmElectricalConnectionVariantR1,
  fireAlarmElectricalConnectionCompletenessMap,
  resolveFireAlarmElectricalConnectionVariant,
  type FireAlarmElectricalConnectionVariantKey,
} from "../../../src/lib/estimate/v4/fireAlarmElectricalConnectionVariantsR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const variantKey = String(
  process.env.S273_F09_CONNECTION_VARIANT ?? "high_load",
) as FireAlarmElectricalConnectionVariantKey;
const variant = resolveFireAlarmElectricalConnectionVariant(variantKey);
const variantToken = variantKey.toUpperCase();
const stopCode = `S273_F09_FIRE_ALARM_ELECTRICAL_CONNECTION_${variantToken}`;
const outputStem = variantKey.replace(/_/gu, "-");

async function verifyCore(): Promise<Json> {
  const short = await compileFireAlarmElectricalConnectionVariantR1(variantKey, {
    ...FIRE_ALARM_ELECTRICAL_CONNECTION_SHORT_INPUT,
  });
  const complete = await compileFireAlarmElectricalConnectionVariantR1(variantKey, {
    ...FIRE_ALARM_ELECTRICAL_CONNECTION_ACCEPTANCE_INPUT,
  });
  const soldered = await compileFireAlarmElectricalConnectionVariantR1(variantKey, {
    connection_end_count: 100,
    connection_method: "SOLDERED",
  });
  if (!(short.rows.length === 3 && short.preliminaryNeeds.length === 11)) {
    throw new Error(`STOP_${stopCode}_SHORT_COMPOSITION`);
  }
  if (!(complete.rows.length === 7
    && complete.preliminaryNeeds.length === 0
    && complete.rows.find((row) =>
      row.row_id === "f09:fire_alarm_connection_labor_screw_with_lug")?.quantity === "11.3")) {
    throw new Error(`STOP_${stopCode}_COMPLETE_FIXTURE`);
  }
  if (!(soldered.rows.length === 8
    && soldered.preliminaryNeeds.length === 0
    && soldered.rows.find((row) =>
      row.row_id === "f09:fire_alarm_connection_lacquer_soldered")?.quantity === "0.00003")) {
    throw new Error(`STOP_${stopCode}_SOLDERED_FIXTURE`);
  }
  const actualRows = JSON.stringify(FIRE_ALARM_ELECTRICAL_CONNECTION_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    formula_id: row.formula_id,
  })));
  if (/cable_supply|device_install|system_commission|boiler|radiator|heating/iu
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
    },
    complete: {
      method: FIRE_ALARM_ELECTRICAL_CONNECTION_ACCEPTANCE_INPUT.connection_method,
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
      quantities: complete.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    soldered: {
      rowCount: soldered.rows.length,
      preliminaryNeedCount: soldered.preliminaryNeeds.length,
      quantities: soldered.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })),
    },
    classificationFactorApplied: false,
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ variantKey, short, complete, soldered }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: `rik-expo-app.s27-3.f09-fire-alarm-electrical-connection-${outputStem}-successor.v1`,
  stopCode,
  applicationName: `s27-3-f09-fire-alarm-electrical-connection-${outputStem}-successor`,
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "d2761d25-b3de-57bb-bf7f-444c4a9f5344",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "2af881e0-8e22-5195-b269-0f9ed1d63876",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? `.release-runtime/r568/s27-3/f09-fire-current-lineage/`
      + `fire-alarm-electrical-connection-${outputStem}-successor-v1`),
  sourcePaths: [
    "src/lib/estimate/v4/fireAlarmElectricalConnectionVariantsR1.ts",
    "tests/estimateNorms/fireAlarmElectricalConnectionVariantsR1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireAlarmElectricalConnectionVariantSuccessor.ts",
  ],
  catalogId: variant.catalogId,
  sourceId: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_ID,
  normId: FIRE_ALARM_ELECTRICAL_CONNECTION_NORM_ID,
  sourceMetadata: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA,
  parameterDefinitions: FIRE_ALARM_ELECTRICAL_CONNECTION_PARAMETERS,
  formulaDefinitions: FIRE_ALARM_ELECTRICAL_CONNECTION_FORMULAS,
  resourceDefinitions: FIRE_ALARM_ELECTRICAL_CONNECTION_RESOURCES,
  shortInput: FIRE_ALARM_ELECTRICAL_CONNECTION_SHORT_INPUT,
  acceptanceInput: FIRE_ALARM_ELECTRICAL_CONNECTION_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 0,
  validationScenario: `F09_FIRE_ALARM_ELECTRICAL_CONNECTION_${variantToken}`,
  passport: {
    canonicalRuName: variant.canonicalNameRu,
    workKey: `electrical_interior_fire_alarm_connect_${variantKey}`,
    physicalResultRu:
      "Подтверждённое количество концов электрических проводок присоединено к приборам или клеммам выбранным проектом способом",
    includedScopeRu: [
      "присоединение подтверждённого количества концов проводок под винт или пайкой",
      "прокладка по панели щита от ввода до клеммника или прибора в пределах состава КРЕРм 11-08-001",
      "опубликованные трудозатраты и нормативные материалы выбранного варианта таблицы",
    ],
    excludedScopeRu: [
      "поставка и прокладка кабеля по трассе",
      "поставка и монтаж извещателей, приборов и блоков питания",
      "системная пусконаладка, сценарии и итоговые протоколы",
      "скрытый коэффициент из суффикса нагрузки, площади или помещения",
      "рыночные цены",
    ],
    independentCompletenessMap:
      fireAlarmElectricalConnectionCompletenessMap(variantKey),
  },
  applicability: {
    country: "KG",
    operationClass: "CONNECT_FIRE_ALARM_ELECTRICAL_WIRING_ENDS",
    catalogVariant: variant.catalogVariant,
    primaryMeasureParameterId: "connection_end_count",
    geometryParameters: ["connection_end_count"],
    methodParameterId: "connection_method",
    officialRateSource: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_ID,
    officialArtifactSha256: FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
    officialTable: "KRERM_11_08_001",
    publishedMeasure: "100_CONNECTION_ENDS",
    universalClassificationFactorClaimed: false,
    cableRouteInstallationExcluded: true,
    deviceInstallationExcluded: true,
    systemCommissioningExcluded: true,
    marketPriceClaimed: false,
  },
  binding: {
    rowId: "f09:fire_alarm_connection_labor_screw_with_lug",
    applicability: {
      technology_class: "FIRE_ALARM_ELECTRICAL_WIRING_CONNECTION",
      operation_class: "CONNECT_FIRE_ALARM_ELECTRICAL_WIRING_ENDS",
      catalog_variant: variant.catalogVariant,
      source_id: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_ID,
      norm_id: FIRE_ALARM_ELECTRICAL_CONNECTION_NORM_ID,
      exact_locator: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
      quantity_basis: "PUBLISHED_RATE_PER_100_CONFIRMED_CONNECTION_ENDS",
      universal_classification_factor_claimed: false,
      adjacent_scope_excluded: true,
    },
  },
  locator: {
    key: `krerm-11-08-001-fire-alarm-electrical-connection-${outputStem}-v1`,
    payload: {
      kind: "OFFICIAL_RESOURCE_RATE_TABLE",
      catalogVariant: variant.catalogVariant,
      table: "KRERM_11_08_001",
      pdfPage: 45,
      measure: "100_CONNECTION_ENDS",
      exactLocator: FIRE_ALARM_ELECTRICAL_CONNECTION_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
      projectInputs: ["connection_end_count", "connection_method"],
      universalClassificationFactorClaimed: false,
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: variant.canonicalNameRu,
    aliases: [
      `присоединение концов проводок АПС ${variantKey}`,
      `подключение жил пожарной сигнализации ${variantKey}`,
      `fire alarm electrical wire connection ${outputStem}`,
    ],
    shortScopeRu:
      "Присоединение подтверждённого числа концов электрических проводок к приборам или клеммам выбранным способом по КРЕРм 11-08-001; без прокладки кабеля, монтажа приборов и системной ПНР.",
    keyDistinguishingParameters: ["connection_end_count", "connection_method"],
    clarificationFields: ["connection_method"],
    includedBoundaries: [
      "подключение концов проводок под винт с наконечником",
      "подключение под винт с кольцом или обслуживанием без кольца",
      "подключение пайкой",
      "труд и нормативные материалы опубликованной колонки таблицы",
    ],
    excludedBoundaries: [
      "поставка и прокладка кабеля",
      "поставка и монтаж приборов пожарной сигнализации",
      "системная пусконаладка и испытания сценариев",
      "скрытый коэффициент классификационного суффикса",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu:
      `АПС подключение присоединение конец провод жила клемма наконечник кольцо пайка КРЕРм 11-08-001 ${variantKey}`,
    sourceProvenance: {
      officialKrerm112015Table1108001: true,
      exactOfficialArtifactSha256: FIRE_ALARM_ELECTRICAL_CONNECTION_ARTIFACT_SHA256,
      publishedRatesPer100Ends: true,
      directApprovedProjectInputsRequired: true,
      universalClassificationFactorRejected: true,
      marketPriceClaimed: false,
    },
  },
  forbiddenAdjacentMatchers: [
    /cable_supply|кабель.*постав/iu,
    /cable_route_install|прокладк.*кабел/iu,
    /device_install|монтаж.*извещател/iu,
    /system_commission|пусконаладк.*систем/iu,
    /boiler|radiator|heating|кот[её]л|радиатор|отоплен/iu,
  ],
  owner: `${stopCode}_SUCCESSOR`,
  receiptFileStem: stopCode,
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
