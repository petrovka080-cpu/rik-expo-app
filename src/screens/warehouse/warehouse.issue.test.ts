import { ensureRequestItemsBelongToRequest } from "../../lib/api/integrity.guards";
import { makeWarehouseIssueActions } from "./warehouse.issue";
import {
  addWarehouseIssueItem,
  addWarehouseIssueItems,
  commitWarehouseIssue,
  createWarehouseIssue,
  issueWarehouseFreeAtomic,
} from "./warehouse.issue.repo";

jest.mock("../../lib/api/integrity.guards", () => ({
  ensureRequestItemsBelongToRequest: jest.fn(),
}));

jest.mock("./warehouse.issue.repo", () => ({
  addWarehouseIssueItem: jest.fn(),
  addWarehouseIssueItems: jest.fn(),
  commitWarehouseIssue: jest.fn(),
  createWarehouseIssue: jest.fn(),
  issueWarehouseFreeAtomic: jest.fn(),
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const DUPLICATE_MESSAGE_TOKEN = "\u0443\u0436\u0435";

const createIssueActions = () => {
  const setIssueMsg = jest.fn();
  const setIssueBusy = jest.fn();
  const fetchStock = jest.fn(async () => undefined);
  const fetchReqItems = jest.fn(async () => undefined);
  const fetchReqHeads = jest.fn(async () => undefined);
  const clearReqQtyInput = jest.fn();

  const actions = makeWarehouseIssueActions({
    supabase: {} as never,
    nz: (value: unknown, fallback = 0) => {
      const numeric = Number(value ?? fallback);
      return Number.isFinite(numeric) ? numeric : fallback;
    },
    pickErr: (error: unknown) =>
      error instanceof Error ? error.message : String(error ?? "error"),
    getRecipient: () => "worker",
    getObjectLabel: () => "object",
    getWorkLabel: () => "work",
    getWarehousemanFio: () => "warehouseman",
    fetchStock,
    fetchReqItems,
    fetchReqHeads,
    getAvailableByCode: () => 10,
    getAvailableByCodeUom: () => 10,
    getMaterialNameByCode: (code) => `Material ${code}`,
    setIssueBusy,
    setIssueMsg,
    clearStockPick: jest.fn(),
    clearReqPick: jest.fn(),
    clearReqQtyInput,
  });

  return {
    actions,
    setIssueMsg,
    setIssueBusy,
    fetchStock,
    fetchReqItems,
    fetchReqHeads,
    clearReqQtyInput,
  };
};

describe("makeWarehouseIssueActions duplicate submit guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ensureRequestItemsBelongToRequest as jest.Mock).mockResolvedValue(undefined);
    (addWarehouseIssueItems as jest.Mock).mockResolvedValue({ data: null, error: null });
    (addWarehouseIssueItem as jest.Mock).mockResolvedValue({ data: null, error: null });
    (commitWarehouseIssue as jest.Mock).mockResolvedValue({ data: null, error: null });
    (issueWarehouseFreeAtomic as jest.Mock).mockResolvedValue({ data: 1, error: null });
  });

  it("blocks repeat submit while request-pick issue is in flight", async () => {
    const deferred = createDeferred<{ data: number; error: null }>();
    (createWarehouseIssue as jest.Mock).mockReturnValueOnce(deferred.promise);

    const { actions, setIssueMsg } = createIssueActions();
    const input = {
      requestId: "request-1",
      requestDisplayNo: "REQ-1",
      reqPick: {
        line1: {
          request_item_id: "item-1",
          rik_code: "MAT-1",
          name_human: "Material 1",
          uom: "pcs",
          qty: 1,
        },
      },
      reqItems: [
        {
          request_item_id: "item-1",
          rik_code: "MAT-1",
          name_human: "Material 1",
          uom: "pcs",
          qty_left: 1,
          qty_available: 1,
        },
      ],
    } as never;

    const first = actions.submitReqPick(input);
    await flushMicrotasks();
    const second = await actions.submitReqPick(input);

    expect(second).toBe(false);
    expect(createWarehouseIssue).toHaveBeenCalledTimes(1);
    expect(
      setIssueMsg.mock.calls.some(
        ([message]) => message.kind === "error" && String(message.text).includes(DUPLICATE_MESSAGE_TOKEN),
      ),
    ).toBe(true);

    deferred.resolve({ data: 42, error: null });
    await expect(first).resolves.toBe(true);
  });

  it("blocks repeat submit while free-stock issue is in flight", async () => {
    const deferred = createDeferred<{ data: number; error: null }>();
    (issueWarehouseFreeAtomic as jest.Mock).mockReturnValueOnce(deferred.promise);

    const { actions, setIssueMsg } = createIssueActions();
    const input = {
      stockPick: {
        line1: {
          pick_key: "MAT-1::pcs",
          code: "MAT-1",
          name: "Material 1",
          uom_id: "pcs",
          qty: 1,
        },
      },
    } as never;

    const first = actions.submitStockPick(input);
    await flushMicrotasks();
    const second = await actions.submitStockPick(input);

    expect(second).toBe(false);
    expect(issueWarehouseFreeAtomic).toHaveBeenCalledTimes(1);
    expect(
      setIssueMsg.mock.calls.some(
        ([message]) => message.kind === "error" && String(message.text).includes(DUPLICATE_MESSAGE_TOKEN),
      ),
    ).toBe(true);

    deferred.resolve({ data: 1, error: null });
    await expect(first).resolves.toBe(true);
  });

  it("blocks repeat submit while single request-item issue is in flight", async () => {
    const deferred = createDeferred<{ data: number; error: null }>();
    (createWarehouseIssue as jest.Mock).mockReturnValueOnce(deferred.promise);

    const { actions, setIssueMsg } = createIssueActions();
    const input = {
      row: {
        request_id: "request-1",
        request_item_id: "item-1",
        rik_code: "MAT-1",
        name_human: "Material 1",
        uom: "pcs",
        qty_can_issue_now: 1,
      },
      qty: 1,
    } as never;

    const first = actions.issueByRequestItem(input);
    await flushMicrotasks();
    const second = await actions.issueByRequestItem(input);

    expect(second).toBe(false);
    expect(createWarehouseIssue).toHaveBeenCalledTimes(1);
    expect(
      setIssueMsg.mock.calls.some(
        ([message]) => message.kind === "error" && String(message.text).includes(DUPLICATE_MESSAGE_TOKEN),
      ),
    ).toBe(true);

    deferred.resolve({ data: 42, error: null });
    await expect(first).resolves.toBe(true);
  });
});
