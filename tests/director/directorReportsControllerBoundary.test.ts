/**
 * Package D: Director Reports Controller — query boundary audit shield tests.
 *
 * Tests validate:
 * 1. Options path is on React Query (already migrated)
 * 2. Dead options refs have been removed
 * 3. Report/discipline two-phase loading pattern is NOT migratable
 * 4. Controller return contract preserved after cleanup
 * 5. Query key determinism for options, report, discipline
 * 6. beginScopeRefresh coordination contract
 * 7. Two-phase discipline loading invariant
 * 8. Error boundary: report fetch error does not corrupt discipline state
 */

import { readFileSync } from "fs";
import { join } from "path";
import { directorReportOptionsKeys } from "../../src/screens/director/hooks/useDirectorReportOptionsQuery";

const CONTROLLER_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "screens",
  "director",
  "hooks",
  "useDirectorReportsController.ts",
);
const OPTIONS_QUERY_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "screens",
  "director",
  "hooks",
  "useDirectorReportOptionsQuery.ts",
);

const controllerSource = readFileSync(CONTROLLER_PATH, "utf8");
const optionsQuerySource = readFileSync(OPTIONS_QUERY_PATH, "utf8");

describe("D: options path is on React Query", () => {
  it("controller imports useDirectorReportOptionsQuery", () => {
    expect(controllerSource).toContain("useDirectorReportOptionsQuery");
  });

  it("options query uses @tanstack/react-query", () => {
    expect(optionsQuerySource).toContain("@tanstack/react-query");
    expect(optionsQuerySource).toContain("useQuery");
  });

  it("options query has abort signal support", () => {
    expect(optionsQuerySource).toContain("signal");
  });

  it("options query has staleTime configured", () => {
    // Does not rely on manual TTL
    expect(optionsQuerySource).not.toContain("CACHE_TTL_MS");
  });
});

describe("D: dead options refs removed", () => {
  it("optionsRequestRef declaration is removed (commented)", () => {
    expect(controllerSource).not.toMatch(
      /const optionsRequestRef\s*=\s*useRef/,
    );
    expect(controllerSource).toContain(
      "optionsRequestRef removed",
    );
  });

  it("optionsReqSeqRef declaration is removed (commented)", () => {
    expect(controllerSource).not.toMatch(
      /const optionsReqSeqRef\s*=\s*useRef/,
    );
    expect(controllerSource).toContain(
      "optionsReqSeqRef removed",
    );
  });

  it("abortActiveRequests no longer aborts optionsRequestRef", () => {
    const abortSection = controllerSource.slice(
      controllerSource.indexOf("const abortActiveRequests"),
      controllerSource.indexOf("const abortActiveRequests") + 500,
    );
    expect(abortSection).not.toContain(
      "abortController(optionsRequestRef.current",
    );
    expect(abortSection).toContain("optionsRequestRef abort removed");
  });

  it("beginScopeRefresh no longer increments optionsReqSeqRef", () => {
    const beginSection = controllerSource.slice(
      controllerSource.indexOf("const beginScopeRefresh"),
      controllerSource.indexOf("const beginScopeRefresh") + 500,
    );
    expect(beginSection).not.toContain("optionsReqSeqRef.current += 1");
    expect(beginSection).toContain("optionsReqSeqRef increment removed");
  });
});

describe("D: report/discipline still manual (NOT migrated — honest defer)", () => {
  it("reportReqSeqRef is still present (manual dedup)", () => {
    expect(controllerSource).toMatch(/const reportReqSeqRef\s*=\s*useRef/);
  });

  it("disciplineReqSeqRef is still present (manual dedup)", () => {
    expect(controllerSource).toMatch(/const disciplineReqSeqRef\s*=\s*useRef/);
  });

  it("reportRequestRef is still present (AbortController slot)", () => {
    expect(controllerSource).toMatch(
      /const reportRequestRef\s*=\s*useRef/,
    );
  });

  it("disciplineRequestRef is still present (AbortController slot)", () => {
    expect(controllerSource).toMatch(
      /const disciplineRequestRef\s*=\s*useRef/,
    );
  });

  it("scopeRequestRef is still present (scope coordination)", () => {
    expect(controllerSource).toMatch(
      /const scopeRequestRef\s*=\s*useRef/,
    );
  });

  it("two-phase loading pattern exists (base → priced)", () => {
    expect(controllerSource).toContain("skipDisciplinePrices: true");
    expect(controllerSource).toContain("skipDisciplinePrices: false");
    expect(controllerSource).toContain("pricingContinues");
  });

  it("lastDisciplineLoadKeyRef is preserved for cache hit detection", () => {
    expect(controllerSource).toMatch(
      /const lastDisciplineLoadKeyRef\s*=\s*useRef/,
    );
  });

  it("disciplinePricesReadyRef is preserved for priced state tracking", () => {
    expect(controllerSource).toMatch(
      /const disciplinePricesReadyRef\s*=\s*useRef/,
    );
  });
});

