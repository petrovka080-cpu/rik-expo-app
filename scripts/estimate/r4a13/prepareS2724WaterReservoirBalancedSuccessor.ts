import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WATER_RESERVOIR_ACCEPTANCE_INPUT, WATER_RESERVOIR_CATALOG_ID,
  WATER_RESERVOIR_FORMULAS, WATER_RESERVOIR_NORM_ID, WATER_RESERVOIR_PARAMETERS,
  WATER_RESERVOIR_RESOURCES, WATER_RESERVOIR_RUNTIME_CLASSIFICATION,
  WATER_RESERVOIR_RUNTIME_INPUT, WATER_RESERVOIR_RUNTIME_SOURCE_IDS,
  WATER_RESERVOIR_SHORT_INPUT, WATER_RESERVOIR_SOURCE_ID,
  WATER_RESERVOIR_SOURCE_METADATA, compileWaterReservoirR1,
} from "../../../src/lib/estimate/v4/waterReservoirR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileWaterReservoirR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "wr_reservoir_count", "wr_reservoir_designation", "wr_reservoir_type",
  "wr_total_storage_capacity_m3", "wr_unit_capacity_m3",
  "wr_waterstop_installed_m", "wr_waterstop_designation",
  "wr_inlet_pipe_installed_m", "wr_inlet_pipe_designation",
  "wr_outlet_pipe_installed_m", "wr_outlet_pipe_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
  wr_excavation_shoring_mode: "REQUIRED",
  wr_excavation_shoring_designation: "SHEET-PILE-AZ18",
  wr_excavation_shoring_area_m2: 3200,
  wr_groundwater_dewatering_mode: "REQUIRED",
  wr_groundwater_dewatering_designation: "WELLPOINT-180M3H",
  wr_groundwater_dewatering_machine_h: 1400,
  wr_road_reinstatement_mode: "REQUIRED",
  wr_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
  wr_road_reinstatement_area_m2: 1200,
});

