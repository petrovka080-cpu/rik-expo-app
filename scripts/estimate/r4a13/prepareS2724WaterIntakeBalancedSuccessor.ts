import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  WATER_INTAKE_ACCEPTANCE_INPUT, WATER_INTAKE_CATALOG_ID, WATER_INTAKE_FORMULAS,
  WATER_INTAKE_NORM_ID, WATER_INTAKE_PARAMETERS, WATER_INTAKE_RESOURCES,
  WATER_INTAKE_RUNTIME_CLASSIFICATION, WATER_INTAKE_RUNTIME_INPUT,
  WATER_INTAKE_RUNTIME_SOURCE_IDS, WATER_INTAKE_SHORT_INPUT, WATER_INTAKE_SOURCE_ID,
  WATER_INTAKE_SOURCE_METADATA, compileWaterIntakeR1,
} from "../../../src/lib/estimate/v4/waterIntakeR1";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (result: Awaited<ReturnType<typeof compileWaterIntakeR1>>, rowId: string) =>
  result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const KNOWN_SCOPE_PARAMETERS = [
  "wi_facility_count", "wi_facility_designation", "wi_intake_type",
  "wi_design_capacity_m3_day", "wi_intake_bay_count",
  "wi_coarse_screen_installed_piece", "wi_coarse_screen_designation",
  "wi_raw_water_pump_installed_piece", "wi_raw_water_pump_designation",
];
const CONDITIONAL_INPUT = Object.freeze({
  wi_cofferdam_mode: "REQUIRED", wi_cofferdam_designation: "SHEET-PILE-AZ18",
  wi_cofferdam_area_m2: 1800,
  wi_river_diversion_mode: "REQUIRED", wi_river_diversion_designation: "DIVERSION-CHANNEL-1",
  wi_river_diversion_quantity_set: 1,
  wi_construction_dewatering_mode: "REQUIRED",
  wi_construction_dewatering_designation: "WELLPOINT-240M3H",
  wi_construction_dewatering_machine_h: 1000,
  wi_fish_protection_mode: "REQUIRED", wi_fish_protection_designation: "FISH-SCREEN-2B",
  wi_fish_protection_quantity_set: 2,
});

