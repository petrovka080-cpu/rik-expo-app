import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  VALVES_CHAMBERS_ACCEPTANCE_INPUT,
  VALVES_CHAMBERS_CATALOG_ID,
  VALVES_CHAMBERS_FORMULAS,
  VALVES_CHAMBERS_KNOWN_SCOPE_PARAMETERS,
  VALVES_CHAMBERS_NORM_ID,
  VALVES_CHAMBERS_PARAMETERS,
  VALVES_CHAMBERS_RESOURCES,
  VALVES_CHAMBERS_RUNTIME_CLASSIFICATION,
  VALVES_CHAMBERS_RUNTIME_INPUT,
  VALVES_CHAMBERS_RUNTIME_SOURCE_IDS,
  VALVES_CHAMBERS_SHORT_INPUT,
  VALVES_CHAMBERS_SOURCE_ID,
  VALVES_CHAMBERS_SOURCE_METADATA,
  compileValvesChambersR1,
} from "../../../src/lib/estimate/v4/valvesChambersR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compileValvesChambersR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  vch_excavation_shoring_mode: "REQUIRED",
  vch_excavation_shoring_designation: "SHEET-PILE-LIGHT",
  vch_excavation_shoring_area_m2: 180,
  vch_groundwater_dewatering_mode: "REQUIRED",
  vch_groundwater_dewatering_designation: "WELLPOINT-60M3H",
  vch_groundwater_dewatering_machine_h: 96,
  vch_pavement_reinstatement_mode: "REQUIRED",
  vch_pavement_reinstatement_designation: "ASPHALT-2L-ROAD-REINSTATEMENT",
  vch_pavement_reinstatement_area_m2: 72,
});

