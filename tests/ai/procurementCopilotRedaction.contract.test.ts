import { buildProcurementCopilotPlan } from "../../src/features/ai/procurementCopilot/procurementCopilotPlanEngine";
import { sanitizeProcurementCopilotReason } from "../../src/features/ai/procurementCopilot/procurementCopilotRedaction";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("procurement copilot redaction", () => {
  it("does not expose raw request rows, raw prompt, or provider payload fields", async () => {
    const result = await buildProcurementCopilotPlan({
      auth: buyerAuth,
      input: {
        requestId: "request-redaction",
        screenId: "buyer.procurement",
        requestSnapshot: {
          requestId: "request-redaction",
          projectId: "project-redaction",
          projectTitle: "Tower A",
          items: [{ materialLabel: "Cement M400", quantity: 10, unit: "bag" }],
        },
        searchCatalogItems: async () => [],
        listSuppliers: async () => [],
      },
    });

    const serialized = JSON.stringify({
      context: result.context,
      plan: result.plan,
    });
    expect(serialized).not.toMatch(/rawDbRows|raw_db_rows|rawPrompt|raw_prompt|providerPayload|provider_payload|requestId":"request-redaction/);
    expect(result.context.requestIdHash).toMatch(/^request_/);
    expect(result.context.internalEvidenceRefs.every((ref) => ref.redacted && !ref.rowDataExposed && !ref.promptStored)).toBe(true);
  });

  it("redacts token-like values from reasons", () => {
    expect(sanitizeProcurementCopilotReason("Bearer abcdefghijklmnop secret", "fallback")).toBe("[redacted] secret");
  });
});
