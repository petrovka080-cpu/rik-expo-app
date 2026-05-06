const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  normalizeCatalogGroupRows,
  normalizeIncomingItemRows,
  normalizeSuppliersListRpcArgs,
  normalizeUomRows,
} from "../../src/lib/catalog/catalog.transport.normalize";
import {
  loadCatalogGroupsRows,
  loadIncomingItemRows,
  loadUomRows,
  runSuppliersListRpc,
} from "../../src/lib/catalog/catalog.transport";

const buildPagedQuery = (...pages: unknown[]) => {
  const range = jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(
        pages.length > 1
          ? pages[Math.min(range.mock.calls.length - 1, pages.length - 1)]
          : pages[0],
      ),
    );
  const chain = { eq: jest.fn(), order: jest.fn(), range };
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  const select = jest.fn().mockReturnValue(chain);
  return { select, eq: chain.eq, order: chain.order, range };
};

describe("catalog transport strict-null phase 4", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it("normalizes catalog group rows by preserving valid values and dropping malformed rows", () => {
    expect(
      normalizeCatalogGroupRows([
        { code: "grp-1", name: "Materials", parent_code: null },
        { code: null, name: "Broken", parent_code: "root" },
        { code: "grp-2", name: undefined, parent_code: "root" },
      ]),
    ).toEqual([{ code: "grp-1", name: "Materials", parent_code: null }]);
  });

  it("normalizes uom rows and preserves optional ids only when present", () => {
    expect(
      normalizeUomRows([
        { id: "uom-1", code: "kg", name: "Kilogram" },
        { id: null, code: "pc", name: "Piece" },
        { id: "bad", code: null, name: "Broken" },
      ]),
    ).toEqual([
      { id: "uom-1", code: "kg", name: "Kilogram" },
      { id: undefined, code: "pc", name: "Piece" },
    ]);
  });

  it("normalizes incoming item rows and drops rows with invalid required ids or numbers", () => {
    expect(
      normalizeIncomingItemRows([
        {
          incoming_id: "inc-1",
          incoming_item_id: "item-1",
          purchase_item_id: null,
          code: "MAT-1",
          name: "Cement",
          uom: "bag",
          qty_expected: 10,
          qty_received: 7,
        },
        {
          incoming_id: "inc-1",
          incoming_item_id: null,
          purchase_item_id: "pi-2",
          code: "MAT-2",
          name: "Broken",
          uom: "bag",
          qty_expected: 5,
          qty_received: 5,
        },
        {
          incoming_id: "inc-1",
          incoming_item_id: "item-3",
          purchase_item_id: "pi-3",
          code: "MAT-3",
          name: "Bad qty",
          uom: "bag",
          qty_expected: Number.NaN,
          qty_received: 1,
        },
      ]),
    ).toEqual([
      {
        incoming_id: "inc-1",
        incoming_item_id: "item-1",
        purchase_item_id: null,
        code: "MAT-1",
        name: "Cement",
        uom: "bag",
        qty_expected: 10,
        qty_received: 7,
      },
    ]);
  });

  it("omits nullable suppliers rpc search args but preserves explicit search text", () => {
    expect(normalizeSuppliersListRpcArgs(null)).toEqual({});
    expect(normalizeSuppliersListRpcArgs("cement")).toEqual({ p_search: "cement" });
    expect(normalizeSuppliersListRpcArgs("")).toEqual({ p_search: "" });
  });

  it("wires normalized catalog group rows through the transport boundary", async () => {
    const query = buildPagedQuery(
      {
        data: [
          { code: "grp-1", name: "Materials", parent_code: null },
          { code: null, name: "Broken", parent_code: "root" },
        ],
        error: null,
      },
    );
    mockFrom.mockReturnValue({ select: query.select });

    await expect(loadCatalogGroupsRows()).resolves.toEqual({
      data: [{ code: "grp-1", name: "Materials", parent_code: null }],
      error: null,
    });

    expect(mockFrom).toHaveBeenCalledWith("catalog_groups_clean");
    expect(query.select).toHaveBeenCalledWith("code,name,parent_code");
    expect(query.order).toHaveBeenCalledWith("code", { ascending: true });
    expect(query.range).toHaveBeenCalledWith(0, 99);
  });

  it("wires normalized uom rows through the transport boundary", async () => {
    const query = buildPagedQuery(
      {
        data: [
          { id: "uom-1", code: "kg", name: "Kilogram" },
          { id: null, code: "pc", name: "Piece" },
          { id: "bad", code: null, name: "Broken" },
        ],
        error: null,
      },
    );
    mockFrom.mockReturnValue({ select: query.select });

    await expect(loadUomRows()).resolves.toEqual({
      data: [
        { id: "uom-1", code: "kg", name: "Kilogram" },
        { id: undefined, code: "pc", name: "Piece" },
      ],
      error: null,
    });

    expect(mockFrom).toHaveBeenCalledWith("ref_uoms_clean");
    expect(query.select).toHaveBeenCalledWith("id,code,name");
    expect(query.order).toHaveBeenCalledWith("code", { ascending: true });
    expect(query.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(query.range).toHaveBeenCalledWith(0, 99);
  });

  it("wires normalized incoming item rows through the transport boundary", async () => {
    const query = buildPagedQuery({
      data: [
        {
          incoming_id: "inc-1",
          incoming_item_id: "item-1",
          purchase_item_id: null,
          code: "MAT-1",
          name: "Cement",
          uom: "bag",
          qty_expected: 10,
          qty_received: 7,
        },
        {
          incoming_id: "inc-1",
          incoming_item_id: null,
          purchase_item_id: "pi-2",
          code: "MAT-2",
          name: "Broken",
          uom: "bag",
          qty_expected: 5,
          qty_received: 5,
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue({ select: query.select });

    await expect(loadIncomingItemRows("inc-1")).resolves.toEqual({
      data: [
        {
          incoming_id: "inc-1",
          incoming_item_id: "item-1",
          purchase_item_id: null,
          code: "MAT-1",
          name: "Cement",
          uom: "bag",
          qty_expected: 10,
          qty_received: 7,
        },
      ],
      error: null,
    });

    expect(mockFrom).toHaveBeenCalledWith("wh_incoming_items_clean");
    expect(query.select).toHaveBeenCalledWith(
      "incoming_id,incoming_item_id,purchase_item_id,code,name,uom,qty_expected,qty_received",
    );
    expect(query.eq).toHaveBeenCalledWith("incoming_id", "inc-1");
    expect(query.order).toHaveBeenCalledWith("incoming_item_id", { ascending: true });
    expect(query.range).toHaveBeenCalledWith(0, 99);
  });

  it("omits nullable suppliers rpc args at the transport boundary", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await runSuppliersListRpc(null);
    await runSuppliersListRpc("cement");

    expect(mockRpc).toHaveBeenNthCalledWith(1, "suppliers_list", {});
    expect(mockRpc).toHaveBeenNthCalledWith(2, "suppliers_list", { p_search: "cement" });
  });
});
