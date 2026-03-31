const trimText = (value: unknown) => String(value ?? "").trim();

const normalizeRole = (value: unknown) => {
  const normalized = trimText(value).toLowerCase();
  return normalized || null;
};

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export type DirectorPdfRoleAccessSource = "app_metadata" | "rpc" | "none";

export type DirectorPdfRoleAccessResolution = {
  isDirector: boolean;
  source: DirectorPdfRoleAccessSource;
  appMetadataRole: string | null;
  rpcRole: string | null;
};

// Supabase signs app_metadata into the user JWT; user_metadata must not be trusted for backend auth.
export function readDirectorPdfSignedAppRole(user: { app_metadata?: unknown } | null | undefined) {
  const appMetadata = asObject(user?.app_metadata);
  return normalizeRole(appMetadata?.role);
}

export function resolveDirectorPdfRoleAccess(args: {
  user?: { app_metadata?: unknown } | null;
  rpcRole?: unknown;
}): DirectorPdfRoleAccessResolution {
  const appMetadataRole = readDirectorPdfSignedAppRole(args.user);
  const rpcRole = normalizeRole(args.rpcRole);

  if (appMetadataRole === "director") {
    return {
      isDirector: true,
      source: "app_metadata",
      appMetadataRole,
      rpcRole,
    };
  }

  if (rpcRole === "director") {
    return {
      isDirector: true,
      source: "rpc",
      appMetadataRole,
      rpcRole,
    };
  }

  return {
    isDirector: false,
    source: "none",
    appMetadataRole,
    rpcRole,
  };
}
