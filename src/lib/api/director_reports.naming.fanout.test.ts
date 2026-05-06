import { readFileSync } from "fs";
import { join } from "path";

const mockFrom = jest.fn();
const mockRecordPlatformObservability = jest.fn();

jest.mock("../supabaseClient", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock("../observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) => mockRecordPlatformObservability(...args),
}));

const loadSubject = () => require("./director_reports.naming") as typeof import("./director_reports.naming");

type QueryBuilderMock = {
  select: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
};

describe("director_reports.naming lookup fan-out budget", () => {
  const source = readFileSync(join(__dirname, "director_reports.naming.ts"), "utf8");

  it("keeps chunked naming lookups on the named lookup budget", () => {
    expect(source).toContain("const DIRECTOR_NAMING_LOOKUP_CHUNK_SIZE = 500;");
    expect(source).toContain("const DIRECTOR_NAMING_LOOKUP_CONCURRENCY_LIMIT = 4;");
    expect(source).toContain("const DIRECTOR_NAMING_LOOKUP_PAGE_DEFAULTS = {");
    expect(source).toContain("maxRows: 5000");
    expect(source).toContain("loadPagedRowsWithCeiling<TRow>");

    const chunkedLookupCalls = source.match(/forEachChunkParallel\(/g) ?? [];
    const budgetUsages = source.match(/DIRECTOR_NAMING_LOOKUP_CONCURRENCY_LIMIT/g) ?? [];
    const chunkSizeUsages = source.match(/DIRECTOR_NAMING_LOOKUP_CHUNK_SIZE/g) ?? [];

    expect(chunkedLookupCalls).toHaveLength(3);
    expect(budgetUsages).toHaveLength(chunkedLookupCalls.length + 1);
    expect(chunkSizeUsages).toHaveLength(chunkedLookupCalls.length + 1);
    expect(source).not.toMatch(/forEachChunkParallel\([\s\S]*?\n\s*500,\s*4,/);
  });
});

describe("director_reports.naming material name fan-out", () => {
  beforeEach(() => {
    jest.resetModules();
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    mockFrom.mockReset();
    mockRecordPlatformObservability.mockReset();
  });

  it("pages object lookup rows and fails closed on ceiling overflow", async () => {
    const { fetchObjectsByIds } = loadSubject();
    const rows = Array.from({ length: 5001 }, () => ({
      id: "object-1",
      name: "Object 1",
    }));
    const range = jest.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    }));
    const builder: QueryBuilderMock = {
      select: jest.fn(),
      in: jest.fn(),
      order: jest.fn(),
      range,
    };
    builder.select.mockReturnValue(builder);
    builder.in.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    mockFrom.mockReturnValue(builder);

    await expect(fetchObjectsByIds(["object-1"])).rejects.toThrow(
      "Paged reference read exceeded max row ceiling (5000)",
    );
    expect(builder.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(builder.order).toHaveBeenCalledWith("name", { ascending: true });
    expect(range).toHaveBeenCalledWith(5000, 5000);
  });

  it("caps source fan-out and preserves material name source priority", async () => {
    const code = "A6-MAT-001";
    const { fetchBestMaterialNamesByCode, getMaterialNameResolutionSource } = loadSubject();
    let active = 0;
    let maxActive = 0;
    const calls: { table: string; values: string[] }[] = [];
    const rowsByTable: Record<string, unknown[]> = {
      v_wh_balance_ledger_ui: [{ code, name: "Ledger name" }],
      v_rik_names_ru: [{ code, name_ru: "Rik name" }],
      catalog_name_overrides: [{ code, name_ru: "Override name" }],
    };

    mockFrom.mockImplementation((table: string) => {
      const state: { values: string[] } = { values: [] };
      const builder: QueryBuilderMock = {
        select: jest.fn(),
        in: jest.fn((_field: string, values: string[]) => {
          state.values = [...values];
          return builder;
        }),
        order: jest.fn(),
        range: jest.fn(async (from: number, to: number) => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          calls.push({ table, values: [...state.values] });
          try {
            await new Promise((resolve) => setTimeout(resolve, 5));
            return { data: (rowsByTable[table] ?? []).slice(from, to + 1), error: null };
          } finally {
            active -= 1;
          }
        }),
      };
      builder.select.mockReturnValue(builder);
      builder.order.mockReturnValue(builder);
      return builder;
    });

    const result = await fetchBestMaterialNamesByCode([code]);

    expect(result.get(code)).toBe("Override name");
    expect(getMaterialNameResolutionSource(code)).toBe("catalog_name_overrides");
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(calls.map((call) => call.table)).toEqual([
      "v_wh_balance_ledger_ui",
      "v_rik_names_ru",
      "catalog_name_overrides",
    ]);
    expect(calls.every((call) => call.values.length === 1 && call.values[0] === code)).toBe(true);
  });
});
