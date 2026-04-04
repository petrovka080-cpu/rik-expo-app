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
export type CanonicalPdfRoleAccessSource = "app_metadata" | "rpc" | "none";

export type CanonicalPdfRoleAccessResolution = {
  allowed: boolean;
  source: CanonicalPdfRoleAccessSource;
  expectedRole: CanonicalPdfRole;
  appMetadataRole: string | null;
  rpcRole: string | null;
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
  expectedRole: CanonicalPdfRole;
}): CanonicalPdfRoleAccessResolution {
  const appMetadataRole = readCanonicalPdfSignedAppRole(args.user);
  const rpcRole = normalizeRole(args.rpcRole);

  if (appMetadataRole === args.expectedRole) {
    return {
      allowed: true,
      source: "app_metadata",
      expectedRole: args.expectedRole,
      appMetadataRole,
      rpcRole,
    };
  }

  if (rpcRole === args.expectedRole) {
    return {
      allowed: true,
      source: "rpc",
      expectedRole: args.expectedRole,
      appMetadataRole,
      rpcRole,
    };
  }

  return {
    allowed: false,
    source: "none",
    expectedRole: args.expectedRole,
    appMetadataRole,
    rpcRole,
  };
}
