import { readAi50000Phase1Audit } from "./ai50000Phase1TestHelpers";

describe("AI 50000 Phase 1 architecture: no prompt tax hardcoding", () => {
  it("keeps tax in the tax layer or warning contract", () => {
    expect(readAi50000Phase1Audit().prompt_hardcoded_tax_found).toBe(false);
  });
});
