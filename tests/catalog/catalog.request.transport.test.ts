import fs from "fs";
import path from "path";

const mockFrom = jest.fn();

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  loadCatalogForemanRequestRowsByCreatedBy,
  loadCatalogForemanRequestRowsByName,
  loadCatalogRequestDetailsRowByDisplayNo,
  loadCatalogRequestDetailsRowById,
  loadCatalogRequestDisplayHeaderRow,
  loadCatalogRequestDraftStatusRow,
  loadCatalogRequestExtendedMetaSampleRows,
  loadCatalogRequestItemRows,
  loadCatalogRequestItemStatusRows,
  selectCatalogDynamicReadSingle,
} from "../../src/lib/catalog/catalog.request.transport";

const repoRoot = path.resolve(__dirname, "../..");

const buildSingleQuery = (resolvedValue: unknown) => {
  const maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  return { select, eq, maybeSingle };
};

const buildLimitQuery = (resolvedValue: unknown) => {
  const limit = jest.fn().mockResolvedValue(resolvedValue);
  const select = jest.fn().mockReturnValue({ limit });
  return { select, limit };
};

const buildForemanQuery = (resolvedValue: unknown) => {
  const chain = {
    select: jest.fn(),
    ilike: jest.fn(),
    eq: jest.fn(),
    not: jest.fn(),
    order: jest.fn(),
    limit: jest.fn().mockResolvedValue(resolvedValue),
  };
  chain.select.mockReturnValue(chain);
  chain.ilike.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.not.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
};

const buildPagedQuery = (resolvedValue: unknown) => {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    order: jest.fn(),
    range: jest.fn().mockResolvedValue(resolvedValue),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
};

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const getFunctionSlice = (source: string, startNeedle: string, endNeedle: string) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  if (start < 0 || end < 0) throw new Error(`function slice not found: ${startNeedle}`);
  return source.slice(start, end);
};

