import { safeJsonParseValue, safeJsonStringify } from "../../lib/format";
import {
  getRateEnforcementPolicy,
  type RateEnforcementPolicy,
  type RateLimitEnforcementOperation,
} from "./rateLimitPolicies";
import {
  assertRateLimitKeyIsBounded,
  buildSafeRateLimitKey,
  type RateLimitKeyInput,
} from "./rateLimitKeySafety";
import {
  createNodeRedisUrlCommandExecutor,
  type RedisCommandExecutor,
} from "./cacheAdapters";
import {
  resolveScaleProviderRuntimeConfig,
  type ScaleProviderRuntimeEnvironment,
} from "./providerRuntimeConfig";
import {
  buildScaleObservabilityEvent,
  type ScaleObservabilityEventName,
  type ScaleObservabilityResult,
} from "./scaleObservabilityEvents";
import type { ScaleMetricName } from "./scaleMetricsPolicies";
import type {
  ScaleObservabilityAdapter,
  ScaleObservabilityRecordResult,
} from "./scaleObservabilityAdapters";

export type RateLimitDecisionState =
  | "allowed"
  | "soft_limited"
  | "hard_limited"
  | "blocked_abuse"
  | "disabled"
  | "unknown";

export type RateLimitAdapterKind =
  | "noop"
  | "in_memory"
  | "rate_store"
  | "redis_url"
  | "external_contract";

export type RateLimitDecision = {
  state: RateLimitDecisionState;
  key: string;
  operation: RateLimitEnforcementOperation | null;
  remaining: number | null;
  resetAtMs: number | null;
  retryAfterMs: number | null;
  enabled: boolean;
  realUserBlocked: false;
};

export type RateLimitCheckInput = {
  key: string;
  policy: RateEnforcementPolicy;
  cost?: number;
  nowMs?: number;
};

export type RateLimitStatus = {
  key: string;
  operation: RateLimitEnforcementOperation;
  count: number;
  resetAtMs: number;
};

export type RateLimitAdapterHealth = {
  kind: RateLimitAdapterKind;
  enabled: boolean;
  externalNetworkEnabled: boolean;
  enforcementEnabledByDefault: false;
  trackedKeys: number;
  namespace?: string;
  maxTrackedKeys?: number;
  evictedKeys?: number;
  expiredKeysPurged?: number;
  invalidKeyDecisions?: number;
};

export interface RateLimitAdapter {
  check(input: RateLimitCheckInput): Promise<RateLimitDecision>;
  consume(input: RateLimitCheckInput): Promise<RateLimitDecision>;
  refund(key: string, cost?: number): Promise<boolean>;
  reset(key: string): Promise<boolean>;
  getStatus(key: string): Promise<RateLimitStatus | null>;
  getHealth(): RateLimitAdapterHealth;
}

export type RateLimitStoreFetch = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  },
) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

export type RateLimitStoreAdapterOptions = {
  storeUrl: string;
  namespace: string;
  fetchImpl?: RateLimitStoreFetch;
};

export type RedisUrlRateLimitAdapterOptions = {
  redisUrl: string;
  namespace: string;
  commandImpl?: RedisCommandExecutor | null;
};

export type RateLimitStoreEnv = Record<string, string | undefined>;

export type CreateRateLimitAdapterFromEnvOptions = {
  runtimeEnvironment?: ScaleProviderRuntimeEnvironment;
  fetchImpl?: RateLimitStoreFetch;
  redisCommandImpl?: RedisCommandExecutor | null;
};

const disabledDecision = (
  key: string,
  operation: RateLimitEnforcementOperation | null = null,
): RateLimitDecision => ({
  state: "disabled",
  key,
  operation,
  remaining: null,
  resetAtMs: null,
  retryAfterMs: null,
  enabled: false,
  realUserBlocked: false,
});

const unknownDecision = (
  key: string,
  operation: RateLimitEnforcementOperation | null,
): RateLimitDecision => ({
  state: "unknown",
  key,
  operation,
  remaining: null,
  resetAtMs: null,
  retryAfterMs: null,
  enabled: true,
  realUserBlocked: false,
});

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const normalizeRateStoreUrl = (value: string): string => normalizeText(value).replace(/\/+$/g, "");

const normalizeRedisUrl = (value: string): string => normalizeText(value);

const isRedisProtocolUrl = (value: string): boolean => /^rediss?:\/\//i.test(value.trim());

const isSafeRateLimitNamespace = (namespace: string): boolean =>
  namespace.length > 0 && namespace.length <= 64 && /^[A-Za-z0-9][A-Za-z0-9:_-]*$/.test(namespace);

const resolveRateLimitCost = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : 1;
};

const defaultRateLimitStoreFetch = (): RateLimitStoreFetch | null => {
  if (typeof globalThis.fetch !== "function") return null;
  return globalThis.fetch as RateLimitStoreFetch;
};

const buildNamespacedRateLimitKey = (namespace: string, key: string): string | null => {
  if (!isSafeRateLimitNamespace(namespace) || !assertRateLimitKeyIsBounded(key)) return null;
  return `${namespace}:${key}`;
};

const decisionStateFromValue = (value: unknown): RateLimitDecisionState | null => {
  if (
    value === "allowed" ||
    value === "soft_limited" ||
    value === "hard_limited" ||
    value === "blocked_abuse" ||
    value === "disabled" ||
    value === "unknown"
  ) {
    return value;
  }
  return null;
};

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const mapStoreDecision = (
  payload: unknown,
  fallback: RateLimitDecision,
): RateLimitDecision => {
  const source =
    payload && typeof payload === "object" && "decision" in payload
      ? (payload as { decision: unknown }).decision
      : payload && typeof payload === "object" && "result" in payload
        ? (payload as { result: unknown }).result
        : payload;
  if (!source || typeof source !== "object") return fallback;
  const record = source as Record<string, unknown>;
  const state = decisionStateFromValue(record.state);
  if (!state) return fallback;
  return {
    state,
    key: typeof record.key === "string" ? record.key : fallback.key,
    operation:
      typeof record.operation === "string"
        ? (record.operation as RateLimitEnforcementOperation)
        : fallback.operation,
    remaining: numberOrNull(record.remaining),
    resetAtMs: numberOrNull(record.resetAtMs ?? record.reset_at_ms),
    retryAfterMs: numberOrNull(record.retryAfterMs ?? record.retry_after_ms),
    enabled: true,
    realUserBlocked: false,
  };
};

const mapStoreStatus = (payload: unknown): RateLimitStatus | null => {
  const source =
    payload && typeof payload === "object" && "status" in payload
      ? (payload as { status: unknown }).status
      : payload && typeof payload === "object" && "result" in payload
        ? (payload as { result: unknown }).result
        : payload;
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  const key = normalizeText(record.key);
  const operation = normalizeText(record.operation) as RateLimitEnforcementOperation;
  const count = numberOrNull(record.count);
  const resetAtMs = numberOrNull(record.resetAtMs ?? record.reset_at_ms);
  if (!key || !operation || count === null || resetAtMs === null) return null;
  return { key, operation, count, resetAtMs };
};

export class NoopRateLimitAdapter implements RateLimitAdapter {
  async check(input: RateLimitCheckInput): Promise<RateLimitDecision> {
    return disabledDecision(input.key, input.policy.operation);
  }

  async consume(input: RateLimitCheckInput): Promise<RateLimitDecision> {
    return disabledDecision(input.key, input.policy.operation);
  }

