import { readProjectFile } from "../ai/aiUniversalSmokeTestHelpers";

describe("universal smoke release gate architecture: no second framework", () => {
  it("reuses the existing live UI answer path and large smoke runner", () => {
    const source = readProjectFile("scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts");

    expect(source).toContain("runAiUniversalLargeQuestionSmokeProof.ts");
    expect(source).not.toMatch(/new .*framework|second_ai_framework_created:\s*true/i);
  });
});
