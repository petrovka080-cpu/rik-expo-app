import {
  PRODUCTION_WORK_DEFINITIONS_10000,
  compileProductionExpandedEstimate10000,
  currencyForProductionTemplateRegion,
} from "../../src/lib/ai/estimateTemplate10000";

describe("KG KZ currency policy 10000", () => {
  it("uses KGS for KG and KZT for KZ without USD final totals", () => {
    expect(currencyForProductionTemplateRegion("KG")).toBe("KGS");
    expect(currencyForProductionTemplateRegion("KZ")).toBe("KZT");

    const sampleWorkKey = PRODUCTION_WORK_DEFINITIONS_10000[0].workKey;
    expect(compileProductionExpandedEstimate10000({ workKey: sampleWorkKey, countryCode: "KG" }).currency).toBe("KGS");
    expect(compileProductionExpandedEstimate10000({ workKey: sampleWorkKey, countryCode: "KZ" }).currency).toBe("KZT");
    expect(compileProductionExpandedEstimate10000({ workKey: sampleWorkKey, countryCode: "KG" }).currency).not.toBe("USD");
  });
});
