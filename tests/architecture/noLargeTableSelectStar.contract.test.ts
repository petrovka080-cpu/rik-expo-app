import { buildLargeTableSelectStarAudit } from "../../scripts/audit/queryBoundaryCleanup.shared";

describe("architecture: no large-table select star", () => {
  it("does not allow unresolved select('*') on large list tables", () => {
    const audit = buildLargeTableSelectStarAudit();

    expect(audit.large_table_select_star_found).toBe(false);
    expect(audit.findings).toEqual([]);
  });
});
