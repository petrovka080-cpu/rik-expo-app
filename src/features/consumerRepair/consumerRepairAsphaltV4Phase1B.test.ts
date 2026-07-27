import {
  __resetConsumerRepairRequestStoreForTests,
  applyConsumerRepairDraftRevisionParamBatchPatch,
  applyConsumerRepairDraftRevisionParamPatch,
  commitPreparedConsumerRepairRequestBundle,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairRequestPdf,
  getConsumerRepairRequest,
  listConsumerRepairRequestHistory,
  updateConsumerRepairRequestItemUnitPrice,
  selectConsumerRepairRoadScopeV4,
  type ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests";
import { buildAiEstimateParameterCards } from "../../lib/estimate/buildAiEstimateParameterCards";
import type { EstimateDraftRevision } from "../../lib/estimate/estimateDraftRevisionContract";
import {
  compactConsumerRepairBundleForDurableStorage,
  compactConsumerRepairBundleForEmergencyDurableStorage,
  decodeConsumerRepairBundleFromDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "../../lib/platform/compactConsumerRepairDurableState";
import { renderPdfFromDraftRevision } from "../pdf/renderPdfFromDraftRevision";
import {
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
  ASPHALT_WORK_ID_V4,
  auditAsphaltProfessionalEstimateV4,
  compileAsphaltProfessionalEstimateV4,
  type AsphaltRuntimeRowProjectionV4,
  type RoadScopeIdV4,
  validateAsphaltRuntimeTruthV4,
  validateAsphaltWorkAssemblyCoverageV4,
} from "../../lib/estimate/v4/asphalt";
import { buildProjectExecutionDraftFromRevision } from "../../lib/projectExecution";
import {
  buildConsumerRepairSelectedWorkDraftBundle,
  saveProjectExecutionDraftForRequest,
} from "./requestEstimateScreenActions";
import { buildRequestEstimateViewModel } from "./requestEstimateViewModel";

const FORBIDDEN_GENERIC_KEYS = new Set([
  "height_m",
  "count",
  "material_brand",
  "thickness_m",
  "depth_mm",
  "geology_profile",
  "work_complexity",
]);

const BASE_PATCHES: Record<string, string> = {
  construction_mode: "new_construction",
  base_condition: "new_project",
  sand_layer_required: "no",
  crushed_layer_count: "2",
  crushed_layer_1_fraction: "40_70",
  crushed_layer_1_thickness_mm: "180",
  crushed_layer_1_compaction_factor: "1.18",
  crushed_layer_1_waste_percent: "3",
  crushed_layer_2_fraction: "20_40",
  crushed_layer_2_thickness_mm: "120",
  crushed_layer_2_compaction_factor: "1.16",
  crushed_layer_2_waste_percent: "3",
  geotextile_required: "no",
  asphalt_layer_count: "2",
  asphalt_layer_1_mixture_type: "coarse_lower",
  asphalt_layer_1_thickness_mm: "60",
  asphalt_layer_1_density_t_m3: "2.35",
  asphalt_layer_1_waste_percent: "2",
  asphalt_layer_2_mixture_type: "dense_fine",
  asphalt_layer_2_thickness_mm: "40",
  asphalt_layer_2_density_t_m3: "2.35",
  asphalt_layer_2_waste_percent: "2",
  emulsion_measurement_basis: "litre",
  emulsion_rate_l_m2: "0.3",
  curb_required: "no",
  drainage_required: "no",
  utility_pipes_required: "no",
  traffic_signs_required: "no",
  road_marking_required: "no",
  guardrail_required: "no",
  constrained_site: "no",
  night_work_required: "no",
  live_traffic_required: "no",
  asphalt_plant_distance_km: "20",
  truck_payload_t: "15",
  region_city: "Бишкек",
  execution_season: "warm_dry",
  laboratory_control: "none",
  road_worker_productivity_m2_per_man_hour: "12",
  grader_productivity_m2_per_machine_hour: "220",
  roller_productivity_m2_per_machine_hour: "150",
  paver_productivity_m2_per_machine_hour: "180",
};

function currentRevision(bundle: ConsumerRepairDraftBundle): EstimateDraftRevision {
  const state = bundle.estimateDraftRevisionState;
  if (!state) throw new Error("TEST_REVISION_STATE_MISSING");
  const revision = state.revisions.find((item) => item.revisionId === state.currentRevisionId);
  if (!revision) throw new Error("TEST_CURRENT_REVISION_MISSING");
  return revision;
}

function initialBundle(prompt: string, userId = "phase1b-user"): ConsumerRepairDraftBundle {
  return buildConsumerRepairSelectedWorkDraftBundle({
    consumerUserId: userId,
    problemText: prompt,
    repairType: "road_construction",
    city: "Бишкек",
    addressText: "",
    preferredTimeText: "",
    contactPhone: "",
    selectedWork: null,
  }).bundle;
}

function selectPendingScope(bundle: ConsumerRepairDraftBundle, scope: RoadScopeIdV4): ConsumerRepairDraftBundle {
  expect(bundle.pendingRoadScopeSelection?.offeredScopes).toHaveLength(4);
  expect(bundle.estimateDraftRevisionState).toBeNull();
  expect(bundle.items).toHaveLength(0);
  const selected = selectConsumerRepairRoadScopeV4({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    selectedScope: scope,
    createdAt: "2026-07-24T02:00:00.000Z",
  });
  expect(selected.pendingRoadScopeSelection).toBeNull();
  expect(selected.estimateDraftRevisionState?.revisions).toHaveLength(1);
  expect(currentRevision(selected).roadScopeBinding?.selectedRoadScope).toBe(scope);
  return selected;
}

function applyPatches(
  bundle: ConsumerRepairDraftBundle,
  values: Record<string, string>,
): ConsumerRepairDraftBundle {
  const revision = currentRevision(bundle);
  return applyConsumerRepairDraftRevisionParamBatchPatch({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    patches: Object.entries(values).map(([paramKey, rawValue]) => ({
      operation: revision.params[paramKey] ? "update_param" as const : "add_param" as const,
      paramKey,
      rawValue,
    })),
  });
}

function rowById(revision: EstimateDraftRevision, rowId: string) {
  const row = revision.boq.rows.find((item) => item.rowId === rowId);
  if (!row) throw new Error(`TEST_ROW_MISSING:${rowId}`);
  return row;
}

function uiRows(bundle: ConsumerRepairDraftBundle): AsphaltRuntimeRowProjectionV4[] {
  return bundle.items.map((item) => ({
    row_id: String(item.sourceParameters?.rowCode ?? ""),
    category: item.category ?? null,
    quantity: item.quantity ?? 0,
    unit_id: item.unit ?? "",
  }));
}

beforeEach(() => {
  __resetConsumerRepairRequestStoreForTests();
});

test("A: exact /request path immediately creates a calculated professional BOQ for 5000 m²", () => {
  const bundle = selectPendingScope(initialBundle("Асфальтирование парковки площадью 5000 м²"), "FULL_PAVEMENT_STRUCTURE");
  const revision = currentRevision(bundle);
  const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });

  expect(bundle.draft.selectedWorkKey).toBe(ASPHALT_WORK_ID_V4);
  expect(revision.selectedTemplateId).toBe(ASPHALT_V4_RUNTIME_TEMPLATE_ID);
  expect(revision.professionalWorkId).toBe(ASPHALT_WORK_ID_V4);
  expect(revision.legacyRowsCount).toBe(0);
  expect(revision.boq.rows.length).toBeGreaterThan(30);
  expect(revision.boq.rows.every((row) => row.quantity > 0 && Boolean(row.unit) && Boolean(row.quantityFormula))).toBe(true);
  expect(revision.params.area_m2?.value).toBe(5000);
  expect(revision.quantityBasis).toEqual(expect.objectContaining({
    basisType: "project",
    area_m2: 5000,
    source: "raw_input",
  }));
  expect(revision.workAssemblyId).toBe("new_full_road_pavement_preliminary_v1");
  expect(revision.professionalClarification?.understood).toEqual(expect.arrayContaining([
    expect.objectContaining({ label_ru: "Площадь покрытия", value_ru: "5 000 м²" }),
  ]));
  expect(cards.find((card) => card.key === "area_m2")).toEqual(expect.objectContaining({
    labelRu: "Площадь покрытия",
    missing: false,
    value: 5000,
  }));
  expect(cards.some((card) => FORBIDDEN_GENERIC_KEYS.has(card.key))).toBe(false);
  expect(cards.map((card) => card.labelRu).join(" ")).not.toMatch(/Высота|Материал и марка|Геология и профиль|Сложность работ/u);
  expect(cards.find((card) => card.key === "asphalt_layer_1_mixture_type")).toEqual(expect.objectContaining({
    inputKind: "select",
    clarificationControl: "selection",
  }));
  expect(revision.boq.rows.map((row) => row.rowId)).toEqual(expect.arrayContaining([
    "initial_data_analysis",
    "field_site_survey",
    "geodetic_layout",
    "axes_marks_fixing",
    "asphalt_layer_1_material",
    "asphalt_layer_2_material",
    "base_emulsion_material",
    "emulsion_interface_1_2",
    "joint_sealing_material",
    "edge_treatment",
    "road_workers",
    "surface_cleaner",
    "bitumen_distributor",
    "asphalt_paver_layer_1",
    "smooth_roller_layer_1",
    "pneumatic_roller_layer_1",
    "asphalt_layer_1_delivery",
    "dump_trucks_layer_1",
    "dump_trucks_layer_2",
    "laboratory_tests",
    "execution_documentation",
  ]));
  expect(bundle.items).toHaveLength(revision.boq.rows.length);
  expect(bundle.items.every((item) => item.editableByConsumer)).toBe(true);
  expect(bundle.items.every((item) => item.unitPrice == null)).toBe(true);
  expect(bundle.items.map((item) => item.sourceParameters?.rowCode)).toEqual(revision.boq.rows.map((row) => row.rowId));
});

