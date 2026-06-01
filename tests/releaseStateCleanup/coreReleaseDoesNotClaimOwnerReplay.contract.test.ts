import { greenCoreReport } from "./scopedReleaseVerifyTestHelpers";

it("does not let core release verify claim owner replay", () => {
  const report = greenCoreReport();
  expect(report).toMatchObject({
    core_release_claims_owner_replay: false,
    owner_gate_status: "BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE",
  });
  expect(report).not.toHaveProperty("owner_account_live_replay_proven");
});
