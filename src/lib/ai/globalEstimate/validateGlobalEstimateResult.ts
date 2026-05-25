import type { GlobalEstimateResult, GlobalEstimateSectionType } from "./globalEstimateTypes";
import {
  GLOBAL_ESTIMATE_FORBIDDEN_GENERIC_ROW_NAMES,
  GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS,
} from "./templates/coreTemplateReconciliation";
import {
  mapEstimateRowEvidenceToRateSourceEvidence,
  validatePricedRateSourceEvidence,
} from "./sourceGovernance/validateRateSourceEvidence";

export type GlobalEstimateValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export type ValidateGlobalEstimateResultOptions = {
  expectedLanguage?: string;
  knownWorkKeys?: readonly string[];
};

export type GlobalEstimateValidationReport = {
  passed: boolean;
  issues: GlobalEstimateValidationIssue[];
  checkedKnownWork: boolean;
};

const ROW_TOTAL_TOLERANCE = 0.05;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function issue(code: string, path: string, message: string): GlobalEstimateValidationIssue {
  return { code, path, message };
}

function rowNamesAreGeneric(name: string): boolean {
  const normalized = normalizeText(name);
  return GLOBAL_ESTIMATE_FORBIDDEN_GENERIC_ROW_NAMES.some((genericName) => {
    const generic = normalizeText(genericName);
    return normalized === generic || normalized.includes(generic);
  });
}

function sumRows(result: GlobalEstimateResult, type: GlobalEstimateSectionType): number {
  return result.sections
    .filter((section) => section.type === type)
    .flatMap((section) => section.rows)
    .reduce((sum, row) => sum + row.total, 0);
}

function hasTaxRuleSource(result: GlobalEstimateResult): boolean {
  return result.sources.some((source) =>
    source.type === "official_tax_source"
    || source.type === "tax_provider"
    || /tax|vat|gst|nds|ndc|\u043d\u0434\u0441/i.test(`${source.id} ${source.label}`),
  );
}

