import type { IdempotencyPolicyOperation } from "./idempotencyPolicies";
import { assertIdempotencyKeyIsBounded } from "./idempotencyKeySafety";

export type IdempotencyReserveState =
  | "reserved"
  | "duplicate_in_flight"
  | "duplicate_committed"
  | "failed_retryable"
  | "failed_final"
  | "expired"
  | "disabled";

export type IdempotencyStoredStatus =
  | "reserved"
  | "committed"
  | "failed_retryable"
  | "failed_final"
  | "expired";

export type IdempotencyStoredRecord = {
  key: string;
  operation: IdempotencyPolicyOperation;
  status: IdempotencyStoredStatus;
  attempts: number;
  createdAtMs: number;
  updatedAtMs: number;
  expiresAtMs: number;
  rawPayloadStored: false;
  piiStored: false;
  resultStatus: "missing" | "present_redacted";
};

export type IdempotencyReservation = {
  state: IdempotencyReserveState;
  key: string;
  record: IdempotencyStoredRecord | null;
};

export type IdempotencyAdapterHealth = {
  kind: "noop" | "in_memory";
  enabled: boolean;
  externalNetworkEnabled: false;
  persistenceEnabledByDefault: false;
  reserved: number;
  committed: number;
  failed: number;
  expired?: number;
  totalRecords?: number;
  maxRecords?: number;
  evictedRecords?: number;
  expiredRecordsReleased?: number;
  invalidKeyDecisions?: number;
  maxTtlMs?: number;
};

export type IdempotencyReserveInput = {
  key: string;
  operation: IdempotencyPolicyOperation;
  ttlMs: number;
  nowMs?: number;
};

export interface IdempotencyAdapter {
  reserve(input: IdempotencyReserveInput): Promise<IdempotencyReservation>;
  commit(key: string): Promise<IdempotencyReservation>;
  fail(key: string, retryable: boolean): Promise<IdempotencyReservation>;
  getStatus(key: string): Promise<IdempotencyStoredRecord | null>;
  releaseExpired(nowMs?: number): Promise<number>;
  getHealth(): IdempotencyAdapterHealth;
}

const now = (): number => Date.now();
const IDEMPOTENCY_ADAPTER_INVALID_KEY = "idem:v1:invalid";
const IDEMPOTENCY_ADAPTER_KEY_PATTERN = /^idem:v1:[a-z0-9.]+:[a-f0-9]{8}$/;

export const IN_MEMORY_IDEMPOTENCY_DEFAULT_MAX_RECORDS = 1_000;
export const IN_MEMORY_IDEMPOTENCY_MAX_RECORDS = 10_000;
export const IN_MEMORY_IDEMPOTENCY_MAX_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const IN_MEMORY_IDEMPOTENCY_DEFAULT_TTL_MS = 24 * 60 * 60 * 1_000;

export type InMemoryIdempotencyAdapterOptions = {
  nowMs?: () => number;
  maxRecords?: number;
};

const disabledReservation = (key: string): IdempotencyReservation => ({
  state: "disabled",
  key,
  record: null,
});

const toReserveState = (
  record: IdempotencyStoredRecord,
): IdempotencyReserveState => {
  if (record.status === "reserved") return "duplicate_in_flight";
  if (record.status === "committed") return "duplicate_committed";
  return record.status;
};

export function resolveInMemoryIdempotencyMaxRecords(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return IN_MEMORY_IDEMPOTENCY_DEFAULT_MAX_RECORDS;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) return IN_MEMORY_IDEMPOTENCY_DEFAULT_MAX_RECORDS;
  return Math.min(normalized, IN_MEMORY_IDEMPOTENCY_MAX_RECORDS);
}

export function resolveInMemoryIdempotencyTtlMs(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return IN_MEMORY_IDEMPOTENCY_DEFAULT_TTL_MS;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) return IN_MEMORY_IDEMPOTENCY_DEFAULT_TTL_MS;
  return Math.min(normalized, IN_MEMORY_IDEMPOTENCY_MAX_TTL_MS);
}

export class NoopIdempotencyAdapter implements IdempotencyAdapter {
  async reserve(
    input: IdempotencyReserveInput,
  ): Promise<IdempotencyReservation> {
    return disabledReservation(input.key);
  }

  async commit(key: string): Promise<IdempotencyReservation> {
    return disabledReservation(key);
  }

  async fail(
    key: string,
    _retryable: boolean,
  ): Promise<IdempotencyReservation> {
    return disabledReservation(key);
  }

  async getStatus(_key: string): Promise<IdempotencyStoredRecord | null> {
    return null;
  }

  async releaseExpired(_nowMs?: number): Promise<number> {
    return 0;
  }

  getHealth(): IdempotencyAdapterHealth {
    return {
      kind: "noop",
      enabled: false,
      externalNetworkEnabled: false,
      persistenceEnabledByDefault: false,
      reserved: 0,
      committed: 0,
      failed: 0,
    };
  }
}

export class InMemoryIdempotencyAdapter implements IdempotencyAdapter {
  private readonly records = new Map<string, IdempotencyStoredRecord>();
  private readonly nowMs: () => number;
  private readonly maxRecords: number;
  private evictedRecords = 0;
  private expiredRecordsReleased = 0;
  private invalidKeyDecisions = 0;

  constructor(
    nowOrOptions: (() => number) | InMemoryIdempotencyAdapterOptions = now,
  ) {
    if (typeof nowOrOptions === "function") {
      this.nowMs = nowOrOptions;
      this.maxRecords = IN_MEMORY_IDEMPOTENCY_DEFAULT_MAX_RECORDS;
      return;
    }

    this.nowMs = nowOrOptions.nowMs ?? now;
    this.maxRecords = resolveInMemoryIdempotencyMaxRecords(
      nowOrOptions.maxRecords,
    );
  }

