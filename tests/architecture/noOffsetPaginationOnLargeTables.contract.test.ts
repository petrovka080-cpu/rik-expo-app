import { buildCursorPaginationCoverageAudit } from "../../scripts/audit/queryBoundaryCleanup.shared";

describe("architecture: no unsafe offset pagination on large tables", () => {
  it("keeps large-table pagination resolved through bounded cursor/index contracts", () => {
    const audit = buildCursorPaginationCoverageAudit();

    expect(audit.offset_pagination_large_table_found).toBe(false);
    expect(audit.unresolved_offset_candidates).toEqual([]);
    expect(audit.cursor_pagination_core_lists).toBe(true);
  });
});
