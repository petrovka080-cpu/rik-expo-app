import { sourceText } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 no document-layer calculation", () => {
  it("does not calculate estimates inside document/PDF code", () => {
    expect(sourceText()).not.toContain("documentLayerCalculatesEstimate(");
  });
});
