import { normalizeCanonicalProfessionalBoqUnit, validateProfessionalBoqUnit } from "./canonicalUnits";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "./buildProfessionalWorkPassport";
import type { ProfessionalBoqRow } from "./estimateDraftRevisionContract";
import {
  type ProfessionalBoqLineItemQuality,
  type ProfessionalBoqLineItemQualityCounters,
  type ProfessionalBoqLineItemQualityIssue,
  type ProfessionalBoqLineItemQualityRegistrySummary,
  type ProfessionalBoqLineItemQualityValidation,
  type ProfessionalBoqTemplateLineItemQualityResult,
  ZERO_PROFESSIONAL_BOQ_LINE_ITEM_QUALITY_COUNTERS,
  type ProfessionalBoqLineItemRowType,
} from "./professionalBoqLineItemQualityContract";
import { professionalBoqSectionForRowType } from "./professionalBoqSectionPolicy";
import { resolveProfessionalNomenclature, normalizeProfessionalBoqText } from "./professionalNomenclatureResolver";
import { PROFESSIONAL_WORK_PASSPORT_TOTAL } from "./professionalWorkPassportRegistry";
import { PROFESSIONAL_WORK_PASSPORT_MIN_ROW_COUNT } from "./validateProfessionalWorkPassport";
import type { ProfessionalBoqRecipeRow, ProfessionalWorkPassport } from "./workPassportContract";

const RAW_FORMULA_OR_DEBUG_RE =
  /\b(?:PRICE_MISSING|source_parameters|template_id|template_version|formula_id|raw_ai_json|expandedComplexCalculator|rowCode|round_to|normFactor|PARTIAL_PRICE_MISSING|confidence\s+\d|debug|todo|null|undefined)\b/i;

const GENERIC_ROW_NAMES = new Set([
  "материал",
  "материалы",
  "услуга",
  "услуги",
  "оборудование",
  "работа",
  "работы",
  "комплекс работ",
  "прочие работы",
  "прочие материалы",
  "материалы по шаблону",
  "работы по шаблону",
  "комплект материалов",
  "номенклатура",
  "позиция",
  "item",
  "work item",
  "material item",
  "service item",
  "other",
  "boq row",
].map(normalizeProfessionalBoqText));

function pushReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function normalizeName(value: string | null | undefined): string {
  return normalizeProfessionalBoqText(value ?? "");
}

export function isGenericProfessionalBoqLineItemName(value: string): boolean {
  const normalized = normalizeName(value);
  if (!normalized) return true;
  if (GENERIC_ROW_NAMES.has(normalized)) return true;
  return /^(generic|placeholder|fallback|template only|work by template|materials by template|service by template|todo)$/i.test(normalized);
}

export function containsRawFormulaOrDebugProfessionalBoqName(value: string): boolean {
  return RAW_FORMULA_OR_DEBUG_RE.test(value);
}

function isTemplateOnlyProfessionalBoqName(
  passport: Pick<ProfessionalWorkPassport, "localizedNameRu" | "workKey" | "templateId" | "aliases">,
  value: string,
): boolean {
  const normalized = normalizeName(value);
  if (!normalized) return true;
  const blocked = [
    passport.localizedNameRu,
    passport.workKey,
    passport.templateId,
    ...passport.aliases,
  ].map(normalizeName).filter(Boolean);
  return blocked.some((candidate) => normalized === candidate);
}

function rowTypeForTitle(rowType: ProfessionalBoqLineItemRowType, titleRu: string): ProfessionalBoqLineItemRowType {
  const normalized = normalizeName(titleRu);
  if (rowType === "transport" && /мобилизац|mobilization/.test(normalized)) return "mobilization";
  if (rowType === "service" && /overhead|накладн|организация участка/.test(normalized)) return "overhead";
  return rowType;
}

function citationLabel(row: {
  normSourceTitle?: string | null;
  normSourceId?: string | null;
  normVersion?: string | null;
}): string {
  return [row.normSourceTitle, row.normVersion].filter(Boolean).join(" ").trim() ||
    [row.normSourceId, row.normVersion].filter(Boolean).join(" ").trim();
}

