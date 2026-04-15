/**
 * directorReports.query.key.test.ts
 *
 * Tests for key-builder determinism, uniqueness, and null normalization.
 */

import {
  buildDirectorReportsOptionsKey,
  buildDirectorReportsScopeKey,
  buildDirectorDisciplineKey,
} from "./directorReports.query.key";

describe("buildDirectorReportsOptionsKey", () => {
  it("is deterministic for same params", () => {
    const k1 = buildDirectorReportsOptionsKey("2026-01-01", "2026-01-31");
    const k2 = buildDirectorReportsOptionsKey("2026-01-01", "2026-01-31");
    expect(k1).toBe(k2);
  });

  it("produces unique keys for different periods", () => {
    const k1 = buildDirectorReportsOptionsKey("2026-01-01", "2026-01-31");
    const k2 = buildDirectorReportsOptionsKey("2026-02-01", "2026-02-28");
    expect(k1).not.toBe(k2);
  });

  it("produces expected format", () => {
    expect(buildDirectorReportsOptionsKey("2026-01-01", "2026-01-31")).toBe(
      "2026-01-01|2026-01-31",
    );
  });

  it("handles empty strings", () => {
    const k = buildDirectorReportsOptionsKey("", "");
    expect(k).toBe("|");
  });
});

describe("buildDirectorReportsScopeKey", () => {
  it("is deterministic for same params", () => {
    const map = { Obj1: "id-1" };
    const k1 = buildDirectorReportsScopeKey("2026-01-01", "2026-01-31", "Obj1", map);
    const k2 = buildDirectorReportsScopeKey("2026-01-01", "2026-01-31", "Obj1", map);
    expect(k1).toBe(k2);
  });

  it("includes object name in key", () => {
    const map = { Obj1: "id-1", Obj2: "id-2" };
    const k1 = buildDirectorReportsScopeKey("2026-01-01", "2026-01-31", "Obj1", map);
    const k2 = buildDirectorReportsScopeKey("2026-01-01", "2026-01-31", "Obj2", map);
    expect(k1).not.toBe(k2);
  });

  it("normalizes null objectName to empty string", () => {
    const k = buildDirectorReportsScopeKey("2026-01-01", "2026-01-31", null, {});
    expect(k).toBe("2026-01-01|2026-01-31||");
  });

  it("includes objectId from map", () => {
    const map = { Obj1: "id-aaa" };
    const k = buildDirectorReportsScopeKey("2026-01-01", "2026-01-31", "Obj1", map);
    expect(k).toContain("id-aaa");
  });

  it("handles missing objectId in map gracefully", () => {
    const map = {};
    const k = buildDirectorReportsScopeKey("2026-01-01", "2026-01-31", "Unknown", map);
    expect(k).toBe("2026-01-01|2026-01-31|Unknown|");
  });

  it("handles null objectId in map", () => {
    const map = { Obj1: null };
    const k = buildDirectorReportsScopeKey("2026-01-01", "2026-01-31", "Obj1", map);
    expect(k).toBe("2026-01-01|2026-01-31|Obj1|");
  });
});

describe("buildDirectorDisciplineKey", () => {
  it("is the same function as buildDirectorReportsScopeKey", () => {
    expect(buildDirectorDisciplineKey).toBe(buildDirectorReportsScopeKey);
  });

  it("produces identical keys to scope key", () => {
    const map = { Obj1: "id-1" };
    const scopeKey = buildDirectorReportsScopeKey("2026-01-01", "2026-01-31", "Obj1", map);
    const discKey = buildDirectorDisciplineKey("2026-01-01", "2026-01-31", "Obj1", map);
    expect(scopeKey).toBe(discKey);
  });
});
