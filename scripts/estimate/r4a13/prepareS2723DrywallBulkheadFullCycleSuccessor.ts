import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  S2723_BULKHEAD_FULL_CYCLE_ACCEPTANCE_INPUT,
  S2723_BULKHEAD_FULL_CYCLE_CATALOG_ID,
  S2723_BULKHEAD_FULL_CYCLE_NORM_ID,
  S2723_BULKHEAD_FULL_CYCLE_REQUIRED_ROW_GROUPS,
  S2723_BULKHEAD_FULL_CYCLE_ROWS,
  S2723_BULKHEAD_FULL_CYCLE_RUNTIME_CLASSIFICATION,
  S2723_BULKHEAD_FULL_CYCLE_RUNTIME_PROFILE_INPUT,
  S2723_BULKHEAD_FULL_CYCLE_RUNTIME_SOURCE_IDS,
  S2723_BULKHEAD_FULL_CYCLE_SHORT_INPUT,
  S2723_BULKHEAD_FULL_CYCLE_SOURCE_ID,
  S2723_BULKHEAD_FULL_CYCLE_SOURCE_METADATA,
  S2723_BULKHEAD_FULL_CYCLE_SOURCE_PACK_SHA256,
  compileS2723BulkheadFullCycleProfile,
} from "../r5/s2723BulkheadFullCycleProfile";
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
const resourceById = new Map(S2723_BULKHEAD_FULL_CYCLE_ROWS.resourceDefinitions.map((row) => [
  row.row_id,
  row,
]));

const publisherCompletenessMap = Object.freeze({
  contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: S2723_BULKHEAD_FULL_CYCLE_SOURCE_PACK_SHA256,
  entries: Object.entries(S2723_BULKHEAD_FULL_CYCLE_REQUIRED_ROW_GROUPS).flatMap(
    ([group, rowIds]) => rowIds.map((rowId) => {
      const row = resourceById.get(rowId);
      const sourceIds = (row?.source_metadata as Json | undefined)?.sourceIds;
      return {
        operationId: `bulkhead-full:${group}`,
        expectedResourceId: rowId,
        condition: "always in selected complete standard bulkhead profile",
        sourceId: String(Array.isArray(sourceIds) ? sourceIds[0] ?? "" : ""),
        formulaId: String(row?.formula_id ?? ""),
        resolution: { kind: "ROW", rowId },
      };
    }),
  ),
});

function quantity(rows: readonly Json[], suffix: string): number {
  return Number(rows.find((row) => row.row_id.endsWith(`:${suffix}`))?.quantity);
}