  async refund(_key: string, _cost = 1): Promise<boolean> {
    return false;
  }

  async reset(_key: string): Promise<boolean> {
    return false;
  }

  async getStatus(_key: string): Promise<RateLimitStatus | null> {
    return null;
  }

  getHealth(): RateLimitAdapterHealth {
    return {
      kind: "noop",
      enabled: false,
      externalNetworkEnabled: false,
      enforcementEnabledByDefault: false,
      trackedKeys: 0,
    };
  }
}

type MemoryRecord = {
  operation: RateLimitEnforcementOperation;
  count: number;
  resetAtMs: number;
};

export const IN_MEMORY_RATE_LIMIT_DEFAULT_MAX_TRACKED_KEYS = 1_000;
export const IN_MEMORY_RATE_LIMIT_MAX_TRACKED_KEYS = 10_000;
export const IN_MEMORY_RATE_LIMIT_MAX_WINDOW_MS = 60 * 60 * 1_000;
const IN_MEMORY_RATE_LIMIT_DEFAULT_WINDOW_MS = 60_000;
const INVALID_RATE_LIMIT_KEY = "rate:v1:invalid";

export type InMemoryRateLimitAdapterOptions = {
  now?: () => number;
  maxTrackedKeys?: number;
};

export function resolveInMemoryRateLimitMaxTrackedKeys(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return IN_MEMORY_RATE_LIMIT_DEFAULT_MAX_TRACKED_KEYS;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) return IN_MEMORY_RATE_LIMIT_DEFAULT_MAX_TRACKED_KEYS;
  return Math.min(normalized, IN_MEMORY_RATE_LIMIT_MAX_TRACKED_KEYS);
}

const resolveInMemoryRateLimitWindowMs = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return IN_MEMORY_RATE_LIMIT_DEFAULT_WINDOW_MS;
  }

  const normalized = Math.trunc(value);
  if (normalized <= 0) return IN_MEMORY_RATE_LIMIT_DEFAULT_WINDOW_MS;
  return Math.min(normalized, IN_MEMORY_RATE_LIMIT_MAX_WINDOW_MS);
};

export class InMemoryRateLimitAdapter implements RateLimitAdapter {
  private readonly records = new Map<string, MemoryRecord>();
  private readonly now: () => number;
  private readonly maxTrackedKeys: number;
  private evictedKeys = 0;
  private expiredKeysPurged = 0;
  private invalidKeyDecisions = 0;

  constructor(
    nowOrOptions: (() => number) | InMemoryRateLimitAdapterOptions = () =>
      Date.now(),
  ) {
    if (typeof nowOrOptions === "function") {
      this.now = nowOrOptions;
      this.maxTrackedKeys = IN_MEMORY_RATE_LIMIT_DEFAULT_MAX_TRACKED_KEYS;
      return;
    }

    this.now = nowOrOptions.now ?? (() => Date.now());
    this.maxTrackedKeys = resolveInMemoryRateLimitMaxTrackedKeys(
      nowOrOptions.maxTrackedKeys,
    );
  }

  private isSafeKey(key: string): boolean {
    return assertRateLimitKeyIsBounded(key);
  }

  private disabledForInvalidKey(input: RateLimitCheckInput): RateLimitDecision {
    this.invalidKeyDecisions += 1;
    return disabledDecision(INVALID_RATE_LIMIT_KEY, input.policy.operation);
  }

  private purgeExpired(nowMs: number): void {
    for (const [key, record] of this.records) {
      if (record.resetAtMs <= nowMs) {
        this.records.delete(key);
        this.expiredKeysPurged += 1;
      }
    }
  }

  private evictOldestIfNeeded(): void {
    while (this.records.size > this.maxTrackedKeys) {
      const oldestKey = this.records.keys().next().value;
      if (typeof oldestKey !== "string") return;
      this.records.delete(oldestKey);
      this.evictedKeys += 1;
    }
  }

  private getRecord(input: RateLimitCheckInput): MemoryRecord | null {
    if (!this.isSafeKey(input.key)) return null;

    const nowMs = input.nowMs ?? this.now();
    this.purgeExpired(nowMs);

    const existing = this.records.get(input.key);
    if (existing && existing.resetAtMs > nowMs) return existing;

    const next: MemoryRecord = {
      operation: input.policy.operation,
      count: 0,
      resetAtMs:
        nowMs + resolveInMemoryRateLimitWindowMs(input.policy.windowMs),
    };
    this.records.set(input.key, next);
    this.evictOldestIfNeeded();
    return this.records.get(input.key) ?? null;
  }

  private buildDecision(
    input: RateLimitCheckInput,
    nextCount: number,
    record: MemoryRecord,
  ): RateLimitDecision {
    const allowedBudget = input.policy.maxRequests;
    const burstBudget = input.policy.maxRequests + input.policy.burst;
    const state: RateLimitDecisionState =
      nextCount <= allowedBudget
        ? "allowed"
        : nextCount <= burstBudget
          ? "soft_limited"
          : "hard_limited";

    return {
      state,
      key: input.key,
      operation: input.policy.operation,
      remaining: Math.max(0, allowedBudget - nextCount),
      resetAtMs: record.resetAtMs,
      retryAfterMs:
        state === "hard_limited"
          ? Math.max(0, record.resetAtMs - (input.nowMs ?? this.now()))
          : null,
      enabled: true,
      realUserBlocked: false,
    };
  }

  async check(input: RateLimitCheckInput): Promise<RateLimitDecision> {
    const cost = resolveRateLimitCost(input.cost ?? 1);
    const record = this.getRecord(input);
    if (!record) return this.disabledForInvalidKey(input);
    return this.buildDecision(input, record.count + cost, record);
  }

  async consume(input: RateLimitCheckInput): Promise<RateLimitDecision> {
    const cost = resolveRateLimitCost(input.cost ?? 1);
    const record = this.getRecord(input);
    if (!record) return this.disabledForInvalidKey(input);
    const nextCount = record.count + cost;
    const decision = this.buildDecision(input, nextCount, record);
    if (decision.state !== "hard_limited") {
      record.count = nextCount;
    }
    return decision;
  }

  async refund(key: string, cost = 1): Promise<boolean> {
    if (!this.isSafeKey(key)) return false;
    const record = this.records.get(key);
    if (!record) return false;
    record.count = Math.max(0, record.count - resolveRateLimitCost(cost));
    return true;
  }

  async reset(key: string): Promise<boolean> {
    if (!this.isSafeKey(key)) return false;
    return this.records.delete(key);
  }

  async getStatus(key: string): Promise<RateLimitStatus | null> {
    if (!this.isSafeKey(key)) return null;
    const record = this.records.get(key);
    return record ? { key, ...record } : null;
  }

  getHealth(): RateLimitAdapterHealth {
    return {
      kind: "in_memory",
      enabled: true,
      externalNetworkEnabled: false,
      enforcementEnabledByDefault: false,
      trackedKeys: this.records.size,
      maxTrackedKeys: this.maxTrackedKeys,
      evictedKeys: this.evictedKeys,
      expiredKeysPurged: this.expiredKeysPurged,
      invalidKeyDecisions: this.invalidKeyDecisions,
    };
  }
}

export class RateLimitStoreAdapter implements RateLimitAdapter {
  private readonly storeUrl: string;
  private readonly namespace: string;
  private readonly fetchImpl: RateLimitStoreFetch | null;

