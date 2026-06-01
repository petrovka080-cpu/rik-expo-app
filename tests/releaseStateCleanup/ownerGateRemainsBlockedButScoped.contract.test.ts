import { buildReleaseScopeSummary } from "../../scripts/release/releaseTargetScope";
import { OWNER_GATE_BLOCKED_STATUS } from "../../scripts/release/releaseGuard.shared";

it("keeps the owner gate scoped and blocked without claiming owner proof", () => {
  const scope = buildReleaseScopeSummary();

  expect(scope.owner_gate_deleted).toBe(false);
  expect(scope.owner_gate_globally_optional).toBe(false);
  expect(scope.owner_gate_moved_to_scoped_owner_verify).toBe(true);
  expect(scope.owner_gate_status).toBe(OWNER_GATE_BLOCKED_STATUS);
  expect(scope.core_release_claims_owner_replay).toBe(false);
  expect(scope.core_release_claims_external_user_traffic).toBe(false);
  expect(scope.fake_green_claimed).toBe(false);
});
