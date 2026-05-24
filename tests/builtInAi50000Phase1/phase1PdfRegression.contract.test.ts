import { readPhase1Artifact } from "./phase1TestHelpers";

describe("built-in AI 50000 Phase 1 PDF regression", () => {
  it("protects legacy PDF and AI estimate PDF paths", () => {
    const pdf = readPhase1Artifact<Record<string, unknown>>("S_BUILT_IN_AI_50000_PHASE1_pdf_regression.json");
    expect(pdf.legacy_pdf_route_changed).toBe(false);
    expect(pdf.legacy_pdf_payload_changed).toBe(false);
    expect(pdf.legacy_pdf_renderer_globally_replaced).toBe(false);
    expect(pdf.ai_estimate_pdf_regression_passed).toBe(true);
  });
});
