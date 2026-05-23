import { LIVE_ESTIMATE_CASES, buildLiveEstimate, expectNoGenericConstructionRows } from "./liveAiEstimatePdfRealityTestHelpers";

describe("known work no generic construction rows", () => {
  it("hard fails generic construction rows for all known live cases", () => {
    for (const item of LIVE_ESTIMATE_CASES) {
      expectNoGenericConstructionRows(buildLiveEstimate(item.prompt, item.route === "/chat" ? "/chat" : "/ai"));
    }
  });
});
