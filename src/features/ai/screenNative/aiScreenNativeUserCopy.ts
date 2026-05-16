const FORBIDDEN_USER_COPY = [
  /Data-aware context/gi,
  /allowedIntents/gi,
  /blockedIntents/gi,
  /safe guide mode/gi,
  /provider unavailable/gi,
  /Gemini unavailable/gi,
  /AI-ключи не настроены/gi,
  /модуль не подключен/gi,
  /raw policy dump/gi,
  /raw registry/gi,
];

export const AI_SCREEN_NATIVE_SAFE_STATUS_COPY =
  "Работаю по данным экрана: готовлю сводки, риски, черновики и кандидаты на согласование. Опасные действия напрямую не выполняю.";

export function sanitizeAiScreenNativeUserCopy(value: string): string {
  let next = String(value || "");
  for (const pattern of FORBIDDEN_USER_COPY) {
    next = next.replace(pattern, "режим подсказок и черновиков");
  }
  return next.replace(/\s{2,}/g, " ").trim();
}

export function containsForbiddenAiScreenNativeUserCopy(value: string): boolean {
  return FORBIDDEN_USER_COPY.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}
