import { buildReleaseScopeSummary } from "../../scripts/release/releaseTargetScope";

it("blocks production and public rollout claims while owner gate is blocked", () => {
  expect(buildReleaseScopeSummary()).toMatchObject({
    owner_gate_status: "BLOCKED_OWNER_ACCOUNT_SESSION_NOT_AVAILABLE",
    owner_gate_required_for_production_claims: true,
    production_claim_blocked_when_owner_blocked: true,
    public_rollout_blocked_when_owner_blocked: true,
  });
});