function hasFormula(row: { formulaId?: string | null; quantityFormula?: string | null }): boolean {
  return Boolean(row.formulaId?.trim() && row.quantityFormula?.trim());
}

function hasCalculationTrace(row: { calculationTraceTemplate?: string | null; calculationTrace?: string | null }): boolean {
  const trace = row.calculationTraceTemplate ?? row.calculationTrace ?? "";
  return /result=|formula=|=|quantity|колич/i.test(trace) && trace.trim().length > 0;
}

export function buildProfessionalBoqLineItemQualityFromPassportRow(
  passport: ProfessionalWorkPassport,
  row: ProfessionalBoqRecipeRow,
): ProfessionalBoqLineItemQuality {
  const rowType = rowTypeForTitle(row.rowType, row.titleRu);
  const sourceBacked = Boolean(row.normId && row.normFamilyId && row.normSourceId && row.normVersion);
  const unitValidation = validateProfessionalBoqUnit({
    unit: row.sourceUnit,
    rowLabel: row.titleRu,
    rowCode: row.rowId,
    rowKind: row.rowType,
    workFamily: passport.familyId,
    normId: row.normId,
    normPackId: row.normFamilyId,
    normSourceId: row.normSourceId,
  });
  const nomenclature = resolveProfessionalNomenclature({
    rowType,
    titleRu: row.titleRu,
    normId: row.normId,
    normSourceId: row.normSourceId,
    sourceBacked,
  });
  const section = professionalBoqSectionForRowType(rowType);

  return {
    rowId: row.rowId,
    templateId: passport.templateId,
    family: passport.familyId,
    rowType,
    displayName: row.titleRu,
    professionalName: row.titleRu,
    nomenclatureName: nomenclature.nomenclatureName,
    nomenclatureId: nomenclature.nomenclatureId,
    nomenclatureType: nomenclature.entry?.type ?? "source_backed_row",
    nomenclatureResolved: nomenclature.resolved,
    nameIsNotGeneric: !isGenericProfessionalBoqLineItemName(row.titleRu),
    nameIsNotTemplateOnly: !isTemplateOnlyProfessionalBoqName(passport, row.titleRu),
    nameIsNotRawFormulaOrDebug: !containsRawFormulaOrDebugProfessionalBoqName(row.titleRu),
    canonicalUnit: unitValidation.canonicalUnit,
    unitValid: unitValidation.valid,
    quantityFormula: row.quantityFormula,
    formulaId: row.formulaId,
    sourceId: row.normSourceId,
    normId: row.normId,
    citationLabel: citationLabel(row),
    sourceBacked,
    calculationTrace: row.calculationTraceTemplate,
    section: section.titleRu,
    groupedUiSection: section.titleRu,
    pdfSection: section.titleRu,
    procurementEligible: row.includedInProcurement,
    buyerHandoffEligible: row.buyerHandoffRole === "procurement_item",
  };
}

