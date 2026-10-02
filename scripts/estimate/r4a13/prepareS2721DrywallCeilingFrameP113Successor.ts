import { createHash } from "node:crypto";
import { resolve } from "node:path";

import frameSourcePack from "../../../data/estimate-benchmarks/source-packs/drywall-ceiling-frame-p113-preliminary-profile-r1.json";
import {
  buildAllBatch003R56CanonicalSuccessorDefinitions,
  buildBatch003R56CanonicalSuccessorDefinition,
  compileBatch003R56ThroughSharedCore,
  projectBatch003R56DefinitionToCanonicalRows,
} from "../r5/batch003R56SharedCoreProjection";
import { runMasterSingleDefinitionSuccessorR1 } from "./prepareMasterSingleDefinitionSuccessorR1";

type Json = Record<string, any>;

const SOURCE_CATALOG_ID = "drywall_ceiling_interior_drywall_ceiling_frame_large_area";
const CATALOG_ID = `canonical-work:base:${SOURCE_CATALOG_ID}`;
const SOURCE_ID = "drywall_ceiling_frame_p113_preliminary_profile_r1";
const NORM_ID = "profile:drywall-ceiling-frame:p113-preliminary:r1";
const SOURCE_PACK_SHA256 = "3de341a20badf3b303ac9c5a55bcf5fd60db08450861ae77ec6833043333bda3";

const definition = buildBatch003R56CanonicalSuccessorDefinition(SOURCE_CATALOG_ID);
const projection = projectBatch003R56DefinitionToCanonicalRows(definition, {
  includeRuntimePriceInputs: false,
  normalizePublisherCategories: true,
});

const runtimeProfileInput = {
  work_included: true,
  estimate_scope_mode: "FULL_APPLICABLE_SCOPE",
  frame_quantity_basis: "P113_TYPICAL_PRELIMINARY",
  room_length_m: 15.8,
  room_width_m: 10,
  perimeter_sealing_required: true,
  structural_substrate_type: "REINFORCED_CONCRETE_SLAB",
  ceiling_load_verification_state: "P113_PRELIMINARY_PENDING_PROJECT_CHECK",
  hanger_system_reference: "Прямой подвес для профиля ПП 60×27 системы П 113",
  structural_anchor_reference: "Анкерный элемент для железобетонного основания — уточнить по проекту",
  frame_access_system_type: "MOBILE_TOWER",
  access_equipment_required: true,
  access_equipment_shift_count: 4,
  working_height_m: 3.4,
  material_delivery_trip_count: 1,
  access_delivery_trip_count: 1,
  access_return_trip_count: 1,
  waste_removal_trip_count: 1,
  project_type: "RESIDENTIAL_INTERIOR",
  product_profile_id: "KNAUF_P113_PRELIMINARY",
} as const;

const runtimeProfileClassification = Object.fromEntries(
  Object.keys(runtimeProfileInput).map((parameterId) => [
    parameterId,
    ["work_included", "estimate_scope_mode", "frame_quantity_basis"].includes(parameterId)
      ? "RUNTIME_STRUCTURAL_DEFAULT"
      : parameterId === "ceiling_load_verification_state"
        ? "DERIVED"
        : "ASSUMPTION",
  ]),
) as Record<string, "NORMATIVE" | "ASSUMPTION" | "DERIVED" | "RUNTIME_STRUCTURAL_DEFAULT">;

const runtimeProfileSourceIds = Object.fromEntries(
  Object.keys(runtimeProfileInput).map((parameterId) => [parameterId, [SOURCE_ID]]),
);

const sourceMetadata = {
  source_title: "Предварительный профиль каркаса плоского потолка КНАУФ П 113",
  source_authority: "КНАУФ; нормативная система Кыргызской Республики; MASTER S27.21 A5",
  source_document_version: "DRYWALL_CEILING_FRAME_P113_PRELIMINARY_PROFILE_R1_2026-09-30",
  definition_hash: SOURCE_PACK_SHA256,
  source_kind: "COMPOSITE_TECHNOLOGY_PROFILE",
  official_url: frameSourcePack.sources[0]?.officialUrl ?? null,
  artifact_sha256: SOURCE_PACK_SHA256,
  effective_from: "2026-09-30",
  exact_locator: frameSourcePack.sources.map((source) => source.exactLocator).join("; "),
  use_restriction: frameSourcePack.scope,
};

