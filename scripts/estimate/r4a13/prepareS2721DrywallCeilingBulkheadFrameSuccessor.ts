import { createHash } from "node:crypto";
import { resolve } from "node:path";

import sourcePack from "../../../data/estimate-benchmarks/source-packs/drywall-ceiling-bulkhead-frame-50m2-preliminary-profile-r1.json";
import {
  S2721_BULKHEAD_FRAME_CATALOG_ID,
  S2721_BULKHEAD_FRAME_RUNTIME_PROFILE_INPUT,
  S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID,
  S2721_BULKHEAD_FRAME_SOURCE_ID,
  S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
  buildS2721BulkheadFrameCanonicalRows,
  compileS2721BulkheadFrameProfile,
} from "../r5/s2721BulkheadFramePreliminaryProfile";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const NORM_ID = "profile:drywall-ceiling-bulkhead-frame:50m2-preliminary:r1";
const projection = buildS2721BulkheadFrameCanonicalRows();
const runtimeProfileInput = S2721_BULKHEAD_FRAME_RUNTIME_PROFILE_INPUT;

const runtimeProfileClassification = Object.fromEntries(
  Object.keys(runtimeProfileInput).map((parameterId) => [
    parameterId,
    [
      "bulkhead_length_m",
      "bottom_face_width_m",
      "side_face_height_m",
      "side_face_count",
      "longitudinal_line_count",
      "cross_member_spacing_m",
    ].includes(parameterId)
      ? "DERIVED"
      : "ASSUMPTION",
  ]),
) as Record<string, "ASSUMPTION" | "DERIVED">;

const runtimeProfileSourceIds = Object.fromEntries(
  Object.keys(runtimeProfileInput).map((parameterId) => [parameterId, [S2721_BULKHEAD_FRAME_SOURCE_ID]]),
);

const sourceMetadata = {
  source_title: "Предварительный профиль каркаса потолочного короба 50 м²",
  source_authority: "MASTER S27.21 A6 и явные заменяемые предпосылки предварительного профиля",
  source_document_version: "DRYWALL_CEILING_BULKHEAD_FRAME_50M2_PRELIMINARY_PROFILE_R1_2026-09-30",
  definition_hash: S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
  source_kind: "USER_SCOPE_WITH_VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
  official_url: null,
  artifact_sha256: S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
  effective_from: "2026-09-30",
  exact_locator: sourcePack.sources.map((source) => source.exactLocator).join("; "),
  use_restriction: sourcePack.scope,
};

const independentCompletenessMap = {
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "PROJECT_SYSTEM",
  generatedFromCurrentRows: false,
  evidenceSha256: S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
  sourcePackPath: "data/estimate-benchmarks/source-packs/drywall-ceiling-bulkhead-frame-50m2-preliminary-profile-r1.json",
  entries: [...sourcePack.requiredComposition, ...sourcePack.conditionalComposition].map((component) => ({
    operationId: "FRAME_ONLY_BULKHEAD_50M2_PRELIMINARY",
    expectedResourceId: `required-component:${component.rowKey}`,
    category: component.category,
    specification: component.rowKey,
    condition: "condition" in component ? component.condition : "ALWAYS",
    sourceId: S2721_BULKHEAD_FRAME_SOURCE_ID,
    quantityRule: "quantityBasis" in component ? component.quantityBasis : component.condition,
    formulaId: `${S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID}:s2721:formula:${component.rowKey}`,
    resolution: {
      kind: "ROW",
      rowId: `${S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID}:s2721:row:${component.rowKey}`,
    },
  })),
};

function quantityByKey(result: Awaited<ReturnType<typeof compileS2721BulkheadFrameProfile>>, key: string): string | undefined {
  return result.rows.find((row) =>
    row.row_id === `${S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID}:s2721:row:${key}`
  )?.quantity;
}

