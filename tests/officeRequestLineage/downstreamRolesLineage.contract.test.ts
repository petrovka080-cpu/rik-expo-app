import { buildRequestLineageAudit } from "../../src/features/office/requestLineageSnapshot";
import { createSnapshot, createStages } from "./lineageTestHelpers";

describe("downstream office role request lineage", () => {
  it("fails when warehouse, contractor, or accountant loses buyer-visible items", () => {
    const snapshot = createSnapshot("ai_estimate");
    const { audit } = buildRequestLineageAudit({
      snapshots: [snapshot],
      stagesByKind: {
        ai_estimate: createStages({
          warehouse_view: {
            items: [],
            itemsVerified: false,
          },
          contractor_view: {
            items: [],
            itemsVerified: false,
          },
        }),
      },
    });

    expect(audit.downstream_data_matches_buyer_data).toBe(false);
    expect(audit.no_route_only_green).toBe(false);
    expect(audit.failureReasons).toEqual(
      expect.arrayContaining(["downstream_data_matches_buyer_data", "no_route_only_green"]),
    );
  });
});
