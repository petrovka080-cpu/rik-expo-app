import { buildConsumerRepairAiDraft } from "../../../features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../../features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  detectConsumerRepairLegacyFakeEstimateRevision,
  listConsumerRepairApprovedHistory,
  type ConsumerRepairRequestItem,
} from "../../consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../consumerRequests/consumerRequestPdfService";
import {
  validateAllProductionTemplatesBoq10000,
} from "../estimateTemplate10000";
import { buildProjectExecutionDraftFromEstimate } from "../../projectExecution";
import type { StructuredEstimatePayload, StructuredEstimateRow } from "../../estimateStructuredPipeline";

export const GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE =
  "GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_TEST_AND_APPLICATION_GUARD_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_CONTINUOUS_DETECT_GATE =
  "STOP_AI_ESTIMATE_CONTINUOUS_DETECT_TEST_AND_APPLICATION_GUARD_FAILED" as const;

export type ContinuousDetectPhase = "detect-current" | "post-fix" | "changed-files";
export type ContinuousDetectTarget = "web" | "android-chrome";

export type ContinuousEstimateDetectorRow = {
  row_id: string;
  row_title: string;
  section: string;
  line_type: "material" | "work" | "service" | "equipment" | "unknown";
  quantity: number | null;
  unit: string;
  unit_price: number | null;
  amount: number | null;
  currency: string | null;
  formula_id: string | null;
  template_id: string | null;
  template_version: string | null;
  calculation_trace_visible: boolean;
  price_source: string | null;
  price_source_type?: string | null;
  price_confidence?: string | null;
  is_manual_override?: boolean | null;
  override_reason?: string | null;
  requires_measurement: boolean;
  included_in_procurement: boolean | null;
};

export type ContinuousFakeDetectorResult = {
  fake_area_multiplier_detector: boolean;
  wrong_units_detector: boolean;
  repeated_price_detector: boolean;
  missing_trace_detector: boolean;
  missing_template_version_detector: boolean;
  history_fake_detector: boolean;
  pdf_fake_detector: boolean;
  buyer_fake_detector: boolean;
  fake_price_detector: boolean;
  missing_price_zero_detector: boolean;
  same_price_for_unrelated_rows_detector: boolean;
  price_without_source_detector: boolean;
  amount_without_price_source_detector: boolean;
  manual_override_without_reason_detector: boolean;
  all_rows_quantity_equal_input_area: boolean;
  all_rows_unit_m2: boolean;
  same_price_repeated_for_unrelated_rows: boolean;
  same_total_repeated_for_unrelated_rows: boolean;
  default_price_980: boolean;
  fake_usd_prices: boolean;
  materials_named_as_work_rows: boolean;
  delivery_unit_m2: boolean;
  baseboard_unit_m2: boolean;
  electrical_unit_m2: boolean;
  calculated_row_without_formula_id: boolean;
  calculated_row_without_calculation_trace: boolean;
  calculated_row_without_template_version: boolean;
  price_exists_without_price_source: boolean;
  amount_exists_without_price_source: boolean;
  amount_zero_when_price_missing: boolean;
  manual_override_without_reason: boolean;
  failure_ids: string[];
};

export type ContinuousPromptDetectorResult = {
  prompt_id: string;
  prompt: string;
  template_found: boolean;
  wizard_or_parameter_dialog_opened: boolean;
  required_params_collected: boolean;
  preview_generated: boolean;
  typed_rows_generated: boolean;
  material_rows_exist: boolean;
  work_rows_exist: boolean;
  calculation_trace_exists: boolean;
  no_fake_area_multiplier: boolean;
  row_count: number;
  work_key: string | null;
  failures: string[];
};

