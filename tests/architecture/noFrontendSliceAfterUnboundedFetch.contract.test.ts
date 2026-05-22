import { buildFrontendSliceAfterUnboundedFetchAudit } from "../../scripts/audit/queryBoundaryCleanup.shared";

describe("architecture: no frontend slice after unbounded fetch", () => {
  it("keeps slicing away from unresolved unbounded query results", () => {
    const audit = buildFrontendSliceAfterUnboundedFetchAudit();

    expect(audit.frontend_slice_after_unbounded_fetch_found).toBe(false);
    expect(audit.findings).toEqual([]);
  });
});
