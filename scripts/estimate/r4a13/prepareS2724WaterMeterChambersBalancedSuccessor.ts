import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  WATER_METER_CHAMBERS_ACCEPTANCE_INPUT,
  WATER_METER_CHAMBERS_CATALOG_ID,
  WATER_METER_CHAMBERS_FORMULAS,
  WATER_METER_CHAMBERS_NORM_ID,
  WATER_METER_CHAMBERS_PARAMETERS,
  WATER_METER_CHAMBERS_RESOURCES,
  WATER_METER_CHAMBERS_RUNTIME_CLASSIFICATION,
  WATER_METER_CHAMBERS_RUNTIME_INPUT,
  WATER_METER_CHAMBERS_RUNTIME_SOURCE_IDS,
  WATER_METER_CHAMBERS_SHORT_INPUT,
  WATER_METER_CHAMBERS_SOURCE_ID,
  WATER_METER_CHAMBERS_SOURCE_METADATA,
  compileWaterMeterChambersR1,
} from "../../../src/lib/estimate/v4/waterMeterChambersR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const quantity = (
  result: Awaited<ReturnType<typeof compileWaterMeterChambersR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;

const KNOWN_SCOPE_PARAMETERS = [
  "wmc_chamber_count",
  "wmc_chamber_designation",
  "wmc_chamber_type",
  "wmc_design_flow_m3_day",
  "wmc_meter_installed_piece",
  "wmc_meter_designation",
  "wmc_straight_pipe_installed_m",
  "wmc_straight_pipe_designation",
  "wmc_bypass_pipe_installed_m",
  "wmc_bypass_pipe_designation",
];

const CONDITIONAL_INPUT = Object.freeze({
  wmc_excavation_shoring_mode: "REQUIRED",
  wmc_excavation_shoring_designation: "SHEET-PILE-LIGHT",
  wmc_excavation_shoring_area_m2: 620,
  wmc_groundwater_dewatering_mode: "REQUIRED",
  wmc_groundwater_dewatering_designation: "WELLPOINT-60M3H",
  wmc_groundwater_dewatering_machine_h: 240,
  wmc_road_reinstatement_mode: "REQUIRED",
  wmc_road_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
  wmc_road_reinstatement_area_m2: 480,
});

