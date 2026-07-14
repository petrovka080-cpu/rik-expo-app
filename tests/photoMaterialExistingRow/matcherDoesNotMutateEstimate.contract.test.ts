import { getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";
import { checkPhotoMaterialCandidateCompatibility } from "../../src/lib/ai/photoMaterialExistingRow";
import { createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material matcher side effects", () => {
  it("does not mutate estimates", () => {
    const fixture = createReadyScanFixture();
    const before = getCurrentEstimateRevision(fixture.record.revision_state);
    const result = checkPhotoMaterialCandidateCompatibility({
      row: before.editable_estimate_snapshot.rows[0],
      candidate: fixture.recognition.candidates[0],
    });
    const after = getCurrentEstimateRevision(fixture.record.revision_state);

    expect(result.compatible).toBe(true);
    expect(after.revision_id).toBe(before.revision_id);
    expect(after.full_snapshot_hash).toBe(before.full_snapshot_hash);
  });
});
