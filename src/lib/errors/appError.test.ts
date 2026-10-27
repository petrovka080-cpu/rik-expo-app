import { errorResult, normalizeAppError, okResult } from "./appError";

describe("appError", () => {
  it("normalizes unknown critical boundary errors into a stable AppError", () => {
    const error = Object.assign(new Error("RPC failed"), { code: "PGRST001" });

    expect(
      normalizeAppError(error, "rpc:buyer_summary", "fatal"),
    ).toMatchObject({
      code: "pgrst001",
      message: "RPC failed",
      context: "rpc:buyer_summary",
      severity: "fatal",
      cause: error,
    });
  });

  it("provides a narrow typed result helper", () => {
    expect(okResult({ id: 1 })).toEqual({
      ok: true,
      data: { id: 1 },
    });
    expect(errorResult("boom", "pdf_prepare")).toMatchObject({
      ok: false,
      error: {
        code: "unknown_error",
        message: "boom",
        context: "pdf_prepare",
        severity: "warn",
      },
    });
  });
});