export function buildProfessionalBoqLineItemQualityFromDraftRow(
  input: {
    row: ProfessionalBoqRow;
    templateId?: string | null;
    family?: string | null;
  },
): ProfessionalBoqLineItemQuality {
  const row = input.row;
  const rowType = rowTypeForTitle(row.rowType as ProfessionalBoqLineItemRowType, row.titleRu);
  const sourceBacked = Boolean(row.normId && row.normFamilyId && row.normSourceId && row.normVersion);
  const canonicalUnit = normalizeCanonicalProfessionalBoqUnit(row.unit);
  const unitValidation = validateProfessionalBoqUnit({
    unit: row.unit,
    rowLabel: row.titleRu,
    rowCode: row.rowId,
    rowKind: row.rowType,
    workFamily: input.family ?? row.templateId ?? null,
    normId: row.normId,
    normPackId: row.normFamilyId,
    normSourceId: row.normSourceId,
  });
  const nomenclature = resolveProfessionalNomenclature({
    rowType,
    titleRu: row.titleRu,
    normId: row.normId,
    normSourceId: row.normSourceId,
    materialKey: row.materialKey,
    sourceBacked,
  });
  const section = professionalBoqSectionForRowType(rowType);
  const templateContext = {
    localizedNameRu: input.templateId ?? row.templateId ?? "",
    workKey: input.family ?? "",
    templateId: input.templateId ?? row.templateId ?? "",
    aliases: [],
  };

  return {
    rowId: row.rowId,
    templateId: input.templateId ?? row.templateId ?? "",
    family: input.family ?? row.templateId ?? "",
    rowType,
    displayName: row.titleRu,
    professionalName: row.titleRu,
    nomenclatureName: nomenclature.nomenclatureName,
    nomenclatureId: nomenclature.nomenclatureId,
    nomenclatureType: nomenclature.entry?.type ?? "source_backed_row",
    nomenclatureResolved: nomenclature.resolved,
    nameIsNotGeneric: !isGenericProfessionalBoqLineItemName(row.titleRu),
    nameIsNotTemplateOnly: !isTemplateOnlyProfessionalBoqName(templateContext, row.titleRu),
    nameIsNotRawFormulaOrDebug: !containsRawFormulaOrDebugProfessionalBoqName(row.titleRu),
    canonicalUnit,
    unitValid: unitValidation.valid,
    quantityFormula: row.quantityFormula ?? "",
    formulaId: row.formulaId ?? "",
    sourceId: row.normSourceId ?? row.sourceId ?? "",
    normId: row.normId ?? "",
    citationLabel: citationLabel(row),
    sourceBacked,
    calculationTrace: row.calculationTrace ?? "",
    section: section.titleRu,
    groupedUiSection: section.titleRu,
    pdfSection: section.titleRu,
    procurementEligible: row.includedInProcurement,
    buyerHandoffEligible: row.includedInProcurement && row.rowType !== "work" && row.rowType !== "labor",
  };
}

export function validateProfessionalBoqLineItemQuality(
  item: ProfessionalBoqLineItemQuality,
): ProfessionalBoqLineItemQualityValidation {
  const issues: ProfessionalBoqLineItemQualityIssue[] = [];
  if (!item.nameIsNotGeneric) issues.push("generic_name");
  if (!item.nameIsNotTemplateOnly) issues.push("template_only_name");
  if (!item.nameIsNotRawFormulaOrDebug) issues.push("raw_formula_or_debug_name");
  if (!item.nomenclatureResolved) issues.push("missing_nomenclature");
  if (!item.sourceBacked || !item.sourceId || !item.normId) issues.push("missing_source");
  if (!item.citationLabel) issues.push("missing_citation");
  if (!hasFormula(item)) issues.push("missing_formula");
  if (!hasCalculationTrace({ calculationTrace: item.calculationTrace })) issues.push("missing_calculation_trace");
  if (!item.unitValid || !item.canonicalUnit) issues.push("invalid_unit");
  if (!item.groupedUiSection) issues.push("missing_grouped_ui_section");
  if (!item.pdfSection) issues.push("missing_pdf_section");
  if (item.procurementEligible && !item.buyerHandoffEligible && item.rowType !== "work" && item.rowType !== "labor") {
    issues.push("buyer_handoff_procurement_mismatch");
  }
  return {
    passed: issues.length === 0,
    issues,
  };
}

