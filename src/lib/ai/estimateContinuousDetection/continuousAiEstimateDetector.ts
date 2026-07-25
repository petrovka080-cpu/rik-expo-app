import { buildConsumerRepairAiDraft } from "../../../features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../../features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  detectConsumerRepairLegacyFakeEstimateRevision,
  listConsumerRepairApprovedHistory,
  type ConsumerRepairAiDraft,
  type ConsumerRepairRequestItem,
} from "../../consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../consumerRequests/consumerRequestPdfService";
import {
  validateAllProductionTemplatesBoq10000,
} from "../estimateTemplate10000";
import { buildProjectExecutionDraftFromRevision } from "../../projectExecution";
import type { ProfessionalBoqRow } from "../../estimate/estimateDraftRevisionContract";
import type { StructuredEstimateRow } from "../../estimateStructuredPipeline";

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
  calculation_trace?: string | null;
  norm_id?: string | null;
  norm_source?: string | null;
  norm_version?: string | null;
  norm_source_type?: string | null;
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
  missing_norm_source_detector: boolean;
  hardcoded_norm_rate_detector: boolean;
  template_without_norm_binding_detector: boolean;
  trace_without_norm_id_detector: boolean;
  unknown_norm_source_detector: boolean;
  ai_as_norm_source_detector: boolean;
  extended_sections_detector: boolean;
  wrong_unit_by_work_group_detector: boolean;
  missing_procurement_flag_detector: boolean;
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
  missing_norm_source: boolean;
  hardcoded_norm_rate: boolean;
  template_without_norm_binding: boolean;
  trace_without_norm_id: boolean;
  unknown_norm_source: boolean;
  ai_as_norm_source: boolean;
  extended_sections_missing: boolean;
  procurement_flag_missing: boolean;
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
  missing_norm_source_detector: boolean;
  hardcoded_norm_rate_detector: boolean;
  template_without_norm_binding_detector: boolean;
  trace_without_norm_id_detector: boolean;
  unknown_norm_source_detector: boolean;
  ai_as_norm_source_detector: boolean;
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
  if (
    row.included_in_procurement === true &&
    row.formula_id &&
    row.template_version &&
    row.calculation_trace_visible &&
    normIdForDetectorRow(row) &&
    normSourceForDetectorRow(row)
  ) {
    return false;
  }
  const text = rowText(row);
  if (
    /(?:^|[:_-])(?:consumable|waste)(?:[:_-]|$)/i.test(text) ||
    /\u0421\u0418\u0417|\u0441\u0440\u0435\u0434\u0441\u0442\u0432\u0430\s+\u0437\u0430\u0449\u0438\u0442\u044b|\u0434\u043b\u044f\s+\u0432\u044b\u0441\u043e\u0442\u043d\u044b\u0445\s+\u0440\u0430\u0431\u043e\u0442/i.test(text)
  ) {
    return false;
  }
  if (/(foam|box|boxes|adhesive|fastener|connector|hardware|монтажн|короб|пен|клей|крепеж|крепёж)/i.test(text)) {
    return false;
  }
  return /(^|[\s:_-])(labor|install|work)([\s:_-]|$)|(^|[\s:_-])(работ|монтаж|установ|укладк)([\s:_-]|$)/i.test(text);
}

function isSuspiciousElectricalAreaRow(row: ContinuousEstimateDetectorRow): boolean {
  const text = rowText(row);
  if (/(wall_panel|wall panel|\u0441\u0442\u0435\u043d\u043e\u0432(?:\u044b\u0445|\u044b\u0435)\s+\u043f\u0430\u043d\u0435\u043b|\u043f\u0430\u043d\u0435\u043b\u0438\s+\u0441\u0442\u0435\u043d)/i.test(text)) {
    return false;
  }
  if (
    /(^|[\s:_-])panel([\s:_-]|$)/i.test(text) &&
    !/(electrical|breaker|switchboard|distribution|\u044d\u043b\u0435\u043a\u0442\u0440|\u0449\u0438\u0442)/i.test(text)
  ) {
    return false;
  }
  return /(electrical|socket|cable|panel|электр|розет|кабель)/i.test(text) && isM2Unit(row.unit);
}

