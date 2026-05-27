import type { GlobalEstimateInput, GlobalTaxType } from "../globalEstimate";

export type LocalEstimatePolicy = {
  countryCode: string | null;
  city: string | null;
  currency: string;
  taxType: GlobalTaxType;
  taxLabel: string;
  taxRate: number;
  taxWarning: string;
  rateSourceLabel: string;
  sourceConfidence: "high" | "medium" | "low";
  localPriceWarningRequired: boolean;
  fakeExchangeRateUsed: false;
  fakeTaxRuleUsed: false;
};

export type LocalEstimatePolicyInput = Pick<GlobalEstimateInput, "countryCode" | "city" | "currency" | "locale"> & {
  text?: string;
};