function addCounters(
  total: ProfessionalBoqLineItemQualityCounters,
  next: ProfessionalBoqLineItemQualityCounters,
): ProfessionalBoqLineItemQualityCounters {
  return {
    row_count: total.row_count + next.row_count,
    real_named_rows_count: total.real_named_rows_count + next.real_named_rows_count,
    generic_rows_count: total.generic_rows_count + next.generic_rows_count,
    template_only_rows_count: total.template_only_rows_count + next.template_only_rows_count,
    raw_formula_or_debug_rows_count: total.raw_formula_or_debug_rows_count + next.raw_formula_or_debug_rows_count,
    rows_without_real_nomenclature_count: total.rows_without_real_nomenclature_count + next.rows_without_real_nomenclature_count,
    rows_without_source_citation_count: total.rows_without_source_citation_count + next.rows_without_source_citation_count,
    rows_without_formula_count: total.rows_without_formula_count + next.rows_without_formula_count,
    rows_without_calculation_trace_count: total.rows_without_calculation_trace_count + next.rows_without_calculation_trace_count,
    wrong_unit_rows_count: total.wrong_unit_rows_count + next.wrong_unit_rows_count,
    duplicate_noise_rows_count: total.duplicate_noise_rows_count + next.duplicate_noise_rows_count,
    missing_grouped_ui_section_count: total.missing_grouped_ui_section_count + next.missing_grouped_ui_section_count,
    missing_pdf_section_count: total.missing_pdf_section_count + next.missing_pdf_section_count,
    buyer_handoff_eligible_rows_count: total.buyer_handoff_eligible_rows_count + next.buyer_handoff_eligible_rows_count,
    buyer_handoff_ineligible_procurement_rows_count: total.buyer_handoff_ineligible_procurement_rows_count + next.buyer_handoff_ineligible_procurement_rows_count,
    material_service_equipment_rows_count: total.material_service_equipment_rows_count + next.material_service_equipment_rows_count,
  };
}

function duplicateNoiseCount(items: readonly ProfessionalBoqLineItemQuality[]): number {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = [
      item.rowType,
      normalizeName(item.displayName),
      item.canonicalUnit ?? "",
      normalizeName(item.quantityFormula),
    ].join("|");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count >= 6).reduce((sum, count) => sum + count, 0);
}

export function auditProfessionalWorkPassportLineItemQuality(
  passport: ProfessionalWorkPassport,
): {
  result: ProfessionalBoqTemplateLineItemQualityResult;
  items: ProfessionalBoqLineItemQuality[];
} {
  const items = passport.boqRecipe.allRows.map((row) => buildProfessionalBoqLineItemQualityFromPassportRow(passport, row));
  const validations = items.map(validateProfessionalBoqLineItemQuality);
  const duplicateNoiseRows = duplicateNoiseCount(items);
  const counters: ProfessionalBoqLineItemQualityCounters = {
    row_count: items.length,
    real_named_rows_count: validations.filter((validation) => validation.passed).length,
    generic_rows_count: items.filter((item) => !item.nameIsNotGeneric).length,
    template_only_rows_count: items.filter((item) => !item.nameIsNotTemplateOnly).length,
    raw_formula_or_debug_rows_count: items.filter((item) => !item.nameIsNotRawFormulaOrDebug).length,
    rows_without_real_nomenclature_count: items.filter((item) => !item.nomenclatureResolved).length,
    rows_without_source_citation_count: items.filter((item) => !item.sourceBacked || !item.citationLabel).length,
    rows_without_formula_count: items.filter((item) => !hasFormula(item)).length,
    rows_without_calculation_trace_count: items.filter((item) => !hasCalculationTrace({ calculationTrace: item.calculationTrace })).length,
    wrong_unit_rows_count: items.filter((item) => !item.unitValid).length,
    duplicate_noise_rows_count: duplicateNoiseRows,
    missing_grouped_ui_section_count: items.filter((item) => !item.groupedUiSection).length,
    missing_pdf_section_count: items.filter((item) => !item.pdfSection).length,
    buyer_handoff_eligible_rows_count: items.filter((item) => item.buyerHandoffEligible).length,
    buyer_handoff_ineligible_procurement_rows_count: items.filter((item) =>
      item.procurementEligible && !item.buyerHandoffEligible && item.rowType !== "work" && item.rowType !== "labor"
    ).length,
    material_service_equipment_rows_count: items.filter((item) =>
      item.rowType === "material" ||
      item.rowType === "service" ||
      item.rowType === "equipment" ||
      item.rowType === "transport" ||
      item.rowType === "mobilization"
    ).length,
  };
  const blockingReasons: string[] = [];
  if (items.length < PROFESSIONAL_WORK_PASSPORT_MIN_ROW_COUNT) {
    pushReason(blockingReasons, `row_count_below_professional_min:${items.length}`);
  }
  for (const [key, value] of Object.entries(counters)) {
    if (
      key !== "row_count" &&
      key !== "real_named_rows_count" &&
      key !== "buyer_handoff_eligible_rows_count" &&
      key !== "material_service_equipment_rows_count" &&
      value > 0
    ) {
      pushReason(blockingReasons, `${key}:${value}`);
    }
  }
  if (counters.material_service_equipment_rows_count === 0) pushReason(blockingReasons, "material_service_equipment_rows_missing");
  if (counters.buyer_handoff_eligible_rows_count === 0) pushReason(blockingReasons, "buyer_handoff_eligible_rows_missing");

  return {
    items,
    result: {
      ...counters,
      template_id: passport.templateId,
      family: passport.familyId,
      ready_real_named_professional_boq_line_items: blockingReasons.length === 0,
      blocking_reasons: blockingReasons,
    },
  };
}

