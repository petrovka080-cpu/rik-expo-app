import { supabase } from "./supabaseClient";

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
  return normalizeDeveloperOverrideContext(data);
}

export async function setDeveloperEffectiveRole(
  role: DeveloperOverrideRole,
): Promise<DeveloperOverrideContext> {
  const { data, error } = await (supabase as any).rpc("developer_set_effective_role_v1", {
    p_effective_role: role,
  });
  if (error) throw error;
  return normalizeDeveloperOverrideContext(data);
}

export async function clearDeveloperEffectiveRole(): Promise<DeveloperOverrideContext> {
  const { data, error } = await (supabase as any).rpc("developer_clear_effective_role_v1");
  if (error) throw error;
  return normalizeDeveloperOverrideContext(data);
}
