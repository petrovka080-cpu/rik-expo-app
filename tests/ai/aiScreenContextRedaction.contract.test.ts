import {
  redactAiContextForModel,
  redactAiContextSummaryText,
} from "../../src/features/ai/context/aiContextRedaction";

describe("AI screen context redaction", () => {
  it("redacts raw secrets, provider payloads, prompts, and db dumps", () => {
    const result = redactAiContextForModel({
      role: "director",
      screenId: "director.dashboard",
      context: {
        authorization: "Bearer eyJabc.def.ghi",
        rawPrompt: "raw prompt text",
        rawProviderPayload: { token: "secret-token" },
        rawDbRows: [{ id: "row" }],
      },
    });

    expect(JSON.stringify(result)).not.toContain("eyJabc");
    expect(JSON.stringify(result)).not.toContain("raw prompt text");
    expect(JSON.stringify(result)).not.toContain("secret-token");
    expect(JSON.stringify(result)).not.toContain("row");
    expect(result.redacted).toBe(true);
  });

  it("blocks finance context for non-finance roles and supplier internals for contractors", () => {
    const foreman = redactAiContextForModel({
      role: "foreman",
      screenId: "foreman.ai.quick_modal",
      context: { financeRows: [{ amount: 1000 }], safeLabel: "materials" },
    });
    expect(JSON.stringify(foreman)).not.toContain("1000");
    expect(JSON.stringify(foreman)).toContain("materials");

    const contractor = redactAiContextForModel({
      role: "contractor",
      screenId: "contractor.main",
      context: { internalSupplierDetails: "hidden", ownTask: "finish act" },
    });
    expect(JSON.stringify(contractor)).not.toContain("hidden");
    expect(JSON.stringify(contractor)).toContain("finish act");
  });

  it("redacts assistant scoped summary text", () => {
    const summary = redactAiContextSummaryText("Authorization header: Bearer eyJabc.def.ghi", {
      role: "buyer",
      screenId: "buyer.main",
    });
    expect(summary).not.toContain("eyJabc");
  });
});
