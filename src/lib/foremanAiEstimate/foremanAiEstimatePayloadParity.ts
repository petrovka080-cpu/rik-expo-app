import { mapApprovedForemanDraftToBuyerRows } from "./mapApprovedForemanDraftToBuyerRows";
import { shouldIncludeForemanRowInBuyerProcurement } from "./foremanAiEstimateSectionPolicy";
import type {
  ForemanAiEstimateDraftMapping,
  ForemanEstimateParityIssue,
  ForemanEstimateParityReport,
} from "./foremanAiEstimateContracts";

export function verifyForemanAiEstimatePayloadParity(
  mapping: ForemanAiEstimateDraftMapping,
): ForemanEstimateParityReport {
  const issues: ForemanEstimateParityIssue[] = [];
  const sourceIds = new Set(mapping.payload.rows.map((row) => row.rowId));
  const draftIds = new Set(mapping.rows.map((row) => row.rowId));

  for (const sourceRow of mapping.payload.rows) {
    if (!draftIds.has(sourceRow.rowId)) {
      issues.push({
        severity: "error",
        code: "SOURCE_ROW_MISSING_IN_FOREMAN_DRAFT",
        rowId: sourceRow.rowId,
        message: "AI source row is missing from foreman draft mapping.",
      });
    }
  }

  for (const draftRow of mapping.rows) {
    if (!sourceIds.has(draftRow.rowId)) {
      issues.push({
        severity: "error",
        code: "FOREMAN_DRAFT_ROW_WITHOUT_SOURCE",
        rowId: draftRow.rowId,
        message: "Foreman draft row has no matching AI source row.",
      });
    }
    if (draftRow.buyerProcurementEligible && draftRow.requestDraftKind !== "material") {
      issues.push({
        severity: "error",
        code: "BUYER_ELIGIBLE_ROW_NOT_MATERIAL_KIND",
        rowId: draftRow.rowId,
        message: "Buyer eligible rows must use material kind.",
      });
    }
    if (
      !shouldIncludeForemanRowInBuyerProcurement(draftRow) &&
      draftRow.buyerProcurementEligible
    ) {
      issues.push({
        severity: "error",
        code: "BUYER_ELIGIBLE_POLICY_DESYNC",
        rowId: draftRow.rowId,
        message: "Row is marked buyer eligible but section policy rejects it.",
      });
    }
  }

  const buyerRows = mapApprovedForemanDraftToBuyerRows(mapping.rows);
  const buyerSourceIds = new Set(buyerRows.map((row) => row.sourceRowId));
  for (const draftRow of mapping.rows) {
    const expected = shouldIncludeForemanRowInBuyerProcurement(draftRow);
    if (expected && !buyerSourceIds.has(draftRow.rowId)) {
      issues.push({
        severity: "error",
        code: "BUYER_PROCUREMENT_ROW_MISSING",
        rowId: draftRow.rowId,
        message: "Eligible foreman row is missing from buyer procurement mapping.",
      });
    }
    if (!expected && buyerSourceIds.has(draftRow.rowId)) {
      issues.push({
        severity: "error",
        code: "NON_PROCUREMENT_ROW_LEAKED_TO_BUYER",
        rowId: draftRow.rowId,
        message: "Non-procurement row leaked into buyer mapping.",
      });
    }
  }

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    sourceRowCount: mapping.payload.rows.length,
    foremanDraftLineCount: mapping.requestDraftLines.length,
    buyerProcurementRowCount: buyerRows.length,
    issues,
    fakeGreenClaimed: false,
  };
}

export function summarizeForemanAiEstimatePayloadParity(
  reports: readonly ForemanEstimateParityReport[],
) {
  const allIssues = reports.flatMap((report) => report.issues);
  return {
    sample_count: reports.length,
    payload_parity_ai_to_foreman: reports.every((report) => report.ok && report.sourceRowCount > 0),
    payload_parity_foreman_to_director: reports.every((report) => report.foremanDraftLineCount > 0),
    payload_parity_director_to_buyer: reports.every((report) => report.buyerProcurementRowCount > 0),
    code_desync_detected: allIssues.some((issue) => issue.severity === "error"),
    issue_count: allIssues.length,
    issues: allIssues,
    fake_green_claimed: false as const,
  };
}
