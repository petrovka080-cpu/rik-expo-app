import { getReferenceUnitPrice, resolveReferencePriceItem } from "../externalKnowledge/referencePriceBook";

export type EstimatePriceResolution = {
  priceItemId: string;
  unitPrice: number;
  currency: string;
  checkedAt: string;
};

export function resolveEstimateReferencePrice(priceItemId: string): EstimatePriceResolution {
  const item = resolveReferencePriceItem(priceItemId);
  return {
    priceItemId,
    unitPrice: getReferenceUnitPrice(priceItemId),
    currency: item.currency,
    checkedAt: item.checkedAt,
  };
}
