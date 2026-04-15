/**
 * directorReports.query.adapter.test.ts
 *
 * Tests for the pure adapter functions that extract structured data
 * from DirectorReportScopeLoadResult.
 */

import {
  adaptOptionsFromScope,
  adaptReportFromScope,
  adaptDisciplineFromScope,
  adaptDirectorReportsScopeQueryData,
} from "./directorReports.query.adapter";
import type { DirectorReportScopeLoadResult } from "./directorReports.query.types";

const createMinimalScopeResult = (
  overrides?: Partial<DirectorReportScopeLoadResult>,
): DirectorReportScopeLoadResult => ({
  optionsKey: "2026-01|2026-02",
  optionsState: { objects: ["Obj1"], objectIdByName: { Obj1: "id-1" } },
  optionsMeta: null,
  optionsFromCache: false,
  key: "2026-01|2026-02|Obj1|id-1",
  objectName: "Obj1",
  report: {
    meta: { from: "2026-01-01", to: "2026-02-28" },
    rows: [{ rik_code: "RC1", uom: "pcs", qty_total: 10, docs_cnt: 2, qty_free: 1, docs_free: 1 }],
  },
  reportMeta: null,
  discipline: null,
  disciplineMeta: null,
  reportFromCache: false,
  disciplineFromCache: false,
  disciplinePricesReady: false,
  ...overrides,
});

describe("adaptOptionsFromScope", () => {
  it("extracts options data correctly", () => {
    const scope = createMinimalScopeResult();
    const result = adaptOptionsFromScope(scope);
    expect(result.key).toBe("2026-01|2026-02");
    expect(result.state.objects).toEqual(["Obj1"]);
    expect(result.state.objectIdByName).toEqual({ Obj1: "id-1" });
    expect(result.meta).toBeNull();
    expect(result.fromCache).toBe(false);
  });

  it("preserves fromCache=true", () => {
    const scope = createMinimalScopeResult({ optionsFromCache: true });
    expect(adaptOptionsFromScope(scope).fromCache).toBe(true);
  });

  it("handles empty objects array", () => {
    const scope = createMinimalScopeResult({
      optionsState: { objects: [], objectIdByName: {} },
    });
    const result = adaptOptionsFromScope(scope);
    expect(result.state.objects).toEqual([]);
    expect(result.state.objectIdByName).toEqual({});
  });
});

describe("adaptReportFromScope", () => {
  it("extracts report data correctly", () => {
    const scope = createMinimalScopeResult();
    const result = adaptReportFromScope(scope);
    expect(result.key).toBe("2026-01|2026-02|Obj1|id-1");
    expect(result.payload?.rows).toHaveLength(1);
    expect(result.meta).toBeNull();
    expect(result.fromCache).toBe(false);
  });

  it("handles null report", () => {
    const scope = createMinimalScopeResult({ report: null });
    const result = adaptReportFromScope(scope);
    expect(result.payload).toBeNull();
  });

  it("preserves fromCache=true", () => {
    const scope = createMinimalScopeResult({ reportFromCache: true });
    expect(adaptReportFromScope(scope).fromCache).toBe(true);
  });
});

describe("adaptDisciplineFromScope", () => {
  it("returns null when discipline is absent", () => {
    const scope = createMinimalScopeResult({ discipline: null });
    expect(adaptDisciplineFromScope(scope)).toBeNull();
  });

  it("extracts discipline data when present", () => {
    const discipline = {
      summary: {
        total_qty: 100,
        total_docs: 10,
        total_positions: 50,
        pct_without_work: 5,
        pct_without_level: 3,
        pct_without_request: 2,
        issue_cost_total: 1000,
        purchase_cost_total: 2000,
        issue_to_purchase_pct: 50,
        unpriced_issue_pct: 10,
      },
      works: [],
    };
    const scope = createMinimalScopeResult({
      discipline,
      disciplinePricesReady: true,
      disciplineFromCache: true,
    });
    const result = adaptDisciplineFromScope(scope);
    expect(result).not.toBeNull();
    expect(result!.payload).toBe(discipline);
    expect(result!.pricesReady).toBe(true);
    expect(result!.fromCache).toBe(true);
    expect(result!.key).toBe(scope.key);
  });

  it("pricesReady defaults to false", () => {
    const scope = createMinimalScopeResult({
      discipline: { summary: {} as never, works: [] },
      disciplinePricesReady: false,
    });
    const result = adaptDisciplineFromScope(scope);
    expect(result!.pricesReady).toBe(false);
  });
});

describe("adaptDirectorReportsScopeQueryData", () => {
  it("preserves the original scope load and adapted slices", () => {
    const discipline = {
      summary: {
        total_qty: 100,
        total_docs: 10,
        total_positions: 50,
        pct_without_work: 5,
        pct_without_level: 3,
        pct_without_request: 2,
        issue_cost_total: 1000,
        purchase_cost_total: 2000,
        issue_to_purchase_pct: 50,
        unpriced_issue_pct: 10,
      },
      works: [],
    };
    const scope = createMinimalScopeResult({
      discipline,
      disciplinePricesReady: true,
      disciplineFromCache: true,
    });

    const result = adaptDirectorReportsScopeQueryData(scope);

    expect(result.scopeLoad).toBe(scope);
    expect(result.options.key).toBe(scope.optionsKey);
    expect(result.report.payload).toBe(scope.report);
    expect(result.discipline?.payload).toBe(discipline);
    expect(result.discipline?.pricesReady).toBe(true);
  });
});
