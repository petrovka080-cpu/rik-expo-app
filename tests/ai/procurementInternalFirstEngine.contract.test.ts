import { buildProcurementInternalFirstPlan } from "../../src/features/ai/procurement/procurementInternalFirstEngine";
import { resolveProcurementRequestContext } from "../../src/features/ai/procurement/procurementRequestContextResolver";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("procurement internal-first engine", () => {
  it("keeps source order internal app, marketplace, then policy-gated external", () => {
    const context = resolveProcurementRequestContext({
      auth: buyerAuth,
      requestId: "req-1",
      screenId: "buyer.main",
      requestSnapshot: {
        requestId: "req-1",
        projectId: "project-1",
        items: [{ materialLabel: "Rebar", quantity: 2, unit: "t" }],
      },
    });

    const plan = buildProcurementInternalFirstPlan({
      context,
      marketplaceEvidenceRefs: ["marketplace:supplier:1"],
      externalRequested: true,
      externalSourcePolicyIds: ["supplier_public_catalog.default"],
    });

    expect(plan).toMatchObject({
      sourceOrder: ["internal_app", "marketplace", "external_policy"],
      internalDataChecked: true,
      marketplaceChecked: true,
      externalChecked: false,
      externalStatus: "external_policy_not_enabled",
      finalMutationAllowed: false,
      recommendationAllowed: true,
      violations: [],
    });
    expect(plan.evidenceRefs[0]).toContain("internal_app:");
    expect(plan.evidenceRefs).toContain("marketplace:supplier:1");
  });
});