test("quantity basis: 1 km × 32 m becomes 32 000 m² and survives in the real BOQ", () => {
  const bundle = selectPendingScope(initialBundle("Асфальтирование парковки, длина 1 км, ширина 32 м"), "FULL_PAVEMENT_STRUCTURE");
  const revision = currentRevision(bundle);
  expect(revision.params.length_m?.value).toBe(1000);
  expect(revision.params.width_m?.value).toBe(32);
  expect(revision.params.area_m2).toEqual(expect.objectContaining({ value: 32000, source: "derived" }));
  expect(revision.quantityBasis).toEqual(expect.objectContaining({
    basisType: "project",
    length_m: 1000,
    width_m: 32,
    area_m2: 32000,
    source: "raw_input",
    formulaTrace: "length_m * width_m - exclusions_m2",
  }));
  expect(revision.boq.rows.length).toBeGreaterThan(30);
  expect(revision.boq.rows.every((row) => row.quantity > 0)).toBe(true);
  expect(bundle.items.map((item) => item.quantity)).toEqual(revision.boq.rows.map((row) => row.quantity));
});

test("quantity basis: 3000 m × 32 m persists as 96 000 m² across editor and PDF", () => {
  const bundle = selectPendingScope(initialBundle("Устройство асфальтобетонного покрытия, длина 3000 м, ширина 32 м"), "ROAD_SURFACING_ONLY");
  const revision = currentRevision(bundle);
  const pdf = renderPdfFromDraftRevision({ revision });
  expect(revision.quantityBasis).toEqual(expect.objectContaining({
    basisType: "project",
    length_m: 3000,
    width_m: 32,
    area_m2: 96000,
  }));
  expect(revision.params.area_m2?.value).toBe(96000);
  expect(revision.boq.rows.every((row) => row.quantity > 0)).toBe(true);
  expect(bundle.items.map((item) => item.sourceParameters?.rowCode)).toEqual(revision.boq.rows.map((row) => row.rowId));
  expect(pdf.snapshot.rows.map((row) => row.rowId)).toEqual(revision.boq.rows.map((row) => row.rowId));
  expect(pdf.snapshot.rows.map((row) => row.quantity)).toEqual(revision.boq.rows.map((row) => row.quantity));
});