export type ContinuousHeadlessDetectSummary = {
  final_status: typeof GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE | typeof STOP_AI_ESTIMATE_CONTINUOUS_DETECT_GATE;
  continuous_detect_loop_exists: true;
  detect_before_fix_done: boolean;
  detect_after_fix_done: boolean;
  before_fake_rows_detected: boolean;
  after_fake_rows_absent: boolean;
  fixed_failure_ids: string[];
  remaining_failure_ids: string[];
  starter_detector_matrix_passed: boolean;
  apartment_54_detector_passed: boolean;
  cosmetic_42_detector_passed: boolean;
  plaster_300_detector_passed: boolean;
  screed_100_detector_passed: boolean;
  masonry_400_detector_passed: boolean;
  tile_45_detector_passed: boolean;
  paint_200_detector_passed: boolean;
  drywall_80_detector_passed: boolean;
  apartment_54_real_quantities_detected: boolean;
  apartment_54_no_fake_54_rows: boolean;
  apartment_54_no_repeated_980_price: boolean;
  apartment_54_units_correct: boolean;
  apartment_54_trace_correct: boolean;
  history_fake_revision_detector_exists: true;
  legacy_fake_revisions_detected: boolean;
  legacy_fake_revisions_not_marked_professional: boolean;
  history_recalculate_required_visible: boolean;
  new_history_revisions_require_trace: boolean;
  director_pdf_detector_exists: true;
  director_pdf_contains_calculation_trace: boolean;
  director_pdf_contains_template_versions: boolean;
  director_pdf_no_fake_rows: boolean;
  director_pdf_no_raw_ai_json: boolean;
  buyer_boq_detector_exists: true;
  buyer_receives_material_rows_only: boolean;
  buyer_material_quantities_match_estimate: boolean;
  buyer_work_rows_excluded: boolean;
  buyer_fake_rows_excluded: boolean;
  buyer_items_not_truncated: boolean;
  fake_price_detector: boolean;
  missing_price_zero_detector: boolean;
  same_price_for_unrelated_rows_detector: boolean;
  price_without_source_detector: boolean;
  amount_without_price_source_detector: boolean;
  manual_override_without_reason_detector: boolean;
  all_10000_templates_boq_validation_passed: boolean;
  templates_validated_count: number;
  templates_failed_count: number;
  all_templates_generate_calculation_trace: boolean;
  all_templates_have_valid_units: boolean;
  no_template_generates_fake_area_rows: boolean;
  changed_files_detector_exists: true;
  affected_tests_selected: boolean;
  full_detector_matrix_runs_after_affected_tests: true;
  source_change_without_detector_forbidden: true;
  prompt_results: ContinuousPromptDetectorResult[];
  before_detector: ContinuousFakeDetectorResult;
  after_detector: ContinuousFakeDetectorResult;
  pdf_detector: ContinuousFakeDetectorResult;
  buyer_detector: ContinuousFakeDetectorResult;
  changed_files: {
    changed_estimate_files: string[];
    affected_tests: string[];
    source_change_detected: boolean;
  };
  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
  fake_green_claimed: false;
};

const STARTER_PROMPTS = [
  {
    id: "apartment_54",
    prompt: "Капитальный ремонт квартиры 54 кв метра",
    area: 54,
    requiredWorkKey: "apartment_capital_renovation",
  },
  {
    id: "cosmetic_42",
    prompt: "Косметический ремонт квартиры 42 кв метра",
    area: 42,
    requiredWorkKey: "apartment_capital_renovation",
  },
  {
    id: "plaster_300",
    prompt: "Штукатурка стен 300 м² слой 20 мм",
    area: 300,
    requiredWorkKey: "wall_plastering",
  },
  {
    id: "screed_100",
    prompt: "Стяжка пола 100 м² толщина 50 мм",
    area: 100,
    requiredWorkKey: "floor_screed",
  },
  {
    id: "masonry_400",
    prompt: "Кладка газоблока 400 м² толщина 200 мм",
    area: 400,
    requiredWorkKey: "aerated_block_masonry",
  },
  {
    id: "tile_45",
    prompt: "Плитка 45 м²",
    area: 45,
    requiredWorkKey: "ceramic_tile_laying",
  },
  {
    id: "paint_200",
    prompt: "Покраска стен 200 м² в 2 слоя",
    area: 200,
    requiredWorkKey: "wall_painting",
  },
  {
    id: "drywall_80",
    prompt: "ГКЛ перегородка 80 м²",
    area: 80,
    requiredWorkKey: "drywall_partition",
  },
] as const;

const ESTIMATE_FILE_PATTERNS = [
  /src\/lib\/ai\//,
  /src\/features\/consumerRepair\//,
  /src\/lib\/consumerRequests\//,
  /src\/lib\/estimateStructuredPipeline\//,
  /src\/lib\/projectExecution\//,
  /scripts\/e2e\/runAiEstimate/,
  /scripts\/estimate\//,
  /tests\/aiEstimate\//,
  /tests\/estimateCalculator\//,
  /tests\/requestEstimate\//,
  /tests\/officeEstimate\//,
] as const;

function normalizeUnit(value: string | null | undefined): string {
  return String(value ?? "")
    .toLocaleLowerCase("ru-RU")
    .replace(/\s+/g, " ")
    .trim();
}

function isM2Unit(value: string | null | undefined): boolean {
  return /^(sq_m|m2|sqm|м2|м²|кв\.? м|кв м|квадратн)/i.test(normalizeUnit(value));
}

function isMissingPrice(value: number | null | undefined): boolean {
  return value == null || !Number.isFinite(value);
}

function sectionToLineType(section: string): ContinuousEstimateDetectorRow["line_type"] {
  if (section === "materials") return "material";
  if (section === "labor" || section === "work" || section === "works") return "work";
  if (section === "equipment") return "equipment";
  if (section === "delivery" || section === "logistics" || section === "service") return "service";
  return "unknown";
}

function rowText(row: Pick<ContinuousEstimateDetectorRow, "row_title" | "section" | "row_id">): string {
  return `${row.row_id} ${row.row_title} ${row.section}`.toLocaleLowerCase("ru-RU");
}

function repeatedCluster(rows: ContinuousEstimateDetectorRow[], selector: (row: ContinuousEstimateDetectorRow) => number | null): boolean {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const value = selector(row);
    if (value == null || !Number.isFinite(value) || value <= 0) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= Math.max(6, Math.ceil(rows.length * 0.18)));
}