  constructor(options: RateLimitStoreAdapterOptions) {
    this.storeUrl = normalizeRateStoreUrl(options.storeUrl);
    this.namespace = normalizeText(options.namespace);
    this.fetchImpl = options.fetchImpl ?? defaultRateLimitStoreFetch();
  }

  async check(input: RateLimitCheckInput): Promise<RateLimitDecision> {
    return this.commandDecision("check", input);
  }

  async consume(input: RateLimitCheckInput): Promise<RateLimitDecision> {
    return this.commandDecision("consume", input);
  }

  async refund(key: string, cost = 1): Promise<boolean> {
    if (!assertRateLimitKeyIsBounded(key)) return false;
    const result = await this.command("refund", {
      key,
      cost: resolveRateLimitCost(cost),
    });
    return Boolean(result && typeof result === "object" && (result as { ok?: unknown }).ok === true);
  }

  async reset(key: string): Promise<boolean> {
    if (!assertRateLimitKeyIsBounded(key)) return false;
    const result = await this.command("reset", { key });
    return Boolean(result && typeof result === "object" && (result as { ok?: unknown }).ok === true);
  }

  async getStatus(key: string): Promise<RateLimitStatus | null> {
    if (!assertRateLimitKeyIsBounded(key)) return null;
    return mapStoreStatus(await this.command("status", { key }));
  }

  getHealth(): RateLimitAdapterHealth {
    const enabled = this.canUseStore();
    return {
      kind: "rate_store",
      enabled,
      externalNetworkEnabled: enabled,
      enforcementEnabledByDefault: false,
      trackedKeys: 0,
      namespace: enabled ? this.namespace : undefined,
    };
  }

  private async commandDecision(
    operation: "check" | "consume",
    input: RateLimitCheckInput,
  ): Promise<RateLimitDecision> {
    if (!assertRateLimitKeyIsBounded(input.key)) {
      return disabledDecision(INVALID_RATE_LIMIT_KEY, input.policy.operation);
    }
    const fallback = unknownDecision(input.key, input.policy.operation);
    const result = await this.command(operation, {
      key: input.key,
      operation: input.policy.operation,
      cost: resolveRateLimitCost(input.cost ?? 1),
      nowMs: input.nowMs ?? null,
      policy: {
        maxRequests: input.policy.maxRequests,
        burst: input.policy.burst,
        windowMs: input.policy.windowMs,
        enforcementEnabledByDefault: false,
      },
    });
    return mapStoreDecision(result, fallback);
  }

  private canUseStore(): boolean {
    return (
      this.storeUrl.length > 0 &&
      isSafeRateLimitNamespace(this.namespace) &&
      this.fetchImpl !== null
    );
  }

  private async command(operation: string, payload: Record<string, unknown>): Promise<unknown | null> {
    if (!this.canUseStore() || !this.fetchImpl) return null;
    try {
      const response = await this.fetchImpl(this.storeUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          command: operation,
          namespace: this.namespace,
        }),
      });
      if (!response.ok) return null;
      const responsePayload = await response.json();
      if (responsePayload && typeof responsePayload === "object" && "result" in responsePayload) {
        return (responsePayload as { result: unknown }).result;
      }
      return responsePayload;
    } catch {
      return null;
    }
  }
}

type RedisRateLimitRecord = {
  operation: RateLimitEnforcementOperation;
  count: number;
  resetAtMs: number;
};

const serializeRedisRateLimitRecord = (record: RedisRateLimitRecord): string | null => {
  return safeJsonStringify(record, "") || null;
};

const parseRedisRateLimitRecord = (value: unknown): RedisRateLimitRecord | null => {
  if (typeof value !== "string") return null;
  const parsed = safeJsonParseValue<unknown | null>(value, null);
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const operation = normalizeText(record.operation) as RateLimitEnforcementOperation;
  const count = numberOrNull(record.count);
  const resetAtMs = numberOrNull(record.resetAtMs);
  if (!operation || count === null || resetAtMs === null) return null;
  return { operation, count, resetAtMs };
};

const resolveRedisRateLimitWindowMs = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 60_000;
  const normalized = Math.trunc(value);
  if (normalized <= 0) return 60_000;
  return Math.min(normalized, IN_MEMORY_RATE_LIMIT_MAX_WINDOW_MS);
};

export class RedisUrlRateLimitAdapter implements RateLimitAdapter {
  private readonly redisUrl: string;
  private readonly namespace: string;
  private readonly commandImpl: RedisCommandExecutor | null;

  constructor(options: RedisUrlRateLimitAdapterOptions) {
    this.redisUrl = normalizeRedisUrl(options.redisUrl);
    this.namespace = normalizeText(options.namespace);
    this.commandImpl = options.commandImpl ?? createNodeRedisUrlCommandExecutor(this.redisUrl);
  }

  async check(input: RateLimitCheckInput): Promise<RateLimitDecision> {
    return this.commandDecision(input, false);
  }

  async consume(input: RateLimitCheckInput): Promise<RateLimitDecision> {
    return this.commandDecision(input, true);
  }

  async refund(key: string, cost = 1): Promise<boolean> {
    const redisKey = buildNamespacedRateLimitKey(this.namespace, key);
    if (!redisKey || !this.canUseStore() || !this.commandImpl) return false;
    const record = await this.readRecord(redisKey, Date.now());
    if (!record) return false;
    const nextRecord = {
      ...record,
      count: Math.max(0, record.count - resolveRateLimitCost(cost)),
    };
    return this.writeRecord(redisKey, nextRecord, Date.now());
  }

  async reset(key: string): Promise<boolean> {
    const redisKey = buildNamespacedRateLimitKey(this.namespace, key);
    if (!redisKey || !this.canUseStore() || !this.commandImpl) return false;
    try {
      const deleted = await this.commandImpl(["DEL", redisKey]);
      return typeof deleted === "number" ? deleted > 0 : Boolean(deleted);
    } catch {
      return false;
    }
  }

  async getStatus(key: string): Promise<RateLimitStatus | null> {
    const redisKey = buildNamespacedRateLimitKey(this.namespace, key);
    if (!redisKey) return null;
    const record = await this.readRecord(redisKey, Date.now());
    return record ? { key, ...record } : null;
  }

  getHealth(): RateLimitAdapterHealth {
    const enabled = this.canUseStore();
    return {
      kind: "redis_url",
      enabled,
      externalNetworkEnabled: enabled,
      enforcementEnabledByDefault: false,
      trackedKeys: 0,
      namespace: enabled ? this.namespace : undefined,
    };
  }

  private async commandDecision(
    input: RateLimitCheckInput,
    shouldConsume: boolean,
  ): Promise<RateLimitDecision> {
    const redisKey = buildNamespacedRateLimitKey(this.namespace, input.key);
    if (!redisKey) return disabledDecision(INVALID_RATE_LIMIT_KEY, input.policy.operation);
    if (!this.canUseStore()) return unknownDecision(input.key, input.policy.operation);

    const nowMs = input.nowMs ?? Date.now();
    const record = await this.readOrCreateRecord(redisKey, input, nowMs);
    if (!record) return unknownDecision(input.key, input.policy.operation);

    const cost = resolveRateLimitCost(input.cost ?? 1);
    const nextCount = record.count + cost;
    const decision = this.buildDecision(input, nextCount, record, nowMs);
    if (shouldConsume && decision.state !== "hard_limited") {
      const nextRecord = { ...record, count: nextCount };
      await this.writeRecord(redisKey, nextRecord, nowMs);
    }
    return decision;
  }

