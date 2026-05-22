import fs from "node:fs";
import path from "node:path";

describe("whole-app 50k seed architecture: proof_run_id", () => {
  it("requires a proof_ prefixed run id and marks rows with the proof prefix", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(source).toContain("assertProofRunId(proofRunId)");
    expect(source).toContain("WHOLE_APP_50K_PROOF_RUN_ID");
    expect(source).toContain("function proofPrefix");
    expect(source).toContain("[PROOF ${proofRunId}]");
  });
});
