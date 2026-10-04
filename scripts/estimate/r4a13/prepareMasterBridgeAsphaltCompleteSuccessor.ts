import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  BRIDGE_ASPHALT_COMPLETE_ACCEPTANCE_INPUT,
  BRIDGE_ASPHALT_COMPLETE_CATALOG_ID,
  BRIDGE_ASPHALT_COMPLETE_FORMULAS,
  BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP,
  BRIDGE_ASPHALT_COMPLETE_NORM_ID,
  BRIDGE_ASPHALT_COMPLETE_PARAMETERS,
  BRIDGE_ASPHALT_COMPLETE_RESOURCES,
  BRIDGE_ASPHALT_COMPLETE_RUNTIME_CLASSIFICATION,
  BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT,
  BRIDGE_ASPHALT_COMPLETE_RUNTIME_SOURCE_IDS,
  BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT,
  BRIDGE_ASPHALT_COMPLETE_SOURCE_ID,
  BRIDGE_ASPHALT_COMPLETE_SOURCE_METADATA,
  BRIDGE_ASPHALT_COMPLETE_SOURCE_PACK_SHA256,
  compileBridgeAsphaltCompletePreliminaryProfileR1,
} from "../../../src/lib/estimate/v4/bridgeAsphaltCompletePreliminaryProfileR1";
import {
  runMasterSingleDefinitionSuccessorR1,
  validateIndependentCompletenessMapReferences,
} from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

function quantity(rows: readonly Json[], rowId: string): number {
  return Number(rows.find((row) => row.row_id === rowId)?.quantity);
}

