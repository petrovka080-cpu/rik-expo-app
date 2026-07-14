import type { ProfessionalBoqRow } from "../estimateDraftRevisionContract";

export type AiEstimatePriceCandidate = {
  rowId: string;
  unitPrice: number | null;
  currency: string;
  sourceId: string | null;
  sourceLabel: string | null;
  priceStatus: string | null;
};

export type AiEstimatePricebookPort = {
  readonly portKind: "estimate_pricebook";
  resolveRowPrice(row: ProfessionalBoqRow): AiEstimatePriceCandidate;
};