test("saved 96 000 m² estimate reopens from history with the same BOQ", () => {
  const bundle = commitPreparedConsumerRepairRequestBundle(selectPendingScope(initialBundle("Устройство асфальтобетонного покрытия, длина 3000 м, ширина 32 м", "phase1b-reopen-user"), "ROAD_SURFACING_ONLY"));
  const before = currentRevision(bundle);
  const reopened = getConsumerRepairRequest(bundle.draft.id);
  const after = currentRevision(reopened);
  const history = listConsumerRepairRequestHistory(bundle.draft.consumerUserId);

  expect(after.revisionId).toBe(before.revisionId);
  expect(after.quantityBasis).toEqual(before.quantityBasis);
  expect(after.boq.rows).toEqual(before.boq.rows);
  expect(reopened.items.map((item) => item.sourceParameters?.rowCode)).toEqual(after.boq.rows.map((row) => row.rowId));
  expect(history.some((item) => item.draft.id === bundle.draft.id)).toBe(true);
});

test("assembly coverage: exact 96 000 m² compilation has no formula, category or quantity blockers", () => {
  const compilation = compileAsphaltProfessionalEstimateV4({
    raw_text: "Устройство асфальтобетонного покрытия, длина 3000 м, ширина 32 м",
  });
  const audit = auditAsphaltProfessionalEstimateV4(compilation);
  const coverage = validateAsphaltWorkAssemblyCoverageV4(compilation);
  expect(compilation.quantity_basis).toEqual(expect.objectContaining({ area_m2: 96000, basis_type: "project" }));
  expect(compilation.compile_blockers).toEqual([]);
  expect(compilation.passport.unresolved_requirements).toEqual([]);
  expect(compilation.compiled_rows.every((row) => row.quantity > 0 && row.assumption_ids.length > 0)).toBe(true);
  expect(Object.values(audit.counters).every((value) => value === 0)).toBe(true);
  expect(coverage.status).toBe("GREEN_ASPHALT_WORK_ASSEMBLY_COVERAGE_V4");
  expect(Object.values(coverage.counters).every((value) => value === 0)).toBe(true);
});

