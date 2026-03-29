import { runContainedRpc } from "./queryBoundary";

describe("queryBoundary", () => {
  it("passes fn and args through a single containment zone", async () => {
    const rpc = jest.fn(async (fn: string, args?: Record<string, unknown>) => ({
      data: { ok: true, fn, args },
      error: null,
    }));

    const result = await runContainedRpc<{ ok: boolean; fn: string; args?: Record<string, unknown> }>(
      { rpc },
      "buyer_summary_inbox_scope_v1",
      { p_offset: 0, p_limit: 50 },
    );

    expect(rpc).toHaveBeenCalledWith("buyer_summary_inbox_scope_v1", {
      p_offset: 0,
      p_limit: 50,
    });
    expect(result).toEqual({
      data: {
        ok: true,
        fn: "buyer_summary_inbox_scope_v1",
        args: { p_offset: 0, p_limit: 50 },
      },
      error: null,
    });
  });

  it("normalizes unknown rpc errors into a predictable shape", async () => {
    const rpc = jest.fn(async () => ({
      data: null,
      error: {
        message: "rpc failed",
        code: "PGRST001",
        details: "details",
        hint: "hint",
      },
    }));

    const result = await runContainedRpc<null>({ rpc }, "contractor_inbox_scope_v1");

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("rpc failed");
    expect(result.error?.code).toBe("PGRST001");
    expect(result.error?.details).toBe("details");
    expect(result.error?.hint).toBe("hint");
  });
});
