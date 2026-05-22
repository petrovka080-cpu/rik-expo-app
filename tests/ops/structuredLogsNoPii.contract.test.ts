import {
  SENSITIVE_REDACTION_MARKER,
} from "../../src/lib/security/redaction";
import {
  containsSensitiveOpsText,
  getOpsMetricEvents,
  recordOpsMetric,
  recordOpsRateLimitBlock,
  resetOpsMetricEvents,
} from "../../src/lib/ops/productionOpsTelemetry";

describe("observability structured log redaction", () => {
  beforeEach(() => {
    resetOpsMetricEvents();
  });

  it("emits structured metric events without PII, credentials, service role, or provider payload text", () => {
    const event = recordOpsMetric({
      name: "api_request_duration_ms",
      value: 127.8,
      attributes: {
        email: "person@example.test",
        phone: "+996 555 123 456",
        authorization: "Bearer secret-token",
        signedUrl: "https://storage.example/file.pdf?access_token=secret",
        serviceRole: "service_role secret",
        nested: {
          providerPayload: {
            rawPrompt: "call +996 700 111 222",
          },
          safeCode: "validation_required_fields",
        },
      },
    });
    const block = recordOpsRateLimitBlock("ai_questions_per_user_hour", {
      actor: "person@example.test",
      phone: "+996 555 000 111",
    });

    const serialized = JSON.stringify({ event, block, store: getOpsMetricEvents() });

    expect(event.structuredLogEvent).toBe("ops.api.request.duration");
    expect(event.value).toBe(128);
    expect(serialized).toContain(SENSITIVE_REDACTION_MARKER);
    expect(serialized).not.toContain("person@example.test");
    expect(serialized).not.toContain("+996 555 123 456");
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("access_token=secret");
    expect(serialized).not.toContain("service_role");
    expect(serialized).not.toContain("providerPayload");
    expect(serialized).not.toContain("rawPrompt");
    expect(containsSensitiveOpsText(serialized)).toBe(false);
  });
});