test("Phase 1C: prepared-base and full-road scopes keep the same 3000 × 32 geometry but produce different complete WBS", () => {
  const prepared = compileAsphaltProfessionalEstimateV4({
    raw_text: "Устройство асфальтобетонного покрытия по готовому основанию, длина 3000 м, ширина 32 м",
  });
  const full = compileAsphaltProfessionalEstimateV4({
    raw_text: "Полное строительство автомобильной дороги, длина 3000 м, ширина 32 м",
  });
  const preparedCoverage = validateAsphaltWorkAssemblyCoverageV4(prepared);
  const fullCoverage = validateAsphaltWorkAssemblyCoverageV4(full);
  const preparedIds = prepared.compiled_rows.map((row) => row.definition.row_id);
  const fullIds = full.compiled_rows.map((row) => row.definition.row_id);

  expect(prepared.quantity_basis).toEqual(expect.objectContaining({ basis_type: "project", length_m: 3000, width_m: 32, area_m2: 96000 }));
  expect(full.quantity_basis).toEqual(expect.objectContaining({ basis_type: "project", length_m: 3000, width_m: 32, area_m2: 96000 }));
  expect(prepared.preliminary_assembly_policy.profile_id).toBe("surfacing_on_prepared_base");
  expect(full.preliminary_assembly_policy.profile_id).toBe("new_full_road_infrastructure");
  expect(preparedIds).not.toEqual(expect.arrayContaining(["topsoil_stripping", "sand_material", "crushed_layer_1_material"]));
  expect(fullIds).toEqual(expect.arrayContaining([
    "topsoil_stripping",
    "subgrade_excavation",
    "soil_haul",
    "geotextile_material",
    "sand_material",
    "sand_delivery",
    "crushed_layer_1_material",
    "crushed_layer_2_material",
    "asphalt_layer_1_material",
    "asphalt_layer_2_material",
    "excavator",
    "base_roller",
    "incoming_material_control",
    "asphalt_temperature_control",
    "asphalt_core_sampling",
    "laboratory_protocol",
    "execution_documentation",
    "curb_stone_material",
    "drainage_tray",
    "storm_inlet_body",
    "storm_pipe",
    "storm_well_bottom",
    "marking_thermoplastic",
    "sign_warning_panel",
    "sign_foundation_concrete",
    "barrier_galvanized_beam",
    "lighting_led_luminaire",
    "lighting_power_cable",
  ]));
  expect(full.compiled_rows.length).toBeGreaterThan(prepared.compiled_rows.length);
  expect(preparedCoverage.status).toBe("GREEN_ASPHALT_WORK_ASSEMBLY_COVERAGE_V4");
  expect(fullCoverage.status).toBe("GREEN_ASPHALT_WORK_ASSEMBLY_COVERAGE_V4");
  expect(preparedCoverage.manifest_coverage_ratio).toBe(1);
  expect(fullCoverage.manifest_coverage_ratio).toBe(1);
  expect(Object.values(fullCoverage.counters).every((value) => value === 0)).toBe(true);
  expect(full.compiled_rows.every((row) => (
    row.definition.professional_category &&
    row.definition.component_type &&
    row.definition.costing_mode &&
    row.definition.cost_ownership_id &&
    row.definition.parent_wbs_id &&
    row.definition.priced === false
  ))).toBe(true);
  expect(full.compiled_rows.every((row) => typeof row.definition.procurement_eligible === "boolean")).toBe(true);
  expect(full.compiled_rows.map((row) => `${row.definition.professional_name_ru} ${row.definition.technical_specification_ru}`).join(" "))
    .not.toMatch(/\b(?:coarse_lower|dense_fine|5_20|20_40|40_70)\b/u);
  expect(full.compiled_rows.filter((row) => /^asphalt_layer_\d+_material$/u.test(row.definition.row_id)))
    .toEqual(expect.arrayContaining([
      expect.objectContaining({ definition: expect.objectContaining({ specification_status: "SPECIFICATION_REQUIRES_PROJECT_CONFIRMATION" }) }),
    ]));
});

