import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  WASTEWATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
  WASTEWATER_TREATMENT_PLANT_CATALOG_ID,
  WASTEWATER_TREATMENT_PLANT_FORMULAS,
  WASTEWATER_TREATMENT_PLANT_NORM_ID,
  WASTEWATER_TREATMENT_PLANT_PARAMETERS,
  WASTEWATER_TREATMENT_PLANT_RESOURCES,
  WASTEWATER_TREATMENT_PLANT_RUNTIME_CLASSIFICATION,
  WASTEWATER_TREATMENT_PLANT_RUNTIME_INPUT,
  WASTEWATER_TREATMENT_PLANT_RUNTIME_SOURCE_IDS,
  WASTEWATER_TREATMENT_PLANT_SHORT_INPUT,
  WASTEWATER_TREATMENT_PLANT_SOURCE_ID,
  WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA,
  compileWastewaterTreatmentPlantR1,
} from "../../../src/lib/estimate/v4/wastewaterTreatmentPlantR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compileWastewaterTreatmentPlantR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "wtp_plant_count", "wtp_plant_designation", "wtp_process_technology",
  "wtp_design_flow_m3_day", "wtp_peak_flow_m3_day", "wtp_process_train_count",
  "wtp_influent_bod5_mg_l", "wtp_influent_tss_mg_l", "wtp_influent_tn_mg_l",
  "wtp_effluent_bod5_mg_l", "wtp_effluent_tss_mg_l", "wtp_effluent_tn_mg_l",
  "wtp_membrane_cassette_installed_piece", "wtp_membrane_cassette_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
  wtp_odor_control_mode: "REQUIRED",
  wtp_odor_control_designation: "BIOFILTER-ODOUR-12000M3H",
  wtp_odor_control_quantity_set: 1,
  wtp_tertiary_polishing_mode: "REQUIRED",
  wtp_tertiary_polishing_designation: "DISC-FILTER-UV-POLISH",
  wtp_tertiary_polishing_capacity_m3_day: 1000,
  wtp_standby_power_mode: "REQUIRED",
  wtp_standby_power_designation: "GENSET-800KVA-AMF",
  wtp_standby_power_quantity_set: 1,
});

