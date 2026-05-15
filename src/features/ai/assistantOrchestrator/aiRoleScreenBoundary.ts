import { hasDirectorFullAiAccess, type AiUserRole } from "../policy/aiRolePolicy";
import { getAiScreenActionEntry } from "../screenActions/aiScreenActionRegistry";
import { getAiScreenRuntimeEntry } from "../screenRuntime/aiScreenRuntimeRegistry";
import type {
  AiRoleScreenBoundaryResult,
  AiScreenLocalAssistantAuth,
} from "./aiScreenLocalAssistantTypes";

const SCREEN_ALIASES: Record<string, string> = {
  "ai.command.center": "ai.command_center",
  "documents.surface": "documents.main",
};

const RUNTIME_SCREEN_ALIASES: Record<string, string> = {
  "ai.command_center": "ai.command.center",
  "documents.main": "documents.surface",
};

export function normalizeAiScreenLocalAssistantScreenId(screenId: string): string {
  const normalized = String(screenId || "").trim();
  return SCREEN_ALIASES[normalized] ?? normalized;
}

export function normalizeAiScreenLocalAssistantRuntimeScreenId(screenId: string): string {
  const normalized = normalizeAiScreenLocalAssistantScreenId(screenId);
  return RUNTIME_SCREEN_ALIASES[normalized] ?? normalized;
}

function roleCanAccessScreen(role: AiUserRole, screenId: string): boolean {
  if (role === "unknown") return false;
  if (hasDirectorFullAiAccess(role)) return true;

  const actionEntry = getAiScreenActionEntry(screenId);
  if (actionEntry?.allowedRoles.includes(role)) return true;

  const runtimeEntry = getAiScreenRuntimeEntry(normalizeAiScreenLocalAssistantRuntimeScreenId(screenId));
  return runtimeEntry?.allowedRoles.includes(role) ?? false;
}

function screenKnown(screenId: string): boolean {
  return (
    Boolean(getAiScreenActionEntry(screenId)) ||
    Boolean(getAiScreenRuntimeEntry(normalizeAiScreenLocalAssistantRuntimeScreenId(screenId)))
  );
}

function boundaryResult(params: {
  status: AiRoleScreenBoundaryResult["status"];
  decision: AiRoleScreenBoundaryResult["decision"];
  screenId: string;
  normalizedScreenId: string;
  role: AiUserRole;
  targetScreenId: string | null;
  normalizedTargetScreenId: string | null;
  directorControlMayHandoff: boolean;
  reason: string;
}): AiRoleScreenBoundaryResult {
  return {
    status: params.status,
    decision: params.decision,
    screenId: params.screenId,
    normalizedScreenId: params.normalizedScreenId,
    role: params.role,
    targetScreenId: params.targetScreenId,
    normalizedTargetScreenId: params.normalizedTargetScreenId,
    sameScreenOnly: true,
    directorControlMayHandoff: params.directorControlMayHandoff,
    actionMayExecuteHere: false,
    reason: params.reason,
    mutationCount: 0,
    providerCalled: false,
    dbAccessedDirectly: false,
  };
}

export function resolveAiRoleScreenBoundary(params: {
  auth: AiScreenLocalAssistantAuth | null;
  screenId: string;
  targetScreenId?: string | null;
}): AiRoleScreenBoundaryResult {
  const normalizedScreenId = normalizeAiScreenLocalAssistantScreenId(params.screenId);
  const normalizedTargetScreenId =
    params.targetScreenId && params.targetScreenId.trim().length > 0
      ? normalizeAiScreenLocalAssistantScreenId(params.targetScreenId)
      : null;
  const role = params.auth?.role ?? "unknown";
  const directorControlMayHandoff = hasDirectorFullAiAccess(role);

  if (!params.auth || !params.auth.userId.trim() || role === "unknown") {
    return boundaryResult({
      status: "blocked",
      decision: "AUTH_REQUIRED",
      screenId: params.screenId,
      normalizedScreenId,
      role,
      targetScreenId: params.targetScreenId ?? null,
      normalizedTargetScreenId,
      directorControlMayHandoff,
      reason: "Screen-local assistant requires authenticated role context.",
    });
  }

  if (!screenKnown(normalizedScreenId)) {
    return boundaryResult({
      status: "blocked",
      decision: "SCREEN_NOT_REGISTERED",
      screenId: params.screenId,
      normalizedScreenId,
      role,
      targetScreenId: params.targetScreenId ?? null,
      normalizedTargetScreenId,
      directorControlMayHandoff,
      reason: "Screen-local assistant screenId is not registered.",
    });
  }

  if (!roleCanAccessScreen(role, normalizedScreenId)) {
    return boundaryResult({
      status: "blocked",
      decision: "ROLE_SCREEN_FORBIDDEN",
      screenId: params.screenId,
      normalizedScreenId,
      role,
      targetScreenId: params.targetScreenId ?? null,
      normalizedTargetScreenId,
      directorControlMayHandoff,
      reason: "Role cannot use the assistant for this screen.",
    });
  }

  if (normalizedTargetScreenId && normalizedTargetScreenId !== normalizedScreenId) {
    if (directorControlMayHandoff) {
      return boundaryResult({
        status: "handoff_plan_only",
        decision: "HANDOFF_PLAN_ONLY",
        screenId: params.screenId,
        normalizedScreenId,
        role,
        targetScreenId: params.targetScreenId ?? null,
        normalizedTargetScreenId,
        directorControlMayHandoff,
        reason: "Director/control cross-screen requests are limited to a handoff plan.",
      });
    }

    return boundaryResult({
      status: "blocked",
      decision: "FORBIDDEN_CROSS_SCREEN_ACTION",
      screenId: params.screenId,
      normalizedScreenId,
      role,
      targetScreenId: params.targetScreenId ?? null,
      normalizedTargetScreenId,
      directorControlMayHandoff,
      reason: "Non-director screen-local assistant cannot act across screens.",
    });
  }

  return boundaryResult({
    status: "allowed",
    decision: "SAME_SCREEN_ALLOWED",
    screenId: params.screenId,
    normalizedScreenId,
    role,
    targetScreenId: params.targetScreenId ?? null,
    normalizedTargetScreenId,
    directorControlMayHandoff,
    reason: "Screen-local assistant request is constrained to the current screen.",
  });
}
