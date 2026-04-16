const trimText = (value: unknown) => String(value ?? "").trim();

const normalizeRole = (value: unknown) => {
  const normalized = trimText(value).toLowerCase();
  return normalized || null;
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export type CanonicalPdfRole = "director" | "foreman" | "warehouse";
export type CanonicalPdfRoleAccessSource =
  | "app_metadata"
  | "rpc"
  | "company_members"
  | "none";

export type CanonicalPdfRoleAccessResolution = {
  allowed: boolean;
  source: CanonicalPdfRoleAccessSource;
  expectedRole: CanonicalPdfRole;
  appMetadataRole: string | null;
  rpcRole: string | null;
  companyMemberRoles: string[];
};

export type CompanyMembershipRow = {
  companyId: string;
  role: string;
};

export type PdfAccessPolicyReason =
  | "request_not_found"
  | "request_missing_company_context"
  | "membership_role_forbidden"
  | "owner_mismatch"
  | "allowed_director_same_company"
  | "allowed_foreman_owner"
  | "allowed_warehouse_same_company";

export type PdfAccessPolicyDecision = {
  allowed: boolean;
  reason: PdfAccessPolicyReason;
  companyId: string | null;
  membershipFound: boolean;
  membershipCompanyIds: string[];
  membershipRoles: string[];
  isDirector: boolean;
  ownerCheckApplied: boolean;
};

// Supabase signs app_metadata into the JWT; user_metadata must not be trusted.
export function readCanonicalPdfSignedAppRole(
  user: { app_metadata?: unknown } | null | undefined,
) {
  const appMetadata = asObject(user?.app_metadata);
  return normalizeRole(appMetadata?.role);
}

export function resolveCanonicalPdfRoleAccess(args: {
  user?: { app_metadata?: unknown } | null;
  rpcRole?: unknown;
  companyMemberRoles?: unknown;
  expectedRole: CanonicalPdfRole;
}): CanonicalPdfRoleAccessResolution {
  const appMetadataRole = readCanonicalPdfSignedAppRole(args.user);
  const rpcRole = normalizeRole(args.rpcRole);
  const companyMemberRoles = Array.isArray(args.companyMemberRoles)
    ? args.companyMemberRoles
        .map((value) => normalizeRole(value))
        .filter((value): value is string => value != null)
    : [];

  if (companyMemberRoles.includes(args.expectedRole)) {
    return {
      allowed: true,
      source: "company_members",
      expectedRole: args.expectedRole,
      appMetadataRole,
      rpcRole,
      companyMemberRoles,
    };
  }

  if (appMetadataRole === args.expectedRole) {
    return {
      allowed: true,
      source: "app_metadata",
      expectedRole: args.expectedRole,
      appMetadataRole,
      rpcRole,
      companyMemberRoles,
    };
  }

  if (rpcRole === args.expectedRole) {
    return {
      allowed: true,
      source: "rpc",
      expectedRole: args.expectedRole,
      appMetadataRole,
      rpcRole,
      companyMemberRoles,
    };
  }

  return {
    allowed: false,
    source: "none",
    expectedRole: args.expectedRole,
    appMetadataRole,
    rpcRole,
    companyMemberRoles,
  };
}

export function normalizeCompanyMembershipRows(
  rows: unknown,
): CompanyMembershipRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const raw = asObject(row);
      const companyId = trimText(raw?.company_id ?? raw?.companyId);
      const role = normalizeRole(raw?.role);
      if (!companyId || !role) return null;
      return {
        companyId,
        role,
      } satisfies CompanyMembershipRow;
    })
    .filter((row): row is CompanyMembershipRow => row != null);
}

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

export function resolveForemanRequestPdfAccess(args: {
  authUid: string;
  requestFound: boolean;
  requestCreatedBy?: string | null;
  actorMembershipRows?: unknown;
  creatorCompanyIds?: unknown;
}) : PdfAccessPolicyDecision {
  if (!args.requestFound) {
    return {
      allowed: false,
      reason: "request_not_found",
      companyId: null,
      membershipFound: false,
      membershipCompanyIds: [],
      membershipRoles: [],
      isDirector: false,
      ownerCheckApplied: false,
    };
  }

  const requestCreatedBy = trimText(args.requestCreatedBy);
  const actorMembershipRows = normalizeCompanyMembershipRows(args.actorMembershipRows);
  const membershipCompanyIds = unique(actorMembershipRows.map((row) => row.companyId));
  const membershipRoles = unique(actorMembershipRows.map((row) => row.role));
  const membershipFound = actorMembershipRows.length > 0;
  const isDirector = membershipRoles.includes("director");
  const creatorCompanyIds = Array.isArray(args.creatorCompanyIds)
    ? unique(args.creatorCompanyIds.map((value) => trimText(value)).filter(Boolean))
    : [];
  const sharedCompanyIds = membershipCompanyIds.filter((companyId) =>
    creatorCompanyIds.includes(companyId),
  );
  const companyId = sharedCompanyIds[0] ?? null;

  if (!companyId || (!membershipRoles.includes("foreman") && !isDirector)) {
    return {
      allowed: false,
      reason: creatorCompanyIds.length ? "membership_role_forbidden" : "request_missing_company_context",
      companyId,
      membershipFound,
      membershipCompanyIds,
      membershipRoles,
      isDirector,
      ownerCheckApplied: !isDirector,
    };
  }

  if (isDirector) {
    return {
      allowed: true,
      reason: "allowed_director_same_company",
      companyId,
      membershipFound,
      membershipCompanyIds,
      membershipRoles,
      isDirector: true,
      ownerCheckApplied: false,
    };
  }

  if (requestCreatedBy !== trimText(args.authUid)) {
    return {
      allowed: false,
      reason: "owner_mismatch",
      companyId,
      membershipFound,
      membershipCompanyIds,
      membershipRoles,
      isDirector: false,
      ownerCheckApplied: true,
    };
  }

  return {
    allowed: true,
    reason: "allowed_foreman_owner",
    companyId,
    membershipFound,
    membershipCompanyIds,
    membershipRoles,
    isDirector: false,
    ownerCheckApplied: true,
  };
}

export function resolveWarehousePdfAccess(args: {
  membershipRows?: unknown;
}) : PdfAccessPolicyDecision {
  const membershipRows = normalizeCompanyMembershipRows(args.membershipRows);
  const membershipCompanyIds = unique(membershipRows.map((row) => row.companyId));
  const membershipRoles = unique(membershipRows.map((row) => row.role));
  const membershipFound = membershipRows.length > 0;
  const isDirector = membershipRoles.includes("director");
  const hasWarehouse = membershipRoles.includes("warehouse");

  if (isDirector) {
    return {
      allowed: true,
      reason: "allowed_director_same_company",
      companyId: membershipCompanyIds[0] ?? null,
      membershipFound,
      membershipCompanyIds,
      membershipRoles,
      isDirector: true,
      ownerCheckApplied: false,
    };
  }

  if (hasWarehouse) {
    return {
      allowed: true,
      reason: "allowed_warehouse_same_company",
      companyId: membershipCompanyIds[0] ?? null,
      membershipFound,
      membershipCompanyIds,
      membershipRoles,
      isDirector: false,
      ownerCheckApplied: false,
    };
  }

  return {
    allowed: false,
    reason: "membership_role_forbidden",
    companyId: membershipCompanyIds[0] ?? null,
    membershipFound,
    membershipCompanyIds,
    membershipRoles,
    isDirector: false,
    ownerCheckApplied: false,
  };
}