  private buildDecision(
    input: RateLimitCheckInput,
    nextCount: number,
    record: RedisRateLimitRecord,
    nowMs: number,
  ): RateLimitDecision {
    const allowedBudget = input.policy.maxRequests;
    const burstBudget = input.policy.maxRequests + input.policy.burst;
    const state: RateLimitDecisionState =
      nextCount <= allowedBudget
        ? "allowed"
        : nextCount <= burstBudget
          ? "soft_limited"
          : "hard_limited";

    return {
      state,
      key: input.key,
      operation: input.policy.operation,
      remaining: Math.max(0, allowedBudget - nextCount),
      resetAtMs: record.resetAtMs,
      retryAfterMs: state === "hard_limited" ? Math.max(0, record.resetAtMs - nowMs) : null,
      enabled: true,
      realUserBlocked: false,
    };
  }

  private async readOrCreateRecord(
    redisKey: string,
    input: RateLimitCheckInput,
    nowMs: number,
  ): Promise<RedisRateLimitRecord | null> {
    const existing = await this.readRecord(redisKey, nowMs);
    if (existing) return existing;
    const record = {
      operation: input.policy.operation,
      count: 0,
      resetAtMs: nowMs + resolveRedisRateLimitWindowMs(input.policy.windowMs),
    };
    return (await this.writeRecord(redisKey, record, nowMs)) ? record : null;
  }

  private async readRecord(redisKey: string, nowMs: number): Promise<RedisRateLimitRecord | null> {
    if (!this.canUseStore() || !this.commandImpl) return null;
    try {
      const record = parseRedisRateLimitRecord(await this.commandImpl(["GET", redisKey]));
      if (!record || record.resetAtMs <= nowMs) {
        await this.commandImpl(["DEL", redisKey]);
        return null;
      }
      return record;
    } catch {
      return null;
    }
  }

  private async writeRecord(
    redisKey: string,
    record: RedisRateLimitRecord,
    nowMs: number,
  ): Promise<boolean> {
    if (!this.canUseStore() || !this.commandImpl) return false;
    const serialized = serializeRedisRateLimitRecord(record);
    if (!serialized) return false;
    const ttlMs = Math.max(1, record.resetAtMs - nowMs);
    try {
      const result = await this.commandImpl(["SET", redisKey, serialized, "PX", ttlMs]);
      return result === "OK" || result === "ok" || result === true;
    } catch {
      return false;
    }
  }

  private canUseStore(): boolean {
    return (
      isRedisProtocolUrl(this.redisUrl) &&
      isSafeRateLimitNamespace(this.namespace) &&
      this.commandImpl !== null
    );
  }
}

export const EXTERNAL_RATE_LIMIT_ADAPTER_CONTRACT = Object.freeze({
  kind: "external_contract" as const,
  check: "contract_only",
  consume: "contract_only",
  refund: "contract_only",
  reset: "contract_only",
  externalStoreCallsInTests: false,
  enforcementEnabledByDefault: false,
});

export function createDisabledRateLimitAdapter(): RateLimitAdapter {
  return new NoopRateLimitAdapter();
}

