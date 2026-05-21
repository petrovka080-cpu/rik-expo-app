import { readFile, readLiveUiSource } from "./aiLiveUiArchitectureTestUtils";

describe("live semantic AI proof architecture: no second framework", () => {
  it("does not add another assistant framework, provider call, or transport", () => {
    const source = [
      readLiveUiSource(),
      readFile("scripts/e2e/runAiLiveSemanticAnswerProof.ts"),
      readFile("scripts/e2e/runAiLiveSemanticAnswerMaestroProof.ts"),
    ].join("\n");

    expect(source).not.toMatch(/sendAssistantMessage|openai|chatCompletion|createCompletion|streamText|generateText/i);
  });
});
