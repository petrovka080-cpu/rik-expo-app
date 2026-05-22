import { makeWarehouseIssueActions } from "../../src/screens/warehouse/warehouse.issue";

const createActions = (rpc: jest.Mock) =>
  makeWarehouseIssueActions({
    supabase: { rpc } as never,
    nz: (value: unknown, fallback = 0) => {
      const numberValue = Number(value ?? fallback);
      return Number.isFinite(numberValue) ? numberValue : fallback;
    },
    pickErr: (error: unknown) => error instanceof Error ? error.message : String(error),
    getRecipient: () => "Foreman",
    getObjectLabel: () => "House 1",
    getWorkLabel: () => "Partitions",
    getWarehousemanFio: () => "Store Keeper",
    fetchStock: jest.fn(async () => undefined),
    fetchReqItems: jest.fn(async () => undefined),
    fetchReqHeads: jest.fn(async () => undefined),
    setIssueBusy: jest.fn(),
    setIssueMsg: jest.fn(),
    clearStockPick: jest.fn(),
    clearReqPick: jest.fn(),
    clearReqQtyInput: jest.fn(),
  });

describe("Wave08 warehouse issue idempotency", () => {
  it("builds the same RPC client mutation id for the same stock issue intent", async () => {
    const rpc = jest.fn(async (_name: string, payload: { p_client_mutation_id: string }) => ({
      data: { issue_id: 1, client_mutation_id: payload.p_client_mutation_id },
      error: null,
    }));
    const actions = createActions(rpc);
    const stockPick = {
      line1: { code: "MAT-1", name: "Cement", uom_id: "kg", qty: 2 },
    };

    await expect(actions.submitStockPick({ stockPick } as never)).resolves.toBe(true);
    await expect(actions.submitStockPick({ stockPick } as never)).resolves.toBe(true);

    const ids = rpc.mock.calls.map((call) => call[1].p_client_mutation_id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[0]).toMatch(/^warehouse\.issue\.stock_pick:foreman:/);
  });
});
