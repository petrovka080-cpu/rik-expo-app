import { professionalSnapshotAudit } from "./professionalEstimateTestHelpers";

describe("professional estimate selected work key preserved", () => {
  it("does not lose selected_work_key through snapshot creation", () => {
    const result = professionalSnapshotAudit();
    expect(result.selected_work_key_lost).toBe(0);
  });
});