async function verifyCore(): Promise<Json> {
  const first = await compileWastewaterTreatmentPlantR1({
    ...WASTEWATER_TREATMENT_PLANT_SHORT_INPUT,
  });
  const complete = await compileWastewaterTreatmentPlantR1({
    ...WASTEWATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
  });
  const balanced = await compileWastewaterTreatmentPlantR1({
    ...WASTEWATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
    wtp_membrane_cassette_retained_spare_piece: 2,
    wtp_membrane_cassette_supplier_package_quantity_piece: 3,
  });
  const conditional = await compileWastewaterTreatmentPlantR1({
    ...WASTEWATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 8 && first.preliminaryNeeds.length === 38
    && quantity(first, "rc09:wtp_acceptance") === "1"
    && quantity(first, "rc09:wtp_membrane_cassettes") === "8")) {
    throw new Error("STOP_S27_24_WASTEWATER_TREATMENT_PLANT_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 43 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:wtp_screen") === "2"
    && quantity(complete, "rc09:wtp_aerobic_tank") === "1200"
    && quantity(complete, "rc09:wtp_aeration_diffusers") === "240"
    && quantity(complete, "rc09:wtp_process_piping") === "680"
    && quantity(complete, "rc09:wtp_structural_concrete") === "840"
    && quantity(complete, "rc09:labor:wtp-process-mechanical") === "2800"
    && quantity(complete, "rc09:equipment:wtp-crane") === "280"
    && quantity(complete, "rc09:logistics:wtp-material-delivery") === "96")) {
    throw new Error("STOP_S27_24_WASTEWATER_TREATMENT_PLANT_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:wtp-membrane-balance:installed-net") === "8"
    && quantity(balanced, "rc09:wtp-membrane-balance:retained-spare") === "2"
    && quantity(balanced, "rc09:wtp-membrane-balance:total-need") === "10"
    && quantity(balanced, "rc09:wtp-membrane-balance:package-count") === "4"
    && quantity(balanced, "rc09:wtp_membrane_cassettes") === "12"
    && quantity(balanced, "rc09:wtp-membrane-balance:remainder") === "4"
    && quantity(balanced, "rc09:wtp-membrane-balance:surplus-beyond-spare") === "2")) {
    throw new Error("STOP_S27_24_WASTEWATER_TREATMENT_PLANT_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 46 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_WASTEWATER_TREATMENT_PLANT_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:wtp_acceptance", "rc09:wtp_effluent_samples",
    "rc09:wtp_functional_tests", "rc09:wtp_asbuilt_documents",
  ]) {
    const graph = WASTEWATER_TREATMENT_PLANT_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_WASTEWATER_TREATMENT_PLANT_DOUBLE_COST:${rowId}`);
    }
  }
  if (/(?:design|peak)_flow\w*\s*\*|process_train_count\s*\*|golden_rate|normFactor/iu
    .test(JSON.stringify(WASTEWATER_TREATMENT_PLANT_FORMULAS))) {
    throw new Error("STOP_S27_24_WASTEWATER_TREATMENT_PLANT_LEGACY_COEFFICIENT");
  }
  if (/sewer_pipe_lm|sewer_pumping_station|sludge_dewatering|rc09:sps_/iu
    .test(JSON.stringify(WASTEWATER_TREATMENT_PLANT_RESOURCES))) {
    throw new Error("STOP_S27_24_WASTEWATER_TREATMENT_PLANT_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_WASTEWATER_TREATMENT_PLANT_BALANCED_CORE",
    first: {
      rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: WASTEWATER_TREATMENT_PLANT_SHORT_INPUT,
    },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:wtp-membrane-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:wtp-membrane-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:wtp-membrane-balance:total-need"),
      packageCount: quantity(balanced, "rc09:wtp-membrane-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:wtp_membrane_cassettes"),
      remainderPiece: quantity(balanced, "rc09:wtp-membrane-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:wtp-membrane-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.wastewater-treatment-plant-balanced-successor.v1",
  stopCode: "S27_24_WASTEWATER_TREATMENT_PLANT_BALANCED",
  applicationName: "s27-24-wastewater-treatment-plant-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "8f7c8850-bd17-5c7a-8b7f-d23fef613a76",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "c6e94296-7f12-57c4-9dc0-992ff26f9d1b",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/wastewater-treatment-plant-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/wastewater-treatment-plant-mbr-balanced-s27-24.json",
    "src/lib/estimate/v4/wastewaterTreatmentPlantR1.ts",
    "tests/estimateNorms/wastewaterTreatmentPlantR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724WastewaterTreatmentPlantBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724WastewaterTreatmentPlantBalancedIndependent.ts",
  ],
  catalogId: WASTEWATER_TREATMENT_PLANT_CATALOG_ID,
  sourceId: WASTEWATER_TREATMENT_PLANT_SOURCE_ID,
  normId: WASTEWATER_TREATMENT_PLANT_NORM_ID,
  sourceMetadata: WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA,
  parameterDefinitions: WASTEWATER_TREATMENT_PLANT_PARAMETERS,
  formulaDefinitions: WASTEWATER_TREATMENT_PLANT_FORMULAS,
  resourceDefinitions: WASTEWATER_TREATMENT_PLANT_RESOURCES,
  shortInput: WASTEWATER_TREATMENT_PLANT_SHORT_INPUT,
  acceptanceInput: WASTEWATER_TREATMENT_PLANT_ACCEPTANCE_INPUT,
  runtimeProfileInput: WASTEWATER_TREATMENT_PLANT_RUNTIME_INPUT,
  runtimeProfileClassification: WASTEWATER_TREATMENT_PLANT_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WASTEWATER_TREATMENT_PLANT_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [4, 45, 45],
  benchmarkOrdinal: 48,
  validationScenario: "Q5_WASTEWATER_TREATMENT_PLANT_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство очистных сооружений сточных вод MBR",
    workKey: "wastewater_treatment_plant",
    physicalResultRu: "Одни двухлинейные КОС WWTP-MBR-1000-2T производительностью 1000 м3/сут смонтированы, запущены и приняты",
    includedScopeRu: [
      "решётки, песколовки, усреднение, аноксидная и аэробная зоны, MBR и УФ",
      "воздуходувки, насосы рецикла и ила, реагенты, КИП, SCADA, внутренние трубы и арматура",
      "строительные объёмы, пусконаладочные среды, труд, механизмы, QA, логистика и баланс кассет",
      "удаление запахов, третичная доочистка и резервное питание только по условным ветвям",
    ],
    excludedScopeRu: [
      "наружная сеть, отдельные КНС и невыбранное обезвоживание осадка",
      "невыбранные здания и внешние инженерные сети",
      "автоматические объёмы по расходу, числу линий или показателям качества",
      "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG", operationClass: "TWO_TRAIN_MBR_WASTEWATER_TREATMENT_PLANT",
    plantAssembly: "WWTP_MBR_1000_2T_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "wtp_plant_count",
    knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleMembraneCassetteProcurementBalance: true,
    directProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    conditionalOperatingScopeFailClosed: true,
    flowTrainOrQualityDerivedQuantitiesForbidden: true,
    externalNetworksPumpingStationsBuildingsAndSludgeDewateringExcluded: true,
  },
  binding: {
    rowId: "rc09:wtp_acceptance",
    applicability: {
      technology_class: "TWO_TRAIN_MBR_WWTP",
      operation_class: "TWO_TRAIN_MBR_WASTEWATER_TREATMENT_PLANT",
      plant_assembly: "WWTP_MBR_1000_2T_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_WWTP_IDENTITY_PLUS_VISIBLE_MEMBRANE_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: WASTEWATER_TREATMENT_PLANT_SOURCE_ID,
      norm_id: WASTEWATER_TREATMENT_PLANT_NORM_ID,
      exact_locator: WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_WWTP_IDENTITY_PLUS_APPROVED_PROJECT_AND_MANUFACTURER_PACKAGE",
    },
  },
  locator: {
    key: "wastewater-treatment-plant-mbr-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA.exact_locator,
      sourcePackSha256: WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(WASTEWATER_TREATMENT_PLANT_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(WASTEWATER_TREATMENT_PLANT_RUNTIME_INPUT),
      directProjectInputs: WASTEWATER_TREATMENT_PLANT_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(WASTEWATER_TREATMENT_PLANT_SHORT_INPUT, id)
          && !id.startsWith("wtp_odor_control_")
          && !id.startsWith("wtp_tertiary_polishing_")
          && !id.startsWith("wtp_standby_power_")),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство очистных сооружений сточных вод MBR",
    aliases: [
      "двухлинейные КОС с мембранным биореактором",
      "очистные сооружения 1000 м3 в сутки MBR",
      "WWTP MBR two train wastewater treatment plant",
    ],
    shortScopeRu: "Одни КОС WWTP-MBR-1000-2T: 1000/1500 м3/сут, две линии SCREEN_GRIT_ANOXIC_AEROBIC_MBR_UV, восемь кассет MBR; ресурсы по проекту и поставщикам.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: WASTEWATER_TREATMENT_PLANT_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(WASTEWATER_TREATMENT_PLANT_SHORT_INPUT, id)),
    includedBoundaries: [
      "входные сооружения, биологическая очистка, MBR, УФ, насосы, аэрация, КИП и SCADA",
      "внутренние трубопроводы, арматура, строительные объёмы, пусконаладка, труд, механизмы, QA и логистика",
      "условные удаление запахов, третичная доочистка и резервное питание только по проекту",
    ],
    excludedBoundaries: [
      "наружная сеть, отдельные КНС, невыбранные здания и обезвоживание осадка",
      "автоматические объёмы по производительности, числу линий или показателям воды",
      "неподтверждённые материалы и цены",
    ],
    extraSearchTermsRu: "КОС очистные сооружения сточных вод мембранный биореактор MBR решётка песколовка аэрация УФ SCADA",
    sourceProvenance: {
      exactExpandedWastewaterTreatmentPlantOwner: true,
      knownSelectedProcessFlowQualityTrainAndMembraneIdentity: true,
      visibleIndependentMembraneCassetteProcurementBalance: true,
      exactProjectMaterialLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /sewer.pipe|канализац.*труб/iu,
    /sewer.pumping|канализац.*насосн.*станц/iu,
    /sludge.dewatering|обезвожив.*осад/iu,
  ],
  owner: "S27_24_WASTEWATER_TREATMENT_PLANT_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_WASTEWATER_TREATMENT_PLANT_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
