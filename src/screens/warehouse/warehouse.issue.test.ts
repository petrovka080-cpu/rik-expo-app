import { ensureRequestItemsBelongToRequest } from "../../lib/api/integrity.guards";
import { makeWarehouseIssueActions } from "./warehouse.issue";
import {
  issueWarehouseFreeAtomic,
  issueWarehouseRequestAtomic,
} from "./warehouse.issue.repo";

jest.mock("../../lib/api/integrity.guards", () => ({
  ensureRequestItemsBelongToRequest: jest.fn(),
}));

jest.mock("./warehouse.issue.repo", () => ({
  issueWarehouseFreeAtomic: jest.fn(),
  issueWarehouseRequestAtomic: jest.fn(),
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
    (issueWarehouseFreeAtomic as jest.Mock).mockResolvedValue({ data: 1, error: null });
    (issueWarehouseRequestAtomic as jest.Mock).mockResolvedValue({
      data: { issue_id: 42 },
      error: null,
    });
  });

  it("blocks repeat submit while request-pick issue is in flight", async () => {
    const deferred = createDeferred<{ data: number; error: null }>();
    (issueWarehouseRequestAtomic as jest.Mock).mockReturnValueOnce(deferred.promise);

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
    expect(issueWarehouseRequestAtomic).toHaveBeenCalledTimes(1);
    expect(
      setIssueMsg.mock.calls.some(
        ([message]) => message.kind === "error" && String(message.text).includes(DUPLICATE_MESSAGE_TOKEN),
      ),
    ).toBe(true);

    deferred.resolve({ data: 42, error: null });
    await expect(first).resolves.toBe(true);
  });

  it("submits request-pick issue through one atomic server boundary", async () => {
    const { actions } = createIssueActions();
    const input = {
      requestId: "request-1",
      requestDisplayNo: "REQ-1",
      reqPick: {
        line1: {
          request_item_id: "item-1",
          rik_code: "MAT-1",
          name_human: "Material 1",
          uom: "pcs",
          qty: 2,
        },
      },
      reqItems: [
        {
          request_item_id: "item-1",
          rik_code: "MAT-1",
          name_human: "Material 1",
          uom: "pcs",
          qty_left: 2,
          qty_available: 3,
        },
      ],
    } as never;

    await expect(actions.submitReqPick(input)).resolves.toBe(true);

    expect(issueWarehouseRequestAtomic).toHaveBeenCalledTimes(1);
    expect(issueWarehouseRequestAtomic).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        p_request_id: "request-1",
        p_lines: [
          {
            rik_code: "MAT-1",
            uom_id: "pcs",
            qty: 2,
            request_item_id: "item-1",
          },
        ],
        p_client_mutation_id: expect.any(String),
      }),
    );
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

  it("submits free-stock issue through idempotent atomic server boundary", async () => {
    const { actions } = createIssueActions();
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

    await expect(actions.submitStockPick(input)).resolves.toBe(true);

    expect(issueWarehouseFreeAtomic).toHaveBeenCalledTimes(1);
    expect(issueWarehouseFreeAtomic).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        p_lines: [
          {
            rik_code: "MAT-1",
            uom_id: "pcs",
            qty: 1,
          },
        ],
        p_client_mutation_id: expect.any(String),
      }),
    );
  });

  it("blocks repeat submit while single request-item issue is in flight", async () => {
    const deferred = createDeferred<{ data: number; error: null }>();
    (issueWarehouseRequestAtomic as jest.Mock).mockReturnValueOnce(deferred.promise);

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
    expect(issueWarehouseRequestAtomic).toHaveBeenCalledTimes(1);
    expect(
      setIssueMsg.mock.calls.some(
        ([message]) => message.kind === "error" && String(message.text).includes(DUPLICATE_MESSAGE_TOKEN),
      ),
    ).toBe(true);

    deferred.resolve({ data: 42, error: null });
    await expect(first).resolves.toBe(true);
  });

  it("submits single request-item issue through one atomic server boundary", async () => {
    const { actions } = createIssueActions();
    const input = {
      row: {
        request_id: "request-1",
        request_item_id: "item-1",
        rik_code: "MAT-1",
        name_human: "Material 1",
        uom: "pcs",
        qty_can_issue_now: 2,
      },
      qty: 1,
    } as never;

    await expect(actions.issueByRequestItem(input)).resolves.toBe(true);

    expect(issueWarehouseRequestAtomic).toHaveBeenCalledTimes(1);
    expect(issueWarehouseRequestAtomic).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        p_request_id: "request-1",
        p_lines: [
          {
            rik_code: "MAT-1",
            uom_id: "pcs",
            qty: 1,
            request_item_id: "item-1",
          },
        ],
        p_client_mutation_id: expect.any(String),
      }),
    );
  });
});
