import type { ProcurementCopilotContext, ProcurementCopilotPlan } from "../../src/features/ai/procurementCopilot/procurementCopilotTypes";
import { buildProcurementCopilotDraftPreview } from "../../src/features/ai/procurementCopilot/procurementCopilotDraftBridge";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

const context: ProcurementCopilotContext = {
  status: "loaded",
  role: "buyer",
  screenId: "buyer.procurement",
  requestIdHash: "request_hash",
  projectLabel: "Tower A",
  requestedItems: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
  internalEvidenceRefs: [
    {
      id: "internal_app:request:request_hash",
      source: "internal_app",
      label: "Request",
      redacted: true,
      payloadStored: false,
      rowDataExposed: false,
      promptStored: false,
    },
  ],
  missingFields: [],
  approvalRequired: true,
};

const plan: ProcurementCopilotPlan = {
  status: "ready",
  internalDataChecked: true,
  marketplaceChecked: true,
  externalIntelStatus: "disabled",
  summary: "Supplier preview is ready.",
  supplierCards: [
    {
      supplierLabel: "Supplier Alpha",
      source: "marketplace",
      riskFlags: [],
      evidenceRefs: ["catalog:evidence:1"],
    },
  ],
  recommendedNextAction: "draft_request",
  requiresApproval: true,
  evidenceRefs: ["internal_app:request:request_hash", "catalog:evidence:1"],
};

describe("procurement copilot draft preview", () => {
  it("uses draft_request only and keeps approval as the next action", async () => {
    const result = await buildProcurementCopilotDraftPreview({
      auth: buyerAuth,
      input: { context, plan },
    });

    expect(result).toMatchObject({
      status: "draft_ready",
      draftPreview: {
        title: "Tower A",
        items: [
          {
            materialLabel: "Cement M400",
            quantity: 12,
            unit: "bag",
          },
        ],
      },
      requiresApproval: true,
      nextAction: "submit_for_approval",
    });
    expect(result.evidenceRefs).toEqual(expect.arrayContaining(plan.evidenceRefs));
    expect(JSON.stringify(result)).not.toMatch(/finalExecution|orderCreationAllowed|warehouseMutationAllowed/);
  });
});
