export type OfficeRuntimeRole = "foreman" | "director" | "buyer" | "admin";
export type OfficeRouteRole = Exclude<OfficeRuntimeRole, "admin">;

export type OfficeRuntimeContext = {
  userId: string;
  role: OfficeRuntimeRole;
  projectId?: string;
  permissions: string[];
  authReady: boolean;
};

export type OfficeDeveloperOverrideLike = {
  actorUserId?: string | null;
  isEnabled: boolean;
  isActive: boolean;
  allowedRoles: string[];
  activeEffectiveRole: string | null;
  canAccessAllOfficeRoutes: boolean;
  canImpersonateForMutations?: boolean;
  expiresAt?: string | null;
  reason?: string | null;
};

const OFFICE_RUNTIME_PERMISSION_MAP: Record<OfficeRuntimeRole, readonly string[]> = {
  foreman: [
    "office:foreman:read",
    "office:request:draft",
    "office:request:submit",
  ],
  director: [
    "office:director:read",
    "office:request:approve",
    "office:request:reject",
    "office:proposal:approve",
  ],
  buyer: [
    "office:buyer:read",
    "office:procurement:read",
    "office:procurement:create",
    "office:proposal:submit",
  ],
  admin: [
    "office:foreman:read",
    "office:request:draft",
    "office:request:submit",
    "office:director:read",
    "office:request:approve",
    "office:request:reject",
    "office:proposal:approve",
    "office:buyer:read",
    "office:procurement:read",
    "office:procurement:create",
    "office:proposal:submit",
  ],
};

const OFFICE_ROUTE_PERMISSION: Record<OfficeRouteRole, string> = {
  foreman: "office:foreman:read",
  director: "office:director:read",
  buyer: "office:buyer:read",
};

const normalizeText = (value: unknown): string => String(value ?? "").trim();

export function normalizeOfficeRuntimeRole(
  value: unknown,
): OfficeRuntimeRole | null {
  const normalized = normalizeText(value).toLowerCase();
  if (
    normalized === "foreman" ||
    normalized === "director" ||
    normalized === "buyer" ||
    normalized === "admin"
  ) {
    return normalized;
  }
  return null;
}

export function buildOfficeRuntimeContext(params: {
  userId: string;
  role: OfficeRuntimeRole;
  projectId?: string | null;
}): OfficeRuntimeContext {
  return {
    userId: normalizeText(params.userId),
    role: params.role,
    projectId: normalizeText(params.projectId) || undefined,
    permissions: [...OFFICE_RUNTIME_PERMISSION_MAP[params.role]],
    authReady: true,
  };
}

export function hasOfficeRuntimePermission(
  context: OfficeRuntimeContext | null | undefined,
  permission: string,
): boolean {
  return context?.authReady === true && context.permissions.includes(permission);
}

export function canUseOfficeRoute(params: {
  context: OfficeRuntimeContext | null | undefined;
  requiredRole: OfficeRouteRole;
}): boolean {
  const { context, requiredRole } = params;
  if (!context?.authReady) return false;
  if (context.role !== requiredRole && context.role !== "admin") return false;
  return hasOfficeRuntimePermission(context, OFFICE_ROUTE_PERMISSION[requiredRole]);
}

export function resolveOfficeRuntimeRoleFromSources(params: {
  requiredRole: OfficeRouteRole;
  sessionRole?: string | null;
  developerOverride?: OfficeDeveloperOverrideLike | null;
}): OfficeRuntimeRole | null {
  const requiredRole = params.requiredRole;
  const override = params.developerOverride ?? null;
  const allowedOverrideRoles = new Set(
    (override?.allowedRoles ?? [])
      .map((role) => normalizeOfficeRuntimeRole(role))
      .filter((role): role is OfficeRuntimeRole => Boolean(role)),
  );
  const overrideActiveRole = normalizeOfficeRuntimeRole(
    override?.activeEffectiveRole,
  );
  const overrideCanUseRoute =
    override?.isEnabled === true &&
    override.isActive === true &&
    override.canAccessAllOfficeRoutes === true &&
    allowedOverrideRoles.has(requiredRole);

  if (overrideCanUseRoute) {
    if (overrideActiveRole === "admin") return "admin";
    return requiredRole;
  }

  return normalizeOfficeRuntimeRole(params.sessionRole);
}
