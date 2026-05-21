import {
  answerContractorAcceptanceAction,
  answerContractorAcceptanceQuestion,
  buildDefaultContractorAcceptanceContext,
  type ContractorAcceptanceAnswer,
  type ContractorAcceptanceIntent,
} from "../../src/lib/ai/contractorAcceptance";

export function contractorActionAnswer(actionId: ContractorAcceptanceIntent): ContractorAcceptanceAnswer {
  return answerContractorAcceptanceAction({
    context: buildDefaultContractorAcceptanceContext(),
    actionId,
  });
}

export function contractorQuestionAnswer(questionRu: string): ContractorAcceptanceAnswer {
  return answerContractorAcceptanceQuestion({
    context: buildDefaultContractorAcceptanceContext(),
    questionRu,
  });
}

export function expectContractorAnswerSafe(answer: ContractorAcceptanceAnswer): void {
  expect(answer.changedData).toBe(false);
  expect(answer.workStatusChangedByAi).toBe(false);
  expect(answer.remarkClosedByAi).toBe(false);
  expect(answer.actSignedByAi).toBe(false);
  expect(answer.finalSubmit).toBe(false);
  expect(answer.evidenceCreatedByAi).toBe(false);
  expect(answer.paymentStatusChangedByAi).toBe(false);
  expect(answer.autoApproval).toBe(false);
  expect(answer.approvalBypassFound).toBe(0);
  expect(answer.crossRoleLeaksFound).toBe(0);
}

export function expectContractorOwnScope(answer: ContractorAcceptanceAnswer): void {
  expect(answer.role).toBe("contractor");
  expect(answer.events.length).toBeGreaterThan(0);
  expect(answer.events.every((event) => event.linkedContext.contractorId === "CTR-GKL")).toBe(true);
  expect(JSON.stringify(answer)).not.toMatch(/other contractor|CTR-OTHER|full_company_cashflow|service_role|runtime_secret/i);
}
