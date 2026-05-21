import type { UniversalRoleQaAnswer } from "./universalAnswerComposer";
import { makeUniversalRoleQaId, normalizeUniversalRoleQaQuestion } from "./universalQuestionNormalizer";

export type UniversalRoleQaFeedbackEvent = {
  id: string;
  questionRu: string;
  normalizedQuestionRu: string;
  answerId: string;
  role: string;
  screenId: string;
  intent: UniversalRoleQaAnswer["intent"];
  entity: UniversalRoleQaAnswer["entity"];
  feedback:
    | "useful"
    | "wrong_topic"
    | "wrong_entity"
    | "missing_app_data"
    | "should_use_web"
    | "wrong_source"
    | "too_generic"
    | "too_noisy"
    | "unsafe"
    | "other";
  userCommentRu?: string;
  createdAt: string;
  usedForTrainingDataset: boolean;
};

export function collectUniversalRoleQaFeedbackEvent(input: {
  answer: UniversalRoleQaAnswer;
  feedback: UniversalRoleQaFeedbackEvent["feedback"];
  userCommentRu?: string;
  createdAt?: string;
}): UniversalRoleQaFeedbackEvent {
  return {
    id: makeUniversalRoleQaId("universal-role-qa-feedback", `${input.answer.id}:${input.feedback}:${input.createdAt ?? "now"}`),
    questionRu: input.answer.questionRu,
    normalizedQuestionRu: normalizeUniversalRoleQaQuestion(input.answer.questionRu),
    answerId: input.answer.id,
    role: input.answer.role,
    screenId: input.answer.screenId,
    intent: input.answer.intent,
    entity: input.answer.entity,
    feedback: input.feedback,
    userCommentRu: input.userCommentRu,
    createdAt: input.createdAt ?? "2026-05-20T00:00:00.000Z",
    usedForTrainingDataset: false,
  };
}
