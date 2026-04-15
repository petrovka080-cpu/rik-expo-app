import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { loadDirectorReportUiScope } from "../../../lib/api/directorReportsScope.service";
import {
  fetchDirectorReportsQueryData,
  useDirectorReportsQuery,
} from "./useDirectorReportsQuery";
import type { DirectorReportScopeLoadResult } from "./directorReports.query.types";

jest.mock("../../../lib/api/directorReportsScope.service", () => ({
  loadDirectorReportUiScope: jest.fn(),
}));

const mockLoadDirectorReportUiScope =
  loadDirectorReportUiScope as jest.MockedFunction<typeof loadDirectorReportUiScope>;

const createScopeResult = (
  overrides?: Partial<DirectorReportScopeLoadResult>,
): DirectorReportScopeLoadResult => ({
  optionsKey: "2026-01-01|2026-01-31",
  optionsState: { objects: ["Obj1"], objectIdByName: { Obj1: "id-1" } },
  optionsMeta: null,
  optionsFromCache: false,
  key: "2026-01-01|2026-01-31|Obj1|id-1",
  objectName: "Obj1",
  report: {
    meta: { from: "2026-01-01", to: "2026-01-31", object_name: "Obj1" },
    rows: [{ rik_code: "RC1", uom: "pcs", qty_total: 1, docs_cnt: 1, qty_free: 0, docs_free: 0 }],
  },
  reportMeta: null,
  discipline: null,
  disciplineMeta: null,
  reportFromCache: false,
  disciplineFromCache: false,
  disciplinePricesReady: false,
  ...overrides,
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

describe("fetchDirectorReportsQueryData", () => {
  beforeEach(() => {
    mockLoadDirectorReportUiScope.mockReset();
    mockLoadDirectorReportUiScope.mockResolvedValue(createScopeResult());
  });

  it("loads through the existing reports scope service with normalized params", async () => {
    const signal = new AbortController().signal;
    const result = await fetchDirectorReportsQueryData({
      from: "2026-01-01T10:20:30.000Z",
      to: null,
      objectName: " Obj1 ",
      objectIdByName: { Obj1: "id-1" },
      includeDiscipline: true,
      skipDisciplinePrices: false,
      bypassCache: true,
      signal,
    });

    expect(mockLoadDirectorReportUiScope).toHaveBeenCalledWith({
      from: "2026-01-01",
      to: "",
      objectName: "Obj1",
      optionsState: undefined,
      includeDiscipline: true,
      skipDisciplinePrices: false,
      bypassCache: true,
      signal,
    });
    expect(result.scopeLoad.key).toBe("2026-01-01|2026-01-31|Obj1|id-1");
    expect(result.report.payload?.rows?.[0]?.rik_code).toBe("RC1");
  });

  it("does not fabricate fallback report data when the service fails", async () => {
    mockLoadDirectorReportUiScope.mockRejectedValueOnce(new Error("transport failed"));

    await expect(
      fetchDirectorReportsQueryData({
        from: null,
        to: null,
        objectName: null,
        includeDiscipline: false,
        skipDisciplinePrices: true,
      }),
    ).rejects.toThrow("transport failed");
  });
});

describe("useDirectorReportsQuery", () => {
  beforeEach(() => {
    mockLoadDirectorReportUiScope.mockReset();
  });

  it("dedupes identical in-flight scope loads through React Query", async () => {
    let resolveScope!: (value: DirectorReportScopeLoadResult) => void;
    mockLoadDirectorReportUiScope.mockReturnValue(
      new Promise((resolve) => {
        resolveScope = resolve;
      }) as ReturnType<typeof loadDirectorReportUiScope>,
    );

    let api: ReturnType<typeof useDirectorReportsQuery> | null = null;
    function Harness() {
      api = useDirectorReportsQuery();
      return null;
    }

    const qc = createQueryClient();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <QueryClientProvider client={qc}>
          <Harness />
        </QueryClientProvider>,
      );
    });

    const params = {
      from: "2026-01-01",
      to: "2026-01-31",
      objectName: "Obj1",
      objectIdByName: { Obj1: "id-1" },
      includeDiscipline: false,
      skipDisciplinePrices: true,
    };

    const first = api!.loadReportsScope(params);
    const second = api!.loadReportsScope(params);
    expect(mockLoadDirectorReportUiScope).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveScope(createScopeResult());
      const results = await Promise.all([first, second]);
      expect(results[0].key).toBe("2026-01-01|2026-01-31|Obj1|id-1");
      expect(results[1].key).toBe("2026-01-01|2026-01-31|Obj1|id-1");
    });

    act(() => {
      renderer.unmount();
    });
  });

  it("refreshReportsScope forces the service bypass-cache path", async () => {
    mockLoadDirectorReportUiScope.mockResolvedValue(createScopeResult());

    let api: ReturnType<typeof useDirectorReportsQuery> | null = null;
    function Harness() {
      api = useDirectorReportsQuery();
      return null;
    }

    const qc = createQueryClient();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <QueryClientProvider client={qc}>
          <Harness />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await api!.refreshReportsScope({
        from: "2026-01-01",
        to: "2026-01-31",
        objectName: "Obj1",
        objectIdByName: { Obj1: "id-1" },
        includeDiscipline: false,
        skipDisciplinePrices: true,
      });
    });

    expect(mockLoadDirectorReportUiScope).toHaveBeenCalledWith(
      expect.objectContaining({
        bypassCache: true,
      }),
    );

    act(() => {
      renderer.unmount();
    });
  });
});
