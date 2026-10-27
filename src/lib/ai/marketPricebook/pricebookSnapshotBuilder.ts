import crypto from "node:crypto";

import { currencyForProfessionalRegion } from "../professionalEstimateTemplates/professionalCurrencyPolicy";
import type { ProfessionalRegion } from "../professionalEstimateTemplates/professionalEstimateTypes";
import {
  MARKET_GOVERNED_PRICEBOOK,
  marketPricebookSnapshotIdForRegion,
} from "./regionalPricebookResolver";
import {
  MARKET_PRICEBOOK_AUDIT_DATE,
  type MarketPricebookSnapshot,
} from "./marketPricebookTypes";

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function buildMarketPricebookSnapshot(region: ProfessionalRegion): MarketPricebookSnapshot {
  const currency = currencyForProfessionalRegion(region);
  const prices = MARKET_GOVERNED_PRICEBOOK
    .filter((price) => price.region === region && price.currency === currency)
    .map((price) => ({
      price_id: price.price_id,
      material_key: price.material_key,
      unit: price.unit,
      unit_price: price.unit_price,
      source_kind: price.source_kind,
      source_name: price.source_name,
      source_updated_at: price.source_updated_at,
      confidence: price.confidence,
      freshness_status: price.freshness_status,
    }))
    .sort((left, right) => left.price_id.localeCompare(right.price_id));
  return {
    snapshot_id: marketPricebookSnapshotIdForRegion(region),
    region,
    currency,
    prices_count: prices.length,
    rows_hash: sha256(prices),
    created_at: MARKET_PRICEBOOK_AUDIT_DATE,
    immutable: true,
    fake_green_claimed: false,
  };
}

export function marketPricebookSnapshotIsImmutable(region: ProfessionalRegion): boolean {
  const first = buildMarketPricebookSnapshot(region);
  const second = buildMarketPricebookSnapshot(region);
  return first.snapshot_id === second.snapshot_id && first.rows_hash === second.rows_hash;
}
