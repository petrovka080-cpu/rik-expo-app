import {
  __resetConsumerRepairRequestStoreForTests,
  applyConsumerRepairDraftRevisionParamBatchPatch,
  applyConsumerRepairDraftRevisionParamPatch,
  type ConsumerRepairDraftBundle,
} from "../../lib/consumerRequests";
import { buildAiEstimateParameterCards } from "../../lib/estimate/buildAiEstimateParameterCards";
import type { EstimateDraftRevision } from "../../lib/estimate/estimateDraftRevisionContract";
import { renderPdfFromDraftRevision } from "../pdf/renderPdfFromDraftRevision";
import {
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
  ASPHALT_WORK_ID_V4,
  buildAsphaltImmediateScopePreviewV4,
  type AsphaltRuntimeRowProjectionV4,
  validateAsphaltRuntimeTruthV4,
} from "../../lib/estimate/v4/asphalt";
import { buildProjectExecutionDraftFromRevision } from "../../lib/projectExecution";
import {
  buildConsumerRepairSelectedWorkDraftBundle,
  saveProjectExecutionDraftForRequest,
} from "./requestEstimateScreenActions";

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

test("A: exact /request path selects V4 without template id, preserves area and exposes no generic questions", () => {
  const bundle = initialBundle("Асфальтирование парковки площадью 5000 м²");
  const revision = currentRevision(bundle);
  const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });

  expect(bundle.draft.selectedWorkKey).toBe(ASPHALT_WORK_ID_V4);
  expect(revision.selectedTemplateId).toBe(ASPHALT_V4_RUNTIME_TEMPLATE_ID);
  expect(revision.professionalWorkId).toBe(ASPHALT_WORK_ID_V4);
  expect(revision.legacyRowsCount).toBe(0);
  expect(revision.boq.rows).toHaveLength(0);
  expect(revision.params.area_m2?.value).toBe(5000);
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
  const immediateScope = buildAsphaltImmediateScopePreviewV4(revision);
  expect(immediateScope.map((row) => row.category)).toEqual(expect.arrayContaining(["material", "work", "equipment"]));
  expect(immediateScope.map((row) => row.title_ru)).toEqual(expect.arrayContaining([
    "Асфальтобетонная смесь для слоя покрытия",
    "Укладка и уплотнение слоя покрытия",
  ]));
});

test("B and D: new two-layer parking compiles only confirmed base and pavement scope", () => {
  const initial = initialBundle("Новая парковка площадью 5000 м², двухслойное покрытие, без бордюров и водоотвода");
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
  expect(rowById(revision, "asphalt_layer_1_material").titleRu).toContain("нижнего слоя");
  expect(rowById(revision, "asphalt_layer_2_material").titleRu).toContain("верхнего слоя");
  expect(revision.boq.rows.some((row) => /суммарно|подытог|итого/iu.test(row.titleRu))).toBe(false);
  expect(new Set(ids).size).toBe(ids.length);
  const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
  expect(cards.find((card) => card.key === "crushed_layer_count")?.value).toBe(2);
  expect(cards.find((card) => card.key === "asphalt_layer_count")?.value).toBe(2);
  expect(cards.some((card) => card.key === "crushed_layer_2_fraction")).toBe(true);
  expect(cards.some((card) => card.key === "asphalt_layer_2_mixture_type")).toBe(true);
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
  const initial = initialBundle("Асфальтирование площадки 1200 м² с бордюрами, водоотводом и геотекстилем");
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
    "curb_material",
    "curb_installation",
    "drainage_material",
    "drainage_installation",
  ]));
  expect(rowById(revision, "curb_material").rowType).toBe("material");
  expect(rowById(revision, "curb_installation").rowType).toBe("work");
});

test("F: uploaded specification is a document control and creates a traceable document row", () => {
  const initial = initialBundle("Асфальтирование парковки площадью 900 м² по приложенной спецификации");
  const initialRevision = currentRevision(initial);
  const projectCard = buildAiEstimateParameterCards({ revision: initialRevision, includeMissing: true })
    .find((card) => card.key === "project_document");
  expect(projectCard?.clarificationControl).toBe("file_upload");
  const bundle = applyPatches(initial, { ...BASE_PATCHES, project_document: "parking-spec-v7.pdf" });
  expect(rowById(currentRevision(bundle), "project_document").rowType).toBe("document");
});

test("G and H: revision changes only dependent quantities and preserves lower-layer identity", () => {
  const initial = initialBundle("Асфальтирование парковки площадью 1000 м²");
  let bundle = applyPatches(initial, BASE_PATCHES);
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

test("core, UI, PDF and procurement use one applicable BOQ identity", () => {
  const initial = initialBundle("Асфальтирование парковки площадью 1000 м²");
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
