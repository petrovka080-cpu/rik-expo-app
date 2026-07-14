import { runEstimateQualitySnapshotAudit } from "../../scripts/e2e/runEstimateQualityGateProtocolAudit";
import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("snapshot no-desync quality", () => {
  it("passes normal snapshots and blocks hash desync", () => {
    const audit = runEstimateQualitySnapshotAudit({ writeArtifacts: false });

    expect(audit.snapshot_desync_cases).toBe(0);
    expect(audit.ui_pdf_request_history_same_snapshot).toBe(true);
    expectBlockedWith(blockedGateFor("history_hash_mismatch"), "REQUEST_HISTORY_PAYLOAD_MISMATCH");
  });
});