describe("catalog request read transport", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("keeps single-row request reads behind the transport boundary", async () => {
    const query = buildSingleQuery({ data: { id: "request-1" }, error: null });
    mockFrom.mockReturnValue(query);

    await loadCatalogRequestDraftStatusRow("request-1");
    expect(mockFrom).toHaveBeenCalledWith("requests");
    expect(query.select).toHaveBeenCalledWith("id,status");
    expect(query.eq).toHaveBeenCalledWith("id", "request-1");
    expect(query.maybeSingle).toHaveBeenCalled();

    mockFrom.mockClear();
    query.select.mockClear();
    query.eq.mockClear();
    query.maybeSingle.mockClear();

    await loadCatalogRequestDisplayHeaderRow("request-2");
    expect(mockFrom).toHaveBeenCalledWith("requests");
    expect(query.select).toHaveBeenCalledWith("id,display_no");
    expect(query.eq).toHaveBeenCalledWith("id", "request-2");
  });

  it("preserves dynamic view/table source, filter column, and selected columns", async () => {
    const query = buildSingleQuery({ data: { id: "request-3" }, error: null });
    mockFrom.mockReturnValue(query);

    await selectCatalogDynamicReadSingle("v_request_pdf_header", "id,display_no", "REQ-3", "display_no");

    expect(mockFrom).toHaveBeenCalledWith("v_request_pdf_header");
    expect(query.select).toHaveBeenCalledWith("id,display_no");
    expect(query.eq).toHaveBeenCalledWith("display_no", "REQ-3");
  });

  it("preserves request details id and display_no lookup contracts", async () => {
    const query = buildSingleQuery({ data: { id: "request-4" }, error: null });
    mockFrom.mockReturnValue(query);

    await loadCatalogRequestDetailsRowById("id,status", "request-4");
    expect(query.select).toHaveBeenCalledWith("id,status");
    expect(query.eq).toHaveBeenCalledWith("id", "request-4");

    query.select.mockClear();
    query.eq.mockClear();

    await loadCatalogRequestDetailsRowByDisplayNo("id,status", "REQ-4");
    expect(query.select).toHaveBeenCalledWith("id,status");
    expect(query.eq).toHaveBeenCalledWith("display_no", "REQ-4");
  });

  it("keeps extended-meta probing bounded to one row", async () => {
    const query = buildLimitQuery({ data: [], error: null });
    mockFrom.mockReturnValue(query);

    await loadCatalogRequestExtendedMetaSampleRows();

    expect(mockFrom).toHaveBeenCalledWith("requests");
    expect(query.select).toHaveBeenCalledWith("*");
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it("preserves request item list filters, ordering, and page ceiling", async () => {
    const query = buildPagedQuery({ data: [{ id: "item-1" }], error: null });
    mockFrom.mockReturnValue(query);

    await loadCatalogRequestItemRows("request-5");

    expect(mockFrom).toHaveBeenCalledWith("request_items");
    expect(query.select).toHaveBeenCalledWith(
      "id,request_id,rik_code,name_human,uom,qty,status,note,app_code,supplier_hint,row_no,position_order,updated_at",
    );
    expect(query.eq).toHaveBeenCalledWith("request_id", "request-5");
    expect(query.order).toHaveBeenCalledWith("row_no", { ascending: true });
    expect(query.order).toHaveBeenCalledWith("position_order", { ascending: true });
    expect(query.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(query.range).toHaveBeenCalledWith(0, 99);
  });

  it("preserves foreman request list filters, ordering, and limits", async () => {
    const byName = buildForemanQuery({ data: [], error: null });
    mockFrom.mockReturnValue(byName);

    await loadCatalogForemanRequestRowsByName("Alice", 25);

    expect(mockFrom).toHaveBeenCalledWith("requests");
    expect(byName.ilike).toHaveBeenCalledWith("foreman_name", "Alice");
    expect(byName.not).toHaveBeenCalledWith("display_no", "is", null);
    expect(byName.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(byName.limit).toHaveBeenCalledWith(25);

    const byUser = buildForemanQuery({ data: [], error: null });
    mockFrom.mockReturnValue(byUser);

    await loadCatalogForemanRequestRowsByCreatedBy("user-1", 10);

    expect(byUser.eq).toHaveBeenCalledWith("created_by", "user-1");
    expect(byUser.not).toHaveBeenCalledWith("display_no", "is", null);
    expect(byUser.limit).toHaveBeenCalledWith(10);
  });

  it("preserves request item status aggregation query shape", async () => {
    const query = buildPagedQuery({ data: [{ request_id: "request-6", status: "pending" }], error: null });
    mockFrom.mockReturnValue(query);

    await loadCatalogRequestItemStatusRows(["request-6"]);

    expect(mockFrom).toHaveBeenCalledWith("request_items");
    expect(query.select).toHaveBeenCalledWith("request_id,status");
    expect(query.in).toHaveBeenCalledWith("request_id", ["request-6"]);
    expect(query.order).toHaveBeenCalledWith("request_id", { ascending: true });
    expect(query.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(query.range).toHaveBeenCalledWith(0, 99);
  });
});

describe("catalog request BFF/data-access routing contract", () => {
  it("removes direct Supabase read calls from migrated service functions", () => {
    const source = readSource("src/lib/catalog/catalog.request.service.ts");
    const migratedSlices = [
      getFunctionSlice(source, "async function isCachedDraftValid", "let requestsExtendedMetaWriteSupportedCache"),
      getFunctionSlice(source, "async function resolveRequestsExtendedMetaWriteSupport", "export function getLocalDraftId"),
      getFunctionSlice(source, "export async function getRequestHeader", "export async function fetchRequestDisplayNo"),
      getFunctionSlice(source, "export async function fetchRequestDisplayNo", "export async function fetchRequestDetails"),
      getFunctionSlice(source, "export async function fetchRequestDetails", "export async function updateRequestMeta"),
      getFunctionSlice(source, "export async function listRequestItems", "export async function requestItemUpdateQty"),
      getFunctionSlice(source, "export async function listForemanRequests", "export async function requestItemCancel"),
    ];

    for (const body of migratedSlices) {
      expect(body).not.toMatch(/supabase\s*\.\s*from\s*\(/);
      expect(body).not.toMatch(/filterRequestLinkedRowsByExistingRequestLinks\s*\(\s*supabase/);
    }
  });

  it("keeps remaining direct service call sites limited to RPC and write semantics", () => {
    const source = readSource("src/lib/catalog/catalog.request.service.ts");

    expect(source).toContain('supabase.rpc("request_display_no"');
    expect(source).toContain('supabase.rpc("request_item_update_qty"');
    expect(source).toContain(".update(primaryPayload)");
    expect(source).toContain(".update(fallbackPayload)");
    expect(source).toContain(".update({");
    expect(source).not.toContain('supabase.from("requests").select');
    expect(source).not.toContain('supabase.from("request_items").select');
  });

  it("does not add raw data logging to the transport boundary", () => {
    const source = readSource("src/lib/catalog/catalog.request.transport.ts");

    expect(source).not.toMatch(/console\.(log|info|warn|error)/);
    expect(source).not.toMatch(/process\.env/);
  });
});
