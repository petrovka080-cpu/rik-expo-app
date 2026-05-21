import { readFile, readLiveUiSource } from "./aiLiveUiArchitectureTestUtils";

describe("live semantic AI proof architecture: no hooks", () => {
  it("keeps semantic proof and live route layer hook-free", () => {
    const source = [
      readLiveUiSource(),
      readFile("scripts/e2e/runAiLiveSemanticAnswerProof.ts"),
      readFile("scripts/e2e/runAiLiveSemanticAnswerMaestroProof.ts"),
    ].join("\n");

    expect(source).not.toMatch(/from "react"|from 'react'|\buse[A-Z][A-Za-z]+\(/);
    expect(source).not.toMatch(/useEffect\s*\(/);
  });
});
