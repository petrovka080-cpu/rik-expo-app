import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("global estimate currency formatting", () => {
  it("uses Intl/local currency formatting in result rows and totals", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "Need laminate installation for 1000 sq ft in Dallas TX 75201" });
    expect(result.totals.displayGrandTotal).toMatch(/\$/);
    expect(result.sections[0].rows[0].displayUnitPrice).toMatch(/\$/);
  });
});
