import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT,
  FIRE_FIGHTING_PUMP_STATION_CATALOG_ID,
  FIRE_FIGHTING_PUMP_STATION_FORMULAS,
  FIRE_FIGHTING_PUMP_STATION_INDEPENDENT_COMPLETENESS_MAP,
  FIRE_FIGHTING_PUMP_STATION_NORM_ID,
  FIRE_FIGHTING_PUMP_STATION_PARAMETERS,
  FIRE_FIGHTING_PUMP_STATION_RESOURCES,
  FIRE_FIGHTING_PUMP_STATION_SHORT_INPUT,
  FIRE_FIGHTING_PUMP_STATION_SOURCE_ID,
  FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA,
  compileFireFightingPumpStationR1,
} from "../../../src/lib/estimate/v4/fireFightingPumpStationR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileFireFightingPumpStationR1({
    ...FIRE_FIGHTING_PUMP_STATION_SHORT_INPUT,
  });
  const complete = await compileFireFightingPumpStationR1({
    ...FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT,
  });
  const diesel = await compileFireFightingPumpStationR1({
    ...FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT,
    diesel_interface_mode: "REQUIRED",
    diesel_interface_designation: "Комплект интерфейсов дизельного насоса по проекту",
    diesel_interface_set_count: 1,
  });
  if (!(short.rows.length === 1
    && short.rows[0]?.row_id === "f09:fire_pump_station_scope_review"
    && short.preliminaryNeeds.length === 32)) {
    throw new Error("STOP_S273_F09_FIRE_PUMP_STATION_SHORT_COMPOSITION");
  }
  if (!(complete.rows.length === 31 && complete.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S273_F09_FIRE_PUMP_STATION_COMPLETE_FIXTURE");
  }
  if (!(diesel.rows.length === 33 && diesel.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S273_F09_FIRE_PUMP_STATION_DIESEL_FIXTURE");
  }
  const actualRows = JSON.stringify(FIRE_FIGHTING_PUMP_STATION_RESOURCES.map((row) => ({
    row_id: row.row_id,
    title_ru: row.title_ru,
    formula_id: row.formula_id,
  })));
  if (/отоплен|воздуховод|вентилятор|радиатор|кот[её]л|heating|boiler/iu.test(actualRows)) {
    throw new Error("STOP_S273_F09_FIRE_PUMP_STATION_CROSS_SYSTEM_SCOPE");
  }
  const serialized = JSON.stringify({ short, complete, diesel });
  return {
    status: "GREEN_S273_F09_FIRE_PUMP_STATION_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      visibleRowIds: short.rows.map((row) => row.row_id),
    },
    complete: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
      includedComponentCount: FIRE_FIGHTING_PUMP_STATION_RESOURCES.filter((row) =>
        row.resource_graph.costTreatment === "INCLUDED_IN_RESOURCE_ROWS").length,
      controlDocumentCount: FIRE_FIGHTING_PUMP_STATION_RESOURCES.filter((row) =>
        row.resource_graph.costTreatment === "CONTROL_OR_DOCUMENT").length,
    },
    diesel: { rowCount: diesel.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-3.f09-fire-fighting-pump-station-successor.v1",
  stopCode: "S273_F09_FIRE_FIGHTING_PUMP_STATION",
  applicationName: "s27-3-f09-fire-fighting-pump-station-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (39).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "1f683fef61d8b968c752163d6e361c45e5e6751e461c8be2b723761eac952f9a",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "fca762b5-9ee5-55dc-894d-7d3c00700cf9",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "4b3d55b3-746b-5d3d-946d-a9f2bc4bcf2f",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-3/f09-fire-current-lineage/fire-fighting-pump-station-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/fireFightingPumpStationR1.ts",
    "tests/estimateNorms/fireFightingPumpStationR1.contract.test.ts",
    "scripts/estimate/r4a13/auditS273F09FireOfficialSourceReuse.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareFireFightingPumpStationSuccessor.ts",
  ],
  catalogId: FIRE_FIGHTING_PUMP_STATION_CATALOG_ID,
  sourceId: FIRE_FIGHTING_PUMP_STATION_SOURCE_ID,
  normId: FIRE_FIGHTING_PUMP_STATION_NORM_ID,
  sourceMetadata: FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA,
  parameterDefinitions: FIRE_FIGHTING_PUMP_STATION_PARAMETERS,
  formulaDefinitions: FIRE_FIGHTING_PUMP_STATION_FORMULAS,
  resourceDefinitions: FIRE_FIGHTING_PUMP_STATION_RESOURCES,
  shortInput: FIRE_FIGHTING_PUMP_STATION_SHORT_INPUT,
  acceptanceInput: FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [34, 21, 33],
  benchmarkOrdinal: 0,
  validationScenario: "F09_FIRE_FIGHTING_PUMP_STATION",
  passport: {
    canonicalRuName: "Монтаж и пусконаладка пожарной насосной станции",
    workKey: "fire_fighting_pump_station",
    physicalResultRu:
      "Оборудование и трубопроводы пожарной насосной станции смонтированы, настроены и испытаны по утверждённому гидравлическому расчёту и проекту",
    includedScopeRu: [
      "рабочие и резервные пожарные насосы, поддерживающий насос и шкафы управления",
      "всасывающий и напорный коллекторы, арматура, приборы давления и испытательное устройство",
      "наружные соединения для пожарной техники, виброизоляция и анкеровка",
      "условные интерфейсы дизельного привода только по явному выбору проекта",
      "монтаж, центровка, пусконаладка и испытания внутри прямой трудоёмкости без двойного счёта",
      "протоколы и исполнительная документация",
    ],
    excludedScopeRu: [
      "отопление, вентиляция и дренаж помещения насосной",
      "резервуар пожарной воды и система его подпитки",
      "строительные фундаменты и конструкция здания насосной",
      "вводные электрофидеры и общезданийное аварийное питание",
      "универсальные длины, количества, производительность, труд и цены",
    ],
    independentCompletenessMap: FIRE_FIGHTING_PUMP_STATION_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_AND_COMMISSION_FIRE_FIGHTING_PUMP_STATION",
    primaryMeasureParameterId: "station_count",
    geometryParameters: ["station_count"],
    officialTechnicalBoundarySource: FIRE_FIGHTING_PUMP_STATION_SOURCE_ID,
    minimumFirePumpCountIncludingStandby: 2,
    minimumFireBrigadeConnections: 2,
    approvedHydraulicCalculationRequired: true,
    approvedProjectSpecificationRequired: true,
    approvedMethodStatementRequired: true,
    approvedCommissioningProgramRequired: true,
    conditionalDieselScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    adjacentHvacWaterCivilElectricalOwnershipPreserved: true,
  },
  binding: {
    rowId: "f09:fire_pump_station_scope_review",
    applicability: {
      technology_class: "FIRE_FIGHTING_PUMP_STATION",
      operation_class: "INSTALL_AND_COMMISSION_FIRE_FIGHTING_PUMP_STATION",
      scope_mode: "DIRECT_APPROVED_HYDRAULIC_CALCULATION_PROJECT_METHOD_AND_TEST_INPUTS",
      source_id: FIRE_FIGHTING_PUMP_STATION_SOURCE_ID,
      norm_id: FIRE_FIGHTING_PUMP_STATION_NORM_ID,
      exact_locator: FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA.exact_locator,
      official_artifact_sha256: FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA.artifact_sha256,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      quantity_basis: "DIRECT_APPROVED_PROJECT_INPUT_WITH_EXPLICIT_NORMATIVE_MINIMA",
    },
  },
  locator: {
    key: "sp-kr-21-101-2024-fire-pump-station-project-inputs-v1",
    payload: {
      kind: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_PROJECT_INPUTS_REQUIRED",
      exactLocator: FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA.exact_locator,
      officialArtifactSha256: FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: ["station_count"],
      directProjectInputs: FIRE_FIGHTING_PUMP_STATION_PARAMETERS
        .map((parameter) => parameter.parameter_id)
        .filter((parameterId) => parameterId !== "station_count"),
      conditionalInputs: [
        "diesel_interface_mode",
        "diesel_interface_designation",
        "diesel_interface_set_count",
      ],
      universalProductivityClaimed: false,
      universalConsumptionClaimed: false,
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Монтаж и пусконаладка пожарной насосной станции",
    aliases: [
      "пожарная насосная станция",
      "монтаж пожарных насосов",
      "насосная автоматического пожаротушения",
      "fire fighting pump station installation commissioning",
    ],
    shortScopeRu:
      "Оборудование, внутренние коллекторы, управление, монтаж и испытания пожарной насосной станции по гидравлическому расчёту и проекту без подстановки отопления или вентиляции.",
    keyDistinguishingParameters: ["station_count", "fire_pump_count"],
    clarificationFields: [
      "fire_pump_count",
      "jockey_pump_count",
      "pump_controller_count",
      "suction_manifold_length_m",
      "discharge_manifold_length_m",
      "station_valve_count",
      "diesel_interface_mode",
      "installation_commissioning_labor_man_hour",
      "flow_performance_test_count",
    ],
    includedBoundaries: [
      "насосы, управление, коллекторы, арматура и измерительные устройства",
      "наружные соединения, виброизоляция и анкеровка",
      "монтаж, центровка, автоматический запуск и испытания",
      "протоколы и исполнительная документация",
    ],
    excludedBoundaries: [
      "отопление, вентиляция и дренаж помещения",
      "резервуары, подпитка и строительные фундаменты",
      "внешние электрофидеры и общезданийное аварийное питание",
      "неподтверждённые нормы и цены",
    ],
    extraSearchTermsRu:
      "пожарная насосная пожарный насос резервный насос жокей насос коллектор задвижка расходомер испытание автоматический запуск ПНР",
    sourceProvenance: {
      officialSpKr211012024PumpStationBoundary: true,
      exactOfficialArtifactSha256: FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA.artifact_sha256,
      directApprovedProjectInputsRequired: true,
      explicitNormativeMinimaValidated: true,
      hvacSubstitutionRejected: true,
      universalRatesRejected: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /отоплен|воздуховод|вентилятор|радиатор|кот[её]л|heating|boiler/iu,
    /канализац|sewer/iu,
    /спринклер.*(?:монтаж|поставка)|sprinkler.*(?:install|product)/iu,
  ],
  owner: "S273_F09_FIRE_FIGHTING_PUMP_STATION_SUCCESSOR",
  receiptFileStem: "S273_F09_FIRE_FIGHTING_PUMP_STATION",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