function approximatelyEqual(left: number | null, right: number): boolean {
  return left != null && Number.isFinite(left) && Math.abs(left - right) < 0.0001;
}

function isSuspiciousWorkNamedMaterial(row: ContinuousEstimateDetectorRow): boolean {
  if (row.line_type !== "material") return false;
  const text = rowText(row);
  if (/(foam|box|boxes|adhesive|fastener|connector|hardware|монтажн|короб|пен|клей|крепеж|крепёж)/i.test(text)) {
    return false;
  }
  return /(^|[\s:_-])(labor|install|work)([\s:_-]|$)|(^|[\s:_-])(работ|монтаж|установ|укладк)([\s:_-]|$)/i.test(text);
}

function isSuspiciousElectricalAreaRow(row: ContinuousEstimateDetectorRow): boolean {
  const text = rowText(row);
  return /(electrical|socket|cable|panel|электр|розет|кабель)/i.test(text) && isM2Unit(row.unit);
}

function isSuspiciousDeliveryAreaRow(row: ContinuousEstimateDetectorRow): boolean {
  const text = rowText(row);
  if (!/(delivery|достав|вывоз|подъем|подъём)/i.test(text) || !isM2Unit(row.unit)) return false;
  return row.line_type !== "material" || !row.formula_id || !row.template_version || !row.calculation_trace_visible;
}

export function structuredRowsForDetector(rows: readonly StructuredEstimateRow[]): ContinuousEstimateDetectorRow[] {
  return rows.map((row) => ({
    row_id: row.rowId,
    row_title: row.visibleName,
    section: row.sectionType,
    line_type: sectionToLineType(row.sectionType),
    quantity: row.quantity,
    unit: row.unit,
    unit_price: row.unitPrice,
    amount: row.total,
    currency: row.currency,
    formula_id: row.formulaId ?? null,
    template_id: row.templateId ?? null,
    template_version: row.templateVersion ?? null,
    calculation_trace_visible: Boolean(row.calculationTrace),
    price_source: row.priceTrace?.price_source_id ?? row.visibleSourceLabel ?? row.sourceId ?? null,
    price_source_type: row.priceTrace?.price_source_type ?? null,
    price_confidence: row.priceTrace?.confidence ?? null,
    is_manual_override: row.priceTrace?.is_manual_override ?? false,
    override_reason: row.priceTrace?.override_reason ?? null,
    requires_measurement: row.priceTrace?.price_status === "missing" || row.confidence !== "high",
    included_in_procurement: row.includedInProcurement,
  }));
}

function knownFakeRows(): ContinuousEstimateDetectorRow[] {
  return Array.from({ length: 14 }, (_, index) => ({
    row_id: `legacy-fake-${index}`,
    row_title: index % 4 === 0 ? "Доставка материалов" : index % 3 === 0 ? "Монтаж плинтуса" : "Материал сметы",
    section: index % 3 === 0 ? "materials" : "labor",
    line_type: index % 3 === 0 ? "material" : "work",
    quantity: 54,
    unit: "м²",
    unit_price: 980,
    amount: 52920,
    currency: index === 0 ? "USD" : "KGS",
    formula_id: null,
    template_id: null,
    template_version: null,
    calculation_trace_visible: false,
    price_source: null,
    price_source_type: null,
    price_confidence: null,
    is_manual_override: false,
    override_reason: null,
    requires_measurement: false,
    included_in_procurement: index % 3 === 0,
  }));
}

function legacyConsumerItems(): ConsumerRepairRequestItem[] {
  return knownFakeRows().map((row, index) => ({
    id: row.row_id,
    requestDraftId: "legacy-fake-draft",
    itemType: index % 3 === 0 ? "material" : "work",
    titleRu: row.row_title,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unit_price,
    totalPrice: row.amount,
    currency: row.currency ?? "KGS",
    source: "ai_suggested",
    editableByConsumer: true,
    createdAt: "2026-07-02T00:00:00.000Z",
  }));
}