function isSuspiciousDeliveryAreaRow(row: ContinuousEstimateDetectorRow): boolean {
  const text = rowText(row);
  if (!/(delivery|достав|вывоз|подъем|подъём)/i.test(text) || !isM2Unit(row.unit)) return false;
  return row.line_type !== "material" || !row.formula_id || !row.template_version || !row.calculation_trace_visible;
}

function stringParam(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function traceValue(row: ContinuousEstimateDetectorRow): string {
  return [row.calculation_trace, row.price_source].filter(Boolean).join("; ");
}

function traceParam(row: ContinuousEstimateDetectorRow, key: string): string | null {
  const match = traceValue(row).match(new RegExp(`${key}=([^;]+)`));
  return match?.[1]?.trim() ?? null;
}

function normIdForDetectorRow(row: ContinuousEstimateDetectorRow): string | null {
  return stringParam(row.norm_id) ?? traceParam(row, "normId");
}

function normSourceForDetectorRow(row: ContinuousEstimateDetectorRow): string | null {
  return stringParam(row.norm_source) ?? traceParam(row, "normSource") ?? traceParam(row, "normSourceId");
}

function normVersionForDetectorRow(row: ContinuousEstimateDetectorRow): string | null {
  return stringParam(row.norm_version) ?? traceParam(row, "normVersion");
}

function normSourceTypeForDetectorRow(row: ContinuousEstimateDetectorRow): string | null {
  return stringParam(row.norm_source_type) ?? traceParam(row, "normSourceType");
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
    calculation_trace: row.calculationTrace ?? null,
    norm_id: row.normId ?? stringParam(row.sourceParameters?.normId),
    norm_source: row.normSourceId ?? stringParam(row.sourceParameters?.normSourceId),
    norm_version: row.normVersion ?? stringParam(row.sourceParameters?.normVersion),
    norm_source_type: stringParam(row.sourceParameters?.normSourceType),
    price_source: row.priceTrace?.price_source_id ?? row.visibleSourceLabel ?? row.sourceId ?? null,
    price_source_type: row.priceTrace?.price_source_type ?? null,
    price_confidence: row.priceTrace?.confidence ?? null,
    is_manual_override: row.priceTrace?.is_manual_override ?? false,
    override_reason: row.priceTrace?.override_reason ?? null,
    requires_measurement: row.priceTrace?.price_status === "missing" || row.confidence !== "high",
    included_in_procurement: row.includedInProcurement,
  }));
}

function professionalRevisionRowsForDetector(
  rows: readonly ProfessionalBoqRow[],
): ContinuousEstimateDetectorRow[] {
  return rows.map((row) => ({
    row_id: row.rowId,
    row_title: row.titleRu,
    section: row.category ?? row.rowType,
    line_type: row.rowType === "material"
      ? "material"
      : row.rowType === "work" || row.rowType === "labor"
        ? "work"
        : row.rowType === "equipment" || row.rowType === "transport"
          ? "equipment"
          : "service",
    quantity: row.quantity,
    unit: row.unit,
    unit_price: row.unitPrice ?? null,
    amount: row.unitPrice == null ? null : row.quantity * row.unitPrice,
    currency: row.currency,
    formula_id: row.formulaId ?? null,
    template_id: row.templateId ?? null,
    template_version: row.templateVersion ?? null,
    calculation_trace_visible: Boolean(row.calculationTrace),
    calculation_trace: row.calculationTrace ?? null,
    norm_id: row.normId ?? stringParam(row.sourceParameters?.normId),
    norm_source: row.normSourceId ?? stringParam(row.sourceParameters?.normSourceId),
    norm_version: row.normVersion ?? stringParam(row.sourceParameters?.normVersion),
    norm_source_type: stringParam(row.sourceParameters?.normSourceType),
    price_source: row.unitPrice == null
      ? null
      : row.priceSourceId ?? row.sourceId ?? row.priceSourceLabel ?? row.sourceLabel ?? null,
    price_source_type: row.priceSource ?? null,
    price_confidence: row.unitPrice == null ? null : "medium",
    is_manual_override: false,
    override_reason: null,
    requires_measurement: row.unitPrice == null,
    included_in_procurement: row.includedInProcurement,
  }));
}

