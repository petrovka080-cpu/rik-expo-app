import { buildOwnerReplayMatrixForRuntimeFindings } from "./ownerAccountReplayTestHelpers";

test("owner account replay blocks on weak generic rows", () => {
  const proof = buildOwnerReplayMatrixForRuntimeFindings(["WEAK_GENERIC_BOQ_ROWS"]);

  expect(proof.matrix.weak_generic_rows_found).toBe(true);
  expect(proof.matrix.owner_account_live_replay_proven).toBe(false);
  expect(proof.matrix.final_status).toBe("BLOCKED_WEB_OWNER_REPLAY_FAILED");
});