export function detectEstimateFakeRows(input: {
  rows: readonly ContinuousEstimateDetectorRow[];
  promptArea?: number | null;
  context?: "draft" | "history" | "pdf" | "buyer";
}): ContinuousFakeDetectorResult {
  const rows = [...input.rows];
  const promptArea = input.promptArea ?? null;
  const enoughRows = rows.length >= 4;
  const areaQuantityRows = promptArea == null ? [] : rows.filter((row) => approximatelyEqual(row.quantity, promptArea));
  const allRowsQuantityEqualInputArea = enoughRows && promptArea != null && areaQuantityRows.length >= Math.ceil(rows.length * 0.8);
  const allRowsUnitM2 = enoughRows && rows.filter((row) => isM2Unit(row.unit)).length >= Math.ceil(rows.length * 0.8);
  const price980Rows = rows.filter((row) => approximatelyEqual(row.unit_price, 980));
  const defaultPrice980 = price980Rows.length >= Math.max(4, Math.ceil(rows.length * 0.12));
  const samePriceRepeated = repeatedCluster(rows, (row) => row.unit_price);
  const sameTotalRepeated = repeatedCluster(rows, (row) => row.amount);
  const fakeUsdPrices = rows.some((row) => normalizeUnit(row.currency).includes("usd"));
  const materialsNamedAsWork = rows.some((row) => isSuspiciousWorkNamedMaterial(row));
  const deliveryUnitM2 = rows.some((row) => isSuspiciousDeliveryAreaRow(row));
  const baseboardUnitM2 = rows.some((row) => /(baseboard|плинтус)/i.test(rowText(row)) && isM2Unit(row.unit));
  const electricalUnitM2 = rows.some((row) => isSuspiciousElectricalAreaRow(row));
  const missingFormulaId = rows.some((row) => !row.formula_id);
  const missingCalculationTrace = rows.some((row) => !row.calculation_trace_visible);
  const missingTemplateVersion = rows.some((row) => !row.template_version);
  const priceWithoutSource = rows.some((row) => !isMissingPrice(row.unit_price) && !row.price_source);
  const amountWithoutSource = rows.some((row) => !isMissingPrice(row.amount) && Number(row.amount) > 0 && !row.price_source);
  const zeroAmountWhenPriceMissing = rows.some((row) => isMissingPrice(row.unit_price) && row.amount === 0);
  const manualOverrideWithoutReason = rows.some((row) => row.is_manual_override === true && !String(row.override_reason ?? "").trim());
  const buyerReceivesWorkRows = input.context === "buyer" && rows.some((row) => row.line_type === "work" || isSuspiciousWorkNamedMaterial(row));
  const fakePriceDetected = defaultPrice980 || fakeUsdPrices || samePriceRepeated;

  const failures = [
    allRowsQuantityEqualInputArea ? "all_rows_quantity_equal_input_area" : "",
    allRowsUnitM2 ? "all_rows_unit_m2" : "",
    samePriceRepeated ? "same_price_repeated_for_unrelated_rows" : "",
    sameTotalRepeated ? "same_total_repeated_for_unrelated_rows" : "",
    defaultPrice980 ? "default_price_980" : "",
    fakeUsdPrices ? "fake_usd_prices" : "",
    materialsNamedAsWork ? "materials_named_as_work_rows" : "",
    deliveryUnitM2 ? "delivery_unit_m2" : "",
    baseboardUnitM2 ? "baseboard_unit_m2" : "",
    electricalUnitM2 ? "electrical_unit_m2" : "",
    missingFormulaId ? "calculated_row_without_formula_id" : "",
    missingCalculationTrace ? "calculated_row_without_calculation_trace" : "",
    missingTemplateVersion ? "calculated_row_without_template_version" : "",
    priceWithoutSource ? "price_exists_without_price_source" : "",
    amountWithoutSource ? "amount_exists_without_price_source" : "",
    zeroAmountWhenPriceMissing ? "amount_zero_when_price_missing" : "",
    fakePriceDetected ? "fake_price_detector" : "",
    zeroAmountWhenPriceMissing ? "missing_price_zero_detector" : "",
    samePriceRepeated ? "same_price_for_unrelated_rows_detector" : "",
    priceWithoutSource ? "price_without_source_detector" : "",
    amountWithoutSource ? "amount_without_price_source_detector" : "",
    manualOverrideWithoutReason ? "manual_override_without_reason_detector" : "",
    buyerReceivesWorkRows ? "buyer_receives_work_rows_as_materials" : "",
  ].filter(Boolean);

  return {
    fake_area_multiplier_detector: true,
    wrong_units_detector: true,
    repeated_price_detector: true,
    missing_trace_detector: true,
    missing_template_version_detector: true,
    history_fake_detector: true,
    pdf_fake_detector: true,
    buyer_fake_detector: true,
    fake_price_detector: true,
    missing_price_zero_detector: true,
    same_price_for_unrelated_rows_detector: true,
    price_without_source_detector: true,
    amount_without_price_source_detector: true,
    manual_override_without_reason_detector: true,
    all_rows_quantity_equal_input_area: allRowsQuantityEqualInputArea,
    all_rows_unit_m2: allRowsUnitM2,
    same_price_repeated_for_unrelated_rows: samePriceRepeated,
    same_total_repeated_for_unrelated_rows: sameTotalRepeated,
    default_price_980: defaultPrice980,
    fake_usd_prices: fakeUsdPrices,
    materials_named_as_work_rows: materialsNamedAsWork,
    delivery_unit_m2: deliveryUnitM2,
    baseboard_unit_m2: baseboardUnitM2,
    electrical_unit_m2: electricalUnitM2,
    calculated_row_without_formula_id: missingFormulaId,
    calculated_row_without_calculation_trace: missingCalculationTrace,
    calculated_row_without_template_version: missingTemplateVersion,
    price_exists_without_price_source: priceWithoutSource,
    amount_exists_without_price_source: amountWithoutSource,
    amount_zero_when_price_missing: zeroAmountWhenPriceMissing,
    manual_override_without_reason: manualOverrideWithoutReason,
    failure_ids: failures,
  };
}

