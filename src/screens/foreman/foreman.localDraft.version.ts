export type ForemanLocalDraftVersionSnapshot = {
  version: 1;
  ownerId: string;
  requestId: string;
  updatedAt: string;
  baseServerRevision?: string | null;
  items: unknown[];
  pendingDeletes: unknown[];
  submitRequested: boolean;
  lastError: string | null;
};

export type ForemanLocalDraftRevisionStamp = {
  schemaVersion: ForemanLocalDraftVersionSnapshot["version"];
  ownerId: string;
  requestId: string;
  localUpdatedAt: string;
  baseServerRevision: string | null;
  itemCount: number;
  pendingDeleteCount: number;
  submitRequested: boolean;
};

export type ForemanLocalDraftVersionCompareResult = {
  equal: boolean | null;
  source:
    | "both_empty"
    | "presence"
    | "identity"
    | "server_revision"
    | "local_updated_at"
    | "fallback_required";
  fallbackRequired: boolean;
  reason: string;
  leftRevision: ForemanLocalDraftRevisionStamp | null;
  rightRevision: ForemanLocalDraftRevisionStamp | null;
};

const trim = (value: unknown): string => String(value ?? "").trim();

const toRevisionTime = (value: unknown): number | null => {
  const text = trim(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const maxRevisionIso = (values: unknown[]): string | null => {
  let maxMs: number | null = null;
  for (const value of values) {
    const parsed = toRevisionTime(value);
    if (parsed == null) continue;
    maxMs = maxMs == null ? parsed : Math.max(maxMs, parsed);
  }
  return maxMs == null ? null : new Date(maxMs).toISOString();
};

export const resolveForemanDraftServerRevision = (params: {
  requestUpdatedAt?: unknown;
  itemUpdatedAts?: unknown[];
}) => maxRevisionIso([params.requestUpdatedAt, ...(params.itemUpdatedAts ?? [])]);

const normalizeSnapshotForCompare = (
  snapshot: ForemanLocalDraftVersionSnapshot | null | undefined,
  options?: { ignoreUpdatedAt?: boolean; ignoreLastError?: boolean },
) => {
  if (!snapshot) return null;
  return {
    ...snapshot,
    updatedAt: options?.ignoreUpdatedAt ? "" : snapshot.updatedAt,
    lastError: options?.ignoreLastError ? null : snapshot.lastError,
  };
};

export const buildForemanLocalDraftRevisionStamp = (
  snapshot: ForemanLocalDraftVersionSnapshot | null | undefined,
): ForemanLocalDraftRevisionStamp | null => {
  if (!snapshot) return null;
  return {
    schemaVersion: snapshot.version,
    ownerId: trim(snapshot.ownerId),
    requestId: trim(snapshot.requestId),
    localUpdatedAt: trim(snapshot.updatedAt),
    baseServerRevision: trim(snapshot.baseServerRevision) || null,
    itemCount: snapshot.items.length,
    pendingDeleteCount: snapshot.pendingDeletes.length,
    submitRequested: snapshot.submitRequested === true,
  };
};

export const compareForemanLocalDraftSnapshotsByVersion = (
  left: ForemanLocalDraftVersionSnapshot | null | undefined,
  right: ForemanLocalDraftVersionSnapshot | null | undefined,
  options?: { ignoreUpdatedAt?: boolean },
): ForemanLocalDraftVersionCompareResult => {
  const leftRevision = buildForemanLocalDraftRevisionStamp(left);
  const rightRevision = buildForemanLocalDraftRevisionStamp(right);

  if (!leftRevision && !rightRevision) {
    return {
      equal: true,
      source: "both_empty",
      fallbackRequired: false,
      reason: "both snapshots are empty",
      leftRevision,
      rightRevision,
    };
  }

  if (!leftRevision || !rightRevision) {
    return {
      equal: false,
      source: "presence",
      fallbackRequired: false,
      reason: "only one snapshot is present",
      leftRevision,
      rightRevision,
    };
  }

  if (
    leftRevision.schemaVersion !== rightRevision.schemaVersion ||
    leftRevision.ownerId !== rightRevision.ownerId ||
    leftRevision.requestId !== rightRevision.requestId
  ) {
    return {
      equal: false,
      source: "identity",
      fallbackRequired: false,
      reason: "snapshot identity differs",
      leftRevision,
      rightRevision,
    };
  }

  if (leftRevision.baseServerRevision && rightRevision.baseServerRevision) {
    if (leftRevision.baseServerRevision === rightRevision.baseServerRevision) {
      return {
        equal: true,
        source: "server_revision",
        fallbackRequired: false,
        reason: "base server revision matches",
        leftRevision,
        rightRevision,
      };
    }

    return {
      equal: null,
      source: "fallback_required",
      fallbackRequired: true,
      reason: "base server revision differs; preserve semantic fallback",
      leftRevision,
      rightRevision,
    };
  }

  if (!options?.ignoreUpdatedAt && leftRevision.localUpdatedAt && rightRevision.localUpdatedAt) {
    if (leftRevision.localUpdatedAt === rightRevision.localUpdatedAt) {
      return {
        equal: true,
        source: "local_updated_at",
        fallbackRequired: false,
        reason: "local updatedAt matches",
        leftRevision,
        rightRevision,
      };
    }
  }

  return {
    equal: null,
    source: "fallback_required",
    fallbackRequired: true,
    reason: "revision metadata is missing or inconclusive",
    leftRevision,
    rightRevision,
  };
};

export const areForemanLocalDraftSnapshotsEqual = (
  left: ForemanLocalDraftVersionSnapshot | null | undefined,
  right: ForemanLocalDraftVersionSnapshot | null | undefined,
  options?: { ignoreUpdatedAt?: boolean; ignoreLastError?: boolean },
): boolean => {
  const versionCompare = compareForemanLocalDraftSnapshotsByVersion(left, right, {
    ignoreUpdatedAt: options?.ignoreUpdatedAt,
  });
  if (
    !versionCompare.fallbackRequired &&
    versionCompare.equal != null &&
    versionCompare.source !== "server_revision"
  ) {
    return versionCompare.equal;
  }
  return (
    JSON.stringify(normalizeSnapshotForCompare(left, options)) ===
    JSON.stringify(normalizeSnapshotForCompare(right, options))
  );
};
