import { displayUnitFor, normalizeGlobalUnit } from "../../src/lib/ai/globalEstimate";

describe("global unit normalizer", () => {
  it("normalizes common metric, imperial, and localized unit aliases", () => {
    expect(normalizeGlobalUnit("м²")).toBe("sq_m");
    expect(normalizeGlobalUnit("Quadratmeter")).toBe("sq_m");
    expect(normalizeGlobalUnit("sq ft")).toBe("sq_ft");
    expect(normalizeGlobalUnit("пог. м")).toBe("linear_m");
    expect(normalizeGlobalUnit("рейсов")).toBe("trip");
    expect(displayUnitFor("trip", "metric")).toBe("рейс");
  });
});
