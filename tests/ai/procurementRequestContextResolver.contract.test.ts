import {
  resolveProcurementRequestContext,
} from "../../src/features/ai/procurement/procurementRequestContextResolver";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("procurement request context resolver", () => {
  it("resolves role, screen, request scope, and redacted internal evidence", () => {
    const context = resolveProcurementRequestContext({
      auth: buyerAuth,
      requestId: "req-123",
      screenId: "buyer.main",
      requestSnapshot: {
        requestId: "req-123",
        projectId: "project-456",
        projectTitle: "Tower A",
        location: "Bishkek, exact address hidden",
        items: [
          {
            materialLabel: "Cement M400",
            quantity: 12,
            unit: "bag",
            category: "cement",
            urgency: "high",
          },
        ],
      },
    });

    expect(context).toMatchObject({
      status: "loaded",
      role: "buyer",
      screenId: "buyer.main",
      requestedItems: [
        {
          materialLabel: "Cement M400",
          quantity: 12,
          unit: "bag",
          category: "cement",
          urgency: "high",
        },
      ],
      allowedNextActions: [
        "search_catalog",
        "compare_suppliers",
        "draft_request",
        "submit_for_approval",
      ],
      approvalRequired: true,
    });
    expect(context.requestIdHash).not.toContain("req-123");
    expect(context.projectSummary.projectIdHash).not.toContain("project-456");
    expect(context.projectSummary.locationBucket).toMatch(/^location_/);
    expect(context.internalEvidenceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "internal_app",
          redacted: true,
          payloadStored: false,
          rowDataExposed: false,
          promptStored: false,
        }),
      ]),
    );
  });

  it("returns a real empty state instead of inventing request data", () => {
    expect(
      resolveProcurementRequestContext({
        auth: buyerAuth,
        requestId: "req-empty",
        screenId: "buyer.main",
        requestSnapshot: null,
      }),
    ).toMatchObject({
      status: "empty",
      requestedItems: [],
      missingFields: ["request_snapshot"],
      allowedNextActions: ["search_catalog"],
      approvalRequired: true,
    });
  });
});
