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

describe("director_reports.transport.base issue line fallback fan-out", () => {
  beforeEach(() => {
    mockRunContainedRpc.mockReset();
    mockRecordDirectorReportsTransportWarning.mockReset();
  });

  it("bounds per-issue fallback RPCs after the batch RPC fails", async () => {
    const issueIds = Array.from({ length: 18 }, (_, index) => String(index + 1));
    let active = 0;
    let maxActive = 0;

    mockRunContainedRpc.mockImplementation(
      async (_client: unknown, fnName: string, params: Record<string, unknown>) => {
        if (fnName === "director_report_fetch_acc_issue_lines_v1") {
          return { data: null, error: { message: "batch unavailable" } };
        }
        if (fnName !== "acc_report_issue_lines") {
          throw new Error(`Unexpected rpc ${fnName}`);
        }

        active += 1;
        maxActive = Math.max(maxActive, active);
        try {
          await new Promise((resolve) => setTimeout(resolve, 5));
          const issueId = Number(params.p_issue_id);
          return {
            data: [
              {
                issue_id: issueId,
                rik_code: `MAT-${issueId}`,
                uom: "pcs",
                name_human: `Line ${issueId}`,
                qty_total: 1,
                qty_in_req: 0,
                qty_over: 1,
              },
            ],
            error: null,
          };
        } finally {
          active -= 1;
        }
      },
    );

    const { fetchIssueLinesViaAccRpc } = loadSubject();

    const rows = await fetchIssueLinesViaAccRpc(issueIds);

    expect(rows.map((row) => Number(row.issue_id))).toEqual(
      issueIds.map((issueId) => Number(issueId)),
    );
    expect(maxActive).toBeLessThanOrEqual(6);
    expect(mockRunContainedRpc).toHaveBeenCalledWith(
      expect.anything(),
      "director_report_fetch_acc_issue_lines_v1",
      { p_issue_ids: issueIds.map((issueId) => Number(issueId)) },
    );
    expect(mockRecordDirectorReportsTransportWarning).toHaveBeenCalledWith(
      "issue_lines_acc_batch_rpc_failed",
      expect.objectContaining({ message: "batch unavailable" }),
      expect.objectContaining({
        issueIdCount: issueIds.length,
        fallbackTarget: "acc_report_issue_lines",
      }),
    );
  });
});
