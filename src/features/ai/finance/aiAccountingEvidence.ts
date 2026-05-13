import type { GetFinanceSummaryToolOutput } from "../tools/getFinanceSummaryTool";
import type { AiFinanceDebtCard, AiFinanceEvidenceRef } from "./aiFinanceCopilotTypes";

export const AI_ACCOUNTING_EVIDENCE_CONTRACT = Object.freeze({
  contractId: "ai_accounting_evidence_v1",
  sourceTool: "get_finance_summary",
  evidenceRequired: true,
  redactedOnly: true,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  fakeFinanceCards: false,
} as const);

function evidenceRef(
  type: AiFinanceEvidenceRef["type"],
  ref: string,
  source: AiFinanceEvidenceRef["source"] = "get_finance_summary",
): AiFinanceEvidenceRef {
  return {
    type,
    ref,
    source,
    redacted: true,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
  };
}

export function buildAiFinanceEvidenceRefs(
  summary: GetFinanceSummaryToolOutput | null,
): AiFinanceEvidenceRef[] {
  if (!summary) return [];

  const refs: AiFinanceEvidenceRef[] = [
    evidenceRef("finance_summary", "finance:summary:totals:redacted"),
  ];

  if (summary.totals.debt > 0) {
    refs.push(evidenceRef("finance_debt_bucket", "finance:debt:total:redacted"));
  }
  if (summary.totals.overdue > 0 || summary.overdue_count > 0) {
    refs.push(evidenceRef("finance_debt_bucket", "finance:debt:overdue:redacted"));
  }
  if (summary.debt_buckets.critical > 0) {
    refs.push(evidenceRef("finance_debt_bucket", "finance:debt:critical:redacted"));
  }
  if (summary.document_gaps.length > 0) {
    refs.push(evidenceRef("finance_document_gap", "finance:document_gap:redacted"));
  }

  return refs;
}

export function buildAiFinanceDraftEvidenceRefs(
  summary: GetFinanceSummaryToolOutput | null,
): AiFinanceEvidenceRef[] {
  const refs = buildAiFinanceEvidenceRefs(summary);
  if (!summary || refs.length === 0) return refs;
  return [
    ...refs,
    evidenceRef("finance_draft_summary", "finance:draft_summary:preview:redacted", "finance_copilot_policy"),
  ];
}

export function aiFinanceEvidenceComplete(
  value: { evidenceRefs: readonly AiFinanceEvidenceRef[] } | null,
): boolean {
  return Boolean(
    value &&
      value.evidenceRefs.length > 0 &&
      value.evidenceRefs.every(
        (ref) =>
          ref.redacted === true &&
          ref.rawRowsReturned === false &&
          ref.rawPromptReturned === false &&
          ref.rawProviderPayloadReturned === false,
      ),
  );
}

export function aiFinanceDebtCardsHaveEvidence(cards: readonly AiFinanceDebtCard[]): boolean {
  return cards.every((card) => aiFinanceEvidenceComplete(card));
}
