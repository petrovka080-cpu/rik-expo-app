import {
  REQUEST_PROMPTS,
  estimateForEmbeddedAi,
  estimateForRequest,
  presentationForEstimate,
} from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("shared estimate presentation view model", () => {
  it("normalizes GlobalEstimateResult sections into visible rows with metadata", () => {
    const viewModel = presentationForEstimate(estimateForRequest(REQUEST_PROMPTS.laminate));
    expect(viewModel.sections.length).toBeGreaterThanOrEqual(2);
    expect(viewModel.rows.length).toBeGreaterThan(8);
    expect(viewModel.rows.every((row) => row.sourceId && row.rateKey && row.displayTotal)).toBe(true);
    expect(viewModel.sourceLabels.length).toBeGreaterThan(0);
    expect(viewModel.sourceLabels.join("\n")).toMatch(/\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a|Source/);
    expect(viewModel.sourceLabels.join("\n")).not.toMatch(/Configured backend regional reference rate/);
    expect(viewModel.rows.map((row) => row.sourceLabel ?? "").join("\n")).not.toMatch(/Configured backend regional reference rate/);
    expect(viewModel.tax.taxLabel || viewModel.tax.warning).toBeTruthy();
  });

  it("exposes local context, currency, and tax as a shared presentation contract", () => {
    const asphalt = presentationForEstimate(estimateForEmbeddedAi(
      "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 10000 \u043a\u0432 \u043c \u0432 \u0410\u043b\u043c\u0430\u0442\u044b",
    ));
    expect(asphalt.localContext.displayLine).toMatch(/\u0410\u043b\u043c\u0430\u0442\u044b/);
    expect(asphalt.localContext.displayLine).toMatch(/KZT/);
    expect(asphalt.localContext.displayLine).toMatch(/VAT/);

    const drywall = presentationForEstimate(estimateForEmbeddedAi(
      "estimate for drywall installation on 1200 sq ft in Austin Texas",
    ));
    expect(drywall.localContext.displayLine).toMatch(/Austin/);
    expect(drywall.localContext.displayLine).toMatch(/Texas/);
    expect(drywall.localContext.displayLine).toMatch(/USD/);
    expect(drywall.localContext.displayLine).toMatch(/sales tax/);
  });
});
