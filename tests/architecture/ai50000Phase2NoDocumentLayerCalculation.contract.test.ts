import { sourceText } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no document layer calculation", () => {
  it("does not calculate estimates in a document layer", () => {
    expect(sourceText()).not.toContain("documentLayerCalculatesEstimate");
  });
});
