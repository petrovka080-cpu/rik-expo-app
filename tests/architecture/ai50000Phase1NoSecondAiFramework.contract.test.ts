import { readAi50000Phase1Audit } from "./ai50000Phase1TestHelpers";

describe("AI 50000 Phase 1 architecture: no second AI framework", () => {
  it("keeps the expansion on the existing BuiltInAiIngress path", () => {
    expect(readAi50000Phase1Audit().second_ai_framework_created).toBe(false);
  });
});
