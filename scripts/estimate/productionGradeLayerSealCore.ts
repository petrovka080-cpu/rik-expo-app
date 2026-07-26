import criticalCasesJson from "../../tests/fixtures/estimate/productionGradeWebAndroidCriticalCases.json";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  getConsumerRepairPdfStorageObject,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import { validateProfessionalBoqRuntimeContract } from "../../src/lib/estimate/professionalBoqRuntimeValidator";

export const PRODUCTION_GRADE_CRITICAL_CASE_SET = "production-grade-critical" as const;
export const GREEN_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_WEB_ANDROID_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_WEB_ANDROID_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_INCOMPLETE_NO_GREEN =
  "STOP_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_INCOMPLETE_NO_GREEN" as const;

export const PRODUCTION_GRADE_COVERAGE_GROUPS = [
  "interior_renovation",
  "plaster_paint_tile_flooring",
  "concrete_reinforcement_formwork_masonry",
  "roof_mansard_facade_glazing",
  "drilling_cutting_demolition",
  "fencing_landscaping",
  "road_earthworks",
  "water_sewer_stormwater",
  "electrical_power_low_voltage",
  "hydraulic_bridge_tunnel_industrial_high_risk",
] as const;

export type ProductionGradeCoverageGroup = typeof PRODUCTION_GRADE_COVERAGE_GROUPS[number];

export type ProductionGradeCriticalCase = {
  case_id: string;
  prompt: string;
  expected_family: string;
  expected_template_id?: string;
  selected_template_id?: string;
  selected_work_key?: string;
  coverage_group: ProductionGradeCoverageGroup;
  source: string;
  required_row_types: string[];
  required_material_keywords: string[];
  required_service_keywords: string[];
  required_equipment_keywords: string[];
  expected_units: string[];
  forbidden_units: string[];
  high_risk_expected: boolean;
  pdf_required: boolean;
  buyer_handoff_required: boolean;
  forbidden_refusal: boolean;
  forbidden_drawings_required_stop: boolean;
  forbidden_raw_dump: boolean;
  forbidden_fake_final_total: boolean;
};

export type ProductionGradeCriticalCasesFixture = {
  schema: "production-grade-web-android-critical-cases-v1";
  case_set: typeof PRODUCTION_GRADE_CRITICAL_CASE_SET;
  generated_from: string[];
  generated_policy: string;
  coverage_groups: Record<ProductionGradeCoverageGroup, number>;
  cases: ProductionGradeCriticalCase[];
};

export type ProductionGradeCaseProof = {
  case_id: string;
  prompt: string;
  coverage_group: ProductionGradeCoverageGroup;
  source: string;
  expected_family: string;
  expected_template_id: string | null;
  actual_family: string;
  repair_type: string;
  selected_work_key: string | null;
  selected_template_id: string | null;
  draft_source: "ai_estimate_runtime" | "legacy_consumer_repair_adapter";
  row_count: number;
  work_rows_count: number;
  material_rows_count: number;
  service_rows_count: number;
  equipment_rows_count: number;
  other_rows_count: number;
  grouped_sections_count: number;
  assumption_rows_count: number;
  missing_inputs_count: number;
  units: string[];
  required_row_types_present: boolean;
  expected_units_present: boolean;
  forbidden_units_absent: boolean;
  required_keywords_present: boolean;
  first_work_title: string | null;
  first_material_title: string | null;
  first_service_title: string | null;
  first_equipment_title: string | null;
  risk_level: string | null;
  high_risk_contract_present: boolean;
  dangerous_work_not_refused: boolean;
  drawings_not_required_for_preliminary_boq: boolean;
  assumptions_visible: boolean;
  risk_notes_visible: boolean;
  missing_inputs_visible: boolean;
  final_contract_status_blocked_until_review: boolean;
  all_rows_have_row_type: boolean;
  all_rows_have_canonical_unit: boolean;
  all_rows_have_norm_source: boolean;
  all_rows_have_calculation_trace: boolean;
  all_rows_have_runtime_contract_marker: boolean;
  no_raw_dump: boolean;
  no_fake_final_total_without_source: boolean;
  snapshot_created: boolean;
  snapshot_row_count: number;
  pdf_generated_from_snapshot: boolean;
  pdf_rows_bound_to_snapshot: boolean;
  pdf_storage_object_exists: boolean;
  pdf_body_length: number;
  buyer_handoff_created: boolean;
  buyer_handoff_procurement_subset_valid: boolean;
  buyer_handoff_items_count: number;
  buyer_work_rows_count: number;
  passed: boolean;
  blocking_reasons: string[];
};