const parameterDefinitions = projection.parameterDefinitions.map((parameter) => {
  const parameterId = String(parameter.parameter_id);
  const profileValue = Object.hasOwn(runtimeProfileInput, parameterId);
  return {
    ...parameter,
    truth_metadata: {
      ...parameter.truth_metadata,
      contract: "rik-expo-app.s27-21.drywall-ceiling-frame-p113-profile.v1",
      semantic_parameter_key: `${CATALOG_ID}:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: parameterId === "area_m2"
        ? "USER_MEASURED"
        : profileValue
          ? "USER_REPLACEABLE_PRELIMINARY_PROFILE"
          : "PROJECT_CONDITIONAL_INPUT",
      input_origin_class: parameterId === "area_m2"
        ? "KNOWN_WORK_SCOPE"
        : profileValue
          ? "SELECTED_VISIBLE_PRELIMINARY_PROFILE"
          : "OPTIONAL_PROJECT_DOCUMENTATION",
      preliminary_compilation_allowed: parameterId !== "area_m2",
      source_confirmation_required: false,
      guide: {
        guide_kind: parameterId === "area_m2" ? "MEASUREMENT_RULE" : "PRACTICE_REFERENCE",
        guide_short_ru: parameterId === "area_m2"
          ? "Введите площадь каркаса по обмеру или чертежу."
          : `${String(parameter.title_ru)}: предварительное значение видно и заменяется раскладкой, проектом или ППР.`,
        source_role: profileValue
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : "PROJECT_CONDITIONAL_INPUT",
        source_document: SOURCE_ID,
        source_locator: sourceMetadata.exact_locator,
        guide_version: "drywall-ceiling-frame-p113-preliminary-profile-r1",
        source_snapshot_hash: SOURCE_PACK_SHA256,
        applicability: sourceMetadata.use_restriction,
        verified_at: "2026-09-30T00:00:00+06:00",
        guide_validation_policy: "FIRST_ESTIMATE_NOW_REPLACE_PROFILE_VALUES_WITH_PROJECT_LAYOUT",
      },
      hidden_default_forbidden: parameterId === "area_m2",
      runtime_profile_value: profileValue,
      runtime_profile_classification: runtimeProfileClassification[parameterId] ?? null,
      synthetic: false,
    },
  };
});

const requiredRowIds = frameSourcePack.independentRequiredComposition.map((component) =>
  `${SOURCE_CATALOG_ID}:successor-r56:row:${component.rowKey}`
);
const independentCompletenessMap = {
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "PRODUCT_SYSTEM_TDS",
  generatedFromCurrentRows: false,
  evidenceSha256: SOURCE_PACK_SHA256,
  sourcePackPath: "data/estimate-benchmarks/source-packs/drywall-ceiling-frame-p113-preliminary-profile-r1.json",
  entries: frameSourcePack.independentRequiredComposition.map((component) => ({
    operationId: "FRAME_ONLY_P113_PRELIMINARY",
    expectedResourceId: `required-component:${component.componentId}`,
    category: component.category,
    specification: component.rowKey,
    condition: "P113_TYPICAL_PRELIMINARY",
    sourceId: component.sourceId,
    quantityRule: component.quantityBasis,
    formulaId: `${SOURCE_CATALOG_ID}:successor-r56:formula:${component.rowKey}`,
    resolution: {
      kind: "ROW",
      rowId: `${SOURCE_CATALOG_ID}:successor-r56:row:${component.rowKey}`,
    },
  })),
};

async function verifyCore(): Promise<Json> {
  const firstEstimate = await compileBatch003R56ThroughSharedCore({
    definition,
    values: { ...runtimeProfileInput, area_m2: 158 },
  });
  const rowIds = firstEstimate.rows.map((row) => row.row_id).sort();
  if (!(firstEstimate.preliminaryNeeds.length === 0
    && JSON.stringify(rowIds) === JSON.stringify([...requiredRowIds].sort())
    && firstEstimate.rows.every((row) => Number(row.quantity) > 0))) {
    throw new Error("STOP_S2721_DRYWALL_FRAME_P113_FIRST_ESTIMATE");
  }
  for (const rowId of requiredRowIds) {
    const mutated = new Set(rowIds);
    mutated.delete(rowId);
    const missing = requiredRowIds.filter((requiredRowId) => !mutated.has(requiredRowId));
    if (!missing.includes(rowId)) {
      throw new Error(`STOP_S2721_DRYWALL_FRAME_P113_REMOVAL_MUTATION:${rowId}`);
    }
  }
  const bySuffix = (suffix: string) => firstEstimate.rows.find((row) =>
    row.row_id.endsWith(`:${suffix}`)
  );
  if (!(bySuffix("p113_ceiling_profile")?.quantity === "458.2"
    && bySuffix("p113_perimeter_track")?.quantity === "51.6"
    && bySuffix("p113_profile_extensions")?.quantity === "32"
    && bySuffix("p113_single_level_connectors")?.quantity === "269"
    && bySuffix("p113_direct_hangers")?.quantity === "111"
    && bySuffix("p113_hanger_anchors")?.quantity === "111"
    && bySuffix("p113_ln9_screws")?.quantity === "222"
    && bySuffix("p113_perimeter_fasteners")?.quantity === "104"
    && bySuffix("p113_sealing_tape")?.quantity === "51.6")) {
    throw new Error("STOP_S2721_DRYWALL_FRAME_P113_CONTROL_QUANTITIES");
  }
  const alternateGeometry = await compileBatch003R56ThroughSharedCore({
    definition,
    operation: "recalculate",
    values: {
      ...runtimeProfileInput,
      area_m2: 158,
      room_length_m: 31.6,
      room_width_m: 5,
    },
  });
  if (!(alternateGeometry.rows.find((row) =>
    row.row_id.endsWith(":p113_perimeter_track"))?.quantity === "73.2"
    && alternateGeometry.rows.find((row) =>
      row.row_id.endsWith(":p113_perimeter_fasteners"))?.quantity === "147")) {
    throw new Error("STOP_S2721_DRYWALL_FRAME_P113_GEOMETRY_SENSITIVITY");
  }
  const withoutSealing = await compileBatch003R56ThroughSharedCore({
    definition,
    operation: "recalculate",
    values: { ...runtimeProfileInput, area_m2: 158, perimeter_sealing_required: false },
  });
  if (withoutSealing.rows.some((row) => row.row_id.endsWith(":p113_sealing_tape"))) {
    throw new Error("STOP_S2721_DRYWALL_FRAME_P113_SEALING_CONDITION");
  }
  const spreadToOtherSystems = buildAllBatch003R56CanonicalSuccessorDefinitions()
    .filter((candidate) => candidate.operation === "FRAME" && candidate.catalogId !== SOURCE_CATALOG_ID)
    .flatMap((candidate) => candidate.resources)
    .filter((resource) => resource.inclusionCondition.includes("P113_TYPICAL_PRELIMINARY"));
  if (spreadToOtherSystems.length > 0) {
    throw new Error("STOP_S2721_DRYWALL_FRAME_P113_CROSS_SYSTEM_SPREAD");
  }
  return {
    status: "GREEN_S2721_DRYWALL_CEILING_FRAME_P113_CORE",
    firstEstimate: {
      rowCount: firstEstimate.rows.length,
      procurementRowCount: firstEstimate.rows.filter((row) => row.procurement_eligible).length,
      ceilingProfileM: 458.2,
      perimeterM: 51.6,
      directHangers: 111,
      hangerAnchors: 111,
      perimeterFasteners: 104,
    },
    alternateGeometry: { perimeterM: 73.2, perimeterFasteners: 147 },
    sourcePackSha256: SOURCE_PACK_SHA256,
    compiledSha256: createHash("sha256")
      .update(JSON.stringify({ firstEstimate, alternateGeometry, withoutSealing }))
      .digest("hex"),
  };
}

void runMasterSingleDefinitionSuccessorR1({
  contract: "rik-expo-app.s27-21.master-drywall-ceiling-frame-p113-successor.v1",
  stopCode: "S2721_DRYWALL_CEILING_FRAME_P113",
  applicationName: "s27-21-drywall-ceiling-frame-p113-successor",
  expectedBranch: "codex/r4-a5-clean-08b18902",
  masterPath: resolve(process.env.R4A13_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (61).md"),
  masterSha256: process.env.R4A13_MASTER_SHA256
    ?? "e271f6f1e82a5677dcde752295f9118b6bdcb17ffb60a974f3b21a44b34a4589",
  parentReleaseId: process.env.R4A13_PARENT_DEFINITION_RELEASE_ID
    ?? "d6d38d83-8791-5d90-8073-490bbd44eb22",
  parentSearchReleaseId: process.env.R4A13_PARENT_SEARCH_RELEASE_ID
    ?? "0cf5b8a0-5675-5f79-a58a-d61c4792a94b",
  currentReleasePath: resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json"),
  outputRoot: resolve(process.env.R4A13_OUTPUT_ROOT
    ?? ".release-runtime/r568/s27-21/drywall-ceiling-frame-p113-successor-v1"),
  sourcePaths: [
    "data/estimate-benchmarks/source-packs/drywall-ceiling-frame-p113-preliminary-profile-r1.json",
    "scripts/estimate/r5/batch003R56SharedCoreProjection.ts",
    "tests/aiEstimateV4/batch003R56Reconciliation.contract.test.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
    "scripts/estimate/r4a13/prepareS2721DrywallCeilingFrameP113Successor.ts",
  ],
  catalogId: CATALOG_ID,
  sourceId: SOURCE_ID,
  normId: NORM_ID,
  sourceMetadata,
  parameterDefinitions,
  formulaDefinitions: projection.formulaDefinitions,
  resourceDefinitions: projection.resourceDefinitions,
  shortInput: { area_m2: 158 },
  acceptanceInput: { ...runtimeProfileInput, area_m2: 158 },
  runtimeProfileInput,
  runtimeProfileClassification,
  runtimeProfileSourceIds,
  verifyCore,
  expectedParentShape: [33, 31, 31],
  benchmarkOrdinal: 6,
  validationScenario: "S27_21_DRYWALL_CEILING_FRAME_P113_158_M2_FRAME_ONLY",
  passport: {
    canonicalRuName: "Каркас плоского потолка КНАУФ П 113",
    workKey: SOURCE_CATALOG_ID,
    physicalResultRu: "Размеченный, закреплённый и выверенный одноуровневый металлический каркас П 113 без обшивки и отделки",
    includedScopeRu: [
      "ПП 60×27, ПН 28×27, удлинители, одноуровневые соединители и прямые подвесы",
      "отдельные анкеры подвесов, крепёж направляющих, LN 9 и применимая уплотнительная лента",
      "разметка, монтаж каждого типа узла, выверка, подача материалов и операции доступа",
      "лазер, перфоратор, шуруповёрт, инструмент резки, выбранное средство доступа и логистика",
    ],
    excludedScopeRu: [
      "листы ГКЛ, крепёж листов, заделка швов, грунтование и окраска",
      "распространение ориентиров П 113 на другие потолочные системы",
    ],
    independentCompletenessMap,
  },
  applicability: {
    country: "KG",
    operationClass: "DRYWALL_FLAT_CEILING_FRAME_ONLY",
    scopeClass: "P113_PRELIMINARY_158_M2_RECTANGULAR_ROOM",
    primaryMeasureParameterId: "area_m2",
    selectedPreliminaryProfile: NORM_ID,
    firstEstimateBeforeOptionalClarification: true,
    profileAssumptionsVisible: true,
    projectDataReplacesAssumptionsWhenAvailable: true,
  },
  binding: {
    rowId: `${SOURCE_CATALOG_ID}:successor-r56:row:p113_ceiling_profile`,
    applicability: {
      technology_class: "KNAUF_P113_SINGLE_LEVEL_METAL_FRAME",
      operation_class: "FRAME_ONLY",
      source_id: SOURCE_ID,
      norm_id: NORM_ID,
      quantity_basis: "AREA_RATES_PLUS_INDEPENDENT_PERIMETER_GEOMETRY",
      assumption_policy: "VISIBLE_AND_REPLACEABLE_BY_PROJECT_LAYOUT_AND_NODE_CHECK",
    },
  },
  locator: {
    key: "drywall-ceiling-frame-p113-preliminary-profile-r1-runtime-v1",
    payload: {
      kind: "COMPOSITE_TECHNOLOGY_PROFILE",
      sourcePackSha256: SOURCE_PACK_SHA256,
      officialUrl: sourceMetadata.official_url,
      exactLocator: sourceMetadata.exact_locator,
      quantityModel: "area + room geometry -> frame members, distinct fixings, operations, equipment and logistics",
    },
  },
  search: {
    primaryUom: "м²",
    canonicalNameRu: "каркас плоского потолка КНАУФ П 113",
    aliases: [
      "каркас потолка П 113 158 м²",
      "одноуровневый металлический каркас потолка",
      "каркас потолка без обшивки ГКЛ",
    ],
    shortScopeRu: "Каркас П 113: профили, подвесы, разные крепления, соединители, монтаж, механизмы, доступ и логистика; без листов и отделки.",
    keyDistinguishingParameters: ["area_m2", "room_length_m", "room_width_m", "structural_substrate_type"],
    clarificationFields: ["ceiling_load_verification_state", "structural_anchor_reference"],
    includedBoundaries: ["27 применимых строк выбранного предварительного профиля frame-only"],
    excludedBoundaries: ["обшивка, крепёж листов и отделка"],
    extraSearchTermsRu: "потолок каркас п113 профиль пп пн подвес анкер соединитель крепёж",
    sourceProvenance: {
      contract: "rik-expo-app.s27-21.master-drywall-ceiling-frame-p113-successor.v1",
      sourcePackSha256: SOURCE_PACK_SHA256,
    },
  },
  forbiddenAdjacentMatchers: [
    /лист.*гкл/iu,
    /шпакл[её]в/iu,
    /окраск/iu,
  ],
  owner: "S2721_DRYWALL_CEILING_FRAME_P113_SUCCESSOR",
  receiptFileStem: "S2721_DRYWALL_CEILING_FRAME_P113_SUCCESSOR",
});
