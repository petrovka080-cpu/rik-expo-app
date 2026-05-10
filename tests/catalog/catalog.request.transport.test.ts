import fs from "fs";
import path from "path";

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  cancelCatalogRequestItemRow,
  loadCatalogForemanRequestRowsByCreatedBy,
  loadCatalogForemanRequestRowsByName,
  loadCatalogRequestDetailsRowByDisplayNo,
  loadCatalogRequestDetailsRowById,
  loadCatalogRequestDisplayHeaderRow,
  loadCatalogRequestDisplayNoViaFallbacks,
  loadCatalogRequestDraftStatusRow,
  loadCatalogRequestExtendedMetaSampleRows,
  loadCatalogRequestItemRows,
  loadCatalogRequestItemStatusRows,
  runCatalogRequestDisplayRpc,
  selectCatalogDynamicReadSingle,
  updateCatalogRequestItemQtyRow,
  updateCatalogRequestItemQtyViaRpc,
  updateCatalogRequestRow,
} from "../../src/lib/catalog/catalog.request.transport";

const repoRoot = path.resolve(__dirname, "../..");

const buildSingleQuery = (resolvedValue: unknown) => {
  const maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  return { select, eq, maybeSingle };
};

const buildSingleQueryReject = (error: unknown) => {
  const maybeSingle = jest.fn().mockRejectedValue(error);
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

const buildUpdateQuery = (resolvedValue: unknown) => {
  const chain = {
    update: jest.fn(),
    eq: jest.fn().mockResolvedValue(resolvedValue),
  };
  chain.update.mockReturnValue(chain);
  return chain;
};

const buildUpdateSelectQuery = (resolvedValue: unknown) => {
  const chain = {
    update: jest.fn(),
    eq: jest.fn(),
    select: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(resolvedValue),
  };
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  return chain;
};

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const getFunctionSlice = (
  source: string,
  startNeedle: string,
  endNeedle: string,
) => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  if (start < 0 || end < 0)
    throw new Error(`function slice not found: ${startNeedle}`);
  return source.slice(start, end);
};

