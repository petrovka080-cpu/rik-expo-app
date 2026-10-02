import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  FLUSHING_DISINFECTION_ACCEPTANCE_INPUT,
  FLUSHING_DISINFECTION_CATALOG_ID,
  FLUSHING_DISINFECTION_FORMULAS,
  FLUSHING_DISINFECTION_KNOWN_SCOPE_PARAMETERS,
  FLUSHING_DISINFECTION_NORM_ID,
  FLUSHING_DISINFECTION_PARAMETERS,
  FLUSHING_DISINFECTION_RESOURCES,
  FLUSHING_DISINFECTION_RUNTIME_CLASSIFICATION,
  FLUSHING_DISINFECTION_RUNTIME_INPUT,
  FLUSHING_DISINFECTION_RUNTIME_SOURCE_IDS,
  FLUSHING_DISINFECTION_SHORT_INPUT,
  FLUSHING_DISINFECTION_SOURCE_ID,
  FLUSHING_DISINFECTION_SOURCE_METADATA,
  compileFlushingDisinfectionR1,
} from "../../../src/lib/estimate/v4/flushingDisinfectionR1";
import { runMasterSingleDefinitionSuccessorR1 } from
  "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;
const quantity = (
  result: Awaited<ReturnType<typeof compileFlushingDisinfectionR1>>,
  rowId: string,
) => result.rows.find((row) => row.row_id === rowId)?.quantity ?? null;
const CONDITIONAL_INPUT = Object.freeze({
  fld_water_source_mode: "TANKER",
  fld_water_tanker_designation: "POTABLE-WATER-TANKER-10M3",
  fld_disposal_mode: "TANKER",
  fld_disposal_tanker_designation: "WASH-WATER-TANKER-10M3",
  fld_dechlorination_mode: "REQUIRED",
  fld_dechlorination_reagent_designation: "SODIUM-THIOSULFATE-TECHNICAL",
  fld_dechlorination_kg_per_active_chlorine_kg: 7,
});

