import type { IdempotencyPolicyOperation } from "./idempotencyPolicies";

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

const disabledReservation = (key: string): IdempotencyReservation => ({
  state: "disabled",
  key,
  record: null,
});

const toReserveState = (record: IdempotencyStoredRecord): IdempotencyReserveState => {
  if (record.status === "reserved") return "duplicate_in_flight";
  if (record.status === "committed") return "duplicate_committed";
  return record.status;
};

export class NoopIdempotencyAdapter implements IdempotencyAdapter {
  async reserve(input: IdempotencyReserveInput): Promise<IdempotencyReservation> {
    return disabledReservation(input.key);
  }

  async commit(key: string): Promise<IdempotencyReservation> {
    return disabledReservation(key);
  }

  async fail(key: string, _retryable: boolean): Promise<IdempotencyReservation> {
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

  constructor(private readonly nowMs: () => number = now) {}

  async reserve(input: IdempotencyReserveInput): Promise<IdempotencyReservation> {
    const currentMs = input.nowMs ?? this.nowMs();
    const existing = this.records.get(input.key);
    if (existing) {
      if (existing.expiresAtMs <= currentMs) {
        const expired = { ...existing, status: "expired" as const, updatedAtMs: currentMs };
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
      return { state: toReserveState(existing), key: input.key, record: existing };
    }

    const record: IdempotencyStoredRecord = {
      key: input.key,
      operation: input.operation,
      status: "reserved",
      attempts: 1,
      createdAtMs: currentMs,
      updatedAtMs: currentMs,
      expiresAtMs: currentMs + input.ttlMs,
      rawPayloadStored: false,
      piiStored: false,
      resultStatus: "missing",
    };
    this.records.set(input.key, record);
    return { state: "reserved", key: input.key, record };
  }

  async commit(key: string): Promise<IdempotencyReservation> {
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
    const existing = this.records.get(key);
    if (!existing) return { state: "expired", key, record: null };
    const record = {
      ...existing,
      status: retryable ? "failed_retryable" as const : "failed_final" as const,
      updatedAtMs: this.nowMs(),
    };
    this.records.set(key, record);
    return { state: record.status, key, record };
  }

  async getStatus(key: string): Promise<IdempotencyStoredRecord | null> {
    const existing = this.records.get(key) ?? null;
    if (!existing) return null;
    if (existing.expiresAtMs > this.nowMs() || existing.status === "expired") return existing;
    const expired = { ...existing, status: "expired" as const, updatedAtMs: this.nowMs() };
    this.records.set(key, expired);
    return expired;
  }

  async releaseExpired(nowMs: number = this.nowMs()): Promise<number> {
    let released = 0;
    for (const [key, record] of this.records.entries()) {
      if (record.expiresAtMs <= nowMs || record.status === "expired") {
        this.records.delete(key);
        released += 1;
      }
    }
    return released;
  }

  getHealth(): IdempotencyAdapterHealth {
    const records = [...this.records.values()];
    return {
      kind: "in_memory",
      enabled: true,
      externalNetworkEnabled: false,
      persistenceEnabledByDefault: false,
      reserved: records.filter((record) => record.status === "reserved").length,
      committed: records.filter((record) => record.status === "committed").length,
      failed: records.filter((record) => record.status === "failed_retryable" || record.status === "failed_final").length,
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
