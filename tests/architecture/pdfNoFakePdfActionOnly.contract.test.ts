import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("PDF no fake action-only proof", () => {
  it("requires PDF byte validation and text extraction in the reality proof", () => {
    const proof = readRepoFile("scripts/e2e/runLiveAiEstimatePdfRealityProof.ts");

    expect(proof).toContain("validateEstimatePdf");
    expect(proof).toContain("pdf_files_manifest");
    expect(proof).toContain("pdf_text_extract");
    expect(proof).not.toMatch(/make_pdf_action_visible:\s*true[\s\S]*runtime_proof_passed:\s*true/);
  });
});
