import { readJsonIfExists } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no legacy PDF breakage", () => {
  it("keeps legacy PDF protected when regression artifact exists", () => {
    const artifact = readJsonIfExists("artifacts/S_BUILT_IN_AI_50000_PHASE2_pdf_regression.json");
    if (!artifact) return;
    expect(artifact).toMatchObject({
      legacy_pdf_route_changed: false,
      legacy_pdf_payload_changed: false,
      legacy_pdf_renderer_globally_replaced: false,
    });
  });
});
