import type { ProfessionalBoqRow } from "../estimateDraftRevisionContract";
import { createAiEstimateExtensionPoint, type AiEstimateExtensionPoint } from "./AiEstimateExtensionPoint";

export type AiEstimatePricingExtensionContract = AiEstimateExtensionPoint & {
  readonly extensionKind: "pricing";
  readPriceRequest(row: ProfessionalBoqRow): {
    rowId: string;
    titleRu: string;
    quantity: number;
    unit: string;
    materialKey: string | null;
    rateKey: string | null;
  };
};

export function createAiEstimatePricingExtensionContract(): AiEstimatePricingExtensionContract {
  return {
    ...createAiEstimateExtensionPoint("pricing"),
    extensionKind: "pricing",
    readPriceRequest: (row) => ({
      rowId: row.rowId,
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      materialKey: row.materialKey ?? null,
      rateKey: row.rateKey ?? null,
    }),
  };
}
