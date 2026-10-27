import type { AiEvalLedgerRecord } from "./AiEvalLedger";

export function redactAiEvalLedgerRecord(record: AiEvalLedgerRecord): AiEvalLedgerRecord {
  return {
    ...record,
    providerKey: record.providerKey.replace(/(?:sk|pk|ghp|glpat|xoxb|ya29|AIza)[A-Za-z0-9_-]{8,}/g, "[redacted_token]"),
    modelKey: record.modelKey.slice(0, 120),
  };
}

export function aiEvalLedgerStoresRawPromptUnredacted(record: AiEvalLedgerRecord): boolean {
  const serialized = JSON.stringify({ ...record, createdAt: "" });
  return /full prompt|systemInstruction|raw_ai_json|@[A-Z0-9.-]+\.[A-Z]{2,}|\+\d[\d\s().-]{7,}\d/i.test(serialized);
}
