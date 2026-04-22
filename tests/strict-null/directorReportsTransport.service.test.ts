const mockRpc = jest.fn();
const mockTrackRpcLatency = jest.fn();

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock("../../src/lib/requestCancellation", () => ({
  applySupabaseAbortSignal: (promise: Promise<unknown>) => promise,
  isAbortError: () => false,
  throwIfAborted: () => undefined,
}));

jest.mock("../../src/lib/api/director_reports.adapters", () => ({
  adaptCanonicalOptionsPayload: () => ({ objects: [], objectIdByName: {} }),
  adaptCanonicalMaterialsPayload: () => ({ rows: [] }),
  adaptCanonicalWorksPayload: () => ({ works: [] }),
}));

jest.mock("../../src/lib/api/director_reports.fallbacks", () => ({
  shouldRejectScopedEmptyMaterialsPayload: () => false,
  shouldRejectTransportScopeDisciplinePayload: () => false,
}));

jest.mock("../../src/lib/observability/rpcLatencyMetrics", () => ({
  trackRpcLatency: (...args: unknown[]) => mockTrackRpcLatency(...args),
}));

const loadSubject = () =>
  require("../../src/lib/api/directorReportsTransport.service") as typeof import("../../src/lib/api/directorReportsTransport.service");

const envelope = {
  document_type: "director_report_transport_scope",
  version: "v1",
  options_payload: {},
  report_payload: {},
  discipline_payload: null,
  canonical_summary: {},
  canonical_diagnostics: {},
  priced_stage: "base",
};

describe("directorReportsTransport.service strict-null prep", () => {
  beforeEach(() => {
    jest.resetModules();
    mockRpc.mockReset();
    mockTrackRpcLatency.mockReset();
    mockRpc.mockResolvedValue({ data: envelope, error: null });
  });

  it("omits optional RPC params instead of sending null", async () => {
    const { loadDirectorReportTransportScope } = loadSubject();

    await loadDirectorReportTransportScope({
      from: "",
      to: "",
      objectName: null,
      includeDiscipline: false,
      skipDisciplinePrices: false,
      bypassCache: true,
    });

    expect(mockRpc).toHaveBeenCalledWith("director_report_transport_scope_v1", {
      p_from: undefined,
      p_to: undefined,
      p_object_name: undefined,
      p_include_discipline: false,
      p_include_costs: false,
    });
  });

  it("preserves explicit filter params on scoped loads", async () => {
    const { loadDirectorReportTransportScope } = loadSubject();

    await loadDirectorReportTransportScope({
      from: "2026-04-01",
      to: "2026-04-30",
      objectName: "Object A",
      includeDiscipline: false,
      skipDisciplinePrices: true,
      bypassCache: true,
    });

    expect(mockRpc).toHaveBeenCalledWith("director_report_transport_scope_v1", {
      p_from: "2026-04-01",
      p_to: "2026-04-30",
      p_object_name: "Object A",
      p_include_discipline: false,
      p_include_costs: false,
    });
  });
});
