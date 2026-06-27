export type OfficeRuntimeRole =
  | "foreman"
  | "director"
  | "buyer"
  | "warehouse"
  | "accountant"
  | "contractor"
  | "security"
  | "engineer"
  | "admin";
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
    "office:foreman:read",
    "office:buyer:read",
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
  warehouse: [
    "office:warehouse:read",
    "office:stock:read",
    "office:stock:issue",
  ],
  accountant: [
    "office:accountant:read",
    "office:finance:read",
    "office:payment:review",
  ],
  contractor: [
    "office:contractor:read",
    "office:contractor:works:read",
    "office:contractor:proposal:submit",
  ],
  security: [
    "office:security:read",
  ],
  engineer: [
    "office:engineer:read",
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
    "office:warehouse:read",
    "office:stock:read",
    "office:stock:issue",
    "office:accountant:read",
    "office:finance:read",
    "office:payment:review",
    "office:contractor:read",
    "office:contractor:works:read",
    "office:contractor:proposal:submit",
    "office:security:read",
    "office:engineer:read",
  ],
};

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const isFutureOrOpenEndedExpiry = (value: unknown): boolean => {
  const raw = normalizeText(value);
  if (!raw) return true;
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) && timestamp > Date.now();
};

export function normalizeOfficeRuntimeRole(
  value: unknown,
): OfficeRuntimeRole | null {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "admin" || normalized === "administrator" || normalized === "админ") return "admin";
  if (normalized === "director" || normalized === "owner" || normalized === "директор") return "director";
  if (normalized === "foreman" || normalized === "prorab" || normalized === "прораб") return "foreman";
  if (
    normalized === "buyer" ||
    normalized === "procurement" ||
    normalized === "supply" ||
    normalized === "снабженец" ||
    normalized === "снабжение" ||
    normalized === "закупщик"
  ) {
    return "buyer";
  }
  if (
    normalized === "warehouse" ||
    normalized === "stock" ||
    normalized === "storekeeper" ||
    normalized === "кладовщик" ||
    normalized === "склад"
  ) {
    return "warehouse";
  }
  if (
    normalized === "accountant" ||
    normalized === "accounting" ||
    normalized === "finance" ||
    normalized === "бухгалтер" ||
    normalized === "бухгалтерия"
  ) {
    return "accountant";
  }
  if (
    normalized === "contractor" ||
    normalized === "subcontractor" ||
    normalized === "подрядчик" ||
    normalized === "подряд"
  ) {
    return "contractor";
  }
  if (
    normalized === "security" ||
    normalized === "guard" ||
    normalized === "охрана" ||
    normalized === "безопасность"
  ) {
    return "security";
  }
  if (
    normalized === "engineer" ||
    normalized === "technical" ||
    normalized === "инженер" ||
    normalized === "технадзор"
  ) {
    return "engineer";
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
  if (context.role === "admin") return true;
  return context.role === requiredRole;
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
    override.canAccessAllOfficeRoutes === true &&
    isFutureOrOpenEndedExpiry(override.expiresAt) &&
    allowedOverrideRoles.has(requiredRole);

  if (overrideCanUseRoute) {
    if (overrideActiveRole === "admin") return "admin";
    return requiredRole;
  }

  return normalizeOfficeRuntimeRole(params.sessionRole);
}
