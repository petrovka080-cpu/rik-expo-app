import {
  evaluateOpsRateLimit,
  getOpsMetricEvents,
  getOpsRateLimitDefinition,
  recordOpsRateLimitBlock,
  resetOpsMetricEvents,
  validateOpsRateLimitDefinition,
} from "../../src/lib/ops/productionOpsTelemetry";

describe("media upload production rate limit", () => {
  beforeEach(() => {
    resetOpsMetricEvents();
  });

  it("blocks saturated media uploads with a safe error and metric event", () => {
    const definition = getOpsRateLimitDefinition("media_uploads_per_user_hour");
    const attempts = Array.from({ length: definition.maxAttempts }, (_, index) => index * 1000);
    const decision = evaluateOpsRateLimit({
      id: definition.id,
      previousAttemptTimestamps: attempts,
      now: definition.windowMs - 1,
    });

    expect(validateOpsRateLimitDefinition(definition)).toBe(true);
    expect(definition.enabled).toBe(true);
    expect(definition.subject).toBe("user");
    expect(definition.rawPayloadAllowedInKey).toBe(false);
    expect(decision.allowed).toBe(false);
    expect(decision.blocked).toBe(true);
    expect(decision.safeErrorCode).toBe("media_upload_rate_limited");
    expect(decision.metricOnBlock).toBe("rate_limit_blocks");

    const event = recordOpsRateLimitBlock(definition.id, { route: "/media/upload" });
    expect(event.name).toBe("rate_limit_blocks");
    expect(getOpsMetricEvents()).toHaveLength(1);
  });
});
