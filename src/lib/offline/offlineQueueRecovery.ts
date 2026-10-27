/**
 * O4 — Offline Queue Recovery
 *
 * Provides a safe, structured recovery entry point for the foreman mutation queue.
 * Called at bootstrap_complete BEFORE any flush operation.
 *
 * Principles:
 * - CLASSIFY, do not silently discard
 * - LOG all anomalies via structured observability
 * - NEVER remove items without explicit server confirmation
 * - PRESERVE ordering (FIFO by createdAt) after reset
 * - RETURN a structured result for the caller to log or act on
 */

import {
  loadForemanMutationQueue,
  resetInflightForemanMutations,
  type ForemanMutationQueueEntry,
} from "./mutationQueue";
import {
  isOfflineMutationFinalLifecycleStatus,
  type OfflineMutationLifecycleStatus,
} from "./mutation.types";
import { recordPlatformObservability } from "../observability/platformObservability";
import type { ForemanDraftSyncTriggerSource } from "./foremanSyncRuntime";

// ─── Queue Entry Classification ───────────────────────────────────────────────

/**
 * Formal 5-state classification of a queue entry at recovery time.
 *
 * pending         → lifecycleStatus === "queued", valid payload → safe to replay
 * in_flight_stale → lifecycleStatus === "processing" at load → was interrupted; reset & replay
 * retry_scheduled → lifecycleStatus === "retry_scheduled", nextRetryAt set → respect timer
 * terminal        → lifecycleStatus is final (conflicted/failed/succeeded/discarded) → no action needed
 * unknown         → unrecognized lifecycle OR missing required fields → log only, do NOT remove
 */
export type QueueEntryClassification =
  | "pending"
  | "in_flight_stale"
  | "retry_scheduled"
  | "terminal"
  | "unknown";

export type ForemanQueueEntryRecoveryInfo = {
  id: string;
  classification: QueueEntryClassification;
  lifecycleStatus: OfflineMutationLifecycleStatus | string;
  validationError: string | null;
  createdAt: number;
  attemptCount: number;
};

const REQUIRED_PAYLOAD_FIELDS: readonly (keyof ForemanMutationQueueEntry["payload"])[] = [
  "draftKey",
  "mutationKind",
  "triggerSource",
];

const isValidPayload = (entry: ForemanMutationQueueEntry): string | null => {
  if (!entry.payload || typeof entry.payload !== "object") {
    return "missing_payload";
  }
  for (const field of REQUIRED_PAYLOAD_FIELDS) {
    const value = entry.payload[field];
    if (value == null || String(value).trim() === "") {
      return `missing_payload_field:${field}`;
    }
  }
  if (!Number.isFinite(entry.createdAt) || entry.createdAt <= 0) {
    return "invalid_createdAt";
  }
  if (!entry.id || typeof entry.id !== "string") {
    return "missing_id";
  }
  return null;
};

/**
 * Classifies a single queue entry into the O4 recovery state model.
 * Pure function — no side effects.
 */
export const classifyForemanQueueEntry = (
  entry: ForemanMutationQueueEntry,
): ForemanQueueEntryRecoveryInfo => {
  const validationError = isValidPayload(entry);

  if (validationError) {
    return {
      id: String(entry.id ?? "unknown"),
      classification: "unknown",
      lifecycleStatus: String(entry.lifecycleStatus ?? ""),
      validationError,
      createdAt: Number(entry.createdAt ?? 0),
      attemptCount: Number(entry.attemptCount ?? 0),
    };
  }

  let classification: QueueEntryClassification;
  if (entry.lifecycleStatus === "processing") {
    classification = "in_flight_stale";
  } else if (entry.lifecycleStatus === "queued") {
    classification = "pending";
  } else if (entry.lifecycleStatus === "retry_scheduled") {
    classification = "retry_scheduled";
  } else if (isOfflineMutationFinalLifecycleStatus(entry.lifecycleStatus)) {
    classification = "terminal";
  } else {
    classification = "unknown";
  }

  return {
    id: entry.id,
    classification,
    lifecycleStatus: entry.lifecycleStatus,
    validationError: null,
    createdAt: entry.createdAt,
    attemptCount: entry.attemptCount,
  };
};

