import type { ProfessionalBoqRuntimeContractInput, ProfessionalBoqRuntimeContractValidation } from "./professionalBoqContract";
import { validateProfessionalBoqUnitRows } from "./validateBoqUnits";

const RAW_PUBLIC_TEXT_RE =
  /\b(?:PRICE_MISSING|source_parameters|template_id|template_version|formula_id|raw_ai_json|expandedComplexCalculator|rowCode|round_to|normFactor|PARTIAL_PRICE_MISSING|price date|confidence\s+\d|region\s+[A-Z]{2})\b/i;

const REFUSAL_RE =
  /(?:не\s+могу\s+рассчитать|невозможно\s+посчитать|не\s+выполняйте.*я\s+подготовлю\s+заявку|только\s+после\s+черт|drawings_required_stop)/i;

const DRAWINGS_STOP_RE =
  /(?:без\s+черт[её]ж[её]й\s+(?:не\s+могу|невозможно)|черт[её]ж[и]?\s+обязательн[ыа].{0,40}(?:расчет|смет))/i;

function publicText(input: ProfessionalBoqRuntimeContractInput): string {
  const viewModel = input.viewModel;
  return [
    input.draft.titleRu,
    input.draft.summaryRu,
    input.draft.safetyMessageRu,
    ...input.draft.missingData,
    viewModel?.title,
    viewModel?.summary,
    viewModel?.totalLabel,
    viewModel?.priceStatusLabel,
    ...(viewModel?.visibleLines.map((line) => line.text) ?? []),
    ...(viewModel?.assumptionRows.flatMap((row) => [row.label, row.value]) ?? []),
    ...(viewModel?.previewSections.flatMap((section) => [
      section.title,
      ...section.rows.flatMap((row) => [
        row.name,
        row.quantityLabel,
        row.unitPriceLabel,
        row.totalLabel,
        row.priceStateLabel,
        row.sourceLabel,
        row.calculationLabel ?? "",
      ]),
    ]) ?? []),
    input.pdfBody ?? "",
  ].filter(Boolean).join("\n");
}

function hasUnsupportedPrice(item: ProfessionalBoqRuntimeContractInput["draft"]["items"][number]): boolean {
  if (item.unitPrice == null) return false;
  return !item.priceTrace &&
    item.priceStatus !== "CATALOG_PRICE_VERIFIED" &&
    item.priceStatus !== "PRICEBOOK_VERIFIED" &&
    item.priceStatus !== "REFERENCE_PRICE_ESTIMATE" &&
    item.priceStatus !== "USER_PRICE_OVERRIDE" &&
    item.priceStatus !== "USER_ENTERED_PRICE";
}

function hasProfessionalNormSource(item: ProfessionalBoqRuntimeContractInput["draft"]["items"][number]): boolean {
  return Boolean(item.normId && item.normFamilyId && item.normSourceId && item.normVersion);
}

function hasProfessionalCalculationTrace(item: ProfessionalBoqRuntimeContractInput["draft"]["items"][number]): boolean {
  return Boolean(item.formulaId && item.quantityFormula && item.calculationTrace);
}

function hasValidProfessionalQuantityShape(
  item: ProfessionalBoqRuntimeContractInput["draft"]["items"][number],
): boolean {
  if (!Number.isFinite(item.quantity)) return false;
  if ((item.quantity ?? 0) > 0) return true;
  const blockers = item.sourceParameters?.parameterBlockerIds;
  return item.quantity === 0 &&
    item.unitPrice == null &&
    item.priceStatus === "PRICE_MISSING" &&
    item.sourceParameters?.includedInEstimate === false &&
    item.sourceParameters?.includedInProcurement === false &&
    Array.isArray(blockers) &&
    blockers.length > 0 &&
    blockers.every((blocker) => typeof blocker === "string" && blocker.length > 0);
}

export function validateProfessionalBoqRuntimeContract(
  input: ProfessionalBoqRuntimeContractInput,
): ProfessionalBoqRuntimeContractValidation {
  const failures: string[] = [];
  const text = publicText(input);
  const items = input.draft.items;
  if (items.length === 0) failures.push("empty_boq_items");
  if (input.draft.dangerousDiyBlocked) failures.push("dangerous_work_marked_as_refusal");
  if (REFUSAL_RE.test(text)) failures.push("refusal_text_visible");
  if (DRAWINGS_STOP_RE.test(text)) failures.push("drawings_required_stop_visible");
  if (RAW_PUBLIC_TEXT_RE.test(text)) failures.push("raw_internal_marker_visible");
  if (items.some(hasUnsupportedPrice)) failures.push("priced_row_without_accepted_source");
  if (!items.every((item) =>
    item.itemType &&
    item.titleRu &&
    item.unit &&
    hasValidProfessionalQuantityShape(item)
  )) {
    failures.push("invalid_boq_row_shape");
  }
  if (!items.every(hasProfessionalNormSource)) failures.push("professional_draft_rows_without_norm_source");
  if (!items.every(hasProfessionalCalculationTrace)) failures.push("professional_draft_rows_without_trace");
  if (!items.every((item) =>
    item.sourceParameters?.professionalBoqRuntimeContract === "professional_boq_runtime_contract_v1" ||
    item.sourceParameters?.asphaltV4 === true
  )) {
    failures.push("runtime_contract_marker_missing");
  }
  const unitValidation = validateProfessionalBoqUnitRows(items.map((item, index) => ({
    rowId: item.sourceParameters?.rowCode ? String(item.sourceParameters.rowCode) : `${index}`,
    unit: item.unit,
    rowCode: item.sourceParameters?.rowCode ? String(item.sourceParameters.rowCode) : undefined,
    rowLabel: item.titleRu,
    rowKind: item.itemType,
    workFamily: input.draft.selectedWork?.selectedWorkKey ?? input.draft.repairType,
    normId: item.normId,
    normPackId: item.normFamilyId,
    normSourceId: item.normSourceId,
  })));
  if (unitValidation.blocking_reasons.length > 0) {
    failures.push(`canonical_unit_blockers:${unitValidation.blocking_reasons.slice(0, 5).join(",")}`);
  }
  if (input.approvedBundle) {
    const revision = input.approvedBundle.estimateRevisionState?.revisions.find(
      (candidate) => candidate.revision_id === input.approvedBundle?.estimateRevisionState?.current_revision_id,
    );
    if (!input.approvedBundle.editableEstimateSnapshot || !revision) failures.push("snapshot_missing");
    const pdf = input.approvedBundle.pdfs[0];
    if (!pdf) failures.push("pdf_missing");
    if (pdf && revision && pdf.revisionRowsHash !== revision.rows_hash) failures.push("pdf_not_bound_to_snapshot_rows");
  }
  if (input.buyerHandoff) {
    if (input.buyerHandoff.items.length === 0) failures.push("buyer_handoff_empty");
    if (input.buyerHandoff.items.some((item) => String(item.itemType) === "work")) failures.push("buyer_handoff_contains_work_rows");
  }
  return {
    passed: failures.length === 0,
    failures,
  };
}