export type ProductionGradeLayerMatrixRow = {
  template_id: string;
  template_name: string;
  family: string;
  category: string;
  subtype: string;
  calculator_id: string | null;
  parameter_schema_id: string | null;
  norm_pack_id: string | null;
  source_registry_id: string | null;
  status: string;
  row_count: number;
  work_rows_count: number;
  material_rows_count: number;
  labor_rows_count: number;
  service_rows_count: number;
  equipment_rows_count: number;
  transport_rows_count: number;
  mobilization_rows_count: number;
  overhead_rows_count: number;
  grouped_ui_sections_count: number;
  pdf_row_count: number;
  buyer_handoff_row_count: number;
  generic_rows_count: number;
  template_only_generic_rows_count: number;
  wrong_unit_rows_count: number;
  unknown_unit_rows_count: number;
  empty_estimate_count: number;
  raw_dump_ui_count: number;
  fake_price_count: number;
  fake_final_total_count: number;
  calculation_trace_valid: boolean;
  norm_source_valid: boolean;
  pdf_mapping_valid: boolean;
  buyer_handoff_mapping_valid: boolean;
  production_grade_technical_ready: boolean;
  blocking_reasons: string[];
};

const RAW_PUBLIC_TEXT_RE =
  /\b(?:PRICE_MISSING|source_parameters|template_id|template_version|formula_id|raw_ai_json|expandedComplexCalculator|rowCode|round_to|normFactor|PARTIAL_PRICE_MISSING|price date|confidence\s+\d|region\s+[A-Z]{2})\b/i;
const DRAWINGS_REQUIRED_STOP_RE =
  /(?:черт[её]ж[и]?\s+обязательн.{0,40}(?:расчет|расчёт|смет)|drawings_required_stop|drawings required stop)/i;
const RISK_NOTE_RE =
  /(?:риск|допуск|обследован|специалист|подрядчик|инженер|проект|risk|permit|inspection|specialist|contractor|engineer|design)/i;
const ASSUMPTION_RE =
  /(?:допущен|цены|чертеж|assumption|preliminary|price|drawing)/i;
const MISSING_INPUT_RE =
  /(?:недостающ|вводн|missing|input|assumed)/i;

function currentRevision(bundle: ReturnType<typeof approveConsumerRepairRequestDraft>) {
  return bundle.estimateRevisionState?.revisions.find(
    (candidate) => candidate.revision_id === bundle.estimateRevisionState?.current_revision_id,
  ) ?? null;
}

type ProductionGradeAiDraft = ReturnType<typeof buildConsumerRepairAiDraft>;

function selectedWorkKeyLooksLikeTemplateId(value: string | null | undefined): boolean {
  const key = value?.trim() ?? "";
  return Boolean(
    key &&
    (
      /_v\d+$/i.test(key) ||
      key.includes("_professional_expanded_") ||
      key.includes("_expanded_complex_") ||
      key.includes("_preliminary_boq_") ||
      key.includes("_professional_boq_runtime_")
    ),
  );
}

function selectedTemplateIdFromDraft(aiDraft: ProductionGradeAiDraft): string | null {
  const selectedWorkKey = aiDraft.selectedWork?.selectedWorkKey?.trim() ?? "";
  if (selectedWorkKeyLooksLikeTemplateId(selectedWorkKey)) return selectedWorkKey;
  return aiDraft.items.find((item) => item.templateId?.trim())?.templateId?.trim() ?? null;
}

function actualFamilyFromDraft(aiDraft: ProductionGradeAiDraft): string {
  const selectedWorkKey = aiDraft.selectedWork?.selectedWorkKey?.trim() ?? "";
  if (selectedWorkKey && !selectedWorkKeyLooksLikeTemplateId(selectedWorkKey)) return selectedWorkKey;
  return aiDraft.repairType || selectedWorkKey || "";
}

