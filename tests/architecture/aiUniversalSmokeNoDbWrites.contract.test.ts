import { readProjectFile } from "../ai/aiUniversalSmokeTestHelpers";

describe("universal smoke release gate architecture: no DB writes", () => {
  it("does not add Supabase writes or migrations to smoke proof scripts", () => {
    const source = [
      readProjectFile("scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts"),
      readProjectFile("scripts/e2e/runAiUniversalLargeQuestionSmokeMaestroProof.ts"),
    ].join("\n");

    expect(source).not.toMatch(/supabase|insert\(|update\(|upsert\(|delete\(|rpc\(/i);
    expect(source).not.toContain("supabase/migrations");
  });
});
