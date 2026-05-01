import type { IdempotencyPolicyOperation } from "./idempotencyPolicies";
import { assertIdempotencyKeyIsBounded } from "./idempotencyKeySafety";
import {
  resolveScaleProviderRuntimeConfig,
  type ScaleProviderRuntimeEnvironment,
} from "./providerRuntimeConfig";

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
  kind: "noop" | "in_memory" | "db";
  enabled: boolean;
  externalNetworkEnabled: boolean;
  persistenceEnabledByDefault: false;
  reserved: number;
  committed: number;
  failed: number;
  tableName?: string;
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

export type DbIdempotencyQueryInput = {
  operation: "reserve" | "commit" | "fail" | "status" | "releaseExpired";
  sql: string;
  values: readonly unknown[];
};

export type DbIdempotencyQueryResult = {
  rows?: readonly unknown[];
  rowCount?: number | null;
};

export type DbIdempotencyQuery = (
  input: DbIdempotencyQueryInput,
) => Promise<DbIdempotencyQueryResult>;

export type DbIdempotencyAdapterOptions = {
  tableName: string;
  query?: DbIdempotencyQuery;
  nowMs?: () => number;
};

export type IdempotencyDbEnv = Record<string, string | undefined>;

export type CreateDbIdempotencyAdapterFromEnvOptions = {
  runtimeEnvironment?: ScaleProviderRuntimeEnvironment;
  query?: DbIdempotencyQuery;
  nowMs?: () => number;
};

const now = (): number => Date.now();
const IDEMPOTENCY_ADAPTER_INVALID_KEY = "idem:v1:invalid";
const IDEMPOTENCY_ADAPTER_KEY_PATTERN = /^idem:v1:[a-z0-9.]+:[a-f0-9]{8}$/;
const IDEMPOTENCY_DB_TABLE_PATTERN =
  /^[a-z][a-z0-9_]{0,62}(\.[a-z][a-z0-9_]{0,62})?$/;

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

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const isSafeIdempotencyAdapterKey = (key: string): boolean =>
  assertIdempotencyKeyIsBounded(key) &&
  IDEMPOTENCY_ADAPTER_KEY_PATTERN.test(key);

const isSafeIdempotencyDbTableName = (tableName: string): boolean =>
  IDEMPOTENCY_DB_TABLE_PATTERN.test(tableName);

const quoteIdempotencyDbTableName = (tableName: string): string | null => {
  const normalized = normalizeText(tableName).toLowerCase();
  if (!isSafeIdempotencyDbTableName(normalized)) return null;
  return normalized
    .split(".")
    .map((part) => `"${part}"`)
    .join(".");
};

const numberFromRow = (row: Record<string, unknown>, snake: string, camel: string): number => {
  const value = row[snake] ?? row[camel];
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
};

const stringFromRow = (row: Record<string, unknown>, snake: string, camel: string): string =>
  normalizeText(row[snake] ?? row[camel]);

const mapDbRowToIdempotencyRecord = (
  value: unknown,
): IdempotencyStoredRecord | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const key = stringFromRow(row, "key", "key");
  const operation = stringFromRow(row, "operation", "operation") as IdempotencyPolicyOperation;
  const status = stringFromRow(row, "status", "status") as IdempotencyStoredStatus;
  if (!key || !operation || !status) return null;
  if (
    !["reserved", "committed", "failed_retryable", "failed_final", "expired"].includes(status)
  ) {
    return null;
  }

  const resultStatus = stringFromRow(row, "result_status", "resultStatus");
  return {
    key,
    operation,
    status,
    attempts: numberFromRow(row, "attempts", "attempts"),
    createdAtMs: numberFromRow(row, "created_at_ms", "createdAtMs"),
    updatedAtMs: numberFromRow(row, "updated_at_ms", "updatedAtMs"),
    expiresAtMs: numberFromRow(row, "expires_at_ms", "expiresAtMs"),
    rawPayloadStored: false,
    piiStored: false,
    resultStatus: resultStatus === "present_redacted" ? "present_redacted" : "missing",
  };
};

const firstIdempotencyRecord = (
  result: DbIdempotencyQueryResult,
): IdempotencyStoredRecord | null => mapDbRowToIdempotencyRecord(result.rows?.[0]);

const reserveStateFromDbRow = (
  value: unknown,
  fallback: IdempotencyStoredRecord,
): IdempotencyReserveState => {
  if (value && typeof value === "object") {
    const reserveState = normalizeText((value as Record<string, unknown>).reserve_state);
    if (
      [
        "reserved",
        "duplicate_in_flight",
        "duplicate_committed",
        "failed_retryable",
        "failed_final",
        "expired",
      ].includes(reserveState)
    ) {
      return reserveState as IdempotencyReserveState;
    }
  }
  return toReserveState(fallback);
};

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
    return isSafeIdempotencyAdapterKey(key);
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

export class DbIdempotencyAdapter implements IdempotencyAdapter {
  private readonly tableName: string | null;
  private readonly query: DbIdempotencyQuery | null;
  private readonly nowMs: () => number;

  constructor(options: DbIdempotencyAdapterOptions) {
    this.tableName = quoteIdempotencyDbTableName(options.tableName);
    this.query = options.query ?? null;
    this.nowMs = options.nowMs ?? now;
  }

