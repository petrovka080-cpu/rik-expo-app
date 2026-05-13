const mockFrom = jest.fn();
const mockCallCatalogTransportBffRead = jest.fn();

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock("../../src/lib/catalog/catalog.bff.client", () => ({
  callCatalogTransportBffRead: (...args: unknown[]) =>
    mockCallCatalogTransportBffRead(...args),
}));

import fs from "fs";
import path from "path";

import {
  loadCatalogItemsSearchPreviewRows,
  loadCatalogSearchFallbackRows,
  loadIncomingItemRows,
  loadRikQuickSearchFallbackRows,
} from "../../src/lib/catalog/catalog.transport";

const makeIncomingRow = (index: number) => ({
  incoming_id: "incoming-1",
  incoming_item_id: `incoming-item-${String(index).padStart(4, "0")}`,
  purchase_item_id: null,
  code: `code-${index}`,
  name: `name-${index}`,
  uom: "pc",
  qty_expected: 1,
  qty_received: 0,
});

const buildRikItemsQuery = (resolvedValue: unknown) => {
  const chain = {
    eq: jest.fn(),
    or: jest.fn(),
    order: jest.fn(),
    range: jest.fn().mockResolvedValue(resolvedValue),
  };
  chain.eq.mockReturnValue(chain);
  chain.or.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  const select = jest.fn().mockReturnValue(chain);
  return { select, chain };
};

const buildIncomingPagedQuery = (
  rangeImpl: (from: number, to: number) => Promise<unknown>,
) => {
  const chain = {
    eq: jest.fn(),
    order: jest.fn(),
    range: jest.fn(rangeImpl),
  };
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  const select = jest.fn().mockReturnValue(chain);
  return { select, chain };
};

