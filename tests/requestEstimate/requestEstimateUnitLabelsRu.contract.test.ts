import { containsRawUnit, foundationSummaryText, foundationViewModel } from "./requestEstimateBoqCatalogTestHelpers";

describe("request estimate unit labels", () => {
  it("uses localized unit labels in the request draft view model", () => {
    const vm = foundationViewModel();
    const text = `${foundationSummaryText()}\n${vm?.sections.flatMap((section) => section.items.map((item) => item.unitLabel)).join("\n")}`;
    expect(text).toContain("м³");
    expect(text).toContain("м²");
    expect(containsRawUnit(text)).toBe(false);
  });
});
