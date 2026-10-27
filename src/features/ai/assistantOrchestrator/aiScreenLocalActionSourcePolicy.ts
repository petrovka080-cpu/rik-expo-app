import type { AiUserRole } from "../policy/aiRolePolicy";
import { getAiScreenActionEntry } from "../screenActions/aiScreenActionRegistry";
import { resolveAiScreenActions } from "../screenActions/aiScreenActionResolver";
import type {
  AiScreenActionDefinition,
  AiScreenActionResolverAuth,
} from "../screenActions/aiScreenActionTypes";
import {
  AI_SCREEN_LOCAL_ASSISTANT_REQUIRED_SCREEN_IDS,
  listAiScreenLocalAssistantProfiles,
} from "./aiScreenLocalContextResolver";
import {
  normalizeAiScreenLocalAssistantScreenId,
} from "./aiRoleScreenBoundary";

export const AI_SCREEN_LOCAL_ACTION_POLICY_SOURCE = "ai_screen_button_action_registry_v1" as const;

export type AiScreenLocalActionSourceDecision = {
  status: "resolved" | "blocked";
  screenId: string;
  role: AiUserRole;
  action: AiScreenActionDefinition | null;
  actionPolicySource: typeof AI_SCREEN_LOCAL_ACTION_POLICY_SOURCE | null;
  availableActionIds: readonly string[];
  availableIntents: readonly string[];
  fallbackUsed: false;
  runtimeIntentFallbackAllowed: false;
  reason: string;
};

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeInput(value: string | null | undefined): string | null {
  return hasText(value) ? value.trim() : null;
}

export function resolveAiScreenLocalActionSourcePolicy(params: {
  auth: AiScreenActionResolverAuth | null;
  screenId: string;
  actionId?: string | null;
  intent?: string | null;
}): AiScreenLocalActionSourceDecision {
  const screenId = normalizeAiScreenLocalAssistantScreenId(params.screenId);
  const map = resolveAiScreenActions({
    auth: params.auth,
    screenId,
  });
  const availableActionIds = map.visibleActions.map((action) => action.actionId);
  const availableIntents = map.visibleActions.map((action) => action.intent);
  const base = {
    screenId,
    role: map.role,
    availableActionIds,
    availableIntents,
    fallbackUsed: false,
    runtimeIntentFallbackAllowed: false,
  } as const;

  if (map.status !== "ready") {
    return {
      ...base,
      status: "blocked",
      action: null,
      actionPolicySource: null,
      reason: map.blocker ?? "Screen-local action source policy requires a ready screen-action map.",
    };
  }

  const actionId = normalizeInput(params.actionId);
  const intent = normalizeInput(params.intent);
  const action = actionId
    ? map.visibleActions.find((candidate) => candidate.actionId === actionId)
    : intent
      ? map.visibleActions.find((candidate) => candidate.intent === intent)
      : null;

  if (!action) {
    return {
      ...base,
      status: "blocked",
      action: null,
      actionPolicySource: AI_SCREEN_LOCAL_ACTION_POLICY_SOURCE,
      reason: "Screen-local assistant action planning requires an explicit audited screen-action registry entry.",
    };
  }

  return {
    ...base,
    status: "resolved",
    action,
    actionPolicySource: AI_SCREEN_LOCAL_ACTION_POLICY_SOURCE,
    reason: "Screen-local assistant action source resolved from the audited screen-action registry.",
  };
}

export function buildAiScreenLocalActionSourcePolicyMatrix(): {
  final_status: "GREEN_AI_SCREEN_LOCAL_ACTION_SOURCE_POLICY_READY" | "BLOCKED_AI_SCREEN_LOCAL_ACTION_MAP_MISSING";
  required_screen_count: number;
  local_profile_count: number;
  missing_action_map_screens: readonly string[];
  all_screen_local_profiles_have_action_map: boolean;
  action_policy_source: typeof AI_SCREEN_LOCAL_ACTION_POLICY_SOURCE;
  runtime_intent_fallback_allowed: false;
  fallback_used: false;
} {
  const requiredScreens = [...AI_SCREEN_LOCAL_ASSISTANT_REQUIRED_SCREEN_IDS];
  const profileScreens = listAiScreenLocalAssistantProfiles().map((profile) => profile.screenId);
  const uniqueScreens = [...new Set([...requiredScreens, ...profileScreens])];
  const missingActionMapScreens = uniqueScreens.filter((screenId) => !getAiScreenActionEntry(screenId));
  const allScreenLocalProfilesHaveActionMap = missingActionMapScreens.length === 0;

  return {
    final_status: allScreenLocalProfilesHaveActionMap
      ? "GREEN_AI_SCREEN_LOCAL_ACTION_SOURCE_POLICY_READY"
      : "BLOCKED_AI_SCREEN_LOCAL_ACTION_MAP_MISSING",
    required_screen_count: requiredScreens.length,
    local_profile_count: profileScreens.length,
    missing_action_map_screens: missingActionMapScreens,
    all_screen_local_profiles_have_action_map: allScreenLocalProfilesHaveActionMap,
    action_policy_source: AI_SCREEN_LOCAL_ACTION_POLICY_SOURCE,
    runtime_intent_fallback_allowed: false,
    fallback_used: false,
  };
}
