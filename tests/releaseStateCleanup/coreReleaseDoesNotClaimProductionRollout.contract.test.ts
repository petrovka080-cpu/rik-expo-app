import { greenCoreReport } from "./scopedReleaseVerifyTestHelpers";

it("does not let core release verify claim production rollout", () => {
  expect(greenCoreReport()).toMatchObject({
    core_release_claims_production_rollout: false,
    core_release_claims_public_beta: false,
    core_release_claims_app_review: false,
  });
});
