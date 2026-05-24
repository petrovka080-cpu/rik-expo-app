import { readAi50000Phase1Artifact } from "./ai50000Phase1TestHelpers";

describe("AI 50000 Phase 1 architecture: no legacy PDF breakage", () => {
  it("keeps old PDF route, payload and renderer stable", () => {
    const pdf = readAi50000Phase1Artifact<Record<string, unknown>>("S_BUILT_IN_AI_50000_PHASE1_pdf_regression.json");
    expect(pdf.legacy_pdf_route_changed).toBe(false);
    expect(pdf.legacy_pdf_payload_changed).toBe(false);
    expect(pdf.legacy_pdf_renderer_globally_replaced).toBe(false);
  });
});
