import type { RateEnforcementPolicy, RateLimitEnforcementOperation } from "./rateLimitPolicies";

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
};

export interface RateLimitAdapter {
  check(input: RateLimitCheckInput): Promise<RateLimitDecision>;
  consume(input: RateLimitCheckInput): Promise<RateLimitDecision>;
  refund(key: string, cost?: number): Promise<boolean>;
  reset(key: string): Promise<boolean>;
  getStatus(key: string): Promise<RateLimitStatus | null>;
  getHealth(): RateLimitAdapterHealth;
}

const disabledDecision = (key: string, operation: RateLimitEnforcementOperation | null = null): RateLimitDecision => ({
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

export class InMemoryRateLimitAdapter implements RateLimitAdapter {
  private readonly records = new Map<string, MemoryRecord>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  private getRecord(input: RateLimitCheckInput): MemoryRecord {
    const nowMs = input.nowMs ?? this.now();
    const existing = this.records.get(input.key);
    if (existing && existing.resetAtMs > nowMs) return existing;

    const next: MemoryRecord = {
      operation: input.policy.operation,
      count: 0,
      resetAtMs: nowMs + input.policy.windowMs,
    };
    this.records.set(input.key, next);
    return next;
  }

  private buildDecision(
    input: RateLimitCheckInput,
    nextCount: number,
    record: MemoryRecord,
  ): RateLimitDecision {
    const allowedBudget = input.policy.maxRequests;
    const burstBudget = input.policy.maxRequests + input.policy.burst;
    const state: RateLimitDecisionState =
      nextCount <= allowedBudget ? "allowed" : nextCount <= burstBudget ? "soft_limited" : "hard_limited";

    return {
      state,
      key: input.key,
      operation: input.policy.operation,
      remaining: Math.max(0, allowedBudget - nextCount),
      resetAtMs: record.resetAtMs,
      retryAfterMs: state === "hard_limited" ? Math.max(0, record.resetAtMs - (input.nowMs ?? this.now())) : null,
      enabled: true,
      realUserBlocked: false,
    };
  }

  async check(input: RateLimitCheckInput): Promise<RateLimitDecision> {
    const cost = Math.max(1, Math.trunc(input.cost ?? 1));
    const record = this.getRecord(input);
    return this.buildDecision(input, record.count + cost, record);
  }

  async consume(input: RateLimitCheckInput): Promise<RateLimitDecision> {
    const cost = Math.max(1, Math.trunc(input.cost ?? 1));
    const record = this.getRecord(input);
    const nextCount = record.count + cost;
    const decision = this.buildDecision(input, nextCount, record);
    if (decision.state !== "hard_limited") {
      record.count = nextCount;
    }
    return decision;
  }

  async refund(key: string, cost = 1): Promise<boolean> {
    const record = this.records.get(key);
    if (!record) return false;
    record.count = Math.max(0, record.count - Math.max(1, Math.trunc(cost)));
    return true;
  }

  async reset(key: string): Promise<boolean> {
    return this.records.delete(key);
  }

  async getStatus(key: string): Promise<RateLimitStatus | null> {
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
