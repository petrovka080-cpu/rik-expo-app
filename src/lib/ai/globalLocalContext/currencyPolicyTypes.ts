import type { GlobalUnitSystem } from "../globalEstimate";

export type CurrencyPolicy = {
  currency: string | null;
  source: "country_policy" | "explicit_input" | "missing";
  exchangeRateSourceId?: string;
  exchangeRateDate?: string;
  warning?: string;
};

export type MeasurementUnitPolicy = {
  unitSystem: GlobalUnitSystem;
  warning?: string;
};
