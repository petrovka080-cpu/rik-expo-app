import {
  LIVE_AI_BANNED_NORMAL_USER_COPY,
  answerLiveAiForContext,
  collectLiveAiProofAnswers,
  findLiveAiBannedCopy,
  getAllLiveAiContextIds,
  getLiveAiActionsForContext,
  listLiveAiRouteDefinitions,
  type LiveAiAnswer,
  type LiveAiContextId,
  type LiveAiPipelineKey,
} from "../../src/lib/ai/liveUi";

export const REQUIRED_LIVE_AI_CONTEXTS: LiveAiContextId[] = [
  "warehouse",
  "director",
  "foreman",
  "contractor",
  "buyer",
  "accountant",
  "office",
  "documents",
  "reports",
  "chat",
  "market",
  "supplier",
  "admin",
  "security",
  "runtime",
  "client",
];

export const REQUIRED_PIPELINES: Record<LiveAiContextId, LiveAiPipelineKey> = {
  warehouse: "warehouseStock",
  director: "directorCompany",
  foreman: "foremanIntelligence",
  contractor: "contractorAcceptance",
  buyer: "buyerSourcing",
  accountant: "accountantFinance",
  office: "officeDocumentControl",
  documents: "documentsDocumentCore",
  reports: "reportsDocumentCore",
  chat: "chatExtraction",
  market: "marketplaceIntake",
  supplier: "marketplaceIntake",
  admin: "adminOrgGovernance",
  security: "securityRuntime",
  runtime: "securityRuntime",
  client: "clientOwnerProgress",
};

export function expectUsefulLiveAnswer(answer: LiveAiAnswer): void {
  expect(answer.answerTextRu).toContain("Ответ");
  expect(answer.answerTextRu).toContain("Коротко:");
  expect(answer.answerTextRu).toContain("Что найдено:");
  expect(answer.answerTextRu).toContain("Чего не хватает:");
  expect(answer.answerTextRu).toContain("Следующий шаг:");
  expect(answer.answerTextRu).toContain("Статус:");
  expect(answer.sourcesRu.length + answer.checkedRu.length).toBeGreaterThan(0);
  expect(answer.nextStepRu.trim().length).toBeGreaterThan(0);
  expect(["data_unchanged", "draft_prepared", "approval_required"]).toContain(answer.status);
  expect(answer.changedData).toBe(false);
  expect(answer.dangerousMutationsFound).toBe(0);
  expect(answer.approvalBypassFound).toBe(0);
  expect(answer.crossRoleLeaksFound).toBe(0);
  expect(answer.genericAnswerUsed).toBe(false);
  expect(answer.selectedEntityOverblocked).toBe(false);
  expect(findLiveAiBannedCopy(answer.answerTextRu)).toEqual([]);
}

export function allLiveAnswers(): LiveAiAnswer[] {
  const proof = collectLiveAiProofAnswers();
  return [...proof.buttonAnswers, ...proof.freeTextAnswers];
}

export function answerFor(context: LiveAiContextId, text = "Что застряло сегодня?"): LiveAiAnswer {
  return answerLiveAiForContext({ context, userText: text });
}

export function buttonAnswersFor(context: LiveAiContextId): LiveAiAnswer[] {
  return getLiveAiActionsForContext(context).map((action) =>
    answerLiveAiForContext({
      context,
      userText: action.labelRu,
      forceActionId: action.id,
    }),
  );
}

export function routeContexts(): LiveAiContextId[] {
  return listLiveAiRouteDefinitions().map((route) => route.context);
}

export function bannedPhrases(): readonly string[] {
  return LIVE_AI_BANNED_NORMAL_USER_COPY;
}

export function registeredContexts(): LiveAiContextId[] {
  return getAllLiveAiContextIds();
}
