import { supabase } from "./supabaseClient";
import {
  isRpcBoolean,
  isRpcRecord,
  isRpcRecordArray,
  isRpcString,
  validateRpcResponse,
} from "./api/queryBoundary";

export const DEVELOPER_OVERRIDE_ROLES = [
  "buyer",
  "director",
  "warehouse",
  "accountant",
  "foreman",
  "contractor",
] as const;

export type DeveloperOverrideRole = (typeof DEVELOPER_OVERRIDE_ROLES)[number];

export type DeveloperOverrideContext = {
  actorUserId: string | null;
  isEnabled: boolean;
  isActive: boolean;
  allowedRoles: string[];
  activeEffectiveRole: string | null;
  canAccessAllOfficeRoutes: boolean;
  canImpersonateForMutations: boolean;
  expiresAt: string | null;
  reason: string | null;
};

const EMPTY_CONTEXT: DeveloperOverrideContext = {
  actorUserId: null,
  isEnabled: false,
  isActive: false,
  allowedRoles: [],
  activeEffectiveRole: null,
  canAccessAllOfficeRoutes: false,
  canImpersonateForMutations: false,
  expiresAt: null,
  reason: null,
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeRole = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
};

const normalizeBool = (value: unknown): boolean => value === true;

export const isDeveloperOverrideContextRpcResponse = (
  value: unknown,
): value is Record<string, unknown> =>
  isRpcRecord(value) &&
  (value.actorUserId == null || isRpcString(value.actorUserId)) &&
  isRpcBoolean(value.isEnabled) &&
  isRpcBoolean(value.isActive) &&
  Array.isArray(value.allowedRoles) &&
  value.allowedRoles.every((role) => role == null || isRpcString(role)) &&
  (value.activeEffectiveRole == null || isRpcString(value.activeEffectiveRole)) &&
  isRpcBoolean(value.canAccessAllOfficeRoutes) &&
  isRpcBoolean(value.canImpersonateForMutations) &&
  (value.expiresAt == null || isRpcString(value.expiresAt)) &&
  (value.reason == null || isRpcString(value.reason)) &&
  !isRpcRecordArray(value);

export function normalizeDeveloperOverrideContext(
  value: unknown,
): DeveloperOverrideContext {
  const row = asRecord(value);
  if (!row) return EMPTY_CONTEXT;

  const allowedRoles = Array.isArray(row.allowedRoles)
    ? row.allowedRoles.map(normalizeRole).filter((role): role is string => Boolean(role))
    : [];
  const activeEffectiveRole = normalizeRole(row.activeEffectiveRole);

  return {
    actorUserId: String(row.actorUserId ?? "").trim() || null,
    isEnabled: normalizeBool(row.isEnabled),
    isActive: normalizeBool(row.isActive),
    allowedRoles,
    activeEffectiveRole,
    canAccessAllOfficeRoutes: normalizeBool(row.canAccessAllOfficeRoutes),
    canImpersonateForMutations: normalizeBool(row.canImpersonateForMutations),
    expiresAt: String(row.expiresAt ?? "").trim() || null,
    reason: String(row.reason ?? "").trim() || null,
  };
}

export async function loadDeveloperOverrideContext(): Promise<DeveloperOverrideContext> {
  const { data, error } = await (supabase as any).rpc("developer_override_context_v1");
  if (error) {
    if (__DEV__) console.warn("[developer_override_context_v1]", error.message);
    return EMPTY_CONTEXT;
  }
  try {
    const validated = validateRpcResponse(data, isDeveloperOverrideContextRpcResponse, {
      rpcName: "developer_override_context_v1",
      caller: "src/lib/developerOverride.loadDeveloperOverrideContext",
      domain: "unknown",
    });
    return normalizeDeveloperOverrideContext(validated);
  } catch (validationError) {
    if (__DEV__) {
      console.warn(
        "[developer_override_context_v1]",
        validationError instanceof Error ? validationError.message : String(validationError),
      );
    }
    return EMPTY_CONTEXT;
  }
}

export async function setDeveloperEffectiveRole(
  role: DeveloperOverrideRole,
): Promise<DeveloperOverrideContext> {
  const { data, error } = await (supabase as any).rpc("developer_set_effective_role_v1", {
    p_effective_role: role,
  });
  if (error) throw error;
  const validated = validateRpcResponse(data, isDeveloperOverrideContextRpcResponse, {
    rpcName: "developer_set_effective_role_v1",
    caller: "src/lib/developerOverride.setDeveloperEffectiveRole",
    domain: "unknown",
  });
  return normalizeDeveloperOverrideContext(validated);
}

export async function clearDeveloperEffectiveRole(): Promise<DeveloperOverrideContext> {
  const { data, error } = await (supabase as any).rpc("developer_clear_effective_role_v1");
  if (error) throw error;
  const validated = validateRpcResponse(data, isDeveloperOverrideContextRpcResponse, {
    rpcName: "developer_clear_effective_role_v1",
    caller: "src/lib/developerOverride.clearDeveloperEffectiveRole",
    domain: "unknown",
  });
  return normalizeDeveloperOverrideContext(validated);
}