async function verifyCore(): Promise<Json> {
  const first = await compileValvesChambersR1({ ...VALVES_CHAMBERS_SHORT_INPUT });
  const changedGeometry = await compileValvesChambersR1({
    ...VALVES_CHAMBERS_SHORT_INPUT,
    vch_internal_length_m: 3,
    vch_internal_width_m: 2.4,
  });
  const changedProcurement = await compileValvesChambersR1({
    ...VALVES_CHAMBERS_SHORT_INPUT,
    vch_valve_available_stock_piece: 2,
    vch_valve_supplier_package_quantity_piece: 4,
  });
  const conditional = await compileValvesChambersR1({
    ...VALVES_CHAMBERS_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 58 && first.preliminaryNeeds.length === 0
    && quantity(first, "rc09:vch_excavation") === "146.718"
    && quantity(first, "rc09:vch_structural_concrete") === "34.14862"
    && quantity(first, "rc09:vch_reinforcement") === "4.31002"
    && quantity(first, "rc09:vch_pipeline_spool") === "14"
    && quantity(first, "rc09:vch_valves") === "5"
    && quantity(first, "rc09:vch_penetration_seals") === "8"
    && quantity(first, "rc09:vch_test_water") === "6")) {
    throw new Error("STOP_S27_26_VALVES_CHAMBERS_AUTOMATIC_FIRST_ESTIMATE");
  }
  if (!(Number(quantity(changedGeometry, "rc09:vch_excavation"))
      > Number(quantity(first, "rc09:vch_excavation"))
    && Number(quantity(changedGeometry, "rc09:vch_structural_concrete"))
      > Number(quantity(first, "rc09:vch_structural_concrete"))
    && Number(quantity(changedGeometry, "rc09:vch_reinforcement"))
      > Number(quantity(first, "rc09:vch_reinforcement"))
    && Number(quantity(changedGeometry, "rc09:vch_pipeline_spool"))
      > Number(quantity(first, "rc09:vch_pipeline_spool"))
    && quantity(changedGeometry, "rc09:vch_valves") === "5")) {
    throw new Error("STOP_S27_26_VALVES_CHAMBERS_GEOMETRY_RECALCULATION");
  }
  if (!(quantity(changedProcurement, "rc09:vch-valve-balance:installed-net") === "4"
    && quantity(changedProcurement, "rc09:vch-valve-balance:retained-spare") === "1"
    && quantity(changedProcurement, "rc09:vch-valve-balance:total-need") === "5"
    && quantity(changedProcurement, "rc09:vch-valve-balance:net-order-need") === "3"
    && quantity(changedProcurement, "rc09:vch-valve-balance:package-count") === "1"
    && quantity(changedProcurement, "rc09:vch_valves") === "4"
    && quantity(changedProcurement, "rc09:vch-valve-balance:remainder") === "2"
    && quantity(changedProcurement, "rc09:vch-valve-balance:surplus-beyond-spare") === "1")) {
    throw new Error("STOP_S27_26_VALVES_CHAMBERS_PROCUREMENT_RECALCULATION");
  }
  if (!(conditional.rows.length === 61 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_26_VALVES_CHAMBERS_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc09:vch_blinding", "rc09:vch_structural_concrete", "rc09:vch_reinforcement",
    "rc09:vch_formwork", "rc09:vch_waterproofing", "rc09:vch_imported_backfill",
    "rc09:vch_pipeline_spool", "rc09:vch_valves", "rc09:vch_dismantling_joints",
    "rc09:vch_flanged_joint_sets", "rc09:vch_penetration_seals",
    "rc09:vch_puddle_flanges", "rc09:vch_valve_supports",
    "rc09:vch_extension_spindles", "rc09:vch_hatches", "rc09:vch_ladders",
    "rc09:vch_sumps", "rc09:vch_vent_pipe", "rc09:vch_waterstop",
    "rc09:vch_joint_sealant", "rc09:vch_curing_compound", "rc09:vch_test_water",
    "rc09:vch_disinfection_reagent", "rc09:labor:vch-earthworks",
    "rc09:labor:vch-mechanical", "rc09:equipment:vch-excavator",
    "rc09:equipment:vch-crane", "rc09:logistics:vch-concrete-delivery",
    "rc09:vch_asbuilt",
  ]) {
    if (!VALVES_CHAMBERS_RESOURCES.some((resource) => resource.row_id === rowId)) {
      throw new Error(`STOP_S27_26_VALVES_CHAMBERS_COMPLETION_CHAIN:${rowId}`);
    }
  }
  if (/villageWaterSupplyCalculator|golden_rate|normFactor/iu
    .test(JSON.stringify(VALVES_CHAMBERS_FORMULAS))) {
    throw new Error("STOP_S27_26_VALVES_CHAMBERS_LEGACY_COEFFICIENT");
  }
  if (/distribution_pipeline|water_meter|pumping_station|reservoir|treatment_plant/iu
    .test(JSON.stringify(VALVES_CHAMBERS_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_26_VALVES_CHAMBERS_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({
    first, changedGeometry, changedProcurement, conditional,
  });
  return {
    status: "GREEN_S27_26_VALVES_CHAMBERS_AUTOMATIC_CORE",
    ordinaryInputCount: Object.keys(VALVES_CHAMBERS_SHORT_INPUT).length,
    visibleProfileInputCount: Object.keys(VALVES_CHAMBERS_RUNTIME_INPUT).length,
    first: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      ordinaryInput: VALVES_CHAMBERS_SHORT_INPUT,
    },
    automaticGeometry: {
      baselineExcavationM3: quantity(first, "rc09:vch_excavation"),
      changedExcavationM3: quantity(changedGeometry, "rc09:vch_excavation"),
      baselineConcreteOrderM3: quantity(first, "rc09:vch_structural_concrete"),
      changedConcreteOrderM3: quantity(changedGeometry, "rc09:vch_structural_concrete"),
      baselineSpoolM: quantity(first, "rc09:vch_pipeline_spool"),
      changedSpoolM: quantity(changedGeometry, "rc09:vch_pipeline_spool"),
    },
    procurement: {
      installedPiece: quantity(changedProcurement, "rc09:vch-valve-balance:installed-net"),
      retainedSparePiece: quantity(changedProcurement, "rc09:vch-valve-balance:retained-spare"),
      availableStockPiece: quantity(changedProcurement, "rc09:vch-valve-balance:available-stock"),
      netOrderNeedPiece: quantity(changedProcurement, "rc09:vch-valve-balance:net-order-need"),
      packageCount: quantity(changedProcurement, "rc09:vch-valve-balance:package-count"),
      orderedPiece: quantity(changedProcurement, "rc09:vch_valves"),
      surplusPiece: quantity(changedProcurement, "rc09:vch-valve-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-26.valves-chambers-automatic-successor.v1",
  stopCode: "S27_26_VALVES_CHAMBERS_AUTOMATIC",
  applicationName: "s27-26-valves-chambers-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (66).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "c0cc1dc8b4bccbd1025f6c78426bd4f3d3dd464254b2aa534fea0d8e576ff91b",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "ca92547c-3927-50d6-89e2-98a5c5f63126",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "833ed8ce-d6c7-52ee-998e-e2cddf3a3b25",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-26/valves-chambers-automatic-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/valves-chambers-geometric-automatic-s27-26.json",
    "src/lib/estimate/v4/automaticConstructionOwnerR1.ts",
    "src/lib/estimate/v4/valvesChambersR1.ts",
    "tests/estimateNorms/valvesChambersR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2726ValvesChambersAutomaticSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2726ValvesChambersAutomaticIndependent.ts",
  ],
  catalogId: VALVES_CHAMBERS_CATALOG_ID,
  sourceId: VALVES_CHAMBERS_SOURCE_ID,
  normId: VALVES_CHAMBERS_NORM_ID,
  sourceMetadata: VALVES_CHAMBERS_SOURCE_METADATA,
  parameterDefinitions: VALVES_CHAMBERS_PARAMETERS,
  formulaDefinitions: VALVES_CHAMBERS_FORMULAS,
  resourceDefinitions: VALVES_CHAMBERS_RESOURCES,
  shortInput: VALVES_CHAMBERS_SHORT_INPUT,
  acceptanceInput: VALVES_CHAMBERS_ACCEPTANCE_INPUT,
  runtimeProfileInput: VALVES_CHAMBERS_RUNTIME_INPUT,
  runtimeProfileClassification: VALVES_CHAMBERS_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: VALVES_CHAMBERS_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 64,
  validationScenario: "Q5_VALVES_CHAMBERS_AUTOMATIC_S27_26",
  passport: {
    canonicalRuName: "Строительство камер запорной арматуры питьевого водопровода",
    workKey: "valves_chambers",
    physicalResultRu: "Четыре камеры VCH-RC-2.4X1.8-H2.2-DN200 с четырьмя задвижками смонтированы, испытаны, продезинфицированы и приняты",
    includedScopeRu: [
      "котлованы, железобетон, армирование, опалубка, гидроизоляция, засыпка и вывоз грунта",
      "задвижки, внутренние вставки, демонтажные вставки, фланцевые комплекты, проходы и опоры",
      "люки, лестницы, приямки, вентиляция, расходники, труд, механизмы, испытания и логистика",
      "крепление, водопонижение и восстановление покрытия только по условным ветвям",
    ],
    excludedScopeRu: [
      "наружный распределительный трубопровод за стенами камер",
      "водомерные камеры, насосные станции, резервуары и водоподготовка",
      "автоматическая топология ответвлений по длине сети или производительности",
      "неподтверждённые материалы, оборудование и цены",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "POTABLE_WATER_RC_VALVE_CHAMBER",
    chamberAssembly: "VCH_RC_2_4X1_8_H2_2_DN200_EXPLICIT_PROJECT",
    primaryMeasureParameterId: "vch_chamber_count",
    knownScopeParameters: [...VALVES_CHAMBERS_KNOWN_SCOPE_PARAMETERS],
    ordinaryUserInputCount: Object.keys(VALVES_CHAMBERS_SHORT_INPUT).length,
    automaticGeometryLaborEquipmentAndProcurement: true,
    visibleEditablePreliminaryProfile: true,
    visibleValveProcurementBalance: true,
    directProjectCivilMechanicalAccessLaborEquipmentQaAndLogisticsRequired: true,
    conditionalTemporaryWorksAndPavementFailClosed: true,
    derivedQuantitiesAsOrdinaryQuestionsForbidden: true,
    externalPipelineAndAdjacentFacilitiesExcluded: true,
  },
  binding: {
    rowId: "rc09:vch_acceptance",
    applicability: {
      technology_class: "CAST_IN_PLACE_RC_POTABLE_WATER_VALVE_CHAMBER",
      operation_class: "POTABLE_WATER_VALVE_CHAMBER_CONSTRUCTION",
      chamber_assembly: "VCH_RC_2_4X1_8_H2_2_DN200_EXPLICIT_PROJECT",
      scope_mode: "NINE_PRIMARY_FACTS_PLUS_VISIBLE_PROFILE_AND_AUTOMATIC_RESOURCE_GRAPH",
      source_id: VALVES_CHAMBERS_SOURCE_ID,
      norm_id: VALVES_CHAMBERS_NORM_ID,
      exact_locator: VALVES_CHAMBERS_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "PRIMARY_CHAMBER_GEOMETRY_AND_VALVE_TOPOLOGY_PLUS_VISIBLE_EDITABLE_PROFILE",
    },
  },
  locator: {
    key: "valves-chambers-geometric-automatic-s27-26-v1",
    payload: {
      kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
      exactLocator: VALVES_CHAMBERS_SOURCE_METADATA.exact_locator,
      sourcePackSha256: VALVES_CHAMBERS_SOURCE_METADATA.artifact_sha256,
      ordinaryKnownInputs: Object.keys(VALVES_CHAMBERS_SHORT_INPUT),
      visibleEditableProfileInputs: Object.keys(VALVES_CHAMBERS_RUNTIME_INPUT),
      automaticFormulaIds: VALVES_CHAMBERS_FORMULAS.map((formula) => formula.formula_id),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "piece",
    canonicalNameRu: "Строительство камер запорной арматуры питьевого водопровода",
    aliases: [
      "камера задвижки наружного водопровода",
      "железобетонная камера запорной арматуры DN200",
      "potable water reinforced concrete valve chamber",
    ],
    shortScopeRu: "Четыре монолитные железобетонные камеры 2,4x1,8x2,2 м с четырьмя задвижками DN200 PN16; строительные, механические и приёмочные ресурсы рассчитываются автоматически.",
    keyDistinguishingParameters: [...VALVES_CHAMBERS_KNOWN_SCOPE_PARAMETERS],
    clarificationFields: [],
    includedBoundaries: [
      "железобетонные камеры, гидроизоляция, доступ, дренаж и вентиляция",
      "задвижки, внутренние вставки, фланцевые соединения, проходы и опоры",
      "расходники, труд, механизмы, испытания, документация и логистика",
      "условные крепление, водопонижение и восстановление покрытия только по проекту",
    ],
    excludedBoundaries: [
      "наружный распределительный трубопровод за стенами камер",
      "водомерные камеры, насосные станции, резервуары и водоподготовка",
      "неподтверждённые материалы, оборудование и цены",
    ],
    extraSearchTermsRu: "камера задвижка водопровод железобетон DN200 PN16 люк лестница демонтажная вставка",
    sourceProvenance: {
      exactExpandedValvesChambersOwner: true,
      ninePrimaryFactIngress: true,
      automaticGeometryAssembliesLaborEquipmentAndProcurement: true,
      visiblePreliminaryProfileRequiresProjectConfirmation: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /distribution.pipeline|распределительн.*трубопровод/iu,
    /water.meter|водомерн/iu,
    /pumping.station|насосн.*станц/iu,
    /reservoir|резервуар/iu,
    /treatment.plant|водоочистн|водоподготов/iu,
  ],
  owner: "S27_26_VALVES_CHAMBERS_AUTOMATIC_SUCCESSOR",
  receiptFileStem: "S27_26_VALVES_CHAMBERS_AUTOMATIC",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
