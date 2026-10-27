/**
 * mutation.quarantine.ts
 *
 * Offline mutation queue schema-quarantine observability layer.
 *
 * Purpose:
 *   When a stored queue entry cannot be parsed due to an unexpected schema
 *   (e.g. after an OTA that changed the payload shape), `normalizeEntry`
 *   returns null and the record is silently dropped. This module provides
 *   a structured observability emit so that such events are never silent.
 *
 * Contract guarantees:
 *   - Pure side-effect free helpers: no state, no storage writes.
 *   - Does NOT alter the queue or retry logic.
 *   - Safe to call with any unknown value (never throws).
 *   - Additive: does not change the existing happy-path behavior.
 */

import { recordPlatformObservability } from "../observability/platformObservability";

/** Increment when the expected queue entry shape changes. */
export const MUTATION_PAYLOAD_SCHEMA_VERSION = 3 as const;

export type MutationQuarantineReason =
  | "missing_required_field"
  | "wrong_scope"
  | "invalid_payload"
  | "unknown_schema_version";

export type MutationQuarantineEvent = {
  owner: "foreman" | "contractor" | "unknown";
  storageKey: string;
  reason: MutationQuarantineReason;
  /** Detected schema version stored in the entry, if present. */
  entrySchemaVersion: number | null;
  expectedSchemaVersion: number;
  /** Subset of the raw entry for debugging. Never contains PII. */
  rawSummary: {
    id: string | null;
    scope: string | null;
    type: string | null;
    lifecycleStatus: string | null;
    createdAt: number | null;
  };
};

const safeStr = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const safeNum = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

/**
 * Emit a structured observability event when a queue entry is discarded
 * due to a schema validation failure.
 *
 * Called from `normalizeEntry` before returning null.
 * Never throws. Best-effort only.
 */
export const recordMutationQuarantineEvent = (
  raw: unknown,
  storageKey: string,
  reason: MutationQuarantineReason,
): void => {
  try {
    const entry =
      raw != null && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : {};

    const payload =
      entry.payload != null &&
      typeof entry.payload === "object" &&
      !Array.isArray(entry.payload)
        ? (entry.payload as Record<string, unknown>)
        : {};

    const event: MutationQuarantineEvent = {
      owner:
        safeStr(entry.owner) === "foreman"
          ? "foreman"
          : safeStr(entry.owner) === "contractor"
            ? "contractor"
            : "unknown",
      storageKey,
      reason,
      entrySchemaVersion: safeNum(entry.schemaVersion),
      expectedSchemaVersion: MUTATION_PAYLOAD_SCHEMA_VERSION,
      rawSummary: {
        id: safeStr(entry.id),
        scope: safeStr(entry.scope),
        type: safeStr(entry.type),
        lifecycleStatus: safeStr(entry.lifecycleStatus),
        createdAt: safeNum(entry.createdAt),
      },
    };

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[mutation.quarantine] entry_discarded", {
        reason,
        storageKey,
        id: event.rawSummary.id,
        scope: event.rawSummary.scope,
        draftKey: safeStr(payload.draftKey),
        entrySchemaVersion: event.entrySchemaVersion,
      });
    }

    recordPlatformObservability({
      screen: "global_busy",
      surface: "offline_queue",
      category: "fetch",
      event: "mutation_queue_entry_quarantined",
      result: "error",
      sourceKind: storageKey,
      fallbackUsed: false,
      errorStage: "parse",
      errorClass: reason,
      extra: {
        owner: event.owner,
        storageKey,
        reason,
        entrySchemaVersion: event.entrySchemaVersion,
        expectedSchemaVersion: event.expectedSchemaVersion,
        id: event.rawSummary.id,
        scope: event.rawSummary.scope,
        type: event.rawSummary.type,
        lifecycleStatus: event.rawSummary.lifecycleStatus,
        createdAt: event.rawSummary.createdAt,
        draftKey: safeStr(payload.draftKey),
      },
    });
  } catch {
    // Best-effort — never propagate errors from observability
  }
};
