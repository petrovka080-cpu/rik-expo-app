const FORBIDDEN_USER_COPY_PATTERNS = [
  /AI APP KNOWLEDGE BLOCK/i,
  /READ_ONLY_FACTS/i,
  /\bscreenId:/i,
  /\bcontextPolicy:/i,
  /\ballowedEntities:/i,
  /Data-aware context/i,
  /allowedIntents/i,
  /blockedIntents/i,
  /documentSources/i,
  /reportSources/i,
  /pdfSources/i,
  /approvalBoundary/i,
  /redactionPolicy/i,
  /professionalAnswerRequirements/i,
  /rawDocumentContent/i,
  /rawPdfContent/i,
  /rawAttachmentContent/i,
  /safe guide mode/i,
  /raw transport/i,
  /raw registry/i,
  /raw policy dump/i,
  /provider unavailable/i,
  /module unavailable/i,
  /AI-ключи не настроены/i,
  /AI keys are not configured/i,
] as const;

const INTERNAL_CONTEXT_BLOCK_PATTERNS = [
  /AI APP KNOWLEDGE BLOCK/i,
  /READ_ONLY_FACTS/i,
  /\bscreenId:/i,
  /\bcontextPolicy:/i,
  /\ballowedEntities:/i,
  /documentSources/i,
  /reportSources/i,
  /pdfSources/i,
  /approvalBoundary/i,
  /redactionPolicy/i,
  /professionalAnswerRequirements/i,
  /rawDocumentContent/i,
  /rawPdfContent/i,
  /rawAttachmentContent/i,
] as const;

export const AI_SCREEN_WORKFLOW_SAFE_STATUS_COPY =
  "AI prepared a safe read-only summary from the current screen. Drafts are not final, and approval-required actions stay routed to the ledger.";

function includesForbiddenAiScreenWorkflowUserCopy(value: string): boolean {
  return FORBIDDEN_USER_COPY_PATTERNS.some((pattern) => pattern.test(value));
}

function includesInternalContextBlockCopy(value: string): boolean {
  return INTERNAL_CONTEXT_BLOCK_PATTERNS.some((pattern) => pattern.test(value));
}

export function sanitizeAiScreenWorkflowUserCopy(value: string): string {
  let next = String(value || "");
  if (includesInternalContextBlockCopy(next)) {
    return AI_SCREEN_WORKFLOW_SAFE_STATUS_COPY;
  }
  for (const pattern of FORBIDDEN_USER_COPY_PATTERNS) {
    next = next.replace(pattern, "");
  }
  return next.replace(/\s{2,}/g, " ").trim();
}

export function containsForbiddenAiScreenWorkflowUserCopy(value: string): boolean {
  return includesForbiddenAiScreenWorkflowUserCopy(value);
}
