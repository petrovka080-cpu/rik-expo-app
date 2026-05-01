import type {
  RateEnforcementPolicy,
  RateLimitEnforcementOperation,
} from "./rateLimitPolicies";
import { assertRateLimitKeyIsBounded } from "./rateLimitKeySafety";
import {
  resolveScaleProviderRuntimeConfig,
  type ScaleProviderRuntimeEnvironment,
} from "./providerRuntimeConfig";

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

export type RateLimitStoreEnv = Record<string, string | undefined>;

export type CreateRateLimitAdapterFromEnvOptions = {
  runtimeEnvironment?: ScaleProviderRuntimeEnvironment;
  fetchImpl?: RateLimitStoreFetch;
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

  return new RateLimitStoreAdapter({
    storeUrl: normalizeText(env.SCALE_RATE_LIMIT_STORE_URL),
    namespace: normalizeText(env.SCALE_RATE_LIMIT_NAMESPACE),
    fetchImpl: options.fetchImpl,
  });
}
