import { currencyForProfessionalRegion } from "./professionalCurrencyPolicy";
import {
  marketPricebookSnapshotIdForRegion,
  resolveMarketGovernedPriceForProfessionalRow,
} from "../marketPricebook/regionalPricebookResolver";
import type {
  ProfessionalEstimateRecipeRow,
  ProfessionalGovernedPrice,
  ProfessionalPriceResolution,
  ProfessionalRegion,
} from "./professionalEstimateTypes";

export const PROFESSIONAL_PRICEBOOK_SNAPSHOT_SUFFIX = "2026_06_GOVERNED";
export const PROFESSIONAL_GOVERNED_PRICEBOOK: readonly ProfessionalGovernedPrice[] = Object.freeze([]);

export function pricebookSnapshotIdForRegion(region: ProfessionalRegion): string {
  return marketPricebookSnapshotIdForRegion(region);
}

export function resolveProfessionalPricebookRow(input: {
  row: ProfessionalEstimateRecipeRow;
  quantity: number;
  region: ProfessionalRegion;
  pricebook?: readonly ProfessionalGovernedPrice[];
}): ProfessionalPriceResolution {
  const currency = currencyForProfessionalRegion(input.region);
  const pricebook = input.pricebook ?? PROFESSIONAL_GOVERNED_PRICEBOOK;
  const price = input.pricebook
    ? input.row.material_key
      ? pricebook.find((candidate) =>
          candidate.material_key === input.row.material_key &&
          candidate.region === input.region &&
          candidate.currency === currency &&
          candidate.unit === input.row.unit &&
          candidate.unit_price > 0
        ) ?? null
      : null
    : resolveMarketGovernedPriceForProfessionalRow({
        row: input.row,
        region: input.region,
      });

  if (!price || !input.row.price_required) {
    return {
      material_key: input.row.material_key,
      region: input.region,
      currency,
      unit: input.row.unit,
      price_status: input.row.price_required ? "PRICE_MISSING" : "PRICE_MISSING",
      unit_price: null,
      line_total: null,
      source_kind: null,
      source_name: null,
      source_updated_at: null,
      confidence: null,
      snapshot_id: null,
      fake_price_claimed: false,
      fake_supplier_claimed: false,
    };
  }

  return {
    material_key: price.material_key,
    region: input.region,
    currency,
    unit: input.row.unit,
    price_status: "PRICE_VERIFIED",
    unit_price: price.unit_price,
    line_total: Number((price.unit_price * input.quantity).toFixed(2)),
    source_kind: price.source_kind,
    source_name: price.source_name,
    source_updated_at: price.source_updated_at,
    confidence: price.confidence,
    snapshot_id: price.snapshot_id,
    fake_price_claimed: false,
    fake_supplier_claimed: false,
  };
}