async function verifyCore(): Promise<Json> {
  const first = await compileWaterReservoirR1({ ...WATER_RESERVOIR_SHORT_INPUT });
  const complete = await compileWaterReservoirR1({ ...WATER_RESERVOIR_ACCEPTANCE_INPUT });
  const balanced = await compileWaterReservoirR1({
    ...WATER_RESERVOIR_ACCEPTANCE_INPUT,
    wr_waterstop_retained_spare_m: 20,
    wr_waterstop_supplier_roll_length_m: 25,
  });
  const conditional = await compileWaterReservoirR1({
    ...WATER_RESERVOIR_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 10 && first.preliminaryNeeds.length === 35
    && quantity(first, "rc09:wr_acceptance") === "2"
    && quantity(first, "rc09:wr_waterstop") === "420"
    && quantity(first, "rc09:wr_inlet_pipe") === "64"
    && quantity(first, "rc09:wr_outlet_pipe") === "64")) {
    throw new Error("STOP_S27_24_WATER_RESERVOIR_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:wr_structural_concrete") === "1850"
    && quantity(complete, "rc09:wr_rebar") === "260000"
    && quantity(complete, "rc09:wr_internal_potable_coating") === "5200"
    && quantity(complete, "rc09:wr_isolation_valves") === "12"
    && quantity(complete, "rc09:labor:wr-civil") === "14800"
    && quantity(complete, "rc09:equipment:wr-crane") === "520"
    && quantity(complete, "rc09:logistics:wr-material-delivery") === "240")) {
    throw new Error("STOP_S27_24_WATER_RESERVOIR_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:wr-waterstop-balance:installed-net") === "420"
    && quantity(balanced, "rc09:wr-waterstop-balance:retained-spare") === "20"
    && quantity(balanced, "rc09:wr-waterstop-balance:total-need") === "440"
    && quantity(balanced, "rc09:wr-waterstop-balance:roll-count") === "18"
    && quantity(balanced, "rc09:wr_waterstop") === "450"
    && quantity(balanced, "rc09:wr-waterstop-balance:remainder") === "30"
    && quantity(balanced, "rc09:wr-waterstop-balance:surplus-beyond-spare") === "10")) {
    throw new Error("STOP_S27_24_WATER_RESERVOIR_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_WATER_RESERVOIR_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:wr_acceptance", "rc09:wr_hydrostatic_tests",
    "rc09:wr_disinfection_cycles", "rc09:wr_water_quality_tests",
    "rc09:wr_asbuilt_documents"]) {
    const graph = WATER_RESERVOIR_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_WATER_RESERVOIR_DOUBLE_COST:${rowId}`);
    }
  }
  if (/storage_capacity\w*\s*\*|unit_capacity\w*\s*\*|pow\s*\(\s*volume|tankSilo|golden_rate|normFactor/iu
    .test(JSON.stringify(WATER_RESERVOIR_FORMULAS))) {
    throw new Error("STOP_S27_24_WATER_RESERVOIR_LEGACY_COEFFICIENT");
  }
  if (/steel_shell|silo|water_intake|treatment_plant|pumping_station|water_tower|sewer/iu
    .test(JSON.stringify(WATER_RESERVOIR_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_WATER_RESERVOIR_ADJACENT_SCOPE");
  }
  return {
    status: "GREEN_S27_24_WATER_RESERVOIR_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: WATER_RESERVOIR_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedM: quantity(balanced, "rc09:wr-waterstop-balance:installed-net"),
      retainedSpareM: quantity(balanced, "rc09:wr-waterstop-balance:retained-spare"),
      totalNeedM: quantity(balanced, "rc09:wr-waterstop-balance:total-need"),
      rollCount: quantity(balanced, "rc09:wr-waterstop-balance:roll-count"),
      orderedM: quantity(balanced, "rc09:wr_waterstop"),
      remainderM: quantity(balanced, "rc09:wr-waterstop-balance:remainder"),
      surplusM: quantity(balanced, "rc09:wr-waterstop-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256")
      .update(JSON.stringify({ first, complete, balanced, conditional })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.water-reservoir-balanced-successor.v1",
  stopCode: "S27_24_WATER_RESERVOIR_BALANCED",
  applicationName: "s27-24-water-reservoir-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "8877215f-297a-5429-88f4-60333538a55d",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "3c4085f1-ced5-5740-b208-5e6e490a0cb3",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/water-reservoir-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/water-reservoir-rc-clean-water-waterstop-balanced-s27-24.json",
    "src/lib/estimate/v4/waterReservoirR1.ts",
    "tests/estimateNorms/waterReservoirR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724WaterReservoirBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724WaterReservoirBalancedIndependent.ts",
  ],
  catalogId: WATER_RESERVOIR_CATALOG_ID, sourceId: WATER_RESERVOIR_SOURCE_ID,
  normId: WATER_RESERVOIR_NORM_ID, sourceMetadata: WATER_RESERVOIR_SOURCE_METADATA,
  parameterDefinitions: WATER_RESERVOIR_PARAMETERS,
  formulaDefinitions: WATER_RESERVOIR_FORMULAS,
  resourceDefinitions: WATER_RESERVOIR_RESOURCES,
  shortInput: WATER_RESERVOIR_SHORT_INPUT,
  acceptanceInput: WATER_RESERVOIR_ACCEPTANCE_INPUT,
  runtimeProfileInput: WATER_RESERVOIR_RUNTIME_INPUT,
  runtimeProfileClassification: WATER_RESERVOIR_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WATER_RESERVOIR_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [4, 45, 45], benchmarkOrdinal: 57,
  validationScenario: "Q5_WATER_RESERVOIR_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство железобетонных резервуаров чистой воды",
    workKey: "water_reservoir",
    physicalResultRu: "Два подземных железобетонных резервуара чистой воды построены, продезинфицированы, испытаны и приняты",
    includedScopeRu: [
      "железобетон, гидрошпонка, наружная гидроизоляция и внутреннее покрытие",
      "входные, выходные, переливные и дренажные трубопроводы, арматура и комплектующие",
      "дезинфекция, анализ воды, труд, механизмы, документация и логистика",
      "крепление, водопонижение и восстановление дороги только условно",
    ],
    excludedScopeRu: [
      "стальной резервуар и силос", "водозабор, водоподготовка, насосная и наружная сеть",
      "водонапорная башня, канализация и неподтверждённые цены",
      "автоматические объёмы по ёмкости резервуара",
    ],
  },
  applicability: {
    country: "KG", operationClass: "BURIED_RC_CLEAN_WATER_RESERVOIR",
    packageAssembly: "WR_RC_BURIED_2X1000_CW_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "wr_reservoir_count",
    knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleWaterstopProcurementBalance: true,
    directProjectCivilWaterproofingPipingLaborEquipmentQaAndLogisticsRequired: true,
    conditionalExcavationAndRoadWorkFailClosed: true,
    capacityDerivedQuantitiesForbidden: true, adjacentFacilitiesExcluded: true,
  },
  binding: {
    rowId: "rc09:wr_acceptance",
    applicability: {
      reservoir_class: "BURIED_RC_CLEAN_WATER_RESERVOIR",
      operation_class: "CLEAN_WATER_RESERVOIR_CONSTRUCTION",
      package_assembly: "WR_RC_BURIED_2X1000_CW_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_RESERVOIR_WATERSTOP_PIPE_SCOPE_PLUS_VISIBLE_WATERSTOP_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: WATER_RESERVOIR_SOURCE_ID, norm_id: WATER_RESERVOIR_NORM_ID,
      exact_locator: WATER_RESERVOIR_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false, universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_RESERVOIR_SCOPE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_ROLL",
    },
  },
  locator: {
    key: "water-reservoir-rc-clean-water-waterstop-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: WATER_RESERVOIR_SOURCE_METADATA.exact_locator,
      sourcePackSha256: WATER_RESERVOIR_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(WATER_RESERVOIR_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(WATER_RESERVOIR_RUNTIME_INPUT),
      directProjectInputs: WATER_RESERVOIR_PARAMETERS.map((parameter) => parameter.parameter_id)
        .filter((id) => !Object.hasOwn(WATER_RESERVOIR_SHORT_INPUT, id)
          && !["excavation_shoring", "groundwater_dewatering", "road_reinstatement"]
            .some((branch) => id.startsWith(`wr_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство железобетонных резервуаров чистой воды",
    aliases: ["строительство резервуара чистой воды",
      "подземный железобетонный резервуар питьевой воды",
      "buried reinforced concrete clean water reservoir"],
    shortScopeRu: "Два подземных железобетонных резервуара по 1000 м³ с гидрошпонкой и трубопроводами; остальные ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: WATER_RESERVOIR_PARAMETERS.map((parameter) => parameter.parameter_id)
      .filter((id) => !Object.hasOwn(WATER_RESERVOIR_SHORT_INPUT, id)),
    includedBoundaries: [
      "железобетон, гидроизоляция, внутреннее покрытие и гидрошпонка",
      "трубопроводы, арматура, комплектующие, дезинфекция и испытания",
      "труд, механизмы, QA, логистика и условные котлованные работы",
    ],
    excludedBoundaries: [
      "стальной резервуар, силос, водозабор, водоподготовка и насосная станция",
      "наружная сеть, водонапорная башня и канализация",
      "автоматические объёмы по ёмкости и неподтверждённые цены",
    ],
    extraSearchTermsRu: "резервуар чистой питьевой воды железобетонный подземный гидрошпонка гидроизоляция дезинфекция",
    sourceProvenance: {
      exactExpandedWaterReservoirOwner: true,
      knownReservoirWaterstopAndPipeSchedule: true,
      visibleIndependentWaterstopProcurementBalance: true,
      exactProjectCivilWaterproofingPipingLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /steel shell|стальн.*корпус|silo|силос/iu, /water intake|водозабор/iu,
    /treatment plant|водоподготов/iu, /pumping station|насосн.*станц/iu,
    /village water|наружн.*сеть/iu, /water tower|водонапорн.*башн/iu,
    /sewer|канализац/iu,
  ],
  owner: "S27_24_WATER_RESERVOIR_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_WATER_RESERVOIR_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
