import type {
  RateEnforcementPolicy,
  RateLimitEnforcementOperation,
} from "./rateLimitPolicies";
import { assertRateLimitKeyIsBounded } from "./rateLimitKeySafety";

export type RateLimitDecisionState =
  | "allowed"
  | "soft_limited"
  | "hard_limited"
  | "blocked_abuse"
  | "disabled"
  | "unknown";

export type RateLimitAdapterKind = "noop" | "in_memory" | "external_contract";

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

const resolveRateLimitCost = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : 1;
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