test("Phase 1C presentation uses separate professional categories and never exposes internal asphalt IDs", () => {
  const bundle = initialBundle("Полное строительство автомобильной дороги, длина 3000 м, ширина 32 м", "phase1c-presentation-user");
  const cards = buildAiEstimateParameterCards({ revision: currentRevision(bundle), includeMissing: true });
  const viewModel = buildRequestEstimateViewModel(bundle);
  const publicText = [
    ...(viewModel?.sections.map((section) => section.title) ?? []),
    ...bundle.items.map((item) => `${item.titleRu} ${item.unitLabel ?? ""}`),
    ...cards.map((card) => `${card.labelRu} ${card.displayValueRu} ${card.unitRu} ${card.changesInEstimateRu ?? ""}`),
  ].join(" ");

  expect(viewModel?.sections.map((section) => section.title)).toEqual(expect.arrayContaining([
    "Материалы",
    "Работы",
    "Труд",
    "Машины и механизмы",
    "Услуги",
    "Логистика",
    "Лабораторный контроль",
    "Документация",
  ]));
  expect(publicText).not.toMatch(/\b(?:coarse_lower|dense_fine|5_20|20_40|40_70|machine_hour|man_hour|m2_man_hour|m2_machine_hour|m3_machine_hour|km_machine_hour|t_trip|m2_test|t_km)\b/u);
  expect(cards.find((card) => card.key === "crushed_layer_1_fraction")?.displayValueRu).toBe("40–70 мм");
  expect(cards.find((card) => card.key === "crushed_layer_2_fraction")?.displayValueRu).toBe("20–40 мм");
  for (const card of cards) {
    for (const internalRowId of card.affectsRowIds) {
      expect(card.changesInEstimateRu ?? "").not.toContain(internalRowId);
    }
  }
});

test("Phase 1C laboratory frequencies scale from 100 m² to 96 000 m²", () => {
  const small = compileAsphaltProfessionalEstimateV4({ raw_text: "Полное строительство автомобильной дороги 100 м²" });
  const large = compileAsphaltProfessionalEstimateV4({ raw_text: "Полное строительство автомобильной дороги, длина 3000 м, ширина 32 м" });
  const quantity = (rowId: string, compilation: typeof small) => compilation.compiled_rows.find((row) => row.definition.row_id === rowId)?.quantity ?? 0;

  for (const rowId of ["asphalt_temperature_control", "asphalt_compaction_control", "asphalt_core_sampling", "pavement_thickness_control"]) {
    expect(quantity(rowId, large)).toBeGreaterThan(quantity(rowId, small));
  }
});

test.each([
  ["Устройство асфальтобетонного покрытия по готовому основанию 1000 м²", "surfacing_on_prepared_base"],
  ["Полное строительство дороги 1000 м²", "new_full_road_infrastructure"],
  ["Полное строительство дорожной одежды без внешней инфраструктуры 1000 м²", "new_full_road_pavement"],
  ["Ремонт дороги с фрезерованием 1000 м²", "rehabilitation_with_milling"],
  ["Обновить существующий асфальт 1000 м²", "overlay_on_existing_pavement"],
  ["Ямочный ремонт 1000 м²", "local_patch_repair"],
  ["Построить парковку 1000 м²", "parking_full_construction"],
  ["Уложить асфальт на парковке по готовому основанию 1000 м²", "parking_surfacing_only"],
])("Phase 1C ScopeResolver: %s → %s with full manifest coverage", (rawText, expectedProfile) => {
  const compilation = compileAsphaltProfessionalEstimateV4({ raw_text: rawText });
  const coverage = validateAsphaltWorkAssemblyCoverageV4(compilation);
  expect(compilation.preliminary_assembly_policy.profile_id).toBe(expectedProfile);
  expect(coverage.status).toBe("GREEN_ASPHALT_WORK_ASSEMBLY_COVERAGE_V4");
  expect(coverage.manifest_coverage_ratio).toBe(1);
  expect(Object.values(coverage.counters).every((value) => value === 0)).toBe(true);
});

test("scope selection cannot compile a reference 1000 m² BOQ when geometry is absent", () => {
  const initial = initialBundle("Устройство асфальтобетонного дорожного покрытия");
  const bundle = selectConsumerRepairRoadScopeV4({
    requestDraftId: initial.draft.id,
    userId: initial.draft.consumerUserId,
    selectedScope: "ROAD_SURFACING_ONLY",
    createdAt: "2026-07-24T02:00:00.000Z",
  });

  expect(bundle.pendingRoadScopeSelection).toBeNull();
  expect(bundle.estimateDraftSession).toMatchObject({
    status: "PARAMETERS_REQUIRED",
    scopePresetId: "ROAD_SURFACING_ONLY",
    parameters: {},
    activeRevisionId: null,
  });
  expect(bundle.estimateDraftRevisionState).toBeNull();
  expect(bundle.items).toHaveLength(0);
  expect(bundle.draft.missingData).toContain("Укажите площадь либо подтверждённые длину и ширину.");
});

