import { resolveOwnerAccountReplayEligibility } from "../../src/lib/ai/productionCanary";

test("owner account replay requires an owner identity", () => {
  const eligibility = resolveOwnerAccountReplayEligibility({
    identity: { source: "missing" },
    requireAuthenticatedSession: true,
  });

  expect(eligibility.owner_account_live_replay_allowed).toBe(false);
  expect(eligibility.reason).toBe("BLOCKED_OWNER_ACCOUNT_ID_MISSING");
  expect(eligibility.public_beta_enabled).toBe(false);
  expect(eligibility.production_rollout_enabled).toBe(false);
});
