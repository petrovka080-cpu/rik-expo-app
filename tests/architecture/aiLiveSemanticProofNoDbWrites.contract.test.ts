import { readFile, readLiveUiSource } from "./aiLiveUiArchitectureTestUtils";

describe("live semantic AI proof architecture: no DB writes", () => {
  it("does not write data from semantic proof or answers", () => {
    const source = [
      readLiveUiSource(),
      readFile("scripts/e2e/runAiLiveSemanticAnswerProof.ts"),
      readFile("scripts/e2e/runAiLiveSemanticAnswerMaestroProof.ts"),
    ].join("\n");

    expect(source).not.toMatch(/\.(insert|update|upsert|delete)\s*\(/);
    expect(source).not.toMatch(/\bsupabase\.[a-z]+|sql`|createClient\s*\(/i);
  });
});
