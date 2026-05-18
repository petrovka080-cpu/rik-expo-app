const FORBIDDEN_USER_COPY_PATTERNS = [
  /AI APP KNOWLEDGE BLOCK/i,
  /READ_ONLY_FACTS/i,
  /\bscreenId:/i,
  /\bcontextPolicy:/i,
  /\ballowedEntities:/i,
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
  /raw prompt/i,
  /raw provider/i,
  /raw payload/i,
  /raw transport/i,
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
] as const;

export const AI_SCREEN_MAGIC_SAFE_STATUS_COPY =
  "AI prepared screen-specific safe reads, drafts, and approval candidates from the current screen context.";

function includesForbiddenAiScreenMagicUserCopy(value: string): boolean {
  return FORBIDDEN_USER_COPY_PATTERNS.some((pattern) => pattern.test(value));
}

function includesInternalContextBlockCopy(value: string): boolean {
  return INTERNAL_CONTEXT_BLOCK_PATTERNS.some((pattern) => pattern.test(value));
}

export function sanitizeAiScreenMagicUserCopy(value: string): string {
  let next = String(value || "");
  if (includesInternalContextBlockCopy(next)) {
    return AI_SCREEN_MAGIC_SAFE_STATUS_COPY;
  }
  for (const pattern of FORBIDDEN_USER_COPY_PATTERNS) {
    next = next.replace(pattern, "");
  }
  return next.replace(/\s{2,}/g, " ").trim();
}

export function containsForbiddenAiScreenMagicUserCopy(value: string): boolean {
  return includesForbiddenAiScreenMagicUserCopy(value);
}
