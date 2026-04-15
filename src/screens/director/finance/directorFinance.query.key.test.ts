import {
  buildDirectorFinanceScopeKey,
  directorFinanceKeys,
  normalizeDirectorFinanceScopeParams,
} from "./directorFinance.query.key";

describe("director finance query keys", () => {
  it("uses an isolated director finance namespace", () => {
    expect(directorFinanceKeys.all).toEqual(["director", "finance"]);
  });

  it("builds deterministic scope keys", () => {
    const params = {
      objectId: "object-1",
      periodFromIso: "2026-01-01",
      periodToIso: "2026-01-31",
      dueDaysDefault: 7,
      criticalDays: 14,
    };
    expect(buildDirectorFinanceScopeKey(params)).toBe(buildDirectorFinanceScopeKey(params));
  });

  it("normalizes null periods and object id to empty key parts", () => {
    expect(
      buildDirectorFinanceScopeKey({
        objectId: null,
        periodFromIso: null,
        periodToIso: undefined,
        dueDaysDefault: 7,
        criticalDays: 14,
      }),
    ).toBe("|||7|14");
  });

  it("slices ISO datetime values to date key parts", () => {
    expect(
      normalizeDirectorFinanceScopeParams({
        objectId: " obj ",
        periodFromIso: "2026-01-01T10:20:30.000Z",
        periodToIso: "2026-01-31T10:20:30.000Z",
        dueDaysDefault: 7,
        criticalDays: 14,
      }),
    ).toEqual({
      objectId: "obj",
      periodFromIso: "2026-01-01",
      periodToIso: "2026-01-31",
      dueDaysDefault: 7,
      criticalDays: 14,
    });
  });

  it("includes period and threshold values in React Query key", () => {
    expect(
      directorFinanceKeys.scope({
        objectId: "object-1",
        periodFromIso: "2026-01-01",
        periodToIso: "2026-01-31",
        dueDaysDefault: 9,
        criticalDays: 18,
      }),
    ).toEqual([
      "director",
      "finance",
      "scope",
      "object-1",
      "2026-01-01",
      "2026-01-31",
      9,
      18,
    ]);
  });

  it("produces different keys for different periods", () => {
    const january = directorFinanceKeys.scope({
      periodFromIso: "2026-01-01",
      periodToIso: "2026-01-31",
      dueDaysDefault: 7,
      criticalDays: 14,
    });
    const february = directorFinanceKeys.scope({
      periodFromIso: "2026-02-01",
      periodToIso: "2026-02-28",
      dueDaysDefault: 7,
      criticalDays: 14,
    });
    expect(january).not.toEqual(february);
  });
});