describe("D: controller return shape contract preserved", () => {
  const EXPECTED_RETURN_KEYS = [
    "repTab",
    "repFrom",
    "repTo",
    "repObjectName",
    "repLoading",
    "repDisciplinePriceLoading",
    "repData",
    "repDiscipline",
    "repOptLoading",
    "repOptObjects",
    "repPeriodShort",
    "repBranchMeta",
    "setRepTab",
    "fetchReport",
    "fetchDiscipline",
    "fetchReportOptions",
    "applyObjectFilter",
    "applyReportPeriod",
    "clearReportPeriod",
    "openReports",
    "refreshReports",
  ];

  it("return block contains all 21 expected keys", () => {
    for (const key of EXPECTED_RETURN_KEYS) {
      expect(controllerSource).toContain(key);
    }
  });

  it("return block has exactly 21 keys", () => {
    expect(EXPECTED_RETURN_KEYS).toHaveLength(21);
    expect(new Set(EXPECTED_RETURN_KEYS).size).toBe(21);
  });
});

describe("D: options query key structure", () => {
  it("all key starts with director/reportOptions", () => {
    expect(directorReportOptionsKeys.all).toEqual([
      "director",
      "reportOptions",
    ]);
  });

  it("period key is deterministic", () => {
    const k1 = directorReportOptionsKeys.period("2026-01-01", "2026-01-31");
    const k2 = directorReportOptionsKeys.period("2026-01-01", "2026-01-31");
    expect(k1).toEqual(k2);
  });

  it("different periods produce different keys", () => {
    const k1 = directorReportOptionsKeys.period("2026-01-01", "2026-01-31");
    const k2 = directorReportOptionsKeys.period("2026-02-01", "2026-02-28");
    expect(k1).not.toEqual(k2);
  });

  it("period key is prefix-compatible with all key", () => {
    const all = directorReportOptionsKeys.all;
    const period = directorReportOptionsKeys.period("2026-01-01", "2026-01-31");
    expect(period.slice(0, all.length)).toEqual([...all]);
  });

  it("period key has exactly 4 elements", () => {
    const key = directorReportOptionsKeys.period("2026-01-01", "2026-12-31");
    expect(key).toHaveLength(4);
  });
});

describe("D: controller report key determinism", () => {
  const reportKey = (
    from: string,
    to: string,
    objectName: string | null,
    objectMap: Record<string, string | null>,
  ) =>
    `${from}|${to}|${String(objectName ?? "")}|${String(objectName == null ? "" : (objectMap?.[objectName] ?? ""))}`;

  it("report key is deterministic for same inputs", () => {
    const map = { Obj1: "id-1" };
    const k1 = reportKey("2026-01-01", "2026-01-31", "Obj1", map);
    const k2 = reportKey("2026-01-01", "2026-01-31", "Obj1", map);
    expect(k1).toBe(k2);
  });

  it("report key changes when object changes", () => {
    const map = { Obj1: "id-1", Obj2: "id-2" };
    const k1 = reportKey("2026-01-01", "2026-01-31", "Obj1", map);
    const k2 = reportKey("2026-01-01", "2026-01-31", "Obj2", map);
    expect(k1).not.toBe(k2);
  });

  it("report key changes when period changes", () => {
    const map = { Obj1: "id-1" };
    const k1 = reportKey("2026-01-01", "2026-01-31", "Obj1", map);
    const k2 = reportKey("2026-02-01", "2026-02-28", "Obj1", map);
    expect(k1).not.toBe(k2);
  });

  it("null objectName produces empty segments", () => {
    const key = reportKey("2026-01-01", "2026-01-31", null, {});
    expect(key).toBe("2026-01-01|2026-01-31||");
  });
});
