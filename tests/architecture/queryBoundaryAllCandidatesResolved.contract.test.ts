import {
  QUERY_BOUNDARY_GREEN_STATUS,
  buildQueryBoundaryCandidatesAudit,
  buildQueryBoundaryReport,
} from "../../scripts/audit/queryBoundaryCleanup.shared";

describe("query boundary candidate resolution", () => {
  it("classifies every candidate and leaves no unknown or unresolved query boundary finding", () => {
    const candidates = buildQueryBoundaryCandidatesAudit();
    const report = buildQueryBoundaryReport();

    expect(candidates.query_candidates_found).toBe(true);
    expect(candidates.query_candidates_unresolved).toBe(0);
    expect(candidates.unresolved_candidates).toEqual([]);
    expect(report.matrix.final_status).toBe(QUERY_BOUNDARY_GREEN_STATUS);

    const rows = candidates.candidates as Array<{ resolution?: string; resolved?: boolean }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.resolution && row.resolved === true)).toBe(true);
  });
});