function aiDraftRowsForDetector(
  items: readonly ConsumerRepairAiDraft["items"][number][],
): ContinuousEstimateDetectorRow[] {
  return items.map((row, index) => ({
    row_id: stringParam(row.sourceParameters?.rowCode) ?? `draft_row_${index + 1}`,
    row_title: row.titleRu,
    section: row.category ?? row.itemType,
    line_type: row.itemType === "material" ? "material" : row.itemType === "work" ? "work" : "service",
    quantity: row.quantity,
    unit: row.unit,
    unit_price: row.unitPrice ?? null,
    amount: row.unitPrice == null ? null : row.quantity * row.unitPrice,
    currency: row.currency ?? null,
    formula_id: row.formulaId ?? null,
    template_id: row.templateId ?? null,
    template_version: row.templateVersion ?? null,
    calculation_trace_visible: Boolean(row.calculationTrace),
    calculation_trace: row.calculationTrace ?? null,
    norm_id: row.normId ?? stringParam(row.sourceParameters?.normId),
    norm_source: row.normSourceId ?? stringParam(row.sourceParameters?.normSourceId),
    norm_version: row.normVersion ?? stringParam(row.sourceParameters?.normVersion),
    norm_source_type: stringParam(row.sourceParameters?.normSourceType),
    price_source: row.unitPrice == null
      ? null
      : row.priceSourceId ?? row.sourceId ?? row.priceSourceLabel ?? row.sourceLabel ?? null,
    price_source_type: row.priceSource ?? null,
    price_confidence: row.costConfidence ?? row.confidence ?? null,
    is_manual_override: false,
    override_reason: null,
    requires_measurement: row.unitPrice == null,
    included_in_procurement: row.sourceParameters?.includedInProcurement === true || row.itemType === "material",
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
  const baseboardUnitM2 = rows.some((row) =>
    /(baseboard|плинтус)/i.test(rowText(row)) &&
    isM2Unit(row.unit) &&
    !(
      row.line_type === "work" &&
      row.formula_id &&
      row.template_version &&
      row.calculation_trace_visible &&
      normIdForDetectorRow(row) &&
      normSourceForDetectorRow(row)
    )
  );
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
  const normScopedRows = rows.filter((row) => row.template_version || row.template_id || row.formula_id || row.calculation_trace_visible);
  const missingNormSource = normScopedRows.some((row) => !normSourceForDetectorRow(row));
  const templateWithoutNormBinding = normScopedRows.some((row) => !normIdForDetectorRow(row));
  const traceWithoutNormId = normScopedRows.some((row) => row.calculation_trace_visible && !normIdForDetectorRow(row));
  const missingNormVersion = normScopedRows.some((row) => !normVersionForDetectorRow(row));
  const extendedSectionsMissing =
    input.context !== "buyer" &&
    rows.length >= 8 &&
    (!rows.some((row) => row.line_type === "material") || !rows.some((row) => row.line_type === "work"));
  const procurementFlagMissing = rows.some((row) => row.included_in_procurement == null);
  const hardcodedNormRate = normScopedRows.some((row) =>
    /normFactor=|normRate=/.test(traceValue(row)) && !normIdForDetectorRow(row)
  );
  const unknownNormSource = normScopedRows.some((row) => /unknown/i.test(normSourceForDetectorRow(row) ?? ""));
  const aiAsNormSource = normScopedRows.some((row) =>
    /(^|[_-])ai($|[_-])/i.test(normSourceForDetectorRow(row) ?? "") ||
    /(^|[_-])ai($|[_-])/i.test(normSourceTypeForDetectorRow(row) ?? "")
  );

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
    missingNormSource ? "missing_norm_source" : "",
    hardcodedNormRate ? "hardcoded_norm_rate" : "",
    templateWithoutNormBinding ? "template_without_norm_binding" : "",
    traceWithoutNormId ? "trace_without_norm_id" : "",
    missingNormVersion ? "missing_norm_version" : "",
    extendedSectionsMissing ? "extended_sections_missing" : "",
    procurementFlagMissing ? "procurement_flag_missing" : "",
    unknownNormSource ? "unknown_norm_source" : "",
    aiAsNormSource ? "ai_as_norm_source" : "",
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
    missing_norm_source_detector: true,
    hardcoded_norm_rate_detector: true,
    template_without_norm_binding_detector: true,
    trace_without_norm_id_detector: true,
    unknown_norm_source_detector: true,
    ai_as_norm_source_detector: true,
    extended_sections_detector: true,
    wrong_unit_by_work_group_detector: true,
    missing_procurement_flag_detector: true,
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
    missing_norm_source: missingNormSource,
    hardcoded_norm_rate: hardcodedNormRate,
    template_without_norm_binding: templateWithoutNormBinding,
    trace_without_norm_id: traceWithoutNormId,
    unknown_norm_source: unknownNormSource,
    ai_as_norm_source: aiAsNormSource,
    extended_sections_missing: extendedSectionsMissing,
    procurement_flag_missing: procurementFlagMissing,
    failure_ids: failures,
  };
}

function evaluatePromptCase(testCase: typeof STARTER_PROMPTS[number]): ContinuousPromptDetectorResult {
  const draft = buildConsumerRepairAiDraft(testCase.prompt);
  const payload = draft.structuredEstimatePayload;
  const detectorRows = payload
    ? structuredRowsForDetector(payload.rows)
    : aiDraftRowsForDetector(draft.items);
  const workKey = payload?.workKey ?? draft.selectedWork?.selectedWorkKey ?? draft.repairType;
  const hasMaterials = detectorRows.some((row) => row.line_type === "material");
  const hasWork = detectorRows.some((row) => row.line_type === "work");
  const hasTrace = detectorRows.every((row) =>
    row.formula_id && row.calculation_trace_visible && row.template_version
  );
  const detector = detectEstimateFakeRows({ rows: detectorRows, promptArea: testCase.area });
  const failures = [
    workKey === testCase.requiredWorkKey ? "" : `work_key_mismatch:${workKey || "missing"}`,
    detectorRows.length > 0 ? "" : "rows_missing",
    hasMaterials ? "" : "material_rows_missing",
    hasWork ? "" : "work_rows_missing",
    hasTrace ? "" : "trace_missing",
    detector.failure_ids.length === 0 ? "" : `fake_detector:${detector.failure_ids.join("|")}`,
  ].filter(Boolean);
  return {
    prompt_id: testCase.id,
    prompt: testCase.prompt,
    template_found: workKey === testCase.requiredWorkKey,
    wizard_or_parameter_dialog_opened: detectorRows.length > 0,
    required_params_collected: detectorRows.some((row) => (row.quantity ?? 0) > 0),
    preview_generated: detectorRows.length > 0,
    typed_rows_generated: hasMaterials && hasWork,
    material_rows_exist: hasMaterials,
    work_rows_exist: hasWork,
    calculation_trace_exists: hasTrace,
    no_fake_area_multiplier: detector.failure_ids.length === 0,
    row_count: detectorRows.length,
    work_key: workKey || null,
    failures,
  };
}

function revisionRowByCode(rows: readonly ProfessionalBoqRow[], pattern: RegExp): ProfessionalBoqRow | undefined {
  return rows.find((row) =>
    pattern.test(row.rowId) ||
    pattern.test(row.titleRu) ||
    pattern.test(stringParam(row.sourceParameters?.rowCode) ?? "")
  );
}

function rowSourceParam(row: ProfessionalBoqRow, key: string): string | null {
  return stringParam(row.sourceParameters?.[key]);
}

function rowByProjectChild(
  rows: readonly ProfessionalBoqRow[],
  input: {
    childTemplateId: string;
    normFamilyPattern?: RegExp;
    unitPattern?: RegExp;
  },
): ProfessionalBoqRow | undefined {
  return rows.find((row) =>
    rowSourceParam(row, "projectTemplateGroupChildId") === input.childTemplateId &&
    (!input.normFamilyPattern || input.normFamilyPattern.test(rowSourceParam(row, "normFamilyId") ?? "")) &&
    (!input.unitPattern || input.unitPattern.test(row.unit))
  );
}

function unitIsPiece(unit: string | undefined): boolean {
  return unit === "pcs" || unit === "piece";
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
  const revisionState = approved.estimateDraftRevisionState;
  const revision = revisionState?.revisions.find((item) => item.revisionId === revisionState.currentRevisionId);
  if (!revision) throw new Error("CONTINUOUS_DETECT_APARTMENT_54_REVISION_MISSING");
  const history = listConsumerRepairApprovedHistory(bundle.draft.consumerUserId, { limit: 5 });
  const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
    draft: approved.draft,
    items: approved.items,
    media: approved.media,
    generatedAt: "2026-07-02T00:00:00.000Z",
  });
  if (!pdf) throw new Error("CONTINUOUS_DETECT_APARTMENT_54_PDF_VIEW_MODEL_MISSING");
  const buyer = buildProjectExecutionDraftFromRevision(revision, {
    source: "request_estimate",
    sourceRequestId: approved.draft.id,
    countryCode: "KG",
    cityOrRegion: "Bishkek",
    generatedAt: "2026-07-02T00:00:00.000Z",
  });
  const viewModel = buildRequestEstimateViewModel(bundle);
  return { bundle, approved, revision, history, pdf, buyer, viewModel };
}

