import { readProjectFile } from "./aiUniversalSmokeTestHelpers";

describe("universal smoke release gate", () => {
  it("is included in the required release verification gate chain", () => {
    const source = readProjectFile("scripts/release/releaseGuard.shared.ts");

    expect(source).toContain("universal-qa-smoke-release-gate");
    expect(source).toContain("npx tsx scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts");
    expect(source).toContain("universal-qa-smoke-maestro");
    expect(source).toContain("npx tsx scripts/e2e/runAiUniversalLargeQuestionSmokeMaestroProof.ts");
  });
});
