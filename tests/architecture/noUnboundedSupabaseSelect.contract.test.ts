import { verifyBoundedDatabaseQueries } from "../../scripts/scale/verifyBoundedDatabaseQueries";

describe("architecture: no unbounded Supabase select reads", () => {
  it("requires list/detail/count selects to be explicitly bounded", () => {
    const verification = verifyBoundedDatabaseQueries(process.cwd());
    const selectFindings = verification.findings.filter(
      (finding) => finding.kind === "select_without_bound",
    );

    expect(selectFindings).toEqual([]);
    expect(verification.approvals.some((entry) => entry.approval === "direct_bound")).toBe(true);
    expect(verification.approvals.some((entry) => entry.approval === "single_or_maybe_single")).toBe(true);
    expect(verification.approvals.some((entry) => entry.approval === "head_count")).toBe(true);
    expect(verification.approvals.some((entry) => entry.approval === "page_through_helper")).toBe(true);
  });

  it("recognizes paged query providers without accepting comment-only passes", () => {
    const verification = verifyBoundedDatabaseQueries(process.cwd());
    const providerApprovals = verification.approvals.filter(
      (entry) => entry.approval === "paged_query_provider",
    );

    expect(providerApprovals.length).toBeGreaterThan(0);
    expect(providerApprovals.every((entry) => entry.reason.includes("PagedQuery"))).toBe(true);
  });
});
