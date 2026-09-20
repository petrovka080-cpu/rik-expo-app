import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  SPRINKLER_HEAD_CONNECTION_ACCEPTANCE_INPUT,
  SPRINKLER_HEAD_CONNECTION_CATALOG_ID,
  SPRINKLER_HEAD_CONNECTION_FORMULAS,
  SPRINKLER_HEAD_CONNECTION_NORM_ID,
  SPRINKLER_HEAD_CONNECTION_PARAMETERS,
  SPRINKLER_HEAD_CONNECTION_RESOURCES,
  SPRINKLER_HEAD_CONNECTION_SHORT_INPUT,
  SPRINKLER_HEAD_CONNECTION_SOURCE_ID,
  SPRINKLER_HEAD_CONNECTION_SOURCE_METADATA,
  compileSprinklerHeadConnectionR1,
} from "../../../src/lib/estimate/v4/sprinklerHeadConnectionR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileSprinklerHeadConnectionR1({
    ...SPRINKLER_HEAD_CONNECTION_SHORT_INPUT,
  });
  const complete = await compileSprinklerHeadConnectionR1({
    ...SPRINKLER_HEAD_CONNECTION_ACCEPTANCE_INPUT,
  });
  const conditional = await compileSprinklerHeadConnectionR1({
    ...SPRINKLER_HEAD_CONNECTION_ACCEPTANCE_INPUT,
    flexible_hose_mode: "REQUIRED",
    flexible_hose_designation: "Сертифицированная гибкая подводка по узлу",
    flexible_hose_quantity_piece: 40,
  });
  const shortNeeds = new Set(short.preliminaryNeeds.map((need) => need.row_id));
  if (!(short.rows.length === 3
    && short.rows.find((row) => row.row_id === "rc09:sprinkler_head_install")
      ?.quantity === "40"
    && short.rows.find((row) => row.row_id === "rc09:sprinkler_head_k80_68c")
      ?.quantity === "40"
    && short.rows.find((row) => row.row_id === "rc09:sprinkler_head_visual_record")
      ?.quantity === "40"
    && short.preliminaryNeeds.length === 6)) {
    throw new Error("STOP_MASTER_SPRINKLER_HEAD_CONNECTION_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:sprinkler_reducing_socket_half_inch", "rc09:approved_thread_seal_sprinkler",
    "rc09:sprinkler_decorative_escutcheon", "rc09:sprinkler_protective_cap",
    "rc09:manufacturer_sprinkler_wrench", "rc09:listed_flexible_sprinkler_hose",
  ]) {
    if (!shortNeeds.has(rowId)) throw new Error(`STOP_MASTER_SPRINKLER_SHORT_NEED:${rowId}`);
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 8
    && complete.rows.find((row) =>
      row.row_id === "rc09:approved_thread_seal_sprinkler")?.quantity === "32"
    && complete.rows.find((row) =>
      row.row_id === "rc09:manufacturer_sprinkler_wrench")?.quantity === "3.2")) {
    throw new Error("STOP_MASTER_SPRINKLER_HEAD_CONNECTION_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 9)) {
    throw new Error("STOP_MASTER_SPRINKLER_HEAD_CONNECTION_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/(sprinkler.pipe.network|fire.pump|alarm.valve.station|full.fire.suppression)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_SPRINKLER_HEAD_CONNECTION_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_MASTER_SPRINKLER_HEAD_CONNECTION_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownSprinklerCount: SPRINKLER_HEAD_CONNECTION_SHORT_INPUT.sprinkler_count,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-sprinkler-head-connection-successor.v1",
  stopCode: "MASTER_SPRINKLER_HEAD_CONNECTION",
  applicationName: "r4-a13-6-master-sprinkler-head-connection-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "5e98dc50-c1b4-5fc5-9676-0a9e575ade6a",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "1dc82fc9-040c-5250-be5c-486c9a737289",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-sprinkler-head-connection-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/sprinklerHeadConnectionR1.ts",
    "tests/estimateNorms/sprinklerHeadConnectionR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSprinklerHeadConnectionSuccessor.ts",
  ],
  catalogId: SPRINKLER_HEAD_CONNECTION_CATALOG_ID,
  sourceId: SPRINKLER_HEAD_CONNECTION_SOURCE_ID,
  normId: SPRINKLER_HEAD_CONNECTION_NORM_ID,
  sourceMetadata: SPRINKLER_HEAD_CONNECTION_SOURCE_METADATA,
  parameterDefinitions: SPRINKLER_HEAD_CONNECTION_PARAMETERS,
  formulaDefinitions: SPRINKLER_HEAD_CONNECTION_FORMULAS,
  resourceDefinitions: SPRINKLER_HEAD_CONNECTION_RESOURCES,
  shortInput: SPRINKLER_HEAD_CONNECTION_SHORT_INPUT,
  acceptanceInput: SPRINKLER_HEAD_CONNECTION_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [5, 58, 58],
  benchmarkOrdinal: 21,
  validationScenario: "MASTER_BENCHMARK_21_SPRINKLER_HEAD_CONNECTION",
  passport: {
    canonicalRuName: "Монтаж спринклерного оросителя и присоединение к трубопроводу",
    workKey: "sprinkler_head_connection",
    physicalResultRu: "Сертифицированные оросители K80, 68 °C, резьба 1/2 дюйма смонтированы и присоединены в указанном количестве с визуальным контролем каждого оросителя",
    includedScopeRu: [
      "монтаж и присоединение указанного количества оросителей",
      "сами сертифицированные оросители известной маркировки",
      "муфты и резьбовое уплотнение только по узлу и инструкции изготовителя",
      "декоративные розетки и защитные колпачки только по ведомости и паспорту",
      "специальный ключ по монтажной карте и поштучная запись визуального контроля",
      "гибкая подводка только по условному проектному узлу",
    ],
    excludedScopeRu: [
      "спринклерная трубная сеть",
      "пожарный насос и узел управления",
      "полная система пожаротушения",
      "исторические коэффициенты уплотнения и времени инструмента",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_CONNECT_SPRINKLER_HEAD",
    materialSystem: "SPRINKLER_HEAD_K80_68C_HALF_INCH",
    primaryMeasureParameterId: "sprinkler_count",
    geometryParameters: ["sprinkler_count"],
    knownScopeParameters: ["k_factor", "temperature_rating_c", "thread_size_inch"],
    projectScheduleRequiredForNonHeadQuantities: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    fullFireSuppressionSystemExcluded: true,
  },
  binding: {
    rowId: "rc09:sprinkler_head_install",
    applicability: {
      technology_class: "SPRINKLER_HEAD_CONNECTION",
      operation_class: "INSTALL_CONNECT_SPRINKLER_HEAD",
      material_system: "SPRINKLER_HEAD_K80_68C_HALF_INCH",
      scope_mode: "KNOWN_HEAD_COUNT_AND_MARKING_PLUS_DIRECT_CONNECTION_METHOD_QA_QUANTITIES",
      source_id: SPRINKLER_HEAD_CONNECTION_SOURCE_ID,
      norm_id: SPRINKLER_HEAD_CONNECTION_NORM_ID,
      exact_locator: SPRINKLER_HEAD_CONNECTION_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_consumption_or_productivity_rates_claimed: false,
      quantity_basis: "KNOWN_HEAD_COUNT_MARKING_PLUS_APPROVED_SCHEDULE_CONNECTION_METHOD_AND_QA",
    },
  },
  locator: {
    key: "sprinkler-head-connection-project-package-required-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: SPRINKLER_HEAD_CONNECTION_SOURCE_METADATA.exact_locator,
      geometryInputs: ["sprinkler_count"],
      knownScopeInputs: ["k_factor", "temperature_rating_c", "thread_size_inch"],
      directProjectInputs: [
        "reducing_socket_designation", "reducing_socket_quantity_piece",
        "thread_seal_designation", "thread_seal_length_m", "escutcheon_designation",
        "escutcheon_quantity_piece", "protective_cap_designation",
        "protective_cap_quantity_piece", "manufacturer_wrench_designation",
        "manufacturer_wrench_machine_h",
      ],
      conditionalInputs: [
        "flexible_hose_mode", "flexible_hose_designation", "flexible_hose_quantity_piece",
      ],
    },
  },
  search: {
    primaryUom: "pcs",
    canonicalNameRu: "Монтаж спринклерного оросителя и присоединение к трубопроводу",
    aliases: [
      "монтаж спринклерного оросителя K80 68 градусов",
      "установка пожарного спринклера резьба 1/2",
      "присоединение оросителя к трубопроводу",
      "sprinkler head installation connection",
    ],
    shortScopeRu: "Монтаж сорока оросителей K80, 68 °C, резьба 1/2 дюйма; количество сразу даёт работу, оросители и визуальный контроль, а соединительные детали и инструмент уточняются добровольно по проекту и паспорту.",
    keyDistinguishingParameters: [
      "sprinkler_count", "k_factor", "temperature_rating_c", "thread_size_inch",
    ],
    clarificationFields: [
      "reducing_socket_designation", "reducing_socket_quantity_piece",
      "thread_seal_designation", "thread_seal_length_m", "escutcheon_designation",
      "escutcheon_quantity_piece", "protective_cap_designation",
      "protective_cap_quantity_piece", "manufacturer_wrench_designation",
      "manufacturer_wrench_machine_h", "flexible_hose_mode",
    ],
    includedBoundaries: [
      "монтаж, оросители и поштучный визуальный контроль",
      "узловое соединение и уплотнение по проекту",
      "розетки и защитные колпачки по ведомости и паспорту",
      "специальный ключ по монтажной карте; гибкая подводка условно",
    ],
    excludedBoundaries: [
      "спринклерная трубная сеть", "пожарный насос", "узел управления",
      "полная система пожаротушения", "неподтверждённые цены",
    ],
    extraSearchTermsRu: "спринклер ороситель K80 68 резьба 1/2 муфта уплотнительная нить розетка колпачок специальный ключ визуальный контроль гибкая подводка",
    sourceProvenance: {
      exactAtomicSprinklerHeadOwner: true,
      exactScheduleConnectionMethodQaPackageRequiredForNonHeadQuantities: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /sprinkler_pipe_network|спринклерн.*трубн.*сет/iu,
    /fire_pump|пожарн.*насос/iu,
    /alarm_valve_station|узел.*управлен/iu,
    /full_fire_suppression_system|полн.*систем.*пожаротуш/iu,
  ],
  owner: "MASTER_SPRINKLER_HEAD_CONNECTION_SUCCESSOR",
  receiptFileStem: "MASTER_SPRINKLER_HEAD_CONNECTION",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
