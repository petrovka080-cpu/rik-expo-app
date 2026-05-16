import { verifyBoundedDatabaseQueries } from "../../scripts/scale/verifyBoundedDatabaseQueries";

describe("architecture: no unbounded Supabase RPC list reads", () => {
  it("requires list-like RPC calls to carry bounded arguments or an exact exception", () => {
    const verification = verifyBoundedDatabaseQueries(process.cwd());
    const rpcFindings = verification.findings.filter(
      (finding) => finding.kind === "rpc_list_without_bound",
    );
    const listLikeRpcCalls = verification.rpcInventory.filter((entry) => entry.listLike);

    expect(rpcFindings).toEqual([]);
    expect(listLikeRpcCalls.length).toBeGreaterThan(0);
    expect(listLikeRpcCalls.every((entry) => entry.approval != null)).toBe(true);
    expect(
      listLikeRpcCalls.every((entry) => entry.hasBoundedArgs || entry.approval === "rpc_approved_exception"),
    ).toBe(true);
  });

  it("does not classify mutation/detail/status RPC calls as list reads", () => {
    const verification = verifyBoundedDatabaseQueries(process.cwd());
    const mutationOrDetailApprovals = verification.approvals.filter(
      (entry) => entry.approval === "rpc_mutation_or_side_effect" || entry.approval === "rpc_detail_or_status",
    );

    expect(mutationOrDetailApprovals.length).toBeGreaterThan(0);
    expect(
      mutationOrDetailApprovals.some((entry) => String(entry.rpc ?? "").includes("accounting_pay_invoice")),
    ).toBe(true);
  });
});
