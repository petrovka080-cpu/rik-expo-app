import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  SPLIT_SYSTEM_BLOCKS_ACCEPTANCE_INPUT,
  SPLIT_SYSTEM_BLOCKS_CATALOG_ID,
  SPLIT_SYSTEM_BLOCKS_FORMULAS,
  SPLIT_SYSTEM_BLOCKS_NORM_ID,
  SPLIT_SYSTEM_BLOCKS_PARAMETERS,
  SPLIT_SYSTEM_BLOCKS_RESOURCES,
  SPLIT_SYSTEM_BLOCKS_SHORT_INPUT,
  SPLIT_SYSTEM_BLOCKS_SOURCE_ID,
  SPLIT_SYSTEM_BLOCKS_SOURCE_METADATA,
  compileSplitSystemBlocksR1,
} from "../../../src/lib/estimate/v4/splitSystemBlocksR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

async function verifyCore(): Promise<Json> {
  const short = await compileSplitSystemBlocksR1({ ...SPLIT_SYSTEM_BLOCKS_SHORT_INPUT });
  const complete = await compileSplitSystemBlocksR1({ ...SPLIT_SYSTEM_BLOCKS_ACCEPTANCE_INPUT });
  const conditional = await compileSplitSystemBlocksR1({
    ...SPLIT_SYSTEM_BLOCKS_ACCEPTANCE_INPUT,
    additional_refrigerant_mode: "REQUIRED",
    additional_refrigerant_designation: "R32 по паспорту выбранной модели",
    additional_refrigerant_mass_kg: 1.2,
    fire_rated_penetration_seal_mode: "REQUIRED",
    fire_rated_penetration_seal_designation: "Система огнестойкой проходки по проекту",
    fire_rated_penetration_seal_quantity_piece: 4,
    decorative_trunking_mode: "REQUIRED",
    decorative_trunking_designation: "Короб ПВХ по раскладке трассы",
    decorative_trunking_length_m: 18,
  });
  const shortNeeds = new Map(short.preliminaryNeeds.map((need) => [need.row_id, need]));
  if (!(short.rows.length === 7
    && short.rows.find((row) => row.row_id === "rc09:split_system_install_commission")
      ?.quantity === "4"
    && short.rows.find((row) => row.row_id === "rc09:refrigeration_copper_pipe_pair")
      ?.quantity === "64"
    && short.rows.find((row) => row.row_id === "rc09:condensate_drain_pipe_d20")
      ?.quantity === "32"
    && short.preliminaryNeeds.length === 5)) {
    throw new Error("STOP_MASTER_SPLIT_SYSTEM_BLOCKS_SHORT_COMPOSITION");
  }
  for (const rowId of [
    "rc09:outdoor_unit_wall_bracket",
    "rc09:dry_nitrogen_pressure_test",
    "rc09:additional_refrigerant",
    "rc09:fire_rated_penetration_seal",
    "rc09:decorative_trunking",
  ]) {
    if (!shortNeeds.has(rowId)) {
      throw new Error(`STOP_MASTER_SPLIT_SYSTEM_BLOCKS_SHORT_NEED:${rowId}`);
    }
  }
  if (!(complete.preliminaryNeeds.length === 0 && complete.rows.length === 9
    && complete.rows.find((row) =>
      row.row_id === "rc09:outdoor_unit_wall_bracket")?.quantity === "4"
    && complete.rows.find((row) =>
      row.row_id === "rc09:dry_nitrogen_pressure_test")?.quantity === "0.32")) {
    throw new Error("STOP_MASTER_SPLIT_SYSTEM_BLOCKS_COMPLETE_FIXTURE");
  }
  if (!(conditional.preliminaryNeeds.length === 0 && conditional.rows.length === 12)) {
    throw new Error("STOP_MASTER_SPLIT_SYSTEM_BLOCKS_CONDITIONAL_FIXTURE");
  }
  const serialized = JSON.stringify({ short, complete, conditional });
  if (/(building.vrf.system|full.electrical.distribution)/iu.test(serialized)) {
    throw new Error("STOP_MASTER_SPLIT_SYSTEM_BLOCKS_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_MASTER_SPLIT_SYSTEM_BLOCKS_CORE",
    short: {
      rowCount: short.rows.length,
      preliminaryNeedCount: short.preliminaryNeeds.length,
      knownSystemCount: SPLIT_SYSTEM_BLOCKS_SHORT_INPUT.system_count,
      knownRouteLengthEachM: SPLIT_SYSTEM_BLOCKS_SHORT_INPUT.route_length_each_m,
      visibleRowIds: short.rows.map((row) => row.row_id),
      preliminaryNeedRowIds: short.preliminaryNeeds.map((need) => need.row_id),
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.r4-a13-6.master-split-system-blocks-successor.v1",
  stopCode: "MASTER_SPLIT_SYSTEM_BLOCKS",
  applicationName: "r4-a13-6-master-split-system-blocks-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "f02577c56d436913fd347a480a9ec45b25d25f25cc2b31eae2d0c2ae29c79fde",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "10e6bbef-19b5-540a-92fe-14f5696a2658",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "8cbd21c7-81f7-54e2-a2b2-9667a4ab43e5",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/master-split-system-blocks-successor-v1"),
  sourcePaths: [
    "src/lib/estimate/v4/splitSystemBlocksR1.ts",
    "tests/estimateNorms/splitSystemBlocksR1.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterSplitSystemBlocksSuccessor.ts",
  ],
  catalogId: SPLIT_SYSTEM_BLOCKS_CATALOG_ID,
  sourceId: SPLIT_SYSTEM_BLOCKS_SOURCE_ID,
  normId: SPLIT_SYSTEM_BLOCKS_NORM_ID,
  sourceMetadata: SPLIT_SYSTEM_BLOCKS_SOURCE_METADATA,
  parameterDefinitions: SPLIT_SYSTEM_BLOCKS_PARAMETERS,
  formulaDefinitions: SPLIT_SYSTEM_BLOCKS_FORMULAS,
  resourceDefinitions: SPLIT_SYSTEM_BLOCKS_RESOURCES,
  shortInput: SPLIT_SYSTEM_BLOCKS_SHORT_INPUT,
  acceptanceInput: SPLIT_SYSTEM_BLOCKS_ACCEPTANCE_INPUT,
  verifyCore,
  expectedParentShape: [1, 63, 63],
  benchmarkOrdinal: 20,
  validationScenario: "MASTER_BENCHMARK_20_SPLIT_SYSTEM_BLOCKS",
  passport: {
    canonicalRuName: "Монтаж внутреннего и наружного блока сплит-системы",
    workKey: "heating_hvac_interior_split_install_standard",
    physicalResultRu: "Внутренние и наружные блоки четырёх сплит-систем 3,5 кВт смонтированы, соединены трассами известной длины, проверены и введены в работу",
    includedScopeRu: [
      "монтаж и пусконаладка указанного количества комплектов",
      "внутренние и наружные блоки указанной холодопроизводительности",
      "две холодильные линии и две изоляционные оболочки по известной геометрии трасс",
      "дренаж и межблочный кабель по известной геометрии без неуказанного запаса",
      "опоры и азот только по проектному узлу и программе испытаний",
      "хладагент, огнестойкие проходки и декоративный короб только по условным ветвям",
    ],
    excludedScopeRu: [
      "общая VRF-система здания",
      "полное электрическое распределение здания",
      "исторические надбавки на дренаж, кабель, хладагент или азот",
      "неподтверждённые цены и неуказанные условные элементы",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "INSTALL_SPLIT_SYSTEM_BLOCKS",
    materialSystem: "SPLIT_SYSTEM_3_5KW_INDOOR_OUTDOOR_BLOCKS",
    primaryMeasureParameterId: "system_count",
    geometryParameters: ["system_count", "route_length_each_m"],
    knownScopeParameters: ["cooling_capacity_kw"],
    projectScheduleRequiredForNonGeometricQuantities: true,
    conditionalScopeFailClosed: true,
    universalProductivityClaimed: false,
    universalConsumptionClaimed: false,
    buildingVrfSystemExcluded: true,
    fullElectricalDistributionExcluded: true,
  },
  binding: {
    rowId: "rc09:split_system_install_commission",
    applicability: {
      technology_class: "SPLIT_SYSTEM_BLOCKS",
      operation_class: "INSTALL_SPLIT_SYSTEM_BLOCKS",
      material_system: "SPLIT_SYSTEM_3_5KW_INDOOR_OUTDOOR_BLOCKS",
      scope_mode: "KNOWN_SYSTEM_COUNT_CAPACITY_AND_ROUTE_GEOMETRY_PLUS_DIRECT_PROJECT_METHOD_QA_QUANTITIES",
      source_id: SPLIT_SYSTEM_BLOCKS_SOURCE_ID,
      norm_id: SPLIT_SYSTEM_BLOCKS_NORM_ID,
      exact_locator: SPLIT_SYSTEM_BLOCKS_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_route_allowances_claimed: false,
      quantity_basis: "KNOWN_SYSTEM_COUNT_CAPACITY_ROUTE_LENGTH_PLUS_APPROVED_EQUIPMENT_SUPPORT_METHOD_AND_QA_PACKAGE",
    },
  },
  locator: {
    key: "split-system-blocks-project-package-required-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: SPLIT_SYSTEM_BLOCKS_SOURCE_METADATA.exact_locator,
      geometryInputs: ["system_count", "route_length_each_m"],
      knownScopeInputs: ["cooling_capacity_kw"],
      directProjectInputs: [
        "support_designation", "support_quantity_set",
        "nitrogen_test_designation", "nitrogen_volume_m3",
      ],
      conditionalInputs: [
        "additional_refrigerant_mode", "additional_refrigerant_designation",
        "additional_refrigerant_mass_kg", "fire_rated_penetration_seal_mode",
        "fire_rated_penetration_seal_designation",
        "fire_rated_penetration_seal_quantity_piece", "decorative_trunking_mode",
        "decorative_trunking_designation", "decorative_trunking_length_m",
      ],
    },
  },
  search: {
    primaryUom: "set",
    canonicalNameRu: "Монтаж внутреннего и наружного блока сплит-системы",
    aliases: [
      "монтаж сплит-системы 3,5 кВт",
      "установка внутреннего и наружного блока кондиционера",
      "прокладка трассы сплит-системы",
      "split system installation",
    ],
    shortScopeRu: "Монтаж четырёх сплит-систем 3,5 кВт с трассой 8 м на комплект; известная геометрия сразу даёт работу, оборудование и длины коммуникаций, а опоры, азот и условные элементы уточняются добровольно по проекту и паспорту.",
    keyDistinguishingParameters: ["system_count", "cooling_capacity_kw", "route_length_each_m"],
    clarificationFields: [
      "support_designation", "support_quantity_set", "nitrogen_test_designation",
      "nitrogen_volume_m3", "additional_refrigerant_mode",
      "fire_rated_penetration_seal_mode", "decorative_trunking_mode",
    ],
    includedBoundaries: [
      "монтаж и пусконаладка блоков по известному количеству",
      "холодильные линии, изоляция, дренаж и кабель по известной геометрии",
      "опоры по проектному узлу и азот по программе испытаний",
      "хладагент, проходки и короб по условным проектным ветвям",
    ],
    excludedBoundaries: [
      "VRF-система всего здания",
      "полное электрическое распределение здания",
      "исторические надбавки на длину и расход",
      "неподтверждённые цены",
    ],
    extraSearchTermsRu: "сплит система кондиционер 3,5 кВт внутренний наружный блок медная труба изоляция дренаж кабель кронштейн азот вакуумирование хладагент проходка короб",
    sourceProvenance: {
      exactSplitSystemBlocksOwner: true,
      directGeometryAndExactProjectMethodQaPackageRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /building_vrf_system|VRF.*систем/iu,
    /full_electrical_distribution|полн.*электр.*распредел/iu,
  ],
  owner: "MASTER_SPLIT_SYSTEM_BLOCKS_SUCCESSOR",
  receiptFileStem: "MASTER_SPLIT_SYSTEM_BLOCKS",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
