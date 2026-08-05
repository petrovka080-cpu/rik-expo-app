import type {
  AiEstimateLedgerAppendRevisionInput,
  AiEstimateLedgerApproveRevisionInput,
  AiEstimateLedgerBindArtifactsInput,
  AiEstimateLedgerHistoryQuery,
  AiEstimateLedgerHistoryRecord,
  AiEstimateLedgerOperationResult,
  AiEstimateLedgerPage,
  AiEstimateLedgerRecord,
  AiEstimateLedgerSetStatusInput,
  AiEstimateLedgerUpsertDraftInput,
} from "./AiEstimateLedgerTypes";
import { safeJsonParseValue } from "../../format";

export type AiEstimateLedgerStore = {
  readonly adapterKind: "in_memory" | "browser_cached";
  upsertDraft(input: AiEstimateLedgerUpsertDraftInput): AiEstimateLedgerOperationResult<AiEstimateLedgerRecord>;
  appendRevision(input: AiEstimateLedgerAppendRevisionInput): AiEstimateLedgerOperationResult<AiEstimateLedgerRecord>;
  bindArtifacts(input: AiEstimateLedgerBindArtifactsInput): AiEstimateLedgerOperationResult<AiEstimateLedgerRecord>;
  approveRevision(input: AiEstimateLedgerApproveRevisionInput): AiEstimateLedgerOperationResult<AiEstimateLedgerRecord>;
  setStatus(input: AiEstimateLedgerSetStatusInput): AiEstimateLedgerOperationResult<AiEstimateLedgerRecord>;
  getRecord(estimateId: string): AiEstimateLedgerRecord | null;
  listApprovedHistory(query: AiEstimateLedgerHistoryQuery): AiEstimateLedgerPage<AiEstimateLedgerHistoryRecord>;
  countApprovedHistory(query: Omit<AiEstimateLedgerHistoryQuery, "cursorCreatedAt" | "limit">): number;
  resetForTests(): void;
};

export function cloneAiEstimateLedgerValue<T>(value: T): T {
  return safeJsonParseValue<T>(JSON.stringify(value), value);
}

export function normalizeAiEstimateLedgerText(value: string | null | undefined, fallback: string): string {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : fallback;
}

export function normalizeAiEstimateLedgerId(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (normalized.length < 1) throw new Error(`AI_ESTIMATE_LEDGER_INVALID_${fieldName.toUpperCase()}`);
  return normalized;
}

export function makeAiEstimateLedgerEventId(parts: readonly string[]): string {
  return `ai_estimate_ledger_event:${stableAiEstimateLedgerHash(parts.join("|"))}`;
}

export function stableAiEstimateLedgerHash(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
