const FORBIDDEN_USER_COPY_PATTERNS = [
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

export function sanitizeAiScreenMagicUserCopy(value: string): string {
  let next = String(value || "");
  for (const pattern of FORBIDDEN_USER_COPY_PATTERNS) {
    next = next.replace(pattern, "");
  }
  return next.replace(/\s{2,}/g, " ").trim();
}

export function containsForbiddenAiScreenMagicUserCopy(value: string): boolean {
  return FORBIDDEN_USER_COPY_PATTERNS.some((pattern) => pattern.test(value));
}
