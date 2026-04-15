import React from "react";
import { Alert } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { loadDirectorReportUiScope } from "../../../lib/api/directorReportsScope.service";
import { useDirectorReportsUiStore } from "../directorReports.store";
import { useDirectorReportsController } from "./useDirectorReportsController";

jest.mock("../../../lib/api/directorReportsScope.service", () => ({
  loadDirectorReportUiScope: jest.fn(),
}));

jest.mock("../../../lib/observability/platformObservability", () => ({
  recordPlatformObservability: jest.fn(),
}));

const mockLoadDirectorReportUiScope =
  loadDirectorReportUiScope as jest.MockedFunction<
    typeof loadDirectorReportUiScope
  >;

const resetDirectorReportsStore = () => {
  useDirectorReportsUiStore.setState({
    repOpen: false,
    repPeriodOpen: false,
    repObjOpen: false,
    repTab: "materials",
    repFrom: null,
    repTo: null,
    repObjectName: null,
    repLoading: false,
    repDisciplinePriceLoading: false,
    repOptLoading: false,
    repBranchMeta: {
      options: null,
      report: null,
      discipline: null,
    },
  });
};

const createScopeResult = (code: string) =>
  ({
    optionsKey: "options",
    optionsState: {
      objects: [],
      objectIdByName: {},
    },
    optionsMeta: null,
    optionsFromCache: false,
    key: code,
    objectName: null,
    report: {
      rows: [
        {
          rik_code: code,
          uom: "pcs",
          qty_total: 1,
          docs_cnt: 1,
          qty_free: 0,
          docs_free: 0,
        },
      ],
    },
    reportMeta: null,
    discipline: null,
    disciplineMeta: null,
    reportFromCache: false,
    disciplineFromCache: false,
    disciplinePricesReady: false,
  }) as Awaited<ReturnType<typeof loadDirectorReportUiScope>>;

describe("useDirectorReportsController cancellation discipline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDirectorReportsStore();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("aborts an older director report request and keeps the newer response authoritative", async () => {
    const signals: AbortSignal[] = [];
    const resolvers: (() => void)[] = [];
    mockLoadDirectorReportUiScope.mockImplementation(((args) => {
      signals.push(args.signal as AbortSignal);
      const code = String(args.objectName ?? "all");
      return new Promise((resolve) => {
        resolvers.push(() => resolve(createScopeResult(code)));
      }) as ReturnType<typeof loadDirectorReportUiScope>;
    }) as typeof loadDirectorReportUiScope);

    let api: ReturnType<typeof useDirectorReportsController> | null = null;
    function Harness() {
      api = useDirectorReportsController({ fmtDateOnly: (value) => value ?? "" });
      return null;
    }

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<QueryClientProvider client={qc}><Harness /></QueryClientProvider>);
    });

    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = api?.fetchReport("old") ?? Promise.resolve();
      await Promise.resolve();
    });
    let second: Promise<void> = Promise.resolve();
    await act(async () => {
      second = api?.fetchReport("new") ?? Promise.resolve();
      await Promise.resolve();
    });

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    await act(async () => {
      resolvers[1]?.();
      await second;
      await Promise.resolve();
    });
    expect(api?.repData?.rows?.[0]?.rik_code).toBe("new");

    await act(async () => {
      resolvers[0]?.();
      await first;
      await Promise.resolve();
    });
    expect(api?.repData?.rows?.[0]?.rik_code).toBe("new");
    expect(Alert.alert).not.toHaveBeenCalled();

    act(() => {
      renderer.unmount();
    });
  });

  it("aborts a pending director report request on unmount without surfacing a stale alert", async () => {
    let signal: AbortSignal | undefined;
    let resolveScope!: () => void;
    mockLoadDirectorReportUiScope.mockImplementation(((args) => {
      signal = args.signal ?? undefined;
      return new Promise((resolve) => {
        resolveScope = () => resolve(createScopeResult("late"));
      }) as ReturnType<typeof loadDirectorReportUiScope>;
    }) as typeof loadDirectorReportUiScope);

    let api: ReturnType<typeof useDirectorReportsController> | null = null;
    function Harness() {
      api = useDirectorReportsController({ fmtDateOnly: (value) => value ?? "" });
      return null;
    }

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<QueryClientProvider client={qc}><Harness /></QueryClientProvider>);
    });

    let task: Promise<void> = Promise.resolve();
    await act(async () => {
      task = api?.fetchReport() ?? Promise.resolve();
      await Promise.resolve();
    });
    act(() => {
      renderer.unmount();
    });

    expect(signal?.aborted).toBe(true);

    await act(async () => {
      resolveScope();
      await task;
      await Promise.resolve();
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
