import { readProjectFile } from "./aiUniversalSmokeTestHelpers";

describe("universal smoke question bank coverage", () => {
  it("keeps the release gate at the 120 question minimum", () => {
    const source = readProjectFile("scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts");

    expect(source).toContain("questions_total below 120");
    expect(source).toContain("screen_questions below 50");
    expect(source).toContain("internet_questions below 70");
    expect(source).toContain("questions_total_min");
  });
});
