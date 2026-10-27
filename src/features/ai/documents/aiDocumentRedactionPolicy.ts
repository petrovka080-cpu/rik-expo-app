import type { AiDocumentKnowledgeCard, AiDocumentSummaryPreview } from "./aiDocumentKnowledgeTypes";

export const AI_DOCUMENT_REDACTION_POLICY = Object.freeze({
  contractId: "ai_document_redaction_policy_v1",
  rawContentReturned: false,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  secretsReturned: false,
  allowSourceMetadataOnly: true,
  mutationCount: 0,
} as const);

const forbiddenPayloadKeys = [
  "rawBody",
  "rawContent",
  "rawDocumentContent",
  "rawPdfContent",
  "rawAttachment",
  "rawRows",
  "rawDbRows",
  "rawPrompt",
  "rawProviderPayload",
  "jwt",
  "password",
  "dbUrl",
  "accessToken",
] as const;

export type AiDocumentRedactionResult = {
  ok: boolean;
  rawContentReturned: false;
  rawRowsReturned: false;
  secretsReturned: false;
  forbiddenKeys: readonly string[];
};

function collectForbiddenKeys(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectForbiddenKeys(entry));
  }

  const record = value as Record<string, unknown>;
  return Object.keys(record).flatMap((key) => {
    const normalized = key.replace(/[_-]/g, "").toLowerCase();
    const directHits = forbiddenPayloadKeys.filter(
      (forbidden) => forbidden.replace(/[_-]/g, "").toLowerCase() === normalized,
    );
    return [...directHits, ...collectForbiddenKeys(record[key])];
  });
}

export function validateAiDocumentKnowledgeRedaction(
  value: AiDocumentKnowledgeCard | AiDocumentSummaryPreview | readonly AiDocumentKnowledgeCard[],
): AiDocumentRedactionResult {
  const forbiddenKeys = [...new Set(collectForbiddenKeys(value))];
  return {
    ok: forbiddenKeys.length === 0,
    rawContentReturned: false,
    rawRowsReturned: false,
    secretsReturned: false,
    forbiddenKeys,
  };
}
