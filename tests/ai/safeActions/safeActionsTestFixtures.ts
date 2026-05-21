import {
  AI_SAFE_ACTION_KINDS,
  buildAiSafeActionDraft,
  guardAiSafeActionDraftExecution,
  type AiSafeActionDraft,
  type AiSafeActionKind,
} from "../../../src/lib/ai/safeActions";

export function createSafeActionDraftFixture(actionKind: AiSafeActionKind): AiSafeActionDraft {
  return buildAiSafeActionDraft({
    actionKind,
    sourceTraceId: `test-trace:${actionKind}`,
    sourceAnswerId: `test-answer:${actionKind}`,
    questionRu: "Подготовить безопасный черновик",
  });
}

export function createAllSafeActionDraftFixtures(): AiSafeActionDraft[] {
  return AI_SAFE_ACTION_KINDS.map(createSafeActionDraftFixture);
}

export function expectDraftIsSafe(draft: AiSafeActionDraft): void {
  expect(guardAiSafeActionDraftExecution(draft)).toMatchObject({
    passed: true,
    noDbWriteFromAnswer: true,
    noFinalSubmit: true,
    noAutoApproval: true,
    noDangerousMutation: true,
    humanConfirmationRequired: true,
    sourceRefsPresent: true,
    impactDiffPresent: true,
    idempotencyChecked: true,
  });
  expect(draft.safety).toMatchObject({
    changedData: false,
    finalSubmit: false,
    autoApproval: false,
    dangerousMutation: false,
    requiresHumanConfirmation: true,
  });
}
