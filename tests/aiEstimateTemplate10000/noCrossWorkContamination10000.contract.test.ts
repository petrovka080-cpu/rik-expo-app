import { runProductionTemplate10000ContaminationAudit } from "../../src/lib/ai/estimateTemplate10000";

describe("no cross work contamination 10000", () => {
  it("keeps category-specific rows out of unrelated work families", () => {
    const audit = runProductionTemplate10000ContaminationAudit();

    expect(audit.passed).toBe(true);
    expect(audit.crossWorkContaminationFound).toBe(0);
    expect(audit.failures).toHaveLength(0);
  });
});
