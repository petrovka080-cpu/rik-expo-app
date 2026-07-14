import { buildRequestLineageAudit } from "../../src/features/office/requestLineageSnapshot";
import { createSnapshot, createStages } from "./lineageTestHelpers";

describe("buyer handoff request lineage", () => {
  it("fails when buyer data no longer matches the director-approved request", () => {
    const snapshot = createSnapshot("manual_estimate");
    const { audit } = buildRequestLineageAudit({
      snapshots: [snapshot],
      stagesByKind: {
        manual_estimate: createStages({
          buyer_detail: {
            context: { zoneLabel: "Wrong zone" },
            contextVerified: false,
          },
        }),
      },
    });

    expect(audit.buyer_data_matches_director_approved_data).toBe(false);
    expect(audit.failureReasons).toContain("buyer_data_matches_director_approved_data");
  });
});
