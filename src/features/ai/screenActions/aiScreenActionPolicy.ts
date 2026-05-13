import { AI_TOOL_NAMES } from "../tools/aiToolRegistry";
import type { AiToolName } from "../tools/aiToolTypes";
import {
  AI_SCREEN_ACTION_REGISTRY,
  AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS,
} from "./aiScreenActionRegistry";
import type {
  AiScreenActionDefinition,
  AiScreenActionRegistryValidation,
} from "./aiScreenActionTypes";

export const AI_SCREEN_ACTION_POLICY_CONTRACT = Object.freeze({
  contractId: "ai_screen_action_truth_policy_v1",
  readOnly: true,
  evidenceRequired: true,
  roleScopeRequired: true,
  highRiskRequiresApproval: true,
  forbiddenActionsExecutable: false,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  providerCalled: false,
  fakeAiAnswer: false,
  hardcodedAiResponse: false,
} as const);

const TOOL_NAME_SET = new Set<string>(AI_TOOL_NAMES);

function allRequiredScreensRegistered(): boolean {
  return AI_SCREEN_ACTION_REQUIRED_SCREEN_IDS.every((screenId) =>
    AI_SCREEN_ACTION_REGISTRY.some((entry) => entry.screenId === screenId),
  );
}

function hasRoleScope(action: AiScreenActionDefinition): boolean {
  return action.roleScope.length > 0 && action.allowedRoles.length > 0;
}

function hasEvidence(action: AiScreenActionDefinition): boolean {
  return action.evidenceRequired === true && action.evidenceSources.length > 0;
}

function highRiskRequiresApproval(action: AiScreenActionDefinition): boolean {
  return (
    action.riskLevel !== "high" ||
    (action.mode === "approval_required" && action.requiresApproval === true)
  );
}

function forbiddenActionIsNonExecutable(action: AiScreenActionDefinition): boolean {
  return action.riskLevel !== "forbidden" || action.mode === "forbidden";
}

export function validateAiScreenActionRegistryPolicy(): AiScreenActionRegistryValidation {
  const actions = AI_SCREEN_ACTION_REGISTRY.flatMap((entry) => entry.visibleActions);
  const blockers = new Set<AiScreenActionRegistryValidation["blockers"][number]>();
  const unknownToolReferences = actions
    .map((action) => action.aiTool)
    .filter((tool): tool is AiToolName => Boolean(tool))
    .filter((tool) => !TOOL_NAME_SET.has(tool));

  if (unknownToolReferences.length > 0) blockers.add("BLOCKED_UNKNOWN_AI_TOOL_REFERENCE");

  const requiredScreensRegistered = allRequiredScreensRegistered();
  if (!requiredScreensRegistered) blockers.add("BLOCKED_REQUIRED_SCREEN_NOT_REGISTERED");

  const allActionsHaveRoleScope = actions.every(hasRoleScope);
  if (!allActionsHaveRoleScope) blockers.add("BLOCKED_ACTION_WITHOUT_ROLE_SCOPE");

  const allActionsHaveRiskPolicy = actions.every((action) =>
    ["low", "medium", "high", "forbidden"].includes(action.riskLevel),
  );
  const allActionsHaveEvidenceSource = actions.every(hasEvidence);
  if (!allActionsHaveEvidenceSource) blockers.add("BLOCKED_ACTION_WITHOUT_EVIDENCE_SOURCE");

  const allHighRiskActionsRequireApproval = actions.every(highRiskRequiresApproval);
  if (!allHighRiskActionsRequireApproval) blockers.add("BLOCKED_HIGH_RISK_ACTION_WITHOUT_APPROVAL");

  const forbiddenActionsExecutable = actions.some((action) => !forbiddenActionIsNonExecutable(action));
  if (forbiddenActionsExecutable) blockers.add("BLOCKED_FORBIDDEN_ACTION_EXECUTABLE");

  const allEntriesHaveForbiddenRoles = AI_SCREEN_ACTION_REGISTRY.every((entry) =>
    Array.isArray(entry.forbiddenRoles),
  );
  const allActionsHaveForbiddenRoles = actions.every((action) => Array.isArray(action.forbiddenRoles));

  return {
    ok:
      blockers.size === 0 &&
      allActionsHaveRiskPolicy &&
      allActionsHaveRoleScope &&
      allActionsHaveEvidenceSource &&
      allHighRiskActionsRequireApproval &&
      !forbiddenActionsExecutable &&
      allEntriesHaveForbiddenRoles &&
      allActionsHaveForbiddenRoles,
    blockers: [...blockers],
    screensRegistered: AI_SCREEN_ACTION_REGISTRY.length,
    buttonsOrActionsRegistered: actions.length,
    requiredScreensRegistered,
    allActionsHaveRoleScope,
    allActionsHaveRiskPolicy,
    allActionsHaveEvidenceSource,
    allHighRiskActionsRequireApproval,
    forbiddenActionsExecutable: false,
    unknownToolReferences,
  };
}
