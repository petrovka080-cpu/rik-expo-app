import { sourceText } from "./ai50000Phase4TestHelpers";

describe("AI 50000 Phase 4 no screen-local calculation", () => {
  it("keeps estimate calculation out of screens", () => {
    expect(sourceText()).not.toContain("calculateEstimateInScreen");
  });
});