export function validateGlobalEstimateResult(
  result: GlobalEstimateResult,
  options: ValidateGlobalEstimateResultOptions = {},
): GlobalEstimateValidationReport {
  const issues: GlobalEstimateValidationIssue[] = [];
  const knownWorkKeys = new Set(options.knownWorkKeys ?? GLOBAL_ESTIMATE_TEMPLATE_RATEBOOK_REQUIRED_WORK_KEYS);
  const checkedKnownWork = knownWorkKeys.has(result.work.workKey);
  const allRows = result.sections.flatMap((section) => section.rows.map((row) => ({ section, row })));
  const sourceIds = new Set(result.sources.map((source) => source.id));

  if (options.expectedLanguage && result.locale.language !== options.expectedLanguage) {
    issues.push(issue(
      "GLOBAL_ESTIMATE_LANGUAGE_MISMATCH",
      "locale.language",
      `Expected ${options.expectedLanguage}, received ${result.locale.language}.`,
    ));
  }

  if (result.sections.length === 0) {
    issues.push(issue("GLOBAL_ESTIMATE_SECTIONS_EMPTY", "sections", "GlobalEstimateResult must include sections."));
  }

  for (const section of result.sections) {
    if (section.rows.length === 0) {
      issues.push(issue("GLOBAL_ESTIMATE_SECTION_ROWS_EMPTY", `sections.${section.sectionNumber}.rows`, "Section must include rows."));
    }
  }

  const materialRows = result.sections.filter((section) => section.type === "materials").flatMap((section) => section.rows);
  const laborRows = result.sections.filter((section) => section.type === "labor" || section.type === "equipment").flatMap((section) => section.rows);

  if (materialRows.length === 0) {
    issues.push(issue("GLOBAL_ESTIMATE_MATERIAL_ROWS_MISSING", "sections.materials", "Materials section rows are required."));
  }
  if (laborRows.length === 0) {
    issues.push(issue("GLOBAL_ESTIMATE_LABOR_ROWS_MISSING", "sections.labor", "Labor or equipment section rows are required."));
  }

  if (checkedKnownWork) {
    for (const { section, row } of allRows) {
      if (rowNamesAreGeneric(row.name)) {
        issues.push(issue(
          "GLOBAL_ESTIMATE_KNOWN_WORK_GENERIC_ROW",
          `sections.${section.sectionNumber}.rows.${row.rowNumber}.name`,
          `Known work ${result.work.workKey} cannot use generic row "${row.name}".`,
        ));
      }
    }
  }

  for (const { section, row } of allRows) {
    const rowPath = `sections.${section.sectionNumber}.rows.${row.rowNumber}`;
    if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
      issues.push(issue("GLOBAL_ESTIMATE_ROW_QUANTITY_INVALID", `${rowPath}.quantity`, "Row quantity must be greater than zero."));
    }
    if (Number.isFinite(row.unitPrice) && row.unitPrice > 0 && !row.sourceId) {
      issues.push(issue("GLOBAL_ESTIMATE_PRICE_WITHOUT_SOURCE", `${rowPath}.sourceId`, "Priced row requires sourceId."));
    }
    if (row.sourceId && !sourceIds.has(row.sourceId)) {
      issues.push(issue("GLOBAL_ESTIMATE_SOURCE_NOT_FOUND", `${rowPath}.sourceId`, `Source ${row.sourceId} is not present in estimate.sources.`));
    }
    if (row.unitPrice > 0 && row.sourceEvidence.length === 0) {
      issues.push(issue("GLOBAL_ESTIMATE_PRICE_WITHOUT_SOURCE_EVIDENCE", `${rowPath}.sourceEvidence`, "Priced row requires source evidence."));
    }
    for (const [evidenceIndex, evidence] of row.sourceEvidence.entries()) {
      if (!evidence.sourceId || !evidence.label || !evidence.checkedAt) {
        issues.push(issue(
          "GLOBAL_ESTIMATE_SOURCE_EVIDENCE_INCOMPLETE",
          `${rowPath}.sourceEvidence.${evidenceIndex}`,
          "Source evidence requires sourceId, label, and checkedAt.",
        ));
      }
      if (evidence.sourceId && !sourceIds.has(evidence.sourceId)) {
        issues.push(issue(
          "GLOBAL_ESTIMATE_SOURCE_EVIDENCE_SOURCE_NOT_FOUND",
          `${rowPath}.sourceEvidence.${evidenceIndex}.sourceId`,
          `Evidence source ${evidence.sourceId} is not present in estimate.sources.`,
        ));
      }
    }
    if (Number.isFinite(row.total) && Math.abs(row.total - row.quantity * row.unitPrice) > ROW_TOTAL_TOLERANCE) {
      issues.push(issue("GLOBAL_ESTIMATE_ROW_TOTAL_NOT_CALCULATED", `${rowPath}.total`, "Row total must match quantity times unit price."));
    }
    if (row.confidence === "high" && row.sourceEvidence.length === 0) {
      issues.push(issue("GLOBAL_ESTIMATE_HIGH_CONFIDENCE_WITHOUT_SOURCE_EVIDENCE", `${rowPath}.confidence`, "High confidence requires source evidence."));
    }
    const governance = validatePricedRateSourceEvidence({
      path: rowPath,
      unitPrice: row.unitPrice,
      sourceId: row.sourceId,
      sourceLabel: row.sourceEvidence[0]?.label,
      confidence: row.confidence,
      evidence: row.sourceEvidence.map(mapEstimateRowEvidenceToRateSourceEvidence),
      availabilityStatus: "unknown",
      stockStatus: "unknown",
    });
    for (const governanceFailure of governance.failures) {
      issues.push(issue(
        `GLOBAL_ESTIMATE_SOURCE_GOVERNANCE_${governanceFailure.code}`,
        governanceFailure.path,
        governanceFailure.message,
      ));
    }
  }

  if (result.totals.grandTotal > 0 && allRows.length === 0) {
    issues.push(issue("GLOBAL_ESTIMATE_TOTAL_WITHOUT_ROWS", "totals.grandTotal", "Totals cannot exist without calculated rows."));
  }

  const materialsDelta = Math.abs(result.totals.materialsTotal - sumRows(result, "materials"));
  const laborDelta = Math.abs(result.totals.laborTotal - sumRows(result, "labor"));
  const equipmentDelta = Math.abs(result.totals.equipmentTotal - sumRows(result, "equipment"));
  const deliveryDelta = Math.abs(result.totals.deliveryTotal - sumRows(result, "delivery"));
  if (materialsDelta > ROW_TOTAL_TOLERANCE) {
    issues.push(issue("GLOBAL_ESTIMATE_MATERIAL_TOTAL_MISMATCH", "totals.materialsTotal", "Materials total must match material rows."));
  }
  if (laborDelta > ROW_TOTAL_TOLERANCE) {
    issues.push(issue("GLOBAL_ESTIMATE_LABOR_TOTAL_MISMATCH", "totals.laborTotal", "Labor total must match labor rows."));
  }
  if (equipmentDelta > ROW_TOTAL_TOLERANCE) {
    issues.push(issue("GLOBAL_ESTIMATE_EQUIPMENT_TOTAL_MISMATCH", "totals.equipmentTotal", "Equipment total must match equipment rows."));
  }
  if (deliveryDelta > ROW_TOTAL_TOLERANCE) {
    issues.push(issue("GLOBAL_ESTIMATE_DELIVERY_TOTAL_MISMATCH", "totals.deliveryTotal", "Delivery total must match delivery rows."));
  }

  if (result.tax.taxType !== "unknown" && !hasTaxRuleSource(result)) {
    issues.push(issue("GLOBAL_ESTIMATE_TAX_WITHOUT_RULE", "tax", "Known tax status requires a tax rule source."));
  }
  if (result.tax.taxType === "unknown" && !result.tax.warning) {
    issues.push(issue("GLOBAL_ESTIMATE_TAX_UNKNOWN_WITHOUT_WARNING", "tax.warning", "Unknown tax status requires a warning."));
  }

  if (result.confidence === "high") {
    const everyPricedRowHasEvidence = allRows
      .filter(({ row }) => row.unitPrice > 0)
      .every(({ row }) => row.sourceId && sourceIds.has(row.sourceId) && row.sourceEvidence.length > 0);
    if (!everyPricedRowHasEvidence) {
      issues.push(issue("GLOBAL_ESTIMATE_HIGH_CONFIDENCE_WITHOUT_SOURCE_EVIDENCE", "confidence", "High confidence estimate requires source evidence on priced rows."));
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    checkedKnownWork,
  };
}

export function assertValidGlobalEstimateResult(
  result: GlobalEstimateResult,
  options: ValidateGlobalEstimateResultOptions = {},
): asserts result is GlobalEstimateResult {
  const report = validateGlobalEstimateResult(result, options);
  if (!report.passed) {
    const firstIssue = report.issues[0];
    throw new Error(`${firstIssue.code}:${firstIssue.path}`);
  }
}
