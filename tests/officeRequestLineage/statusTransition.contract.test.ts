import { buildRequestLineageAudit } from "../../src/features/office/requestLineageSnapshot";
import { createSnapshot, createStages } from "./lineageTestHelpers";

describe("office request status transition lineage", () => {
  it("fails when approve does not persist an approved or procurement-ready state", () => {
    const snapshot = createSnapshot("manual_estimate");
    const { audit } = buildRequestLineageAudit({
      snapshots: [snapshot],
      stagesByKind: {
        manual_estimate: createStages({
          director_approved: { status: "submitted" },
          buyer_inbox: { status: "submitted" },
        }),
      },
    });

    expect(audit.status_transition_valid).toBe(false);
    expect(audit.failureReasons).toContain("status_transition_valid");
  });

  it("accepts the Russian procurement-ready status used by the live office lifecycle", () => {
    const snapshot = createSnapshot("ai_estimate");
    const { audit } = buildRequestLineageAudit({
      snapshots: [snapshot],
      stagesByKind: {
        ai_estimate: createStages({
          director_approved: { status: "К закупке" },
          buyer_inbox: { status: "К закупке" },
          buyer_detail: { status: "К закупке" },
          buyer_pdf: { status: "К закупке" },
          warehouse_view: { status: "К закупке" },
          contractor_view: { status: "К закупке" },
          accountant_view: { status: "К закупке" },
          foreman_progress_view: { status: "К закупке" },
          director_progress_view: { status: "К закупке" },
        }),
      },
    });

    expect(audit.status_transition_valid).toBe(true);
    expect(audit.failureReasons).not.toContain("status_transition_valid");
  });
});
