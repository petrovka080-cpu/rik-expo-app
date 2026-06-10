import fs from "node:fs";
import path from "node:path";

import { classifyProofLineageChangedFiles, verifyProofLineage } from "../../scripts/release/proofLineageVerifier";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const B2C_GREEN_STATUS = "GREEN_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_BINDING_READY";

function read(filePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, filePath), "utf8");
}

function b2cGreenArtifactHasLineage(matrix: Record<string, unknown>): boolean {
  if (matrix.final_status !== B2C_GREEN_STATUS) return true;
  const sourceCodeHead = matrix.source_code_head;

  return (
    typeof sourceCodeHead === "string" &&
    sourceCodeHead.length > 0 &&
    matrix.head_sha === sourceCodeHead &&
    matrix.current_head_at_write_time === sourceCodeHead &&
    typeof matrix.generated_at === "string" &&
    matrix.generated_at.length > 0 &&
    matrix.proof_valid_for_source_code_head === true &&
    matrix.artifact_only_supersession_allowed === true &&
    matrix.fake_green_claimed === false
  );
}

describe("proof lineage verifier", () => {
  it("accepts identical source and current heads without artifact supersession", () => {
    const result = verifyProofLineage({
      wave: "S_TEST",
      sourceCodeHead: "abc123",
      currentHead: "abc123",
      artifactPaths: [],
      allowArtifactOnlySupersession: true,
    });

    expect(result).toMatchObject({
      valid: true,
      reason: null,
      artifactOnlySupersession: false,
      fakeGreenClaimed: false,
    });
  });

  it("classifies named proof artifacts separately from source changes", () => {
    const result = classifyProofLineageChangedFiles({
      changedFiles: [
        "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/matrix.json",
        "src/lib/ai/globalEstimate/index.ts",
      ],
    });

    expect(result.artifactChangesSinceProof).toEqual([
      "artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/matrix.json",
    ]);
    expect(result.sourceChangesSinceProof).toEqual(["src/lib/ai/globalEstimate/index.ts"]);
  });
});

describe("B2C expanded estimate proof lineage", () => {
  it("records source HEAD lineage in the proof writer", () => {
    const runner = read("scripts/e2e/runB2cRequestEmbeddedAiExpandedEstimateFixProof.ts");

    expect(runner).toContain("currentSourceHead");
    expect(runner).toContain('"rev-parse", "HEAD"');
    expect(runner).toContain("source_code_head");
    expect(runner).toContain("head_sha");
    expect(runner).toContain("current_head_at_write_time");
    expect(runner).toContain("proof_valid_for_source_code_head");
    expect(runner).toContain("artifact_only_supersession_allowed");
    expect(runner).toContain("generated_at");
    expect(runner).toContain("fake_green_claimed: false");
  });

  it("does not accept GREEN without lineage", () => {
    expect(
      b2cGreenArtifactHasLineage({
        final_status: B2C_GREEN_STATUS,
        fake_green_claimed: false,
      }),
    ).toBe(false);
  });

  it("accepts GREEN only with matching lineage and fake green disabled", () => {
    const sourceCodeHead = "abc123";

    expect(
      b2cGreenArtifactHasLineage({
        final_status: B2C_GREEN_STATUS,
        generated_at: "2026-06-10T00:00:00.000Z",
        source_code_head: sourceCodeHead,
        head_sha: sourceCodeHead,
        current_head_at_write_time: sourceCodeHead,
        proof_valid_for_source_code_head: true,
        artifact_only_supersession_allowed: true,
        fake_green_claimed: false,
      }),
    ).toBe(true);
  });

  it("keeps fake green impossible even when lineage is present", () => {
    const sourceCodeHead = "abc123";

    expect(
      b2cGreenArtifactHasLineage({
        final_status: B2C_GREEN_STATUS,
        generated_at: "2026-06-10T00:00:00.000Z",
        source_code_head: sourceCodeHead,
        head_sha: sourceCodeHead,
        current_head_at_write_time: sourceCodeHead,
        proof_valid_for_source_code_head: true,
        artifact_only_supersession_allowed: true,
        fake_green_claimed: true,
      }),
    ).toBe(false);
  });
});

describe("world construction estimate proof lineage", () => {
  it("records source HEAD lineage in the proof writer", () => {
    const runner = read("scripts/e2e/runWorldConstructionEstimateEngineProof.ts");

    expect(runner).toContain('"rev-parse", "HEAD"');
    expect(runner).toContain("source_code_head");
    expect(runner).toContain("head_sha");
    expect(runner).toContain("current_head_at_write_time");
    expect(runner).toContain("proof_valid_for_source_code_head");
    expect(runner).toContain("artifact_only_supersession_allowed");
    expect(runner).toContain("generated_at");
    expect(runner).toContain("fake_green_claimed: false");
  });
});
