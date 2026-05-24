import { sourceText } from "./ai50000Phase4TestHelpers";

describe("AI 50000 Phase 4 no document-layer calculation", () => {
  it("does not move estimate calculation into document/PDF layer", () => {
    expect(sourceText()).not.toContain("documentLayerCalculatesEstimate");
  });
});
