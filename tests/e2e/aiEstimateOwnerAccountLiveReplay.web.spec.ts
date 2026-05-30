import { expect, test } from "playwright/test";

import {
  buildAiEstimateOwnerAccountReplayPolicy,
  resolveOwnerAccountReplayEligibility,
  resolveOwnerAccountReplayIdentity,
  validateOwnerAccountReplayPolicy,
} from "../../src/lib/ai/productionCanary";
import {
  writeOwnerAccountWebArtifacts,
} from "../../scripts/e2e/aiEstimateOwnerAccountLiveReplayCore";

test.describe("AI estimate owner account live replay", () => {
  test("keeps public rollout disabled and blocks honestly without owner session", () => {
    const policy = buildAiEstimateOwnerAccountReplayPolicy();
    const validation = validateOwnerAccountReplayPolicy(policy);
    const identity = resolveOwnerAccountReplayIdentity();
    const eligibility = resolveOwnerAccountReplayEligibility({ identity, policy, requireAuthenticatedSession: true });

    expect(validation.valid).toBe(true);
    expect(policy.public_beta_enabled).toBe(false);
    expect(policy.production_rollout_enabled).toBe(false);
    expect(eligibility.real_external_user_traffic_proven).toBe(false);
  });

  test("writes owner web replay artifacts with session-aware status", () => {
    const web = writeOwnerAccountWebArtifacts();
    expect(web.public_beta_disabled ?? true).toBe(true);
    expect(web.production_rollout_disabled ?? true).toBe(true);
    expect("real_external_user_traffic_proven" in web ? web.real_external_user_traffic_proven : false).toBe(false);
    expect(web.fake_green_claimed).toBe(false);
  });
});
