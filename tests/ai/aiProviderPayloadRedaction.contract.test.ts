import {
  AI_PROVIDER_PAYLOAD_REDACTION_MARKER,
  redactAiProviderPayload,
  scanAiProviderPayloadForUnsafeContent,
  verifyAiProviderPayloadRedactionPolicy,
} from "../../src/features/ai/observability/aiProviderPayloadRedaction";

describe("AI provider payload redaction", () => {
  it("detects prompt, message, provider payload, and credential-like fields", () => {
    const findings = scanAiProviderPayloadForUnsafeContent({
      messages: [{ role: "user", content: "supplier quote" }],
      providerPayload: {
        candidates: [{ content: "candidate text" }],
        authorization: "Bearer secret-token",
      },
    });

    expect(findings.map((finding) => finding.path)).toEqual(
      expect.arrayContaining(["$.messages", "$.providerPayload", "$.providerPayload.candidates"]),
    );
    expect(findings.some((finding) => finding.code === "sensitive_provider_payload_string")).toBe(true);
  });

  it("returns only a redacted summary that is safe for artifacts", () => {
    const result = redactAiProviderPayload({
      maxProviderPayloadBytes: 128,
      payload: {
        rawPrompt: "never store this prompt",
        providerPayload: {
          token: "Bearer hidden-token",
          answer: "never store this answer",
        },
      },
    });
    const serialized = JSON.stringify(result);

    expect(result.redactedPayload).toBe(AI_PROVIDER_PAYLOAD_REDACTION_MARKER);
    expect(result.acceptedForArtifact).toBe(false);
    expect(result.rawPromptExposed).toBe(false);
    expect(result.rawProviderPayloadStored).toBe(false);
    expect(serialized).not.toContain("never store this prompt");
    expect(serialized).not.toContain("never store this answer");
    expect(serialized).not.toContain("hidden-token");
  });

  it("keeps the policy probe redacted by default", () => {
    const result = verifyAiProviderPayloadRedactionPolicy();

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.redactedPayload).toBe(AI_PROVIDER_PAYLOAD_REDACTION_MARKER);
    expect(result.rawProviderPayloadExposed).toBe(false);
    expect(result.credentialsExposed).toBe(false);
  });
});
