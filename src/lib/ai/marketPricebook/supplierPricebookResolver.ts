import type { MarketGovernedPrice } from "./marketPricebookTypes";

export const MARKET_SUPPLIER_PRICEBOOK: readonly MarketGovernedPrice[] = Object.freeze([]);

export function resolveSupplierPricebookPrice(): MarketGovernedPrice | null {
  return null;
}

export function supplierPricebookHasNoFakeSuppliers(): boolean {
  return MARKET_SUPPLIER_PRICEBOOK.every((price) => price.fake_supplier_claimed === false);
}
