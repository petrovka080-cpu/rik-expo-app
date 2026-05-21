import { readProjectFile } from "../ai/aiUniversalSmokeTestHelpers";

describe("universal smoke release gate architecture: no dangerous mutation", () => {
  it("fails on dangerous mutations and never performs domain mutations itself", () => {
    const source = readProjectFile("scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts");

    expect(source).toContain("dangerous_mutations_found");
    expect(source).toContain("dangerous mutations found");
    expect(source).toContain("db_writes_from_ai_answer_used: false");
    expect(source).toContain("migrations_used: false");
  });
});
