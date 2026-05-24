import { sourceText } from "./ai50000Phase4TestHelpers";

describe("AI 50000 Phase 4 no inline rows in screens", () => {
  it("does not add screen-local estimate rows", () => {
    expect(sourceText()).not.toContain("inlineGenericConstructionRows");
    expect(sourceText()).not.toContain("hideGenericConstructionRowsInUi");
  });
});
