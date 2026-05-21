export type AiAnswerFirstPolicy = {
  enabled: true;
  forbiddenPrimaryAnswerStarts: string[];
  forbiddenPrimaryDiagnostics: string[];
  publicKnowledgeQuestionsMustAnswer: true;
  diagnosticsAllowedOnlyAtBottom: true;
  emptyAnswerAllowedForPublicKnowledge: false;
};

export const AI_ANSWER_FIRST_POLICY: AiAnswerFirstPolicy = {
  enabled: true,
  forbiddenPrimaryAnswerStarts: [
    "не найдено",
    "в доступных данных не найдено",
    "pdf не найден",
    "marketplace не найден",
    "интернет не использовался",
    "уточните вопрос",
    "подходящих данных нет",
  ],
  forbiddenPrimaryDiagnostics: [
    "интернет не использовался",
    "marketplace не использовался",
    "pdf не использовался",
    "общие знания не использовались",
    "общие строительные знания не использовались",
    "смета не найдена",
    "цены не рассчитаны",
  ],
  publicKnowledgeQuestionsMustAnswer: true,
  diagnosticsAllowedOnlyAtBottom: true,
  emptyAnswerAllowedForPublicKnowledge: false,
};

export function startsWithForbiddenAiDiagnostic(answerRu: string): boolean {
  const normalized = answerRu.trim().toLowerCase();
  return AI_ANSWER_FIRST_POLICY.forbiddenPrimaryAnswerStarts.some((prefix) =>
    normalized.startsWith(prefix),
  );
}

export function hasAiDiagnosticsBeforeResult(answerRu: string): boolean {
  const normalized = answerRu.trim().toLowerCase();
  const firstResultIndex = Math.min(
    ...["коротко:", "смета:", "расчет:", "расчёт:", "варианты:", "чек-лист:"]
      .map((marker) => normalized.indexOf(marker))
      .filter((index) => index >= 0),
  );
  const scanEnd = Number.isFinite(firstResultIndex) ? firstResultIndex : Math.min(normalized.length, 420);
  const primaryBlock = normalized.slice(0, Math.max(scanEnd, Math.min(normalized.length, 420)));
  return AI_ANSWER_FIRST_POLICY.forbiddenPrimaryDiagnostics.some((diagnostic) =>
    primaryBlock.includes(diagnostic),
  );
}
