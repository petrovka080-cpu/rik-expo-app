import {
  buildAiEstimateLimitedPublicBetaRolloutContract,
  resolveLimitedPublicBetaAllowlist,
  resolveLimitedPublicBetaAllowlistEligibility,
  validateLimitedPublicBetaAllowlist,
  validateLimitedPublicBetaRolloutContract,
  type AiEstimateLimitedPublicBetaAllowlist,
  type AiEstimateLimitedPublicBetaAllowlistEntry,
} from "../../src/lib/ai/productionCanary";
import {
  writeLimitedPublicBetaJson,
} from "./aiEstimateLimitedPublicBetaExecutionCore";

const PROOF_NOW = new Date("2026-05-30T00:00:00.000Z");

function stagingEntry(overrides: Partial<AiEstimateLimitedPublicBetaAllowlistEntry> = {}): AiEstimateLimitedPublicBetaAllowlistEntry {
  return {
    userId: "staging_beta_user_bishkek",
    accountId: "staging_beta_account_bishkek",
    organizationId: "staging_beta_org_bishkek",
    country: "Kyrgyzstan",
    city: "Bishkek",
    cohort: "beta_residential_small",
    enabled: true,
    createdBy: "allowlist-control-plane-proof",
    approvedBy: "allowlist-control-plane-proof",
    expiresAt: "2026-12-31T23:59:59.000Z",
    reason: "staging mechanism proof only; not real external rollout evidence",
    regulatedHighRiskEnabled: false,
    ...overrides,
  };
}

function stagingAllowlist(entries: AiEstimateLimitedPublicBetaAllowlistEntry[]): AiEstimateLimitedPublicBetaAllowlist {
  return {
    source: "test_staging",
    external_beta_eligibility: "explicit_allowlist_only",
    entries,
    enablesAllUsers: false,
    wildcardAllowlist: false,
    regulatedHighRiskPublicBetaEnabled: false,
    updatedAt: "2026-05-30T00:00:00.000Z",
  };
}