function buildProductionGradeAiDraft(testCase: ProductionGradeCriticalCase): {
  aiDraft: ProductionGradeAiDraft;
  draftSource: ProductionGradeCaseProof["draft_source"];
} {
  const runtimeDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
    rawInput: testCase.prompt,
    selectedTemplateId: testCase.selected_template_id ?? null,
    selectedWorkKey: testCase.selected_work_key ?? null,
    city: "Bishkek",
    currency: "KGS",
  });
  if (runtimeDraft) {
    return {
      aiDraft: runtimeDraft,
      draftSource: "ai_estimate_runtime",
    };
  }
  return {
    aiDraft: buildConsumerRepairAiDraft(testCase.prompt, { city: "Bishkek", currency: "KGS" }),
    draftSource: "legacy_consumer_repair_adapter",
  };
}

function publicText(input: {
  aiDraft: ProductionGradeAiDraft;
  viewModel: ReturnType<typeof buildRequestEstimateViewModel>;
  pdfBody: string;
}): string {
  return [
    input.aiDraft.titleRu,
    input.aiDraft.summaryRu,
    input.aiDraft.safetyMessageRu,
    ...input.aiDraft.missingData,
    input.viewModel?.title,
    input.viewModel?.summary,
    ...(input.viewModel?.assumptionRows.flatMap((row) => [row.label, row.value]) ?? []),
    input.pdfBody,
  ].filter(Boolean).join("\n");
}

function uniqueSorted(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))].sort();
}

function itemCounts(items: ReturnType<typeof buildConsumerRepairAiDraft>["items"]) {
  const equipmentItems = items.filter((item) => String(item.category ?? "").toLowerCase() === "equipment");
  return {
    work_rows_count: items.filter((item) => item.itemType === "work").length,
    material_rows_count: items.filter((item) => item.itemType === "material").length,
    service_rows_count: items.filter((item) => item.itemType === "service").length,
    equipment_rows_count: equipmentItems.length,
    other_rows_count: items.filter((item) =>
      item.itemType !== "work" &&
      item.itemType !== "material" &&
      item.itemType !== "service"
    ).length,
  };
}

function rowTitles(items: ReturnType<typeof buildConsumerRepairAiDraft>["items"], itemType: string): string[] {
  return items.filter((item) => item.itemType === itemType).map((item) => item.titleRu);
}

function equipmentRowTitles(items: ReturnType<typeof buildConsumerRepairAiDraft>["items"]): string[] {
  return items
    .filter((item) => String(item.category ?? "").toLowerCase() === "equipment")
    .map((item) => item.titleRu);
}

function keywordsPresent(titles: readonly string[], keywords: readonly string[]): boolean {
  return keywords.every((keyword) =>
    titles.some((title) => title.toLowerCase().includes(keyword.toLowerCase()))
  );
}

function normalizeFixture(input: typeof criticalCasesJson): ProductionGradeCriticalCasesFixture {
  return input as ProductionGradeCriticalCasesFixture;
}

export function loadProductionGradeCriticalCases(): ProductionGradeCriticalCase[] {
  return normalizeFixture(criticalCasesJson).cases;
}

export function productionGradeCorpusFingerprint(cases = loadProductionGradeCriticalCases()): string {
  return cases.map((testCase) =>
    `${testCase.case_id}:${testCase.source}:${testCase.coverage_group}:${testCase.expected_family}:${testCase.expected_template_id ?? ""}:${testCase.selected_template_id ?? ""}:${testCase.selected_work_key ?? ""}:${testCase.prompt}`
  ).join("\n");
}

