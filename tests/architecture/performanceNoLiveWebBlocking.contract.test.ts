import { expectNoPattern, read } from "./performanceGuardTestHelpers";

describe("performance no live web blocking", () => {
  it("does not add live web scraping or blocking supplier calls in estimate path", () => {
    expectNoPattern(/\bfetch\s*\(|XMLHttpRequest|axios|live supplier|supplier stock/i, "live_web_blocking");
    expect(read("scripts/e2e/runAiEstimateLoadPerformanceCostProof.ts")).toContain("fixtureMode: true");
  });
});
