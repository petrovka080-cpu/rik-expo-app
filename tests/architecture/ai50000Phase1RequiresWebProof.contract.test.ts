import { readAi50000Phase1Artifact, readAi50000Phase1Matrix } from "./ai50000Phase1TestHelpers";

describe("AI 50000 Phase 1 architecture: requires web proof", () => {
  it("has the 125-case web artifact", () => {
    const web = readAi50000Phase1Artifact<Record<string, unknown>>("S_BUILT_IN_AI_50000_PHASE1_web_screenshots.json");
    expect(web.web_playwright_passed).toBe(true);
    expect(readAi50000Phase1Matrix().web_playwright_passed).toBe(true);
  });
});
