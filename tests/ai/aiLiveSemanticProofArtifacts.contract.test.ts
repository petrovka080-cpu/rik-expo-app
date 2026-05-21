import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(__dirname, "../..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("S_AI_LIVE_SEMANTIC_ANSWER_PROOF_RECOVERY: proof artifacts", () => {
  it("locks proof runners to actual answer transcripts, not visible-result-only checks", () => {
    const web = read("scripts/e2e/runAiLiveSemanticAnswerProof.ts");
    const android = read("scripts/e2e/runAiLiveSemanticAnswerMaestroProof.ts");
    const combined = `${web}\n${android}`;

    expect(combined).toContain("answerTextRu");
    expect(combined).toContain("hierarchyTextRu");
    expect(combined).toContain("assertLiveSemanticExpectation");
    expect(combined).toContain("requiredSignals");
    expect(combined).toContain("forbiddenSignals");
    expect(combined).toContain("_web_transcripts.json");
    expect(combined).toContain("_android_transcripts.json");
    expect(combined).not.toMatch(/resultVisible\s*&&\s*true|visible result only/i);
  });
});