test("B and D: new two-layer parking compiles only confirmed base and pavement scope", () => {
  const initial = selectPendingScope(initialBundle("Новая парковка площадью 5000 м², двухслойное покрытие, без бордюров и водоотвода"), "FULL_PAVEMENT_STRUCTURE");
  const bundle = applyPatches(initial, BASE_PATCHES);
  const revision = currentRevision(bundle);
  const ids = revision.boq.rows.map((row) => row.rowId);

  expect(revision.professionalWorkId).toBe(ASPHALT_WORK_ID_V4);
  expect(revision.legacyRowsCount).toBe(0);
  expect(ids).toEqual(expect.arrayContaining([
    "crushed_layer_1_material",
    "crushed_layer_2_material",
    "asphalt_layer_1_material",
    "asphalt_layer_2_material",
  ]));
  expect(ids).not.toEqual(expect.arrayContaining([
    "milling",
    "curb_material",
    "drainage_material",
    "utility_pipes_material",
    "traffic_signs_material",
    "road_marking",
    "guardrail_material",
  ]));
  expect(rowById(revision, "asphalt_layer_1_material").titleRu).toContain("нижнего связующего слоя");
  expect(rowById(revision, "asphalt_layer_2_material").titleRu).toContain("верхнего слоя");
  expect(revision.boq.rows.some((row) => /суммарно|подытог|итого/iu.test(row.titleRu))).toBe(false);
  expect(new Set(ids).size).toBe(ids.length);
  const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
  expect(cards.find((card) => card.key === "crushed_layer_count")?.value).toBe(2);
  expect(cards.find((card) => card.key === "asphalt_layer_count")?.value).toBe(2);
  expect(cards.some((card) => card.key === "crushed_layer_2_fraction")).toBe(true);
  expect(cards.some((card) => card.key === "asphalt_layer_2_mixture_type")).toBe(true);
});

test("default new-construction assembly survives an unrelated clarification", () => {
  const initial = selectPendingScope(initialBundle("Новая парковка площадью 5000 м², двухслойное асфальтобетонное покрытие"), "FULL_PAVEMENT_STRUCTURE");
  const before = currentRevision(initial);
  const beforeIds = before.boq.rows.map((row) => row.rowId);
  expect(before.workAssemblyId).toBe("new_full_road_pavement_preliminary_v1");
  expect(beforeIds).toEqual(expect.arrayContaining(["crushed_layer_1_material", "crushed_layer_2_material", "grader"]));

  const afterBundle = applyConsumerRepairDraftRevisionParamPatch({
    requestDraftId: initial.draft.id,
    userId: initial.draft.consumerUserId,
    operation: "update_param",
    paramKey: "asphalt_layer_2_thickness_mm",
    rawValue: "50",
  });
  const after = currentRevision(afterBundle);
  expect(after.workAssemblyId).toBe(before.workAssemblyId);
  expect(after.boq.rows.map((row) => row.rowId)).toEqual(beforeIds);
});

test("C: repair with milling adds only confirmed milling, machine and disposal logistics", () => {
  const initial = initialBundle("Ремонт существующего асфальтобетонного покрытия 1000 м² с фрезерованием 50 мм");
  const bundle = applyPatches(initial, {
    ...BASE_PATCHES,
    construction_mode: "repair",
    milling_required: "yes",
    milling_depth_mm: "50",
    milling_productivity_m3_per_machine_hour: "25",
    disposal_distance_km: "15",
  });
  const ids = currentRevision(bundle).boq.rows.map((row) => row.rowId);
  expect(ids).toEqual(expect.arrayContaining(["milling", "milling_machine", "milled_material_transport"]));
});

test("E: confirmed curbs, drainage and geotextile are split into material and work rows", () => {
  const initial = initialBundle("Асфальтирование площадки 1200 м² по готовому основанию с бордюрами, водоотводом и геотекстилем");
  const bundle = applyPatches(initial, {
    ...BASE_PATCHES,
    geotextile_required: "yes",
    geotextile_type: "separation",
    geotextile_overlap_percent: "10",
    curb_required: "yes",
    curb_type: "road",
    curb_length_m: "180",
    drainage_required: "yes",
    drainage_type: "surface",
    drainage_length_m: "120",
  });
  const revision = currentRevision(bundle);
  const ids = revision.boq.rows.map((row) => row.rowId);
  expect(ids).toEqual(expect.arrayContaining([
    "geotextile_material",
    "geotextile_installation",
    "curb_stone_material",
    "curb_stone_installation",
    "drainage_tray",
    "drainage_tray_installation",
  ]));
  expect(rowById(revision, "curb_stone_material").rowType).toBe("material");
  expect(rowById(revision, "curb_stone_installation").rowType).toBe("work");
});

test("F: uploaded specification is a document control and creates a traceable document row", () => {
  const initial = selectPendingScope(initialBundle("Асфальтирование парковки площадью 900 м² по приложенной спецификации"), "FULL_PAVEMENT_STRUCTURE");
  const initialRevision = currentRevision(initial);
  const projectCard = buildAiEstimateParameterCards({ revision: initialRevision, includeMissing: true })
    .find((card) => card.key === "project_document");
  expect(projectCard?.clarificationControl).toBe("file_upload");
  const bundle = applyPatches(initial, { ...BASE_PATCHES, project_document: "parking-spec-v7.pdf" });
  expect(rowById(currentRevision(bundle), "project_document").rowType).toBe("document");
});

