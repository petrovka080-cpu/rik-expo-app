import fs from "node:fs";
import path from "node:path";

describe("AI estimate fake green blocker", () => {
  it("requires runtime proof and artifacts for green status", () => {
    const proof = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiEstimateCoreCompletionProof.ts"), "utf8");
    expect(proof).toContain("S_AI_ESTIMATE_CORE_COMPLETION_matrix.json");
    expect(proof).toContain("fake_green_claimed");
    expect(proof).toContain("failures");
  });
});