const currentReleasePath = resolve(process.env.R4A13_CURRENT_RELEASE_PATH
  ?? "data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as Json;

async function verifyCore(): Promise<Json> {
  const firstEstimate = await compileBridgeAsphaltCompletePreliminaryProfileR1({
    ...BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT,
  });
  const hundredSquareMetres = await compileBridgeAsphaltCompletePreliminaryProfileR1({
    area_m2: 100,
    bridge_length_m: 20,
    bridge_width_m: 5,
  });
  const incompatibleCover = await compileBridgeAsphaltCompletePreliminaryProfileR1({
    area_m2: 100,
    bridge_length_m: 20,
    bridge_width_m: 5,
    bridge_spacer_height_mm: 30,
  });
  const refined = await compileBridgeAsphaltCompletePreliminaryProfileR1({
    ...BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT,
    wearing_layer_thickness_mm: 60,
    bridge_primer_l_per_m2: 0.35,
  });
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP,
    formulaDefinitions: BRIDGE_ASPHALT_COMPLETE_FORMULAS,
    resourceDefinitions: BRIDGE_ASPHALT_COMPLETE_RESOURCES,
  });
  if (completenessErrors.length > 0) {
    throw new Error(`STOP_S27_BRIDGE_COMPLETE_INDEPENDENT_MAP:${completenessErrors.join(",")}`);
  }

  const requiredRows = [...new Set(BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP.entries
    .filter((entry) => entry.resolution.kind !== "NOT_APPLICABLE")
    .map((entry) => String(entry.resolution.rowId ?? entry.resolution.parentRowId ?? ""))
    .filter(Boolean))];
  for (const removedRowId of requiredRows) {
    const errors = validateIndependentCompletenessMapReferences({
      completenessMap: BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP,
      formulaDefinitions: BRIDGE_ASPHALT_COMPLETE_FORMULAS,
      resourceDefinitions: BRIDGE_ASPHALT_COMPLETE_RESOURCES.filter(
        (resource) => resource.row_id !== removedRowId,
      ),
    });
    if (!errors.some((error) => /_(?:ROW|PARENT_ROW)_REFERENCE$/u.test(error))) {
      throw new Error(`STOP_S27_BRIDGE_COMPLETE_REMOVAL_NOT_DETECTED:${removedRowId}`);
    }
  }

  const expected = {
    binderMixT: 579.84,
    wearingMixT: 579.84,
    screedConcreteM3: 207.36,
    reinforcementMeshKg: 21_312,
    membraneM2: 5_376,
    primerL: 1_440,
    membraneRolls: 703,
    meshCards: 972,
    meshPurchasedAreaM2: 5_832,
    meshCoverClearanceMm: 3,
    screwPackages: 15,
    formworkStakes: 364,
    formworkBraces: 243,
    continuousTackL: 2_880,
    drainageOutlets: 5,
    levelingAreaM2: 0,
  };
  const actual = {
    binderMixT: quantity(firstEstimate.rows, "bridge:binder:asphalt:material:hot-dense-fine-mix"),
    wearingMixT: quantity(firstEstimate.rows, "bridge:wearing:asphalt:material:hot-dense-fine-mix"),
    screedConcreteM3: quantity(firstEstimate.rows, "bridge:screed:material:ready-mix"),
    reinforcementMeshKg: quantity(firstEstimate.rows, "bridge:screed:reinforcement-mesh"),
    membraneM2: quantity(firstEstimate.rows, "bridge:waterproofing:membrane"),
    primerL: quantity(firstEstimate.rows, "bridge:waterproofing:primer"),
    membraneRolls: quantity(firstEstimate.rows, "bridge:waterproofing:membrane-rolls"),
    meshCards: quantity(firstEstimate.rows, "bridge:screed:reinforcement-mesh-cards"),
    meshPurchasedAreaM2: quantity(firstEstimate.rows, "bridge:screed:reinforcement-mesh-purchased-area"),
    meshCoverClearanceMm: quantity(firstEstimate.rows, "bridge:screed:mesh-cover-compatibility"),
    screwPackages: quantity(firstEstimate.rows, "bridge:screed:formwork-screw-boxes"),
    formworkStakes: quantity(firstEstimate.rows, "bridge:screed:formwork-stakes"),
    formworkBraces: quantity(firstEstimate.rows, "bridge:screed:formwork-braces"),
    continuousTackL: quantity(firstEstimate.rows, "bridge:asphalt:continuous-tack-emulsion"),
    drainageOutlets: quantity(firstEstimate.rows, "bridge:drainage:tubes"),
    levelingAreaM2: quantity(firstEstimate.rows, "bridge:leveling:applicability"),
  };
  if (!(firstEstimate.preliminaryNeeds.length === 0
    && firstEstimate.rows.length === BRIDGE_ASPHALT_COMPLETE_RESOURCES.length - 4
    && firstEstimate.rows.every((row) => Number(row.quantity) > 0
      || row.row_id === "bridge:leveling:applicability")
    && Object.entries(expected).every(([key, value]) =>
      Math.abs(Number(actual[key as keyof typeof actual]) - value) < 0.000001))) {
    throw new Error(`STOP_S27_BRIDGE_COMPLETE_FIRST_ESTIMATE:${JSON.stringify(actual)}`);
  }
  const hundredSquareMetresActual = {
    membraneRolls: quantity(hundredSquareMetres.rows, "bridge:waterproofing:membrane-rolls"),
    meshCards: quantity(hundredSquareMetres.rows, "bridge:screed:reinforcement-mesh-cards"),
    meshPurchasedAreaM2: quantity(hundredSquareMetres.rows, "bridge:screed:reinforcement-mesh-purchased-area"),
    meshCoverClearanceMm: quantity(hundredSquareMetres.rows, "bridge:screed:mesh-cover-compatibility"),
    screwPackages: quantity(hundredSquareMetres.rows, "bridge:screed:formwork-screw-boxes"),
    formworkStakes: quantity(hundredSquareMetres.rows, "bridge:screed:formwork-stakes"),
    formworkBraces: quantity(hundredSquareMetres.rows, "bridge:screed:formwork-braces"),
    continuousTackL: quantity(hundredSquareMetres.rows, "bridge:asphalt:continuous-tack-emulsion"),
    drainageOutlets: quantity(hundredSquareMetres.rows, "bridge:drainage:tubes"),
  };
  const hundredSquareMetresExpected = {
    membraneRolls: 15,
    meshCards: 22,
    meshPurchasedAreaM2: 132,
    meshCoverClearanceMm: 3,
    screwPackages: 2,
    formworkStakes: 50,
    formworkBraces: 34,
    continuousTackL: 60,
    drainageOutlets: 1,
  };
  if (!Object.entries(hundredSquareMetresExpected).every(([key, value]) =>
    Math.abs(Number(hundredSquareMetresActual[key as keyof typeof hundredSquareMetresActual]) - value)
      < 0.000001)) {
    throw new Error(`STOP_S27_BRIDGE_COMPLETE_100_M2:${JSON.stringify(hundredSquareMetresActual)}`);
  }
  if (quantity(incompatibleCover.rows, "bridge:screed:mesh-cover-compatibility") !== -12) {
    throw new Error("STOP_S27_BRIDGE_COMPLETE_INCOMPATIBLE_COVER_NOT_DETECTED");
  }
  if (!(quantity(refined.rows, "bridge:wearing:asphalt:material:hot-dense-fine-mix") === 696
    && quantity(refined.rows, "bridge:waterproofing:primer") === 1_680
    && quantity(refined.rows, "bridge:binder:asphalt:material:hot-dense-fine-mix") === 579.84)) {
    throw new Error("STOP_S27_BRIDGE_COMPLETE_REFINEMENT");
  }

  const detailedLedger = firstEstimate.rows.map((row) => {
    const definition = BRIDGE_ASPHALT_COMPLETE_RESOURCES.find((resource) =>
      resource.row_id === row.row_id)!;
    const trace = Array.isArray(row.normative_trace) ? row.normative_trace[0] as Json : {};
    return {
      rowId: row.row_id,
      titleRu: row.title_ru,
      category: row.category,
      unitId: row.unit_id,
      quantity: row.quantity,
      formulaId: definition.formula_id,
      sourceId: trace?.sourceId ?? trace?.source_id ?? null,
      exactLocator: trace?.exact_locator ?? null,
      procurementEligible: row.procurement_eligible,
      includedInEstimate: row.included_in_estimate,
      costTreatment: (row.calculation_trace as Json)?.resourceGraph?.costTreatment ?? null,
    };
  });
  const categoryCounts = detailedLedger.reduce((counts, row) => ({
    ...counts,
    [String(row.category)]: Number(counts[String(row.category)] ?? 0) + 1,
  }), {} as Record<string, number>);
  const serialized = JSON.stringify({
    firstEstimate,
    refined,
    detailedLedger,
    independentCompletenessMap: BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP,
  });
  return {
    status: "GREEN_S27_BRIDGE_ASPHALT_COMPLETE_CORE",
    scenarioBoundary: {
      input: BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT,
      selectedProfile: "complete 150 by 32 m bridge-deck pavement system",
      visibleReplaceableAssumptions: BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT,
      excludedAdjacentScope: [
        "bridge structural repair unless separately selected",
        "bridge foundations and bearing replacement",
        "deck widening and drainage reconstruction",
      ],
    },
    actualComposition: {
      definitionRowCount: BRIDGE_ASPHALT_COMPLETE_RESOURCES.length,
      applicableCalculatedRowCount: detailedLedger.length,
      conditionalNotApplicableRowCount: BRIDGE_ASPHALT_COMPLETE_RESOURCES.length - detailedLedger.length,
      categoryCounts,
      preliminaryNeedCount: firstEstimate.preliminaryNeeds.length,
      independentlyRequiredComponentCount:
        BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP.entries.length,
      removalMutationCount: requiredRows.length,
      removalMutationsDetected: requiredRows.length,
      detailedLedger,
    },
    quantities: actual,
    hundredSquareMetres: hundredSquareMetresActual,
    compatibilityMutation: {
      spacerHeightMm: 30,
      clearanceMm: quantity(incompatibleCover.rows, "bridge:screed:mesh-cover-compatibility"),
      incompatible: true,
    },
    refinement: {
      wearingLayerThicknessMm: 60,
      primerRateLPerM2: 0.35,
      wearingMixT: quantity(refined.rows, "bridge:wearing:asphalt:material:hot-dense-fine-mix"),
      primerL: quantity(refined.rows, "bridge:waterproofing:primer"),
    },
    sourcePackSha256: BRIDGE_ASPHALT_COMPLETE_SOURCE_PACK_SHA256,
    serializedSha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-19.master-bridge-asphalt-complete-successor.v6",
  stopCode: "S27_BRIDGE_ASPHALT_COMPLETE",
  applicationName: "s27-master-bridge-asphalt-complete-successor-v6",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (71).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "783d0425e1f0f0f0ea8a262be454e39d13e94e1a2ad5d1c6cc4b1e1314e624f1",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? currentRelease.definitionReleaseId,
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? currentRelease.searchReleaseId,
  currentReleasePath,
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-31/MasterBridgeAsphaltCompleteSuccessor-ancillary-orders"),
  sourcePaths: [
    "scripts/estimate/r4a13/readbackS2731AncillaryMaterialOrdersIndependent.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    "src/lib/estimate/v4/asphaltInstallLargeAreaKrer27ProfileR1.ts",
    "src/lib/estimate/v4/stripFoundationConcretePlacementPreliminaryProfileR1.ts",
    "data/estimate-benchmarks/source-packs/bridge-asphalt-complete-preliminary-profile-r1.json",
    "src/lib/estimate/v4/bridgeAsphaltCompletePreliminaryProfileR1.ts",
    "tests/estimateNorms/bridgeAsphaltCompletePreliminaryProfileR1.contract.test.ts",
    "src/features/consumerRepair/RequestEstimateItemsEditor.tsx",
    "src/features/consumerRepair/ConsumerRepairItemRow.tsx",
    "src/features/consumerRepair/requestEstimateViewModel.ts",
    "tests/requestEstimate/requestEstimateCategoryFiltersDurable.contract.test.tsx",
    "src/lib/estimate/professionalBoqDepthPolicy.ts",
    "src/lib/estimate/professionalBoqSectionPolicy.ts",
    "tests/requestEstimate/realNamedBoqGroupedUi.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareMasterBridgeAsphaltCompleteSuccessor.ts",
  ],
  catalogId: process.env.S27_BRIDGE_TARGET_CATALOG_ID ?? BRIDGE_ASPHALT_COMPLETE_CATALOG_ID,
  sourceId: BRIDGE_ASPHALT_COMPLETE_SOURCE_ID,
  normId: BRIDGE_ASPHALT_COMPLETE_NORM_ID,
  sourceMetadata: BRIDGE_ASPHALT_COMPLETE_SOURCE_METADATA,
  parameterDefinitions: BRIDGE_ASPHALT_COMPLETE_PARAMETERS,
  formulaDefinitions: BRIDGE_ASPHALT_COMPLETE_FORMULAS,
  resourceDefinitions: BRIDGE_ASPHALT_COMPLETE_RESOURCES,
  shortInput: BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT,
  acceptanceInput: BRIDGE_ASPHALT_COMPLETE_ACCEPTANCE_INPUT,
  runtimeProfileInput: BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT,
  runtimeProfileClassification: BRIDGE_ASPHALT_COMPLETE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: BRIDGE_ASPHALT_COMPLETE_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: (process.env.S27_BRIDGE_EXPECTED_PARENT_SHAPE
    ?.split(",").map(Number) ?? [103, 100, 198]) as [number, number, number],
  benchmarkOrdinal: 0,
  validationScenario: "S27_BRIDGE_ASPHALT_COMPLETE_150X32_M_FIRST_ESTIMATE",
  passport: {
    canonicalRuName: "Устройство полной системы асфальтобетонного покрытия мостового полотна",
    workKey: "bridge_asphalt",
    physicalResultRu: "На мостовом полотне 150 × 32 м выполнена полная система подготовки, гидроизоляции, армированной защитной стяжки, двух слоёв асфальтобетона, сопряжений, контроля и исполнительной документации",
    includedScopeRu: [
      "приёмка, механическая очистка, обеспыливание и сушка мостовой плиты",
      "праймер, рулонная мостовая гидроизоляция, детали, газ, труд и оборудование наплавления",
      "армированная защитная бетонная стяжка 40 мм: бетон, сетка, проволока, фиксаторы, бортовая опалубка, труд, техника, доставка и контроль",
      "нижний и верхний слои асфальтобетона с отдельными материалами, работами, механизмами, доставкой и контролем",
      "герметизация сопряжений деформационных швов, геодезия, лабораторный контроль и исполнительный комплект",
      "первая смета рассчитывается автоматически; проектные значения и ручные количества остаются редактируемыми",
    ],
    excludedScopeRu: [
      "ремонт несущей мостовой плиты, опор, пролётного строения и фундаментов без отдельного выбора",
      "замена деформационного шва как изделия, мостовой дренаж и расширение полотна без отдельного выбора",
      "неподтверждённые цены; их отсутствие не блокирует количественную смету и подтверждение",
    ],
    independentCompletenessMap: BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP,
  },
  applicability: {
    country: "KG",
    operationClass: "COMPLETE_BRIDGE_DECK_ASPHALT_PAVEMENT_SYSTEM",
    constructionState: "BRIDGE_DECK_ACCEPTED_FOR_PAVEMENT_SYSTEM",
    primaryMeasureParameterId: "area_m2",
    geometryParameters: ["area_m2", "bridge_length_m", "bridge_width_m"],
    selectedPreliminaryProfile: BRIDGE_ASPHALT_COMPLETE_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisibleAndEditable: true,
    independentRequiredComposition: true,
    noArtificialRowQuotaOrCap: true,
  },
  binding: {
    rowId: "bridge:binder:asphalt:material:hot-dense-fine-mix",
    applicability: {
      technology_class: "COMPLETE_BRIDGE_DECK_PAVEMENT_SYSTEM",
      source_id: BRIDGE_ASPHALT_COMPLETE_SOURCE_ID,
      norm_id: BRIDGE_ASPHALT_COMPLETE_NORM_ID,
      exact_locator: BRIDGE_ASPHALT_COMPLETE_SOURCE_METADATA.exact_locator,
      assumption_policy: "VISIBLE_EDITABLE_AND_REPLACEABLE_BY_PROJECT_PPR_PRODUCTS_AND_QUALITY_PLAN",
    },
  },
  locator: {
    key: "bridge-asphalt-complete-preliminary-profile-r5-ancillary-orders-s27-31",
    payload: {
      ancillaryOrderRowIds: ["bridge:binder:asphalt:material:road-bitumen", "bridge:binder:asphalt:material:technical-kerosene", "bridge:binder:asphalt:material:hardwood-side-stop-bars", "bridge:wearing:asphalt:material:road-bitumen", "bridge:wearing:asphalt:material:technical-kerosene", "bridge:wearing:asphalt:material:hardwood-side-stop-bars", "bridge:screed:material:curing-sheet", "bridge:screed:joint:waterstop"],
      expectedResourceIds: BRIDGE_ASPHALT_COMPLETE_RESOURCES.map(row => row.row_id),
      expectedFormulaIds: BRIDGE_ASPHALT_COMPLETE_FORMULAS.map(row => row.formula_id),
      kind: "COMPOSED_NORMATIVE_TECHNOLOGY_MAP",
      sourcePackSha256: BRIDGE_ASPHALT_COMPLETE_SOURCE_PACK_SHA256,
      exactLocator: BRIDGE_ASPHALT_COMPLETE_SOURCE_METADATA.exact_locator,
      selectedGeometry: "150 m × 32 m = 4800 m2",
      independentCompletenessMap: true,
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "устройство полной системы асфальтобетонного покрытия мостового полотна",
    aliases: [
      "асфальтобетонное покрытие моста",
      "асфальтирование моста",
      "покрытие моста 150 на 32 метра",
      "гидроизоляция стяжка и асфальт на мосту",
      "полная смета мостового покрытия",
      "bridge deck asphalt pavement system",
    ],
    shortScopeRu: "Полная система мостового покрытия: подготовка плиты, праймер, гидроизоляция, армированная защитная стяжка, два слоя асфальта, швы, доставка, механизмы, контроль и документы.",
    keyDistinguishingParameters: [
      "area_m2",
      "bridge_length_m",
      "bridge_width_m",
      "protective_screed_thickness_mm",
      "binder_layer_thickness_mm",
      "wearing_layer_thickness_mm",
    ],
    clarificationFields: [],
    includedBoundaries: [
      "мостовая плита принята для устройства системы покрытия",
      "гидроизоляция, защитная армированная стяжка и два слоя асфальтобетона",
      "материалы, работы, механизмы, доставка, услуги и контроль раскрыты отдельными строками",
    ],
    excludedBoundaries: [
      "ремонт несущих конструкций и фундаментов",
      "реконструкция дренажа и замена деформационных швов как изделий",
    ],
    extraSearchTermsRu: "мост покрытие асфальт гидроизоляция праймер мембрана защитная стяжка арматурная сетка каток асфальтоукладчик доставка контроль",
    sourceProvenance: {
      sourcePackSha256: BRIDGE_ASPHALT_COMPLETE_SOURCE_PACK_SHA256,
      masterEdition: "S27.19",
      firstEstimateFromGeometryAndVisibleProfile: true,
      independentRequiredComposition: true,
      removalMutationVerified: true,
      noMandatoryProfessionalQuestionnaire: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:bridge-foundation|bearing-replacement|deck-widening|drainage-reconstruction)/iu,
    /(?:фундамент.*мост|замена.*опорн|расширение.*полотн|реконструкц.*дренаж)/iu,
  ],
  owner: "S27_BRIDGE_ASPHALT_COMPLETE_SUCCESSOR",
  receiptFileStem: "S27_BRIDGE_ASPHALT_COMPLETE",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
