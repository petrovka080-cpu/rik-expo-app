import {
  createPhotoMaterialScanSession,
} from "../../src/lib/ai/photoMaterialExistingRow";
import { FEATURE_ON, PHOTO_USER_ID, photoMaterialRecord } from "./photoMaterialExistingRowTestHelpers";
import { getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";

describe("photo material scan target row", () => {
  it("requires targetRowId for every scan session", () => {
    const record = photoMaterialRecord();
    const current = getCurrentEstimateRevision(record.revision_state);

    expect(() => createPhotoMaterialScanSession({
      userId: PHOTO_USER_ID,
      estimateId: record.draft.estimate_id,
      baseRevisionId: current.revision_id,
      targetRowId: null,
      snapshot: current.editable_estimate_snapshot,
      featurePolicy: FEATURE_ON,
    })).toThrow("PHOTO_MATERIAL_SCAN_TARGET_ROW_REQUIRED");
  });
});
