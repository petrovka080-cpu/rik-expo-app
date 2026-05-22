import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("SG drywall 500 sq ft", () => {
  it("supports mixed units and Singapore GST handling", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "Drywall installation 500 sq ft in Singapore" });
    expect(result.locale).toMatchObject({ countryCode: "SG", currency: "SGD", unitSystem: "mixed" });
    expect(result.work.workKey).toBe("drywall_partition");
    expect(result.sections[0].rows[0].unit).toBe("sq_ft");
    expect(result.tax.taxType).toBe("gst");
  });
});