// ─── Recovery Result ──────────────────────────────────────────────────────────

export type ForemanQueueRecoveryResult = {
  triggerSource: ForemanDraftSyncTriggerSource;
  totalItems: number;
  pendingItems: number;
  inflightResetCount: number;
  retryScheduledItems: number;
  terminalItems: number;
  unknownItems: number;
  /** True when there were inflight-stale or unknown items to address */
  recoveryNeeded: boolean;
  /** Per-item details for unknown entries — for diagnostic logging */
  unknownEntries: ForemanQueueEntryRecoveryInfo[];
  /** Per-item details for reset entries — for diagnostic logging */
  resetEntries: ForemanQueueEntryRecoveryInfo[];
  /** Non-empty when validation found payload issues */
  validationErrors: string[];
  durationMs: number;
};

// ─── Recovery Entry Point ─────────────────────────────────────────────────────

export type ForemanQueueRecoveryOptions = {
  triggerSource: ForemanDraftSyncTriggerSource;
  /** Injected for tests; defaults to Date.now() */
  now?: number;
};

/**
 * O4 recovery entry point.
 *
 * Run at bootstrap_complete BEFORE flushForemanMutationQueue.
 *
 * Steps:
 * 1. Load current queue
 * 2. Classify each entry (5-state model)
 * 3. Emit queue_recovery_start
 * 4. resetInflightForemanMutations() — existing safe reset
 * 5. Emit per-item events for unknown and reset items
 * 6. Emit queue_recovery_complete
 * 7. Return structured result
 *
 * SAFE CONTRACT:
 * - Does NOT remove any items
 * - Does NOT mutate ordering
 * - Does NOT fail the caller (catches and logs internal errors)
 */
