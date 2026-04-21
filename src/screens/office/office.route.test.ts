import {
  OFFICE_EXACT_PATH,
  OFFICE_SAFE_BACK_ROUTE,
  resolveOfficeRouteScopePlan,
  resolveSafeOfficeChildRoute,
} from "./office.route";

describe("office.route", () => {
  it("keeps /office as the exact office shell destination", () => {
    expect(OFFICE_EXACT_PATH).toBe("/office");
    expect(OFFICE_SAFE_BACK_ROUTE).toBe("/office");
  });

  it("activates the office route scope only on the exact office path", () => {
    expect(resolveOfficeRouteScopePlan("/office")).toEqual({
      isActive: true,
      skipReason: null,
    });
    expect(resolveOfficeRouteScopePlan("/office/warehouse")).toEqual({
      isActive: false,
      skipReason: "non_exact_path:/office/warehouse",
    });
  });

  it("classifies missing pathname as unavailable instead of activating office scope", () => {
    expect(resolveOfficeRouteScopePlan(null)).toEqual({
      isActive: false,
      skipReason: "pathname_unavailable",
    });
    expect(resolveOfficeRouteScopePlan(undefined)).toEqual({
      isActive: false,
      skipReason: "pathname_unavailable",
    });
  });

  it("resolves only the exact child routes that use safe office back handling", () => {
    expect(resolveSafeOfficeChildRoute("/office/foreman")).toBe(
      "/office/foreman",
    );
    expect(resolveSafeOfficeChildRoute("/office/warehouse")).toBe(
      "/office/warehouse",
    );
    expect(resolveSafeOfficeChildRoute("/office/buyer")).toBeNull();
    expect(resolveSafeOfficeChildRoute("/market")).toBeNull();
  });
});
