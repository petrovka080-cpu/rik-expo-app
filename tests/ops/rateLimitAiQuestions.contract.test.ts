import {
  evaluateOpsRateLimit,
  getOpsRateLimitDefinition,
  validateOpsRateLimitDefinition,
} from "../../src/lib/ops/productionOpsTelemetry";

describe("AI question production rate limit", () => {
  it("allows remaining AI question capacity and blocks when the hourly budget is exhausted", () => {
    const definition = getOpsRateLimitDefinition("ai_questions_per_user_hour");
    const almostSaturated = Array.from({ length: definition.maxAttempts - 1 }, (_, index) => index + 1);
    const saturated = Array.from({ length: definition.maxAttempts }, (_, index) => index + 1);

    const allowed = evaluateOpsRateLimit({
      id: definition.id,
      previousAttemptTimestamps: almostSaturated,
      now: definition.windowMs,
    });
    const blocked = evaluateOpsRateLimit({
      id: definition.id,
      previousAttemptTimestamps: saturated,
      now: definition.windowMs,
    });

    expect(validateOpsRateLimitDefinition(definition)).toBe(true);
    expect(definition.operation).toBe("ai.question");
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(1);
    expect(blocked.blocked).toBe(true);
    expect(blocked.safeErrorCode).toBe("ai_question_rate_limited");
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
});