async function verifyCore(): Promise<Json> {
  const first = await compileWaterIntakeR1({ ...WATER_INTAKE_SHORT_INPUT });
  const complete = await compileWaterIntakeR1({ ...WATER_INTAKE_ACCEPTANCE_INPUT });
  const balanced = await compileWaterIntakeR1({ ...WATER_INTAKE_ACCEPTANCE_INPUT,
    wi_raw_water_pump_retained_spare_piece: 1,
    wi_raw_water_pump_supplier_package_quantity_piece: 2 });
  const conditional = await compileWaterIntakeR1({
    ...WATER_INTAKE_ACCEPTANCE_INPUT, ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 9 && first.preliminaryNeeds.length === 36
    && quantity(first, "rc09:wi_acceptance") === "1"
    && quantity(first, "rc09:wi_coarse_screens") === "4"
    && quantity(first, "rc09:wi_raw_water_pumps") === "4")) {
    throw new Error("STOP_S27_24_WATER_INTAKE_FIRST_ESTIMATE");
  }
  if (!(complete.rows.length === 41 && complete.preliminaryNeeds.length === 0
    && quantity(complete, "rc09:wi_structural_concrete") === "1850"
    && quantity(complete, "rc09:wi_rebar") === "245000"
    && quantity(complete, "rc09:wi_intake_conduits") === "120"
    && quantity(complete, "rc09:wi_screen_cleaners") === "2"
    && quantity(complete, "rc09:labor:wi-mechanical") === "4600"
    && quantity(complete, "rc09:equipment:wi-crane") === "520"
    && quantity(complete, "rc09:logistics:wi-material-delivery") === "260")) {
    throw new Error("STOP_S27_24_WATER_INTAKE_COMPLETE_PROFILE");
  }
  if (!(quantity(balanced, "rc09:wi-pump-balance:installed-net") === "4"
    && quantity(balanced, "rc09:wi-pump-balance:retained-spare") === "1"
    && quantity(balanced, "rc09:wi-pump-balance:total-need") === "5"
    && quantity(balanced, "rc09:wi-pump-balance:package-count") === "3"
    && quantity(balanced, "rc09:wi_raw_water_pumps") === "6"
    && quantity(balanced, "rc09:wi-pump-balance:remainder") === "2"
    && quantity(balanced, "rc09:wi-pump-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_24_WATER_INTAKE_PROCUREMENT_BALANCE");
  }
  if (!(conditional.rows.length === 45 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_24_WATER_INTAKE_CONDITIONAL_PROFILE");
  }
  for (const rowId of ["rc09:wi_acceptance", "rc09:wi_mechanical_tests",
    "rc09:wi_electrical_tests", "rc09:wi_commissioning_tests", "rc09:wi_asbuilt_documents"]) {
    const graph = WATER_INTAKE_RESOURCES.find((row) => row.row_id === rowId)
      ?.resource_graph as Json | undefined;
    if (graph?.costTreatment !== "INFORMATIONAL_SCOPE") {
      throw new Error(`STOP_S27_24_WATER_INTAKE_DOUBLE_COST:${rowId}`);
    }
  }
  if (/design_capacity\w*\s*\*|bay_count\s*\*|pump_installed\w*\s*\*\s*0\.|length_m\s*\*|golden_rate|normFactor/iu
    .test(JSON.stringify(WATER_INTAKE_FORMULAS))) {
    throw new Error("STOP_S27_24_WATER_INTAKE_LEGACY_COEFFICIENT");
  }
  if (/village_water|borehole|treatment_plant|reservoir|water_tower|sewer/iu
    .test(JSON.stringify(WATER_INTAKE_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_24_WATER_INTAKE_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, complete, balanced, conditional });
  return {
    status: "GREEN_S27_24_WATER_INTAKE_BALANCED_CORE",
    first: { rowCount: first.rows.length, preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: WATER_INTAKE_SHORT_INPUT },
    complete: { rowCount: complete.rows.length, preliminaryNeedCount: 0 },
    balanced: {
      installedPiece: quantity(balanced, "rc09:wi-pump-balance:installed-net"),
      retainedSparePiece: quantity(balanced, "rc09:wi-pump-balance:retained-spare"),
      totalNeedPiece: quantity(balanced, "rc09:wi-pump-balance:total-need"),
      packageCount: quantity(balanced, "rc09:wi-pump-balance:package-count"),
      orderedPiece: quantity(balanced, "rc09:wi_raw_water_pumps"),
      remainderPiece: quantity(balanced, "rc09:wi-pump-balance:remainder"),
      surplusPiece: quantity(balanced, "rc09:wi-pump-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-24.water-intake-balanced-successor.v1",
  stopCode: "S27_24_WATER_INTAKE_BALANCED",
  applicationName: "s27-24-water-intake-balanced-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (64).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "5cbccf3054fe0aa893eb402ac1d5532cec2c2cafe418fd62e833c0769373cc49",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "12c4d000-646c-5412-9db5-b8b156045e5b",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "90b62b16-4e82-5561-85cd-8cc466272a5a",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-24/water-intake-balanced-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/water-intake-riverbank-pump-balanced-s27-24.json",
    "src/lib/estimate/v4/waterIntakeR1.ts",
    "tests/estimateNorms/waterIntakeR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2724WaterIntakeBalancedSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2724WaterIntakeBalancedIndependent.ts",
  ],
  catalogId: WATER_INTAKE_CATALOG_ID, sourceId: WATER_INTAKE_SOURCE_ID,
  normId: WATER_INTAKE_NORM_ID, sourceMetadata: WATER_INTAKE_SOURCE_METADATA,
  parameterDefinitions: WATER_INTAKE_PARAMETERS, formulaDefinitions: WATER_INTAKE_FORMULAS,
  resourceDefinitions: WATER_INTAKE_RESOURCES, shortInput: WATER_INTAKE_SHORT_INPUT,
  acceptanceInput: WATER_INTAKE_ACCEPTANCE_INPUT,
  runtimeProfileInput: WATER_INTAKE_RUNTIME_INPUT,
  runtimeProfileClassification: WATER_INTAKE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: WATER_INTAKE_RUNTIME_SOURCE_IDS,
  verifyCore, expectedParentShape: [6, 45, 45], benchmarkOrdinal: 55,
  validationScenario: "Q5_WATER_INTAKE_BALANCED_S27_24",
  passport: {
    canonicalRuName: "Строительство берегового водозаборного сооружения",
    workKey: "water_intake",
    physicalResultRu: "Водозабор WI-RIVERBANK-RC-2B-8000-4P построен, испытан и принят",
    includedScopeRu: [
      "две водоприёмные камеры, решётки, шандоры, насосы и насосная арматура",
      "железобетон, гидроизоляция, покрытия, закладные, трубопроводы и технологическое оборудование",
      "MCC, КИП, труд, механизмы, испытания, документация, логистика и баланс насосов",
      "перемычка, отвод русла, водопонижение и рыбозащита только условно",
    ],
    excludedScopeRu: [
      "наружная сеть и скважина", "водоподготовка, резервуар, башня и канализация",
      "автоматические объёмы по производительности или числу оборудования", "неподтверждённые цены",
    ],
  },
  applicability: {
    country: "KG", operationClass: "RIVERBANK_SCREENED_PUMP_WATER_INTAKE",
    packageAssembly: "WI_RIVERBANK_RC_2B_8000_4P_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "wi_facility_count", knownScopeParameters: KNOWN_SCOPE_PARAMETERS,
    visibleRawWaterPumpProcurementBalance: true,
    directProjectCivilMechanicalElectricalLaborEquipmentQaAndLogisticsRequired: true,
    conditionalRiverWorksFailClosed: true, capacityOrCountDerivedQuantitiesForbidden: true,
    externalNetworkBoreholeTreatmentStorageTowerAndSewerExcluded: true,
  },
  binding: {
    rowId: "rc09:wi_acceptance",
    applicability: {
      intake_class: "RIVERBANK_SCREENED_PUMP_INTAKE",
      operation_class: "WATER_INTAKE_CONSTRUCTION",
      package_assembly: "WI_RIVERBANK_RC_2B_8000_4P_EXPLICIT_PROJECT",
      scope_mode: "KNOWN_INTAKE_BAY_SCREEN_PUMP_SCHEDULE_PLUS_VISIBLE_PUMP_BALANCE_AND_DIRECT_PROJECT_RESOURCES",
      source_id: WATER_INTAKE_SOURCE_ID, norm_id: WATER_INTAKE_NORM_ID,
      exact_locator: WATER_INTAKE_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false, universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "KNOWN_INTAKE_EQUIPMENT_SCHEDULE_PLUS_APPROVED_PROJECT_AND_SUPPLIER_PACKAGE",
    },
  },
  locator: {
    key: "water-intake-riverbank-raw-water-pump-project-balance-s27-24-v1",
    payload: {
      kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
      exactLocator: WATER_INTAKE_SOURCE_METADATA.exact_locator,
      sourcePackSha256: WATER_INTAKE_SOURCE_METADATA.artifact_sha256,
      knownScopeInputs: Object.keys(WATER_INTAKE_SHORT_INPUT),
      visiblePreliminaryBalanceInputs: Object.keys(WATER_INTAKE_RUNTIME_INPUT),
      directProjectInputs: WATER_INTAKE_PARAMETERS.map((p) => p.parameter_id)
        .filter((id) => !Object.hasOwn(WATER_INTAKE_SHORT_INPUT, id)
          && !["cofferdam", "river_diversion", "construction_dewatering", "fish_protection"]
            .some((branch) => id.startsWith(`wi_${branch}_`))),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece", canonicalNameRu: "Строительство берегового водозаборного сооружения",
    aliases: ["строительство водозабора", "береговой насосный водозабор с решётками",
      "riverbank screened raw water pump intake"],
    shortScopeRu: "Один WI-RIVERBANK-RC-2B-8000-4P: 8000 м³/сут, две камеры, четыре решётки и четыре насоса; ресурсы только по проекту.",
    keyDistinguishingParameters: KNOWN_SCOPE_PARAMETERS,
    clarificationFields: WATER_INTAKE_PARAMETERS.map((p) => p.parameter_id)
      .filter((id) => !Object.hasOwn(WATER_INTAKE_SHORT_INPUT, id)),
    includedBoundaries: [
      "водоприёмные камеры, решётки, шандоры, насосы, арматура и внутренние трубопроводы",
      "железобетон, гидроизоляция, MCC, КИП, труд, механизмы, QA и логистика",
      "условные перемычка, отвод русла, водопонижение и рыбозащита",
    ],
    excludedBoundaries: [
      "наружная водопроводная сеть, скважина, водоподготовка, резервуар и водонапорная башня",
      "канализация и автоматические объёмы по производительности или числу оборудования",
      "неподтверждённые материалы и цены",
    ],
    extraSearchTermsRu: "водозабор береговой насосный решётки шандоры насосы исходной воды водоприёмная камера",
    sourceProvenance: {
      exactExpandedWaterIntakeOwner: true, knownIntakeBayScreenAndPumpSchedule: true,
      visibleIndependentRawWaterPumpProcurementBalance: true,
      exactProjectCivilMechanicalElectricalLaborEquipmentQaAndLogisticsRequired: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /village water|сельск.*водопровод|наружн.*сет/iu, /borehole|скважин/iu,
    /treatment plant|водоподготов/iu, /reservoir|резервуар/iu,
    /water tower|водонапорн.*башн/iu, /sewer|канализац/iu,
  ],
  owner: "S27_24_WATER_INTAKE_BALANCED_SUCCESSOR",
  receiptFileStem: "S27_24_WATER_INTAKE_BALANCED",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
