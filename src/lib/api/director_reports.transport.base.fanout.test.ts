const mockRunContainedRpc = jest.fn();
const mockRecordDirectorReportsTransportWarning = jest.fn();

jest.mock("../supabaseClient", () => ({
  supabase: {},
}));

jest.mock("./queryBoundary", () => ({
  runContainedRpc: (...args: unknown[]) => mockRunContainedRpc(...args),
}));

jest.mock("./director_reports.observability", () => ({
  recordDirectorReportsTransportWarning: (...args: unknown[]) =>
    mockRecordDirectorReportsTransportWarning(...args),
}));

jest.mock("./requestCanonical.read", () => ({
  loadCanonicalRequestsByIds: jest.fn(),
}));

const loadSubject = () =>
  require("./director_reports.transport.base") as typeof import("./director_reports.transport.base");

describe("director_reports.transport.base aggregation contract closeout", () => {
  beforeEach(() => {
    mockRunContainedRpc.mockReset();
    mockRecordDirectorReportsTransportWarning.mockReset();
  });

  it("fails closed instead of running per-issue fallback RPC fan-out", async () => {
    const { fetchIssueHeadsViaAccRpc, fetchIssueLinesViaAccRpc } = loadSubject();

    await expect(
      fetchIssueHeadsViaAccRpc({ from: "2026-04-01", to: "2026-04-30" }),
    ).rejects.toThrow("director_report_transport_scope_v1");
    await expect(fetchIssueLinesViaAccRpc(["1", "2", "3"])).rejects.toThrow(
      "director_report_transport_scope_v1",
    );

    expect(mockRunContainedRpc).not.toHaveBeenCalled();
    expect(mockRecordDirectorReportsTransportWarning).not.toHaveBeenCalled();
  });
});
