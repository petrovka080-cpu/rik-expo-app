import { createGreenLineage, createSnapshot } from "./lineageTestHelpers";

describe("office request lineage snapshot contract", () => {
  it("creates one comparable snapshot table for AI and manual requests", () => {
    const snapshot = createSnapshot("ai_estimate");
    expect(snapshot.requestId).toBe("11111111-1111-4111-8111-111111111111");
    expect(snapshot.requestNo).toBe("REQ-0701/2026");
    expect(snapshot.items).toHaveLength(2);
    expect(snapshot.items[0]?.localizedUnit).not.toBe("linear_m");
    expect(snapshot.totals.plannedTotal).toBe(1800);

    const { rows, audit } = createGreenLineage();
    expect(rows).toHaveLength(28);
    expect(audit.request_lineage_snapshot_created).toBe(true);
    expect(audit.request_lineage_snapshot_compared_at_each_stage).toBe(true);
    expect(audit.lineage_table_created).toBe(true);
    expect(audit.green).toBe(true);
  });
});
