import {
  hasForbiddenAiTraceKeys,
  redactAiTraceAttributes,
} from "../../src/features/ai/observability/aiTraceRedaction";

describe("AI trace redaction", () => {
  it("redacts prompt, provider payload, DB rows, authorization, token, and full email fields", () => {
    const attributes = redactAiTraceAttributes({
      rawPrompt: "please buy everything",
      provider_payload: { candidates: ["raw provider answer"] },
      rawDbRows: [{ id: "raw-db-row-1" }],
      Authorization: "Bearer secret-token",
      fullUserEmail: "buyer@example.com",
      safeCount: 3,
      nested: {
        token: "nested-token",
        status: "blocked",
      },
    });

    expect(hasForbiddenAiTraceKeys({
      rawPrompt: "please buy everything",
      nested: { token: "nested-token" },
    })).toBe(true);
    expect(attributes).toMatchObject({
      rawPrompt: "[redacted]",
      provider_payload: "[redacted]",
      rawDbRows: "[redacted]",
      Authorization: "[redacted]",
      fullUserEmail: "[redacted]",
      safeCount: 3,
      nested: {
        token: "[redacted]",
        status: "blocked",
      },
    });
    expect(JSON.stringify(attributes)).not.toMatch(/secret-token|buyer@example\.com|please buy everything|raw-db-row-1/);
  });
});
