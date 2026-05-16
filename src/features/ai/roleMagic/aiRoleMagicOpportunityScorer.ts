import { listAiRoleMagicBlueprints } from "./aiRoleMagicBlueprintRegistry";
import type { AiRoleMagicBlueprint, AiRoleMagicRoleId } from "./aiRoleMagicBlueprintTypes";
import { listAiRoleMagicQaExpectations } from "./aiRoleMagicQaExpectations";

export type AiRoleMagicOpportunityScore = {
  roleId: AiRoleMagicRoleId;
  totalScore: number;
  roleEmpathyScore: number;
  preparedWorkScore: number;
  screenCoverageScore: number;
  buttonCoverageScore: number;
  qaScore: number;
  safetyScore: number;
  topOpportunities: readonly string[];
};

function cappedScore(count: number, expected: number, weight: number): number {
  return Math.min(count / expected, 1) * weight;
}

function hasActionCoverage(blueprint: AiRoleMagicBlueprint): number {
  return blueprint.screenCoverage.filter((screen) =>
    screen.safeReadActions.length > 0 &&
    screen.draftOnlyActions.length > 0 &&
    screen.approvalRequiredActions.length > 0 &&
    screen.forbiddenActions.length > 0,
  ).length;
}

function safetyScore(blueprint: AiRoleMagicBlueprint): number {
  const values = Object.values(blueprint.safety);
  return cappedScore(values.filter(Boolean).length, values.length, 20);
}

export function scoreAiRoleMagicBlueprint(blueprint: AiRoleMagicBlueprint): AiRoleMagicOpportunityScore {
  const questions = listAiRoleMagicQaExpectations(blueprint.roleId);
  const roleEmpathyScore = cappedScore(
    [
      blueprint.userDaySummary,
      ...blueprint.userPainPoints.flatMap((pain) => [pain.pain, pain.whyItMatters, pain.currentManualWork]),
    ].filter((value) => value.trim().length >= 20).length,
    7,
    15,
  );
  const preparedWorkScore = cappedScore(blueprint.aiMustPrepareBeforeUserAsks.length, 4, 20);
  const screenCoverageScore = cappedScore(blueprint.screenCoverage.length, 1, 15);
  const buttonCoverageScore = cappedScore(hasActionCoverage(blueprint), blueprint.screenCoverage.length, 15);
  const qaScore = cappedScore(questions.length, 5, 15);
  const safeScore = safetyScore(blueprint);

  return {
    roleId: blueprint.roleId,
    totalScore: Math.round(roleEmpathyScore + preparedWorkScore + screenCoverageScore + buttonCoverageScore + qaScore + safeScore),
    roleEmpathyScore,
    preparedWorkScore,
    screenCoverageScore,
    buttonCoverageScore,
    qaScore,
    safetyScore: safeScore,
    topOpportunities: blueprint.aiMustPrepareBeforeUserAsks
      .slice(0, 3)
      .map((item) => `${item.title}: ${item.expectedUserValue}`),
  };
}

export function scoreAllAiRoleMagicBlueprints(): AiRoleMagicOpportunityScore[] {
  return listAiRoleMagicBlueprints()
    .map(scoreAiRoleMagicBlueprint)
    .sort((left, right) => right.totalScore - left.totalScore || left.roleId.localeCompare(right.roleId));
}
