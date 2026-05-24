import { readAi50000Phase1Audit, readAi50000Phase1Matrix } from "./ai50000Phase1TestHelpers";

describe("AI 50000 Phase 1 architecture: no fake sources", () => {
  it("requires source evidence for priced rows", () => {
    expect(readAi50000Phase1Audit().fake_sources_found).toBe(false);
    expect(readAi50000Phase1Matrix().source_evidence_present_all_priced_rows).toBe(true);
  });
});
