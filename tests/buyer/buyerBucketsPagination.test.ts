import {
  fetchBuyerProposalSummaryByStatuses,
  fetchBuyerRejectedProposalRows,
} from "../../src/screens/buyer/buyer.buckets.repo";

type QueryCall = {
  method: string;
  args: unknown[];
};

function buildQuery(result: unknown) {
  const calls: QueryCall[] = [];
  const query = {
    calls,
    select: (...args: unknown[]) => {
      calls.push({ method: "select", args });
      return query;
    },
    in: (...args: unknown[]) => {
      calls.push({ method: "in", args });
      return query;
    },
    gt: (...args: unknown[]) => {
      calls.push({ method: "gt", args });
      return query;
    },
    ilike: (...args: unknown[]) => {
      calls.push({ method: "ilike", args });
      return query;
    },
    order: (...args: unknown[]) => {
      calls.push({ method: "order", args });
      return query;
    },
    range: (...args: unknown[]) => {
      calls.push({ method: "range", args });
      return query;
    },
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return query;
}

function buildSupabase(query: ReturnType<typeof buildQuery>) {
  return {
    from: jest.fn((_table: string) => query),
  } as any;
}

const callNames = (calls: QueryCall[]) => calls.map((call) => call.method);

describe("buyer bucket list pagination", () => {
  it("keeps status filters and adds stable order plus exact range boundaries", async () => {
    const query = buildQuery({ data: [], error: null });
    const supabase = buildSupabase(query);

    await fetchBuyerProposalSummaryByStatuses(supabase, ["pending", "approved"], {
      page: 1,
      pageSize: 25,
    });

    expect(supabase.from).toHaveBeenCalledWith("v_proposals_summary");
    expect(query.calls).toEqual([
      { method: "select", args: ["proposal_id,status,submitted_at,sent_to_accountant_at,total_sum,items_cnt"] },
      { method: "in", args: ["status", ["pending", "approved"]] },
      { method: "gt", args: ["items_cnt", 0] },
      { method: "order", args: ["submitted_at", { ascending: false }] },
      { method: "order", args: ["proposal_id", { ascending: false }] },
      { method: "range", args: [25, 49] },
    ]);
  });

  it("clamps rejected proposal list page size and preserves rework filter", async () => {
    const query = buildQuery({ data: [], error: null });
    const supabase = buildSupabase(query);

    await fetchBuyerRejectedProposalRows(supabase, {
      page: 0,
      pageSize: 500,
    });

    expect(supabase.from).toHaveBeenCalledWith("proposals");
    expect(callNames(query.calls)).toEqual(["select", "ilike", "order", "order", "order", "range"]);
    expect(query.calls[1]).toEqual({
      method: "ilike",
      args: ["payment_status", "%На доработке%"],
    });
    expect(query.calls.at(-1)).toEqual({
      method: "range",
      args: [0, 99],
    });
  });
});
