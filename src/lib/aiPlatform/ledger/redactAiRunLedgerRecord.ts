import type { AiRunLedgerRecord } from "./AiRunLedgerContract";

export function redactAiRunLedgerRecord(record: AiRunLedgerRecord): AiRunLedgerRecord {
  return {
    ...record,
    intent: String(record.intent ?? "").slice(0, 160),
    toolPlanSummary: record.toolPlanSummary
      ? {
          toolName: record.toolPlanSummary.toolName,
          mode: record.toolPlanSummary.mode,
          allowed: record.toolPlanSummary.allowed,
          approvalRequired: record.toolPlanSummary.approvalRequired,
        }
      : undefined,
  };
}

export function aiRunLedgerRecordStoresRawPrompt(record: unknown): boolean {
  return /\b(rawPrompt|raw_prompt|providerPayload|provider_payload|messages|fullPrompt|full_prompt)\b/i.test(
    JSON.stringify(record),
  );
}