export function validateProductionGradeCriticalCases(
  fixture: ProductionGradeCriticalCasesFixture = normalizeFixture(criticalCasesJson),
): string[] {
  const blockers: string[] = [];
  const ids = new Set<string>();
  if (fixture.schema !== "production-grade-web-android-critical-cases-v1") blockers.push("fixture_schema_invalid");
  if (fixture.case_set !== PRODUCTION_GRADE_CRITICAL_CASE_SET) blockers.push("fixture_case_set_invalid");
  if (fixture.cases.length !== 100) blockers.push(`fixture_case_count_invalid:${fixture.cases.length}`);
  for (const group of PRODUCTION_GRADE_COVERAGE_GROUPS) {
    const actual = fixture.cases.filter((testCase) => testCase.coverage_group === group).length;
    if (actual < 10) blockers.push(`fixture_coverage_group_short:${group}:${actual}`);
    if (fixture.coverage_groups[group] !== actual) blockers.push(`fixture_coverage_group_count_mismatch:${group}:${fixture.coverage_groups[group]}:${actual}`);
  }
  for (const testCase of fixture.cases) {
    if (ids.has(testCase.case_id)) blockers.push(`fixture_duplicate_case_id:${testCase.case_id}`);
    ids.add(testCase.case_id);
    if (!testCase.prompt.trim()) blockers.push(`fixture_empty_prompt:${testCase.case_id}`);
    if (!testCase.expected_family.trim()) blockers.push(`fixture_missing_expected_family:${testCase.case_id}`);
    if (testCase.expected_template_id != null && !testCase.expected_template_id.trim()) blockers.push(`fixture_empty_expected_template_id:${testCase.case_id}`);
    if (testCase.selected_template_id != null && !testCase.selected_template_id.trim()) blockers.push(`fixture_empty_selected_template_id:${testCase.case_id}`);
    if (testCase.selected_work_key != null && !testCase.selected_work_key.trim()) blockers.push(`fixture_empty_selected_work_key:${testCase.case_id}`);
    if (!PRODUCTION_GRADE_COVERAGE_GROUPS.includes(testCase.coverage_group)) blockers.push(`fixture_bad_coverage_group:${testCase.case_id}`);
    if (!Array.isArray(testCase.required_row_types) || testCase.required_row_types.length === 0) blockers.push(`fixture_missing_required_row_types:${testCase.case_id}`);
    if (!Array.isArray(testCase.expected_units) || testCase.expected_units.length === 0) blockers.push(`fixture_missing_expected_units:${testCase.case_id}`);
    if (!Array.isArray(testCase.forbidden_units)) blockers.push(`fixture_missing_forbidden_units:${testCase.case_id}`);
    if (testCase.pdf_required !== true) blockers.push(`fixture_pdf_not_required:${testCase.case_id}`);
    if (testCase.buyer_handoff_required !== true) blockers.push(`fixture_buyer_handoff_not_required:${testCase.case_id}`);
    if (testCase.forbidden_refusal !== true) blockers.push(`fixture_refusal_not_forbidden:${testCase.case_id}`);
    if (testCase.forbidden_drawings_required_stop !== true) blockers.push(`fixture_drawings_stop_not_forbidden:${testCase.case_id}`);
    if (testCase.forbidden_raw_dump !== true) blockers.push(`fixture_raw_dump_not_forbidden:${testCase.case_id}`);
    if (testCase.forbidden_fake_final_total !== true) blockers.push(`fixture_fake_final_total_not_forbidden:${testCase.case_id}`);
  }
  if (!fixture.cases.some((testCase) => testCase.high_risk_expected)) blockers.push("fixture_has_no_high_risk_cases");
  if (fixture.generated_from.length < 3) blockers.push("fixture_source_corpus_too_narrow");
  return blockers;
}

