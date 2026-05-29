import { read } from "./performanceGuardTestHelpers";

describe("performance no API36 green", () => {
  it("requires API34 canonical evidence and API36 rejection", () => {
    const android = read("scripts/e2e/runAndroidApi34AiEstimatePerformanceCostSmoke.ts");
    expect(android).toContain("resolveCanonicalApi34Evidence");
    expect(android).toContain("api36_rejected");
    expect(android).not.toContain("api36_accepted");
  });
});
