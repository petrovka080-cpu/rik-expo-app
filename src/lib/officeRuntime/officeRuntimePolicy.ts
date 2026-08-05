export const OFFICE_ACCESS_ROLES = [
  "foreman",
  "director",
  "buyer",
  "warehouse",
  "accountant",
  "contractor",
  "security",
  "engineer",
] as const;

export const OFFICE_ACCESS_ROUTE_ROLES = [
  "foreman",
  "director",
  "buyer",
  "warehouse",
  "accountant",
  "contractor",
  "security",
] as const;

export type OfficeAccessRole = (typeof OFFICE_ACCESS_ROLES)[number];
export type OfficeAccessRouteRole = (typeof OFFICE_ACCESS_ROUTE_ROLES)[number];
export type OfficeAccessRuntimeRole = OfficeAccessRole | "admin";

export type OfficeAccessRouteManifestEntry = {
  role: OfficeAccessRouteRole;
  route: `/office/${string}`;
  routeModule: `app/(tabs)/office/${string}.tsx`;
  screenId: string;
  expectedShellTestId: `office-role-auth-context-${OfficeAccessRouteRole}`;
};

export const OFFICE_ACCESS_ROUTE_MANIFEST: Record<
  OfficeAccessRouteRole,
  OfficeAccessRouteManifestEntry
> = Object.freeze({
  foreman: Object.freeze({
    role: "foreman",
    route: "/office/foreman",
    routeModule: "app/(tabs)/office/foreman.tsx",
    screenId: "office.foreman",
    expectedShellTestId: "office-role-auth-context-foreman",
  }),
  director: Object.freeze({
    role: "director",
    route: "/office/director",
    routeModule: "app/(tabs)/office/director.tsx",
    screenId: "office.director",
    expectedShellTestId: "office-role-auth-context-director",
  }),
  buyer: Object.freeze({
    role: "buyer",
    route: "/office/buyer",
    routeModule: "app/(tabs)/office/buyer.tsx",
    screenId: "office.buyer",
    expectedShellTestId: "office-role-auth-context-buyer",
  }),
  warehouse: Object.freeze({
    role: "warehouse",
    route: "/office/warehouse",
    routeModule: "app/(tabs)/office/warehouse.tsx",
    screenId: "office.warehouse",
    expectedShellTestId: "office-role-auth-context-warehouse",
  }),
  accountant: Object.freeze({
    role: "accountant",
    route: "/office/accountant",
    routeModule: "app/(tabs)/office/accountant.tsx",
    screenId: "office.accountant",
    expectedShellTestId: "office-role-auth-context-accountant",
  }),
  contractor: Object.freeze({
    role: "contractor",
    route: "/office/contractor",
    routeModule: "app/(tabs)/office/contractor.tsx",
    screenId: "office.contractor",
    expectedShellTestId: "office-role-auth-context-contractor",
  }),
  security: Object.freeze({
    role: "security",
    route: "/office/security",
    routeModule: "app/(tabs)/office/security.tsx",
    screenId: "office.security",
    expectedShellTestId: "office-role-auth-context-security",
  }),
});

export const OFFICE_DEVELOPER_FULL_ACCESS_ROLES = OFFICE_ACCESS_ROLES;

export const OFFICE_DEVELOPER_FULL_ACCESS_MANIFEST = Object.freeze({
  mode: "developer_control_full_access",
  canAccessAllOfficeRoutes: true,
  roles: OFFICE_ACCESS_ROLES,
  routeRoles: OFFICE_ACCESS_ROUTE_ROLES,
  roleIsolationClaimed: false,
  mutationImpersonationAllowed: false,
});

export function isOfficeAccessRouteRole(value: unknown): value is OfficeAccessRouteRole {
  return OFFICE_ACCESS_ROUTE_ROLES.includes(value as OfficeAccessRouteRole);
}

export function isOfficeAccessRole(value: unknown): value is OfficeAccessRole {
  return OFFICE_ACCESS_ROLES.includes(value as OfficeAccessRole);
}

export type OfficeRuntimeRole = OfficeAccessRuntimeRole;
export type OfficeRouteRole = OfficeAccessRouteRole;

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
