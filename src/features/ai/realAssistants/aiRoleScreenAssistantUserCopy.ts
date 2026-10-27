const USER_COPY_FORBIDDEN_PATTERNS = [
  /AI-ключи не настроены/i,
  /safe guide mode/i,
  /provider unavailable/i,
  /Gemini unavailable/i,
  /Data-aware context/i,
  /allowedIntents/i,
  /blockedIntents/i,
  /module unavailable/i,
  /модуль не подключен/i,
  /задайте вопрос/i,
  /я только читаю/i,
] as const;

export function sanitizeAiRoleScreenAssistantCopy(value: string): string {
  let next = String(value || "").trim();
  for (const pattern of USER_COPY_FORBIDDEN_PATTERNS) {
    next = next.replace(pattern, "Работаю по данным экрана");
  }
  return next;
}

export function hasForbiddenAiRoleScreenAssistantCopy(value: string): boolean {
  return USER_COPY_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(value));
}

export const AI_ROLE_SCREEN_ASSISTANT_SAFE_STATUS_COPY =
  "Подготовил рабочий срез по экрану. Опасные действия остаются через согласование.";
