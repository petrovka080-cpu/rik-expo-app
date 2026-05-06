import { readFileSync } from "fs";
import { join } from "path";

jest.mock("../../src/lib/supabaseClient", () => ({ supabase: {} }));

import { loadPagedRowsWithCeiling, type PagedQuery } from "../../src/lib/api/_core";

const repoFile = (...parts: string[]) => join(__dirname, "..", "..", ...parts);

const buildPagedRows = <T,>(rows: T[]) => {
  const ranges: [number, number][] = [];
  const queryFactory = (): PagedQuery<T> => ({
    range: async (from: number, to: number) => {
      ranges.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    },
  });
  return { queryFactory, ranges };
};

describe("dictionary/reference read pagination", () => {
  it("pages through complete finite reference sets without dropping rows", async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({ id: `row-${index + 1}` }));
    const harness = buildPagedRows(rows);

    const result = await loadPagedRowsWithCeiling(harness.queryFactory, {
      pageSize: 100,
      maxPageSize: 100,
      maxRows: 5000,
    });

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(101);
    expect(result.data?.at(-1)).toEqual({ id: "row-101" });
    expect(harness.ranges).toEqual([
      [0, 99],
      [100, 199],
    ]);
  });

  it("fails closed instead of truncating when a finite reference set exceeds its ceiling", async () => {
    const harness = buildPagedRows([{ id: "row-1" }, { id: "row-2" }, { id: "row-3" }]);

    const result = await loadPagedRowsWithCeiling(harness.queryFactory, {
      pageSize: 2,
      maxPageSize: 2,
      maxRows: 2,
    });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(String((result.error as Error).message)).toContain("max row ceiling (2)");
    expect(harness.ranges).toEqual([
      [0, 1],
      [2, 2],
    ]);
  });

  it("keeps S-PAG-15 dictionary/reference readers on page-through-all with explicit ceilings", () => {
    const expectations = [
      {
        path: repoFile("src", "lib", "api", "proposals.ts"),
        tokens: [
          "PROPOSAL_REFERENCE_PAGE_DEFAULTS",
          "maxRows: 5000",
          "loadPagedRowsWithCeiling<ProposalSnapshotItemRow>",
          "loadPagedRowsWithCeiling<ProposalItemViewRow>",
          "loadPagedRowsWithCeiling<ProposalItemTableRow>",
        ],
      },
      {
        path: repoFile("src", "lib", "api", "requestCanonical.read.ts"),
        tokens: [
          "CANONICAL_REQUEST_REFERENCE_PAGE_DEFAULTS",
          "maxRows: 5000",
          "loadPagedRowsWithCeiling<UnknownRow>",
        ],
      },
      {
        path: repoFile("src", "lib", "catalog", "catalog.request.transport.ts"),
        tokens: [
          "CATALOG_REQUEST_REFERENCE_PAGE_DEFAULTS",
          "maxRows: 5000",
          "loadPagedRowsWithCeiling<Record<string, unknown>>",
        ],
      },
      {
        path: repoFile("src", "screens", "warehouse", "warehouse.stockReports.service.ts"),
        tokens: [
          "WAREHOUSE_STOCK_REFERENCE_PAGE_DEFAULTS",
          "maxRows: 5000",
          "loadPagedRowsWithCeiling<UnknownRow>",
        ],
        absent: ["codes.slice(0, 5000)"],
      },
    ];

    for (const expectation of expectations) {
      const source = readFileSync(expectation.path, "utf8");
      for (const token of expectation.tokens) {
        expect(source).toContain(token);
      }
      for (const token of expectation.absent ?? []) {
        expect(source).not.toContain(token);
      }
    }
  });
});
