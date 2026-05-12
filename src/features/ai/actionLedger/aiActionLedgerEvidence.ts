export const AI_ACTION_LEDGER_MAX_EVIDENCE_REFS = 20;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function normalizeAiActionLedgerEvidenceRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeText).filter(Boolean))].slice(
    0,
    AI_ACTION_LEDGER_MAX_EVIDENCE_REFS,
  );
}

export function hasAiActionLedgerEvidence(value: unknown): boolean {
  return normalizeAiActionLedgerEvidenceRefs(value).length > 0;
}