const getFunctionSource = (functionName: string) => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/lib/catalog/catalog.transport.supabase.ts"),
    "utf8",
  );
  const start = source.indexOf(`export const ${functionName}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\nexport const ", start + 1);
  return source.slice(start, next === -1 ? undefined : next);
};

describe("catalog transport bounded rik_items and child list reads", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockCallCatalogTransportBffRead
      .mockReset()
      .mockResolvedValue({ status: "unavailable", reason: "BFF_CONTRACT_ONLY" });
  });

  it("bounds catalog rik_items fallback search as a deterministic preview page", async () => {
    const query = buildRikItemsQuery({ data: [], error: null });
    mockFrom.mockReturnValue({ select: query.select });

    await expect(loadCatalogSearchFallbackRows("cement", [], 500)).resolves.toEqual({
      data: [],
      error: null,
    });

    expect(mockFrom).toHaveBeenCalledWith("rik_items");
    expect(query.select).toHaveBeenCalledWith(
      "rik_code,name_human,uom_code,sector_code,spec,kind,group_code",
    );
    expect(query.chain.or).toHaveBeenCalledWith("name_human.ilike.%cement%,rik_code.ilike.%cement%");
    expect(query.chain.order).toHaveBeenNthCalledWith(1, "rik_code", { ascending: true });
    expect(query.chain.order).toHaveBeenNthCalledWith(2, "name_human", { ascending: true });
    expect(query.chain.order).toHaveBeenNthCalledWith(3, "id", { ascending: true });
    expect(query.chain.range).toHaveBeenCalledWith(0, 99);
  });

  it("bounds quick rik_items fallback token search to the same preview ceiling", async () => {
    const query = buildRikItemsQuery({ data: [], error: null });
    mockFrom.mockReturnValue({ select: query.select });

    await loadRikQuickSearchFallbackRows("ignored", ["cement", "bolt"], 250);

    expect(mockFrom).toHaveBeenCalledWith("rik_items");
    expect(query.select).toHaveBeenCalledWith("rik_code,name_human,uom_code,kind,name_human_ru");
    expect(query.chain.or).toHaveBeenCalledWith(
      "name_human.ilike.%cement%,rik_code.ilike.%cement%,name_human.ilike.%bolt%,rik_code.ilike.%bolt%",
    );
    expect(query.chain.order).toHaveBeenNthCalledWith(1, "rik_code", { ascending: true });
    expect(query.chain.order).toHaveBeenNthCalledWith(2, "name_human", { ascending: true });
    expect(query.chain.order).toHaveBeenNthCalledWith(3, "id", { ascending: true });
    expect(query.chain.range).toHaveBeenCalledWith(0, 99);
  });

  it("bounds catalog_items modal search as a deterministic preview page", async () => {
    const query = buildRikItemsQuery({ data: [], error: null });
    mockFrom.mockReturnValue({ select: query.select });

    await expect(loadCatalogItemsSearchPreviewRows("cement", "material", 250)).resolves.toEqual({
      data: [],
      error: null,
    });

    expect(mockFrom).toHaveBeenCalledWith("catalog_items");
    expect(query.select).toHaveBeenCalledWith("id,rik_code,kind,name_human,uom_code,tags,sector_code");
    expect(query.chain.or).toHaveBeenCalledWith(
      "search_blob.ilike.%cement%,name_search.ilike.%cement%,name_human.ilike.%cement%,rik_code.ilike.%cement%",
    );
    expect(query.chain.eq).toHaveBeenCalledWith("kind", "material");
    expect(query.chain.order).toHaveBeenNthCalledWith(1, "rik_code", { ascending: true });
    expect(query.chain.order).toHaveBeenNthCalledWith(2, "id", { ascending: true });
    expect(query.chain.range).toHaveBeenCalledWith(0, 99);
  });


  it("loads incoming child items through paged ranges instead of an uncapped scoped select", async () => {
    const query = buildIncomingPagedQuery(async () => ({
      data: [makeIncomingRow(1)],
      error: null,
    }));
    mockFrom.mockReturnValue({ select: query.select });

    await expect(loadIncomingItemRows("incoming-1")).resolves.toEqual({
      data: [makeIncomingRow(1)],
      error: null,
    });

    expect(mockFrom).toHaveBeenCalledWith("wh_incoming_items_clean");
    expect(query.select).toHaveBeenCalledWith(
      "incoming_id,incoming_item_id,purchase_item_id,code,name,uom,qty_expected,qty_received",
    );
    expect(query.chain.eq).toHaveBeenCalledWith("incoming_id", "incoming-1");
    expect(query.chain.order).toHaveBeenCalledWith("incoming_item_id", { ascending: true });
    expect(query.chain.range).toHaveBeenCalledWith(0, 99);
  });

  it("fails closed when incoming child items exceed the shared catalog maxRows ceiling", async () => {
    const query = buildIncomingPagedQuery(async (from, to) => ({
      data:
        from >= 5000
          ? [makeIncomingRow(from)]
          : Array.from({ length: to - from + 1 }, (_, offset) => makeIncomingRow(from + offset)),
      error: null,
    }));
    mockFrom.mockReturnValue({ select: query.select });

    const result = await loadIncomingItemRows("incoming-1");

    expect(result.data).toBeNull();
    expect(result.error?.message).toContain("max row ceiling");
    expect(query.chain.range).toHaveBeenCalledWith(5000, 5000);
  });

  it("keeps changed catalog transport reads guarded by range or paged ceiling helpers", () => {
    expect(getFunctionSource("loadCatalogSearchFallbackRowsFromSupabase")).toContain(".range(");
    expect(getFunctionSource("loadCatalogSearchFallbackRowsFromSupabase")).toContain('.order("id"');
    expect(getFunctionSource("loadRikQuickSearchFallbackRowsFromSupabase")).toContain(".range(");
    expect(getFunctionSource("loadRikQuickSearchFallbackRowsFromSupabase")).toContain('.order("id"');
    expect(getFunctionSource("loadCatalogItemsSearchPreviewRowsFromSupabase")).toContain(".range(");
    expect(getFunctionSource("loadCatalogItemsSearchPreviewRowsFromSupabase")).toContain('.order("id"');
    expect(getFunctionSource("loadIncomingItemRowsFromSupabase")).toContain("loadPagedCatalogRows");
  });
});