  private isSafeKey(key: string): boolean {
    return (
      assertIdempotencyKeyIsBounded(key) &&
      IDEMPOTENCY_ADAPTER_KEY_PATTERN.test(key)
    );
  }

  private disabledForInvalidKey(): IdempotencyReservation {
    this.invalidKeyDecisions += 1;
    return disabledReservation(IDEMPOTENCY_ADAPTER_INVALID_KEY);
  }

  private purgeExpired(nowMs: number): number {
    let released = 0;
    for (const [key, record] of this.records.entries()) {
      if (record.expiresAtMs <= nowMs || record.status === "expired") {
        this.records.delete(key);
        released += 1;
      }
    }
    this.expiredRecordsReleased += released;
    return released;
  }

  private evictOldestIfNeeded(): void {
    while (this.records.size > this.maxRecords) {
      const oldestKey = this.records.keys().next().value;
      if (typeof oldestKey !== "string") return;
      this.records.delete(oldestKey);
      this.evictedRecords += 1;
    }
  }

  async reserve(
    input: IdempotencyReserveInput,
  ): Promise<IdempotencyReservation> {
    if (!this.isSafeKey(input.key)) return this.disabledForInvalidKey();

    const currentMs = input.nowMs ?? this.nowMs();
    const existing = this.records.get(input.key);
    if (existing) {
      if (existing.expiresAtMs <= currentMs) {
        const expired = {
          ...existing,
          status: "expired" as const,
          updatedAtMs: currentMs,
        };
        this.records.set(input.key, expired);
        return { state: "expired", key: input.key, record: expired };
      }
      if (existing.status === "failed_retryable") {
        const retry = {
          ...existing,
          status: "reserved" as const,
          attempts: existing.attempts + 1,
          updatedAtMs: currentMs,
        };
        this.records.set(input.key, retry);
        return { state: "reserved", key: input.key, record: retry };
      }
      return {
        state: toReserveState(existing),
        key: input.key,
        record: existing,
      };
    }

    this.purgeExpired(currentMs);

    const record: IdempotencyStoredRecord = {
      key: input.key,
      operation: input.operation,
      status: "reserved",
      attempts: 1,
      createdAtMs: currentMs,
      updatedAtMs: currentMs,
      expiresAtMs: currentMs + resolveInMemoryIdempotencyTtlMs(input.ttlMs),
      rawPayloadStored: false,
      piiStored: false,
      resultStatus: "missing",
    };
    this.records.set(input.key, record);
    this.evictOldestIfNeeded();
    const stored = this.records.get(input.key);
    return stored
      ? { state: "reserved", key: input.key, record: stored }
      : { state: "expired", key: input.key, record: null };
  }

  async commit(key: string): Promise<IdempotencyReservation> {
    if (!this.isSafeKey(key)) return this.disabledForInvalidKey();
    const existing = this.records.get(key);
    if (!existing) return { state: "expired", key, record: null };
    const record = {
      ...existing,
      status: "committed" as const,
      updatedAtMs: this.nowMs(),
      resultStatus: "present_redacted" as const,
    };
    this.records.set(key, record);
    return { state: "duplicate_committed", key, record };
  }

  async fail(key: string, retryable: boolean): Promise<IdempotencyReservation> {
    if (!this.isSafeKey(key)) return this.disabledForInvalidKey();
    const existing = this.records.get(key);
    if (!existing) return { state: "expired", key, record: null };
    const record = {
      ...existing,
      status: retryable
        ? ("failed_retryable" as const)
        : ("failed_final" as const),
      updatedAtMs: this.nowMs(),
    };
    this.records.set(key, record);
    return { state: record.status, key, record };
  }

  async getStatus(key: string): Promise<IdempotencyStoredRecord | null> {
    if (!this.isSafeKey(key)) return null;
    const existing = this.records.get(key) ?? null;
    if (!existing) return null;
    if (existing.expiresAtMs > this.nowMs() || existing.status === "expired")
      return existing;
    const expired = {
      ...existing,
      status: "expired" as const,
      updatedAtMs: this.nowMs(),
    };
    this.records.set(key, expired);
    return expired;
  }

  async releaseExpired(nowMs: number = this.nowMs()): Promise<number> {
    return this.purgeExpired(nowMs);
  }

  getHealth(): IdempotencyAdapterHealth {
    const records = [...this.records.values()];
    return {
      kind: "in_memory",
      enabled: true,
      externalNetworkEnabled: false,
      persistenceEnabledByDefault: false,
      reserved: records.filter((record) => record.status === "reserved").length,
      committed: records.filter((record) => record.status === "committed")
        .length,
      failed: records.filter(
        (record) =>
          record.status === "failed_retryable" ||
          record.status === "failed_final",
      ).length,
      expired: records.filter((record) => record.status === "expired").length,
      totalRecords: records.length,
      maxRecords: this.maxRecords,
      evictedRecords: this.evictedRecords,
      expiredRecordsReleased: this.expiredRecordsReleased,
      invalidKeyDecisions: this.invalidKeyDecisions,
      maxTtlMs: IN_MEMORY_IDEMPOTENCY_MAX_TTL_MS,
    };
  }
}

export const EXTERNAL_IDEMPOTENCY_ADAPTER_CONTRACT = Object.freeze({
  kind: "external_contract",
  reserve: "contract_only",
  commit: "contract_only",
  fail: "contract_only",
  getStatus: "contract_only",
  releaseExpired: "contract_only",
  getHealth: "contract_only",
  externalStorageCallsInTests: false,
  persistenceEnabledByDefault: false,
});

export function createDisabledIdempotencyAdapter(): IdempotencyAdapter {
  return new NoopIdempotencyAdapter();
}
