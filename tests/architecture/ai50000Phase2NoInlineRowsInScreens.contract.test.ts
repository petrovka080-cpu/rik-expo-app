import { sourceText } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no inline rows", () => {
  it("does not add inline estimate rows in screens", () => {
    expect(sourceText()).not.toContain("inlineGenericConstructionRows");
  });
});
