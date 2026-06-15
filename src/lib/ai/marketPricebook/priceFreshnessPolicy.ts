import {
  MARKET_PRICEBOOK_AUDIT_DATE,
  type MarketFreshnessStatus,
  type MarketMaterialCategory,
  type MarketPriceSourceKind,
} from "./marketPricebookTypes";

export function freshnessDaysFor(input: {
  category: MarketMaterialCategory;
  source_kind: MarketPriceSourceKind;
}): number {
  if (input.category === "labor") return 60;
  if (input.source_kind === "manual_verified_ratebook") return 90;
  return 30;
}

function dayDiff(leftIsoDate: string, rightIsoDate: string): number | null {
  const left = Date.parse(`${leftIsoDate}T00:00:00.000Z`);
  const right = Date.parse(`${rightIsoDate}T00:00:00.000Z`);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  return Math.floor((right - left) / 86_400_000);
}

export function marketPriceFreshnessStatus(input: {
  source_updated_at: string;
  category: MarketMaterialCategory;
  source_kind: MarketPriceSourceKind;
  audit_date?: string;
}): MarketFreshnessStatus {
  const days = dayDiff(input.source_updated_at, input.audit_date ?? MARKET_PRICEBOOK_AUDIT_DATE);
  if (days === null || days < 0) return "UNKNOWN";
  const allowedDays = freshnessDaysFor({
    category: input.category,
    source_kind: input.source_kind,
  });
  if (days <= allowedDays) return "FRESH";
  if (days <= allowedDays * 2) return "STALE";
  return "EXPIRED";
}
