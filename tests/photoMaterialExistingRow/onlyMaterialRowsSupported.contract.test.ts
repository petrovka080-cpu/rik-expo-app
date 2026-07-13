import { createPhotoMaterialScanSession } from "../../src/lib/ai/photoMaterialExistingRow";
import { getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";
import { FEATURE_ON, PHOTO_USER_ID, photoMaterialRecord } from "./photoMaterialExistingRowTestHelpers";

describe("photo material scan row kind", () => {
  it("blocks non-material rows", () => {
    const record = photoMaterialRecord({ rowType: "work" });
    const current = getCurrentEstimateRevision(record.revision_state);

    expect(() => createPhotoMaterialScanSession({
      userId: PHOTO_USER_ID,
      estimateId: record.draft.estimate_id,
      baseRevisionId: current.revision_id,
      targetRowId: "mat_c2te",
      snapshot: current.editable_estimate_snapshot,
      featurePolicy: FEATURE_ON,
    })).toThrow("PHOTO_MATERIAL_SCAN_ONLY_MATERIAL_ROWS_SUPPORTED");
  });
});