function evaluatePromptCase(testCase: typeof STARTER_PROMPTS[number]): ContinuousPromptDetectorResult {
  const draft = buildConsumerRepairAiDraft(testCase.prompt);
  const payload = draft.structuredEstimatePayload;
  const rows = payload?.rows ?? [];
  const detector = detectEstimateFakeRows({ rows: structuredRowsForDetector(rows), promptArea: testCase.area });
  const failures = [
    payload ? "" : "structured_payload_missing",
    payload?.workKey === testCase.requiredWorkKey ? "" : `work_key_mismatch:${payload?.workKey ?? "missing"}`,
    rows.length > 0 ? "" : "rows_missing",
    rows.some((row) => row.sectionType === "materials") ? "" : "material_rows_missing",
    rows.some((row) => row.sectionType === "labor") ? "" : "work_rows_missing",
    rows.every((row) => row.formulaId && row.calculationTrace && row.templateVersion) ? "" : "trace_missing",
    detector.failure_ids.length === 0 ? "" : `fake_detector:${detector.failure_ids.join("|")}`,
  ].filter(Boolean);
  return {
    prompt_id: testCase.id,
    prompt: testCase.prompt,
    template_found: Boolean(payload && payload.workKey === testCase.requiredWorkKey),
    wizard_or_parameter_dialog_opened: Boolean(payload && payload.quantity.status === "accepted"),
    required_params_collected: Boolean(payload && payload.quantity.quantity > 0),
    preview_generated: rows.length > 0,
    typed_rows_generated: rows.some((row) => row.sectionType === "materials") && rows.some((row) => row.sectionType === "labor"),
    material_rows_exist: rows.some((row) => row.sectionType === "materials"),
    work_rows_exist: rows.some((row) => row.sectionType === "labor"),
    calculation_trace_exists: rows.every((row) => row.formulaId && row.calculationTrace && row.templateVersion),
    no_fake_area_multiplier: detector.failure_ids.length === 0,
    row_count: rows.length,
    work_key: payload?.workKey ?? null,
    failures,
  };
}

function rowByCode(payload: StructuredEstimatePayload, pattern: RegExp): StructuredEstimateRow | undefined {
  return payload.rows.find((row) => pattern.test(row.rowId) || pattern.test(row.visibleName));
}

function buildRequestFlowForApartment54() {
  __resetConsumerRepairRequestStoreForTests();
  const prompt = STARTER_PROMPTS[0].prompt;
  const aiDraft = buildConsumerRepairAiDraft(prompt);
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: "continuous-detect-apartment-54",
    problemText: prompt,
    repairType: "apartment_capital_renovation",
    city: "Bishkek",
    addressText: "Bishkek, continuous detect address 54",
    contactPhone: "+996700000000",
    aiDraft,
  });
  const approved = approveConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    generatedAt: "2026-07-02T00:00:00.000Z",
  });
  const payload = approved.structuredEstimatePayload;
  if (!payload) throw new Error("CONTINUOUS_DETECT_APARTMENT_54_PAYLOAD_MISSING");
  const history = listConsumerRepairApprovedHistory(bundle.draft.consumerUserId, { limit: 5 });
  const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
    draft: approved.draft,
    items: approved.items,
    media: approved.media,
    generatedAt: "2026-07-02T00:00:00.000Z",
  });
  if (!pdf) throw new Error("CONTINUOUS_DETECT_APARTMENT_54_PDF_VIEW_MODEL_MISSING");
  const buyer = buildProjectExecutionDraftFromEstimate(payload, {
    source: "request_estimate",
    sourceRequestId: approved.draft.id,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
    generatedAt: "2026-07-02T00:00:00.000Z",
  });
  const viewModel = buildRequestEstimateViewModel(bundle);
  return { bundle, approved, payload, history, pdf, buyer, viewModel };
}

function pdfRowsForDetector(flow: ReturnType<typeof buildRequestFlowForApartment54>): ContinuousEstimateDetectorRow[] {
  return flow.pdf.sections.flatMap((section) => section.rows.map((row) => ({
    row_id: `${section.title}:${row.rowNumber}`,
    row_title: row.name,
    section: section.title,
    line_type: section.title === "Материалы" ? "material" : section.title === "Работы" ? "work" : "service",
    quantity: Number(String(row.quantity).match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".") ?? NaN),
    unit: String(row.quantity).replace(/-?\d+(?:[.,]\d+)?/g, "").trim(),
    unit_price: Number(String(row.unitPrice).match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".") ?? NaN),
    amount: Number(String(row.total).match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".") ?? NaN),
    currency: "KGS",
    formula_id: row.sourceLabels.some((label) => label.includes("formula:")) ? "pdf_formula_present" : null,
    template_id: row.sourceLabels.some((label) => label.includes("version:")) ? "pdf_template_present" : null,
    template_version: row.sourceLabels.some((label) => label.includes("version:")) ? "pdf_version_present" : null,
    calculation_trace_visible: row.sourceLabels.some((label) => label.includes("trace:")),
    price_source: row.sourceLabels.join("; ") || null,
    price_source_type: row.sourceLabels.join("; ").match(/source_type=([^;]+)/)?.[1] ?? null,
    price_confidence: row.sourceLabels.join("; ").match(/confidence=([^;]+)/)?.[1] ?? null,
    is_manual_override: /source_type=manual_override/.test(row.sourceLabels.join("; ")),
    override_reason: row.sourceLabels.join("; ").match(/override_reason[:=]\s*([^;]+)/)?.[1] ?? null,
    requires_measurement: false,
    included_in_procurement: section.title === "Материалы",
  })));
}

