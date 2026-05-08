import { fetchQueueLatencyMetricsWithClient } from "../../src/lib/infra/queueLatencyMetrics";
import * as fs from "fs";
import * as path from "path";

describe("queue latency metrics boundary", () => {
  it("derives latency metrics from the submit_jobs_metrics rpc without table reads", async () => {
    const rpc = jest.fn(async () => ({
      data: [
        {
          pending: 7,
          processing: 2,
          failed: 1,
          oldest_pending: "2026-04-22T10:00:00.000Z",
        },
      ],
      error: null,
    }));

    const nowSpy = jest
      .spyOn(Date, "now")
      .mockReturnValue(new Date("2026-04-22T10:05:00.000Z").getTime());

    await expect(
      fetchQueueLatencyMetricsWithClient({ rpc } as never),
    ).resolves.toEqual({
      queueDepth: 7,
      oldestPendingAt: "2026-04-22T10:00:00.000Z",
      queueWaitMs: 5 * 60 * 1000,
    });

    expect(rpc).toHaveBeenCalledWith("submit_jobs_metrics");

    nowSpy.mockRestore();
  });

  it("returns zero latency when the metrics rpc reports no pending jobs", async () => {
    const rpc = jest.fn(async () => ({
      data: [
        {
          pending: 0,
          processing: 1,
          failed: 0,
          oldest_pending: null,
        },
      ],
      error: null,
    }));

    await expect(
      fetchQueueLatencyMetricsWithClient({ rpc } as never),
    ).resolves.toEqual({
      queueDepth: 0,
      oldestPendingAt: null,
      queueWaitMs: 0,
    });
  });
});

describe("queue latency metrics transport source contract", () => {
  const root = path.resolve(__dirname, "../..");
  const read = (relativePath: string) =>
    fs.readFileSync(path.join(root, relativePath), "utf8");

  it("keeps submit_jobs_metrics provider ownership in the transport", () => {
    const serviceSource = read("src/lib/infra/queueLatencyMetrics.ts");
    const transportSource = read("src/lib/infra/queueLatencyMetrics.transport.ts");

    expect(serviceSource).toContain("fetchSubmitJobsMetricsRowsWithClient(supabaseClient)");
    expect(serviceSource).not.toContain(".rpc(");
    expect(serviceSource).not.toContain("../supabaseClient");
    expect(transportSource).toContain('.rpc("submit_jobs_metrics")');
    expect(transportSource).not.toContain(".from(");
    expect(transportSource).not.toContain(".insert(");
    expect(transportSource).not.toContain(".update(");
  });
});
