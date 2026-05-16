const FORBIDDEN_USER_COPY_PATTERNS = [
  /Data-aware context/i,
  /allowedIntents/i,
  /blockedIntents/i,
  /safe guide mode/i,
  /raw transport/i,
  /raw registry/i,
  /raw policy dump/i,
  /provider unavailable/i,
  /module unavailable/i,
  /AI-ключи не настроены/i,
  /AI keys are not configured/i,
] as const;

export function sanitizeAiScreenWorkflowUserCopy(value: string): string {
  let next = String(value || "");
  for (const pattern of FORBIDDEN_USER_COPY_PATTERNS) {
    next = next.replace(pattern, "");
  }
  return next.replace(/\s{2,}/g, " ").trim();
}

export function containsForbiddenAiScreenWorkflowUserCopy(value: string): boolean {
  return FORBIDDEN_USER_COPY_PATTERNS.some((pattern) => pattern.test(value));
}
