import type {
  ProfessionalCurrency,
  ProfessionalEstimateUnit,
  ProfessionalRegion,
} from "../professionalEstimateTemplates/professionalEstimateTypes";
import type { MarketGovernedPrice } from "./marketPricebookTypes";
import { resolveMarketGovernedPrice } from "./regionalPricebookResolver";

export const MARKET_SUPPLIER_PRICEBOOK: readonly MarketGovernedPrice[] = Object.freeze([]);

export type MarketSupplierListingCandidate = {
  listing_id: string;
  supplier_id: string;
  supplier_name: string;
  material_key: string;
  unit: ProfessionalEstimateUnit;
  unit_price: number;
  region: ProfessionalRegion;
  city: string;
  currency: ProfessionalCurrency;
  source_updated_at: string;
  available_qty?: number | null;
  fake_supplier_claimed: false;
  fake_price_claimed: false;
};

export type MarketSupplierMatch = {
  status: "matched" | "not_found";
  listing: MarketSupplierListingCandidate | null;
  governed_price: MarketGovernedPrice | null;
  source: "market_listing_candidate";
  auto_awarded: false;
  fake_supplier_claimed: false;
  fake_price_claimed: false;
};

function sameText(left: unknown, right: unknown): boolean {
  return String(left ?? "").trim().toLowerCase() === String(right ?? "").trim().toLowerCase();
}

function positiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function resolveSupplierMarketListingCandidate(input: {
  material_key: string;
  unit: ProfessionalEstimateUnit;
  region: ProfessionalRegion;
  city?: string | null;
  listings: readonly MarketSupplierListingCandidate[];
}): MarketSupplierMatch {
  const listing =
    input.listings.find((candidate) => {
      const price = positiveNumber(candidate.unit_price);
      return (
        price != null &&
        candidate.fake_supplier_claimed === false &&
        candidate.fake_price_claimed === false &&
        candidate.material_key === input.material_key &&
        candidate.unit === input.unit &&
        candidate.region === input.region &&
        (!input.city || sameText(candidate.city, input.city))
      );
    }) ?? null;

  if (!listing) {
    return {
      status: "not_found",
      listing: null,
      governed_price: null,
      source: "market_listing_candidate",
      auto_awarded: false,
      fake_supplier_claimed: false,
      fake_price_claimed: false,
    };
  }

  return {
    status: "matched",
    listing,
    governed_price: resolveMarketGovernedPrice({
      material_key: input.material_key,
      unit: input.unit,
      region: input.region,
    }),
    source: "market_listing_candidate",
    auto_awarded: false,
    fake_supplier_claimed: false,
    fake_price_claimed: false,
  };
}

export function resolveSupplierPricebookPrice(input?: {
  material_key: string;
  unit: ProfessionalEstimateUnit;
  region: ProfessionalRegion;
  city?: string | null;
  listings?: readonly MarketSupplierListingCandidate[];
}): MarketGovernedPrice | null {
  if (!input) return null;
  const match = resolveSupplierMarketListingCandidate({
    ...input,
    listings: input.listings ?? [],
  });
  return match.status === "matched" ? match.governed_price : null;
}

export function supplierPricebookHasNoFakeSuppliers(): boolean {
  return MARKET_SUPPLIER_PRICEBOOK.every((price) => price.fake_supplier_claimed === false);
}
