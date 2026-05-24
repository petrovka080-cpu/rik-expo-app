import { readAi50000Phase1Audit } from "./ai50000Phase1TestHelpers";

describe("AI 50000 Phase 1 architecture: no inline rows in screens", () => {
  it("does not hardcode estimate rows into UI components", () => {
    expect(readAi50000Phase1Audit().inline_rows_in_screens_found).toBe(false);
  });
});
