/**
 * O5 — Offline Conflict Classifier
 *
 * Pure, stateless conflict classifier for the foreman offline draft path.
 * No side effects. No queue mutations. No network calls.
 *
 * Input: current state of local snapshot + remote snapshot + pending queue count.
 * Output: typed ForemanConflictClassification with a deterministic conflict class.
 *
 * Design contract:
 * - Server truth is always authoritative
 * - Local draft is temporary working state
 * - Queue is intent log, not truth
 * - Classifier never mutates data — only observes and classifies
 *
 * Invariants:
 * - Same input → same output (deterministic)
 * - Never throws (returns unknown_conflict on unexpected input)
 * - Never removes or modifies queue items
 * - Never clears local snapshot
 */

import type { ForemanLocalDraftSnapshot } from "../../screens/foreman/foreman.localDraft";

// ─── Conflict Class Taxonomy ──────────────────────────────────────────────────
//
// C1: no_conflict                              — safe to replay
// C2: revision_behind_remote                  — local stale, no pending queue
// C3: local_queue_pending_against_new_remote   — THE O5.2 SLICE
// C4: local_snapshot_diverged                 — content divergence, revision unclear
// C5: remote_missing_but_local_pending        — remote gone, local still queued
// C6: unknown_conflict                        — insufficient data, treat as retryable

export type ForemanConflictClass =
  | "no_conflict"
  | "revision_behind_remote"
  | "local_queue_pending_against_new_remote"
  | "local_snapshot_diverged"
  | "remote_missing_but_local_pending"
  | "unknown_conflict";

export type ForemanConflictClassification = {
  conflictClass: ForemanConflictClass;
  /** True when the classification is based on conclusive evidence */
  deterministic: boolean;
  /** Human-readable description of why this class was chosen */
  reason: string;
  /** Base server revision from the local snapshot */
  localBaseRevision: string | null;
  /** Base server revision from the remote snapshot */
  remoteBaseRevision: string | null;
  /** Number of pending mutations in queue at classify time */
  pendingCount: number;
  /** True when remote revision is strictly newer than local base revision */
  revisionAdvanced: boolean;
  /** True when remote is confirmed missing/terminal */
  remoteMissing: boolean;
};

// ─── Params ───────────────────────────────────────────────────────────────────

