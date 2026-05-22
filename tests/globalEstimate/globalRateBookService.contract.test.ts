import { listGlobalRateBookSummary, resolveGlobalRate, resolveGlobalLocaleContext } from "../../src/lib/ai/globalEstimate";

describe("global rate book service", () => {
  it("selects regional rates with source metadata", () => {
    const locale = resolveGlobalLocaleContext({ text: "Need laminate installation for 1000 sq ft in Dallas TX 75201" });
    const rate = resolveGlobalRate({ rateKey: "laminate_board", sectionType: "materials", unit: "sq_ft", locale });
    expect(rate.rate.currency).toBe("USD");
    expect(rate.source.id).toContain("laminate_board");
    expect(rate.confidence).toBe("high");
    expect(listGlobalRateBookSummary().noPriceWithoutSource).toBe(true);
  });
});
