import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  SLAB_FOUNDATION_FULL_CYCLE_S2719_ACCEPTANCE_INPUT,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_CATALOG_ID,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_FORMULAS,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_INDEPENDENT_COMPLETENESS_MAP,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_PARAMETERS,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_CLASSIFICATION,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_SOURCE_IDS,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_SHORT_INPUT,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_ID,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_METADATA,
  SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
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

// The required row identities and stage ownership originate in the independently
// authored source pack. Formula/source links are attached here so the generic
// publisher can also prove that every independent requirement resolves exactly.
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
  const firstEstimate = await compileSlabFoundationFullCycleS2719(
    SLAB_FOUNDATION_FULL_CYCLE_S2719_SHORT_INPUT,
  );
  const thicker = await compileSlabFoundationFullCycleS2719({
    slab_area_m2: 500,
    slab_thickness_mm: 250,
  });
  const explicitPerimeter = await compileSlabFoundationFullCycleS2719({
    slab_area_m2: 500,
    plan_perimeter_m: 120,
  });
  const noDrainage = await compileSlabFoundationFullCycleS2719({
    slab_area_m2: 500,
    drainage_selected: false,
  });
  const rowIds = new Set(firstEstimate.rows.map((row) => row.row_id));
  const missing = slabFullCycleMissingRequiredRows(rowIds);
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: SLAB_FOUNDATION_FULL_CYCLE_S2719_FORMULAS,
    resourceDefinitions: SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES,
  });
  const assertions = {
    noPreliminaryNeeds: firstEstimate.preliminaryNeeds.length === 0,
    independentCompositionComplete: missing.length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    twelveVisibleStages: new Set(firstEstimate.rows.map((row) => row.section)).size === 12,
    readyMixM3: quantity(firstEstimate.rows, "slab-full:09:material:ready-mix") === 108,
    reinforcementD12Kg: quantity(firstEstimate.rows, "slab-full:08:material:rebar-d12") === 10_368,
    reinforcementD16Kg: quantity(firstEstimate.rows, "slab-full:08:material:rebar-d16") === 2_592,
    geotextileRolls: quantity(firstEstimate.rows,
      "slab-full:03:material:separation-geotextile-rolls") === 6,
    membraneRolls: quantity(firstEstimate.rows, "slab-full:06:material:membrane-rolls") === 55,
    xpsPackages: quantity(firstEstimate.rows, "slab-full:06:material:xps-packages") === 122,
    testLots: quantity(firstEstimate.rows, "slab-full:11:consumable:test-sets") === 2,
    repairBags: quantity(firstEstimate.rows, "slab-full:12:material:repair-mortar-bags") === 4,
    thicknessRecalculatesConcrete:
      quantity(thicker.rows, "slab-full:09:material:ready-mix") === 135,
    thicknessRecalculatesReinforcement:
      quantity(thicker.rows, "slab-full:08:material:rebar-d12") === 12_960,
    perimeterRecalculatesPerimeterResources:
      quantity(explicitPerimeter.rows, "slab-full:01:material:marking-cord") === 240,
    perimeterDoesNotChangeAreaResources:
      quantity(explicitPerimeter.rows, "slab-full:09:material:ready-mix") === 108,
    conditionalDrainageCanBeRemoved: !noDrainage.rows.some((row) =>
      row.row_id === "slab-full:03:material:drain-pipe"),
    procurementIsPhysicalOnly: firstEstimate.rows.filter((row) => row.included_in_procurement)
      .every((row) => row.category === "material"),
  };
  const failed = Object.entries(assertions).filter(([, value]) => !value).map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(`STOP_S27_21_SLAB_FOUNDATION_FULL_CYCLE_CORE:${failed.join(",")}`);
  }
  for (const component of SLAB_FOUNDATION_FULL_CYCLE_S2719_INDEPENDENT_COMPLETENESS_MAP.entries) {
    for (const requiredRowId of component.requiredRowIds) {
      const mutated = new Set(rowIds);
      mutated.delete(requiredRowId);
      if (!slabFullCycleMissingRequiredRows(mutated).includes(requiredRowId)) {
        throw new Error(`STOP_S27_21_SLAB_FULL_REMOVAL_MUTATION:${requiredRowId}`);
      }
    }
  }
  return {
    status: "GREEN_S27_21_SLAB_FOUNDATION_500M2_FULL_CYCLE_CORE",
    assertions,
    applicableRowCount: firstEstimate.rows.length,
    definitionRowCount: SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES.length,
    procurementRowCount: firstEstimate.rows.filter((row) => row.included_in_procurement).length,
    independentComponentCount:
      SLAB_FOUNDATION_FULL_CYCLE_S2719_INDEPENDENT_COMPLETENESS_MAP.entries.length,
    independentRequiredRowCount: publisherCompletenessMap.entries.length,
    serializedSha256: createHash("sha256").update(JSON.stringify({
      firstEstimate,
      thicker,
      explicitPerimeter,
      noDrainage,
    })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-21.slab-foundation-full-cycle-successor.v2",
  stopCode: "S27_21_SLAB_FOUNDATION_FULL_CYCLE",
  applicationName: "s27-21-slab-foundation-full-cycle-successor-v2",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? currentRelease.definitionReleaseId,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? currentRelease.searchReleaseId,
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-21/slab-foundation-full-cycle-successor-v2"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/slab-foundation-full-cycle-s27-19.json",
    "src/lib/estimate/v4/slabFoundationFullCycleS2719.ts",
    "tests/estimateNorms/slabFoundationFullCycleS2719.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2721SlabFoundationFullCycleSuccessor.ts",
  ],
  catalogId: SLAB_FOUNDATION_FULL_CYCLE_S2719_CATALOG_ID,
  sourceId: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_ID,
  normId: SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID,
  sourceMetadata: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_METADATA,
  parameterDefinitions: SLAB_FOUNDATION_FULL_CYCLE_S2719_PARAMETERS,
  formulaDefinitions: SLAB_FOUNDATION_FULL_CYCLE_S2719_FORMULAS,
  resourceDefinitions: SLAB_FOUNDATION_FULL_CYCLE_S2719_RESOURCES,
  shortInput: SLAB_FOUNDATION_FULL_CYCLE_S2719_SHORT_INPUT,
  acceptanceInput: SLAB_FOUNDATION_FULL_CYCLE_S2719_ACCEPTANCE_INPUT,
  runtimeProfileInput: SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_INPUT,
  runtimeProfileClassification: SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: SLAB_FOUNDATION_FULL_CYCLE_S2719_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [78, 127, 109],
  benchmarkOrdinal: 0,
  validationScenario: "S27_21_SLAB_FOUNDATION_500_M2_FULL_CYCLE_FIRST_ESTIMATE",
  passport: {
    canonicalRuName: "Устройство монолитного плитного фундамента полного цикла",
    workKey: "concrete_foundation_interior_slab_foundation_pour_standard",
    physicalResultRu: "Завершённый монолитный железобетонный плитный фундамент с основанием, дренажом, подготовкой, гидроизоляцией, утеплением, опалубкой, армированием, бетонированием, уходом, контролем и сдачей.",
    includedScopeRu: [
      "подготовка площадки, разбивка, временная граница, земляные работы и вывоз",
      "геотекстиль, дренаж, песчано-щебёночное основание и бетонная подготовка",
      "гидроизоляция, XPS, опалубка, армирование, закладные и контур заземления",
      "бетонирование плиты, доставка, механизмы, уход, контроль качества и документы",
      "локальное устранение дефектов, обратная засыпка, уборка и демобилизация",
      "полная предварительная количественная смета и общая физическая закупка до уточнений",
    ],
    excludedScopeRu: [
      "расчёт несущей способности, проект КЖ, геотехнический отчёт и согласование инженерных решений",
      "неподтверждённые цены: их отсутствие не скрывает количественные строки и закупку",
      "свайное поле, ростверк и отдельные инженерные сети вне явно показанных закладных",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "SLAB_FOUNDATION_FULL_CYCLE",
    constructionState: "GREENFIELD_FOUNDATION_FOOTPRINT",
    primaryMeasureParameterId: "slab_area_m2",
    geometryParameters: ["slab_area_m2", "plan_perimeter_m", "slab_thickness_mm"],
    selectedPreliminaryProfile: SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisibleAndEditable: true,
    narrowModeRequiresExplicitUserChoice: true,
    noArtificialRowQuotaOrCap: true,
  },
  binding: {
    rowId: "slab-full:09:material:ready-mix",
    applicability: {
      technology_class: "MONOLITHIC_REINFORCED_CONCRETE_SLAB_FOUNDATION_FULL_CYCLE",
      source_id: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_ID,
      norm_id: SLAB_FOUNDATION_FULL_CYCLE_S2719_NORM_ID,
      exact_locator: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_METADATA.exact_locator,
      assumption_policy: "VISIBLE_EDITABLE_AND_REPLACEABLE_BY_GEOTECHNICAL_KZh_PPR_AND_SUPPLIER_DATA",
    },
  },
  locator: {
    key: "slab-foundation-full-cycle-s27-21-v2",
    payload: {
      kind: "COMPOSED_NORMATIVE_TECHNOLOGY_MAP",
      sourcePackSha256: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
      exactLocator: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_METADATA.exact_locator,
      selectedGeometry: "500 m2 slab with derived 90 m perimeter and 200 mm thickness",
      independentCompletenessMap: true,
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "устройство монолитного плитного фундамента полного цикла",
    aliases: [
      "плитный фундамент 500 м2 под ключ",
      "монолитная фундаментная плита полный цикл",
      "фундаментная плита с основанием гидроизоляцией и армированием",
      "полная смета плитного фундамента",
      "бетонирование плиты фундамента со всеми подготовительными работами",
    ],
    shortScopeRu: "Полный цикл плитного фундамента от подготовки площадки и основания до железобетонной плиты, ухода, контроля, ремонта и сдачи.",
    keyDistinguishingParameters: [
      "slab_area_m2",
      "plan_perimeter_m",
      "slab_thickness_mm",
      "excavation_depth_m",
      "curing_method",
    ],
    clarificationFields: [],
    includedBoundaries: [
      "подготовка, земляные работы, основание, дренаж, подготовка и изоляционные слои",
      "опалубка, бюджетное армирование, закладные, бетон, механизмы, доставка и контроль",
      "упаковки, остатки и физическая закупка показаны без двойного счёта",
    ],
    excludedBoundaries: [
      "проектирование КЖ и геотехническое обоснование",
      "сваи, ростверк и сети за пределами плиты",
    ],
    extraSearchTermsRu: "плита фундамент котлован геотекстиль дренаж песок щебень подбетонка гидроизоляция XPS опалубка арматура бетон уход контроль",
    sourceProvenance: {
      sourcePackSha256: SLAB_FOUNDATION_FULL_CYCLE_S2719_SOURCE_PACK_SHA256,
      masterEdition: "S27.21",
      firstEstimateFromAreaAndVisibleProfile: true,
      independentRequiredComposition: true,
      removalMutationVerified: true,
      structuralProfileExplicitlyPreliminary: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:bridge|asphalt|drywall|hvac|sprinkler|fire-alarm)/iu,
    /(?:мостов|асфальт|гипсокартон|вентиляц|пожарн.*сигнализац)/iu,
  ],
  owner: "S27_21_SLAB_FOUNDATION_FULL_CYCLE_SUCCESSOR",
  receiptFileStem: "S27_21_SLAB_FOUNDATION_FULL_CYCLE",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
