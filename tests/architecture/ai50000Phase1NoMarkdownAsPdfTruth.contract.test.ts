import { readAi50000Phase1Artifact } from "./ai50000Phase1TestHelpers";

describe("AI 50000 Phase 1 architecture: no markdown PDF truth", () => {
  it("keeps AI estimate PDF regression off plain text and markdown table truth", () => {
    const pdf = readAi50000Phase1Artifact<Record<string, unknown>>("S_BUILT_IN_AI_50000_PHASE1_pdf_regression.json");
    expect(pdf.ai_estimate_pdf_plain_text_dump_found).toBe(false);
  });
});