export function createRateLimitAdapterFromEnv(
  env: RateLimitStoreEnv = typeof process !== "undefined" ? process.env : {},
  options: CreateRateLimitAdapterFromEnvOptions = {},
): RateLimitAdapter {
  const runtimeConfig = resolveScaleProviderRuntimeConfig(env, {
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const rateStatus = runtimeConfig.providers.rate_limit;
  if (!rateStatus.liveNetworkAllowed) return createDisabledRateLimitAdapter();

  const storeUrl = normalizeText(env.SCALE_RATE_LIMIT_STORE_URL);
  const namespace = normalizeText(env.SCALE_RATE_LIMIT_NAMESPACE);
  if (isRedisProtocolUrl(storeUrl)) {
    return new RedisUrlRateLimitAdapter({
      redisUrl: storeUrl,
      namespace,
      commandImpl: options.redisCommandImpl,
    });
  }

  return new RateLimitStoreAdapter({
    storeUrl,
    namespace,
    fetchImpl: options.fetchImpl,
  });
}

export type RateEnforcementMode =
  | "disabled"
  | "observe_only"
  | "enforce_staging_test_namespace_only"
  | "enforce_production_synthetic_canary_only"
  | "enforce_production_real_user_route_canary_only";

export type RateEnforcementAction = "disabled" | "observe" | "allow" | "block";

export type RuntimeRateEnforcementEnv = RateLimitStoreEnv & {
  SCALE_RATE_ENFORCEMENT_MODE?: string;
  SCALE_RATE_LIMIT_TEST_NAMESPACE?: string;
  SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST?: string;
  SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT?: string;
};

export type RuntimeRateEnforcementInput = {
  operation: RateLimitEnforcementOperation;
  keyInput: RateLimitKeyInput;
  syntheticCanary?: boolean;
  cost?: number;
  nowMs?: number;
};

export type RuntimeRateEnforcementDecision = {
  action: RateEnforcementAction;
  mode: RateEnforcementMode;
  operation: RateLimitEnforcementOperation;
  providerState: RateLimitDecisionState | "policy_missing" | "key_rejected";
  providerEnabled: boolean;
  blocked: boolean;
  realUsersBlocked: false;
  routeScopedCanary: boolean;
  routeCanarySelected: boolean;
  enforcementNamespace: string | null;
  isolatedTestNamespace: string | null;
  safeSubjectHash: string | null;
  keyLength: number | null;
  rawPiiInKey: false;
  rawPayloadLogged: false;
  piiLogged: false;
  reason: string;
};

export type RuntimeRateEnforcementHealth = {
  mode: RateEnforcementMode;
  runtimeEnvironment: ScaleProviderRuntimeEnvironment;
  providerEnabled: boolean;
  externalNetworkEnabled: boolean;
  productionGuard: boolean;
  namespace: string | null;
  isolatedTestNamespace: string | null;
  routeCanaryAllowlistCount: number;
  routeCanaryPercent: number;
  blocksRealUsersGlobally: false;
};

export type RuntimeRateEnforcementProviderOptions = {
  mode?: RateEnforcementMode;
  runtimeEnvironment?: ScaleProviderRuntimeEnvironment;
  adapter?: RateLimitAdapter;
  namespace?: string | null;
  isolatedTestNamespace?: string | null;
  routeCanaryAllowlist?: readonly RateLimitEnforcementOperation[] | null;
  routeCanaryPercent?: number;
};

export type CreateRateEnforcementProviderFromEnvOptions = {
  runtimeEnvironment?: ScaleProviderRuntimeEnvironment;
  adapter?: RateLimitAdapter;
  fetchImpl?: RateLimitStoreFetch;
};

export const RATE_ENFORCEMENT_MODE_ENV_NAME = "SCALE_RATE_ENFORCEMENT_MODE";
export const RATE_LIMIT_TEST_NAMESPACE_ENV_NAME = "SCALE_RATE_LIMIT_TEST_NAMESPACE";
export const RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST_ENV_NAME =
  "SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST";
export const RATE_LIMIT_REAL_USER_CANARY_PERCENT_ENV_NAME =
  "SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT";

export type RateLimitPrivateSmokeStatus =
  | "ready"
  | "config_missing"
  | "policy_missing"
  | "key_rejected"
  | "adapter_unavailable"
  | "allow_failed"
  | "throttle_failed"
  | "cleanup_failed";

export type RateLimitPrivateSmokeResult = {
  status: RateLimitPrivateSmokeStatus;
  operation: RateLimitEnforcementOperation;
  providerKind: RateLimitAdapterKind;
  providerEnabled: boolean;
  externalNetworkEnabled: boolean;
  namespacePresent: boolean;
  syntheticIdentityUsed: boolean;
  realUserIdentityUsed: false;
  wouldAllowVerified: boolean;
  wouldThrottleVerified: boolean;
  cleanupAttempted: boolean;
  cleanupOk: boolean;
  ttlBounded: boolean;
  enforcementEnabled: false;
  productionUserBlocked: false;
  rawKeyReturned: false;
  rawPayloadLogged: false;
  piiLogged: false;
  reason: string;
};

export type RateLimitPrivateSmokeRunner = {
  run(): Promise<RateLimitPrivateSmokeResult>;
};

export type RateLimitSyntheticEnforcementCanaryResult = {
  attempted: boolean;
  mode: RateEnforcementMode;
  operation: RateLimitEnforcementOperation;
  action: RateEnforcementAction;
  providerState: RuntimeRateEnforcementDecision["providerState"];
  providerEnabled: boolean;
  blockedVerified: boolean;
  syntheticIdentityUsed: boolean;
  realUserIdentityUsed: false;
  productionUserBlocked: false;
  rawKeyReturned: false;
  rawPayloadLogged: false;
  piiLogged: false;
  reason: string;
  decision: RuntimeRateEnforcementDecision | null;
};

export type RunRateLimitPrivateSyntheticSmokeOptions = {
  adapter: RateLimitAdapter;
  operation?: RateLimitEnforcementOperation;
  nowMs?: number;
};

export type CreateRateLimitPrivateSmokeRunnerFromEnvOptions = {
  redisCommandImpl?: RedisCommandExecutor | null;
};

const RATE_LIMIT_PRIVATE_SMOKE_OPERATION: RateLimitEnforcementOperation = "proposal.submit";
const RATE_LIMIT_PRIVATE_SMOKE_KEY_INPUT: RateLimitKeyInput = Object.freeze({
  actorId: "synthetic-rate-smoke-actor",
  companyId: "synthetic-rate-smoke-company",
  routeKey: "rate-limit-private-smoke",
  idempotencyKey: "synthetic-rate-smoke-idempotency",
});

const privateSmokeResult = (
  overrides: Partial<RateLimitPrivateSmokeResult>,
): RateLimitPrivateSmokeResult => ({
  status: "config_missing",
  operation: RATE_LIMIT_PRIVATE_SMOKE_OPERATION,
  providerKind: "noop",
  providerEnabled: false,
  externalNetworkEnabled: false,
  namespacePresent: false,
  syntheticIdentityUsed: false,
  realUserIdentityUsed: false,
  wouldAllowVerified: false,
  wouldThrottleVerified: false,
  cleanupAttempted: false,
  cleanupOk: false,
  ttlBounded: false,
  enforcementEnabled: false,
  productionUserBlocked: false,
  rawKeyReturned: false,
  rawPayloadLogged: false,
  piiLogged: false,
  reason: "not_run",
  ...overrides,
});

export async function runRateLimitPrivateSyntheticSmoke(
  options: RunRateLimitPrivateSyntheticSmokeOptions,
): Promise<RateLimitPrivateSmokeResult> {
  const operation = options.operation ?? RATE_LIMIT_PRIVATE_SMOKE_OPERATION;
  const policy = getRateEnforcementPolicy(operation);
  const health = options.adapter.getHealth();
  if (!policy) {
    return privateSmokeResult({
      status: "policy_missing",
      operation,
      providerKind: health.kind,
      providerEnabled: health.enabled,
      externalNetworkEnabled: health.externalNetworkEnabled,
      namespacePresent: Boolean(health.namespace),
      reason: "policy_missing",
    });
  }

  const safeKey = buildSafeRateLimitKey(policy, RATE_LIMIT_PRIVATE_SMOKE_KEY_INPUT);
  if (!safeKey.ok) {
    return privateSmokeResult({
      status: "key_rejected",
      operation,
      providerKind: health.kind,
      providerEnabled: health.enabled,
      externalNetworkEnabled: health.externalNetworkEnabled,
      namespacePresent: Boolean(health.namespace),
      reason: safeKey.reason,
    });
  }

  if (!health.enabled || !health.externalNetworkEnabled) {
    return privateSmokeResult({
      status: "adapter_unavailable",
      operation,
      providerKind: health.kind,
      providerEnabled: health.enabled,
      externalNetworkEnabled: health.externalNetworkEnabled,
      namespacePresent: Boolean(health.namespace),
      syntheticIdentityUsed: true,
      reason: "adapter_unavailable",
    });
  }

  const nowMs = options.nowMs ?? Date.now();
  const cleanupBefore = await options.adapter.reset(safeKey.key).catch(() => false);
  const allowDecision = await options.adapter
    .consume({ key: safeKey.key, policy, cost: 1, nowMs })
    .catch(() => null);
  const statusAfterAllow = await options.adapter.getStatus(safeKey.key).catch(() => null);
  const throttleDecision = await options.adapter
    .consume({
      key: safeKey.key,
      policy,
      cost: policy.maxRequests + policy.burst + 1,
      nowMs,
    })
    .catch(() => null);
  const cleanupAfter = await options.adapter.reset(safeKey.key).catch(() => false);
  const statusAfterCleanup = await options.adapter.getStatus(safeKey.key).catch(() => null);
  const wouldAllowVerified = allowDecision?.state === "allowed";
  const wouldThrottleVerified =
    throttleDecision?.state === "soft_limited" || throttleDecision?.state === "hard_limited";
  const ttlBounded =
    statusAfterAllow !== null &&
    statusAfterAllow.resetAtMs > nowMs &&
    statusAfterAllow.resetAtMs - nowMs <= policy.windowMs;
  const cleanupOk = statusAfterCleanup === null && (cleanupBefore || cleanupAfter);

  if (!wouldAllowVerified) {
    return privateSmokeResult({
      status: "allow_failed",
      operation,
      providerKind: health.kind,
      providerEnabled: health.enabled,
      externalNetworkEnabled: health.externalNetworkEnabled,
      namespacePresent: Boolean(health.namespace),
      syntheticIdentityUsed: true,
      cleanupAttempted: true,
      cleanupOk,
      ttlBounded,
      reason: "allow_failed",
    });
  }
  if (!wouldThrottleVerified) {
    return privateSmokeResult({
      status: "throttle_failed",
      operation,
      providerKind: health.kind,
      providerEnabled: health.enabled,
      externalNetworkEnabled: health.externalNetworkEnabled,
      namespacePresent: Boolean(health.namespace),
      syntheticIdentityUsed: true,
      wouldAllowVerified,
      cleanupAttempted: true,
      cleanupOk,
      ttlBounded,
      reason: "throttle_failed",
    });
  }
  if (!cleanupOk) {
    return privateSmokeResult({
      status: "cleanup_failed",
      operation,
      providerKind: health.kind,
      providerEnabled: health.enabled,
      externalNetworkEnabled: health.externalNetworkEnabled,
      namespacePresent: Boolean(health.namespace),
      syntheticIdentityUsed: true,
      wouldAllowVerified,
      wouldThrottleVerified,
      cleanupAttempted: true,
      cleanupOk,
      ttlBounded,
      reason: "cleanup_failed",
    });
  }

  return privateSmokeResult({
    status: "ready",
    operation,
    providerKind: health.kind,
    providerEnabled: health.enabled,
    externalNetworkEnabled: health.externalNetworkEnabled,
    namespacePresent: Boolean(health.namespace),
    syntheticIdentityUsed: true,
    wouldAllowVerified,
    wouldThrottleVerified,
    cleanupAttempted: true,
    cleanupOk,
    ttlBounded,
    reason: "synthetic_private_smoke_ready",
  });
}

export function createRateLimitPrivateSmokeRunnerFromEnv(
  env: RateLimitStoreEnv = typeof process !== "undefined" ? process.env : {},
  options: CreateRateLimitPrivateSmokeRunnerFromEnvOptions = {},
): RateLimitPrivateSmokeRunner | null {
  const redisUrl = normalizeText(env.SCALE_RATE_LIMIT_STORE_URL);
  const namespace = normalizeText(env.SCALE_RATE_LIMIT_NAMESPACE);
  if (!isRedisProtocolUrl(redisUrl) || !isSafeRateLimitNamespace(namespace)) {
    return null;
  }

  const adapter = new RedisUrlRateLimitAdapter({
    redisUrl,
    namespace,
    commandImpl: options.redisCommandImpl,
  });
  return {
    run: () => runRateLimitPrivateSyntheticSmoke({ adapter }),
  };
}

const isIsolatedStagingTestNamespace = (namespace: string, expected: string): boolean => {
  const normalized = normalizeText(namespace).toLowerCase();
  const normalizedExpected = normalizeText(expected).toLowerCase();
  return (
    normalized.length > 0 &&
    normalized === normalizedExpected &&
    isSafeRateLimitNamespace(namespace) &&
    normalized.includes("staging") &&
    normalized.includes("test")
  );
};

const MAX_REAL_USER_CANARY_PERCENT = 100;

const parseRouteCanaryPercent = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(Math.trunc(parsed), 0), MAX_REAL_USER_CANARY_PERCENT);
};