async function verifyCore(): Promise<Json> {
  const firstEstimate = await compileS2721BulkheadFrameProfile({
    values: { ...runtimeProfileInput, area_m2: 50 },
  });
  const requiredRowIds = sourcePack.requiredComposition.map((component) =>
    `${S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID}:s2721:row:${component.rowKey}`
  );
  const actualRowIds = firstEstimate.rows.map((row) => row.row_id).sort();
  if (!(firstEstimate.preliminaryNeeds.length === 0
    && firstEstimate.rows.length === 29
    && JSON.stringify(actualRowIds) === JSON.stringify([...requiredRowIds].sort())
    && firstEstimate.rows.every((row) => Number(row.quantity) > 0))) {
    throw new Error("STOP_S2721_BULKHEAD_FRAME_FIRST_ESTIMATE");
  }
  for (const rowId of requiredRowIds) {
    const mutated = new Set(actualRowIds);
    mutated.delete(rowId);
    if (!requiredRowIds.filter((requiredRowId) => !mutated.has(requiredRowId)).includes(rowId)) {
      throw new Error(`STOP_S2721_BULKHEAD_FRAME_REMOVAL_MUTATION:${rowId}`);
    }
  }
  if (!(quantityByKey(firstEstimate, "longitudinal_profile_installation") === "80"
    && quantityByKey(firstEstimate, "horizontal_profile_installation") === "61.5"
    && quantityByKey(firstEstimate, "vertical_profile_installation") === "41"
    && quantityByKey(firstEstimate, "profile_intersection_connectors") === "164"
    && quantityByKey(firstEstimate, "suspension_hangers") === "96"
    && quantityByKey(firstEstimate, "structural_support_anchors") === "96"
    && quantityByKey(firstEstimate, "longitudinal_profile_packages") === "28"
    && quantityByKey(firstEstimate, "horizontal_profile_packages") === "22"
    && quantityByKey(firstEstimate, "vertical_profile_packages") === "15")) {
    throw new Error("STOP_S2721_BULKHEAD_FRAME_CONTROL_QUANTITIES");
  }
  const spacingRecalculation = await compileS2721BulkheadFrameProfile({
    operation: "recalculate",
    values: { ...runtimeProfileInput, area_m2: 50, cross_member_spacing_m: 0.4 },
  });
  if (!(quantityByKey(spacingRecalculation, "profile_intersection_connectors") === "204"
    && quantityByKey(spacingRecalculation, "suspension_hangers") === "96"
    && quantityByKey(spacingRecalculation, "structural_support_anchors") === "96")) {
    throw new Error("STOP_S2721_BULKHEAD_FRAME_SUPPORT_INDEPENDENCE");
  }
  const withReinforcement = await compileS2721BulkheadFrameProfile({
    operation: "recalculate",
    values: { ...runtimeProfileInput, area_m2: 50, reinforcement_profile_length_m: 6 },
  });
  if (!(withReinforcement.rows.length === 31
    && quantityByKey(withReinforcement, "opening_reinforcement_profile_packages") === "3"
    && quantityByKey(withReinforcement, "opening_reinforcement_installation") === "6")) {
    throw new Error("STOP_S2721_BULKHEAD_FRAME_REINFORCEMENT_BRANCH");
  }
  return {
    status: "GREEN_S2721_DRYWALL_CEILING_BULKHEAD_FRAME_CORE",
    firstEstimate: {
      rowCount: firstEstimate.rows.length,
      procurementRowCount: firstEstimate.rows.filter((row) => row.procurement_eligible).length,
      developedAreaM2: 50,
      longitudinalProfileNetM: 80,
      horizontalProfileNetM: 61.5,
      verticalProfileNetM: 41,
      crossSectionCount: 41,
      profileIntersectionCount: 164,
      separatelySelectedSupportPointCount: 96,
    },
    supportIndependence: {
      changedSpacingM: 0.4,
      profileIntersectionCount: 204,
      unchangedSupportPointCount: 96,
    },
    conditionalReinforcement: { lengthM: 6, rowCount: withReinforcement.rows.length },
    sourcePackSha256: S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
    compiledSha256: createHash("sha256")
      .update(JSON.stringify({ firstEstimate, spacingRecalculation, withReinforcement }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-21.master-drywall-ceiling-bulkhead-frame-successor.v1",
  stopCode: "S2721_DRYWALL_CEILING_BULKHEAD_FRAME",
  applicationName: "s27-21-drywall-ceiling-bulkhead-frame-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "2755673a-ef8f-5453-a01e-c6c3975eab7e",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "e13e142e-417e-536c-adf6-39129023b820",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-21/drywall-ceiling-bulkhead-frame-successor-v1"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/drywall-ceiling-bulkhead-frame-50m2-preliminary-profile-r1.json",
    "scripts/estimate/r5/s2721BulkheadFramePreliminaryProfile.ts",
    "tests/aiEstimateV4/s2721BulkheadFramePreliminaryProfile.contract.test.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2721DrywallCeilingBulkheadFrameSuccessor.ts",
  ],
  catalogId: S2721_BULKHEAD_FRAME_CATALOG_ID,
  sourceId: S2721_BULKHEAD_FRAME_SOURCE_ID,
  normId: NORM_ID,
  sourceMetadata,
  parameterDefinitions: projection.parameterDefinitions,
  formulaDefinitions: projection.formulaDefinitions,
  resourceDefinitions: projection.resourceDefinitions,
  shortInput: { area_m2: 50 },
  acceptanceInput: { ...runtimeProfileInput, area_m2: 50 },
  runtimeProfileInput,
  runtimeProfileClassification,
  runtimeProfileSourceIds,
  verifyCore,
  expectedParentShape: [41, 17, 16],
  benchmarkOrdinal: 7,
  validationScenario: "S27_21_DRYWALL_CEILING_BULKHEAD_FRAME_50_M2_FRAME_ONLY",
  passport: {
    canonicalRuName: "Каркас потолочного короба 50 м²",
    workKey: S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID,
    physicalResultRu: "Размеченный, собранный, закреплённый и выверенный металлический каркас потолочного короба без листовой обшивки и отделки",
    includedScopeRu: [
      "продольные, горизонтальные и вертикальные профили с отдельной раскладкой и упаковками",
      "подвесы или опоры, анкеры основания, соединители, винты, уплотнение, защита мест реза и условное усиление",
      "разметка, монтаж отдельных групп элементов, выверка, подача, средства доступа, механизация и логистика",
      "видимые заменяемые предпосылки по опорам, основанию, анкерам, рабочей высоте и упаковкам",
    ],
    excludedScopeRu: [
      "листы ГКЛ, крепёж листов, заделка швов, шпаклевание, грунтование и окраска",
      "автоматическое приравнивание 41 поперечного сечения к числу подвесов или анкеров",
      "статический расчёт, проект узлов и окончательный выбор совместимой системы",
    ],
    independentCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "DRYWALL_CEILING_BULKHEAD_FRAME_ONLY",
    scopeClass: "50_M2_20_M_LENGTH_PRELIMINARY_GEOMETRY",
    primaryMeasureParameterId: "area_m2",
    selectedPreliminaryProfile: NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisible: true,
    projectDataReplacesAssumptionsWhenAvailable: true,
  },
  binding: {
    rowId: `${S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID}:s2721:row:longitudinal_profile_packages`,
    applicability: {
      technology_class: "DRYWALL_CEILING_BULKHEAD_METAL_FRAME",
      operation_class: "FRAME_ONLY",
      source_id: S2721_BULKHEAD_FRAME_SOURCE_ID,
      norm_id: NORM_ID,
      quantity_basis: "EXPLICIT_DEVELOPED_GEOMETRY_PLUS_SEPARATE_VISIBLE_SUPPORT_LAYOUT",
      assumption_policy: "VISIBLE_AND_REPLACEABLE_BY_PROJECT_LAYOUT_STRUCTURAL_CHECK_AND_SELECTED_SYSTEM",
    },
  },
  locator: {
    key: "drywall-ceiling-bulkhead-frame-50m2-preliminary-profile-r1-runtime-v1",
    payload: {
      kind: "USER_SCOPE_WITH_VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
      sourcePackSha256: S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
      exactLocator: sourceMetadata.exact_locator,
      quantityModel: "20 m length + 1.5 m bottom + two 0.5 m sides + four longitudinal lines + independent support layout",
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "каркас потолочного короба",
    aliases: [
      "каркас короба из гипсокартона 50 м²",
      "металлический каркас потолочного короба без обшивки",
      "короб 20 м каркас нижняя грань 1,5 м две боковые 0,5 м",
    ],
    shortScopeRu: "Каркас короба: профили по геометрии, отдельные опоры и анкеры, соединители, крепёж, защита реза, монтаж, доступ, механизация и логистика; без листов и отделки.",
    keyDistinguishingParameters: ["area_m2", "bulkhead_length_m", "bottom_face_width_m", "side_face_height_m"],
    clarificationFields: ["support_layout_reference", "structural_anchor_reference", "load_verification_state"],
    includedBoundaries: ["29 строк предварительной frame-only сметы и две условные строки проектного усиления"],
    excludedBoundaries: ["обшивка ГКЛ, отделка и неподтверждённое проектирование узлов"],
    extraSearchTermsRu: "потолочный короб каркас профиль подвес опора анкер соединитель крепёж резка доступ доставка",
    sourceProvenance: {
      contract: "rik-expo-app.s27-21.master-drywall-ceiling-bulkhead-frame-successor.v1",
      sourcePackSha256: S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
    },
  },
  forbiddenAdjacentMatchers: [
    /лист.*гкл/iu,
    /шпакл[её]в/iu,
    /окраск/iu,
  ],
  owner: "S2721_DRYWALL_CEILING_BULKHEAD_FRAME_SUCCESSOR",
  receiptFileStem: "S2721_DRYWALL_CEILING_BULKHEAD_FRAME_SUCCESSOR",
});
