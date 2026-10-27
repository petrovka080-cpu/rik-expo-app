import fs from "node:fs";
import path from "node:path";

import {
  AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST,
} from "./limitedPublicBetaExecutionTypes";
import { safeJsonParseValue } from "../../format";
import type {
  AiEstimateLimitedPublicBetaAllowlist,
  AiEstimateLimitedPublicBetaAllowlistCohort,
  AiEstimateLimitedPublicBetaAllowlistEntry,
  AiEstimateLimitedPublicBetaAllowlistEligibility,
  AiEstimateLimitedPublicBetaAllowlistEligibilityInput,
  AiEstimateLimitedPublicBetaAllowlistSource,
} from "./limitedPublicBetaAllowlistTypes";

const ALLOWLIST_CONFIG_PATHS = [
  "config/ai-estimate-limited-public-beta-allowlist.json",
  "docs/release/ai-estimate-limited-public-beta-allowlist.json",
];

const DEFAULT_COUNTRY_CITY = AI_ESTIMATE_LIMITED_PUBLIC_BETA_COUNTRY_CITY_ALLOWLIST[0];

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function boolValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCohort(value: unknown): AiEstimateLimitedPublicBetaAllowlistCohort {
  const raw = stringValue(value);
  switch (raw) {
    case "beta_commercial_fitout":
    case "beta_engineering_mep":
    case "beta_landscaping_infrastructure":
    case "beta_industrial_non_regulated":
    case "beta_residential_small":
      return raw;
    default:
      return "beta_residential_small";
  }
}

function normalizeEntry(
  raw: Record<string, unknown>,
  defaults: Partial<AiEstimateLimitedPublicBetaAllowlistEntry> = {},
): AiEstimateLimitedPublicBetaAllowlistEntry {
  return {
    userId: stringValue(raw.userId) ?? stringValue(raw.user_id) ?? defaults.userId ?? null,
    accountId: stringValue(raw.accountId) ?? stringValue(raw.account_id) ?? defaults.accountId ?? null,
    organizationId: stringValue(raw.organizationId) ?? stringValue(raw.organization_id) ?? defaults.organizationId ?? null,
    country: stringValue(raw.country) ?? defaults.country ?? DEFAULT_COUNTRY_CITY.country,
    city: stringValue(raw.city) ?? defaults.city ?? DEFAULT_COUNTRY_CITY.city,
    cohort: normalizeCohort(raw.cohort ?? defaults.cohort),
    enabled: boolValue(raw.enabled, defaults.enabled ?? true),
    createdBy: stringValue(raw.createdBy) ?? stringValue(raw.created_by) ?? defaults.createdBy ?? "",
    approvedBy: stringValue(raw.approvedBy) ?? stringValue(raw.approved_by) ?? defaults.approvedBy ?? "",
    expiresAt: stringValue(raw.expiresAt) ?? stringValue(raw.expires_at) ?? defaults.expiresAt ?? "",
    reason: stringValue(raw.reason) ?? defaults.reason ?? "",
    regulatedHighRiskEnabled: boolValue(
      raw.regulatedHighRiskEnabled ?? raw.regulated_high_risk_enabled,
      defaults.regulatedHighRiskEnabled ?? false,
    ),
  };
}

function parseIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(/[,\s;]+/).map((item) => item.trim()).filter(Boolean))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseJsonRecord(raw: string): Record<string, unknown> | null {
  const parsed = safeJsonParseValue<unknown>(raw, null);
  return isRecord(parsed) ? parsed : null;
}

function readJson(relativePath: string): Record<string, unknown> | null {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return parseJsonRecord(fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, ""));
}

function allowlistFromEntries(
  source: AiEstimateLimitedPublicBetaAllowlistSource,
  entries: AiEstimateLimitedPublicBetaAllowlistEntry[],
  raw: Record<string, unknown> = {},
): AiEstimateLimitedPublicBetaAllowlist {
  return {
    source,
    external_beta_eligibility: "explicit_allowlist_only",
    entries,
    enablesAllUsers: boolValue(raw.enablesAllUsers ?? raw.enables_all_users, false),
    wildcardAllowlist: boolValue(raw.wildcardAllowlist ?? raw.wildcard_allowlist, false),
    regulatedHighRiskPublicBetaEnabled: boolValue(
      raw.regulatedHighRiskPublicBetaEnabled ?? raw.regulated_high_risk_public_beta_enabled,
      false,
    ),
    updatedAt: stringValue(raw.updatedAt) ?? stringValue(raw.updated_at),
  };
}

function entriesFromJson(raw: Record<string, unknown>): AiEstimateLimitedPublicBetaAllowlistEntry[] {
  if (Array.isArray(raw.entries)) {
    return raw.entries
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry) => normalizeEntry(entry));
  }
  const ids = Array.isArray(raw.user_allowlist_ids)
    ? raw.user_allowlist_ids.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  return ids.map((id) =>
    normalizeEntry(
      { userId: id },
      {
        country: stringValue(raw.country) ?? DEFAULT_COUNTRY_CITY.country,
        city: stringValue(raw.city) ?? DEFAULT_COUNTRY_CITY.city,
        cohort: normalizeCohort(raw.cohort),
        enabled: true,
        createdBy: stringValue(raw.createdBy) ?? stringValue(raw.created_by) ?? "",
        approvedBy: stringValue(raw.approvedBy) ?? stringValue(raw.approved_by) ?? "",
        expiresAt: stringValue(raw.expiresAt) ?? stringValue(raw.expires_at) ?? "",
        reason: stringValue(raw.reason) ?? "",
      },
    ),
  );
}