  async reserve(input: IdempotencyReserveInput): Promise<IdempotencyReservation> {
    if (!isSafeIdempotencyAdapterKey(input.key)) return disabledReservation(IDEMPOTENCY_ADAPTER_INVALID_KEY);
    const persistence = this.getPersistence();
    if (!persistence) return disabledReservation(input.key);

    const currentMs = input.nowMs ?? this.nowMs();
    const expiresAtMs = currentMs + resolveInMemoryIdempotencyTtlMs(input.ttlMs);
    const result = await this.runQuery({
      operation: "reserve",
      sql: `
with inserted as (
  insert into ${persistence.tableName} (
    key, operation, status, attempts, created_at_ms, updated_at_ms,
    expires_at_ms, raw_payload_stored, pii_stored, result_status
  )
  values ($1, $2, 'reserved', 1, $3, $3, $4, false, false, 'missing')
  on conflict (key, operation) do nothing
  returning *
),
retryable as (
  update ${persistence.tableName}
  set status = 'reserved', attempts = attempts + 1, updated_at_ms = $3
  where key = $1 and operation = $2 and status = 'failed_retryable' and expires_at_ms > $3
  returning *
),
expired as (
  update ${persistence.tableName}
  set status = 'expired', updated_at_ms = $3
  where key = $1 and operation = $2 and expires_at_ms <= $3
  returning *
),
current_record as (
  select 0 as reserve_priority, *, 'reserved'::text as reserve_state from inserted
  union all select 1 as reserve_priority, *, 'reserved'::text as reserve_state from retryable
  union all select 2 as reserve_priority, *, 'expired'::text as reserve_state from expired
  union all
  select 3 as reserve_priority, *,
    case
      when status = 'reserved' then 'duplicate_in_flight'
      when status = 'committed' then 'duplicate_committed'
      else status
    end as reserve_state
  from ${persistence.tableName}
  where key = $1 and operation = $2
)
select * from current_record order by reserve_priority limit 1
      `,
      values: [input.key, input.operation, currentMs, expiresAtMs],
    });
    const record = firstIdempotencyRecord(result);
    if (!record) return disabledReservation(input.key);
    const state = reserveStateFromDbRow(result.rows?.[0], record);
    return { state, key: input.key, record };
  }

  async commit(key: string): Promise<IdempotencyReservation> {
    if (!isSafeIdempotencyAdapterKey(key)) return disabledReservation(IDEMPOTENCY_ADAPTER_INVALID_KEY);
    const persistence = this.getPersistence();
    if (!persistence) return disabledReservation(key);
    const result = await this.runQuery({
      operation: "commit",
      sql: `
update ${persistence.tableName}
set status = 'committed', updated_at_ms = $2, result_status = 'present_redacted'
where key = $1
returning *
      `,
      values: [key, this.nowMs()],
    });
    const record = firstIdempotencyRecord(result);
    return record
      ? { state: "duplicate_committed", key, record }
      : { state: "expired", key, record: null };
  }

  async fail(key: string, retryable: boolean): Promise<IdempotencyReservation> {
    if (!isSafeIdempotencyAdapterKey(key)) return disabledReservation(IDEMPOTENCY_ADAPTER_INVALID_KEY);
    const persistence = this.getPersistence();
    if (!persistence) return disabledReservation(key);
    const status: IdempotencyStoredStatus = retryable ? "failed_retryable" : "failed_final";
    const result = await this.runQuery({
      operation: "fail",
      sql: `
update ${persistence.tableName}
set status = $2, updated_at_ms = $3
where key = $1
returning *
      `,
      values: [key, status, this.nowMs()],
    });
    const record = firstIdempotencyRecord(result);
    return record ? { state: status, key, record } : { state: "expired", key, record: null };
  }

  async getStatus(key: string): Promise<IdempotencyStoredRecord | null> {
    const persistence = this.getPersistence();
    if (!isSafeIdempotencyAdapterKey(key) || !persistence) return null;
    const result = await this.runQuery({
      operation: "status",
      sql: `
select *
from ${persistence.tableName}
where key = $1
limit 1
      `,
      values: [key],
    });
    return firstIdempotencyRecord(result);
  }

  async releaseExpired(nowMs: number = this.nowMs()): Promise<number> {
    const persistence = this.getPersistence();
    if (!persistence) return 0;
    const result = await this.runQuery({
      operation: "releaseExpired",
      sql: `
update ${persistence.tableName}
set status = 'expired', updated_at_ms = $1
where expires_at_ms <= $1 and status <> 'expired'
returning key
      `,
      values: [nowMs],
    });
    return typeof result.rowCount === "number" ? result.rowCount : result.rows?.length ?? 0;
  }

  getHealth(): IdempotencyAdapterHealth {
    const persistence = this.getPersistence();
    const enabled = Boolean(persistence);
    return {
      kind: "db",
      enabled,
      externalNetworkEnabled: enabled,
      persistenceEnabledByDefault: false,
      reserved: 0,
      committed: 0,
      failed: 0,
      tableName: persistence?.tableName,
    };
  }

  private getPersistence(): { tableName: string; query: DbIdempotencyQuery } | null {
    if (!this.tableName || !this.query) return null;
    return { tableName: this.tableName, query: this.query };
  }

  private async runQuery(input: DbIdempotencyQueryInput): Promise<DbIdempotencyQueryResult> {
    if (!this.query) return {};
    try {
      return await this.query({
        ...input,
        sql: input.sql.trim(),
      });
    } catch {
      return {};
    }
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

export function createDbIdempotencyAdapterFromEnv(
  env: IdempotencyDbEnv = typeof process !== "undefined" ? process.env : {},
  options: CreateDbIdempotencyAdapterFromEnvOptions = {},
): IdempotencyAdapter {
  const runtimeConfig = resolveScaleProviderRuntimeConfig(env, {
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const idempotencyStatus = runtimeConfig.providers.idempotency_db;
  if (!idempotencyStatus.liveNetworkAllowed || !options.query) {
    return createDisabledIdempotencyAdapter();
  }

  return new DbIdempotencyAdapter({
    tableName: normalizeText(env.SCALE_IDEMPOTENCY_TABLE),
    query: options.query,
    nowMs: options.nowMs,
  });
}
