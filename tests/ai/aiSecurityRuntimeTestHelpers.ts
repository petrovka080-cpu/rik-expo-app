import {
  answerSecurityRuntimeAction,
  answerSecurityRuntimeQuestion,
  buildSecurityRuntimeGovernanceMatrix,
  type SecurityRuntimeAnswer,
} from "../../src/lib/ai/securityRuntime";

export function securityAnswer(questionRu = "какие риски безопасности"): SecurityRuntimeAnswer {
  return answerSecurityRuntimeQuestion({ questionRu, role: "security" });
}

export function runtimeAnswer(questionRu = "почему release verify красный"): SecurityRuntimeAnswer {
  return answerSecurityRuntimeQuestion({ questionRu, role: "dev" });
}

export function normalUserRuntimeAnswer(): SecurityRuntimeAnswer {
  return answerSecurityRuntimeQuestion({ questionRu: "покажи runtime details", role: "normal_user" });
}

export function actionAnswer(actionId: string, role: "security" | "dev" = "security"): SecurityRuntimeAnswer {
  return answerSecurityRuntimeAction({ actionId, role });
}

export function expectReadOnly(answer: SecurityRuntimeAnswer): void {
  expect(answer.changedData).toBe(false);
  expect(answer.rolePolicyMutated).toBe(false);
  expect(answer.permissionGranted).toBe(false);
  expect(answer.permissionRevoked).toBe(false);
  expect(answer.policyDisabled).toBe(false);
  expect(answer.approvalChangedByAi).toBe(false);
  expect(answer.secretsRevealed).toBe(false);
  expect(answer.destructiveCommandSuggested).toBe(false);
}

export function expectSources(answer: SecurityRuntimeAnswer): void {
  expect(answer.sources.length).toBeGreaterThan(0);
  expect(answer.sourceTrace.length).toBeGreaterThan(0);
}

export function expectNoRawSecrets(answer: SecurityRuntimeAnswer): void {
  const visible = JSON.stringify({
    titleRu: answer.titleRu,
    shortAnswerRu: answer.shortAnswerRu,
    events: answer.events.map((event) => ({
      titleRu: event.titleRu,
      summaryRu: event.summaryRu,
      exactBlockerRu: "exactBlockerRu" in event ? event.exactBlockerRu : undefined,
    })),
    nextStepRu: answer.nextStepRu,
  });
  expect(visible).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|BEGIN RSA|BEGIN OPENSSH|password\s*=|token\s*=|secret\s*=|service_role key|raw provider payload/i);
}

export function matrixPartial() {
  return buildSecurityRuntimeGovernanceMatrix({
    webProofPassed: true,
    androidProofPassed: true,
    releaseVerifyPassed: false,
  });
}
