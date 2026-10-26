import type { AiContextGraphBuildResult } from "../appContextGraph";
import {
  answerUniversalRoleQa,
  type UniversalRoleQaAnswer,
} from "./universalAnswerComposer";
import { getUniversalRoleQaQuestionBank } from "./universalQuestionBank";
import {
  validateUniversalRoleQaAnswer,
  type UniversalRoleQaSemanticGuardResult,
} from "./universalSemanticGuard";

export type UniversalRoleQaEvaluationResult = {
  answers: UniversalRoleQaAnswer[];
  guardResults: UniversalRoleQaSemanticGuardResult[];
  passed: boolean;
  failures: string[];
};

export function runUniversalRoleQaEvaluation(input: {
  graph?: AiContextGraphBuildResult;
  role?: string;
  screenId?: string;
  limit?: number;
}): UniversalRoleQaEvaluationResult {
  const questions = getUniversalRoleQaQuestionBank().slice(0, input.limit ?? 50);
  const answers = questions.map((question) =>
    answerUniversalRoleQa({
      questionRu: question.questionRu,
      role: input.role ?? "director",
      screenId: input.screenId ?? "director",
      graph: input.graph,
      externalWebConnected: question.category === "construction",
    }),
  );
  const guardResults = answers.map((answer, index) =>
    validateUniversalRoleQaAnswer(answer, {
      intent: questions[index].expectedIntent,
      entity: questions[index].expectedEntity === "unknown" ? undefined : questions[index].expectedEntity,
    }),
  );
  const failures = guardResults
    .map((result, index) => result.passed ? null : `${questions[index].id}: ${result.failureReason ?? "unknown"}`)
    .filter((item): item is string => Boolean(item));

  return {
    answers,
    guardResults,
    passed: failures.length === 0,
    failures,
  };
}
