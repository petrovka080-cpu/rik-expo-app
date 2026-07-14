import { currentRevision, estimateRevisionState } from "./estimateRevisionTestHelpers";

describe("estimate revision snapshot schema", () => {
  it("creates the initial immutable revision with required hashes and no fake green", () => {
    const state = estimateRevisionState();
    const revision = currentRevision(state);

    expect(state.fake_green_claimed).toBe(false);
    expect(revision).toMatchObject({
      revision_id: "estimate_revision:estimate_1:v1",
      estimate_id: "estimate_1",
      request_id: "request_1",
      version_number: 1,
      parent_revision_id: null,
      status: "DRAFT",
      source: "AI_GENERATED",
      selected_work_key: "laminate_installation",
      region: "Bishkek",
      currency: "KGS",
      immutable: true,
      fake_green_claimed: false,
    });
    expect(revision.rows_hash).toMatch(/^[a-f0-9]{8}$/);
    expect(revision.totals_hash).toMatch(/^[a-f0-9]{8}$/);
    expect(revision.full_snapshot_hash).toMatch(/^[a-f0-9]{8}$/);
  });
});
