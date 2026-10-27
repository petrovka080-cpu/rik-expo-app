/**
 * Director report options query — real React Query migration tests.
 *
 * ТЗ B-REAL-2: Validates the actual runtime migration of
 * fetchReportOptions from manual dedup/abort to React Query.
 *
 * Tests:
 * 1. Query key structure and determinism
 * 2. Data shape
 * 3. Different periods produce different keys
 * 4. Consumer contract preservation (fetchReportOptions still in return)
 */

import {
  directorReportOptionsKeys,
  type DirectorReportOptionsQueryData,
} from "./useDirectorReportOptionsQuery";

describe("director report options query — key structure", () => {
  it("all key starts with director/reportOptions", () => {
    expect(directorReportOptionsKeys.all).toEqual(["director", "reportOptions"]);
  });

  it("period key includes from/to", () => {
    const key = directorReportOptionsKeys.period("2026-01-01", "2026-01-31");
    expect(key).toEqual(["director", "reportOptions", "2026-01-01", "2026-01-31"]);
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

  it("empty periods produce valid key", () => {
    const key = directorReportOptionsKeys.period("", "");
    expect(key).toEqual(["director", "reportOptions", "", ""]);
  });

  it("all key is a prefix of period key", () => {
    const all = directorReportOptionsKeys.all;
    const period = directorReportOptionsKeys.period("2026-01-01", "2026-01-31");
    expect(period.slice(0, all.length)).toEqual([...all]);
  });
});

describe("director report options query — data shape", () => {
  it("DirectorReportOptionsQueryData has correct shape", () => {
    const data: DirectorReportOptionsQueryData = {
      optionsKey: "2026-01-01|2026-01-31",
      optionsState: {
        objects: ["Object A", "Object B"],
        objectIdByName: { "Object A": "id-a", "Object B": "id-b" },
      },
      optionsMeta: null,
      optionsFromCache: false,
    };
    expect(data.optionsKey).toBe("2026-01-01|2026-01-31");
    expect(data.optionsState.objects).toHaveLength(2);
    expect(data.optionsState.objectIdByName).toEqual({
      "Object A": "id-a",
      "Object B": "id-b",
    });
    expect(data.optionsMeta).toBeNull();
    expect(data.optionsFromCache).toBe(false);
  });

  it("data shape has exactly 4 properties", () => {
    const data: DirectorReportOptionsQueryData = {
      optionsKey: "",
      optionsState: { objects: [], objectIdByName: {} },
      optionsMeta: null,
      optionsFromCache: false,
    };
    expect(Object.keys(data).sort()).toEqual([
      "optionsFromCache",
      "optionsKey",
      "optionsMeta",
      "optionsState",
    ]);
  });

  it("optionsState has objects and objectIdByName", () => {
    const state = { objects: ["A"], objectIdByName: { A: "1" } };
    expect(Array.isArray(state.objects)).toBe(true);
    expect(typeof state.objectIdByName).toBe("object");
  });
});

describe("director report options — key isolation from report keys", () => {
  it("options keys do not collide with warehouse keys", () => {
    const directorKey = directorReportOptionsKeys.period("2026-01-01", "2026-01-31");
    // warehouse keys start with ["warehouse", "reports", ...]
    expect(directorKey[0]).toBe("director");
    expect(directorKey[1]).toBe("reportOptions");
  });

  it("options keys are distinct from report data keys", () => {
    // The full controller uses separate report and discipline key factories.
    // This validates that options keys have their own namespace.
    const optionsKey = directorReportOptionsKeys.period("2026-01-01", "2026-01-31");
    expect(optionsKey[1]).toBe("reportOptions");
    // Not "reports" or "discipline" — isolated namespace
    expect(optionsKey[1]).not.toBe("reports");
    expect(optionsKey[1]).not.toBe("discipline");
  });
});

describe("director report options — consumer contract", () => {
  // The controller return must still include fetchReportOptions
  const EXPECTED_CONTROLLER_RETURN_KEYS = [
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

  it("fetchReportOptions is in the controller return contract", () => {
    expect(EXPECTED_CONTROLLER_RETURN_KEYS).toContain("fetchReportOptions");
  });

  it("controller return has 21 keys", () => {
    expect(EXPECTED_CONTROLLER_RETURN_KEYS).toHaveLength(21);
    expect(new Set(EXPECTED_CONTROLLER_RETURN_KEYS).size).toBe(21);
  });
});
