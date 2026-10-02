import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  SLAB_FOUNDATION_FULL_CYCLE_S2719_FORMULAS,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_INDEPENDENT_COMPLETENESS_MAP,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_PARAMETERS,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_CLASSIFICATION,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_SOURCE_IDS,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_ID,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_METADATA,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
  SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
  SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_CATALOG_ID,
  SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_RUNTIME_INPUT,
  compileSlabFoundationFullCycleS2719,
  slabFullCycleMissingRequiredRows,
} from "../../../src/lib/estimate/v4/slabFoundationFullCycleS2719";
import { CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT } from
  "./catalogFirstEstimateMinimumInputAudit.shared";
import {
  runMasterSingleDefinitionSuccessorR1,
  validateIndependentCompletenessMapReferences,
} from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const SHORT_INPUT = Object.freeze({ slab_area_m2: 150 });
const currentReleasePath = resolve(
  process.env.R4A13_CURRENT_RELEASE_PATH
    ?? "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId: string;
  searchReleaseId: string;
};
const resourceById = new Map(SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES.map((row) => [
  row.row_id,
  row,
]));

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
  entries: SLAB_FOUNDATION_FULL_CYCLE_S2719_INDEPENDENT_COMPLETENESS_MAP.entries.flatMap(
    (component) => component.requiredRowIds.map((rowId) => {
      const row = resourceById.get(rowId);
      const trace = (row?.source_metadata as Json | undefined)?.normativeTrace?.[0] as
        Json | undefined;
      return {
        operationId: component.semanticKey,
        expectedResourceId: rowId,
        condition: component.semanticKey === "stage03.drainage"
          ? "drainage_selected=true"
          : component.semanticKey === "stage06.waterproofing"
            ? "waterproofing_selected=true"
            : component.semanticKey === "stage06.insulation"
              ? "insulation_selected=true"
              : "always in selected full-cycle profile",
        sourceId: String(trace?.sourceId ?? ""),
        formulaId: String(row?.formula_id ?? ""),
        resolution: { kind: "ROW", rowId },
      };
    }),
  ),
});

function quantity(rows: readonly Json[], rowId: string): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
}

