import { buildAiEstimateOwnerAccountReplayPolicy } from "../../src/lib/ai/productionCanary";
import { expectNoOwnerReplayPattern } from "./ownerReplayArchitectureTestHelpers";

test("owner replay architecture does not enable public rollout", () => {
  const policy = buildAiEstimateOwnerAccountReplayPolicy();

  expect(policy.public_beta_enabled).toBe(false);
  expect(policy.production_rollout_enabled).toBe(false);
  expectNoOwnerReplayPattern(/public_beta_enabled:\s*true|production_rollout_enabled:\s*true/, "public rollout enabled");
});
