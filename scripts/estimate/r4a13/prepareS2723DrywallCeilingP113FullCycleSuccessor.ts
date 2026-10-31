import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_CATALOG_ID,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_FORMULAS,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_INDEPENDENT_COMPLETENESS_MAP,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_NORM_ID,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_PARAMETERS,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_CLASSIFICATION,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_INPUT,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_SOURCE_IDS,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SHORT_INPUT,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_ID,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_METADATA,
  DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
  P113_SELECTED_SUPPLIES,
  compileDrywallCeilingP113FullCycleS2723,
  drywallCeilingP113FullCycleMissingRows,
} from "../../../src/lib/estimate/v4/drywallCeilingP113FullCycleS2723";
import { CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT } from
  "./catalogFirstEstimateMinimumInputAudit.shared";
import {
  runMasterSingleDefinitionSuccessorR1,
  validateIndependentCompletenessMapReferences,
} from "./prepareMasterSingleDefinitionSuccessorR1";
import { assertCanonicalPurchaseReadinessV1 } from "../../../src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";

type Json = Record<string, any>;

const currentReleasePath = resolve(
  process.env.R4A13_CURRENT_RELEASE_PATH
    ?? "data/estimate-benchmarks/r568-local-developer-canonical-release.json",
);
const currentRelease = JSON.parse(readFileSync(currentReleasePath, "utf8")) as {
  definitionReleaseId: string;
  searchReleaseId: string;
};
const resourceById = new Map(DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES.map((row) => [
  row.row_id,
  row,
]));