describe("catalog request read transport", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
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

    await selectCatalogDynamicReadSingle(
      "v_request_pdf_header",
      "id,display_no",
      "REQ-3",
      "display_no",
    );

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
    expect(query.select).toHaveBeenCalledWith(
      "id,subcontract_id,contractor_job_id,contractor_org,subcontractor_org,contractor_phone,subcontractor_phone,planned_volume,qty_plan,volume,object_name,level_name,system_name,zone_name",
    );
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
    expect(query.order).toHaveBeenCalledWith("position_order", {
      ascending: true,
    });
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
    expect(byName.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(byName.limit).toHaveBeenCalledWith(25);

    const byUser = buildForemanQuery({ data: [], error: null });
    mockFrom.mockReturnValue(byUser);

    await loadCatalogForemanRequestRowsByCreatedBy("user-1", 10);

    expect(byUser.eq).toHaveBeenCalledWith("created_by", "user-1");
    expect(byUser.not).toHaveBeenCalledWith("display_no", "is", null);
    expect(byUser.limit).toHaveBeenCalledWith(10);
  });

  it("preserves request item status aggregation query shape", async () => {
    const query = buildPagedQuery({
      data: [{ request_id: "request-6", status: "pending" }],
      error: null,
    });
    mockFrom.mockReturnValue(query);

    await loadCatalogRequestItemStatusRows(["request-6"]);

    expect(mockFrom).toHaveBeenCalledWith("request_items");
    expect(query.select).toHaveBeenCalledWith("request_id,status");
    expect(query.in).toHaveBeenCalledWith("request_id", ["request-6"]);
    expect(query.order).toHaveBeenCalledWith("request_id", { ascending: true });
    expect(query.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(query.range).toHaveBeenCalledWith(0, 99);
  });

  it("preserves display RPC fallback names, args, and string normalization", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: "REQ-1", error: null })
      .mockResolvedValueOnce({ data: 42, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    await expect(
      runCatalogRequestDisplayRpc("request_display_no", {
        p_request_id: "request-1",
      }),
    ).resolves.toEqual({ data: "REQ-1", error: null });
    await expect(
      runCatalogRequestDisplayRpc("request_display", {
        p_request_id: "request-2",
      }),
    ).resolves.toEqual({ data: "42", error: null });
    await expect(
      runCatalogRequestDisplayRpc("request_label", {
        p_request_id: "request-3",
      }),
    ).resolves.toEqual({ data: null, error: null });

    expect(mockRpc).toHaveBeenNthCalledWith(1, "request_display_no", {
      p_request_id: "request-1",
    });
    expect(mockRpc).toHaveBeenNthCalledWith(2, "request_display", {
      p_request_id: "request-2",
    });
    expect(mockRpc).toHaveBeenNthCalledWith(3, "request_label", {
      p_request_id: "request-3",
    });
  });

  it("resolves request display_no through the single transport contract without fallback calls", async () => {
    const query = buildSingleQuery({
      data: { id: "request-1", display_no: "REQ-1" },
      error: null,
    });
    mockFrom.mockReturnValueOnce(query);

    await expect(
      loadCatalogRequestDisplayNoViaFallbacks("request-1"),
    ).resolves.toMatchObject({
      displayNo: "REQ-1",
      source: "requests",
      warnings: [],
      sequentialCallCount: 1,
    });

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("requests");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("preserves display_no RPC fallback order and records compatibility warnings", async () => {
    mockFrom.mockReturnValueOnce(
      buildSingleQueryReject(new Error("transient lookup failure")),
    );
    mockRpc
      .mockRejectedValueOnce(new Error("temporary rpc failure"))
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: "REQ-RPC", error: null });

    const result = await loadCatalogRequestDisplayNoViaFallbacks("request-2");

    expect(result.displayNo).toBe("REQ-RPC");
    expect(result.source).toBe("request_label");
    expect(result.sequentialCallCount).toBe(4);
    expect(result.warnings).toEqual([
      expect.objectContaining({ stage: "request_header", source: "requests" }),
      expect.objectContaining({ stage: "rpc", source: "request_display_no" }),
    ]);
    expect(mockRpc).toHaveBeenNthCalledWith(1, "request_display_no", {
      p_request_id: "request-2",
    });
    expect(mockRpc).toHaveBeenNthCalledWith(2, "request_display", {
      p_request_id: "request-2",
    });
    expect(mockRpc).toHaveBeenNthCalledWith(3, "request_label", {
      p_request_id: "request-2",
    });
  });

  it("preserves the legacy worst-case 8-step bounded display_no compatibility sequence", async () => {
    mockFrom
      .mockReturnValueOnce(buildSingleQuery({ data: null, error: null }))
      .mockReturnValueOnce(buildSingleQuery({ data: null, error: null }))
      .mockReturnValueOnce(buildSingleQuery({ data: null, error: null }))
      .mockReturnValueOnce(buildSingleQuery({ data: null, error: null }))
      .mockReturnValueOnce(buildSingleQuery({ data: null, error: null }));
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    await expect(
      loadCatalogRequestDisplayNoViaFallbacks("request-3"),
    ).resolves.toMatchObject({
      displayNo: null,
      source: null,
      warnings: [],
      sequentialCallCount: 8,
    });

    expect(mockFrom).toHaveBeenNthCalledWith(1, "requests");
    expect(mockFrom).toHaveBeenNthCalledWith(2, "request_display");
    expect(mockFrom).toHaveBeenNthCalledWith(3, "vi_requests_display");
    expect(mockFrom).toHaveBeenNthCalledWith(4, "v_requests_display");
    expect(mockFrom).toHaveBeenNthCalledWith(5, "requests");
  });

  it("preserves request meta update table, payload, and id filter", async () => {
    const query = buildUpdateQuery({ error: null });
    mockFrom.mockReturnValue(query);

    const payload = {
      need_by: "2026-05-06",
      comment: "ready",
      planned_volume: 12,
    };
    await updateCatalogRequestRow("request-7", payload);

    expect(mockFrom).toHaveBeenCalledWith("requests");
    expect(query.update).toHaveBeenCalledWith(payload);
    expect(query.eq).toHaveBeenCalledWith("id", "request-7");
  });

  it("preserves request item qty RPC and fallback update/readback contracts", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { id: "item-1", request_id: "request-1", qty: 3 },
      error: null,
    });

    await updateCatalogRequestItemQtyViaRpc({
      p_request_item_id: "item-1",
      p_qty: 3,
    });

    expect(mockRpc).toHaveBeenCalledWith("request_item_update_qty", {
      p_request_item_id: "item-1",
      p_qty: 3,
    });

    const query = buildUpdateSelectQuery({
      data: { id: "item-1", request_id: "request-1", qty: 4 },
      error: null,
    });
    mockFrom.mockReturnValue(query);

    await updateCatalogRequestItemQtyRow("item-1", 4);

    expect(mockFrom).toHaveBeenCalledWith("request_items");
    expect(query.update).toHaveBeenCalledWith({ qty: 4 });
    expect(query.eq).toHaveBeenCalledWith("id", "item-1");
    expect(query.select).toHaveBeenCalledWith(
      "id,request_id,rik_code,name_human,uom,qty,status,note,app_code,supplier_hint,row_no,position_order,updated_at",
    );
    expect(query.maybeSingle).toHaveBeenCalled();
  });

  it("preserves request item cancel update contract", async () => {
    const query = buildUpdateQuery({ error: null });
    mockFrom.mockReturnValue(query);

    await cancelCatalogRequestItemRow("item-9", "2026-05-06T00:00:00.000Z");

    expect(mockFrom).toHaveBeenCalledWith("request_items");
    expect(query.update).toHaveBeenCalledWith({
      status: "cancelled",
      cancelled_at: "2026-05-06T00:00:00.000Z",
    });
    expect(query.eq).toHaveBeenCalledWith("id", "item-9");
  });
});

