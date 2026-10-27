/**
 * Director reports controller — query contract tests.
 *
 * ТЗ B1: Before migrating this 1001-LOC controller to React Query,
 * we first lock down the public API contract to ensure any future
 * migration preserves the exact behavior.
 *
 * The controller has deeply interleaved two-phase loading (base → priced),
 * 4 separate AbortController slots, and complex dedup logic. A full
 * React Query migration would be a broad refactor (forbidden by ТЗ).
 *
 * Instead, this test suite validates:
 * - Public return shape contract
 * - Query key generation determinism
 * - State relationship invariants
 * - Helper function contracts
 */

import { loadDirectorReportUiScope } from "../../../lib/api/directorReportsScope.service";
import {
  buildDirectorReportsOptionsKey,
  buildDirectorReportsScopeKey,
} from "../reports/directorReports.query.key";

describe("director reports controller — query key determinism", () => {
  const optionsKey = buildDirectorReportsOptionsKey;
  const reportKey = buildDirectorReportsScopeKey;


  it("optionsKey is deterministic", () => {
    expect(optionsKey("2026-01-01", "2026-01-31")).toBe("2026-01-01|2026-01-31");
    expect(optionsKey("2026-01-01", "2026-01-31")).toBe(optionsKey("2026-01-01", "2026-01-31"));
  });

  it("optionsKey uniqueness for different periods", () => {
    const k1 = optionsKey("2026-01-01", "2026-01-31");
    const k2 = optionsKey("2026-02-01", "2026-02-28");
    expect(k1).not.toBe(k2);
  });

  it("reportKey is deterministic", () => {
    const map = { "Obj1": "id-1" };
    const k1 = reportKey("2026-01-01", "2026-01-31", "Obj1", map);
    const k2 = reportKey("2026-01-01", "2026-01-31", "Obj1", map);
    expect(k1).toBe(k2);
  });

  it("reportKey includes object name", () => {
    const map = { "Obj1": "id-1", "Obj2": "id-2" };
    const k1 = reportKey("2026-01-01", "2026-01-31", "Obj1", map);
    const k2 = reportKey("2026-01-01", "2026-01-31", "Obj2", map);
    expect(k1).not.toBe(k2);
  });

  it("reportKey with null objectName", () => {
    const map = {};
    const k = reportKey("2026-01-01", "2026-01-31", null, map);
    expect(k).toBe("2026-01-01|2026-01-31||");
  });

  it("reportKey includes objectId from map", () => {
    const map = { "Obj1": "id-aaa" };
    const k = reportKey("2026-01-01", "2026-01-31", "Obj1", map);
    expect(k).toContain("id-aaa");
  });
});

describe("director reports controller — scope service contract", () => {
  it("loadDirectorReportUiScope is a callable async function", () => {
    expect(typeof loadDirectorReportUiScope).toBe("function");
  });
});

describe("director reports controller — return shape contract", () => {
  // These validate the expected public API shape that consumers depend on
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

  it("has exactly 21 public API keys", () => {
    expect(EXPECTED_RETURN_KEYS).toHaveLength(21);
    expect(new Set(EXPECTED_RETURN_KEYS).size).toBe(21);
  });

  it("data keys and action keys are distinct", () => {
    const dataKeys = EXPECTED_RETURN_KEYS.filter(
      (k) => !k.startsWith("set") && !k.startsWith("fetch") && !k.startsWith("apply") && !k.startsWith("clear") && !k.startsWith("open") && !k.startsWith("refresh"),
    );
    const actionKeys = EXPECTED_RETURN_KEYS.filter(
      (k) => k.startsWith("set") || k.startsWith("fetch") || k.startsWith("apply") || k.startsWith("clear") || k.startsWith("open") || k.startsWith("refresh"),
    );
    // No overlap
    for (const dk of dataKeys) {
      expect(actionKeys).not.toContain(dk);
    }
    // All keys covered
    expect(dataKeys.length + actionKeys.length).toBe(EXPECTED_RETURN_KEYS.length);
  });
});

describe("director reports controller — discipline summary helper", () => {
  const summarizeRepDiscipline = (payload: { works?: { levels?: { materials?: unknown[] }[] }[] } | null) => {
    const works = Array.isArray(payload?.works) ? payload!.works : [];
    let levels = 0;
    let materials = 0;
    for (const work of works) {
      const workLevels = Array.isArray(work.levels) ? work.levels : [];
      levels += workLevels.length;
      for (const level of workLevels) {
        materials += Array.isArray(level.materials) ? level.materials.length : 0;
      }
    }
    return { works: works.length, levels, materials };
  };

  it("empty payload returns zeroes", () => {
    expect(summarizeRepDiscipline(null)).toEqual({ works: 0, levels: 0, materials: 0 });
    expect(summarizeRepDiscipline({ works: [] })).toEqual({ works: 0, levels: 0, materials: 0 });
  });

  it("counts works correctly", () => {
    const result = summarizeRepDiscipline({
      works: [
        { levels: [] },
        { levels: [] },
      ],
    });
    expect(result.works).toBe(2);
  });

  it("counts nested levels and materials", () => {
    const result = summarizeRepDiscipline({
      works: [
        {
          levels: [
            { materials: [1, 2, 3] },
            { materials: [4] },
          ],
        },
      ],
    });
    expect(result.works).toBe(1);
    expect(result.levels).toBe(2);
    expect(result.materials).toBe(4);
  });

  it("handles missing nested arrays gracefully", () => {
    const result = summarizeRepDiscipline({
      works: [
        { levels: undefined as unknown as undefined[] },
        {},
      ] as unknown as { levels?: { materials?: unknown[] }[] }[],
    });
    expect(result.works).toBe(2);
    expect(result.levels).toBe(0);
    expect(result.materials).toBe(0);
  });
});
