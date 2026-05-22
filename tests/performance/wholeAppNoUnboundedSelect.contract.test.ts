import { buildWholeAppUnboundedQueriesAudit } from "../../scripts/audit/wholeApp50kExplainP95.shared";

describe("whole-app no unbounded large-table select contract", () => {
  it("has no select star or unresolved unbounded reads on core large tables", () => {
    const audit = buildWholeAppUnboundedQueriesAudit();

    expect(audit.large_table_select_star_found).toBe(false);
    expect(audit.large_table_select_star_findings).toEqual([]);
    expect(audit.unresolved_large_table_findings).toEqual([]);
    expect(audit.all_core_list_queries_bounded).toBe(true);
  });
});