async function verifyCore(): Promise<Json> {
  const firstEstimate = await compileSlabFoundationFullCycleS2719(SHORT_INPUT, {
    catalogId: SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_CATALOG_ID,
  });
  const measuredRepair = await compileSlabFoundationFullCycleS2719(
    SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
    { catalogId: SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_CATALOG_ID },
  );
  const rowIds = new Set(measuredRepair.rows.map((row) => row.row_id));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: SLAB_FOUNDATION_FULL_CYCLE_S2719_FORMULAS,
    resourceDefinitions: SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES,
  });
  const assertions = {
    firstEstimateIsImmediate: firstEstimate.preliminaryNeeds.length === 0,
    measuredRepairHasNoPreliminaryNeeds: measuredRepair.preliminaryNeeds.length === 0,
    twelveVisibleStages: new Set(measuredRepair.rows.map((row) => row.section)).size === 12,
    completeIndependentMap: slabFullCycleMissingRequiredRows(rowIds).length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    fullScopeInsteadOfLegacyTwentyOneRows: measuredRepair.rows.length > 100,
    procurementIsAggregatedPhysicalMaterial:
      measuredRepair.rows.filter((row) => row.included_in_procurement).length === 46
      && measuredRepair.rows.filter((row) => row.included_in_procurement)
        .every((row) => row.category === "material"),
    readyMixM3: quantity(measuredRepair.rows, "slab-full:09:material:ready-mix") === 32.4,
    repairNetKg: quantity(measuredRepair.rows, "slab-full:12:control:repair-net") === 228,
    repairBags: quantity(measuredRepair.rows,
      "slab-full:12:material:repair-mortar-bags") === 10,
    repairMixingWaterL: quantity(measuredRepair.rows,
      "slab-full:12:consumable:repair-water") === 35.568,
    repairLaborHours: quantity(measuredRepair.rows,
      "slab-full:12:labor:defect-repair") === 12,
    repairEquipmentHours: quantity(measuredRepair.rows,
      "slab-full:12:equipment:repair-tools") === 3,
    reinforcementPresent: rowIds.has("slab-full:08:material:rebar-d12"),
    formworkPresent: rowIds.has("slab-full:07:material:formwork-panels"),
    excavationPresent: rowIds.has("slab-full:02:equipment:excavator"),
  };
  const failed = Object.entries(assertions).filter(([, value]) => !value).map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(`STOP_S27_23_SLAB_REPAIR_FULL_CYCLE_CORE:${failed.join(",")}`);
  }
  for (const component of SLAB_FOUNDATION_FULL_CYCLE_S2719_INDEPENDENT_COMPLETENESS_MAP.entries) {
    for (const requiredRowId of component.requiredRowIds) {
      const mutated = new Set(rowIds);
      mutated.delete(requiredRowId);
      if (!slabFullCycleMissingRequiredRows(mutated).includes(requiredRowId)) {
        throw new Error(`STOP_S27_23_SLAB_REPAIR_REMOVAL_MUTATION:${requiredRowId}`);
      }
    }
  }
  return {
    status: "GREEN_S27_23_SLAB_FOUNDATION_150M2_LOCAL_REPAIR_FULL_CYCLE_CORE",
    assertions,
    applicableRowCount: measuredRepair.rows.length,
    definitionRowCount: SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES.length,
    procurementRowCount: measuredRepair.rows.filter((row) => row.included_in_procurement).length,
    independentRequiredRowCount: publisherCompletenessMap.entries.length,
    serializedSha256: createHash("sha256").update(JSON.stringify({
      firstEstimate,
      measuredRepair,
    })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-23.slab-foundation-local-repair-full-cycle-successor.v1",
  stopCode: "S27_23_SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE",
  applicationName: "s27-23-slab-foundation-local-repair-full-cycle-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (63).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "e1c70828ba30bb4dae395c2766f8ff7e13467ec51592198f4722a64edf8126ca",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? currentRelease.definitionReleaseId,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? currentRelease.searchReleaseId,
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-23/slab-foundation-local-repair-full-cycle-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/slab-foundation-full-cycle-s27-19.json",
    "src/lib/estimate/v4/slabFoundationFullCycleS2719.ts",
    "tests/estimateNorms/slabFoundationFullCycleS2719.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723SlabFoundationLocalRepairFullCycleSuccessor.ts",
  ],
  catalogId: SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_CATALOG_ID,
  sourceId: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_ID,
  normId: SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID,
  sourceMetadata: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_METADATA,
  parameterDefinitions: SLAB_FOUNDATION_FULL_CYCLE_S2719_PARAMETERS,
  formulaDefinitions: SLAB_FOUNDATION_FULL_CYCLE_S2719_FORMULAS,
  resourceDefinitions: SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES,
  shortInput: SHORT_INPUT,
  acceptanceInput: SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
  runtimeProfileInput: SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_S2723_RUNTIME_INPUT,
  runtimeProfileClassification: SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [23, 18, 28],
  benchmarkOrdinal: 0,
  validationScenario: "S27_23_SLAB_FOUNDATION_150_M2_LOCAL_REPAIR_FULL_CYCLE",
  passport: {
    canonicalRuName: "Устройство монолитного плитного фундамента полного цикла с локальным ремонтом основания",
    workKey: "concrete_foundation_interior_slab_foundation_pour_repair",
    physicalResultRu:
      "Завершённый монолитный железобетонный плитный фундамент с подготовленным и локально отремонтированным основанием, изоляцией, опалубкой, армированием, бетонированием, уходом, контролем и сдачей.",
    includedScopeRu: [
      "подготовка площадки, разбивка, земляные работы, вывоз и устройство основания",
      "измеренный или видимый предварительный локальный ремонт основания с материалом, водой, трудом и механизмом",
      "дренаж, бетонная подготовка, гидроизоляция, XPS, опалубка и её комплектующие",
      "армирование, фиксаторы, вязка, закладные, бетон, подача, уплотнение и уход",
      "контроль качества, обратная засыпка, уборка, упаковки, остатки и общая закупка",
    ],
    excludedScopeRu: [
      "проект КЖ, геотехническое обоснование и утверждение несущей способности",
      "неподтверждённые цены и выдуманный SKU для проектно-зависимых материалов",
      "сваи, ростверк и инженерные сети вне явно показанных закладных",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "SLAB_FOUNDATION_FULL_CYCLE_WITH_LOCAL_BASE_REPAIR",
    constructionState: "GREENFIELD_FOUNDATION_FOOTPRINT_WITH_LOCAL_REPAIR",
    primaryMeasureParameterId: "slab_area_m2",
    geometryParameters: [
      "slab_area_m2",
      "plan_perimeter_m",
      "slab_thickness_mm",
      "repair_area_ratio",
      "repair_depth_mm",
    ],
    selectedPreliminaryProfile: SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisibleAndEditable: true,
    localRepairGeometryRemainsLocallyEditable: true,
    noArtificialRowQuotaOrCap: true,
  },
  binding: {
    rowId: "slab-full:12:material:repair-mortar-bags",
    applicability: {
      technology_class: "MONOLITHIC_REINFORCED_CONCRETE_SLAB_FOUNDATION_FULL_CYCLE_WITH_LOCAL_REPAIR",
      source_id: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_ID,
      norm_id: SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID,
      exact_locator: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_METADATA.exact_locator,
      quantity_basis: "SLAB_AREA_TIMES_VISIBLE_REPAIR_RATIO_TIMES_DEPTH_TIMES_PRODUCT_RATE_ROUNDED_TO_BAGS",
      assumption_policy: "VISIBLE_EDITABLE_AND_REPLACEABLE_BY_MEASURED_REPAIR_MAP_GEOTECHNICAL_KZh_PPR_AND_SUPPLIER_DATA",
    },
  },
  locator: {
    key: "slab-foundation-local-repair-full-cycle-s27-23",
    payload: {
      kind: "COMPOSED_NORMATIVE_TECHNOLOGY_MAP",
      sourcePackSha256: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
      selectedGeometry: "150 m2 slab; 6 m2 measured repair represented by 4% ratio; 20 mm repair depth",
      independentCompletenessMap: true,
      replacesReducedPlacementOnlyScope: true,
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "устройство плитного фундамента полного цикла с локальным ремонтом основания",
    aliases: [
      "плитный фундамент 150 м2 с локальным ремонтом основания",
      "бетонирование плитного фундамента с локальным ремонтом основания",
      "фундаментная плита с ремонтом основания полный цикл",
      "полная смета плиты с ремонтом основания",
    ],
    shortScopeRu:
      "Полный цикл плитного фундамента от площадки и основания до железобетонной плиты, локального ремонта, ухода, контроля и сдачи.",
    keyDistinguishingParameters: [
      "slab_area_m2",
      "repair_area_ratio",
      "repair_depth_mm",
      "slab_thickness_mm",
      "curing_method",
    ],
    clarificationFields: ["repair_area_ratio", "repair_depth_mm"],
    includedBoundaries: [
      "все 12 этапов полного плитного фундамента и локальный ремонт основания",
      "материалы, комплектующие, крепёж, расходники, труд, механизмы, доставка и контроль",
      "автоматические количества, упаковки, остатки и физическая закупка",
    ],
    excludedBoundaries: [
      "проектирование КЖ и геотехническое обоснование",
      "сваи, ростверк и внешние инженерные сети",
    ],
    extraSearchTermsRu:
      "плита фундамент локальный ремонт основание котлован геотекстиль дренаж песок щебень подбетонка гидроизоляция XPS опалубка арматура бетон уход",
    sourceProvenance: {
      sourcePackSha256: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
      masterEdition: "S27.23",
      firstEstimateFromAreaAndVisibleProfile: true,
      independentRequiredComposition: true,
      removalMutationVerified: true,
      structuralProfileExplicitlyPreliminary: true,
      legacyPlacementOnlyScopeReplaced: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:bridge|asphalt|drywall|hvac|sprinkler|fire-alarm)/iu,
    /(?:мостов|асфальт|гипсокартон|вентиляц|пожарн.*сигнализац)/iu,
  ],
  owner: "S27_23_SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE_SUCCESSOR",
  receiptFileStem: "S27_23_SLAB_FOUNDATION_LOCAL_REPAIR_FULL_CYCLE",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
