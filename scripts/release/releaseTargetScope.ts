import {
  OWNER_GATE_BLOCKED_STATUS,
  REQUIRED_RELEASE_GATES,
  SCOPED_OWNER_RELEASE_GATES,
  type ReleaseGateDefinition,
} from "./releaseGuard.shared";

export type ReleaseVerifyScope = "core" | "owner" | "mobile";

export const OWNER_LIVE_QUALITY_GATE_NAME =
  "owner-account-live-estimate-quality-lock-proof";
export const RELEASE_VERIFY_CORE_GREEN_STATUS =
  "GREEN_RELEASE_CORE_BASELINE_READY";
export const RELEASE_VERIFY_CORE_BLOCKED_STATUS =
  "BLOCKED_RELEASE_CORE_BASELINE_NOT_READY";
export const RELEASE_VERIFY_OWNER_BLOCKED_STATUS =
  OWNER_GATE_BLOCKED_STATUS;
export const RELEASE_VERIFY_MOBILE_BLOCKED_STATUS =
  "BLOCKED_MOBILE_RELEASE_BASELINE_NOT_READY";

export type ReleaseScopeSummary = {
  strict_fail_closed_enterprise_mode: true;
  owner_gate_deleted: boolean;
  owner_gate_globally_optional: boolean;
  owner_gate_moved_to_scoped_owner_verify: boolean;
  owner_gate_required_for_production_claims: true;
  owner_gate_status: typeof OWNER_GATE_BLOCKED_STATUS;
  core_release_claims_owner_replay: false;
  core_release_claims_external_user_traffic: false;
  core_release_claims_production_rollout: false;
  core_release_claims_public_beta: false;
  core_release_claims_app_review: false;
  production_claim_blocked_when_owner_blocked: true;
  public_rollout_blocked_when_owner_blocked: true;
  mobile_build_allowed_without_owner_only_if_scope_exempt: true;
  fake_green_claimed: false;
};

export function hasOwnerLiveQualityGate(gates: readonly ReleaseGateDefinition[]): boolean {
  return gates.some((gate) => gate.name === OWNER_LIVE_QUALITY_GATE_NAME);
}

export function ownerGateDeleted(params: {
  requiredGates?: readonly ReleaseGateDefinition[];
  scopedOwnerGates?: readonly ReleaseGateDefinition[];
} = {}): boolean {
  const requiredGates = params.requiredGates ?? REQUIRED_RELEASE_GATES;
  const scopedOwnerGates = params.scopedOwnerGates ?? SCOPED_OWNER_RELEASE_GATES;
  return !hasOwnerLiveQualityGate(requiredGates) && !hasOwnerLiveQualityGate(scopedOwnerGates);
}

export function ownerGateGloballyOptional(params: {
  scopedOwnerGates?: readonly ReleaseGateDefinition[];
} = {}): boolean {
  const scopedOwnerGates = params.scopedOwnerGates ?? SCOPED_OWNER_RELEASE_GATES;
  return !hasOwnerLiveQualityGate(scopedOwnerGates);
}

export function ownerGateMovedToScopedOwnerVerify(params: {
  requiredGates?: readonly ReleaseGateDefinition[];
  scopedOwnerGates?: readonly ReleaseGateDefinition[];
} = {}): boolean {
  const requiredGates = params.requiredGates ?? REQUIRED_RELEASE_GATES;
  const scopedOwnerGates = params.scopedOwnerGates ?? SCOPED_OWNER_RELEASE_GATES;
  return !hasOwnerLiveQualityGate(requiredGates) && hasOwnerLiveQualityGate(scopedOwnerGates);
}

export function buildReleaseScopeSummary(): ReleaseScopeSummary {
  return {
    strict_fail_closed_enterprise_mode: true,
    owner_gate_deleted: ownerGateDeleted(),
    owner_gate_globally_optional: ownerGateGloballyOptional(),
    owner_gate_moved_to_scoped_owner_verify: ownerGateMovedToScopedOwnerVerify(),
    owner_gate_required_for_production_claims: true,
    owner_gate_status: OWNER_GATE_BLOCKED_STATUS,
    core_release_claims_owner_replay: false,
    core_release_claims_external_user_traffic: false,
    core_release_claims_production_rollout: false,
    core_release_claims_public_beta: false,
    core_release_claims_app_review: false,
    production_claim_blocked_when_owner_blocked: true,
    public_rollout_blocked_when_owner_blocked: true,
    mobile_build_allowed_without_owner_only_if_scope_exempt: true,
    fake_green_claimed: false,
  };
}
