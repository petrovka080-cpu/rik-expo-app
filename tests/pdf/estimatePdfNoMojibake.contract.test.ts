import { LIVE_ESTIMATE_CASES, buildLiveEstimate, generateAndValidateLivePdf } from "../liveAcceptance/liveAiEstimatePdfRealityTestHelpers";

describe("estimate PDF mojibake guard", () => {
  it("does not contain broken Cyrillic markers", () => {
    for (const item of LIVE_ESTIMATE_CASES) {
      const { validation } = generateAndValidateLivePdf(buildLiveEstimate(item.prompt, item.route === "/chat" ? "/chat" : "/ai"));
      expect(validation.text).not.toMatch(/[ÐÑ�]/);
      expect(validation.details.mojibakeFound).toBe(false);
    }
  });
});