export function runAiEstimateLimitedPublicBetaAllowlistProof() {
  const actualAllowlist = resolveLimitedPublicBetaAllowlist();
  const allowlistValidation = validateLimitedPublicBetaAllowlist(actualAllowlist, { now: PROOF_NOW });
  const rolloutContract = buildAiEstimateLimitedPublicBetaRolloutContract();
  const rolloutContractValidation = validateLimitedPublicBetaRolloutContract(rolloutContract);
  const mechanismAllowlist = stagingAllowlist([stagingEntry()]);

  const cases = [
    {
      name: "non_allowlisted_user_cannot_access_beta",
      result: resolveLimitedPublicBetaAllowlistEligibility({
        allowlist: mechanismAllowlist,
        userId: "not_on_allowlist",
        country: "Kyrgyzstan",
        city: "Bishkek",
        manualEnable: true,
        regulatedHighRisk: false,
        now: PROOF_NOW,
      }),
      expectEligible: false,
    },
    {
      name: "allowlisted_user_requires_manual_flag",
      result: resolveLimitedPublicBetaAllowlistEligibility({
        allowlist: mechanismAllowlist,
        userId: "staging_beta_user_bishkek",
        country: "Kyrgyzstan",
        city: "Bishkek",
        manualEnable: false,
        regulatedHighRisk: false,
        now: PROOF_NOW,
      }),
      expectEligible: false,
    },
    {
      name: "allowlisted_user_can_access_when_manual_flag_enabled",
      result: resolveLimitedPublicBetaAllowlistEligibility({
        allowlist: mechanismAllowlist,
        userId: "staging_beta_user_bishkek",
        country: "Kyrgyzstan",
        city: "Bishkek",
        manualEnable: true,
        regulatedHighRisk: false,
        now: PROOF_NOW,
      }),
      expectEligible: true,
    },
    {
      name: "kill_switch_overrides_allowlist",
      result: resolveLimitedPublicBetaAllowlistEligibility({
        allowlist: mechanismAllowlist,
        userId: "staging_beta_user_bishkek",
        country: "Kyrgyzstan",
        city: "Bishkek",
        manualEnable: true,
        regulatedHighRisk: false,
        killSwitchActive: true,
        now: PROOF_NOW,
      }),
      expectEligible: false,
    },
    {
      name: "expired_allowlist_entry_rejected",
      result: resolveLimitedPublicBetaAllowlistEligibility({
        allowlist: stagingAllowlist([stagingEntry({ expiresAt: "2026-05-29T23:59:59.000Z" })]),
        userId: "staging_beta_user_bishkek",
        country: "Kyrgyzstan",
        city: "Bishkek",
        manualEnable: true,
        regulatedHighRisk: false,
        now: PROOF_NOW,
      }),
      expectEligible: false,
    },
    {
      name: "disabled_allowlist_entry_rejected",
      result: resolveLimitedPublicBetaAllowlistEligibility({
        allowlist: stagingAllowlist([stagingEntry({ enabled: false })]),
        userId: "staging_beta_user_bishkek",
        country: "Kyrgyzstan",
        city: "Bishkek",
        manualEnable: true,
        regulatedHighRisk: false,
        now: PROOF_NOW,
      }),
      expectEligible: false,
    },
    {
      name: "wrong_city_country_rejected",
      result: resolveLimitedPublicBetaAllowlistEligibility({
        allowlist: stagingAllowlist([stagingEntry({ country: "Kazakhstan", city: "Almaty" })]),
        userId: "staging_beta_user_bishkek",
        country: "Kyrgyzstan",
        city: "Bishkek",
        manualEnable: true,
        regulatedHighRisk: false,
        now: PROOF_NOW,
      }),
      expectEligible: false,
    },
    {
      name: "regulated_high_risk_excluded_by_default",
      result: resolveLimitedPublicBetaAllowlistEligibility({
        allowlist: mechanismAllowlist,
        userId: "staging_beta_user_bishkek",
        country: "Kyrgyzstan",
        city: "Bishkek",
        manualEnable: true,
        regulatedHighRisk: true,
        now: PROOF_NOW,
      }),
      expectEligible: false,
    },
  ];
  const eligibilityResults = cases.map((item) => ({
    name: item.name,
    passed: item.result.eligible === item.expectEligible,
    expectEligible: item.expectEligible,
    result: item.result,
  }));
  const allowlistProof = {
    final_status: eligibilityResults.every((item) => item.passed)
      ? "LIMITED_PUBLIC_BETA_ALLOWLIST_READY"
      : "NO_GO_ALLOWLIST_POLICY_INVALID",
    public_beta_disabled_by_default: !rolloutContract.limited_public_beta_enabled_by_default,
    full_public_rollout_disabled: !rolloutContract.full_public_rollout_enabled,
    regulated_high_risk_excluded_by_default: !rolloutContract.regulated_high_risk_public_beta_enabled,
    kill_switch_overrides_allowlist: eligibilityResults.some((item) =>
      item.name === "kill_switch_overrides_allowlist" &&
      item.passed &&
      item.result.status === "blocked_kill_switch",
    ),
    test_staging_allowlist_mechanism_only: true,
    cases: eligibilityResults,
    fake_green_claimed: false,
  };
  const allowlistPolicy = {
    allowlist_control_plane_ready: allowlistProof.final_status === "LIMITED_PUBLIC_BETA_ALLOWLIST_READY",
    actual_allowlist_source: actualAllowlist.source,
    actual_allowlist_entries_total: actualAllowlist.entries.length,
    actual_allowlist_entries_redacted: actualAllowlist.entries.map((_, index) => `allowlist_entry_${index + 1}`),
    ...allowlistValidation,
    fake_green_claimed: false,
  };

  writeLimitedPublicBetaJson("rollout_contract.json", {
    ...rolloutContract,
    validation: rolloutContractValidation,
    fake_green_claimed: false,
  });
  writeLimitedPublicBetaJson("allowlist_policy.json", allowlistPolicy);
  writeLimitedPublicBetaJson("allowlist_proof.json", allowlistProof);
  writeLimitedPublicBetaJson("eligibility_results.json", {
    eligibility_proof_passed: eligibilityResults.every((item) => item.passed),
    results: eligibilityResults,
    fake_green_claimed: false,
  });

  if (allowlistProof.final_status !== "LIMITED_PUBLIC_BETA_ALLOWLIST_READY" || !rolloutContractValidation.valid) {
    throw new Error(`${allowlistProof.final_status}:${rolloutContractValidation.issues.join(";")}`);
  }

  return {
    actualAllowlist,
    allowlistValidation,
    rolloutContract,
    rolloutContractValidation,
    allowlistPolicy,
    allowlistProof,
    eligibilityResults,
  };
}

if (require.main === module) {
  runAiEstimateLimitedPublicBetaAllowlistProof();
}

