import { ownerAccountBlockedDecision } from "../../scripts/release/releaseStateCleanupCore";

it("keeps owner-account blocked state honest without external traffic claims", () => {
  expect(ownerAccountBlockedDecision()).toMatchObject({
    final_status: "BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE",
    owner_account_live_replay_proven: false,
    owner_account_identity_present: false,
    owner_account_session_verified: false,
    real_external_user_traffic_proven: false,
    real_user_traffic_claimed: false,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    fake_green_claimed: false,
  });
});
