import type { LiveAiSafetyStatus } from "./liveAiRouteRegistry";

export const LIVE_AI_BANNED_NORMAL_USER_COPY = [
  "Нужен конкретный источник",
  "нет выбранной складской позиции",
  "нет выбранного обсуждения",
  "нет выбранной работы",
  "нет выбранной заявки",
  "нет выбранного платежа",
  "нет выбранного документа",
  "Проверен экран",
  "Действие:",
  "AI помощник",
  "AI собирает этот блок",
  "данных текущего экрана",
  "точный ответ пока невозможен",
  "generic fallback",
  "provider unavailable",
  "safe_read",
  "draft_only",
  "approval_required",
  "exact_blocker",
  "transport",
  "mutation",
] as const;

const TECHNICAL_COPY_PATTERN = /\b(provider|runtime|service_role|env_secret|raw payload|secret token|supabase|postgres|mutation)\b/i;

export function findLiveAiBannedCopy(text: string): string[] {
  const source = String(text || "");
  const exact = LIVE_AI_BANNED_NORMAL_USER_COPY.filter((phrase) => source.includes(phrase));
  const technical = TECHNICAL_COPY_PATTERN.test(source) ? ["technical runtime/provider copy"] : [];
  return [...exact, ...technical];
}

export function hasLiveAiBannedCopy(text: string): boolean {
  return findLiveAiBannedCopy(text).length > 0;
}

export function assertNoLiveAiBannedCopy(text: string): void {
  const banned = findLiveAiBannedCopy(text);
  if (banned.length > 0) {
    throw new Error(`live AI answer contains banned copy: ${banned.join(", ")}`);
  }
}

export function liveAiStatusRu(status: LiveAiSafetyStatus): string {
  if (status === "draft_prepared") return "Черновик подготовлен.";
  if (status === "approval_required") return "Требуется согласование.";
  return "Данные не изменены.";
}

export function liveAiSafetyLine(status: LiveAiSafetyStatus): string {
  return `Статус:\n${liveAiStatusRu(status)}`;
}

export function sanitizeLiveAiUserAnswer(text: string): string {
  let safe = String(text || "");
  for (const phrase of LIVE_AI_BANNED_NORMAL_USER_COPY) {
    safe = safe.split(phrase).join("проверка доступных источников");
  }
  safe = safe.replace(/\b(provider|transport)\b/gi, "source check");
  safe = safe.replace(/\bruntime\b/gi, "health summary");
  safe = safe.replace(/\bmutations\b/gi, "data changes");
  safe = safe.replace(/\bmutation\b/gi, "data change");
  safe = safe.replace(/\braw\b/gi, "redacted");
  safe = safe.replace(/\bsecrets\b/gi, "redacted settings");
  safe = safe.replace(/\bsecret\b/gi, "redacted setting");
  safe = safe.replace(/\bservice_role\b/gi, "redacted role");
  safe = safe.replace(/\benv_secret\b/gi, "redacted setting");
  return safe;
}
