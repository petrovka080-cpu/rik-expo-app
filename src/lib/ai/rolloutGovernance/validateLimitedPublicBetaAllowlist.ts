import {
  AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST,
} from "./limitedPublicBetaExecutionTypes";
import type {
  AiEstimateLimitedPublicBetaAllowlist,
  AiEstimateLimitedPublicBetaAllowlistEntry,
  AiEstimateLimitedPublicBetaRolloutContract,
} from "./limitedPublicBetaAllowlistTypes";
import { AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_COHORTS } from "./limitedPublicBetaAllowlistTypes";

export type AiEstimateLimitedPublicBetaAllowlistValidation = {
  valid: boolean;
  issues: string[];
  allowlist_required: true;
  allowlist_present: boolean;
  allowlist_empty: boolean;
  real_external_allowlist_ids_present: boolean;
  wildcard_allowlist_found: boolean;
  enables_all_users: boolean;
  regulated_high_risk_public_beta_enabled: boolean;
  expired_entries_count: number;
  disabled_entries_count: number;
  wrong_country_city_count: number;
  fake_external_ids_found: boolean;
  missing_governance_fields_count: number;
  eligible_entries_count: number;
  real_external_identifiers_redacted: string[];
  fake_green_claimed: false;
};

export type AiEstimateLimitedPublicBetaRolloutContractValidation = {
  valid: boolean;
  issues: string[];
  full_public_rollout_enabled: false;
  limited_public_beta_enabled_by_default: false;
  manual_enable_required: true;
  initial_public_beta_percent_lte_0_1: boolean;
  max_public_beta_percent_lte_0_5: boolean;
  country_city_allowlist_required: boolean;
  monitoring_owner_present: boolean;
  rollback_owner_present: boolean;
  daily_error_budget_required: boolean;
  kill_switch_required: boolean;
  rollback_required: boolean;
  regulated_high_risk_disabled_by_default: boolean;
};

const FAKE_ID_PATTERNS = [
  /\*/,
  /^all(?:_users)?$/i,
  /^public$/i,
  /dummy/i,
  /fake/i,
  /fixture/i,
  /placeholder/i,
  /example/i,
  /sample/i,
  /staging/i,
  /^test[-_]/i,
  /actual-id-required/i,
  /allowlisted_user/i,
];