test("G and H: revision changes only dependent quantities and preserves lower-layer identity", () => {
  const initial = selectPendingScope(initialBundle("Асфальтирование парковки площадью 1000 м²"), "FULL_PAVEMENT_STRUCTURE");
  let bundle = applyPatches(initial, BASE_PATCHES);
  const lowerItem = bundle.items.find((item) => item.sourceParameters?.rowCode === "asphalt_layer_1_material");
  if (!lowerItem) throw new Error("TEST_LOWER_LAYER_ITEM_MISSING");
  bundle = updateConsumerRepairRequestItemUnitPrice({ requestDraftId: bundle.draft.id, itemId: lowerItem.id, unitPrice: 12345 });
  const before = currentRevision(bundle);
  const lowerBefore = rowById(before, "asphalt_layer_1_material").quantity;
  const upperBefore = rowById(before, "asphalt_layer_2_material").quantity;

  bundle = applyConsumerRepairDraftRevisionParamPatch({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    operation: "update_param",
    paramKey: "asphalt_layer_2_thickness_mm",
    rawValue: "50",
  });
  const thicknessRevision = currentRevision(bundle);
  expect(rowById(thicknessRevision, "asphalt_layer_1_material").quantity).toBe(lowerBefore);
  expect(rowById(thicknessRevision, "asphalt_layer_1_material").unitPrice).toBe(12345);
  expect(rowById(thicknessRevision, "asphalt_layer_2_material").quantity).toBeGreaterThan(upperBefore);
  expect(thicknessRevision.boq.rows.map((row) => row.rowId)).toEqual(before.boq.rows.map((row) => row.rowId));

  bundle = applyConsumerRepairDraftRevisionParamPatch({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    operation: "update_param",
    paramKey: "area_m2",
    rawValue: "2000",
  });
  const areaRevision = currentRevision(bundle);
  expect(rowById(areaRevision, "asphalt_layer_1_material").quantity).toBeCloseTo(lowerBefore * 2, 6);
  expect(areaRevision.previousRevisionId).toBe(thicknessRevision.revisionId);
});

test("full-road infrastructure emergency durable compaction preserves the expanded assembly and manual price", () => {
  let bundle = initialBundle("Полное строительство автомобильной дороги, длина 3000 м, ширина 32 м", "phase1c-durable-user");
  const expectedCompilation = compileAsphaltProfessionalEstimateV4({ raw_text: "Полное строительство автомобильной дороги, длина 3000 м, ширина 32 м" });
  const material = bundle.items.find((item) => item.sourceParameters?.rowCode === "asphalt_layer_1_material");
  if (!material) throw new Error("TEST_DURABLE_MATERIAL_ITEM_MISSING");
  bundle = updateConsumerRepairRequestItemUnitPrice({ requestDraftId: bundle.draft.id, itemId: material.id, unitPrice: 12_345 });

  const canonicalDurable = encodeConsumerRepairBundleForDurableStorage(
    compactConsumerRepairBundleForDurableStorage(bundle),
  );
  expect(Buffer.byteLength(JSON.stringify(canonicalDurable), "utf8")).toBeLessThanOrEqual(4.5 * 1024 * 1024);
  const compacted = compactConsumerRepairBundleForEmergencyDurableStorage(bundle, { createdAt: "2026-07-22T00:00:00.000Z" });
  const editableState = compacted.estimateRevisionState;
  const draftState = compacted.estimateDraftRevisionState;

  expect(editableState?.revisions).toHaveLength(1);
  expect(editableState?.revisions[0]?.revision_id).toBe(editableState?.current_revision_id);
  expect(editableState?.revisions[0]?.editable_estimate_snapshot.rows.find((row) => row.rowId === material.id)?.unitPrice).toBe(12_345);
  expect(draftState?.revisions).toHaveLength(1);
  expect(draftState?.revisions[0]?.revisionId).toBe(draftState?.currentRevisionId);
  expect(draftState?.revisions[0]?.workAssemblyId).toBe("new_full_road_infrastructure_preliminary_v1");
  expect(draftState?.revisions[0]?.boq.rows).toHaveLength(expectedCompilation.compiled_rows.length);
  expect(compacted.items.find((item) => item.id === material.id)?.unitPrice).toBe(12_345);

  const reopened = decodeConsumerRepairBundleFromDurableStorage(encodeConsumerRepairBundleForDurableStorage(compacted));
  if (!reopened) throw new Error("TEST_DURABLE_REOPEN_DECODE_FAILED");
  expect(reopened.items.find((item) => item.id === material.id)).toEqual(expect.objectContaining({
    unitPrice: 12_345,
    priceEditedByConsumer: true,
    sourceParameters: expect.objectContaining({ rowCode: "asphalt_layer_1_material" }),
  }));
  __resetConsumerRepairRequestStoreForTests();
  bundle = commitPreparedConsumerRepairRequestBundle(reopened);
  const procurement = saveProjectExecutionDraftForRequest({
    action: "open_material_list",
    bundle,
    userId: bundle.draft.consumerUserId,
  });
  expect(procurement.bundle.projectExecutionDrafts[0]?.procurementItems).toHaveLength(expectedCompilation.passport.procurement_lines.length);
  const withPdf = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: procurement.bundle.draft.id,
    userId: procurement.bundle.draft.consumerUserId,
    generatedAt: "2026-07-22T00:00:00.000Z",
  });
  const openedPdf = getConsumerRepairRequestPdf({ requestDraftId: withPdf.draft.id });
  expect(openedPdf.signedUrl).toMatch(/^data:application\/pdf;base64,/);
  expect(withPdf.items.map((item) => item.sourceParameters?.rowCode)).toEqual(
    expectedCompilation.compiled_rows.map((row) => row.definition.row_id),
  );
});

