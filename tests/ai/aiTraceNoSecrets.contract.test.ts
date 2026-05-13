import { recordAiTraceEvent } from "../../src/features/ai/observability/aiTraceRecorder";

describe("AI trace no secrets", () => {
  it("does not export raw prompt, provider payload, tokens, Authorization header, DB rows, or full user email", () => {
    const event = recordAiTraceEvent({
      eventName: "ai.action.execute_requested",
      role: "director",
      domain: "procurement",
      actionIdHash: "action:trace",
      outcome: "allowed",
      attributes: {
        prompt: "raw procurement prompt",
        providerPayload: { text: "raw provider payload" },
        dbRows: [{ supplier_id: "supplier-raw" }],
        authorization: "Bearer secret-token",
        userEmail: "director@example.com",
      },
    });
    const serialized = JSON.stringify(event);

    expect(event).toMatchObject({
      redacted: true,
      rawPromptExposed: false,
      rawProviderPayloadExposed: false,
      rawDbRowsExposed: false,
      credentialsExposed: false,
      fullUserEmailExposed: false,
      authorizationHeaderExposed: false,
      tokenExposed: false,
    });
    expect(serialized).not.toMatch(/raw procurement prompt|raw provider payload|supplier-raw|secret-token|director@example\.com/);
  });
});