function identifiers(entry: AiEstimateLimitedPublicBetaAllowlistEntry): string[] {
  return [entry.userId, entry.accountId, entry.organizationId]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function hasWildcard(entry: AiEstimateLimitedPublicBetaAllowlistEntry): boolean {
  return identifiers(entry).some((id) => id === "*" || /^all(?:_users)?$/i.test(id) || /^public$/i.test(id));
}

export function isRealExternalLimitedPublicBetaIdentifier(identifier: string): boolean {
  const trimmed = identifier.trim();
  return trimmed.length >= 8 && !FAKE_ID_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function entryExpired(entry: AiEstimateLimitedPublicBetaAllowlistEntry, now: Date): boolean {
  const timestamp = Date.parse(entry.expiresAt);
  return !Number.isFinite(timestamp) || timestamp <= now.getTime();
}

function countryCityAllowed(entry: AiEstimateLimitedPublicBetaAllowlistEntry): boolean {
  return AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST.some((item) =>
    item.country === entry.country && item.city === entry.city,
  );
}

function governanceFieldsPresent(entry: AiEstimateLimitedPublicBetaAllowlistEntry): boolean {
  return (
    entry.createdBy.trim().length > 0 &&
    entry.approvedBy.trim().length > 0 &&
    entry.expiresAt.trim().length > 0 &&
    entry.reason.trim().length > 0 &&
    AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_COHORTS.includes(entry.cohort)
  );
}

export function validateLimitedPublicBetaAllowlist(
  allowlist: AiEstimateLimitedPublicBetaAllowlist,
  options: { now?: Date; requireRealExternalIds?: boolean } = {},
): AiEstimateLimitedPublicBetaAllowlistValidation {
  const now = options.now ?? new Date();
  const requireRealExternalIds = options.requireRealExternalIds ?? true;
  const issues: string[] = [];
  const allowlist_present = allowlist.source !== "missing";
  const allowlist_empty = allowlist.entries.length === 0;
  const wildcardEntries = allowlist.entries.filter(hasWildcard);
  const expiredEntries = allowlist.entries.filter((entry) => entryExpired(entry, now));
  const disabledEntries = allowlist.entries.filter((entry) => !entry.enabled);
  const wrongCountryCity = allowlist.entries.filter((entry) => !countryCityAllowed(entry));
  const missingGovernance = allowlist.entries.filter((entry) => !governanceFieldsPresent(entry));
  const fakeIds = allowlist.entries.filter((entry) =>
    identifiers(entry).some((identifier) => !isRealExternalLimitedPublicBetaIdentifier(identifier)),
  );
  const eligibleEntries = allowlist.entries.filter((entry) =>
    entry.enabled &&
    !entryExpired(entry, now) &&
    countryCityAllowed(entry) &&
    governanceFieldsPresent(entry) &&
    identifiers(entry).length > 0 &&
    identifiers(entry).every(isRealExternalLimitedPublicBetaIdentifier) &&
    !entry.regulatedHighRiskEnabled,
  );
  const real_external_allowlist_ids_present = eligibleEntries.length > 0;

  if (!allowlist_present) issues.push("ALLOWLIST_MISSING");
  if (allowlist_empty) issues.push("ALLOWLIST_EMPTY");
  if (allowlist.external_beta_eligibility !== "explicit_allowlist_only") {
    issues.push("EXTERNAL_BETA_NOT_EXPLICIT_ALLOWLIST_ONLY");
  }
  if (wildcardEntries.length > 0 || allowlist.wildcardAllowlist) issues.push("WILDCARD_ALLOWLIST_FOUND");
  if (allowlist.enablesAllUsers) issues.push("ALLOWLIST_ENABLES_ALL_USERS");
  if (allowlist.regulatedHighRiskPublicBetaEnabled || allowlist.entries.some((entry) => entry.regulatedHighRiskEnabled)) {
    issues.push("REGULATED_HIGH_RISK_PUBLIC_BETA_ENABLED");
  }
  if (expiredEntries.length > 0) issues.push("ALLOWLIST_EXPIRED_ENTRY_FOUND");
  if (disabledEntries.length > 0) issues.push("ALLOWLIST_DISABLED_ENTRY_FOUND");
  if (wrongCountryCity.length > 0) issues.push("ALLOWLIST_COUNTRY_CITY_INVALID");
  if (missingGovernance.length > 0) issues.push("ALLOWLIST_GOVERNANCE_FIELDS_MISSING");
  if (fakeIds.length > 0) issues.push("FAKE_EXTERNAL_ALLOWLIST_IDS_FOUND");
  if (requireRealExternalIds && !real_external_allowlist_ids_present) issues.push("REAL_EXTERNAL_ALLOWLIST_IDS_MISSING");

  return {
    valid: issues.length === 0,
    issues,
    allowlist_required: true,
    allowlist_present,
    allowlist_empty,
    real_external_allowlist_ids_present,
    wildcard_allowlist_found: wildcardEntries.length > 0 || allowlist.wildcardAllowlist,
    enables_all_users: allowlist.enablesAllUsers,
    regulated_high_risk_public_beta_enabled: allowlist.regulatedHighRiskPublicBetaEnabled,
    expired_entries_count: expiredEntries.length,
    disabled_entries_count: disabledEntries.length,
    wrong_country_city_count: wrongCountryCity.length,
    fake_external_ids_found: fakeIds.length > 0,
    missing_governance_fields_count: missingGovernance.length,
    eligible_entries_count: eligibleEntries.length,
    real_external_identifiers_redacted: eligibleEntries.map((_, index) => `external_beta_allowlist_${index + 1}`),
    fake_green_claimed: false,
  };
}

export function buildAiEstimateLimitedPublicBetaRolloutContract(
  overrides: Partial<AiEstimateLimitedPublicBetaRolloutContract> = {},
): AiEstimateLimitedPublicBetaRolloutContract {
  return {
    external_beta_flag_approval: true,
    full_public_rollout_enabled: false,
    limited_public_beta_enabled_by_default: false,
    manual_enable_required: true,
    initial_public_beta_percent: 0.1,
    max_public_beta_percent: 0.5,
    eligible_users: "explicit_allowlist_only",
    country_city_allowlist: [...AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST],
    regulated_high_risk_public_beta_enabled: false,
    monitoring_owner: "ai-estimate-release-owner",
    rollback_owner: "ai-estimate-release-owner",
    daily_error_budget_required: true,
    kill_switch_required: true,
    rollback_required: true,
    ...overrides,
  };
}

export function validateLimitedPublicBetaRolloutContract(
  contract: AiEstimateLimitedPublicBetaRolloutContract,
): AiEstimateLimitedPublicBetaRolloutContractValidation {
  const issues: string[] = [];
  const expectedCities = new Set(AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST.map((item) => `${item.country}:${item.city}`));
  const actualCities = new Set(contract.country_city_allowlist.map((item) => `${item.country}:${item.city}`));
  const country_city_allowlist_required =
    expectedCities.size === actualCities.size && [...expectedCities].every((item) => actualCities.has(item));
  const monitoring_owner_present = contract.monitoring_owner.trim().length > 0;
  const rollback_owner_present = contract.rollback_owner.trim().length > 0;
  const initial_public_beta_percent_lte_0_1 = contract.initial_public_beta_percent <= 0.1;
  const max_public_beta_percent_lte_0_5 = contract.max_public_beta_percent <= 0.5;

  if (!contract.external_beta_flag_approval) issues.push("EXTERNAL_BETA_FLAG_APPROVAL_MISSING");
  if (contract.full_public_rollout_enabled) issues.push("FULL_PUBLIC_ROLLOUT_ENABLED");
  if (contract.limited_public_beta_enabled_by_default) issues.push("LIMITED_PUBLIC_BETA_ENABLED_BY_DEFAULT");
  if (!contract.manual_enable_required) issues.push("MANUAL_ENABLE_REQUIRED_MISSING");
  if (!initial_public_beta_percent_lte_0_1) issues.push("INITIAL_PUBLIC_BETA_PERCENT_GT_0_1");
  if (!max_public_beta_percent_lte_0_5) issues.push("MAX_PUBLIC_BETA_PERCENT_GT_0_5");
  if (contract.eligible_users !== "explicit_allowlist_only") issues.push("ELIGIBLE_USERS_NOT_EXPLICIT_ALLOWLIST_ONLY");
  if (!country_city_allowlist_required) issues.push("COUNTRY_CITY_ALLOWLIST_MISSING");
  if (contract.regulated_high_risk_public_beta_enabled) issues.push("REGULATED_HIGH_RISK_PUBLIC_BETA_ENABLED");
  if (!monitoring_owner_present) issues.push("MONITORING_OWNER_MISSING");
  if (!rollback_owner_present) issues.push("ROLLBACK_OWNER_MISSING");
  if (!contract.daily_error_budget_required) issues.push("DAILY_ERROR_BUDGET_REQUIRED_MISSING");
  if (!contract.kill_switch_required) issues.push("KILL_SWITCH_REQUIRED_MISSING");
  if (!contract.rollback_required) issues.push("ROLLBACK_REQUIRED_MISSING");

  return {
    valid: issues.length === 0,
    issues,
    full_public_rollout_enabled: false,
    limited_public_beta_enabled_by_default: false,
    manual_enable_required: true,
    initial_public_beta_percent_lte_0_1,
    max_public_beta_percent_lte_0_5,
    country_city_allowlist_required,
    monitoring_owner_present,
    rollback_owner_present,
    daily_error_budget_required: contract.daily_error_budget_required,
    kill_switch_required: contract.kill_switch_required,
    rollback_required: contract.rollback_required,
    regulated_high_risk_disabled_by_default: !contract.regulated_high_risk_public_beta_enabled,
  };
}