const parseRouteCanaryAllowlist = (value: unknown): readonly RateLimitEnforcementOperation[] => {
  const operations = normalizeText(value)
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const safeOperations: RateLimitEnforcementOperation[] = [];
  for (const operation of operations) {
    const policy = getRateEnforcementPolicy(operation as RateLimitEnforcementOperation);
    if (policy?.category === "read") safeOperations.push(policy.operation);
  }
  return Array.from(new Set(safeOperations));
};

const hashForRouteCanaryPercent = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const selectedForRouteCanary = (safeSubjectHash: string | null, percent: number): boolean => {
  if (!safeSubjectHash) return false;
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return hashForRouteCanaryPercent(safeSubjectHash) % 100 < percent;
};

export function resolveRateEnforcementMode(value: unknown): RateEnforcementMode {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "observe_only") return "observe_only";
  if (normalized === "enforce_staging_test_namespace_only") return "enforce_staging_test_namespace_only";
  if (normalized === "enforce_production_synthetic_canary_only") {
    return "enforce_production_synthetic_canary_only";
  }
  if (normalized === "enforce_production_real_user_route_canary_only") {
    return "enforce_production_real_user_route_canary_only";
  }
  return "disabled";
}

const disabledRuntimeRateDecision = (
  input: RuntimeRateEnforcementInput,
  mode: RateEnforcementMode,
  reason: string,
  namespace: string | null,
  isolatedTestNamespace: string | null,
): RuntimeRateEnforcementDecision => ({
  action: "disabled",
  mode,
  operation: input.operation,
  providerState: "disabled",
  providerEnabled: false,
  blocked: false,
  realUsersBlocked: false,
  routeScopedCanary: false,
  routeCanarySelected: false,
  enforcementNamespace: namespace,
  isolatedTestNamespace,
  safeSubjectHash: null,
  keyLength: null,
  rawPiiInKey: false,
  rawPayloadLogged: false,
  piiLogged: false,
  reason,
});

export class RuntimeRateEnforcementProvider {
  private readonly mode: RateEnforcementMode;
  private readonly runtimeEnvironment: ScaleProviderRuntimeEnvironment;
  private readonly adapter: RateLimitAdapter;
  private readonly namespace: string | null;
  private readonly isolatedTestNamespace: string | null;
  private readonly routeCanaryAllowlist: readonly RateLimitEnforcementOperation[];
  private readonly routeCanaryPercent: number;

  constructor(options: RuntimeRateEnforcementProviderOptions = {}) {
    this.mode = options.mode ?? "disabled";
    this.runtimeEnvironment = options.runtimeEnvironment ?? "unknown";
    this.adapter = options.adapter ?? createDisabledRateLimitAdapter();
    this.namespace = normalizeText(options.namespace) || null;
    this.isolatedTestNamespace = normalizeText(options.isolatedTestNamespace) || null;
    this.routeCanaryAllowlist = Object.freeze([...(options.routeCanaryAllowlist ?? [])]);
    this.routeCanaryPercent = parseRouteCanaryPercent(options.routeCanaryPercent);
  }

  async evaluate(input: RuntimeRateEnforcementInput): Promise<RuntimeRateEnforcementDecision> {
    const productionSyntheticCanary =
      this.runtimeEnvironment === "production" &&
      this.mode === "enforce_production_synthetic_canary_only" &&
      input.syntheticCanary === true;
    const productionRouteCanary =
      this.runtimeEnvironment === "production" &&
      this.mode === "enforce_production_real_user_route_canary_only";

    if (this.runtimeEnvironment === "production" && !productionSyntheticCanary && !productionRouteCanary) {
      return disabledRuntimeRateDecision(input, this.mode, "production_guard", this.namespace, this.isolatedTestNamespace);
    }
    if (this.mode === "disabled") {
      return disabledRuntimeRateDecision(input, this.mode, "mode_disabled", this.namespace, this.isolatedTestNamespace);
    }

    const policy = getRateEnforcementPolicy(input.operation);
    if (!policy) {
      return {
        ...disabledRuntimeRateDecision(input, this.mode, "policy_missing", this.namespace, this.isolatedTestNamespace),
        action: "observe",
        mode: this.mode,
        providerState: "policy_missing",
      };
    }
    if (productionRouteCanary && policy.category !== "read") {
      return {
        ...disabledRuntimeRateDecision(
          input,
          this.mode,
          "production_route_canary_non_read_policy",
          this.namespace,
          this.isolatedTestNamespace,
        ),
        routeScopedCanary: true,
      };
    }
    if (productionRouteCanary && !this.routeCanaryAllowlist.includes(policy.operation)) {
      return {
        ...disabledRuntimeRateDecision(
          input,
          this.mode,
          "production_route_canary_route_not_allowlisted",
          this.namespace,
          this.isolatedTestNamespace,
        ),
        routeScopedCanary: true,
      };
    }

    const key = buildSafeRateLimitKey(policy, input.keyInput);
    if (!key.ok) {
      return {
        ...disabledRuntimeRateDecision(input, this.mode, key.reason, this.namespace, this.isolatedTestNamespace),
        action: "observe",
        mode: this.mode,
        providerState: "key_rejected",
        routeScopedCanary: productionRouteCanary,
      };
    }
    const routeCanarySelected = productionRouteCanary
      ? selectedForRouteCanary(key.subjectHash, this.routeCanaryPercent)
      : false;
    if (productionRouteCanary && !routeCanarySelected) {
      return {
        ...disabledRuntimeRateDecision(
          input,
          this.mode,
          "production_route_canary_not_selected",
          this.namespace,
          this.isolatedTestNamespace,
        ),
        action: "allow",
        routeScopedCanary: true,
        safeSubjectHash: key.subjectHash,
        keyLength: key.keyLength,
      };
    }

    const providerDecision = await this.adapter.consume({
      key: key.key,
      policy,
      cost: input.cost,
      nowMs: input.nowMs,
    });
    const providerEnabled = providerDecision.enabled;
    const canBlockInThisNamespace =
      this.mode === "enforce_staging_test_namespace_only" &&
      this.runtimeEnvironment === "staging" &&
      this.namespace !== null &&
      this.isolatedTestNamespace !== null &&
      isIsolatedStagingTestNamespace(this.namespace, this.isolatedTestNamespace);
    const providerWouldBlock =
      providerDecision.state === "hard_limited" || providerDecision.state === "blocked_abuse";
    const blocked =
      (canBlockInThisNamespace || productionSyntheticCanary || routeCanarySelected) && providerWouldBlock;
    const action: RateEnforcementAction =
      this.mode === "observe_only"
        ? "observe"
        : blocked
          ? "block"
          : canBlockInThisNamespace || productionSyntheticCanary || routeCanarySelected
            ? "allow"
            : "observe";

    return {
      action,
      mode: this.mode,
      operation: input.operation,
      providerState: providerDecision.state,
      providerEnabled,
      blocked,
      realUsersBlocked: false,
      routeScopedCanary: productionRouteCanary,
      routeCanarySelected,
      enforcementNamespace: this.namespace,
      isolatedTestNamespace: this.isolatedTestNamespace,
      safeSubjectHash: key.subjectHash,
      keyLength: key.keyLength,
      rawPiiInKey: false,
      rawPayloadLogged: false,
      piiLogged: false,
      reason: blocked
        ? productionSyntheticCanary
          ? "production_synthetic_canary_limited"
          : routeCanarySelected
            ? "production_real_user_route_canary_limited"
            : "isolated_test_namespace_limited"
        : routeCanarySelected
          ? "production_real_user_route_canary_allow"
          : "not_blocking_real_users",
    };
  }

