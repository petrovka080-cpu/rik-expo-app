import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("US laminate 1000 sq ft Texas", () => {
  it("keeps sq ft and USD, with tax precision warning when ZIP is missing", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "Need laminate installation for 1000 sq ft in Texas" });
    expect(result.locale).toMatchObject({ countryCode: "US", stateOrRegion: "TX", unitSystem: "imperial", currency: "USD" });
    expect(result.sections[0].rows[0].unit).toBe("sq_ft");
    expect(result.tax.taxType).toBe("unknown");
    expect(result.tax.requiredPrecision).toBe("postal_code");
  });
});
