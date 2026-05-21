import { readProjectFile } from "../ai/aiUniversalSmokeTestHelpers";

describe("universal smoke release gate architecture: no hooks", () => {
  it("keeps the release smoke proof out of React hooks", () => {
    const source = [
      readProjectFile("scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts"),
      readProjectFile("scripts/e2e/runAiUniversalLargeQuestionSmokeMaestroProof.ts"),
    ].join("\n");

    expect(source).not.toMatch(/\b(?:useEffect|useMemo|useState)\s*\(|from "react"|from 'react'/);
  });
});