  getHealth(): RuntimeRateEnforcementHealth {
    const health = this.adapter.getHealth();
    return {
      mode: this.mode,
      runtimeEnvironment: this.runtimeEnvironment,
      providerEnabled: health.enabled,
      externalNetworkEnabled: health.externalNetworkEnabled,
      productionGuard: this.runtimeEnvironment !== "production",
      namespace: this.namespace,
      isolatedTestNamespace: this.isolatedTestNamespace,
      routeCanaryAllowlistCount: this.routeCanaryAllowlist.length,
      routeCanaryPercent: this.routeCanaryPercent,
      blocksRealUsersGlobally: false,
    };
  }
}

export function createRateEnforcementProviderFromEnv(
  env: RuntimeRateEnforcementEnv = typeof process !== "undefined" ? process.env : {},
  options: CreateRateEnforcementProviderFromEnvOptions = {},
): RuntimeRateEnforcementProvider {
  const runtimeConfig = resolveScaleProviderRuntimeConfig(env, {
    runtimeEnvironment: options.runtimeEnvironment,
  });
  const adapter =
    options.adapter ??
    createRateLimitAdapterFromEnv(env, {
      runtimeEnvironment: runtimeConfig.runtimeEnvironment,
      fetchImpl: options.fetchImpl,
    });

  return new RuntimeRateEnforcementProvider({
    mode: resolveRateEnforcementMode(env[RATE_ENFORCEMENT_MODE_ENV_NAME]),
    runtimeEnvironment: runtimeConfig.runtimeEnvironment,
    adapter,
    namespace: normalizeText(env.SCALE_RATE_LIMIT_NAMESPACE) || null,
    isolatedTestNamespace: normalizeText(env[RATE_LIMIT_TEST_NAMESPACE_ENV_NAME]) || null,
    routeCanaryAllowlist: parseRouteCanaryAllowlist(
      env[RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST_ENV_NAME],
    ),
    routeCanaryPercent: parseRouteCanaryPercent(
      env[RATE_LIMIT_REAL_USER_CANARY_PERCENT_ENV_NAME],
    ),
  });
}

export async function runRateLimitSyntheticEnforcementCanary(params: {
  provider: RuntimeRateEnforcementProvider;
  nowMs?: number;
}): Promise<RateLimitSyntheticEnforcementCanaryResult> {
  const operation = RATE_LIMIT_PRIVATE_SMOKE_OPERATION;
  const policy = getRateEnforcementPolicy(operation);
  const health = params.provider.getHealth();
  if (!policy || health.mode !== "enforce_production_synthetic_canary_only") {
    return {
      attempted: false,
      mode: health.mode,
      operation,
      action: "disabled",
      providerState: policy ? "disabled" : "policy_missing",
      providerEnabled: health.providerEnabled,
      blockedVerified: false,
      syntheticIdentityUsed: false,
      realUserIdentityUsed: false,
      productionUserBlocked: false,
      rawKeyReturned: false,
      rawPayloadLogged: false,
      piiLogged: false,
      reason: policy ? "synthetic_canary_mode_not_enabled" : "policy_missing",
      decision: null,
    };
  }

  const decision = await params.provider.evaluate({
    operation,
    keyInput: RATE_LIMIT_PRIVATE_SMOKE_KEY_INPUT,
    syntheticCanary: true,
    cost: policy.maxRequests + policy.burst + 1,
    nowMs: params.nowMs,
  });

  return {
    attempted: true,
    mode: decision.mode,
    operation,
    action: decision.action,
    providerState: decision.providerState,
    providerEnabled: decision.providerEnabled,
    blockedVerified:
      decision.action === "block" &&
      decision.blocked === true &&
      decision.realUsersBlocked === false,
    syntheticIdentityUsed: true,
    realUserIdentityUsed: false,
    productionUserBlocked: false,
    rawKeyReturned: false,
    rawPayloadLogged: false,
    piiLogged: false,
    reason: decision.reason,
    decision,
  };
}

export type RateLimitShadowMonitorSnapshot = {
  wouldAllowCount: number;
  wouldThrottleCount: number;
  keyCardinalityRedacted: number;
  observedDecisionCount: number;
  invalidDecisionCount: number;
  aggregateEventsRecorded: number;
  aggregateMetricsRecorded: number;
  blockedDecisionsObserved: number;
  realUsersBlocked: false;
  rawKeysStored: false;
  rawKeysPrinted: false;
  rawPayloadLogged: false;
  piiLogged: false;
};

export type RateLimitShadowMonitorObserveResult = {
  accepted: boolean;
  snapshot: RateLimitShadowMonitorSnapshot;
  eventRecorded: boolean;
  metricRecorded: boolean;
};

type RateLimitShadowClassification = "allow" | "throttle" | "ignore";

const REDACTED_CARDINALITY_MARKER = "present_redacted";

function classifyRateLimitDecisionState(
  state: RuntimeRateEnforcementDecision["providerState"],
): RateLimitShadowClassification {
  if (state === "allowed") return "allow";
  if (
    state === "soft_limited" ||
    state === "hard_limited" ||
    state === "blocked_abuse"
  ) {
    return "throttle";
  }
  return "ignore";
}