async function verifyCore(): Promise<Json> {
  const first = await compileFlushingDisinfectionR1({
    ...FLUSHING_DISINFECTION_SHORT_INPUT,
  });
  const changedGeometry = await compileFlushingDisinfectionR1({
    ...FLUSHING_DISINFECTION_SHORT_INPUT,
    fld_pipeline_length_m: 2000,
    fld_pipeline_internal_diameter_mm: 150,
  });
  const changedProcurement = await compileFlushingDisinfectionR1({
    ...FLUSHING_DISINFECTION_SHORT_INPUT,
    fld_reagent_available_stock_kg: 2,
    fld_reagent_supplier_package_kg: 5,
  });
  const conditional = await compileFlushingDisinfectionR1({
    ...FLUSHING_DISINFECTION_ACCEPTANCE_INPUT,
    ...CONDITIONAL_INPUT,
  });
  if (!(first.rows.length === 52 && first.preliminaryNeeds.length === 0
    && quantity(first, "rc12:fld_pipeline_volume") === "7.853982"
    && quantity(first, "rc12:fld_required_flush_flow") === "28.2743352"
    && quantity(first, "rc12:fld_flush_water") === "16.17920292"
    && quantity(first, "rc12:fld_disinfection_water") === "8.08960146"
    && quantity(first, "rc12:fld_total_water") === "24.26880438"
    && quantity(first, "rc12:fld_active_chlorine") === "0.404480073"
    && quantity(first, "rc12:fld_flushing_pumps") === "2"
    && quantity(first, "rc12:fld_lab_analyses") === "8"
    && quantity(first, "rc12:fld_reagent_order") === "30")) {
    throw new Error("STOP_S27_26_FLUSHING_DISINFECTION_AUTOMATIC_FIRST_ESTIMATE");
  }
  if (!(Number(quantity(changedGeometry, "rc12:fld_pipeline_volume"))
      > Number(quantity(first, "rc12:fld_pipeline_volume"))
    && Number(quantity(changedGeometry, "rc12:fld_required_flush_flow"))
      > Number(quantity(first, "rc12:fld_required_flush_flow"))
    && Number(quantity(changedGeometry, "rc12:fld_total_water"))
      > Number(quantity(first, "rc12:fld_total_water"))
    && Number(quantity(changedGeometry, "rc12:fld_active_chlorine"))
      > Number(quantity(first, "rc12:fld_active_chlorine"))
    && Number(quantity(changedGeometry, "rc12:fld_flushing_pumps"))
      > Number(quantity(first, "rc12:fld_flushing_pumps")))) {
    throw new Error("STOP_S27_26_FLUSHING_DISINFECTION_GEOMETRY_RECALCULATION");
  }
  if (!(quantity(changedProcurement, "rc12:fld-reagent-balance:installed") === "3.235840584"
    && quantity(changedProcurement, "rc12:fld-reagent-balance:retained-spare") === "0.323584058"
    && quantity(changedProcurement, "rc12:fld-reagent-balance:available-stock") === "2"
    && quantity(changedProcurement, "rc12:fld-reagent-balance:total-need") === "3.559424642"
    && quantity(changedProcurement, "rc12:fld-reagent-balance:net-order-need") === "1.559424642"
    && quantity(changedProcurement, "rc12:fld-reagent-balance:package-count") === "1"
    && quantity(changedProcurement, "rc12:fld_reagent_order") === "5"
    && quantity(changedProcurement, "rc12:fld-reagent-balance:remainder") === "3.764159416"
    && quantity(changedProcurement, "rc12:fld-reagent-balance:surplus-beyond-spare") === "3.440575358")) {
    throw new Error("STOP_S27_26_FLUSHING_DISINFECTION_PROCUREMENT_RECALCULATION");
  }
  if (!(conditional.rows.length === 55 && conditional.preliminaryNeeds.length === 0)) {
    throw new Error("STOP_S27_26_FLUSHING_DISINFECTION_CONDITIONAL_PROFILE");
  }
  for (const rowId of [
    "rc12:fld_fill_connections", "rc12:fld_injection_connections",
    "rc12:fld_drain_connections", "rc12:fld_sampling_connections",
    "rc12:fld_supply_hose", "rc12:fld_discharge_hose",
    "rc12:fld_temporary_valves", "rc12:fld_backflow_preventers",
    "rc12:fld_fittings", "rc12:fld_hose_supports",
    "rc12:fld_flushing_pumps", "rc12:fld_dosing_skids",
    "rc12:fld_flowmeters", "rc12:fld_chlorine_meters",
    "rc12:fld_turbidity_meters", "rc12:fld_sample_bottles",
    "rc12:fld_dpd_kits", "rc12:fld_lab_analyses",
    "rc12:fld_ppe", "rc12:fld_spill_kits", "rc12:labor:fld-setup",
    "rc12:labor:fld-flushing", "rc12:labor:fld-dosing",
    "rc12:labor:fld-sampling", "rc12:equipment:fld-pumps",
    "rc12:equipment:fld-dosing", "rc12:fld_asbuilt",
    "rc12:fld_acceptance_protocol", "rc12:logistics:fld-reagent",
    "rc12:logistics:fld-equipment",
  ]) {
    if (!FLUSHING_DISINFECTION_RESOURCES.some((resource) => resource.row_id === rowId)) {
      throw new Error(`STOP_S27_26_FLUSHING_DISINFECTION_COMPLETION_CHAIN:${rowId}`);
    }
  }
  if (/villageWaterSupplyCalculator|golden_rate|normFactor/iu
    .test(JSON.stringify(FLUSHING_DISINFECTION_FORMULAS))) {
    throw new Error("STOP_S27_26_FLUSHING_DISINFECTION_LEGACY_COEFFICIENT");
  }
  if (/trench|backfill|hydrant|pressure_testing|hydro_testing|pipe_supply|chlorination_station/iu
    .test(JSON.stringify(FLUSHING_DISINFECTION_RESOURCES.map((row) => row.row_id)))) {
    throw new Error("STOP_S27_26_FLUSHING_DISINFECTION_ADJACENT_SCOPE");
  }
  const serialized = JSON.stringify({ first, changedGeometry, changedProcurement, conditional });
  return {
    status: "GREEN_S27_26_FLUSHING_DISINFECTION_AUTOMATIC_CORE",
    ordinaryInputCount: Object.keys(FLUSHING_DISINFECTION_SHORT_INPUT).length,
    visibleProfileInputCount: Object.keys(FLUSHING_DISINFECTION_RUNTIME_INPUT).length,
    first: { rowCount: first.rows.length, preliminaryNeedCount: 0 },
    automaticGeometry: {
      baselineVolumeM3: quantity(first, "rc12:fld_pipeline_volume"),
      changedVolumeM3: quantity(changedGeometry, "rc12:fld_pipeline_volume"),
      baselineTotalWaterM3: quantity(first, "rc12:fld_total_water"),
      changedTotalWaterM3: quantity(changedGeometry, "rc12:fld_total_water"),
      baselineActiveChlorineKg: quantity(first, "rc12:fld_active_chlorine"),
      changedActiveChlorineKg: quantity(changedGeometry, "rc12:fld_active_chlorine"),
      baselinePumpCount: quantity(first, "rc12:fld_flushing_pumps"),
      changedPumpCount: quantity(changedGeometry, "rc12:fld_flushing_pumps"),
    },
    procurement: {
      installedKg: quantity(changedProcurement, "rc12:fld-reagent-balance:installed"),
      retainedSpareKg: quantity(changedProcurement, "rc12:fld-reagent-balance:retained-spare"),
      availableStockKg: quantity(changedProcurement, "rc12:fld-reagent-balance:available-stock"),
      netOrderNeedKg: quantity(changedProcurement, "rc12:fld-reagent-balance:net-order-need"),
      packageCount: quantity(changedProcurement, "rc12:fld-reagent-balance:package-count"),
      orderedKg: quantity(changedProcurement, "rc12:fld_reagent_order"),
      surplusKg: quantity(changedProcurement, "rc12:fld-reagent-balance:surplus-beyond-spare"),
    },
    conditional: { rowCount: conditional.rows.length, preliminaryNeedCount: 0 },
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-26.flushing-disinfection-automatic-successor.v1",
  stopCode: "S27_26_FLUSHING_DISINFECTION_AUTOMATIC",
  applicationName: "s27-26-flushing-disinfection-automatic-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (66).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "c0cc1dc8b4bccbd1025f6c78426bd4f3d3dd464254b2aa534fea0d8e576ff91b",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "43c8ff02-151b-594b-af61-1e19f8f51c59",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "068ec620-1436-53fb-8405-45121ce1cf50",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(".release-runtime/r568/s27-26/flushing-disinfection-automatic-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/flushing-disinfection-volume-automatic-s27-26.json",
    "src/lib/estimate/v4/automaticConstructionOwnerR1.ts",
    "src/lib/estimate/v4/flushingDisinfectionR1.ts",
    "tests/estimateNorms/flushingDisinfectionR1.contract.test.ts",
    "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.test.ts",
    "tests/requestEstimate/master30PromptOwnedProfessionalParameters.contract.test.ts",
    "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2726FlushingDisinfectionAutomaticSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2726FlushingDisinfectionAutomaticIndependent.ts",
  ],
  catalogId: FLUSHING_DISINFECTION_CATALOG_ID,
  sourceId: FLUSHING_DISINFECTION_SOURCE_ID,
  normId: FLUSHING_DISINFECTION_NORM_ID,
  sourceMetadata: FLUSHING_DISINFECTION_SOURCE_METADATA,
  parameterDefinitions: FLUSHING_DISINFECTION_PARAMETERS,
  formulaDefinitions: FLUSHING_DISINFECTION_FORMULAS,
  resourceDefinitions: FLUSHING_DISINFECTION_RESOURCES,
  shortInput: FLUSHING_DISINFECTION_SHORT_INPUT,
  acceptanceInput: FLUSHING_DISINFECTION_ACCEPTANCE_INPUT,
  runtimeProfileInput: FLUSHING_DISINFECTION_RUNTIME_INPUT,
  runtimeProfileClassification: FLUSHING_DISINFECTION_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: FLUSHING_DISINFECTION_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [6, 45, 45],
  benchmarkOrdinal: 69,
  validationScenario: "Q5_FLUSHING_DISINFECTION_AUTOMATIC_S27_26",
  passport: {
    canonicalRuName: "Промывка и дезинфекция питьевого водопровода",
    workKey: "flushing_disinfection",
    physicalResultRu: "Смонтированный и опрессованный трубопровод промыт, заполнен раствором гипохлорита, выдержан, повторно промыт, опробован, подтверждён лабораторией и передан оператору",
    includedScopeRu: [
      "расчёт внутреннего объёма, расхода и потребности в промывочной воде",
      "временные узлы наполнения, дозирования, сброса и отбора проб, рукава и арматура",
      "гипохлорит натрия, промывочные насосы, дозирующая установка и полевые приборы",
      "лабораторные пробы, СИЗ, расходники, труд, механизмы, протоколы и логистика",
      "подвоз воды, дехлорирование и вывоз стока только по условным проектным ветвям",
    ],
    excludedScopeRu: [
      "строительство трубопровода, земляные работы, поставка трубы, постоянная арматура, камеры и гидранты",
      "опрессовка, устранение утечек, постоянная станция хлорирования и контактный резервуар",
      "автоматический выбор санитарной дозы, выдержки или маршрута сброса",
    ],
  },
  applicability: {
    country: "KG",
    operationClass: "POTABLE_WATER_PIPELINE_FLUSHING_AND_DISINFECTION",
    executionAssembly: "INSTALLED_PRESSURE_TESTED_PIPELINE_NAOCL_VOLUME_METHOD",
    primaryMeasureParameterId: "fld_pipeline_length_m",
    knownScopeParameters: [...FLUSHING_DISINFECTION_KNOWN_SCOPE_PARAMETERS],
    ordinaryUserInputCount: Object.keys(FLUSHING_DISINFECTION_SHORT_INPUT).length,
    automaticVolumeWaterReagentTemporaryWorksLaborEquipmentLabAndProcurement: true,
    visibleEditablePreliminaryProfile: true,
    visibleReagentProcurementBalance: true,
    explicitInternalDiameterDoseConcentrationAndContactTimeRequired: true,
    conditionalWaterDeliveryDechlorinationAndDisposalFailClosed: true,
    derivedQuantitiesAsOrdinaryQuestionsForbidden: true,
    pipelineConstructionAndPressureTestingExcluded: true,
  },
  binding: {
    rowId: "rc12:fld_acceptance",
    applicability: {
      technology_class: "SODIUM_HYPOCHLORITE_PIPELINE_DISINFECTION",
      operation_class: "FLUSHING_DISINFECTION_SAMPLING_AND_HANDOVER",
      execution_assembly: "INSTALLED_PRESSURE_TESTED_PIPELINE_NAOCL_VOLUME_METHOD",
      scope_mode: "EIGHT_PRIMARY_FACTS_PLUS_VISIBLE_PROFILE_AND_AUTOMATIC_RESOURCE_GRAPH",
      source_id: FLUSHING_DISINFECTION_SOURCE_ID,
      norm_id: FLUSHING_DISINFECTION_NORM_ID,
      exact_locator: FLUSHING_DISINFECTION_SOURCE_METADATA.exact_locator,
      universal_productivity_claimed: false,
      universal_consumption_claimed: false,
      historical_project_rates_claimed: false,
      quantity_basis: "PRIMARY_PIPE_GEOMETRY_AND_PROJECT_DISINFECTION_METHOD_PLUS_VISIBLE_EDITABLE_PROFILE",
    },
  },
  locator: {
    key: "flushing-disinfection-volume-automatic-s27-26-v1",
    payload: {
      kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
      exactLocator: FLUSHING_DISINFECTION_SOURCE_METADATA.exact_locator,
      sourcePackSha256: FLUSHING_DISINFECTION_SOURCE_METADATA.artifact_sha256,
      ordinaryKnownInputs: Object.keys(FLUSHING_DISINFECTION_SHORT_INPUT),
      visibleEditableProfileInputs: Object.keys(FLUSHING_DISINFECTION_RUNTIME_INPUT),
      automaticFormulaIds: FLUSHING_DISINFECTION_FORMULAS.map((formula) => formula.formula_id),
      conditionalInputs: Object.keys(CONDITIONAL_INPUT),
    },
  },
  search: {
    primaryUom: "m",
    canonicalNameRu: "Промывка и дезинфекция питьевого водопровода",
    aliases: [
      "санитарная промывка водопровода",
      "обеззараживание трубопровода гипохлоритом натрия",
      "potable water main flushing disinfection",
    ],
    shortScopeRu: "Промывка и дезинфекция 1000 м водопровода ID100 по двум участкам гипохлоритом натрия 12,5%, активный хлор 50 мг/л, выдержка 24 ч; вода, реагент, насосы и пробы рассчитываются автоматически.",
    keyDistinguishingParameters: [...FLUSHING_DISINFECTION_KNOWN_SCOPE_PARAMETERS],
    clarificationFields: [],
    includedBoundaries: [
      "вода, реагент, временные соединения, рукава, арматура и промывочные насосы",
      "дозирование, выдержка, повторная промывка, полевые измерения и лабораторные пробы",
      "расходники, СИЗ, труд, механизмы, документация и логистика",
    ],
    excludedBoundaries: [
      "строительство и опрессовка трубопровода, постоянная арматура, камеры и гидранты",
      "станция хлорирования, контактный резервуар и неподтверждённый сброс",
    ],
    extraSearchTermsRu: "промывка дезинфекция обеззараживание водопровод гипохлорит отбор проб лаборатория",
    sourceProvenance: {
      exactExpandedFlushingDisinfectionOwner: true,
      eightPrimaryFactIngress: true,
      automaticVolumeWaterReagentTemporaryWorksLaborEquipmentLabAndProcurement: true,
      visiblePreliminaryProfileRequiresProjectConfirmation: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /trench|backfill|excavat|транше|засып/iu,
    /pipe[_. -]?supply|поставк\p{L}*\s+труб/iu,
    /hydrant|manhole|гидрант|колодц/iu,
    /pressure[_. -]?test|hydro[_. -]?test|опрессов|гидроиспыт/iu,
    /chlorination[_. -]?station|станц\p{L}*\s+хлорирован/iu,
  ],
  owner: "S27_26_FLUSHING_DISINFECTION_AUTOMATIC_SUCCESSOR",
  receiptFileStem: "S27_26_FLUSHING_DISINFECTION_AUTOMATIC",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
