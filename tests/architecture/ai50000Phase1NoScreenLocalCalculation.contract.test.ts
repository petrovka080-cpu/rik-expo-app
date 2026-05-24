import { readAi50000Phase1Audit } from "./ai50000Phase1TestHelpers";

describe("AI 50000 Phase 1 architecture: no screen-local calculation", () => {
  it("does not calculate estimate rows in screens", () => {
    expect(readAi50000Phase1Audit().screen_local_calculation_found).toBe(false);
  });
});