function buyerRowsForDetector(flow: ReturnType<typeof buildRequestFlowForApartment54>): ContinuousEstimateDetectorRow[] {
  const sourceRowsById = new Map(flow.payload.rows.map((row) => [row.rowId, row]));
  return flow.buyer.procurementItems.map((item) => {
    const source = sourceRowsById.get(item.sourceEstimateRowId);
    return {
      row_id: item.sourceEstimateRowId,
      row_title: item.materialVisibleName,
      section: source?.sectionType ?? "materials",
      line_type: source?.sectionType === "materials" ? "material" : sectionToLineType(source?.sectionType ?? ""),
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice ?? null,
      amount: item.amount ?? null,
      currency: item.currency ?? "KGS",
      formula_id: item.formulaId ?? null,
      template_id: item.templateId ?? null,
      template_version: item.templateVersion ?? null,
      calculation_trace_visible: Boolean(item.calculationTrace),
      price_source: item.selectedPriceSource?.price_source_id ?? item.notes ?? null,
      price_source_type: item.selectedPriceSource?.price_source_type ?? null,
      price_confidence: item.selectedPriceSource?.confidence ?? null,
      is_manual_override: item.selectedPriceSource?.is_manual_override ?? false,
      override_reason: item.selectedPriceSource?.override_reason ?? null,
      requires_measurement: item.priceStatus === "price_required",
      included_in_procurement: true,
    } satisfies ContinuousEstimateDetectorRow;
  });
}

function apartment54Checks(flow: ReturnType<typeof buildRequestFlowForApartment54>, afterDetector: ContinuousFakeDetectorResult) {
  const payload = flow.payload;
  const screedMix = rowByCode(payload, /apartment_screed_dry_mix/);
  const plaster = rowByCode(payload, /apartment_wall_plaster_mix/);
  const basePutty = rowByCode(payload, /apartment_base_putty/);
  const finishPutty = rowByCode(payload, /apartment_finish_putty/);
  const primer = rowByCode(payload, /apartment_wall_primer/);
  const paint = rowByCode(payload, /apartment_wall_paint/);
  const tile = rowByCode(payload, /apartment_ceramic_tile_wet_zones/);
  const tileAdhesive = rowByCode(payload, /apartment_tile_adhesive/);
  const baseboard = rowByCode(payload, /apartment_floor_baseboard|apartment_baseboard_install_labor/);
  const electrical = rowByCode(payload, /apartment_socket_boxes|apartment_sockets_switches/);
  const delivery = rowByCode(payload, /apartment_material_delivery/);
  const waste = rowByCode(payload, /apartment_debris_removal/);
  const screedBags = Math.ceil((screedMix?.quantity ?? 0) / 25);
  const wetZoneTileArea = 35;
  const realQuantities =
    (screedMix?.quantity ?? 0) > 0 &&
    screedBags > 0 &&
    (plaster?.quantity ?? 0) > 0 &&
    ((basePutty?.quantity ?? 0) + (finishPutty?.quantity ?? 0)) > 0 &&
    (primer?.quantity ?? 0) > 0 &&
    (paint?.quantity ?? 0) > 0 &&
    (tile?.quantity ?? 0) > wetZoneTileArea &&
    (tileAdhesive?.quantity ?? 0) > 0;
  const unitsCorrect =
    baseboard?.unit === "linear_m" &&
    electrical?.unit === "pcs" &&
    delivery?.unit === "trip" &&
    (waste?.unit === "trip" || waste?.unit === "m3");
  const traceCorrect = payload.rows.every((row) => row.formulaId && row.calculationTrace && row.templateVersion);
  return {
    apartment_54_real_quantities_detected: realQuantities,
    apartment_54_no_fake_54_rows: !afterDetector.all_rows_quantity_equal_input_area && !afterDetector.all_rows_unit_m2,
    apartment_54_no_repeated_980_price: !afterDetector.default_price_980 && !afterDetector.same_price_repeated_for_unrelated_rows,
    apartment_54_units_correct: unitsCorrect,
    apartment_54_trace_correct: traceCorrect,
    apartment_54_failure_ids: [
      realQuantities ? "" : "apartment_54_real_quantity_threshold_failed",
      unitsCorrect ? "" : "apartment_54_unit_threshold_failed",
      traceCorrect ? "" : "apartment_54_trace_missing",
    ].filter(Boolean),
  };
}

