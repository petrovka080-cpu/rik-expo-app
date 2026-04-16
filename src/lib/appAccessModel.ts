export type AppContext = "market" | "office";

export type AppAccessOfficeRole =
  | "director"
  | "buyer"
  | "foreman"
  | "warehouse"
  | "accountant"
  | "security"
  | "contractor"
  | "engineer";

export type AppAccessMembershipSnapshot = {
  companyId: string | null;
  role: string | null;
};

export type AppAccessSourceSnapshot = {
  userId: string | null;
  authRole: string | null;
  resolvedRole: string | null;
  usageMarket: boolean;
  usageBuild: boolean;
  ownedCompanyId: string | null;
  companyMemberships: AppAccessMembershipSnapshot[];
  listingsCount: number;
  marketAccessGranted?: boolean | null;
  requestedActiveContext?: AppContext | null;
};

export type AppAccessSourceMap = {
  identity: {
    userId: string | null;
    authRole: string | null;
    resolvedRole: string | null;
  };
  accessSources: {
    usageMarket: boolean;
    usageBuild: boolean;
    ownedCompanyId: string | null;
    membershipCompanyIds: string[];
    membershipRoles: string[];
    listingsCount: number;
    implicitMarketAccess: boolean;
  };
  duplicatedTruths: string[];
  fakeModeSources: string[];
};

export type AppAccessModel = {
  userId: string | null;
  hasMarketAccess: boolean;
  hasOfficeAccess: boolean;
  hasCompanyContext: boolean;
  hasSellerCapability: boolean;
  availableContexts: AppContext[];
  activeContext: AppContext;
  availableOfficeRoles: string[];
  activeOfficeRole: string | null;
};

const OFFICE_ROLE_VALUES: readonly AppAccessOfficeRole[] = [
  "director",
  "buyer",
  "foreman",
  "warehouse",
  "accountant",
  "security",
  "contractor",
  "engineer",
];

const OFFICE_ROLE_SET = new Set<string>(OFFICE_ROLE_VALUES);

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const normalizeRole = (value: unknown): string | null => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized || null;
};

const normalizeContext = (value: unknown): AppContext | null => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "market" || normalized === "office") return normalized;
  return null;
};

const uniqueStrings = (values: (string | null | undefined)[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });
  return out;
};

export function isOfficeRole(value: unknown): value is AppAccessOfficeRole {
  const normalized = normalizeRole(value);
  return normalized != null && OFFICE_ROLE_SET.has(normalized);
}

export function buildAppAccessSourceMap(
  snapshot: AppAccessSourceSnapshot,
): AppAccessSourceMap {
  const authRole = normalizeRole(snapshot.authRole);
  const resolvedRole = normalizeRole(snapshot.resolvedRole);
  const membershipRoles = uniqueStrings(snapshot.companyMemberships.map((item) => item.role));
  const membershipCompanyIds = uniqueStrings(snapshot.companyMemberships.map((item) => item.companyId));
  const duplicatedTruths: string[] = [];

  if (authRole && resolvedRole) duplicatedTruths.push("auth_metadata_role + rpc_role");
  if (snapshot.ownedCompanyId && membershipCompanyIds.length > 0) {
    duplicatedTruths.push("company_ownership + company_membership");
  }
  if (snapshot.usageMarket || snapshot.usageBuild) {
    duplicatedTruths.push("usage_flags_as_access_proxy");
  }
  if (snapshot.listingsCount > 0 && snapshot.usageMarket) {
    duplicatedTruths.push("seller_capability_from_usage_flag_and_market_activity");
  }

  return {
    identity: {
      userId: normalizeText(snapshot.userId) || null,
      authRole,
      resolvedRole,
    },
    accessSources: {
      usageMarket: snapshot.usageMarket === true,
      usageBuild: snapshot.usageBuild === true,
      ownedCompanyId: normalizeText(snapshot.ownedCompanyId) || null,
      membershipCompanyIds,
      membershipRoles,
      listingsCount: Number.isFinite(snapshot.listingsCount) ? Math.max(0, snapshot.listingsCount) : 0,
      implicitMarketAccess:
        typeof snapshot.marketAccessGranted === "boolean"
          ? snapshot.marketAccessGranted
          : Boolean(normalizeText(snapshot.userId)),
    },
    duplicatedTruths,
    fakeModeSources: [
      "usage_market",
      "usage_build",
      "company_presence",
      "single_profile_role",
      "route_implicit_context",
    ],
  };
}

export function buildAppAccessModel(
  snapshot: AppAccessSourceSnapshot,
): AppAccessModel {
  const sourceMap = buildAppAccessSourceMap(snapshot);
  const resolvedRole = normalizeRole(snapshot.resolvedRole);
  const authRole = normalizeRole(snapshot.authRole);
  const membershipOfficeRoles = uniqueStrings(
    snapshot.companyMemberships
      .map((item) => normalizeRole(item.role))
      .filter((role): role is string => role != null && isOfficeRole(role)),
  );
  const availableOfficeRoles = uniqueStrings([
    ...membershipOfficeRoles,
    isOfficeRole(resolvedRole) ? resolvedRole : null,
    isOfficeRole(authRole) ? authRole : null,
  ]);
  const activeOfficeRole =
    membershipOfficeRoles[0] ??
    (isOfficeRole(resolvedRole) ? resolvedRole : null) ??
    (isOfficeRole(authRole) ? authRole : null) ??
    availableOfficeRoles[0] ??
    null;
  const hasCompanyContext =
    Boolean(sourceMap.accessSources.ownedCompanyId) || sourceMap.accessSources.membershipCompanyIds.length > 0;
  const hasSellerCapability = snapshot.usageMarket === true || sourceMap.accessSources.listingsCount > 0;
  const hasOfficeAccess = snapshot.usageBuild === true || availableOfficeRoles.length > 0;
  const hasMarketAccess =
    typeof snapshot.marketAccessGranted === "boolean"
      ? snapshot.marketAccessGranted
      : Boolean(normalizeText(snapshot.userId));
  const availableContexts: AppContext[] = [];

  if (hasMarketAccess) availableContexts.push("market");
  if (hasOfficeAccess) availableContexts.push("office");

  const requestedActiveContext = normalizeContext(snapshot.requestedActiveContext);
  const activeContext =
    requestedActiveContext && availableContexts.includes(requestedActiveContext)
      ? requestedActiveContext
      : availableContexts.includes("market")
        ? "market"
        : availableContexts.includes("office")
          ? "office"
          : "market";

  return {
    userId: sourceMap.identity.userId,
    hasMarketAccess,
    hasOfficeAccess,
    hasCompanyContext,
    hasSellerCapability,
    availableContexts,
    activeContext,
    availableOfficeRoles,
    activeOfficeRole,
  };
}
