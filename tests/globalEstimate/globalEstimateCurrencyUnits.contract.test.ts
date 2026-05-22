import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("global estimate currency and units contract", () => {
  it("keeps US imperial rates in USD and EU metric rates in EUR", async () => {
    const us = await buildGlobalEstimateFixture({ text: "Need laminate installation for 1000 sq ft in Dallas TX 75201", language: "en" });
    const de = await buildGlobalEstimateFixture({ text: "Tile installation 50 m2 in Berlin", language: "en" });

    expect(us.result.totals.currency).toBe("USD");
    expect(us.result.sections[0].rows[0].unit).toBe("sq_ft");
    expect(de.result.totals.currency).toBe("EUR");
    expect(de.result.sections[0].rows[0].unit).toBe("sq_m");
  });
});
