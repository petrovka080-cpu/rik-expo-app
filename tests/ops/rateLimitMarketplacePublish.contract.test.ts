import {
  REQUIRED_OPS_RATE_LIMIT_IDS,
  evaluateOpsRateLimit,
  getOpsRateLimitDefinition,
  validateOpsRateLimitDefinition,
} from "../../src/lib/ops/productionOpsTelemetry";

const REQUIRED_LIMITS = [
  "marketplace_publish_attempts_per_hour",
  "b2c_marketplace_send_attempts_per_hour",
  "pdf_generation_attempts_per_hour",
  "auth_sensitive_actions_per_hour",
] as const;

describe("core production action rate limits", () => {
  it("covers marketplace publish, B2C send, PDF generation, and auth-sensitive actions", () => {
    expect(REQUIRED_OPS_RATE_LIMIT_IDS).toEqual(
      expect.arrayContaining(REQUIRED_LIMITS),
    );

    for (const id of REQUIRED_LIMITS) {
      const definition = getOpsRateLimitDefinition(id);
      const attempts = Array.from({ length: definition.maxAttempts }, (_, index) => index + 1);
      const decision = evaluateOpsRateLimit({
        id,
        previousAttemptTimestamps: attempts,
        now: definition.windowMs,
      });

      expect(validateOpsRateLimitDefinition(definition)).toBe(true);
      expect(definition.enabled).toBe(true);
      expect(definition.actionOnBlock).toBe("deny_with_safe_error");
      expect(definition.metricOnBlock).toBe("rate_limit_blocks");
      expect(decision.blocked).toBe(true);
      expect(decision.safeErrorCode).toMatch(/rate_limited$/);
    }
  });
});
