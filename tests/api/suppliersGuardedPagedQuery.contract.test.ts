jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {},
}));

import fs from "node:fs";
import path from "node:path";

import {
  createGuardedPagedQuery,
  loadPagedRowsWithCeiling,
  type PagedQueryProvider,
} from "../../src/lib/api/_core";
import {
  isSupplierFileRow,
  isSupplierRow,
} from "../../src/lib/api/suppliers";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const buildProvider = (
  results: { data?: unknown; error?: unknown }[],
): { provider: PagedQueryProvider; ranges: [number, number][] } => {
  const ranges: [number, number][] = [];
  const provider: PagedQueryProvider = {
    range: async (from: number, to: number) => {
      ranges.push([from, to]);
      return results[Math.min(ranges.length - 1, results.length - 1)] ?? {};
    },
  };

  return { provider, ranges };
};

const loadGuardedSupplierRows = (provider: PagedQueryProvider) =>
  loadPagedRowsWithCeiling(
    () =>
      createGuardedPagedQuery(
        provider,
        isSupplierRow,
        "tests/api/suppliersGuardedPagedQuery.suppliers",
      ),
    {
      pageSize: 100,
      maxPageSize: 100,
      maxRows: 5000,
    },
  );

describe("suppliers guarded paged query contract", () => {
  it("keeps supplier reads on guarded paged queries without legacy casts", () => {
    const source = readProjectFile("src/lib/api/suppliers.ts");
    const oldCast = ["as", "unknown", "as", "PagedQuery"].join(" ");

    expect(source).toContain("createGuardedPagedQuery(");
    expect(source).toContain("isSupplierRow");
    expect(source).toContain("isSupplierFileRow");
    expect(source).not.toContain(oldCast);
    expect(source).not.toContain("PagedSupplierQuery");
  });

  it("accepts valid supplier rows with missing optional fields and nulls", async () => {
    const harness = buildProvider([
      {
        data: [
          { id: "supplier-1", name: "Supplier One" },
          { id: "supplier-2", name: "Supplier Two", inn: null, phone: null },
        ],
      },
    ]);

    const result = await loadGuardedSupplierRows(harness.provider);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      { id: "supplier-1", name: "Supplier One" },
      { id: "supplier-2", name: "Supplier Two", inn: null, phone: null },
    ]);
    expect(harness.ranges).toEqual([[0, 99]]);
  });

  it("rejects malformed supplier rows safely", async () => {
    const result = await loadGuardedSupplierRows(
      buildProvider([
        {
          data: [{ id: "supplier-1", name: "Supplier One" }, { id: "bad", name: 42 }],
        },
      ]).provider,
    );

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(String(result.error)).toContain("row 1 failed DTO guard");
  });

  it("preserves provider errors", async () => {
    const providerError = new Error("provider unavailable");
    const result = await loadGuardedSupplierRows(
      buildProvider([{ data: [{ id: "ignored", name: "Ignored" }], error: providerError }]).provider,
    );

    expect(result.data).toBeNull();
    expect(result.error).toBe(providerError);
  });

  it("treats null and undefined paged payloads as empty reads", async () => {
    const nullPayload = await loadGuardedSupplierRows(buildProvider([{ data: null }]).provider);
    const undefinedPayload = await loadGuardedSupplierRows(buildProvider([{}]).provider);

    expect(nullPayload).toEqual({ data: [], error: null });
    expect(undefinedPayload).toEqual({ data: [], error: null });
  });

  it("guards supplier file metadata rows", async () => {
    const query = createGuardedPagedQuery(
      buildProvider([
        {
          data: [
            { id: "file-1", created_at: null, file_name: "a.pdf", file_url: null, group_key: null },
            { id: "file-2", created_at: "2026-05-09", file_name: null, file_url: "https://example.test/f.pdf" },
          ],
        },
      ]).provider,
      isSupplierFileRow,
      "tests/api/suppliersGuardedPagedQuery.supplier_files",
    );

    const result = await query.range(0, 99);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      { id: "file-1", created_at: null, file_name: "a.pdf", file_url: null, group_key: null },
      { id: "file-2", created_at: "2026-05-09", file_name: null, file_url: "https://example.test/f.pdf" },
    ]);
  });
});