export const runForemanQueueRecovery = async (
  options: ForemanQueueRecoveryOptions,
): Promise<ForemanQueueRecoveryResult> => {
  const startedAt = options.now ?? Date.now();
  const { triggerSource } = options;

  // ── Step 1: Load raw queue ────────────────────────────────────────────────
  let rawQueue: ForemanMutationQueueEntry[] = [];
  try {
    rawQueue = await loadForemanMutationQueue();
  } catch (loadError) {
    // Load failure is fatal for recovery — emit and return safe default
    const message =
      loadError instanceof Error ? loadError.message : String(loadError ?? "unknown");
    recordPlatformObservability({
      screen: "foreman",
      surface: "offline_queue_recovery",
      category: "ui",
      event: "queue_recovery_load_failed",
      result: "error",
      errorClass: loadError instanceof Error ? loadError.name : "LoadError",
      errorMessage: message,
      extra: { triggerSource },
    });
    return {
      triggerSource,
      totalItems: 0,
      pendingItems: 0,
      inflightResetCount: 0,
      retryScheduledItems: 0,
      terminalItems: 0,
      unknownItems: 0,
      recoveryNeeded: false,
      unknownEntries: [],
      resetEntries: [],
      validationErrors: [message],
      durationMs: Date.now() - startedAt,
    };
  }

  // ── Step 2: Classify each entry ───────────────────────────────────────────
  const classified = rawQueue.map(classifyForemanQueueEntry);

  const pendingEntries = classified.filter((e) => e.classification === "pending");
  const inflightEntries = classified.filter((e) => e.classification === "in_flight_stale");
  const retryEntries = classified.filter((e) => e.classification === "retry_scheduled");
  const terminalEntries = classified.filter((e) => e.classification === "terminal");
  const unknownEntries = classified.filter((e) => e.classification === "unknown");

  const validationErrors = unknownEntries
    .map((e) => e.validationError)
    .filter((v): v is string => v != null);

  const recoveryNeeded = inflightEntries.length > 0 || unknownEntries.length > 0;

  // ── Step 3: queue_recovery_start ─────────────────────────────────────────
  recordPlatformObservability({
    screen: "foreman",
    surface: "offline_queue_recovery",
    category: "ui",
    event: "queue_recovery_start",
    result: "success",
    rowCount: rawQueue.length,
    extra: {
      triggerSource,
      totalItems: rawQueue.length,
      pendingItems: pendingEntries.length,
      inflightItems: inflightEntries.length,
      retryScheduledItems: retryEntries.length,
      terminalItems: terminalEntries.length,
      unknownItems: unknownEntries.length,
      recoveryNeeded,
    },
  });

  // ── Step 4: Reset inflight (existing, tested mechanism) ───────────────────
  try {
    await resetInflightForemanMutations();
  } catch (resetError) {
    // Non-fatal: log and continue — queue still valid, drain will re-assess
    recordPlatformObservability({
      screen: "foreman",
      surface: "offline_queue_recovery",
      category: "ui",
      event: "queue_recovery_reset_failed",
      result: "error",
      errorClass: resetError instanceof Error ? resetError.name : "ResetError",
      errorMessage: resetError instanceof Error ? resetError.message : String(resetError ?? ""),
      extra: { triggerSource, inflightCount: inflightEntries.length },
    });
  }

  // ── Step 5a: Emit per-item events for inflight-stale entries ─────────────
  for (const entry of inflightEntries) {
    recordPlatformObservability({
      screen: "foreman",
      surface: "offline_queue_recovery",
      category: "ui",
      event: "queue_inflight_reset",
      result: "success",
      extra: {
        mutationId: entry.id,
        lifecycleStatus: entry.lifecycleStatus,
        attemptCount: entry.attemptCount,
        createdAt: entry.createdAt,
        triggerSource,
      },
    });
  }

  // ── Step 5b: Emit per-item events for unknown entries ────────────────────
  for (const entry of unknownEntries) {
    recordPlatformObservability({
      screen: "foreman",
      surface: "offline_queue_recovery",
      category: "ui",
      event: "queue_unknown_item_detected",
      result: "error",
      errorClass: "queue_integrity",
      errorMessage: entry.validationError ?? `unrecognized_lifecycle:${entry.lifecycleStatus}`,
      extra: {
        mutationId: entry.id,
        lifecycleStatus: entry.lifecycleStatus,
        validationError: entry.validationError,
        attemptCount: entry.attemptCount,
        createdAt: entry.createdAt,
        triggerSource,
      },
    });
  }

  const durationMs = Date.now() - startedAt;

  // ── Step 6: queue_recovery_complete ──────────────────────────────────────
  recordPlatformObservability({
    screen: "foreman",
    surface: "offline_queue_recovery",
    category: "ui",
    event: "queue_recovery_complete",
    result: recoveryNeeded ? "success" : "skipped",
    durationMs,
    rowCount: rawQueue.length,
    extra: {
      triggerSource,
      totalItems: rawQueue.length,
      pendingItems: pendingEntries.length,
      inflightResetCount: inflightEntries.length,
      retryScheduledItems: retryEntries.length,
      terminalItems: terminalEntries.length,
      unknownItems: unknownEntries.length,
      recoveryNeeded,
      validationErrorCount: validationErrors.length,
      durationMs,
    },
  });

  return {
    triggerSource,
    totalItems: rawQueue.length,
    pendingItems: pendingEntries.length,
    inflightResetCount: inflightEntries.length,
    retryScheduledItems: retryEntries.length,
    terminalItems: terminalEntries.length,
    unknownItems: unknownEntries.length,
    recoveryNeeded,
    unknownEntries,
    resetEntries: inflightEntries,
    validationErrors,
    durationMs,
  };
};

// ─── Queue Ordering Assertion (proof helper) ──────────────────────────────────

/**
 * Verifies that the queue items are in FIFO createdAt order.
 * Returns null if ordering is intact, or a string describing the violation.
 *
 * Used in tests and can be called in __DEV__ to assert post-recovery order.
 */
export const assertForemanQueueOrdering = (
  entries: Pick<ForemanMutationQueueEntry, "id" | "createdAt">[],
): string | null => {
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const curr = entries[i];
    if (curr !== undefined && prev !== undefined && curr.createdAt < prev.createdAt) {
      return `ordering_violation: entry[${i}].createdAt (${curr.createdAt}) < entry[${i - 1}].createdAt (${prev.createdAt}), ids: ${prev.id} → ${curr.id}`;
    }
  }
  return null;
};
