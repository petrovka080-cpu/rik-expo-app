import {
  AI_ROLE_MAGIC_REQUIRED_ROLE_IDS,
  getAiRoleMagicBlueprint,
} from "./aiRoleMagicBlueprintRegistry";
import type { AiRoleMagicRoleId } from "./aiRoleMagicBlueprintTypes";
import {
  listAiRoleMagicQaExpectations,
  type AiRoleMagicQaExpectation,
} from "./aiRoleMagicQaExpectations";

export type AiRoleMagicQuestionAnswerPlan = {
  roleId: AiRoleMagicRoleId;
  questions: readonly AiRoleMagicQaExpectation[];
  screenContextSources: readonly string[];
  preparedOutputs: readonly string[];
  answersFromScreenContext: true;
  providerCallAllowed: false;
  dbWriteAllowed: false;
  forbiddenCopyHidden: boolean;
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export function buildAiRoleMagicQuestionAnswerPlan(roleId: AiRoleMagicRoleId): AiRoleMagicQuestionAnswerPlan {
  const blueprint = getAiRoleMagicBlueprint(roleId);
  const questions = listAiRoleMagicQaExpectations(roleId);
  const screenContextSources = uniqueSorted([
    ...(blueprint?.screenCoverage.map((screen) => screen.screenId) ?? []),
    ...questions.flatMap((question) => question.expectedContext),
  ]);
  const preparedOutputs = uniqueSorted(blueprint?.aiMustPrepareBeforeUserAsks.map((item) => item.outputType) ?? []);

  return {
    roleId,
    questions,
    screenContextSources,
    preparedOutputs,
    answersFromScreenContext: true,
    providerCallAllowed: false,
    dbWriteAllowed: false,
    forbiddenCopyHidden: questions.every((question) => question.forbiddenCopy.length > 0),
  };
}

export function listAiRoleMagicQuestionAnswerPlans(): AiRoleMagicQuestionAnswerPlan[] {
  return AI_ROLE_MAGIC_REQUIRED_ROLE_IDS.map(buildAiRoleMagicQuestionAnswerPlan);
}

export function validateAiRoleMagicQuestionAnswerPlans(
  plans: readonly AiRoleMagicQuestionAnswerPlan[] = listAiRoleMagicQuestionAnswerPlans(),
): { ok: boolean; issues: string[]; rolesWithFiveQuestions: number } {
  const issues: string[] = [];

  for (const plan of plans) {
    if (plan.questions.length < 5) issues.push(`${plan.roleId}:less_than_five_questions`);
    if (plan.screenContextSources.length === 0) issues.push(`${plan.roleId}:missing_screen_context`);
    if (plan.preparedOutputs.length === 0) issues.push(`${plan.roleId}:missing_prepared_outputs`);
    if (!plan.forbiddenCopyHidden) issues.push(`${plan.roleId}:forbidden_copy_policy_missing`);
    if (plan.providerCallAllowed || plan.dbWriteAllowed) issues.push(`${plan.roleId}:runtime_side_effect_not_allowed`);
  }

  return {
    ok: issues.length === 0,
    issues,
    rolesWithFiveQuestions: plans.filter((plan) => plan.questions.length >= 5).length,
  };
}
