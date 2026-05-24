import { foundationPdfSummary, foundationSummaryText, localizationFailures } from "./requestEstimateBoqCatalogTestHelpers";

describe("request estimate debug text", () => {
  it("does not expose English backend/debug phrases in request summary or PDF summary", () => {
    const text = `${foundationSummaryText()}\n${foundationPdfSummary()}`;
    expect(localizationFailures(text)).toEqual([]);
    expect(text).not.toMatch(/Backend global estimate|Grand total|Confidence|Human confirmation/i);
  });
});
