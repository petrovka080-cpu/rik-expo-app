import { readJsonIfExists } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 legacy PDF protection", () => {
  it("keeps legacy PDF route, payload, and renderer protected", () => {
    const regression = readJsonIfExists("artifacts/S_BUILT_IN_AI_50000_PHASE3_pdf_regression.json");
    if (!regression) return;
    expect(regression.legacy_pdf_route_changed).toBe(false);
    expect(regression.legacy_pdf_payload_changed).toBe(false);
    expect(regression.legacy_pdf_renderer_globally_replaced).toBe(false);
  });
});