export function auditProfessionalWorkPassportRegistryLineItemQuality(): {
  summary: ProfessionalBoqLineItemQualityRegistrySummary;
  validations: ProfessionalBoqTemplateLineItemQualityResult[];
} {
  const validations: ProfessionalBoqTemplateLineItemQualityResult[] = [];
  let counters: ProfessionalBoqLineItemQualityCounters = {
    ...ZERO_PROFESSIONAL_BOQ_LINE_ITEM_QUALITY_COUNTERS,
  };
  let readyCount = 0;
  let blockedCount = 0;
  let minRows = Number.POSITIVE_INFINITY;
  const blockingReasons: string[] = [];

  for (const [index, templateId] of listProfessionalWorkPassportTemplateIds().entries()) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) {
      blockedCount += 1;
      blockingReasons.push(`${templateId}:passport_missing`);
      continue;
    }
    const { result } = auditProfessionalWorkPassportLineItemQuality(passport);
    validations.push(result);
    counters = addCounters(counters, result);
    minRows = Math.min(minRows, result.row_count);
    if (result.ready_real_named_professional_boq_line_items) readyCount += 1;
    else blockedCount += 1;
    for (const reason of result.blocking_reasons) {
      blockingReasons.push(`${result.template_id}:${reason}`);
    }
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  clearProfessionalWorkPassportBuildCaches();

  const realNomenclatureRows = counters.row_count - counters.rows_without_real_nomenclature_count;
  const sourceBackedRows = counters.row_count - counters.rows_without_source_citation_count;
  const summary: ProfessionalBoqLineItemQualityRegistrySummary = {
    ...counters,
    templates_total: PROFESSIONAL_WORK_PASSPORT_TOTAL,
    templates_processed: validations.length,
    templates_real_named_boq_ready: readyCount,
    blocked_templates_count: blockedCount,
    minimum_real_named_boq_rows_required: PROFESSIONAL_WORK_PASSPORT_MIN_ROW_COUNT,
    min_real_named_rows_per_template: Number.isFinite(minRows) ? minRows : 0,
    real_nomenclature_rows_percent: counters.row_count > 0 ? Math.round(realNomenclatureRows / counters.row_count * 10000) / 100 : 0,
    source_backed_rows_percent: counters.row_count > 0 ? Math.round(sourceBackedRows / counters.row_count * 10000) / 100 : 0,
    grouped_ui_ready: counters.missing_grouped_ui_section_count === 0,
    pdf_rows_equal_snapshot_rows: counters.missing_pdf_section_count === 0,
    buyer_handoff_procurement_subset_valid: counters.buyer_handoff_ineligible_procurement_rows_count === 0 &&
      counters.buyer_handoff_eligible_rows_count > 0,
    no_raw_dump_main_ui: counters.raw_formula_or_debug_rows_count === 0,
    no_template_only_names: counters.template_only_rows_count === 0,
    no_generic_names: counters.generic_rows_count === 0,
    no_wrong_units: counters.wrong_unit_rows_count === 0,
    blocking_reasons: blockingReasons,
  };
  return { summary, validations };
}