async function verifyCore(): Promise<Json> {
  const first = await compileWaterMeterChambersR1({
    ...WATER_METER_CHAMBERS_SHORT_INPUT,
  });
  const complete = await compileWaterMeterChambersR1({
    ...WATER_METER_CHAMBERS_ACCEPTANCE_INPUT,
  });
  const balanced = await compileWaterMeterChambersR1({
    ...WATER_METER_CHAMBERS_ACCEPTANCE_INPUT,
    wmc_meter_retained_spare_piece: 1,
    wmc_meter_supplier_package_quantity_piece: 2,
  });
  const conditional = await compileWaterMeterChambersR1({
    ...WATER_METER_CHAMBERS_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 11 && first.preliminaryNeeds.length === 34
    && quantity(first, "rc09:wmc_acceptance") === "4"
    && quantity(first, "rc09:wmc_chambers") === "4"
    && quantity(first, "rc09:wmc_water_meters") === "4"
    && quantity(first, "rc09:wmc_straight_pipe") === "96"
    && quantity(first, "rc09:wmc_bypass_pipe") === "48")) {
    throw new Error("STOP_S27_24_WATER_METER_CHAMBERS_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 42 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:wmc_isolation_valves") === "12"
    && quantity(complete, "rc09:wmc_penetration_seals") === "32"
    && quantity(complete, "rc09:wmc_base_concrete") === "72"
    && quantity(complete, "rc09:wmc_rebar") === "8800"
    && quantity(complete, "rc09:labor:wmc-civil") === "1200"
    && quantity(complete, "rc09:equipment:wmc-crane") === "120"
    && quantity(complete, "rc09:logistics:wmc-material-delivery") === "36")) {
    throw new Error("STOP_S27_24_WATER_METER_CHAMBERS_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:wmc-meter-balance:installed-net") === "4"
    && quantity(balanced, "rc09:wmc-meter-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:wmc-meter-balance:total-need") === "5"
    && quantity(balanced, "rc09:wmc-meter-balance:package-count") === "3"
    && quantity(balanced, "rc09:wmc_water_meters") === "6"
    && quantity(balanced, "rc09:wmc-meter-balance:remainder") === "2"
    && quantity(balanced, "rc09:wmc-meter-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_WATER_METER_CHAMBERS_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_WATER_METER_CHAMBERS_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:wmc_acceptance",
    "rc09:wmc_hydraulic_tests",
    "rc09:wmc_meter_calibration",
    "rc09:wmc_electrical_tests",
    "rc09:wmc_asbuilt_documents",
  ]) {
    const graph = WATER_METER_CHAMBERS_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_WATER_METER_CHAMBERS_DOUBLE_COST:${rowId}`);
    }
  }
  if (/design_flow\w*\s*\*|pipe_installed\w*\s*\*\s*0\.|length_m\s*\*|golden_rate|normFactor/iu
    .test(JSON.stringify(WATER_METER_CHAMBERS_FORMULAS))) {
    throw new Error("STOP_S27_24_WATER_METER_CHAMBERS_LEGACY_COEFFICIENT");
  }
  if (/village_water|water_intake|borehole|pumping_station|treatment_plant|reservoir|water_tower|sewer/iu
    .test(JSON.stringify(WATER_METER_CHAMBERS_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_WATER_METER_CHAMBERS_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_WATER_METER_CHAMBERS_BALANCED_CORE",
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: WATER_METER_CHAMBERS_SHORT_INPUT,
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:wmc-meter-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:wmc-meter-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:wmc-meter-balance:total-need"),
      packageCount: quantity(balanced, "rc09:wmc-meter-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:wmc_water_meters"),
      remainderPiece: quantity(balanced, "rc09:wmc-meter-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:wmc-meter-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.water-meter-chambers-balanced-successor.v1",
  stopCode: "S27_24_WATER_METER_CHAMBERS_BALANCED",
  applicationName: "s27-24-water-meter-chambers-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "6ad4c42f-92ac-587a-8631-1cc5962d5f47",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "2b4491a6-f2c8-5aa4-96d1-5b4d28d1e779",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/water-meter-chambers-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/water-meter-chambers-electromagnetic-meter-balanced-s27-24.json",
    "src/lib/estimate/v4/waterMeterChambersR1.ts",
    "tests/estimateNorms/waterMeterChambersR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724WaterMeterChambersBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724WaterMeterChambersBalancedIndependent.ts",
  ],
  catalogId: WATER_METER_CHAMBERS_CATALOG_ID,
  sourceId: WATER_METER_CHAMBERS_SOURCE_ID,
  normId: WATER_METER_CHAMBERS_NORM_ID,
  sourceMetadata: WATER_METER_CHAMBERS_SOURCE_METADATA,
  parameterDefinitions: WATER_METER_CHAMBERS_PARAMETERS,
  formulaDefinitions: WATER_METER_CHAMBERS_FORMULAS,
  resourceDefinitions: WATER_METER_CHAMBERS_RESOURCES,
  shortInput: WATER_METER_CHAMBERS_SHORT_INPUT,
  acceptanceInput: WATER_METER_CHAMBERS_ACCEPTANCE_INPUT,
  runtimeProfileInput: WATER_METER_CHAMBERS_RUNTIME_INPUT,
  runtimeProfileClassification: WATER_METER_CHAMBERS_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WATER_METER_CHAMBERS_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 56,
  validationScenario: "Q5_WATER_METER_CHAMBERS_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Устройство камер водомерных узлов",
    workKey: "water_meter_chambers",
    physicalResultRu: "Четыре железобетонные камеры водомерных узлов смонтированы, испытаны и приняты",
    includedScopeRu: [
      "четыре железобетонные камеры с крышками, лестницами и герметизацией вводов",
      "счётчики, прямые измерительные участки, байпасы, арматура, фильтры и фасонные части",
      "бетон, арматура, опалубка, гидроизоляция, засыпка, кабель и расходники",
      "труд, механизмы, испытания, поверка, документация, логистика и баланс счётчиков",
      "крепление, водопонижение и восстановление дороги только условно",
    ],
    excludedScopeRu: [
      "наружная сеть, водозабор и скважины",
      "насосная станция, водоподготовка, резервуар и водонапорная башня",
      "канализация и неподтверждённые цены",
      "автоматические объёмы по расходу, длине или диаметру",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "RC_WATER_METER_CHAMBER_WITH_BYPASS",
    packageAssembly: "WMC_RC_DN150_4_EMF_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "wmc_chamber_count",
    knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleWaterMeterProcurementBalance: true,
    directProjectCivilPipingElectricalLaborEquipmentQaAndLogisticsRequired: true,
    conditionalExcavationAndRoadWorkFailClosed: true,
    flowLengthOrDiameterDerivedQuantitiesForbidden: true,
    adjacentWaterAndSewerFacilitiesExcluded: true,
  },
  binding: {
    rowId: "rc09:wmc_acceptance",
    applicability: {
      chamber_class: "RC_WATER_METER_CHAMBER_WITH_BYPASS",
      operation_class: "WATER_METER_CHAMBER_CONSTRUCTION",
      package_assembly: "WMC_RC_DN150_4_EMF_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_CHAMBER_METER_PIPE_SCOPE_PLUS_VISIBLE_METER_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: WATER_METER_CHAMBERS_SOURCE_ID,
      norm_id: WATER_METER_CHAMBERS_NORM_ID,
      exact_locator: WATER_METER_CHAMBERS_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_METERING_SCOPE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_PACKAGE",
    },
  },
  locator: {
    key: "water-meter-chambers-electromagnetic-meter-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: WATER_METER_CHAMBERS_SOURCE_METADATA.exact_locator,
      sourcePackSha256: WATER_METER_CHAMBERS_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(WATER_METER_CHAMBERS_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(WATER_METER_CHAMBERS_RUNTIME_INPUT),
      directProjectInputs: WATER_METER_CHAMBERS_PARAMETERS.map((parameter) => parameter.parameter_id)
        .filter((id) => !Object.hasOwn(WATER_METER_CHAMBERS_SHORT_INPUT, id)
          && !["excavation_shoring", "groundwater_dewatering", "road_reinstatement"]
            .some((branch) => id.startsWith(`wmc_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Устройство камер водомерных узлов",
    aliases: [
      "строительство водомерной камеры",
      "железобетонный водомерный узел с байпасом",
      "RC water meter chamber electromagnetic meter",
    ],
    shortScopeRu: "Четыре WMC-RC-DN150-4-EMF: четыре электромагнитных счётчика, прямые участки и байпасы; остальные ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: WATER_METER_CHAMBERS_PARAMETERS.map((parameter) => parameter.parameter_id)
      .filter((id) => !Object.hasOwn(WATER_METER_CHAMBERS_SHORT_INPUT, id)),
    includedBoundaries: [
      "камеры, счётчики, измерительные участки, байпасы, арматура и фасонные части",
      "строительные материалы, кабель, расходники, труд, механизмы, QA и логистика",
      "условные крепление котлована, водопонижение и восстановление дороги",
    ],
    excludedBoundaries: [
      "наружная водопроводная сеть, водозабор, скважины и насосная станция",
      "водоподготовка, резервуар, водонапорная башня и канализация",
      "автоматические проектные объёмы и неподтверждённые цены",
    ],
    extraSearchTermsRu: "водомерная камера водомерный узел счётчик воды электромагнитный байпас прямой участок DN150",
    sourceProvenance: {
      exactExpandedWaterMeterChambersOwner: true,
      knownChamberMeterAndPipeSchedule: true,
      visibleIndependentWaterMeterProcurementBalance: true,
      exactProjectCivilPipingElectricalLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /village water|сельск.*водопровод|наружн.*сеть/iu,
    /water intake|водозабор/iu,
    /borehole|скважин/iu,
    /pumping station|насосн.*станц/iu,
    /treatment plant|водоподготов/iu,
    /reservoir|резервуар/iu,
    /water tower|водонапорн.*башн/iu,
    /sewer|канализац/iu,
  ],
  owner: "S27_24_WATER_METER_CHAMBERS_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_WATER_METER_CHAMBERS_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
