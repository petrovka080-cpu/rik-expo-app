import {
  AI_ROLE_MAGIC_REQUIRED_ROLE_IDS,
  listAiRoleMagicBlueprints,
} from "./aiRoleMagicBlueprintRegistry";
import type { AiRoleMagicBlueprint, AiRoleMagicValidationIssue } from "./aiRoleMagicBlueprintTypes";
import { validateAiRoleMagicButtonClickContract, validateAiRoleMagicScreenActionBuckets } from "./aiRoleMagicButtonClickContract";
import { validateAiRoleMagicQuestionAnswerPlans } from "./aiRoleMagicQuestionAnswerPlan";

const DEBUG_COPY_PATTERNS = [
  /operational mode/i,
  /data-aware context/i,
  /allowedIntents/i,
  /blockedIntents/i,
  /safe guide mode/i,
  /raw registry/i,
  /raw policy dump/i,
  /raw runtime transport/i,
  /raw BFF debug/i,
] as const;

const UNAVAILABLE_COPY_PATTERNS = [
  /module unavailable/i,
  /provider unavailable/i,
  /AI keys are not configured/i,
] as const;

function flattenBlueprintText(blueprint: AiRoleMagicBlueprint): string {
  return [
    blueprint.roleLabel,
    blueprint.userDaySummary,
    ...blueprint.userPainPoints.flatMap((pain) => [pain.pain, pain.whyItMatters, pain.currentManualWork]),
    ...blueprint.aiMustPrepareBeforeUserAsks.flatMap((work) => [work.title, work.description, work.expectedUserValue, ...work.dataNeeded]),
    ...blueprint.screenCoverage.flatMap((screen) => [
      screen.screenId,
      screen.screenUserGoal,
      ...screen.auditedButtonsToUse,
      ...screen.buttonsThatMustWork,
      ...screen.aiPreparedOutput,
      ...screen.aiQuestionsMustAnswer,
    ]),
    ...blueprint.realMagicExamples.flatMap((example) => [example.scenario, example.aiOutput, example.userBenefit]),
  ].join("\n");
}

function validateBlueprint(blueprint: AiRoleMagicBlueprint): AiRoleMagicValidationIssue[] {
  const issues: AiRoleMagicValidationIssue[] = [];
  const text = flattenBlueprintText(blueprint);

  if (blueprint.userDaySummary.trim().length < 20 || blueprint.userPainPoints.length === 0) {
    issues.push({ roleId: blueprint.roleId, code: "missing_role_empathy", exactReason: "Role day summary or pain points are incomplete." });
  }
  if (blueprint.aiMustPrepareBeforeUserAsks.length < 4) {
    issues.push({ roleId: blueprint.roleId, code: "missing_prepared_work", exactReason: "Role has fewer than four prepared work items." });
  }
  if (blueprint.screenCoverage.length === 0) {
    issues.push({ roleId: blueprint.roleId, code: "missing_screen_coverage", exactReason: "Role has no screen coverage." });
  }
  if (blueprint.realMagicExamples.length < 2) {
    issues.push({ roleId: blueprint.roleId, code: "missing_real_magic", exactReason: "Role needs at least two real magic examples." });
  }

  for (const [key, value] of Object.entries(blueprint.safety)) {
    if (value !== true) {
      issues.push({ roleId: blueprint.roleId, code: "missing_safety_flag", exactReason: `${key} is not true.` });
    }
  }

  if (blueprint.aiMustPrepareBeforeUserAsks.length === 0 || blueprint.screenCoverage.every((screen) => screen.aiPreparedOutput.length === 0)) {
    issues.push({ roleId: blueprint.roleId, code: "generic_chat_only", exactReason: "Role is missing proactive prepared outputs." });
  }

  for (const pattern of [...DEBUG_COPY_PATTERNS, ...UNAVAILABLE_COPY_PATTERNS]) {
    if (pattern.test(text)) {
      issues.push({ roleId: blueprint.roleId, code: "debug_copy_exposed", exactReason: `Blueprint text matches ${pattern.source}.` });
    }
  }

  for (const screen of blueprint.screenCoverage) {
    issues.push(...validateAiRoleMagicScreenActionBuckets({ roleId: blueprint.roleId, ...screen }));
  }

  return issues;
}

export function validateAiRoleMagicBlueprintSafety(
  blueprints: readonly AiRoleMagicBlueprint[] = listAiRoleMagicBlueprints(),
): {
  ok: boolean;
  finalStatus: "GREEN_AI_ROLE_EMPATHY_MAGIC_LOGIC_BLUEPRINT_READY" | "BLOCKED_AI_ROLE_MAGIC_COVERAGE_INCOMPLETE";
  issues: AiRoleMagicValidationIssue[];
  rolesCovered: readonly string[];
  genericChatOnlyRoles: number;
} {
  const issues = blueprints.flatMap(validateBlueprint);
  const roleIds = new Set(blueprints.map((blueprint) => blueprint.roleId));
  for (const roleId of AI_ROLE_MAGIC_REQUIRED_ROLE_IDS) {
    if (!roleIds.has(roleId)) {
      issues.push({
        roleId,
        code: "missing_role_empathy",
        exactReason: `${roleId} is missing from the role magic blueprint registry.`,
      });
    }
  }

  const qa = validateAiRoleMagicQuestionAnswerPlans();
  for (const issue of qa.issues) {
    issues.push({
      roleId: issue.split(":")[0] as AiRoleMagicValidationIssue["roleId"],
      code: "missing_role_empathy",
      exactReason: issue,
    });
  }

  const buttons = validateAiRoleMagicButtonClickContract();
  issues.push(...buttons.issues);

  const genericChatOnlyRoles = blueprints.filter((blueprint) =>
    blueprint.aiMustPrepareBeforeUserAsks.length === 0 ||
    blueprint.screenCoverage.every((screen) => screen.aiPreparedOutput.length === 0),
  ).length;

  return {
    ok: issues.length === 0,
    finalStatus: issues.length === 0
      ? "GREEN_AI_ROLE_EMPATHY_MAGIC_LOGIC_BLUEPRINT_READY"
      : "BLOCKED_AI_ROLE_MAGIC_COVERAGE_INCOMPLETE",
    issues,
    rolesCovered: [...roleIds].sort(),
    genericChatOnlyRoles,
  };
}
