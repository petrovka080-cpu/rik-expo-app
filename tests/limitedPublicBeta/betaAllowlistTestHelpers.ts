import type {
  AiEstimateLimitedPublicBetaAllowlist,
  AiEstimateLimitedPublicBetaAllowlistEntry,
} from "../../src/lib/ai/productionCanary";

export const LIMITED_BETA_TEST_NOW = new Date("2026-05-30T00:00:00.000Z");

export function realExternalAllowlistEntry(
  overrides: Partial<AiEstimateLimitedPublicBetaAllowlistEntry> = {},
): AiEstimateLimitedPublicBetaAllowlistEntry {
  return {
    userId: "usr_01J0REALALLOWLIST0001",
    accountId: "acct_01J0REALALLOWLIST0001",
    organizationId: "org_01J0REALALLOWLIST0001",
    country: "Kyrgyzstan",
    city: "Bishkek",
    cohort: "beta_residential_small",
    enabled: true,
    createdBy: "ai-estimate-release-owner",
    approvedBy: "ai-estimate-release-owner",
    expiresAt: "2026-12-31T23:59:59.000Z",
    reason: "approved limited public beta account",
    regulatedHighRiskEnabled: false,
    ...overrides,
  };
}

export function allowlistWithEntries(
  entries: AiEstimateLimitedPublicBetaAllowlistEntry[],
  overrides: Partial<AiEstimateLimitedPublicBetaAllowlist> = {},
): AiEstimateLimitedPublicBetaAllowlist {
  return {
    source: "repo_config",
    external_beta_eligibility: "explicit_allowlist_only",
    entries,
    enablesAllUsers: false,
    wildcardAllowlist: false,
    regulatedHighRiskPublicBetaEnabled: false,
    updatedAt: "2026-05-30T00:00:00.000Z",
    ...overrides,
  };
}

