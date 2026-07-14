export type AiEstimateStorageRecordKind = "current_draft" | "approved_history" | "diagnostic" | "cache";

export type AiEstimateStorageRecord = {
  id: string;
  kind: AiEstimateStorageRecordKind;
  updatedAt: string;
  payload: unknown;
};

export type AiEstimateStoragePolicy = {
  approvedHistoryNeverTreatedAsCache: true;
  currentDraftPreservedUnderStoragePressure: true;
  diagnosticsRedacted: true;
  maxDiagnosticPayloadChars: number;
};

export const AI_ESTIMATE_STORAGE_POLICY: AiEstimateStoragePolicy = {
  approvedHistoryNeverTreatedAsCache: true,
  currentDraftPreservedUnderStoragePressure: true,
  diagnosticsRedacted: true,
  maxDiagnosticPayloadChars: 240,
};

export function redactAiEstimateStorageDiagnostic(value: unknown): string {
  return String(value ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]")
    .replace(/token[=:]\s*[^,\s]+/gi, "token=[redacted]")
    .slice(0, AI_ESTIMATE_STORAGE_POLICY.maxDiagnosticPayloadChars);
}