export function resolveLimitedPublicBetaAllowlist(): AiEstimateLimitedPublicBetaAllowlist {
  const envJson = process.env.AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_JSON;
  if (envJson) {
    const raw = parseJsonRecord(envJson);
    if (!raw) {
      return allowlistFromEntries("env", [], { updatedAt: new Date().toISOString() });
    }
    return allowlistFromEntries("env", entriesFromJson(raw), raw);
  }

  const envIds = parseIds(process.env.AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_IDS);
  if (envIds.length > 0) {
    const defaults = {
      country: process.env.AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_COUNTRY ?? DEFAULT_COUNTRY_CITY.country,
      city: process.env.AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CITY ?? DEFAULT_COUNTRY_CITY.city,
      cohort: normalizeCohort(process.env.AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_COHORT),
      enabled: true,
      createdBy: process.env.AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CREATED_BY ?? "",
      approvedBy: process.env.AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_APPROVED_BY ?? "",
      expiresAt: process.env.AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_EXPIRES_AT ?? "",
      reason: process.env.AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_REASON ?? "",
    };
    return allowlistFromEntries("env", envIds.map((id) => normalizeEntry({ userId: id }, defaults)));
  }

  for (const relativePath of ALLOWLIST_CONFIG_PATHS) {
    const raw = readJson(relativePath);
    if (!raw) continue;
    return allowlistFromEntries("repo_config", entriesFromJson(raw), raw);
  }

  return allowlistFromEntries("missing", []);
}

function identifiers(entry: AiEstimateLimitedPublicBetaAllowlistEntry): string[] {
  return [entry.userId, entry.accountId, entry.organizationId]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function entryMatches(input: AiEstimateLimitedPublicBetaAllowlistEligibilityInput, entry: AiEstimateLimitedPublicBetaAllowlistEntry): boolean {
  return (
    (Boolean(input.userId) && entry.userId === input.userId) ||
    (Boolean(input.accountId) && entry.accountId === input.accountId) ||
    (Boolean(input.organizationId) && entry.organizationId === input.organizationId)
  );
}

function isExpired(entry: AiEstimateLimitedPublicBetaAllowlistEntry, now: Date): boolean {
  const expiresAt = Date.parse(entry.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= now.getTime();
}

export function resolveLimitedPublicBetaAllowlistEligibility(
  input: AiEstimateLimitedPublicBetaAllowlistEligibilityInput,
): AiEstimateLimitedPublicBetaAllowlistEligibility {
  const now = input.now ?? new Date();
  if (input.killSwitchActive) {
    return {
      eligible: false,
      status: "blocked_kill_switch",
      reason: "LIMITED_PUBLIC_BETA_KILL_SWITCH_ACTIVE",
      matchedIdentifier: null,
      matchedCohort: null,
    };
  }
  if (!input.manualEnable) {
    return {
      eligible: false,
      status: "blocked_missing_manual_enable",
      reason: "LIMITED_PUBLIC_BETA_MANUAL_ENABLE_REQUIRED",
      matchedIdentifier: null,
      matchedCohort: null,
    };
  }
  if (input.allowlist.entries.length === 0) {
    return {
      eligible: false,
      status: "blocked_allowlist_empty",
      reason: "LIMITED_PUBLIC_BETA_ALLOWLIST_EMPTY",
      matchedIdentifier: null,
      matchedCohort: null,
    };
  }
  const entry = input.allowlist.entries.find((candidate) => entryMatches(input, candidate));
  if (!entry) {
    return {
      eligible: false,
      status: "blocked_user_not_allowlisted",
      reason: "LIMITED_PUBLIC_BETA_USER_NOT_ALLOWLISTED",
      matchedIdentifier: null,
      matchedCohort: null,
    };
  }
  if (!entry.enabled) {
    return {
      eligible: false,
      status: "blocked_disabled",
      reason: "LIMITED_PUBLIC_BETA_ALLOWLIST_ENTRY_DISABLED",
      matchedIdentifier: identifiers(entry)[0] ?? null,
      matchedCohort: entry.cohort,
    };
  }
  if (isExpired(entry, now)) {
    return {
      eligible: false,
      status: "blocked_expired",
      reason: "LIMITED_PUBLIC_BETA_ALLOWLIST_ENTRY_EXPIRED",
      matchedIdentifier: identifiers(entry)[0] ?? null,
      matchedCohort: entry.cohort,
    };
  }
  if (entry.country !== input.country || entry.city !== input.city) {
    return {
      eligible: false,
      status: "blocked_country_city",
      reason: "LIMITED_PUBLIC_BETA_COUNTRY_CITY_NOT_ALLOWLISTED",
      matchedIdentifier: identifiers(entry)[0] ?? null,
      matchedCohort: entry.cohort,
    };
  }
  if (input.regulatedHighRisk && !entry.regulatedHighRiskEnabled) {
    return {
      eligible: false,
      status: "blocked_regulated_high_risk",
      reason: "LIMITED_PUBLIC_BETA_REGULATED_HIGH_RISK_DISABLED_BY_DEFAULT",
      matchedIdentifier: identifiers(entry)[0] ?? null,
      matchedCohort: entry.cohort,
    };
  }
  return {
    eligible: true,
    status: "eligible_limited_public_beta",
    reason: "LIMITED_PUBLIC_BETA_ALLOWLISTED_MANUAL_ENABLE_ONLY",
    matchedIdentifier: identifiers(entry)[0] ?? null,
    matchedCohort: entry.cohort,
  };
}
