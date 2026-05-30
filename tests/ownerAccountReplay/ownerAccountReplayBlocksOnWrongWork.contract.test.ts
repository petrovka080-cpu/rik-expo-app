import { buildOwnerReplayMatrixForRuntimeFindings } from "./ownerAccountReplayTestHelpers";

test("owner account replay blocks on wrong work classification", () => {
  const proof = buildOwnerReplayMatrixForRuntimeFindings(["OBJECT_SCOPE_MISCLASSIFIED"]);

  expect(proof.matrix.object_misclassification_found).toBe(true);
  expect(proof.matrix.owner_account_live_replay_proven).toBe(false);
  expect(proof.matrix.final_status).toBe("BLOCKED_WEB_OWNER_REPLAY_FAILED");
});
