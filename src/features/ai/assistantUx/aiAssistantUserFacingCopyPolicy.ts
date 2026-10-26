const FORBIDDEN_USER_COPY_PATTERNS = [
  /AI-ключ[^\n]*/i,
  /safe guide mode/i,
  /provider unavailable/i,
  /Gemini unavailable/i,
  /AI model provider blocked request/i,
  /Data-aware context/i,
  /allowedIntents/i,
  /blockedIntents/i,
  /approval_required:\s*/i,
  /policy:\s*/i,
  /role:\s*/i,
  /screen:\s*/i,
] as const;

export const AI_ASSISTANT_GUIDE_MODE_COPY =
  "Работаю в режиме подсказок и черновиков. Действия напрямую не выполняю.";

export function containsForbiddenAssistantUserFacingCopy(value: string): boolean {
  return FORBIDDEN_USER_COPY_PATTERNS.some((pattern) => pattern.test(value));
}

export function sanitizeAssistantUserFacingCopy(value: string): string {
  let next = String(value || "").trim();
  for (const pattern of FORBIDDEN_USER_COPY_PATTERNS) {
    next = next.replace(pattern, AI_ASSISTANT_GUIDE_MODE_COPY);
  }
  next = next.replace(/\n{3,}/g, "\n\n").trim();
  return next || AI_ASSISTANT_GUIDE_MODE_COPY;
}