export function runProductionGradeEstimateCase(
  testCase: ProductionGradeCriticalCase,
): ProductionGradeCaseProof {
  __resetConsumerRepairRequestStoreForTests();
  const { aiDraft, draftSource } = buildProductionGradeAiDraft(testCase);
  const draft = createConsumerRepairRequestDraft({
    consumerUserId: `production-grade-${testCase.case_id}`,
    problemText: testCase.prompt,
    repairType: aiDraft.repairType,
    city: "Bishkek",
    addressText: "production-grade-redacted-address",
    preferredTimeText: "today",
    contactPhone: "0700000000",
    aiDraft,
  });
  const approved = approveConsumerRepairRequestDraft({
    requestDraftId: draft.draft.id,
    userId: draft.draft.consumerUserId,
    generatedAt: "2026-07-05T00:00:00.000Z",
  });
  const revision = currentRevision(approved);
  const snapshotRows = revision?.editable_estimate_snapshot.rows.filter((row) => !row.removed) ?? [];
  const requestPdf = approved.pdfs[0] ?? null;
  const pdfStorage = requestPdf
    ? getConsumerRepairPdfStorageObject({
      storageBucket: requestPdf.storageBucket,
      storageKey: requestPdf.storageKey,
    })
    : null;
  const viewModel = buildRequestEstimateViewModel(approved);
  const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
  const text = publicText({ aiDraft, viewModel, pdfBody: pdfStorage?.body ?? "" });
  const validation = validateProfessionalBoqRuntimeContract({
    prompt: testCase.prompt,
    draft: aiDraft,
    viewModel,
    approvedBundle: approved,
    pdfBody: pdfStorage?.body ?? "",
    buyerHandoff: handoff,
  });
  const counts = itemCounts(aiDraft.items);
  const actualFamily = actualFamilyFromDraft(aiDraft);
  const selectedTemplateId = selectedTemplateIdFromDraft(aiDraft);
  const firstContractItem = aiDraft.items.find((item) => item.sourceParameters?.professionalBoqRuntimeContract);
  const isAsphaltV4Draft =
    aiDraft.items.length > 0 &&
    aiDraft.items.every((item) => item.sourceParameters?.asphaltV4 === true);
  const riskLevel = typeof firstContractItem?.sourceParameters?.professionalBoqRiskLevel === "string"
    ? firstContractItem.sourceParameters.professionalBoqRiskLevel
    : null;
  const professionalDefaultsApplied =
    firstContractItem?.sourceParameters?.professionalBoqDefaultsApplied === true ||
    Boolean(isAsphaltV4Draft && aiDraft.items.some((item) =>
      Array.isArray(item.sourceParameters?.asphaltV4DeclaredAssumptions)
    ));
  const drawingsNotRequiredByContract =
    (
      firstContractItem?.sourceParameters?.professionalBoqDrawingsNotRequiredForPreliminaryBoq === true &&
      firstContractItem?.sourceParameters?.professionalBoqDrawingsRequiredForDraft === false
    ) ||
    isAsphaltV4Draft;
  const finalContractBlockedUntilReview =
    firstContractItem?.sourceParameters?.professionalBoqFinalContractStatusBlockedUntilReview === true ||
    isAsphaltV4Draft;
  const allRowsHaveNormSource = aiDraft.items.every((item) => item.normId && item.normFamilyId && item.normSourceId && item.normVersion);
  const allRowsHaveTrace = aiDraft.items.every((item) => item.formulaId && item.quantityFormula && item.calculationTrace);
  const allRowsHaveMarker = aiDraft.items.every((item) =>
    item.sourceParameters?.professionalBoqRuntimeContract === "professional_boq_runtime_contract_v1" ||
    item.sourceParameters?.asphaltV4 === true
  );
  const pricedRowsWithoutAcceptedSource = aiDraft.items.filter((item) =>
    item.unitPrice != null &&
    !item.priceTrace &&
    item.priceStatus !== "CATALOG_PRICE_VERIFIED" &&
    item.priceStatus !== "PRICEBOOK_VERIFIED" &&
    item.priceStatus !== "REFERENCE_PRICE_ESTIMATE" &&
    item.priceStatus !== "USER_PRICE_OVERRIDE" &&
    item.priceStatus !== "USER_ENTERED_PRICE"
  ).length;
  const units = uniqueSorted(aiDraft.items.map((item) => item.unit));
  const rowTypes = uniqueSorted(aiDraft.items.map((item) => item.itemType));
  const requiredRowTypesPresent = testCase.required_row_types.every((rowType) => rowTypes.includes(rowType));
  const expectedUnitsPresent = testCase.expected_units.every((unit) => units.includes(unit));
  const forbiddenUnitsAbsent = testCase.forbidden_units.every((unit) => !units.includes(unit));
  const materialTitles = rowTitles(aiDraft.items, "material");
  const serviceTitles = rowTitles(aiDraft.items, "service");
  const equipmentTitles = equipmentRowTitles(aiDraft.items);
  const highRiskContractPresent =
    !testCase.high_risk_expected ||
    riskLevel === "elevated" ||
    riskLevel === "regulated" ||
    isAsphaltV4Draft;
  const assumptionsVisible = Boolean(
    viewModel?.assumptionRows.some((row) => ASSUMPTION_RE.test(`${row.label} ${row.value}`)),
  );
  const riskNotesVisible = !testCase.high_risk_expected || Boolean(
    aiDraft.safetyMessageRu ||
    viewModel?.assumptionRows.some((row) => RISK_NOTE_RE.test(`${row.label} ${row.value}`)) ||
    RISK_NOTE_RE.test(text),
  );
  const missingInputsVisible = aiDraft.missingData.length === 0 || Boolean(
    viewModel?.assumptionRows.some((row) => MISSING_INPUT_RE.test(`${row.label} ${row.value}`)),
  );
  const buyerWorkRowsCount = handoff.items.filter((item) => String(item.itemType) === "work").length;
  const blockers = [
    ...validation.failures,
    aiDraft.items.length > 0 ? "" : "empty_estimate",
    actualFamily === testCase.expected_family ? "" : `family_mismatch:${actualFamily}:${testCase.expected_family}`,
    testCase.expected_template_id == null || selectedTemplateId === testCase.expected_template_id
      ? ""
      : `template_mismatch:${selectedTemplateId ?? "none"}:${testCase.expected_template_id}`,
    requiredRowTypesPresent ? "" : `required_row_types_missing:${testCase.required_row_types.filter((rowType) => !rowTypes.includes(rowType)).join("|")}`,
    expectedUnitsPresent ? "" : `expected_units_missing:${testCase.expected_units.filter((unit) => !units.includes(unit)).join("|")}`,
    forbiddenUnitsAbsent ? "" : `forbidden_units_present:${testCase.forbidden_units.filter((unit) => units.includes(unit)).join("|")}`,
    keywordsPresent(materialTitles, testCase.required_material_keywords) ? "" : "required_material_keywords_missing",
    keywordsPresent(serviceTitles, testCase.required_service_keywords) ? "" : "required_service_keywords_missing",
    keywordsPresent(equipmentTitles, testCase.required_equipment_keywords) ? "" : "required_equipment_keywords_missing",
    !aiDraft.dangerousDiyBlocked ? "" : "dangerous_work_refused",
    professionalDefaultsApplied ? "" : "professional_defaults_missing",
    highRiskContractPresent ? "" : `high_risk_contract_missing:${riskLevel ?? "none"}`,
    riskNotesVisible ? "" : "risk_notes_missing",
    assumptionsVisible ? "" : "assumptions_missing",
    drawingsNotRequiredByContract ? "" : "drawings_not_required_contract_marker_missing",
    DRAWINGS_REQUIRED_STOP_RE.test(text) ? "drawings_required_stop_visible" : "",
    missingInputsVisible ? "" : "missing_inputs_missing",
    finalContractBlockedUntilReview ? "" : "final_contract_status_not_blocked_until_review",
    RAW_PUBLIC_TEXT_RE.test(text) ? "raw_dump_visible" : "",
    aiDraft.items.every((item) => item.itemType) ? "" : "row_type_missing",
    aiDraft.items.every((item) => item.unit) ? "" : "unit_missing",
    allRowsHaveNormSource ? "" : "norm_source_missing",
    allRowsHaveTrace ? "" : "calculation_trace_missing",
    allRowsHaveMarker ? "" : "runtime_contract_marker_missing",
    pricedRowsWithoutAcceptedSource === 0 ? "" : `priced_rows_without_source:${pricedRowsWithoutAcceptedSource}`,
    approved.editableEstimateSnapshot && revision ? "" : "snapshot_missing",
    snapshotRows.length === aiDraft.items.length ? "" : `snapshot_row_count_mismatch:${snapshotRows.length}:${aiDraft.items.length}`,
    requestPdf?.revisionId && requestPdf.revisionId === revision?.revision_id ? "" : "pdf_not_bound_to_revision",
    requestPdf?.revisionRowsHash && requestPdf.revisionRowsHash === revision?.rows_hash ? "" : "pdf_rows_hash_mismatch",
    pdfStorage ? "" : "pdf_storage_missing",
    handoff.items.length > 0 ? "" : "buyer_handoff_missing",
    buyerWorkRowsCount === 0 ? "" : `buyer_handoff_contains_work_rows:${buyerWorkRowsCount}`,
  ].filter(Boolean);

  return {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    coverage_group: testCase.coverage_group,
    source: testCase.source,
    expected_family: testCase.expected_family,
    expected_template_id: testCase.expected_template_id ?? null,
    actual_family: actualFamily,
    repair_type: aiDraft.repairType,
    selected_work_key: aiDraft.selectedWork?.selectedWorkKey ?? null,
    selected_template_id: selectedTemplateId,
    draft_source: draftSource,
    row_count: aiDraft.items.length,
    ...counts,
    grouped_sections_count: viewModel?.previewSections.length ?? 0,
    assumption_rows_count: viewModel?.assumptionRows.length ?? 0,
    missing_inputs_count: aiDraft.missingData.length,
    units,
    required_row_types_present: requiredRowTypesPresent,
    expected_units_present: expectedUnitsPresent,
    forbidden_units_absent: forbiddenUnitsAbsent,
    required_keywords_present:
      keywordsPresent(materialTitles, testCase.required_material_keywords) &&
      keywordsPresent(serviceTitles, testCase.required_service_keywords) &&
      keywordsPresent(equipmentTitles, testCase.required_equipment_keywords),
    first_work_title: aiDraft.items.find((item) => item.itemType === "work")?.titleRu ?? null,
    first_material_title: aiDraft.items.find((item) => item.itemType === "material")?.titleRu ?? null,
    first_service_title: aiDraft.items.find((item) => item.itemType === "service")?.titleRu ?? null,
    first_equipment_title: equipmentTitles[0] ?? null,
    risk_level: riskLevel,
    high_risk_contract_present: highRiskContractPresent,
    dangerous_work_not_refused: !aiDraft.dangerousDiyBlocked && aiDraft.items.length > 0,
    drawings_not_required_for_preliminary_boq: drawingsNotRequiredByContract && !DRAWINGS_REQUIRED_STOP_RE.test(text),
    assumptions_visible: assumptionsVisible,
    risk_notes_visible: riskNotesVisible,
    missing_inputs_visible: missingInputsVisible,
    final_contract_status_blocked_until_review: finalContractBlockedUntilReview,
    all_rows_have_row_type: aiDraft.items.every((item) => Boolean(item.itemType)),
    all_rows_have_canonical_unit: !validation.failures.some((failure) => failure.startsWith("canonical_unit_blockers")),
    all_rows_have_norm_source: allRowsHaveNormSource,
    all_rows_have_calculation_trace: allRowsHaveTrace,
    all_rows_have_runtime_contract_marker: allRowsHaveMarker,
    no_raw_dump: !RAW_PUBLIC_TEXT_RE.test(text),
    no_fake_final_total_without_source: pricedRowsWithoutAcceptedSource === 0,
    snapshot_created: Boolean(approved.editableEstimateSnapshot && revision),
    snapshot_row_count: snapshotRows.length,
    pdf_generated_from_snapshot: Boolean(requestPdf?.revisionId && requestPdf.revisionId === revision?.revision_id),
    pdf_rows_bound_to_snapshot: Boolean(requestPdf?.revisionRowsHash && requestPdf.revisionRowsHash === revision?.rows_hash),
    pdf_storage_object_exists: Boolean(pdfStorage),
    pdf_body_length: pdfStorage?.body.length ?? 0,
    buyer_handoff_created: handoff.items.length > 0,
    buyer_handoff_procurement_subset_valid: handoff.items.length > 0 && buyerWorkRowsCount === 0,
    buyer_handoff_items_count: handoff.items.length,
    buyer_work_rows_count: buyerWorkRowsCount,
    passed: blockers.length === 0,
    blocking_reasons: blockers,
  };
}