export type ForemanConflictClassifierParams = {
  /** Local durable draft snapshot — may be null if none */
  localSnapshot: ForemanLocalDraftSnapshot | null | undefined;
  /** Remote draft snapshot from inspectRemoteDraft — null if not available */
  remoteSnapshot: ForemanLocalDraftSnapshot | null | undefined;
  /** Remote status string if available ("submitted", "draft", etc.) */
  remoteStatus: string | null | undefined;
  /** True when remote.isTerminal was detected */
  remoteIsTerminal: boolean;
  /** True when remote was explicitly not found (404 / null with known requestId) */
  remoteMissing: boolean;
  /** Number of pending mutations in queue (pending + queued, excluding terminal) */
  pendingCount: number;
  /** requestId is known for this draft */
  requestIdKnown: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const trim = (value: unknown): string => String(value ?? "").trim();

/**
 * Parse an ISO timestamp string to epoch ms for comparison.
 * Returns null if the value is not a valid ISO date.
 */
export const parseRevisionMs = (value: unknown): number | null => {
  const text = trim(value);
  if (!text) return null;
  const ms = Date.parse(text);
  return Number.isFinite(ms) ? ms : null;
};

/**
 * Compare two ISO revision strings.
 * Returns:
 *   "remote_newer" — remote is strictly newer
 *   "local_newer"  — local is strictly newer
 *   "equal"        — same timestamp
 *   "unknown"      — one or both are missing/unparseable
 */
export type RevisionCompareResult = "remote_newer" | "local_newer" | "equal" | "unknown";

export const compareRevisions = (
  localRevision: string | null | undefined,
  remoteRevision: string | null | undefined,
): RevisionCompareResult => {
  const localMs = parseRevisionMs(localRevision);
  const remoteMs = parseRevisionMs(remoteRevision);
  if (localMs == null || remoteMs == null) return "unknown";
  if (remoteMs > localMs) return "remote_newer";
  if (localMs > remoteMs) return "local_newer";
  return "equal";
};

// ─── Core Classifier ──────────────────────────────────────────────────────────

/**
 * Classifies the current conflict state of a foreman draft.
 *
 * Decision tree:
 *
 * 1. Remote is terminal (isTerminal=true)
 *    → C5: remote_missing_but_local_pending (if pendingCount > 0)
 *    → map to server_terminal_conflict in existing path (handled upstream)
 *
 * 2. Remote is explicitly missing (404, null with known requestId)
 *    + pendingCount > 0
 *    → C5: remote_missing_but_local_pending
 *
 * 3. pendingCount > 0 AND remote revision > local base revision
 *    → C3: local_queue_pending_against_new_remote  [O5.2 SLICE]
 *
 * 4. pendingCount === 0 AND remote revision > local base revision
 *    → C2: revision_behind_remote
 *
 * 5. Both snapshots present, content diverges, revision inconclusive
 *    → C4: local_snapshot_diverged
 *
 * 6. No evidence of conflict
 *    → C1: no_conflict
 *
 * 7. Cannot determine
 *    → C6: unknown_conflict
 */
export const classifyForemanConflict = (
  params: ForemanConflictClassifierParams,
): ForemanConflictClassification => {
  try {
    const localBaseRevision =
      trim(params.localSnapshot?.baseServerRevision) || null;
    const remoteBaseRevision =
      trim(params.remoteSnapshot?.baseServerRevision) || null;
    const pendingCount = Math.max(0, Number(params.pendingCount ?? 0) || 0);
    const remoteIsTerminal = params.remoteIsTerminal === true;
    const remoteMissing =
      params.remoteMissing === true ||
      (params.requestIdKnown && params.remoteSnapshot == null && !remoteIsTerminal);

    const revisionCompare = compareRevisions(localBaseRevision, remoteBaseRevision);
    const revisionAdvanced = revisionCompare === "remote_newer";

    // ── C5: Remote terminal or missing with pending queue ─────────────────
    if (remoteIsTerminal && pendingCount > 0) {
      return {
        conflictClass: "remote_missing_but_local_pending",
        deterministic: true,
        reason: "remote reached terminal status while local queue still has pending mutations",
        localBaseRevision,
        remoteBaseRevision,
        pendingCount,
        revisionAdvanced,
        remoteMissing: true,
      };
    }

    if (remoteMissing && pendingCount > 0) {
      return {
        conflictClass: "remote_missing_but_local_pending",
        deterministic: true,
        reason: "remote draft not found (missing/404) while local queue has pending mutations",
        localBaseRevision,
        remoteBaseRevision,
        pendingCount,
        revisionAdvanced,
        remoteMissing: true,
      };
    }

    // ── C3: Pending queue + remote revision advanced [O5.2 SLICE] ─────────
    if (pendingCount > 0 && revisionAdvanced) {
      return {
        conflictClass: "local_queue_pending_against_new_remote",
        deterministic: true,
        reason:
          `pending queue (${pendingCount} mutations) against advanced remote revision` +
          ` (local: ${localBaseRevision ?? "none"}, remote: ${remoteBaseRevision ?? "none"})`,
        localBaseRevision,
        remoteBaseRevision,
        pendingCount,
        revisionAdvanced: true,
        remoteMissing: false,
      };
    }

    // ── C2: No pending queue, but local revision is behind remote ──────────
    if (pendingCount === 0 && revisionAdvanced) {
      return {
        conflictClass: "revision_behind_remote",
        deterministic: true,
        reason: "local snapshot base revision is behind remote — no pending queue",
        localBaseRevision,
        remoteBaseRevision,
        pendingCount,
        revisionAdvanced: true,
        remoteMissing: false,
      };
    }

    // ── C4: Both snapshots present but content diverges, revision unclear ──
    if (
      params.localSnapshot &&
      params.remoteSnapshot &&
      revisionCompare === "unknown"
    ) {
      // Snapshots both exist but revision comparison is inconclusive
      return {
        conflictClass: "local_snapshot_diverged",
        deterministic: false,
        reason: "local and remote snapshots both present but revision comparison is inconclusive",
        localBaseRevision,
        remoteBaseRevision,
        pendingCount,
        revisionAdvanced: false,
        remoteMissing: false,
      };
    }

    // ── C1: No evidence of conflict ────────────────────────────────────────
    if (
      !revisionAdvanced &&
      !remoteMissing &&
      !remoteIsTerminal
    ) {
      return {
        conflictClass: "no_conflict",
        deterministic: revisionCompare !== "unknown",
        reason:
          revisionCompare === "equal"
            ? "revisions match — no conflict"
            : revisionCompare === "local_newer"
              ? "local revision is ahead of remote — no conflict"
              : "no revision data to compare — treating as no conflict",
        localBaseRevision,
        remoteBaseRevision,
        pendingCount,
        revisionAdvanced: false,
        remoteMissing: false,
      };
    }

    // ── C6: Unknown / insufficient data ───────────────────────────────────
    return {
      conflictClass: "unknown_conflict",
      deterministic: false,
      reason: "conflict state could not be determined from available data",
      localBaseRevision,
      remoteBaseRevision,
      pendingCount,
      revisionAdvanced,
      remoteMissing,
    };
  } catch {
    // Classifier must never throw — return unknown on any error
    return {
      conflictClass: "unknown_conflict",
      deterministic: false,
      reason: "internal classifier error — treat as unknown",
      localBaseRevision: null,
      remoteBaseRevision: null,
      pendingCount: 0,
      revisionAdvanced: false,
      remoteMissing: false,
    };
  }
};

// ─── Resolution Policy ───────────────────────────────────────────────────────

export type ForemanConflictResolution =
  | "proceed_replay"     // C1 — safe to continue drain
  | "hold_for_attention" // C2, C3, C4 — pause, signal UI attention
  | "server_wins"        // C5 — clear local, server truth
  | "safe_retry"         // C6 — treat as retryable, schedule retry

/**
 * Deterministic resolution policy from conflict class.
 * One class → one resolution. No ambiguity.
 */
export const resolveConflictPolicy = (
  conflictClass: ForemanConflictClass,
): ForemanConflictResolution => {
  switch (conflictClass) {
    case "no_conflict":
      return "proceed_replay";
    case "revision_behind_remote":
    case "local_queue_pending_against_new_remote":
    case "local_snapshot_diverged":
      return "hold_for_attention";
    case "remote_missing_but_local_pending":
      return "server_wins";
    case "unknown_conflict":
    default:
      return "safe_retry";
  }
};

/**
 * Maps O5 conflict class to the existing ForemanDraftConflictType.
 * Preserves backward compatibility with existing UI and recovery paths.
 */
export const mapConflictClassToExistingType = (
  conflictClass: ForemanConflictClass,
): import("./foremanSyncRuntime").ForemanDraftConflictType => {
  switch (conflictClass) {
    case "no_conflict":
      return "none";
    case "revision_behind_remote":
      return "stale_local_snapshot";
    case "local_queue_pending_against_new_remote":
      // C3 — maps to existing attention type. UI pattern is the same.
      // Future: could add a dedicated "pending_queue_conflict" type if needed.
      return "remote_divergence_requires_attention";
    case "local_snapshot_diverged":
      return "remote_divergence_requires_attention";
    case "remote_missing_but_local_pending":
      return "server_terminal_conflict";
    case "unknown_conflict":
    default:
      return "retryable_sync_failure";
  }
};