const perimeterRows = new Set([
  "ceiling-p113-full:02:material:pn-profile-pieces",
  "ceiling-p113-full:02:fastener:perimeter-packages",
  "ceiling-p113-full:02:consumable:sealing-tape-rolls",
  "ceiling-p113-full:02:operation:perimeter-installation",
  "ceiling-p113-full:04:material:separation-tape-rolls",
]);
const controlJointRows = new Set([
  "ceiling-p113-full:06:material:control-joint-pieces",
  "ceiling-p113-full:06:operation:control-joint-installation",
]);

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
  entries: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_INDEPENDENT_COMPLETENESS_MAP.entries.flatMap(
    (component) => component.requiredRowIds.map((rowId) => {
      const row = resourceById.get(rowId);
      const trace = (row?.source_metadata as Json | undefined)?.normativeTrace?.[0] as
        Json | undefined;
      return {
        operationId: component.semanticKey,
        expectedResourceId: rowId,
        condition: perimeterRows.has(rowId)
          ? "room_length_m and room_width_m supplied"
          : controlJointRows.has(rowId)
            ? "control_joint_length_m supplied; zero confirms not applicable"
            : "always in selected P113 full-cycle profile",
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
  const firstEstimate = await compileDrywallCeilingP113FullCycleS2723({
    ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SHORT_INPUT,
  });
  const complete = await compileDrywallCeilingP113FullCycleS2723({
    ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
  });
  const changed = await compileDrywallCeilingP113FullCycleS2723({
    ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
    area_m2: 600,
  });
  const accepted = await compileDrywallCeilingP113FullCycleS2723({ ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT }, {
    "ceiling-p113-full:02:material:pp-profile-pieces": { quantity: "510", provenance: { kind: "manual", reason: "VALIDATION_FIXTURE whole selected supply" } },
    "ceiling-p113-full:03:material:gsp-sheets": { quantity: "220", provenance: { kind: "manual", reason: "VALIDATION_FIXTURE whole selected supply" } },
  });
  const deficit = await compileDrywallCeilingP113FullCycleS2723({ ...DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT }, {
    "ceiling-p113-full:02:material:pp-profile-pieces": { quantity: "500", includedInProcurement: true, provenance: { kind: "manual", reason: "VALIDATION_FIXTURE negative selected supply" } },
    "ceiling-p113-full:03:material:gsp-sheets": { quantity: "210", includedInProcurement: true, provenance: { kind: "manual", reason: "VALIDATION_FIXTURE negative selected supply" } },
  });
  let shortageCode: unknown;
  try { assertCanonicalPurchaseReadinessV1(deficit.rows); } catch (error) { shortageCode = (error as { code?: unknown }).code; }
  const rowIds = new Set(complete.rows.map((row) => row.row_id));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_FORMULAS,
    resourceDefinitions: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES,
  });
  const expectedNeedIds = [
    ...perimeterRows,
    ...controlJointRows,
  ].sort();
  const assertions = {
    firstEstimateAppearsImmediately: firstEstimate.rows.length === 47,
    unknownGeometryRemainsVisible:
      JSON.stringify(firstEstimate.preliminaryNeeds.map((need) => need.row_id).sort())
      === JSON.stringify(expectedNeedIds),
    completeInputHasAllRows: complete.rows.length === 54 && complete.preliminaryNeeds.length === 0,
    eightVisibleStages: new Set(complete.rows.map((row) => row.section)).size === 8,
    procurementSubset: complete.rows.filter((row) => row.included_in_procurement).length === 28,
    unknownPricesRemainNull: complete.rows.every((row) =>
      row.unit_price == null && row.amount == null),
    independentMapComplete:
      drywallCeilingP113FullCycleMissingRows(rowIds).length === 0,
    publisherCompletenessMapValid: completenessErrors.length === 0,
    ppProfilePieces: quantity(complete.rows, "ceiling-p113-full:02:material:pp-profile-pieces") === 508,
    ppProfileRemainderM: quantity(complete.rows, "ceiling-p113-full:02:control:pp-profile-remainder") === 74,
    boardSheets: quantity(complete.rows, "ceiling-p113-full:03:material:gsp-sheets") === 219,
    boardRemainderM2: quantity(complete.rows, "ceiling-p113-full:03:control:gsp-remainder") === 25.6,
    tn25Packages: quantity(complete.rows, "ceiling-p113-full:03:fastener:tn25-packages") === 12,
    jointCompoundBags: quantity(complete.rows, "ceiling-p113-full:04:material:joint-compound-bags") === 9,
    jointTapeRolls: quantity(complete.rows, "ceiling-p113-full:04:material:joint-tape-rolls") === 9,
    primerCans: quantity(complete.rows, "ceiling-p113-full:05:material:primer-cans") === 6,
    perimeterM: quantity(complete.rows, "ceiling-p113-full:02:operation:perimeter-installation") === 90,
    areaChangeRecalculates:
      quantity(changed.rows, "ceiling-p113-full:02:material:pp-profile-pieces") === 609
      && quantity(changed.rows, "ceiling-p113-full:03:material:gsp-sheets") === 263,
    acceptedOrderControls: quantity(accepted.rows, "ceiling-p113-full:02:control:pp-profile-order") === 1530
      && quantity(accepted.rows, "ceiling-p113-full:02:control:pp-profile-remainder") === 80
      && quantity(accepted.rows, "ceiling-p113-full:03:control:gsp-order") === 528
      && quantity(accepted.rows, "ceiling-p113-full:03:control:gsp-remainder") === 28,
    shortageDespitePhysicalExcess: shortageCode === "PROCUREMENT_MATERIAL_SHORTAGE"
      && quantity(deficit.rows, "ceiling-p113-full:02:control:pp-profile-remainder") === 50
      && quantity(deficit.rows, "ceiling-p113-full:03:control:gsp-remainder") === 4,
    exactWholeSupplies: P113_SELECTED_SUPPLIES.length === 17
      && DRYWALL_CEILING_P113_FULL_CYCLE_S2723_PARAMETERS.filter(parameter => parameter.truth_metadata?.visibility_role === "INTERNAL_ONLY").length === 5,
  };
  const failed = Object.entries(assertions).filter(([, value]) => !value).map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(`STOP_S27_23_DRYWALL_P113_FULL_CYCLE_CORE:${failed.join(",")}`);
  }
  for (const component of DRYWALL_CEILING_P113_FULL_CYCLE_S2723_INDEPENDENT_COMPLETENESS_MAP.entries) {
    for (const requiredRowId of component.requiredRowIds) {
      const mutated = new Set(rowIds);
      mutated.delete(requiredRowId);
      if (!drywallCeilingP113FullCycleMissingRows(mutated).includes(requiredRowId)) {
        throw new Error(`STOP_S27_23_DRYWALL_P113_REMOVAL_MUTATION:${requiredRowId}`);
      }
    }
  }
  return {
    status: "GREEN_S27_23_DRYWALL_CEILING_P113_500M2_FULL_CYCLE_CORE",
    assertions,
    firstEstimate: {
      rowCount: firstEstimate.rows.length,
      preliminaryNeedCount: firstEstimate.preliminaryNeeds.length,
      procurementRowCount: firstEstimate.rows.filter((row) => row.included_in_procurement).length,
    },
    completeEstimate: {
      rowCount: complete.rows.length,
      preliminaryNeedCount: complete.preliminaryNeeds.length,
      procurementRowCount: complete.rows.filter((row) => row.included_in_procurement).length,
    },
    serializedSha256: createHash("sha256").update(JSON.stringify({
      firstEstimate,
      complete,
      changed,
    })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-23.drywall-ceiling-p113-full-cycle-successor.v1",
  stopCode: "S27_23_DRYWALL_CEILING_P113_FULL_CYCLE",
  applicationName: "s27-23-drywall-ceiling-p113-full-cycle-successor",
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
    ?? ".release-runtime/r568/s27-31/p113-accepted-order-current"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/drywall-ceiling-p113-full-cycle-s27-23.json",
    "src/lib/estimate/v4/drywallCeilingP113FullCycleS2723.ts",
    "tests/estimateNorms/drywallCeilingP113FullCycleS2723.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723DrywallCeilingP113FullCycleSuccessor.ts",
    "scripts/estimate/r4a13/readbackS2731P113AcceptedOrderIndependent.ts",
    "src/lib/estimate/backendPlatform/canonicalPurchaseBalanceV1.ts",
    "src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  ],
  catalogId: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_CATALOG_ID,
  sourceId: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_ID,
  normId: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_NORM_ID,
  sourceMetadata: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_METADATA,
  parameterDefinitions: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_PARAMETERS,
  formulaDefinitions: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_FORMULAS,
  resourceDefinitions: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES,
  shortInput: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SHORT_INPUT,
  acceptanceInput: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_ACCEPTANCE_INPUT,
  runtimeProfileInput: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_INPUT,
  runtimeProfileClassification: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [38, 38, 54],
  benchmarkOrdinal: 10,
  validationScenario: "S27_23_DRYWALL_CEILING_P113_FULL_CYCLE_500_M2",
  passport: {
    canonicalRuName: "полное устройство подвесного потолка КНАУФ П 113",
    workKey: "drywall_ceiling_interior_drywall_ceiling_install_standard",
    physicalResultRu:
      "Смонтированный и подготовленный под последующую декоративную отделку плоский подвесной потолок П 113: каркас, однослойная обшивка ГСП, заделанные стыки и крепёж, отшлифованная и загрунтованная поверхность.",
    includedScopeRu: [
      "проверка фронта, разметка, каркас П 113 с отдельными профилями, подвесами, анкерами, соединителями и крепежом",
      "однослойная обшивка ГСП 12,5 мм, раскрой, подъём, крепление и контроль каркаса перед закрытием",
      "шпаклёвка стыков и крепежа, бумажная армирующая и разделительная ленты, шлифование, обеспыливание и грунтование",
      "видимая расчётная потребность, выбранный плановый запас, целые единицы поставки и принятый заказ; прогнозное превышение длины, площади, массы или объёма не объявляется пригодным складским остатком",
      "трудовые операции, механизмы, средство доступа, доставка, возврат, вывоз отходов и итоговый контроль",
      "периметральные материалы и деформационный шов остаются видимыми уточнениями, пока геометрия неизвестна",
    ],
    excludedScopeRu: [
      "окраска или иное декоративное финишное покрытие",
      "тепло- и звукоизоляция, специальные огнестойкие и влажностные варианты, если они не выбраны проектом",
      "неподтверждённые цены, конкретные SKU и несущая способность узлов",
      "выдуманная длина, ширина помещения или длина деформационного шва по одной площади",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "DRYWALL_FLAT_CEILING_COMPLETE_INSTALLATION",
    systemClass: "KNAUF_P113_SINGLE_LEVEL_ONE_LAYER_12_5_MM_PRELIMINARY",
    primaryMeasureParameterId: "area_m2",
    selectedPreliminaryProfile: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    unknownGeometryCreatesVisibleDependentNeeds: true,
    profileAssumptionsVisibleAndEditable: true,
    noArtificialRowQuotaOrCap: true,
    acceptedOrderBalanceScope: "new_order_vs_required_consumption",
    requirementBasis: "selected_order_including_contingency",
    wholeSelectedSupplyOwners: 17,
    warehouseStockCredited: false,
  },
  binding: {
    rowId: "ceiling-p113-full:03:material:gsp-sheets",
    applicability: {
      technology_class: "KNAUF_P113_SINGLE_LEVEL_METAL_FRAME_COMPLETE_CEILING",
      source_id: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_ID,
      norm_id: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_NORM_ID,
      exact_locator: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_METADATA.exact_locator,
      quantity_basis: "AREA_TIMES_MANUFACTURER_RATE_TIMES_VISIBLE_RESERVE_ROUNDED_TO_SELECTED_SHEET_FORMAT",
      assumption_policy: "VISIBLE_EDITABLE_AND_REPLACEABLE_BY_PROJECT_LAYOUT_PPR_AND_SELECTED_PRODUCT_PACKAGING",
    },
  },
  locator: {
    key: "drywall-ceiling-p113-accepted-order-s27-31",
    payload: {
      kind: "MANUFACTURER_SYSTEM_TECHNOLOGY_MAP",
      sourcePackSha256: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
      officialTechnicalSheet: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_METADATA.official_url,
      independentCompletenessMap: true,
      expectedResourceIds: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_RESOURCES.map(row => row.row_id),
      expectedFormulaIds: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_FORMULAS.map(row => row.formula_id),
      selectedSupplyOwnerIds: P113_SELECTED_SUPPLIES.map(supply => `ceiling-p113-full:${supply.rowId}`),
      effectiveOutputBindings: P113_SELECTED_SUPPLIES.filter(supply => "effective" in supply).map(supply => ({
        ownerRowId: `ceiling-p113-full:${supply.rowId}`, parameterId: "effective" in supply ? supply.effective : "", unitId: "item" })),
      effectiveControlRowIds: ["02:control:pp-profile-order", "02:control:pp-profile-remainder", "03:control:gsp-order", "03:control:gsp-remainder",
        "04:control:joint-compound-remainder", "04:control:joint-tape-remainder", "05:control:primer-remainder"].map(id => `ceiling-p113-full:${id}`),
      balanceBoundary: "Selected whole units of supply versus unchanged planned order; no warehouse credit, no retained reserve or reusable-cut claim. Delivery remains the explicit project/profile fact.",
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "полное устройство подвесного потолка КНАУФ П 113",
    aliases: [
      "потолок ГКЛ 500 м2 полный цикл",
      "монтаж потолка КНАУФ П113 с каркасом обшивкой и швами",
      "одноуровневый гипсокартонный потолок под отделку",
    ],
    shortScopeRu:
      "Полный маршрут П 113: каркас, ГСП, крепёж, стыки, шлифование, грунтование, механизмы, логистика и целые единицы принятого заказа; неизвестный периметр остаётся уточнением, пригодность прогнозного превышения не подтверждена.",
    keyDistinguishingParameters: [
      "area_m2",
      "room_length_m",
      "room_width_m",
      "control_joint_length_m",
      "selected_system_reference",
    ],
    clarificationFields: ["room_length_m", "room_width_m", "control_joint_length_m"],
    includedBoundaries: [
      "54 строки полного применимого состава после ввода геометрии",
      "47 рассчитанных строк и 7 видимых уточнений при известной только площади",
      "расчётная потребность, выбранный плановый запас, целый принятый заказ, видимый дефицит и прогнозное превышение поставки",
    ],
    excludedBoundaries: ["декоративная окраска", "специальные варианты вне выбранной системы"],
    extraSearchTermsRu:
      "потолок гипсокартон гкл гсп п113 профиль пп 60x27 пн 28x27 подвес анкер соединитель шуруп tn ln фуген лента тифенгрунд",
    sourceProvenance: {
      sourcePackSha256: DRYWALL_CEILING_P113_FULL_CYCLE_S2723_SOURCE_PACK_SHA256,
      masterEdition: "S27.23",
      officialManufacturerTable: "KNAUF P11 technical sheet 02/2025 table 2",
      firstEstimateFromAreaAndVisibleProfile: true,
      unknownGeometryNotInvented: true,
      independentRequiredComposition: true,
      removalMutationVerified: true,
      reducedAggregateScopeReplaced: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:bridge|asphalt|foundation|hvac|sprinkler|fire-alarm)/iu,
    /(?:мостов|асфальт|фундамент|вентиляц|пожарн.*сигнализац)/iu,
  ],
  owner: "S27_23_DRYWALL_CEILING_P113_FULL_CYCLE_SUCCESSOR",
  receiptFileStem: "S27_23_DRYWALL_CEILING_P113_FULL_CYCLE",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
