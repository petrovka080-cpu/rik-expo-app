import {
  createRefreshState,
  resolveDirectorLifecycleRefreshPlan,
  resolveDirectorTabSwitchPlan,
  resolveDirectorWebResumePlan,
  runRefresh,
  shouldTriggerFocusReturnRefresh,
} from "./director.lifecycle.refresh";
import { DIRECTOR_TAB_FINANCE, DIRECTOR_TAB_REQUESTS } from "./director.lifecycle.scope";

const mockRecordPlatformObservability = jest.fn();
const mockIsPlatformGuardCoolingDown = jest.fn();

jest.mock("../../lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) => mockRecordPlatformObservability(...args),
}));

jest.mock("../../lib/observability/platformGuardDiscipline", () => ({
  isPlatformGuardCoolingDown: (...args: unknown[]) => mockIsPlatformGuardCoolingDown(...args),
}));

describe("director lifecycle refresh planning", () => {
  beforeEach(() => {
    mockRecordPlatformObservability.mockReset();
    mockIsPlatformGuardCoolingDown.mockReset().mockReturnValue(false);
  });

  it("skips lifecycle refresh before bootstrap, while offline, and during cooldown", () => {
    expect(
      resolveDirectorLifecycleRefreshPlan({
        didInit: false,
        scopeKey: "requests:foreman",
        networkHydrated: false,
        networkKnownOffline: false,
        lastLifecycleRefreshAt: 0,
        minIntervalMs: 1200,
        now: 100,
      }),
    ).toEqual({
      kind: "skip",
      skipReason: "bootstrap_not_ready",
      scopeKey: "requests:foreman",
    });

    expect(
      resolveDirectorLifecycleRefreshPlan({
        didInit: true,
        scopeKey: "requests:foreman",
        networkHydrated: true,
        networkKnownOffline: true,
        lastLifecycleRefreshAt: 0,
        minIntervalMs: 1200,
        now: 100,
      }),
    ).toEqual({
      kind: "skip",
      skipReason: "network_known_offline",
      scopeKey: "requests:foreman",
      networkKnownOffline: true,
    });

    mockIsPlatformGuardCoolingDown.mockReturnValue(true);
    expect(
      resolveDirectorLifecycleRefreshPlan({
        didInit: true,
        scopeKey: "requests:foreman",
        networkHydrated: false,
        networkKnownOffline: false,
        lastLifecycleRefreshAt: 10,
        minIntervalMs: 1200,
        now: 100,
      }),
    ).toEqual({
      kind: "skip",
      skipReason: "recent_same_scope",
      scopeKey: "requests:foreman",
    });
  });

  it("returns a refresh plan when lifecycle guard allows it", () => {
    expect(
      resolveDirectorLifecycleRefreshPlan({
        didInit: true,
        scopeKey: "finance",
        networkHydrated: false,
        networkKnownOffline: false,
        lastLifecycleRefreshAt: 0,
        minIntervalMs: 1200,
        now: 321,
      }),
    ).toEqual({
      kind: "refresh",
      nextLastLifecycleRefreshAt: 321,
    });
  });

  it("plans tab-switch refresh only when tab or period identity changed", () => {
    expect(
      resolveDirectorTabSwitchPlan({
        scope: {
          dirTab: DIRECTOR_TAB_REQUESTS,
          requestTab: "foreman",
          finFrom: null,
          finTo: null,
          repFrom: null,
          repTo: null,
        },
        lastTabKey: `${DIRECTOR_TAB_REQUESTS}:foreman`,
        lastPeriodKey: "null-null-null-null",
      }),
    ).toEqual({
      kind: "skip",
      nextTabKey: `${DIRECTOR_TAB_REQUESTS}:foreman`,
      nextPeriodKey: "null-null-null-null",
    });

    expect(
      resolveDirectorTabSwitchPlan({
        scope: {
          dirTab: DIRECTOR_TAB_FINANCE,
          requestTab: "foreman",
          finFrom: "2026-01-01",
          finTo: "2026-01-31",
          repFrom: null,
          repTo: null,
        },
        lastTabKey: `${DIRECTOR_TAB_REQUESTS}:foreman`,
        lastPeriodKey: "null-null-null-null",
      }),
    ).toEqual({
      kind: "refresh",
      nextTabKey: DIRECTOR_TAB_FINANCE,
      nextPeriodKey: "2026-01-01-2026-01-31-null-null",
      refreshPlan: {
        kind: "finance",
        reason: "tab_switch:finance",
      },
    });
  });

  it("keeps focus-return and web-resume planning deterministic", () => {
    expect(
      shouldTriggerFocusReturnRefresh({
        wasFocused: false,
        isScreenFocused: true,
        didInit: true,
      }),
    ).toBe(true);
    expect(
      shouldTriggerFocusReturnRefresh({
        wasFocused: false,
        isScreenFocused: true,
        didInit: false,
      }),
    ).toBe(false);

    expect(
      resolveDirectorWebResumePlan({
        lastWebResumeAt: 100,
        now: 700,
        minIntervalMs: 750,
      }),
    ).toEqual({ kind: "skip" });
    expect(
      resolveDirectorWebResumePlan({
        lastWebResumeAt: 100,
        now: 900,
        minIntervalMs: 750,
      }),
    ).toEqual({
      kind: "refresh",
      nextLastWebResumeAt: 900,
    });
  });
});

describe("director lifecycle refresh queueing", () => {
  beforeEach(() => {
    mockRecordPlatformObservability.mockReset();
    mockIsPlatformGuardCoolingDown.mockReset().mockReturnValue(false);
  });

  it("joins the inflight refresh and queues a forced rerun when requested", async () => {
    let resolveFirst: (() => void) | null = null;
    const refreshFn = jest
      .fn<Promise<void>, [boolean?]>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(undefined);

    const stateRef = { current: createRefreshState() };
    const refreshRef = { current: refreshFn };
    const first = runRefresh(
      stateRef,
      refreshRef,
      {
        surface: "request_rows",
        event: "refresh_scope",
        trigger: "screen_init",
        scopeKey: "requests:foreman:rows",
      },
      { force: false },
    );
    const second = runRefresh(
      stateRef,
      refreshRef,
      {
        surface: "request_rows",
        event: "refresh_scope",
        trigger: "screen_focus",
        scopeKey: "requests:foreman:rows",
      },
      { force: true },
    );

    expect(second).toBe(first);
    expect(refreshFn).toHaveBeenCalledTimes(1);
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "director",
        surface: "request_rows",
        result: "queued_rerun",
        trigger: "screen_focus",
      }),
    );

    resolveFirst?.();
    await first;
    await Promise.resolve();
    await Promise.resolve();

    expect(refreshFn).toHaveBeenCalledTimes(2);
    expect(refreshFn.mock.calls).toEqual([[false], [true]]);
  });
});
