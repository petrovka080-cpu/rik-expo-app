import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";
import {
  RpcValidationError,
  isRpcRecord,
  runContainedRpc,
  validateRpcResponse,
} from "./queryBoundary";

describe("queryBoundary", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("passes fn and args through a single containment zone", async () => {
    const rpc = jest.fn(async (fn: string, args?: Record<string, unknown>) => ({
      data: { ok: true, fn, args },
      error: null,
    }));

    const result = await runContainedRpc<{
      ok: boolean;
      fn: string;
      args?: Record<string, unknown>;
    }>({ rpc }, "buyer_summary_inbox_scope_v1", { p_offset: 0, p_limit: 50 });

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
      appError: null,
    });
  });

  it("preserves rpc client context for transports that depend on this.rest", async () => {
    const client = {
      rest: { baseUrl: "https://example.test" },
      rpc: jest.fn(function (
        this: { rest?: { baseUrl?: string } },
        fn: string,
        args?: Record<string, unknown>,
      ) {
        if (!this?.rest) {
          throw new TypeError(
            "Cannot read properties of undefined (reading 'rest')",
          );
        }
        return Promise.resolve({
          data: {
            ok: true,
            fn,
            args,
            restBaseUrl: this.rest.baseUrl,
          },
          error: null,
        });
      }),
    };

    const result = await runContainedRpc<{
      ok: boolean;
      fn: string;
      args?: Record<string, unknown>;
      restBaseUrl?: string;
    }>(client, "buyer_summary_inbox_scope_v1", {
      p_offset: 12,
      p_limit: 12,
    });

    expect(result.error).toBeNull();
    expect(client.rpc).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual({
      ok: true,
      fn: "buyer_summary_inbox_scope_v1",
      args: { p_offset: 12, p_limit: 12 },
      restBaseUrl: "https://example.test",
    });
    expect(result.appError).toBeNull();
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

    const result = await runContainedRpc<null>(
      { rpc },
      "contractor_inbox_scope_v1",
    );

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("rpc failed");
    expect(result.error?.code).toBe("PGRST001");
    expect(result.error?.details).toBe("details");
    expect(result.error?.hint).toBe("hint");
    expect(result.appError).toMatchObject({
      code: "pgrst001",
      context: "rpc:contractor_inbox_scope_v1:result_error",
      severity: "fatal",
      message: "rpc failed",
    });
  });

  it("fails fast and logs boundary observability when the transport owner is invalid", async () => {
    const result = await runContainedRpc<null>(
      undefined,
      "contractor_inbox_scope_v1",
      { p_is_staff: false },
      {
        screen: "contractor",
        surface: "inbox_scope",
        owner: "contractor.scope.service",
        sourceKind: "rpc:contractor_inbox_scope_v1",
      },
    );

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain(
      "RPC transport owner is unavailable",
    );
    expect(result.appError).toMatchObject({
      context: "rpc:contractor_inbox_scope_v1:transport_guard",
      severity: "fatal",
    });
    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "contractor",
          surface: "inbox_scope",
          event: "rpc_transport_boundary_fail",
          result: "error",
          errorStage: "rpc_transport_guard",
          sourceKind: "rpc:contractor_inbox_scope_v1",
          extra: expect.objectContaining({
            owner: "contractor.scope.service",
            rpcName: "contractor_inbox_scope_v1",
          }),
        }),
      ]),
    );
  });
});

describe("rpcValidation", () => {
  const context = {
    rpcName: "example_rpc",
    caller: "test/caller",
    domain: "warehouse" as const,
  };

  it("passes a valid object", () => {
    const value = { id: "row-1", extra: "allowed" };
    const result = validateRpcResponse(
      value,
      (candidate): candidate is { id: string } =>
        isRpcRecord(candidate) && typeof candidate.id === "string",
      context,
    );

    expect(result).toBe(value);
  });

  it("passes a valid array when the validator allows it", () => {
    const value = [{ id: "row-1" }];
    const result = validateRpcResponse(
      value,
      (candidate): candidate is { id: string }[] =>
        Array.isArray(candidate) && candidate.every((row) => isRpcRecord(row)),
      context,
    );

    expect(result).toBe(value);
  });

  it("throws RpcValidationError for invalid shape", () => {
    expect(() =>
      validateRpcResponse(
        null,
        (candidate): candidate is { id: string } => isRpcRecord(candidate),
        context,
      ),
    ).toThrow(RpcValidationError);
  });

  it("lets nullable behavior follow the validator", () => {
    expect(
      validateRpcResponse(
        null,
        (candidate): candidate is null => candidate === null,
        { ...context, rpcName: "nullable_rpc" },
      ),
    ).toBeNull();
  });

  it("allows extra fields when the validator only requires used fields", () => {
    const value = { id: "row-1", harmless_extra: { nested: true } };
    expect(
      validateRpcResponse(
        value,
        (candidate): candidate is { id: string } =>
          isRpcRecord(candidate) && typeof candidate.id === "string",
        context,
      ),
    ).toEqual(value);
  });

  it("does not include raw payload contents in error messages", () => {
    const rawSecret = "token_should_not_be_logged";

    try {
      validateRpcResponse(
        { token: rawSecret },
        (candidate): candidate is { id: string } =>
          isRpcRecord(candidate) && typeof candidate.id === "string",
        context,
      );
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(RpcValidationError);
      expect(String((error as Error).message)).not.toContain(rawSecret);
    }
  });

  it("attaches context fields", () => {
    try {
      validateRpcResponse(
        "bad",
        (candidate): candidate is { id: string } => isRpcRecord(candidate),
        context,
      );
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toMatchObject({
        name: "RpcValidationError",
        rpcName: "example_rpc",
        caller: "test/caller",
        domain: "warehouse",
      });
    }
  });
});
