import { redactAgentRuntimePayload } from "../../src/features/ai/agent/agentRuntimeRedaction";

describe("Agent runtime redaction", () => {
  it("redacts sensitive values and reports forbidden runtime keys", () => {
    const result = redactAgentRuntimePayload({
      safe: "hello",
      password: "secret-value",
      nested: {
        providerPayload: { text: "raw provider response" },
      },
    });

    expect(result).toMatchObject({
      forbiddenKeysDetected: true,
      rawRowsExposed: false,
      rawPromptExposed: false,
      rawProviderPayloadExposed: false,
      secretsExposed: false,
    });
    expect(JSON.stringify(result.payload)).not.toContain("secret-value");
    expect(JSON.stringify(result.payload)).not.toContain("raw provider response");
  });

  it("keeps safe payloads bounded and DTO-only", () => {
    const result = redactAgentRuntimePayload({
      screenId: "ai.command_center",
      evidenceRefs: ["screen:evidence:redacted"],
    });

    expect(result.forbiddenKeysDetected).toBe(false);
    expect(result.payloadBytes).toBeGreaterThan(0);
    expect(result.rawRowsExposed).toBe(false);
  });
});