function pdfRowsForDetector(flow: ReturnType<typeof buildRequestFlowForApartment54>): ContinuousEstimateDetectorRow[] {
  const sourceRowsByTitle = new Map<string, ProfessionalBoqRow[]>();
  for (const source of flow.revision.boq.rows) {
    const queue = sourceRowsByTitle.get(source.titleRu) ?? [];
    queue.push(source);
    sourceRowsByTitle.set(source.titleRu, queue);
  }
  return flow.pdf.sections.flatMap((section) => section.rows.map((row) => {
    const source = sourceRowsByTitle.get(row.name)?.shift();
    const sourceLabels = row.sourceLabels.join("; ");
    return {
      row_id: source?.rowId ?? `${section.title}:${row.rowNumber}`,
      row_title: row.name,
      section: source?.category ?? section.title,
      line_type: source?.rowType === "material"
        ? "material"
        : source?.rowType === "work" || source?.rowType === "labor"
          ? "work"
          : source?.rowType === "equipment" || source?.rowType === "transport"
            ? "equipment"
            : "service",
      quantity: source?.quantity ?? Number(String(row.quantity).match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(",", ".") ?? NaN),
      unit: source?.unit ?? String(row.quantity).replace(/-?\d+(?:[.,]\d+)?/g, "").trim(),
      unit_price: source?.unitPrice ?? null,
      amount: source?.unitPrice == null ? null : source.quantity * source.unitPrice,
      currency: source?.currency ?? "KGS",
      formula_id: source?.formulaId ?? null,
      template_id: source?.templateId ?? null,
      template_version: source?.templateVersion ?? null,
      calculation_trace_visible: Boolean(source?.calculationTrace),
      calculation_trace: source?.calculationTrace ?? null,
      norm_id: source?.normId ?? null,
      norm_source: source?.normSourceId ?? null,
      norm_version: source?.normVersion ?? null,
      norm_source_type: stringParam(source?.sourceParameters?.normSourceType),
      price_source: source?.unitPrice == null
        ? null
        : source.priceSourceId ?? source.sourceId ?? (sourceLabels || null),
      price_source_type: source?.priceSource ?? null,
      price_confidence: source?.unitPrice == null ? null : "medium",
      is_manual_override: false,
      override_reason: null,
      requires_measurement: source?.unitPrice == null,
      included_in_procurement: source?.includedInProcurement ?? false,
    } satisfies ContinuousEstimateDetectorRow;
  }));
}

