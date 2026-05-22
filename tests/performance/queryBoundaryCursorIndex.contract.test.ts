import {
  buildCursorPaginationCoverageAudit,
  buildIndexCoverageForListQueriesAudit,
} from "../../scripts/audit/queryBoundaryCleanup.shared";

describe("performance: query boundary cursor and index coverage", () => {
  it("keeps core list paths bounded, cursor-covered, tenant-scoped, and index-backed", () => {
    const cursor = buildCursorPaginationCoverageAudit();
    const indexes = buildIndexCoverageForListQueriesAudit();

    expect(cursor.cursor_pagination_core_lists).toBe(true);
    expect(indexes.indexes_added_or_verified).toBe(true);
    expect(indexes.tenant_filters_verified).toBe(true);
    expect(indexes.missing_evidence).toEqual([]);
  });
});
