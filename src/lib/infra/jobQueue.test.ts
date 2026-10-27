import { createJobQueueApi } from "./jobQueue";
import { MAX_SUBMIT_JOB_CLAIM_LIMIT } from "../../workers/queueWorker.limits";

const rpcMissing = (fn: string, signature: string) => ({
  code: "PGRST202",
  message: `Could not find the function public.${fn}(${signature}) in the schema cache`,
});

const notFound = {
  message: "Not Found",
  status: 404,
};

const submitJobRow = {
  id: "job-1",
  client_request_id: null,
  job_type: "buyer_submit",
  entity_type: "request",
  entity_id: "request-1",
  entity_key: "request-1",
  payload: { requestId: "request-1" },
  status: "processing",
  retry_count: 0,
  error: null,
  created_by: null,
  created_at: "2026-04-21T00:00:00.000Z",
  started_at: "2026-04-21T00:00:01.000Z",
  worker_id: "worker-1",
  next_retry_at: null,
  locked_until: "2026-04-21T00:05:00.000Z",
  processed_at: null,
};

describe("job queue server-owned transitions", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    jest.clearAllMocks();
  });

  it("claims jobs through the healthy RPC path without table mutation fallback", async () => {
    const from = jest.fn();
    const rpc = jest.fn(async () => ({ data: [submitJobRow], error: null }));
    const api = createJobQueueApi({ rpc, from } as never);

    const result = await api.claimSubmitJobs("worker-1", 1, "buyer_submit");

    expect(rpc).toHaveBeenCalledWith("submit_jobs_claim", {
      p_worker: "worker-1",
      p_limit: 1,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ id: "job-1", status: "processing" }),
    );
    expect(from).not.toHaveBeenCalled();
  });

  it("caps healthy claim RPC limits before calling the queue source", async () => {
    const from = jest.fn();
    const rpc = jest.fn(async () => ({ data: [submitJobRow], error: null }));
    const api = createJobQueueApi({ rpc, from } as never);

    await api.claimSubmitJobs("worker-1", 5_000, "buyer_submit");

    expect(rpc).toHaveBeenCalledWith("submit_jobs_claim", {
      p_worker: "worker-1",
      p_limit: MAX_SUBMIT_JOB_CLAIM_LIMIT,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("fails closed when claim RPC signatures are unavailable", async () => {
    const from = jest.fn();
    const rpc = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: rpcMissing("submit_jobs_claim", "p_limit, p_worker"),
      })
      .mockResolvedValueOnce({ data: null, error: notFound });
    const api = createJobQueueApi({ rpc, from } as never);

    await expect(
      api.claimSubmitJobs("worker-1", 1, "buyer_submit"),
    ).rejects.toThrow("submit_jobs_claim RPC is required");

    expect(rpc).toHaveBeenNthCalledWith(2, "submit_jobs_claim", {
      p_worker_id: "worker-1",
      p_limit: 1,
      p_job_type: "buyer_submit",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("caps legacy claim RPC limits before compatibility retry", async () => {
    const from = jest.fn();
    const rpc = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: rpcMissing("submit_jobs_claim", "p_limit, p_worker"),
      })
      .mockResolvedValueOnce({ data: [submitJobRow], error: null });
    const api = createJobQueueApi({ rpc, from } as never);

    const result = await api.claimSubmitJobs("worker-1", 5_000, "buyer_submit");

    expect(rpc).toHaveBeenNthCalledWith(2, "submit_jobs_claim", {
      p_worker_id: "worker-1",
      p_limit: MAX_SUBMIT_JOB_CLAIM_LIMIT,
      p_job_type: "buyer_submit",
    });
    expect(result).toHaveLength(1);
    expect(from).not.toHaveBeenCalled();
  });

  it("marks completed jobs through the healthy RPC path without cleanup table writes", async () => {
    const from = jest.fn();
    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const api = createJobQueueApi({ rpc, from } as never);

    await api.markSubmitJobCompleted("job-2");

    expect(rpc).toHaveBeenCalledWith("submit_jobs_mark_completed", {
      p_id: "job-2",
    });
    expect(rpc).not.toHaveBeenCalledWith("submit_jobs_mark_completed", {
      p_job_id: "job-2",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("fails closed when complete RPC signatures are unavailable", async () => {
    const from = jest.fn();
    const rpc = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: rpcMissing("submit_jobs_mark_completed", "p_id"),
      })
      .mockResolvedValueOnce({ data: null, error: notFound });
    const api = createJobQueueApi({ rpc, from } as never);

    await expect(api.markSubmitJobCompleted("job-2")).rejects.toThrow(
      "submit_jobs_mark_completed RPC is required",
    );

    expect(from).not.toHaveBeenCalled();
  });

  it("marks failed jobs through the healthy RPC path without table mutation fallback", async () => {
    const from = jest.fn();
    const rpc = jest.fn(async () => ({
      data: [{ retry_count: 2, status: "pending" }],
      error: null,
    }));
    const api = createJobQueueApi({ rpc, from } as never);

    const result = await api.markSubmitJobFailed("job-1", "attach failed");

    expect(rpc).toHaveBeenCalledWith("submit_jobs_mark_failed", {
      p_id: "job-1",
      p_error: "attach failed",
    });
    expect(result).toEqual({ retryCount: 2, status: "pending" });
    expect(from).not.toHaveBeenCalled();
  });

  it("reads failed-job metrics through the aggregate RPC without table fallback", async () => {
    const from = jest.fn();
    const rpc = jest.fn(async () => ({
      data: [{ pending: 3, processing: 1, failed: 2, oldest_pending: "2026-05-03T00:00:00.000Z" }],
      error: null,
    }));
    const api = createJobQueueApi({ rpc, from } as never);

    await expect(api.fetchSubmitJobMetrics()).resolves.toEqual({
      pending: 3,
      processing: 1,
      failed: 2,
      oldest_pending: "2026-05-03T00:00:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("submit_jobs_metrics");
    expect(from).not.toHaveBeenCalled();
  });

  it("fails closed when fail RPC signatures are unavailable", async () => {
    const from = jest.fn();
    const rpc = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: rpcMissing("submit_jobs_mark_failed", "p_error, p_id"),
      })
      .mockResolvedValueOnce({ data: null, error: notFound });
    const api = createJobQueueApi({ rpc, from } as never);

    await expect(
      api.markSubmitJobFailed("job-1", "attach failed"),
    ).rejects.toThrow("submit_jobs_mark_failed RPC is required");

    expect(rpc).toHaveBeenNthCalledWith(2, "submit_jobs_mark_failed", {
      p_job_id: "job-1",
      p_error: "attach failed",
    });
    expect(from).not.toHaveBeenCalled();
  });
});
