import { readFileSync } from "fs";
import { join } from "path";

import { openReworkAction } from "../../src/screens/buyer/buyer.rework.mutation";

jest.mock("../../src/lib/supabaseClient", () => ({ supabase: {} }));

type QueryLog = {
  table: string;
  select: string | null;
  eq: [string, unknown][];
  in: [string, unknown[]][];
  order: [string, unknown][];
  ranges: [number, number][];
};

type MockQuery = {
  select: (columns: string) => MockQuery;
  eq: (column: string, value: unknown) => MockQuery;
  in: (column: string, values: unknown[]) => MockQuery;
  order: (column: string, options: unknown) => MockQuery;
  maybeSingle: () => Promise<{ data: Record<string, unknown>; error: null }>;
  range: (from: number, to: number) => Promise<{ data: Record<string, unknown>[]; error: null }>;
};

const sourcePath = join(__dirname, "..", "..", "src", "screens", "buyer", "buyer.rework.mutation.ts");

const buildRows = (count: number) => {
  const proposalItems = Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    const id = `ri-${String(n).padStart(3, "0")}`;
    return {
      request_item_id: id,
      price: n,
      supplier: `supplier-${n}`,
      note: `note-${n}`,
    };
  });

  const requestItems = proposalItems.map((item, index) => {
    const n = index + 1;
    return {
      id: item.request_item_id,
      name_human: `Item ${n}`,
      uom: "pcs",
      qty: n,
    };
  });

  return { proposalItems, requestItems };
};

const buildOpenReworkSupabase = (params: {
  proposalItems: Record<string, unknown>[];
  requestItems: Record<string, unknown>[];
}) => {
  const logs: QueryLog[] = [];

  const supabase = {
    from: jest.fn((table: string) => {
      const log: QueryLog = {
        table,
        select: null,
        eq: [],
        in: [],
        order: [],
        ranges: [],
      };
      logs.push(log);

      const query = {} as MockQuery;
      query.select = (columns: string) => {
        log.select = columns;
        return query;
      };
      query.eq = (column: string, value: unknown) => {
        log.eq.push([column, value]);
        return query;
      };
      query.in = (column: string, values: unknown[]) => {
        log.in.push([column, values]);
        return query;
      };
      query.order = (column: string, options: unknown) => {
        log.order.push([column, options]);
        return query;
      };
      query.maybeSingle = async () => ({
        data: {
          status: "director_rework",
          redo_source: "director",
          redo_comment: "Needs rework",
        },
        error: null,
      });
      query.range = async (from: number, to: number) => {
        log.ranges.push([from, to]);
        const rows =
          table === "proposal_items"
            ? params.proposalItems
            : table === "request_items"
              ? params.requestItems
              : [];
        return { data: rows.slice(from, to + 1), error: null };
      };

      return query;
    }),
  };

  return { supabase: supabase as never, logs };
};

describe("buyer rework mutation prefetch bounds", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
  });

  it("pages proposal_items and input-id request_items without truncating the rework payload", async () => {
    const rows = buildRows(101);
    const { supabase, logs } = buildOpenReworkSupabase(rows);
    const setRwItems = jest.fn();

    const result = await openReworkAction({
      pid: "proposal-1",
      supabase,
      openReworkSheet: jest.fn(),
      setRwBusy: jest.fn(),
      setRwPid: jest.fn(),
      setRwReason: jest.fn(),
      setRwItems,
      setRwInvNumber: jest.fn(),
      setRwInvDate: jest.fn(),
      setRwInvAmount: jest.fn(),
      setRwInvCurrency: jest.fn(),
      setRwInvFile: jest.fn(),
      setRwInvUploadedName: jest.fn(),
      setRwSource: jest.fn(),
      alert: jest.fn(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ itemCount: 101, source: "director" });

    const uiItems = setRwItems.mock.calls[setRwItems.mock.calls.length - 1]?.[0];
    expect(uiItems).toHaveLength(101);
    expect(uiItems[100]).toMatchObject({
      request_item_id: "ri-101",
      name_human: "Item 101",
      uom: "pcs",
      qty: 101,
      price: "101",
      supplier: "supplier-101",
      note: "note-101",
    });

    const proposalItemLogs = logs.filter((log) => log.table === "proposal_items");
    expect(proposalItemLogs.map((log) => log.ranges[0])).toEqual([
      [0, 99],
      [100, 199],
    ]);
    expect(proposalItemLogs.every((log) => log.eq.some(([column]) => column === "proposal_id"))).toBe(true);
    expect(proposalItemLogs.every((log) =>
      log.order.some(([column, options]) =>
        column === "request_item_id" && (options as { ascending?: boolean }).ascending === true,
      ),
    )).toBe(true);

    const requestItemLogs = logs.filter((log) => log.table === "request_items");
    expect(requestItemLogs.map((log) => log.ranges[0])).toEqual([
      [0, 99],
      [100, 199],
    ]);
    expect(requestItemLogs[0].in[0]).toEqual([
      "id",
      rows.proposalItems.map((row) => row.request_item_id),
    ]);
    expect(requestItemLogs.every((log) =>
      log.order.some(([column, options]) =>
        column === "id" && (options as { ascending?: boolean }).ascending === true,
      ),
    )).toBe(true);
  });

  it("keeps both buyer rework prefetch selects behind the bounded page helper", () => {
    const source = readFileSync(sourcePath, "utf8");

    expect(source).toContain("BUYER_REWORK_PREFETCH_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100 }");
    expect(source).toContain("loadPagedBuyerReworkRows<ReworkProposalItemRow>");
    expect(source).toContain("loadPagedBuyerReworkRows<RequestItemNameRow>");
    expect(source).toContain(".order(\"request_item_id\", { ascending: true })");
    expect(source).toContain(".order(\"id\", { ascending: true })");
    expect(source).toContain("queryFactory().range(page.from, page.to)");
  });
});