async function verifyCore(): Promise<Json> {
  const first = await compileS2723BulkheadFullCycleProfile({
    submittedParameters: S2723_BULKHEAD_FULL_CYCLE_SHORT_INPUT,
  });
  const changed = await compileS2723BulkheadFullCycleProfile({
    submittedParameters: { area_m2: 60, bulkhead_length_m: 24 },
  });
  const reinforced = await compileS2723BulkheadFullCycleProfile({
    submittedParameters: { area_m2: 50, reinforcement_profile_length_m: 6 },
  });
  const rowIds = new Set(first.rows.map((row) => row.row_id));
  const requiredRowIds = Object.values(S2723_BULKHEAD_FULL_CYCLE_REQUIRED_ROW_GROUPS).flat();
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: publisherCompletenessMap,
    formulaDefinitions: S2723_BULKHEAD_FULL_CYCLE_ROWS.formulaDefinitions,
    resourceDefinitions: S2723_BULKHEAD_FULL_CYCLE_ROWS.resourceDefinitions,
  });
  const assertions = {
    firstEstimateAppearsImmediately:
      first.rows.length === 53 && first.preliminaryNeeds.length === 0,
    completeResourceGroups: requiredRowIds.every((rowId) => rowIds.has(rowId)),
    publisherCompletenessMapValid: completenessErrors.length === 0,
    procurementSubset:
      first.rows.filter((row) => row.included_in_procurement).length === 28,
    unknownPricesRemainNull:
      first.rows.every((row) => row.unit_price == null && row.amount == null),
    frameQuantities:
      quantity(first.rows, "longitudinal_profile_packages") === 28
      && quantity(first.rows, "horizontal_profile_packages") === 22
      && quantity(first.rows, "vertical_profile_packages") === 15
      && quantity(first.rows, "profile_intersection_connectors") === 164
      && quantity(first.rows, "structural_support_anchors") === 96,
    claddingQuantities:
      quantity(first.rows, "board_sheets") === 22
      && quantity(first.rows, "board_net_m2") === 50
      && quantity(first.rows, "board_order_m2") === 52.8
      && quantity(first.rows, "board_remainder_m2") === 2.8
      && quantity(first.rows, "board_screw_packages") === 2,
    completionQuantities:
      quantity(first.rows, "external_corner_profiles") === 14
      && quantity(first.rows, "joint_compound_bags") === 1
      && quantity(first.rows, "joint_tape_rolls") === 1
      && quantity(first.rows, "separation_tape_rolls") === 1
      && quantity(first.rows, "primer_cans") === 1
      && quantity(first.rows, "abrasive_items") === 2,
    editRecalculatesFrameAndFinish:
      quantity(changed.rows, "longitudinal_profile_packages") === 34
      && quantity(changed.rows, "board_sheets") === 27
      && quantity(changed.rows, "external_corner_profiles") === 17
      && quantity(changed.rows, "joint_compound_bags") === 2
      && quantity(changed.rows, "joint_tape_rolls") === 2,
    reinforcementRemainsConditional:
      !first.rows.some((row) => row.row_id.endsWith(":opening_reinforcement_profile_packages"))
      && quantity(reinforced.rows, "opening_reinforcement_profile_packages") === 3
      && quantity(reinforced.rows, "opening_reinforcement_installation") === 6,
    sharedLogisticsOwnedOnce:
      first.rows.filter((row) => row.row_id.endsWith(":material_delivery")).length === 1
      && first.rows.filter((row) => row.row_id.endsWith(":waste_removal")).length === 1,
  };
  const failed = Object.entries(assertions).filter(([, value]) => !value).map(([key]) => key);
  if (failed.length > 0) {
    throw new Error(`STOP_S27_23_DRYWALL_BULKHEAD_FULL_CYCLE_CORE:${failed.join(",")}`);
  }
  for (const requiredRowId of requiredRowIds) {
    const mutated = new Set(rowIds);
    mutated.delete(requiredRowId);
    if (mutated.has(requiredRowId)) {
      throw new Error(`STOP_S27_23_DRYWALL_BULKHEAD_REMOVAL_MUTATION:${requiredRowId}`);
    }
  }
  return {
    status: "GREEN_S27_23_DRYWALL_BULKHEAD_50M2_FULL_CYCLE_CORE",
    assertions,
    firstEstimate: {
      rowCount: first.rows.length,
      preliminaryNeedCount: first.preliminaryNeeds.length,
      procurementRowCount: first.rows.filter((row) => row.included_in_procurement).length,
      sectionCount: new Set(first.rows.map((row) => row.section)).size,
    },
    serializedSha256: createHash("sha256").update(JSON.stringify({
      first,
      changed,
      reinforced,
    })).digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-23.drywall-bulkhead-full-cycle-successor.v1",
  stopCode: "S27_23_DRYWALL_BULKHEAD_FULL_CYCLE",
  applicationName: "s27-23-drywall-bulkhead-full-cycle-successor",
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
    ?? ".release-runtime/r568/s27-23/drywall-bulkhead-full-cycle-successor"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/drywall-ceiling-bulkhead-frame-50m2-preliminary-profile-r1.json",
    "data/estimate-benchmarks/source-packs/drywall-ceiling-p113-full-cycle-s27-23.json",
    "scripts/estimate/r5/s2721BulkheadFramePreliminaryProfile.ts",
    "src/lib/estimate/v4/drywallCeilingP113FullCycleS2723.ts",
    "scripts/estimate/r5/s2723BulkheadFullCycleProfile.ts",
    "tests/estimateNorms/drywallBulkheadFullCycleS2723.contract.test.ts",
    "tests/estimateNorms/masterSingleDefinitionFormulaConsistency.contract.test.ts",
    "scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2723DrywallBulkheadFullCycleSuccessor.ts",
  ],
  catalogId: S2723_BULKHEAD_FULL_CYCLE_CATALOG_ID,
  sourceId: S2723_BULKHEAD_FULL_CYCLE_SOURCE_ID,
  normId: S2723_BULKHEAD_FULL_CYCLE_NORM_ID,
  sourceMetadata: S2723_BULKHEAD_FULL_CYCLE_SOURCE_METADATA,
  parameterDefinitions: S2723_BULKHEAD_FULL_CYCLE_ROWS.parameterDefinitions,
  formulaDefinitions: S2723_BULKHEAD_FULL_CYCLE_ROWS.formulaDefinitions,
  resourceDefinitions: S2723_BULKHEAD_FULL_CYCLE_ROWS.resourceDefinitions,
  shortInput: S2723_BULKHEAD_FULL_CYCLE_SHORT_INPUT,
  acceptanceInput: S2723_BULKHEAD_FULL_CYCLE_ACCEPTANCE_INPUT,
  runtimeProfileInput: S2723_BULKHEAD_FULL_CYCLE_RUNTIME_PROFILE_INPUT,
  runtimeProfileClassification: S2723_BULKHEAD_FULL_CYCLE_RUNTIME_CLASSIFICATION,
  runtimeProfileSourceIds: S2723_BULKHEAD_FULL_CYCLE_RUNTIME_SOURCE_IDS,
  verifyCore,
  expectedParentShape: [22, 10, 10],
  benchmarkOrdinal: 11,
  validationScenario: "S27_23_DRYWALL_BULKHEAD_FULL_CYCLE_50_M2",
  passport: {
    canonicalRuName: "полное устройство потолочного короба из гипсокартона стандартного исполнения",
    workKey: "drywall_ceiling_interior_bulkhead_install_standard",
    physicalResultRu:
      "Смонтированный короб: полный каркас, однослойная обшивка ГСП, защищённые углы, заделанные стыки и крепёж, отшлифованная и загрунтованная поверхность Q2 под декоративную отделку.",
    includedScopeRu: [
      "разметка, направляющие и несущие профили, подвесы, соединители, анкеры и профильный крепёж",
      "раскрой и однослойная обшивка ГСП всех граней короба с шурупами TN",
      "углозащитные профили, шпаклёвка стыков и крепежа, бумажная и разделительная ленты",
      "шлифование, обеспыливание, грунтование и контроль готовности поверхности Q2",
      "видимые чистая потребность, резерв, число упаковок, заказ и остаток",
      "труд, средство доступа, монтажный и шлифовальный инструмент, доставка и единый вывоз отходов",
    ],
    excludedScopeRu: [
      "декоративная окраска или иное финишное покрытие",
      "специальная влажностная, огнестойкая, звукоизоляционная или многослойная система без выбора проекта",
      "неподтверждённые цены, SKU и несущая способность основания",
      "отдельная frame-only работа вместо полного устройства короба",
    ],
    independentCompletenessMap: publisherCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "DRYWALL_BULKHEAD_COMPLETE_INSTALLATION",
    systemClass: "STANDARD_SINGLE_LAYER_12_5_MM_VISIBLE_PRELIMINARY_PROFILE",
    primaryMeasureParameterId: "area_m2",
    selectedPreliminaryProfile: S2723_BULKHEAD_FULL_CYCLE_NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisibleAndEditable: true,
    completeWorkNotFrameOnly: true,
    noArtificialRowQuotaOrCap: true,
  },
  binding: {
    rowId:
      "drywall_ceiling_interior_bulkhead_install_standard:s2723-full:row:board_sheets",
    applicability: {
      technology_class: "DRYWALL_BULKHEAD_COMPLETE_INSTALLATION",
      source_id: S2723_BULKHEAD_FULL_CYCLE_SOURCE_ID,
      norm_id: S2723_BULKHEAD_FULL_CYCLE_NORM_ID,
      exact_locator: S2723_BULKHEAD_FULL_CYCLE_SOURCE_METADATA.exact_locator,
      quantity_basis:
        "DEVELOPED_AREA_TIMES_VISIBLE_SYSTEM_RATES_WITH_PACKAGING_AND_EDITABLE_GEOMETRY",
      assumption_policy:
        "VISIBLE_EDITABLE_AND_REPLACEABLE_BY_PROJECT_LAYOUT_AND_SELECTED_PRODUCT_SYSTEM",
    },
  },
  locator: {
    key: "drywall-bulkhead-full-cycle-s27-23",
    payload: {
      kind: "COMBINED_FRAME_AND_MANUFACTURER_FINISH_TECHNOLOGY_MAP",
      sourcePackSha256: S2723_BULKHEAD_FULL_CYCLE_SOURCE_PACK_SHA256,
      independentCompletenessMap: true,
      replacesReducedTenRowAggregate: true,
      preservesSeparateFrameOnlyOwner: true,
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu:
      "полное устройство потолочного короба из гипсокартона стандартного исполнения",
    aliases: [
      "полное устройство потолочного короба из гипсокартона 50 м2",
      "короб ГКЛ 50 м2 каркас обшивка углы швы грунтовка",
      "монтаж потолочного короба под отделку полный цикл",
    ],
    shortScopeRu:
      "Полный короб: каркас, обшивка, крепёж, углы, стыки, шлифование, грунтование, инструмент, логистика, упаковки и остатки.",
    keyDistinguishingParameters: [
      "area_m2",
      "bulkhead_length_m",
      "bottom_face_width_m",
      "side_face_height_m",
      "support_point_count",
      "selected_board_system_reference",
    ],
    clarificationFields: [
      "bulkhead_length_m",
      "bottom_face_width_m",
      "side_face_height_m",
      "support_point_count",
      "selected_board_system_reference",
      "selected_joint_system_reference",
    ],
    includedBoundaries: [
      "53 строки применимого полного состава для 50 м2",
      "28 закупочных строк с упаковками и остатками",
      "отдельные frame-only и complete-installation владельцы не смешиваются",
    ],
    excludedBoundaries: [
      "декоративная окраска",
      "невыбранные специальные системы",
      "frame-only объём",
    ],
    extraSearchTermsRu:
      "короб гипсокартон гкл гсп полный монтаж каркас профиль обшивка шуруп tn угол лента шпаклевка грунтовка q2",
    sourceProvenance: {
      sourcePackSha256: S2723_BULKHEAD_FULL_CYCLE_SOURCE_PACK_SHA256,
      masterEdition: "S27.23",
      firstEstimateFromAreaAndVisibleProfile: true,
      independentRequiredComposition: true,
      reducedAggregateScopeReplaced: true,
      frameOnlyOwnerPreserved: true,
    },
  },
  forbiddenAdjacentMatchers: [
    /(?:bridge|asphalt|foundation|hvac|sprinkler|fire-alarm)/iu,
    /(?:мостов|асфальт|фундамент|вентиляц|пожарн.*сигнализац)/iu,
  ],
  owner: "S27_23_DRYWALL_BULKHEAD_FULL_CYCLE_SUCCESSOR",
  receiptFileStem: "S27_23_DRYWALL_BULKHEAD_FULL_CYCLE",
}).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
