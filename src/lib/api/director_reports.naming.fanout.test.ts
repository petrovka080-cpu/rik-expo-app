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

describe("director_reports.naming lookup fan-out budget", () => {
  const source = readFileSync(join(__dirname, "director_reports.naming.ts"), "utf8");

  it("keeps chunked naming lookups on the named lookup budget", () => {
    expect(source).toContain("const DIRECTOR_NAMING_LOOKUP_CHUNK_SIZE = 500;");
    expect(source).toContain("const DIRECTOR_NAMING_LOOKUP_CONCURRENCY_LIMIT = 4;");

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
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    mockFrom.mockReset();
    mockRecordPlatformObservability.mockReset();
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

    mockFrom.mockImplementation((table: string) => ({
      select: jest.fn(() => ({
        in: jest.fn(async (_field: string, values: string[]) => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          calls.push({ table, values: [...values] });
          try {
            await new Promise((resolve) => setTimeout(resolve, 5));
            return { data: rowsByTable[table] ?? [], error: null };
          } finally {
            active -= 1;
          }
        }),
      })),
    }));

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
