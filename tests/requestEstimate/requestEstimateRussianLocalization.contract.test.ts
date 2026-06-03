import { foundationSummaryText } from "./requestEstimateBoqCatalogTestHelpers";

describe("request estimate Russian localization", () => {
  it("renders the request estimate summary in Russian user-facing copy", () => {
    const summary = foundationSummaryText();
    expect(summary).toContain("Коротко:");
    expect(summary).not.toContain("Черновик сметы");
    expect(summary).toContain("Ориентировочный объём бетона: 32,64 м³");
    expect(summary).toContain("Налоговый статус");
  });
});
