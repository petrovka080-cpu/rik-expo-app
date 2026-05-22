import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("US sales tax precision", () => {
  it("calculates configured sales tax only when ZIP precision is present", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "Need laminate installation for 1000 sq ft in Dallas TX 75201" });
    expect(result.locale.postalCode).toBe("75201");
    expect(result.tax.taxType).toBe("sales_tax");
    expect(result.tax.taxAmount).toBeGreaterThan(0);
  });
});