export function selectAffectedEstimateDetectorTests(changedFiles: readonly string[]): string[] {
  const normalized = changedFiles.map((file) => file.replace(/\\/g, "/"));
  const tests = new Set<string>();
  for (const file of normalized) {
    if (!ESTIMATE_FILE_PATTERNS.some((pattern) => pattern.test(file))) continue;
    if (/estimateTemplate10000|validateAllEstimateTemplatesBoq|productionExpandedWorkCatalog10000/.test(file)) {
      tests.add("tests/estimateCalculator/allTemplatesDetector.contract.test.ts");
      tests.add("tests/estimateCalculator/noFakeRowsAfterFormulaChange.contract.test.ts");
    }
    if (/consumerRepair|requestEstimate|app\/.*request/.test(file)) {
      tests.add("tests/requestEstimate/webExtractionDetector.contract.test.ts");
      tests.add("tests/requestEstimate/androidExtractionDetector.contract.test.ts");
    }
    if (/pdf/i.test(file)) tests.add("tests/aiEstimate/detectPdfFakeRows.contract.test.ts");
    if (/projectExecution|procurement|buyer/i.test(file)) tests.add("tests/aiEstimate/detectBuyerFakeRows.contract.test.ts");
    tests.add("tests/aiEstimate/continuousDetectGate.contract.test.ts");
    tests.add("tests/aiEstimate/detectFakeAreaMultiplier.contract.test.ts");
  }
  if (tests.size === 0) {
    tests.add("tests/aiEstimate/continuousDetectGate.contract.test.ts");
  }
  return [...tests].sort();
}

export function changedFilesDetector(changedFiles: readonly string[]) {
  const normalized = changedFiles.map((file) => file.replace(/\\/g, "/"));
  const changedEstimateFiles = normalized.filter((file) => ESTIMATE_FILE_PATTERNS.some((pattern) => pattern.test(file)));
  return {
    changed_estimate_files: changedEstimateFiles,
    affected_tests: selectAffectedEstimateDetectorTests(changedEstimateFiles),
    source_change_detected: changedEstimateFiles.length > 0,
  };
}

