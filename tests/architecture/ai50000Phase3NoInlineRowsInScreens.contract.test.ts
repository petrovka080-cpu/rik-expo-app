import { sourceText } from "./ai50000Phase3TestHelpers";

describe("AI 50000 Phase 3 no inline rows in screens", () => {
  it("does not create UI-only estimate rows", () => {
    expect(sourceText()).not.toContain("inlineGenericConstructionRows");
    expect(sourceText()).not.toContain("hideGenericConstructionRowsInUi");
  });
});
