import type { AiDomainName } from "./aiDomainQueryTypes";

export type AiDomainFreshnessPolicy = {
  domain: AiDomainName;
  maxStalenessMs: number;
  staleBehavior: "mark_stale" | "require_refresh" | "block_fact" | "allow_with_warning";
};

export const AI_DOMAIN_FRESHNESS_POLICIES: Record<AiDomainName, AiDomainFreshnessPolicy> = {
  procurement: { domain: "procurement", maxStalenessMs: 15 * 60 * 1000, staleBehavior: "mark_stale" },
  warehouse: { domain: "warehouse", maxStalenessMs: 5 * 60 * 1000, staleBehavior: "allow_with_warning" },
  finance: { domain: "finance", maxStalenessMs: 15 * 60 * 1000, staleBehavior: "mark_stale" },
  field: { domain: "field", maxStalenessMs: 15 * 60 * 1000, staleBehavior: "mark_stale" },
  documents: { domain: "documents", maxStalenessMs: 60 * 60 * 1000, staleBehavior: "mark_stale" },
  media: { domain: "media", maxStalenessMs: 60 * 60 * 1000, staleBehavior: "mark_stale" },
  marketplace: { domain: "marketplace", maxStalenessMs: 30 * 60 * 1000, staleBehavior: "allow_with_warning" },
  contractors: { domain: "contractors", maxStalenessMs: 15 * 60 * 1000, staleBehavior: "mark_stale" },
  office: { domain: "office", maxStalenessMs: 15 * 60 * 1000, staleBehavior: "mark_stale" },
  client: { domain: "client", maxStalenessMs: 30 * 60 * 1000, staleBehavior: "mark_stale" },
  approvals: { domain: "approvals", maxStalenessMs: 5 * 60 * 1000, staleBehavior: "require_refresh" },
  consumer_repair: { domain: "consumer_repair", maxStalenessMs: 15 * 60 * 1000, staleBehavior: "mark_stale" },
};

export function getAiDomainFreshness(domain: AiDomainName, asOf = "2026-05-20T14:30:00+06:00") {
  return {
    asOf,
    stale: false,
  };
}
