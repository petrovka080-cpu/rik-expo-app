import type { AiEstimateRateLimitState } from "./aiEstimateCostTypes";

export type AiEstimateRateLimitResult = AiEstimateRateLimitState & {
  allowed: boolean;
  remaining: number;
};

export function evaluateAiEstimateRateLimit(input: AiEstimateRateLimitState): AiEstimateRateLimitResult {
  const remaining = Math.max(0, input.limit - input.count);
  return {
    ...input,
    allowed: input.count <= input.limit,
    remaining,
  };
}

export function evaluateAiEstimateBatchRateLimits(states: readonly AiEstimateRateLimitState[]): AiEstimateRateLimitResult[] {
  return states.map(evaluateAiEstimateRateLimit);
}
