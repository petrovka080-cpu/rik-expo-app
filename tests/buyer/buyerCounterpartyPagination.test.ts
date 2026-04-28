import {
  fetchBuyerContractorsBasic,
  fetchBuyerContractorsFallback,
  fetchBuyerProposalSuppliersBasic,
  fetchBuyerProposalSuppliersFallback,
  fetchBuyerSubcontracts,
} from "../../src/screens/buyer/hooks/useBuyerCounterpartyRepo";

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
    not: (...args: unknown[]) => {
      calls.push({ method: "not", args });
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

const mockFrom = jest.fn();

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe("buyer counterparty list pagination", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("applies default range and stable contractor ordering", async () => {
    const query = buildQuery({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    await fetchBuyerContractorsBasic();

    expect(mockFrom).toHaveBeenCalledWith("contractors");
    expect(query.calls).toEqual([
      { method: "select", args: ["id,company_name,phone,inn"] },
      { method: "order", args: ["company_name", { ascending: true }] },
      { method: "order", args: ["id", { ascending: true }] },
      { method: "range", args: [0, 99] },
    ]);
  });

  it("clamps contractor fallback page size and preserves row shape", async () => {
    const query = buildQuery({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    await fetchBuyerContractorsFallback({ page: 2, pageSize: 500 });

    expect(query.calls).toEqual([
      { method: "select", args: ["id,company_name,phone,inn,name,organization,org_name"] },
      { method: "order", args: ["company_name", { ascending: true }] },
      { method: "order", args: ["id", { ascending: true }] },
      { method: "range", args: [200, 299] },
    ]);
  });

  it("paginates subcontracts with stable organization and id order", async () => {
    const query = buildQuery({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    await fetchBuyerSubcontracts({ page: 1, pageSize: 25 });

    expect(mockFrom).toHaveBeenCalledWith("subcontracts");
    expect(query.calls).toEqual([
      { method: "select", args: ["id,contractor_org,contractor_inn,contractor_phone"] },
      { method: "order", args: ["contractor_org", { ascending: true }] },
      { method: "order", args: ["id", { ascending: true }] },
      { method: "range", args: [25, 49] },
    ]);
  });

  it("preserves proposal supplier filter and paginates the basic path", async () => {
    const query = buildQuery({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    await fetchBuyerProposalSuppliersBasic({ page: 0, pageSize: 50 });

    expect(mockFrom).toHaveBeenCalledWith("proposal_items");
    expect(query.calls).toEqual([
      { method: "select", args: ["supplier"] },
      { method: "not", args: ["supplier", "is", null] },
      { method: "order", args: ["supplier", { ascending: true }] },
      { method: "order", args: ["id", { ascending: true }] },
      { method: "range", args: [0, 49] },
    ]);
  });

  it("paginates proposal supplier fallback without changing selected fields", async () => {
    const query = buildQuery({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    await fetchBuyerProposalSuppliersFallback({ page: -5, pageSize: 0 });

    expect(query.calls).toEqual([
      { method: "select", args: ["supplier,supplier_name,company_name"] },
      { method: "order", args: ["supplier", { ascending: true }] },
      { method: "order", args: ["id", { ascending: true }] },
      { method: "range", args: [0, 0] },
    ]);
  });
});