test("full-road width edit keeps every V4 quantity aligned with the professional compiler", () => {
  const prompt = "Полное строительство автомобильной дороги с водоотводом, дорожными знаками, разметкой, барьерным ограждением и освещением, длина 3000 м, ширина 32 м";
  let bundle = initialBundle(prompt, "phase1d-width-edit-user");
  const before = currentRevision(bundle);
  const asphaltBefore = rowById(before, "asphalt_layer_2_material").quantity;
  const lightingBefore = rowById(before, "lighting_pole").quantity;

  bundle = applyConsumerRepairDraftRevisionParamPatch({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    operation: "update_param",
    paramKey: "width_m",
    rawValue: "30",
  });
  const after = currentRevision(bundle);
  const expected = compileAsphaltProfessionalEstimateV4({
    raw_text: prompt,
    parameter_overrides: { width_m: { value: 30, source: "edited_by_user" } },
  });

  expect(after.params.width_m?.value).toBe(30);
  expect(after.params.area_m2?.value).toBe(90_000);
  expect(after.boq.rows).toHaveLength(expected.compiled_rows.length);
  expect(after.boq.rows.filter((row) => !(row.quantity > 0))).toEqual([]);
  for (const row of expected.compiled_rows) {
    expect(rowById(after, row.definition.row_id).quantity).toBeCloseTo(row.quantity, 6);
  }
  expect(rowById(after, "asphalt_layer_2_material").quantity).toBeLessThan(asphaltBefore);
  expect(rowById(after, "lighting_pole").quantity).toBe(lightingBefore);
});

test("core, UI, PDF and procurement use one applicable BOQ identity", () => {
  const initial = selectPendingScope(initialBundle("Асфальтирование парковки площадью 1000 м²"), "FULL_PAVEMENT_STRUCTURE");
  let bundle = applyPatches(initial, BASE_PATCHES);
  const revision = currentRevision(bundle);
  const pdf = renderPdfFromDraftRevision({ revision });
  const project = buildProjectExecutionDraftFromRevision(revision, {
    source: "request_estimate",
    countryCode: "KG",
    cityOrRegion: "Бишкек",
    generatedAt: "2026-07-22T00:00:00.000Z",
    sourceRequestId: bundle.draft.id,
  });
  const pdfRows = pdf.snapshot.rows.map((row) => ({
    row_id: row.rowId,
    category: row.category ?? null,
    quantity: row.quantity,
    unit_id: row.unit,
  }));
  const truth = validateAsphaltRuntimeTruthV4({
    revision,
    ui_rows: uiRows(bundle),
    pdf_rows: pdfRows,
    procurement_source_row_ids: project.workPackages[0].sourceRowIds,
    procurement_output_row_ids: project.procurementItems.map((item) => item.sourceEstimateRowId),
  });

  expect(truth.status).toBe("GREEN_ASPHALT_RUNTIME_TRUTH_INVARIANTS");
  expect(Object.values(truth.counters)).toEqual(expect.arrayContaining([0]));
  expect(Object.values(truth.counters).every((value) => value === 0)).toBe(true);
  expect(pdf.pdf.rowsEqualLatestRevision).toBe(true);
  expect(pdf.pdf.body).toContain("Стоимость не рассчитана");

  const opened = saveProjectExecutionDraftForRequest({
    action: "open_material_list",
    bundle,
    userId: bundle.draft.consumerUserId,
  });
  bundle = opened.bundle;
  expect(bundle.projectExecutionDrafts[0].procurementItems.map((item) => item.sourceEstimateRowId))
    .toEqual(project.procurementItems.map((item) => item.sourceEstimateRowId));
  expect(opened.statusMessage).toBe("Список материалов открыт.");
});