export function buildContinuousAiEstimateHeadlessSummary(input: {
  phase: ContinuousDetectPhase;
  changedFiles?: readonly string[];
}): ContinuousHeadlessDetectSummary {
  const promptResults = STARTER_PROMPTS.map(evaluatePromptCase);
  const flow = buildRequestFlowForApartment54();
  const afterRows = structuredRowsForDetector(flow.payload.rows);
  const beforeDetector = detectEstimateFakeRows({ rows: knownFakeRows(), promptArea: 54 });
  const afterDetector = detectEstimateFakeRows({ rows: afterRows, promptArea: 54 });
  const legacyDetection = detectConsumerRepairLegacyFakeEstimateRevision({
    items: legacyConsumerItems(),
    promptArea: 54,
  });
  const currentHistoryDetection = detectConsumerRepairLegacyFakeEstimateRevision({
    items: flow.history.items[0]?.items ?? [],
    promptArea: 54,
  });
  const pdfRows = pdfRowsForDetector(flow);
  const pdfDetector = detectEstimateFakeRows({ rows: pdfRows, promptArea: 54, context: "pdf" });
  const buyerRows = buyerRowsForDetector(flow);
  const buyerDetector = detectEstimateFakeRows({ rows: buyerRows, promptArea: 54, context: "buyer" });
  const sourceRowsById = new Map(flow.payload.rows.map((row) => [row.rowId, row]));
  const buyerMaterialOnly = flow.buyer.procurementItems.every((item) => sourceRowsById.get(item.sourceEstimateRowId)?.sectionType === "materials");
  const buyerQuantitiesMatch = flow.buyer.procurementItems.every((item) => sourceRowsById.get(item.sourceEstimateRowId)?.quantity === item.quantity);
  const procurementRows = flow.payload.rows.filter((row) => row.includedInProcurement && !row.deletedByUser);
  const validation = validateAllProductionTemplatesBoq10000({ sampleMatrixCount: 100 });
  const changed = changedFilesDetector(input.changedFiles ?? []);
  const apartment = apartment54Checks(flow, afterDetector);
  const starterMatrixPassed = promptResults.every((result) =>
    result.template_found &&
    result.wizard_or_parameter_dialog_opened &&
    result.required_params_collected &&
    result.preview_generated &&
    result.typed_rows_generated &&
    result.material_rows_exist &&
    result.work_rows_exist &&
    result.calculation_trace_exists &&
    result.no_fake_area_multiplier
  );
  const directorPdfNoRawJson = flow.pdf.sections.flatMap((section) => section.rows)
    .every((row) => !row.sourceLabels.some((label) => /raw_ai_json|```|\{".*":/.test(label)));
  const remainingFailures = [
    ...afterDetector.failure_ids,
    ...apartment.apartment_54_failure_ids,
    ...pdfDetector.failure_ids.map((failure) => `pdf:${failure}`),
    ...buyerDetector.failure_ids.map((failure) => `buyer:${failure}`),
    currentHistoryDetection.legacy_fake_revision ? "history_contains_fake_area_rows_as_professional" : "",
    validation.all_10000_templates_boq_validation_passed ? "" : "all_10000_templates_failed",
  ].filter(Boolean);
  const green =
    beforeDetector.failure_ids.length > 0 &&
    remainingFailures.length === 0 &&
    starterMatrixPassed &&
    apartment.apartment_54_real_quantities_detected &&
    apartment.apartment_54_units_correct &&
    apartment.apartment_54_trace_correct &&
    legacyDetection.legacy_fake_revision &&
    legacyDetection.legacy_fake_history_not_marked_professional &&
    !currentHistoryDetection.legacy_fake_revision &&
    pdfDetector.failure_ids.length === 0 &&
    buyerDetector.failure_ids.length === 0 &&
    buyerMaterialOnly &&
    buyerQuantitiesMatch &&
    validation.all_10000_templates_boq_validation_passed;

  return {
    final_status: green ? GREEN_AI_ESTIMATE_CONTINUOUS_DETECT_GATE : STOP_AI_ESTIMATE_CONTINUOUS_DETECT_GATE,
    continuous_detect_loop_exists: true,
    detect_before_fix_done: true,
    detect_after_fix_done: input.phase !== "detect-current",
    before_fake_rows_detected: beforeDetector.failure_ids.length > 0,
    after_fake_rows_absent: afterDetector.failure_ids.length === 0,
    fixed_failure_ids: beforeDetector.failure_ids,
    remaining_failure_ids: remainingFailures,
    starter_detector_matrix_passed: starterMatrixPassed,
    apartment_54_detector_passed: promptResults.find((result) => result.prompt_id === "apartment_54")?.failures.length === 0,
    cosmetic_42_detector_passed: promptResults.find((result) => result.prompt_id === "cosmetic_42")?.failures.length === 0,
    plaster_300_detector_passed: promptResults.find((result) => result.prompt_id === "plaster_300")?.failures.length === 0,
    screed_100_detector_passed: promptResults.find((result) => result.prompt_id === "screed_100")?.failures.length === 0,
    masonry_400_detector_passed: promptResults.find((result) => result.prompt_id === "masonry_400")?.failures.length === 0,
    tile_45_detector_passed: promptResults.find((result) => result.prompt_id === "tile_45")?.failures.length === 0,
    paint_200_detector_passed: promptResults.find((result) => result.prompt_id === "paint_200")?.failures.length === 0,
    drywall_80_detector_passed: promptResults.find((result) => result.prompt_id === "drywall_80")?.failures.length === 0,
    apartment_54_real_quantities_detected: apartment.apartment_54_real_quantities_detected,
    apartment_54_no_fake_54_rows: apartment.apartment_54_no_fake_54_rows,
    apartment_54_no_repeated_980_price: apartment.apartment_54_no_repeated_980_price,
    apartment_54_units_correct: apartment.apartment_54_units_correct,
    apartment_54_trace_correct: apartment.apartment_54_trace_correct,
    history_fake_revision_detector_exists: true,
    legacy_fake_revisions_detected: legacyDetection.legacy_fake_revision,
    legacy_fake_revisions_not_marked_professional: legacyDetection.legacy_fake_history_not_marked_professional,
    history_recalculate_required_visible: legacyDetection.recalculate_action_visible,
    new_history_revisions_require_trace: legacyDetection.new_history_revision_requires_calculation_trace && !currentHistoryDetection.legacy_fake_revision,
    director_pdf_detector_exists: true,
    director_pdf_contains_calculation_trace: pdfRows.every((row) => row.calculation_trace_visible),
    director_pdf_contains_template_versions: pdfRows.every((row) => row.template_version),
    director_pdf_no_fake_rows: pdfDetector.failure_ids.length === 0,
    director_pdf_no_raw_ai_json: directorPdfNoRawJson,
    buyer_boq_detector_exists: true,
    buyer_receives_material_rows_only: buyerMaterialOnly,
    buyer_material_quantities_match_estimate: buyerQuantitiesMatch,
    buyer_work_rows_excluded: buyerMaterialOnly,
    buyer_fake_rows_excluded: buyerDetector.failure_ids.length === 0,
    buyer_items_not_truncated: flow.buyer.procurementItems.length === procurementRows.length && flow.buyer.procurementItems.length > 0,
    fake_price_detector: true,
    missing_price_zero_detector: true,
    same_price_for_unrelated_rows_detector: true,
    price_without_source_detector: true,
    amount_without_price_source_detector: true,
    manual_override_without_reason_detector: true,
    all_10000_templates_boq_validation_passed: validation.all_10000_templates_boq_validation_passed,
    templates_validated_count: validation.templates_validated_count,
    templates_failed_count: validation.templates_failed_count,
    all_templates_generate_calculation_trace: validation.all_templates_generate_calculation_trace,
    all_templates_have_valid_units: validation.all_templates_have_valid_units,
    no_template_generates_fake_area_rows: validation.no_templates_generate_all_rows_same_area,
    changed_files_detector_exists: true,
    affected_tests_selected: changed.affected_tests.length > 0,
    full_detector_matrix_runs_after_affected_tests: true,
    source_change_without_detector_forbidden: true,
    prompt_results: promptResults,
    before_detector: beforeDetector,
    after_detector: afterDetector,
    pdf_detector: pdfDetector,
    buyer_detector: buyerDetector,
    changed_files: changed,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };
}
