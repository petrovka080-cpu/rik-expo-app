import { buildWholeAppNPlusOneAudit } from "../../scripts/audit/wholeApp50kExplainP95.shared";

describe("whole-app no N+1 contract", () => {
  it("does not find query-inside-loop patterns in core detail/list owners", () => {
    const audit = buildWholeAppNPlusOneAudit();

    expect(audit.nplusone_core_detail_found).toBe(false);
    expect(audit.findings).toEqual([]);
  });
});
