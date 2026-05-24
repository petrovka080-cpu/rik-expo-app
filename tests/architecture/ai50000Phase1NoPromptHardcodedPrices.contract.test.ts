import { readAi50000Phase1Audit } from "./ai50000Phase1TestHelpers";

describe("AI 50000 Phase 1 architecture: no prompt price hardcoding", () => {
  it("keeps prices in backend rate data", () => {
    expect(readAi50000Phase1Audit().prompt_hardcoded_prices_found).toBe(false);
  });
});
