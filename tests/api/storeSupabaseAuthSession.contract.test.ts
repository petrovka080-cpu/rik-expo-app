import { readFileSync } from "fs";
import { join } from "path";

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase as mockedSupabase } from "../../src/lib/supabaseClient";
import {
  listApprovedByRequest,
  listDirectorInbox,
  listRequestItems,
} from "../../src/lib/store_supabase";

type QueryLog = {
  table: string;
  select: string | null;
  eq: [string, unknown][];
  order: [string, unknown][];
  ranges: [number, number][];
};

type MockQuery = {
  select: (columns: string) => MockQuery;
  eq: (column: string, value: unknown) => MockQuery;
  order: (column: string, options: unknown) => MockQuery;
  range: (from: number, to: number) => Promise<{ data: Record<string, unknown>[]; error: null }>;
};

const mockSupabase = mockedSupabase as unknown as {
  auth: { getSession: jest.Mock };
  from: jest.Mock;
  rpc: jest.Mock;
};

const sourcePath = join(__dirname, "..", "..", "src", "lib", "store_supabase.ts");
const readTransportSourcePath = join(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "store_supabase.read.transport.ts",
);
const readContractSourcePath = join(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "assistant_store_read.bff.contract.ts",
);

const installReadMock = (tables: Record<string, Record<string, unknown>[]>) => {
  const logs: QueryLog[] = [];

  mockSupabase.from.mockImplementation((table: string) => {
    const log: QueryLog = {
      table,
      select: null,
      eq: [],
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
    query.order = (column: string, options: unknown) => {
      log.order.push([column, options]);
      return query;
    };
    query.range = async (from: number, to: number) => {
      log.ranges.push([from, to]);
      return { data: (tables[table] ?? []).slice(from, to + 1), error: null };
    };

    return query;
  });

  return logs;
};

const requestRows = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return {
      id: `ri-${String(n).padStart(3, "0")}`,
      request_id: "42",
      name_human: `Item ${n}`,
      qty: n,
      uom: "pcs",
      status: "draft",
      created_at: `2026-04-30T10:${String(index % 60).padStart(2, "0")}:00.000Z`,
    };
  });

const pendingRows = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return {
      id: `pending-${n}`,
      request_id: 42,
      request_item_id: `ri-${String(n).padStart(3, "0")}`,
      name_human: `Pending ${n}`,
      qty: n,
      uom: "pcs",
    };
  });

describe("store_supabase auth/session read boundaries", () => {
  beforeEach(() => {
    mockSupabase.auth.getSession.mockClear();
    mockSupabase.from.mockReset();
    mockSupabase.rpc.mockReset();
  });

  it("pages request item reads by request id without changing returned rows", async () => {
    const logs = installReadMock({ request_items: requestRows(101) });

    const rows = await listRequestItems(42, "draft");

    expect(rows).toHaveLength(101);
    expect(rows[100]).toMatchObject({
      id: "ri-101",
      request_id: "42",
      name_human: "Item 101",
      qty: 101,
      status: "draft",
    });
    expect(logs.map((log) => log.ranges[0])).toEqual([
      [0, 99],
      [100, 199],
    ]);
    expect(logs.every((log) => log.eq.length >= 1)).toBe(true);
    expect(logs[0].eq).toEqual([
      ["request_id", "42"],
      ["status", "draft"],
    ]);
    expect(logs[0].order).toEqual([
      ["created_at", { ascending: true }],
      ["id", { ascending: true }],
    ]);
  });

  it("pages director inbox reads while preserving the complete inbox payload", async () => {
    const logs = installReadMock({ request_items_pending_view: pendingRows(101) });

    const rows = await listDirectorInbox();

    expect(rows).toHaveLength(101);
    expect(rows[100]).toMatchObject({
      pending_id: "ri-101",
      request_id: 42,
      request_item_id: "ri-101",
      name_human: "Pending 101",
    });
    expect(logs.map((log) => log.ranges[0])).toEqual([
      [0, 99],
      [100, 199],
    ]);
    expect(logs[0].order).toEqual([
      ["created_at", { ascending: false }],
      ["request_item_id", { ascending: true }],
    ]);
  });

  it("pages approved request item reads by the request id used for PO creation", async () => {
    const logs = installReadMock({ v_request_items_display: requestRows(101) });

    const rows = await listApprovedByRequest(42);

    expect(rows).toHaveLength(101);
    expect(rows[100]).toMatchObject({
      id: "ri-101",
      request_id: "42",
      name_human: "Item 101",
      qty: 101,
    });
    expect(logs.map((log) => log.ranges[0])).toEqual([
      [0, 99],
      [100, 199],
    ]);
    expect(logs[0].eq).toEqual([["request_id", "42"]]);
    expect(logs[0].order).toEqual([["id", { ascending: true }]]);
  });

  it("keeps store_supabase out of auth client/session persistence setup", () => {
    const source = readFileSync(sourcePath, "utf8");
    const readTransportSource = readFileSync(readTransportSourcePath, "utf8");
    const readContractSource = readFileSync(readContractSourcePath, "utf8");

    expect(readTransportSource).toContain("loadPagedStoreSupabaseRows");
    expect(readTransportSource).toContain("ASSISTANT_STORE_READ_BFF_REFERENCE_PAGE_DEFAULTS");
    expect(readTransportSource).toContain("loadPagedRowsWithCeiling");
    expect(readContractSource).toContain("maxRows: 5000");
    expect(source).not.toContain(".auth.");
    expect(source).not.toContain("persistSession");
    expect(source).not.toContain("detectSessionInUrl");
  });
});
