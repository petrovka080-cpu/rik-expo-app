import type { EditableEstimateSnapshot } from "../editableEstimate";
import type {
  PhotoMaterialScanSession,
  PhotoMaterialScanStatus,
} from "./photoMaterialExistingRowTypes";
import {
  assertPhotoMaterialExistingRowFeatureEnabled,
  type PhotoMaterialExistingRowFeaturePolicy,
} from "./photoMaterialExistingRowFeatureFlag";

export const PHOTO_MATERIAL_ACTIVE_SCAN_STATUSES: readonly PhotoMaterialScanStatus[] = Object.freeze([
  "CAPTURING",
  "UPLOADING",
  "QUEUED",
  "RECOGNIZING",
  "NEEDS_CONFIRMATION",
  "APPLYING",
]);

const ALLOWED_TRANSITIONS: ReadonlyMap<PhotoMaterialScanStatus, readonly PhotoMaterialScanStatus[]> = new Map([
  ["CAPTURING", ["UPLOADING", "CANCELLED"]],
  ["UPLOADING", ["QUEUED", "FAILED"]],
  ["QUEUED", ["RECOGNIZING", "FAILED"]],
  ["RECOGNIZING", ["NEEDS_CONFIRMATION", "FAILED"]],
  ["NEEDS_CONFIRMATION", ["APPLYING", "CANCELLED", "EXPIRED"]],
  ["APPLYING", ["APPLIED", "FAILED"]],
  ["APPLIED", []],
  ["FAILED", []],
  ["CANCELLED", []],
  ["EXPIRED", []],
]);

function targetRow(snapshot: EditableEstimateSnapshot, targetRowId: string) {
  return snapshot.rows.find((row) => row.rowId === targetRowId || row.requestItemId === targetRowId) ?? null;
}

function defaultExpiresAt(now: string): string {
  const date = new Date(now);
  date.setHours(date.getHours() + 24);
  return date.toISOString();
}

export function isPhotoMaterialScanActive(status: PhotoMaterialScanStatus): boolean {
  return PHOTO_MATERIAL_ACTIVE_SCAN_STATUSES.includes(status);
}

export function createPhotoMaterialScanSession(input: {
  userId: string;
  estimateId: string;
  baseRevisionId: string;
  targetRowId?: string | null;
  snapshot: EditableEstimateSnapshot;
  featurePolicy?: PhotoMaterialExistingRowFeaturePolicy;
  tenantId?: string | null;
  activeSessions?: PhotoMaterialScanSession[];
  now?: string;
}): PhotoMaterialScanSession {
  assertPhotoMaterialExistingRowFeatureEnabled({
    policy: input.featurePolicy,
    userId: input.userId,
    tenantId: input.tenantId,
  });
  if (!input.targetRowId) throw new Error("PHOTO_MATERIAL_SCAN_TARGET_ROW_REQUIRED");
  const row = targetRow(input.snapshot, input.targetRowId);
  if (!row) throw new Error("PHOTO_MATERIAL_SCAN_TARGET_ROW_NOT_FOUND");
  if (row.rowType !== "material") throw new Error("PHOTO_MATERIAL_SCAN_ONLY_MATERIAL_ROWS_SUPPORTED");
  const duplicate = (input.activeSessions ?? []).find((session) =>
    session.userId === input.userId &&
    session.estimateId === input.estimateId &&
    session.baseRevisionId === input.baseRevisionId &&
    session.targetRowId === input.targetRowId &&
    isPhotoMaterialScanActive(session.status)
  );
  if (duplicate) throw new Error(`PHOTO_MATERIAL_ACTIVE_SCAN_EXISTS:${duplicate.scanId}`);
  const now = input.now ?? new Date().toISOString();
  return {
    scanId: `photo_material_scan:${input.estimateId}:${input.targetRowId}:${now}`,
    userId: input.userId,
    estimateId: input.estimateId,
    baseRevisionId: input.baseRevisionId,
    targetRowId: input.targetRowId,
    scanPurpose: "BIND_EXISTING_ESTIMATE_ROW",
    status: "CAPTURING",
    version: 1,
    expiresAt: defaultExpiresAt(now),
    createdAt: now,
    updatedAt: now,
  };
}

export function transitionPhotoMaterialScanStatus(
  session: PhotoMaterialScanSession,
  nextStatus: PhotoMaterialScanStatus,
  now = new Date().toISOString(),
): PhotoMaterialScanSession {
  const allowed = ALLOWED_TRANSITIONS.get(session.status) ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`PHOTO_MATERIAL_SCAN_TRANSITION_FORBIDDEN:${session.status}->${nextStatus}`);
  }
  return {
    ...session,
    status: nextStatus,
    version: session.version + 1,
    updatedAt: now,
  };
}

export function findActivePhotoMaterialScanForRow(input: {
  sessions: PhotoMaterialScanSession[];
  userId: string;
  estimateId: string;
  baseRevisionId: string;
  targetRowId: string;
}): PhotoMaterialScanSession | null {
  return input.sessions.find((session) =>
    session.userId === input.userId &&
    session.estimateId === input.estimateId &&
    session.baseRevisionId === input.baseRevisionId &&
    session.targetRowId === input.targetRowId &&
    isPhotoMaterialScanActive(session.status)
  ) ?? null;
}
