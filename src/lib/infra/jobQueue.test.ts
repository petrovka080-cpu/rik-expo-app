import { createJobQueueApi } from "./jobQueue";

describe("job queue rpc compatibility", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    jest.clearAllMocks();
  });

  it("marks failed jobs through table fallback when both rpc signatures are missing", async () => {
    const updatePatches: unknown[] = [];
    const maybeSingle = jest.fn(async () => ({
      data: { retry_count: 1, status: "processing" },
      error: null,
    }));
    const selectEq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq: selectEq }));
    const updateEq = jest.fn(async () => ({ data: null, error: null }));
    const update = jest.fn((patch: unknown) => {
      updatePatches.push(patch);
      return { eq: updateEq };
    });
    const rpc = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "PGRST202",
          message: "Could not find the function public.submit_jobs_mark_failed(p_error, p_id)",
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: "Not Found",
          status: 404,
        },
      });

    const api = createJobQueueApi({
      rpc,
      from: jest.fn(() => ({ select, update })),
    } as never);

    const result = await api.markSubmitJobFailed("job-1", "attach failed");

    expect(rpc).toHaveBeenNthCalledWith(1, "submit_jobs_mark_failed", {
      p_id: "job-1",
      p_error: "attach failed",
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "submit_jobs_mark_failed", {
      p_job_id: "job-1",
      p_error: "attach failed",
    });
    expect(result).toEqual({ retryCount: 2, status: "pending" });
    expect(updatePatches).toEqual([
      expect.objectContaining({
        retry_count: 2,
        status: "pending",
        error: "attach failed",
        locked_until: null,
      }),
    ]);
  });

  it("uses the typed p_id signature before legacy completion fallback", async () => {
    const updatePatches: unknown[] = [];
    const updateEq = jest.fn(async () => ({ data: null, error: null }));
    const update = jest.fn((patch: unknown) => {
      updatePatches.push(patch);
      return { eq: updateEq };
    });
    const rpc = jest.fn(async () => ({ data: null, error: null }));

    const api = createJobQueueApi({
      rpc,
      from: jest.fn(() => ({ update })),
    } as never);

    await api.markSubmitJobCompleted("job-2");

    expect(rpc).toHaveBeenCalledWith("submit_jobs_mark_completed", {
      p_id: "job-2",
    });
    expect(rpc).not.toHaveBeenCalledWith("submit_jobs_mark_completed", {
      p_job_id: "job-2",
    });
    expect(updatePatches).toEqual([
      expect.objectContaining({
        error: null,
        next_retry_at: null,
        locked_until: null,
      }),
    ]);
  });
});
