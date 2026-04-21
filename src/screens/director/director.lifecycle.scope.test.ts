import {
  DIRECTOR_TAB_FINANCE,
  DIRECTOR_TAB_REPORTS,
  DIRECTOR_TAB_REQUESTS,
  buildDirectorFinanceScopeKey,
  buildDirectorPeriodKey,
  buildDirectorPropsScopeKey,
  buildDirectorReportsScopeKey,
  buildDirectorRowsScopeKey,
  buildDirectorVisibleScopeKey,
  buildRequestsScopeKey,
  resolveDirectorVisibleRefreshPlan,
  shouldRefreshDirectorPropsForProposalChange,
  shouldRefreshDirectorRowsForItemChange,
  shouldRefreshDirectorRowsForRequestChange,
} from "./director.lifecycle.scope";

describe("director lifecycle scope helpers", () => {
  it("builds stable scope keys for requests, finance, reports, and period identity", () => {
    expect(buildRequestsScopeKey("foreman")).toBe(`${DIRECTOR_TAB_REQUESTS}:foreman`);
    expect(buildDirectorRowsScopeKey("foreman")).toBe("requests:foreman:rows");
    expect(buildDirectorPropsScopeKey("buyer")).toBe("requests:buyer:buyer_props");
    expect(buildDirectorFinanceScopeKey("2026-01-01", "2026-01-31")).toBe("finance:2026-01-01:2026-01-31");
    expect(buildDirectorReportsScopeKey("2026-02-01", "2026-02-29")).toBe("reports:2026-02-01:2026-02-29");
    expect(
      buildDirectorPeriodKey({
        finFrom: "2026-01-01",
        finTo: "2026-01-31",
        repFrom: "2026-02-01",
        repTo: "2026-02-29",
      }),
    ).toBe("2026-01-01-2026-01-31-2026-02-01-2026-02-29");
  });

  it("normalizes the visible scope key around the active director tab", () => {
    expect(buildDirectorVisibleScopeKey({ dirTab: DIRECTOR_TAB_REQUESTS, requestTab: "buyer" })).toBe(
      `${DIRECTOR_TAB_REQUESTS}:buyer`,
    );
    expect(buildDirectorVisibleScopeKey({ dirTab: DIRECTOR_TAB_FINANCE, requestTab: "buyer" })).toBe(
      DIRECTOR_TAB_FINANCE,
    );
  });

  it("resolves refresh plans for buyer requests, foreman requests, finance, and reports", () => {
    expect(resolveDirectorVisibleRefreshPlan({ dirTab: DIRECTOR_TAB_REQUESTS, requestTab: "buyer" }, "screen_init", true)).toEqual({
      kind: "request_props",
      reason: "screen_init:requests:buyer",
      force: true,
    });
    expect(resolveDirectorVisibleRefreshPlan({ dirTab: DIRECTOR_TAB_REQUESTS, requestTab: "foreman" }, "screen_init")).toEqual({
      kind: "request_rows",
      reason: "screen_init:requests:foreman",
      force: false,
    });
    expect(resolveDirectorVisibleRefreshPlan({ dirTab: DIRECTOR_TAB_FINANCE, requestTab: "buyer" }, "resume")).toEqual({
      kind: "finance",
      reason: "resume:finance",
    });
    expect(resolveDirectorVisibleRefreshPlan({ dirTab: DIRECTOR_TAB_REPORTS, requestTab: "buyer" }, "resume")).toEqual({
      kind: "reports",
      reason: "resume:reports",
    });
  });

  it("refreshes request rows only for meaningful request changes", () => {
    expect(
      shouldRefreshDirectorRowsForRequestChange({
        new: { status: "pending", submitted_at: null },
        old: { status: "new", submitted_at: null },
      }),
    ).toBe(true);
    expect(
      shouldRefreshDirectorRowsForRequestChange({
        new: { status: "draft", submitted_at: "" },
        old: { status: "draft", submitted_at: "" },
      }),
    ).toBe(false);
  });

  it("refreshes request rows only for tracked request item status changes", () => {
    expect(
      shouldRefreshDirectorRowsForItemChange({
        new: { status: "\u0423 \u0434\u0438\u0440\u0435\u043a\u0442\u043e\u0440\u0430" },
        old: { status: "draft" },
      }),
    ).toBe(true);
    expect(
      shouldRefreshDirectorRowsForItemChange({
        new: { status: "draft" },
        old: { status: "draft" },
      }),
    ).toBe(false);
  });

  it("refreshes proposal heads only when visibility or submission changed", () => {
    expect(
      shouldRefreshDirectorPropsForProposalChange({
        new: { status: "sent", submitted_at: "2026-03-01T10:00:00.000Z" },
        old: { status: "draft", submitted_at: null },
      }),
    ).toBe(true);
    expect(
      shouldRefreshDirectorPropsForProposalChange({
        new: { status: "draft", submitted_at: "" },
        old: { status: "draft", submitted_at: "" },
      }),
    ).toBe(false);
  });
});