function eventForRateLimitDecisionState(
  state: RateLimitDecisionState | "policy_missing" | "key_rejected",
): {
  eventName: ScaleObservabilityEventName;
  result: ScaleObservabilityResult;
  metricName: ScaleMetricName | null;
} | null {
  if (state === "allowed") {
    return {
      eventName: "rate_limit.allowed",
      result: "allowed",
      metricName: null,
    };
  }
  if (state === "soft_limited") {
    return {
      eventName: "rate_limit.soft_limited",
      result: "limited",
      metricName: "rate_limit.soft_limit_rate",
    };
  }
  if (state === "hard_limited" || state === "blocked_abuse") {
    return {
      eventName: "rate_limit.hard_limited",
      result: "limited",
      metricName: "rate_limit.hard_limit_rate",
    };
  }
  return null;
}

export class RateLimitShadowMonitor {
  private wouldAllowCount = 0;
  private wouldThrottleCount = 0;
  private observedDecisionCount = 0;
  private invalidDecisionCount = 0;
  private aggregateEventsRecorded = 0;
  private aggregateMetricsRecorded = 0;
  private blockedDecisionsObserved = 0;
  private readonly redactedCardinality = new Set<string>();
  private readonly observability: ScaleObservabilityAdapter | null;

  constructor(options: { observability?: ScaleObservabilityAdapter | null } = {}) {
    this.observability = options.observability ?? null;
  }

  async observe(
    decision: RuntimeRateEnforcementDecision,
  ): Promise<RateLimitShadowMonitorObserveResult> {
    if (decision.realUsersBlocked !== false) {
      this.invalidDecisionCount += 1;
      return {
        accepted: false,
        snapshot: this.snapshot(),
        eventRecorded: false,
        metricRecorded: false,
      };
    }

    this.observedDecisionCount += 1;
    if (decision.blocked) this.blockedDecisionsObserved += 1;
    if (decision.safeSubjectHash) {
      this.redactedCardinality.add(decision.safeSubjectHash);
    }

    const classification = classifyRateLimitDecisionState(decision.providerState);
    if (classification === "allow") this.wouldAllowCount += 1;
    if (classification === "throttle") this.wouldThrottleCount += 1;

    const observabilityResult = await this.recordAggregateObservability(decision);
    return {
      accepted: true,
      snapshot: this.snapshot(),
      eventRecorded: observabilityResult.eventRecorded,
      metricRecorded: observabilityResult.metricRecorded,
    };
  }

  snapshot(): RateLimitShadowMonitorSnapshot {
    return {
      wouldAllowCount: this.wouldAllowCount,
      wouldThrottleCount: this.wouldThrottleCount,
      keyCardinalityRedacted: this.redactedCardinality.size,
      observedDecisionCount: this.observedDecisionCount,
      invalidDecisionCount: this.invalidDecisionCount,
      aggregateEventsRecorded: this.aggregateEventsRecorded,
      aggregateMetricsRecorded: this.aggregateMetricsRecorded,
      blockedDecisionsObserved: this.blockedDecisionsObserved,
      realUsersBlocked: false,
      rawKeysStored: false,
      rawKeysPrinted: false,
      rawPayloadLogged: false,
      piiLogged: false,
    };
  }

  private async recordAggregateObservability(
    decision: RuntimeRateEnforcementDecision,
  ): Promise<{ eventRecorded: boolean; metricRecorded: boolean }> {
    if (!this.observability) {
      return { eventRecorded: false, metricRecorded: false };
    }

    const contract = eventForRateLimitDecisionState(decision.providerState);
    if (!contract) {
      return { eventRecorded: false, metricRecorded: false };
    }

    let eventRecorded = false;
    let metricRecorded = false;
    const eventResult = await this.observability.recordEvent(
      buildScaleObservabilityEvent({
        eventName: contract.eventName,
        routeOrOperation: decision.operation,
        result: contract.result,
        reasonCode: decision.reason,
        safeActorScope: decision.safeSubjectHash
          ? REDACTED_CARDINALITY_MARKER
          : "missing",
        safeCompanyScope: "not_applicable",
      }),
    );
    if (eventResult.ok) {
      this.aggregateEventsRecorded += 1;
      eventRecorded = true;
    }

    if (contract.metricName) {
      const metricResult: ScaleObservabilityRecordResult =
        await this.observability.recordMetric({
          metricName: contract.metricName,
          value: 1,
          tags: {
            operation: decision.operation,
            result: contract.result,
          },
        });
      if (metricResult.ok) {
        this.aggregateMetricsRecorded += 1;
        metricRecorded = true;
      }
    }

    return { eventRecorded, metricRecorded };
  }
}

export function createRateLimitShadowMonitor(options: {
  observability?: ScaleObservabilityAdapter | null;
} = {}): RateLimitShadowMonitor {
  return new RateLimitShadowMonitor(options);
}

export type RateLimitPrivateSmokeShadowMonitorResult = {
  attempted: boolean;
  allowObserved: boolean;
  throttleObserved: boolean;
  snapshot: RateLimitShadowMonitorSnapshot;
  reason: string;
};

const privateSmokeMonitorDecision = (
  result: RateLimitPrivateSmokeResult,
  providerState: Extract<RateLimitDecisionState, "allowed" | "hard_limited">,
  reason: string,
): RuntimeRateEnforcementDecision => ({
  action: "observe",
  mode: "observe_only",
  operation: result.operation,
  providerState,
  providerEnabled: result.providerEnabled,
  blocked: false,
  realUsersBlocked: false,
  routeScopedCanary: false,
  routeCanarySelected: false,
  enforcementNamespace: null,
  isolatedTestNamespace: null,
  safeSubjectHash: REDACTED_CARDINALITY_MARKER,
  keyLength: null,
  rawPiiInKey: false,
  rawPayloadLogged: false,
  piiLogged: false,
  reason,
});

export async function observeRateLimitPrivateSmokeInShadowMonitor(params: {
  monitor: RateLimitShadowMonitor;
  result: RateLimitPrivateSmokeResult;
}): Promise<RateLimitPrivateSmokeShadowMonitorResult> {
  const { monitor, result } = params;
  if (
    result.status !== "ready" ||
    result.syntheticIdentityUsed !== true ||
    result.realUserIdentityUsed !== false ||
    result.wouldAllowVerified !== true ||
    result.wouldThrottleVerified !== true ||
    result.cleanupOk !== true ||
    result.ttlBounded !== true ||
    result.enforcementEnabled !== false ||
    result.productionUserBlocked !== false ||
    result.rawKeyReturned !== false ||
    result.rawPayloadLogged !== false ||
    result.piiLogged !== false
  ) {
    return {
      attempted: false,
      allowObserved: false,
      throttleObserved: false,
      snapshot: monitor.snapshot(),
      reason: "private_smoke_not_safe_for_shadow_monitor",
    };
  }

  const allow = await monitor.observe(
    privateSmokeMonitorDecision(
      result,
      "allowed",
      "synthetic_private_smoke_shadow_allow",
    ),
  );
  const throttle = await monitor.observe(
    privateSmokeMonitorDecision(
      result,
      "hard_limited",
      "synthetic_private_smoke_shadow_throttle",
    ),
  );

  return {
    attempted: true,
    allowObserved: allow.accepted,
    throttleObserved: throttle.accepted,
    snapshot: throttle.snapshot,
    reason:
      allow.accepted && throttle.accepted
        ? "synthetic_private_smoke_shadow_observed"
        : "synthetic_private_smoke_shadow_observe_rejected",
  };
}
