import {
  resolveCountryRegionCity,
  resolveCurrencyPolicy,
  resolveMeasurementUnitPolicy,
  validateCurrencyAndUnitPolicy,
} from "../../src/lib/ai/globalLocalContext";

describe("global local currency and unit policy", () => {
  it("uses local currency and unit policy by country", () => {
    const kg = resolveCountryRegionCity({
      prompt: "смета на установку турбины на ГЭС 100 кВт в Кыргызстане, Бишкек",
    });
    const currency = resolveCurrencyPolicy({ context: kg });
    const units = resolveMeasurementUnitPolicy(kg);

    expect(currency.currency).toBe("KGS");
    expect(units.unitSystem).toBe("metric");
    expect(validateCurrencyAndUnitPolicy({ currencyPolicy: currency, unitPolicy: units }).valid).toBe(true);
  });

  it("requires exchange rate source/date when conversion is claimed", () => {
    const context = resolveCountryRegionCity({ prompt: "estimate for roof waterproofing in London" });
    const currency = resolveCurrencyPolicy({ context, convertedFromCurrency: "USD" });
    const units = resolveMeasurementUnitPolicy(context);

    expect(validateCurrencyAndUnitPolicy({
      currencyPolicy: currency,
      unitPolicy: units,
      exchangeRateUsed: true,
    }).failures).toContain("EXCHANGE_RATE_SOURCE_AND_DATE_REQUIRED");
  });
});
