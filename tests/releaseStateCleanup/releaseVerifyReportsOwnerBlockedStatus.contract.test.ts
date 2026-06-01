import { greenCoreReport } from "./scopedReleaseVerifyTestHelpers";

it("reports owner blocked status from core release verify instead of hiding it", () => {
  expect(greenCoreReport()).toMatchObject({
    final_status: "GREEN_RELEASE_CORE_BASELINE_READY",
    owner_gate_status: "BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE",
    owner_gate_required_for_production_claims: true,
  });
});
