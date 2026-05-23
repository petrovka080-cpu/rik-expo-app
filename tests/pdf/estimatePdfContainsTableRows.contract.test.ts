import { LIVE_ESTIMATE_CASES, buildLiveEstimate, generateAndValidateLivePdf } from "../liveAcceptance/liveAiEstimatePdfRealityTestHelpers";

describe("estimate PDF table rows", () => {
  it("preserves work-specific table rows in PDF text", () => {
    for (const item of LIVE_ESTIMATE_CASES) {
      const estimate = buildLiveEstimate(item.prompt, item.route === "/chat" ? "/chat" : "/ai");
      const { validation } = generateAndValidateLivePdf(estimate);
      for (const token of item.expectedTokens.slice(0, 4)) {
        expect(validation.text.toLocaleLowerCase("ru-RU")).toContain(token.toLocaleLowerCase("ru-RU"));
      }
    }
  });
});
