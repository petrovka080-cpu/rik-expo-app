import { Platform } from "react-native";

import { supabase } from "./supabaseClient";
import {
  isRpcBoolean,
  isRpcRecord,
  isRpcRecordArray,
  isRpcString,
  runContainedRpc,
  validateRpcResponse,
} from "./api/queryBoundary";
import { OFFICE_DEVELOPER_FULL_ACCESS_ROLES } from "./officeRuntime/officeRuntimePolicy";
import {
  LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY,
} from "./developerOverride.constants";
import {
  isLocalDeveloperFullAccessAllowed as evaluateLocalDeveloperFullAccess,
  type LocalDeveloperFullAccessProbe,
} from "./developerOverridePolicy";

export const DEVELOPER_OVERRIDE_ROLES = [
  ...OFFICE_DEVELOPER_FULL_ACCESS_ROLES,
  "estimator",
] as const;
export const PLATFORM_DEVELOPER_ENTITLEMENT = "platform_developer" as const;
export { LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY };

export type DeveloperOverrideRole = (typeof DEVELOPER_OVERRIDE_ROLES)[number];

export type DeveloperOverrideContext = {
  actorUserId: string | null;
  actorRole: typeof PLATFORM_DEVELOPER_ENTITLEMENT | null;
  entitlement: typeof PLATFORM_DEVELOPER_ENTITLEMENT | null;
  authorizationSource:
    | "server_entitlement"
    | "local_ui_only"
    | "none";
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
  actorRole: null,
  entitlement: null,
  authorizationSource: "none",
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

function readNativeUpdateChannel(): string | null {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const updates = require("expo-updates") as {
      channel?: unknown;
      releaseChannel?: unknown;
    };
    return (
      String(updates.channel ?? "").trim() ||
      String(updates.releaseChannel ?? "").trim() ||
      null
    );
  } catch {
    return null;
  }
}

function readLocalDeveloperFullAccessProbe(): LocalDeveloperFullAccessProbe {
  const host =
    typeof window !== "undefined" && window.location
      ? window.location.hostname
      : null;
  const storageValue =
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage.getItem(LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY)
      : null;
  const webdriver =
    typeof navigator !== "undefined" && "webdriver" in navigator
      ? Boolean(navigator.webdriver)
      : null;

  return {
    envValue: process.env.EXPO_PUBLIC_OFFICE_LOCAL_DEVELOPER_FULL_ACCESS,
    host,
    isDev: typeof __DEV__ === "boolean" ? __DEV__ : false,
    isTestRuntime: process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID),
    platformOS: Platform.OS,
    releaseChannel:
      process.env.EXPO_PUBLIC_RELEASE_CHANNEL ||
      process.env.EXPO_PUBLIC_APP_ENV ||
      process.env.EXPO_PUBLIC_ENVIRONMENT ||
      readNativeUpdateChannel(),
    storageValue,
    webdriver,
  };
}

export function isLocalDeveloperFullAccessAllowed(
  probe: LocalDeveloperFullAccessProbe = readLocalDeveloperFullAccessProbe(),
): boolean {
  return evaluateLocalDeveloperFullAccess(probe);
}

export function resolveLocalDeveloperOverrideContext(
  _probe?: LocalDeveloperFullAccessProbe,
): DeveloperOverrideContext | null {
  // R5.5.1: local env/localStorage flags are presentation signals only.
  // Authorization comes exclusively from developer_override_context_v1 for
  // a provider-issued principal in the dedicated local test tenant.
  return null;
}

export const isDeveloperOverrideContextRpcResponse = (
  value: unknown,
): value is Record<string, unknown> =>
  isRpcRecord(value) &&
  (value.actorUserId == null || isRpcString(value.actorUserId)) &&
  (value.actorRole == null || isRpcString(value.actorRole)) &&
  (value.entitlement == null || isRpcString(value.entitlement)) &&
  (value.authorizationSource == null || isRpcString(value.authorizationSource)) &&
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
  const actorUserId = String(row.actorUserId ?? "").trim() || null;
  const explicitEntitlement =
    normalizeRole(row.entitlement) === PLATFORM_DEVELOPER_ENTITLEMENT;
  const explicitActorRole =
    normalizeRole(row.actorRole) === PLATFORM_DEVELOPER_ENTITLEMENT;
  const serverAuthorized =
    Boolean(actorUserId) &&
    explicitEntitlement &&
    explicitActorRole &&
    normalizeRole(row.authorizationSource) === "server_entitlement";
  const authorizationSource =
    serverAuthorized
      ? "server_entitlement"
      : normalizeRole(row.authorizationSource) === "local_ui_only"
        ? "local_ui_only"
        : "none";

  return {
    actorUserId,
    actorRole: serverAuthorized ? PLATFORM_DEVELOPER_ENTITLEMENT : null,
    entitlement: serverAuthorized ? PLATFORM_DEVELOPER_ENTITLEMENT : null,
    authorizationSource,
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
  const { data, error } = await runContainedRpc<unknown>(
    supabase,
    "developer_override_context_v1",
  );
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
    const serverContext = normalizeDeveloperOverrideContext(validated);
    return isServerAuthorizedPlatformDeveloper(serverContext)
      ? serverContext
      : EMPTY_CONTEXT;
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

export function isServerAuthorizedPlatformDeveloper(
  context: DeveloperOverrideContext | null | undefined,
): boolean {
  return (
    Boolean(context?.actorUserId) &&
    context?.actorRole === PLATFORM_DEVELOPER_ENTITLEMENT &&
    context.entitlement === PLATFORM_DEVELOPER_ENTITLEMENT &&
    context.authorizationSource === "server_entitlement" &&
    context.isEnabled === true &&
    context.canAccessAllOfficeRoutes === true
  );
}

export async function setDeveloperEffectiveRole(
  role: DeveloperOverrideRole,
): Promise<DeveloperOverrideContext> {
  if (!DEVELOPER_OVERRIDE_ROLES.includes(role)) {
    throw new Error("DEVELOPER_EFFECTIVE_ROLE_NOT_ALLOWED");
  }
  const { data, error } = await runContainedRpc<unknown>(
    supabase,
    "developer_set_effective_role_v1",
    { p_effective_role: role },
  );
  if (error) throw new Error(error.message);
  const validated = validateRpcResponse(data, isDeveloperOverrideContextRpcResponse, {
    rpcName: "developer_set_effective_role_v1",
    caller: "src/lib/developerOverride.setDeveloperEffectiveRole",
    domain: "unknown",
  });
  const context = normalizeDeveloperOverrideContext(validated);
  if (!isServerAuthorizedPlatformDeveloper(context)) {
    throw new Error("PLATFORM_DEVELOPER_ENTITLEMENT_REQUIRED");
  }
  return context;
}

export async function clearDeveloperEffectiveRole(): Promise<DeveloperOverrideContext> {
  const { data, error } = await runContainedRpc<unknown>(
    supabase,
    "developer_clear_effective_role_v1",
  );
  if (error) throw new Error(error.message);
  const validated = validateRpcResponse(data, isDeveloperOverrideContextRpcResponse, {
    rpcName: "developer_clear_effective_role_v1",
    caller: "src/lib/developerOverride.clearDeveloperEffectiveRole",
    domain: "unknown",
  });
  const context = normalizeDeveloperOverrideContext(validated);
  if (!isServerAuthorizedPlatformDeveloper(context)) {
    throw new Error("PLATFORM_DEVELOPER_ENTITLEMENT_REQUIRED");
  }
  return context;
}