describe("catalog request BFF/data-access routing contract", () => {
  it("removes direct Supabase read calls from migrated service functions", () => {
    const source = readSource("src/lib/catalog/catalog.request.service.ts");
    const migratedSlices = [
      getFunctionSlice(
        source,
        "async function isCachedDraftValid",
        "let requestsExtendedMetaWriteSupportedCache",
      ),
      getFunctionSlice(
        source,
        "async function resolveRequestsExtendedMetaWriteSupport",
        "export function getLocalDraftId",
      ),
      getFunctionSlice(
        source,
        "export async function getRequestHeader",
        "export async function fetchRequestDisplayNo",
      ),
      getFunctionSlice(
        source,
        "export async function fetchRequestDisplayNo",
        "export async function fetchRequestDetails",
      ),
      getFunctionSlice(
        source,
        "export async function fetchRequestDetails",
        "export async function updateRequestMeta",
      ),
      getFunctionSlice(
        source,
        "export async function listRequestItems",
        "export async function requestItemUpdateQty",
      ),
      getFunctionSlice(
        source,
        "export async function listForemanRequests",
        "export async function requestItemCancel",
      ),
    ];

    for (const body of migratedSlices) {
      expect(body).not.toMatch(/supabase\s*\.\s*from\s*\(/);
      expect(body).not.toMatch(
        /filterRequestLinkedRowsByExistingRequestLinks\s*\(\s*supabase/,
      );
    }
  });

  it("removes all direct Supabase call sites from the catalog request service", () => {
    const source = readSource("src/lib/catalog/catalog.request.service.ts");

    expect(source).not.toMatch(/supabase\s*\.\s*(from|rpc)\s*\(/);
    expect(source).not.toContain("supabaseClient");
    expect(source).toContain("loadCatalogRequestDisplayNoViaFallbacks");
    expect(source).toContain("updateCatalogRequestRow");
    expect(source).toContain("updateCatalogRequestItemQtyViaRpc");
    expect(source).toContain("cancelCatalogRequestItemRow");
  });

  it("collapses fetchRequestDisplayNo service waterfall into one bounded transport contract", () => {
    const source = readSource("src/lib/catalog/catalog.request.service.ts");
    const body = getFunctionSlice(
      source,
      "export async function fetchRequestDisplayNo",
      "export async function fetchRequestDetails",
    );

    expect(body.match(/loadCatalogRequestDisplayNoViaFallbacks/g)).toHaveLength(
      1,
    );
    expect(body).not.toContain("loadCatalogRequestDisplayHeaderRow");
    expect(body).not.toContain("runCatalogRequestDisplayRpc");
    expect(body).not.toContain("selectCatalogDynamicReadSingle");
  });

  it("does not add raw data logging to the transport boundary", () => {
    const source = readSource("src/lib/catalog/catalog.request.transport.ts");

    expect(source).not.toMatch(/console\.(log|info|warn|error)/);
    expect(source).not.toMatch(/process\.env/);
  });

  it("keeps catalog request mutation logging redacted to keys and errors", () => {
    const source = readSource("src/lib/catalog/catalog.request.service.ts");

    expect(source).toContain("payload_keys");
    expect(source).not.toMatch(/payload:\s*(primaryPayload|fallbackPayload)/);
  });
});
