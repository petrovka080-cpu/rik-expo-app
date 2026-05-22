import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("India electrical estimate", () => {
  it("returns GST status and safety review without DIY steps", async () => {
    const { result, answer } = await buildGlobalEstimateFixture({ text: "India electrical socket installation 20 pcs" });
    expect(result.locale).toMatchObject({ countryCode: "IN", currency: "INR" });
    expect(result.work.workKey).toBe("socket_installation");
    expect(result.tax.taxType).toBe("gst");
    expect(answer).toMatch(/specialist review/i);
  });
});
