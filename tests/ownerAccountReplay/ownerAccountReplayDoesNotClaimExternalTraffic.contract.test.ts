import { resolveOwnerAccountReplayEligibility } from "../../src/lib/ai/productionCanary";
import { ownerReplayIdentity } from "./ownerAccountReplayTestHelpers";

test("owner account replay never claims real external user traffic", () => {
  const eligibility = resolveOwnerAccountReplayEligibility({
    identity: ownerReplayIdentity(),
    requireAuthenticatedSession: true,
  });

  expect(eligibility.owner_account_live_replay_allowed).toBe(true);
  expect(eligibility.real_external_user_traffic_proven).toBe(false);
  expect(eligibility.public_beta_enabled).toBe(false);
  expect(eligibility.production_rollout_enabled).toBe(false);
});
