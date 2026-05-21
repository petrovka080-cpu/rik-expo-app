import { REFERENCE_PRICE_BOOK } from "./referencePriceBook";
import type { ReferencePriceItem } from "./referencePriceTypes";

export function resolveReferencePriceItem(id: string): ReferencePriceItem {
  const found = REFERENCE_PRICE_BOOK.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Reference price item is not configured: ${id}`);
  }
  return found;
}

export function getReferenceUnitPrice(id: string): number {
  const item = resolveReferencePriceItem(id);
  return Math.round((item.priceMin + item.priceMax) / 2);
}

export function listReferencePriceItemsByCategory(category: ReferencePriceItem["category"]): ReferencePriceItem[] {
  return REFERENCE_PRICE_BOOK.filter((item) => item.category === category);
}
