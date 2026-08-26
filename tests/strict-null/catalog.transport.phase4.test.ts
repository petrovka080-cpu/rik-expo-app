const mockCallCatalogTransportBffRead = jest.fn();

jest.mock("../../src/lib/catalog/catalog.bff.client", () => ({
  callCatalogTransportBffRead: (...args: unknown[]) =>
    mockCallCatalogTransportBffRead(...args),
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

const resolveBffRows = (data: unknown) => ({
  status: "ok",
  response: {
    result: { data, error: null },
  },
});

describe("catalog transport strict-null phase 4", () => {
  beforeEach(() => {
    mockCallCatalogTransportBffRead.mockReset();
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

  it("normalizes incoming item rows and drops rows with invalid ids or quantities", () => {
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

  it("keeps the bounded suppliers RPC argument contract", () => {
    expect(normalizeSuppliersListRpcArgs(null)).toEqual({
      p_q: "",
      p_limit: 100,
      p_offset: 0,
    });
    expect(normalizeSuppliersListRpcArgs("cement")).toEqual({
      p_q: "cement",
      p_limit: 100,
      p_offset: 0,
    });
  });

  it("normalizes BFF-owned catalog groups, UOMs, and incoming items", async () => {
    mockCallCatalogTransportBffRead
      .mockResolvedValueOnce(resolveBffRows([
        { code: "grp-1", name: "Materials", parent_code: null },
        { code: null, name: "Broken", parent_code: "root" },
      ]))
      .mockResolvedValueOnce(resolveBffRows([
        { id: "uom-1", code: "kg", name: "Kilogram" },
        { id: null, code: "pc", name: "Piece" },
      ]))
      .mockResolvedValueOnce(resolveBffRows([
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
      ]));

    await expect(loadCatalogGroupsRows()).resolves.toEqual({
      data: [{ code: "grp-1", name: "Materials", parent_code: null }],
      error: null,
    });
    await expect(loadUomRows()).resolves.toEqual({
      data: [
        { id: "uom-1", code: "kg", name: "Kilogram" },
        { id: undefined, code: "pc", name: "Piece" },
      ],
      error: null,
    });
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
  });

  it("passes suppliers RPC input only to the canonical BFF operation", async () => {
    mockCallCatalogTransportBffRead.mockResolvedValue(resolveBffRows([]));

    await runSuppliersListRpc(null);
    await runSuppliersListRpc("cement");

    expect(mockCallCatalogTransportBffRead).toHaveBeenNthCalledWith(1, {
      operation: "catalog.suppliers.rpc",
      args: { searchTerm: null },
    });
    expect(mockCallCatalogTransportBffRead).toHaveBeenNthCalledWith(2, {
      operation: "catalog.suppliers.rpc",
      args: { searchTerm: "cement" },
    });
  });
});