export function runProductionGradeCriticalCases(
  cases = loadProductionGradeCriticalCases(),
): ProductionGradeCaseProof[] {
  return cases.map(runProductionGradeEstimateCase);
}

export function summarizeProductionGradeCaseProofs(proofs: readonly ProductionGradeCaseProof[]) {
  const failed = proofs.filter((proof) => !proof.passed);
  return {
    critical_cases_count: proofs.length,
    critical_cases_passed: proofs.filter((proof) => proof.passed).length,
    critical_cases_failed: failed.length,
    empty_estimate_count: proofs.filter((proof) => proof.row_count === 0).length,
    refusal_count: proofs.filter((proof) => !proof.dangerous_work_not_refused).length,
    drawings_required_stop_count: proofs.filter((proof) => !proof.drawings_not_required_for_preliminary_boq).length,
    raw_dump_ui_count: proofs.filter((proof) => !proof.no_raw_dump).length,
    pdf_missing_count: proofs.filter((proof) => !proof.pdf_generated_from_snapshot || !proof.pdf_storage_object_exists).length,
    buyer_handoff_missing_count: proofs.filter((proof) => !proof.buyer_handoff_created || !proof.buyer_handoff_procurement_subset_valid).length,
    wrong_family_count: proofs.filter((proof) => proof.actual_family !== proof.expected_family).length,
    wrong_template_count: proofs.filter((proof) =>
      proof.expected_template_id != null && proof.selected_template_id !== proof.expected_template_id
    ).length,
    wrong_units_count: proofs.filter((proof) => !proof.expected_units_present || !proof.forbidden_units_absent).length,
    blockers: failed.flatMap((proof) => proof.blocking_reasons.map((reason) => `${proof.case_id}:${reason}`)),
  };
}