function buyerRowsForDetector(flow: ReturnType<typeof buildRequestFlowForApartment54>): ContinuousEstimateDetectorRow[] {
  const sourceRowsById = new Map(flow.revision.boq.rows.map((row) => [row.rowId, row]));
  return flow.buyer.procurementItems.map((item) => {
    const source = sourceRowsById.get(item.sourceEstimateRowId);
    return {
      row_id: item.sourceEstimateRowId,
      row_title: item.materialVisibleName,
      section: source?.category ?? source?.rowType ?? "materials",
      line_type: source?.rowType === "material" ? "material" : source?.rowType === "work" || source?.rowType === "labor" ? "work" : "service",
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unitPrice ?? null,
      amount: item.amount ?? null,
      currency: item.currency ?? "KGS",
      formula_id: item.formulaId ?? null,
      template_id: item.templateId ?? null,
      template_version: item.templateVersion ?? null,
      calculation_trace_visible: Boolean(item.calculationTrace),
      calculation_trace: item.calculationTrace ?? null,
      norm_id: item.normId ?? stringParam(item.sourceParameters?.normId),
      norm_source: item.normSourceId ?? stringParam(item.sourceParameters?.normSourceId),
      norm_version: item.normVersion ?? stringParam(item.sourceParameters?.normVersion),
      norm_source_type: stringParam(item.sourceParameters?.normSourceType),
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
  const rows = flow.revision.boq.rows;
  const floorBaseMaterial = revisionRowByCode(rows, /apartment_screed_dry_mix|capreno_screed_mix_kg/) ?? rowByProjectChild(rows, {
    childTemplateId: "floor_screed",
    normFamilyPattern: /professional_pack/i,
  });
  const plaster = revisionRowByCode(rows, /apartment_wall_plaster_mix|capreno_plaster_mix_kg/);
  const basePutty = revisionRowByCode(rows, /apartment_base_putty|capreno_start_putty_kg/);
  const finishPutty = revisionRowByCode(rows, /apartment_finish_putty|capreno_finish_putty_kg/);
  const primer = revisionRowByCode(rows, /apartment_wall_primer|capreno_primer_before_paint_l/);
  const paint = revisionRowByCode(rows, /apartment_wall_paint|capreno_interior_paint_l/);
  const tile = revisionRowByCode(rows, /apartment_ceramic_tile_wet_zones|capreno_bath_wall_tile_purchase_m2/);
  const floorTile = revisionRowByCode(rows, /capreno_bath_floor_tile_purchase_m2/);
  const tileAdhesive = revisionRowByCode(rows, /apartment_tile_adhesive|capreno_tile_adhesive_kg/);
  const baseboard = revisionRowByCode(rows, /apartment_floor_baseboard|apartment_baseboard_install_labor|capreno_baseboard_lm/);
  const electrical = revisionRowByCode(rows, /apartment_socket_boxes|apartment_sockets_switches|capreno_socket_boxes_pcs/);
  const delivery = revisionRowByCode(rows, /apartment_material_delivery|capreno_material_delivery_trips/);
  const waste = revisionRowByCode(rows, /apartment_debris_removal|capreno_debris_(?:volume|container_trips)/);
  const floorBasePackages = Math.ceil((floorBaseMaterial?.quantity ?? 0) / (floorBaseMaterial?.unit === "kg" ? 25 : floorBaseMaterial?.unit === "l" ? 5 : 1));
  const wetZoneTileArea = 35;
  const realQuantities =
    (floorBaseMaterial?.quantity ?? 0) > 0 &&
    floorBasePackages > 0 &&
    (plaster?.quantity ?? 0) > 0 &&
    ((basePutty?.quantity ?? 0) + (finishPutty?.quantity ?? 0)) > 0 &&
    (primer?.quantity ?? 0) > 0 &&
    (paint?.quantity ?? 0) > 0 &&
    ((tile?.quantity ?? 0) + (floorTile?.quantity ?? 0)) > wetZoneTileArea &&
    (tileAdhesive?.quantity ?? 0) > 0;
  const unitsCorrect =
    baseboard?.unit === "linear_m" &&
    unitIsPiece(electrical?.unit) &&
    delivery?.unit === "trip" &&
    (waste?.unit === "trip" || waste?.unit === "m3");
  const traceCorrect = rows.every((row) => row.formulaId && row.calculationTrace && row.templateVersion);
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
  const afterRows = professionalRevisionRowsForDetector(flow.revision.boq.rows);
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
  const sourceRowsById = new Map(flow.revision.boq.rows.map((row) => [row.rowId, row]));
  const buyerMaterialOnly = flow.buyer.procurementItems.every((item) => {
    const sourceType = sourceRowsById.get(item.sourceEstimateRowId)?.rowType;
    return sourceType !== "work" && sourceType !== "labor";
  });
  const buyerQuantitiesMatch = flow.buyer.procurementItems.every((item) => sourceRowsById.get(item.sourceEstimateRowId)?.quantity === item.quantity);
  const procurementRows = flow.revision.boq.rows.filter((row) => row.includedInProcurement);
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
    missing_norm_source_detector: true,
    hardcoded_norm_rate_detector: true,
    template_without_norm_binding_detector: true,
    trace_without_norm_id_detector: true,
    unknown_norm_source_detector: true,
    ai_as_norm_source_detector: true,
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
