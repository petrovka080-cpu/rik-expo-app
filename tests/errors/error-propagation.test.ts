/**
 * Error propagation discipline tests.
 *
 * WAVE Z: Validates that the error propagation boundary (normalizeAppError,
 * errorResult, okResult) handles every input variant without silent loss.
 *
 * Root cause addressed: errors from Supabase RPC, network failures, and
 * unexpected shapes can produce inconsistent AppError shapes if not
 * properly normalized. This test suite ensures predictable error
 * propagation regardless of source.
 */

import {
  normalizeAppError,
  okResult,
  errorResult,
  type AppError,
  type Result,
} from "../../src/lib/errors/appError";

describe("error propagation — normalizeAppError", () => {
  it("normalizes standard Error", () => {
    const result = normalizeAppError(new Error("test"), "ctx");
    expect(result.code).toBe("error");
    expect(result.message).toBe("test");
    expect(result.context).toBe("ctx");
    expect(result.severity).toBe("warn");
    expect(result.cause).toBeInstanceOf(Error);
  });

  it("normalizes Error with custom code", () => {
    const err = Object.assign(new Error("db failed"), { code: "23505" });
    const result = normalizeAppError(err, "insert", "fatal");
    expect(result.code).toBe("23505");
    expect(result.message).toBe("db failed");
    expect(result.severity).toBe("fatal");
  });

  it("normalizes plain object with message and code", () => {
    const result = normalizeAppError(
      { message: "rpc timeout", code: "PGRST302" },
      "pdf_source",
    );
    expect(result.code).toBe("pgrst302");
    expect(result.message).toBe("rpc timeout");
  });

  it("normalizes plain string error", () => {
    const result = normalizeAppError("something broke", "submit");
    expect(result.message).toBe("something broke");
    expect(result.code).toBe("unknown_error");
  });

  it("normalizes null error without silent loss", () => {
    const result = normalizeAppError(null, "test_null");
    expect(result.code).toBe("unknown_error");
    expect(result.message).toBeTruthy();
    expect(result.context).toBe("test_null");
  });

  it("normalizes undefined error without silent loss", () => {
    const result = normalizeAppError(undefined, "test_undef");
    expect(result.code).toBe("unknown_error");
    expect(result.message).toBeTruthy();
    expect(result.context).toBe("test_undef");
  });

  it("normalizes number error", () => {
    const result = normalizeAppError(500, "http_status");
    expect(result.message).toBeTruthy();
    expect(result.code).toBe("unknown_error");
  });

  it("normalizes empty object", () => {
    const result = normalizeAppError({}, "empty_obj");
    expect(result.code).toBe("unknown_error");
    expect(result.message).toBeTruthy();
    expect(result.context).toBe("empty_obj");
  });

  it("code is sanitized (special chars removed)", () => {
    const result = normalizeAppError(
      { code: "MY@ERROR#CODE!", message: "bad" },
      "ctx",
    );
    expect(result.code).toMatch(/^[a-z0-9_:-]+$/);
  });

  it("empty context defaults to unknown_context", () => {
    const result = normalizeAppError(new Error("x"), "");
    expect(result.context).toBe("unknown_context");
  });

  it("cause is preserved for debugging", () => {
    const original = new Error("original");
    const result = normalizeAppError(original, "debug");
    expect(result.cause).toBe(original);
  });

  it("Supabase-style PostgREST error is normalized", () => {
    const postgrestError = {
      message: "Could not find the function",
      details: "searched in public schema",
      hint: "check function name",
      code: "PGRST302",
    };
    const result = normalizeAppError(postgrestError, "rpc:pdf_source_v3");
    expect(result.code).toBe("pgrst302");
    expect(result.message).toBe("Could not find the function");
    expect(result.context).toBe("rpc:pdf_source_v3");
  });
});

describe("error propagation — Result helpers", () => {
  it("okResult produces typed success", () => {
    const result: Result<number> = okResult(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(42);
    }
  });

  it("errorResult produces typed failure with warn severity", () => {
    const result: Result<string> = errorResult(
      new Error("fail"),
      "submit_form",
    );
    expect(result.ok).toBe(false);
    const errResult = result as { ok: false; error: AppError };
    expect(errResult.error.context).toBe("submit_form");
    expect(errResult.error.severity).toBe("warn");
  });

  it("errorResult produces typed failure with fatal severity", () => {
    const result = errorResult(new Error("crash"), "payment", "fatal");
    expect(result.ok).toBe(false);
    const errResult = result as { ok: false; error: AppError };
    expect(errResult.error.severity).toBe("fatal");
  });

  it("errorResult preserves cause chain", () => {
    const root = new Error("root cause");
    const result = errorResult(root, "chain");
    const errResult = result as { ok: false; error: AppError };
    expect(errResult.error.cause).toBe(root);
  });

  it("errorResult with null error doesn't throw", () => {
    expect(() => errorResult(null, "null_test")).not.toThrow();
    const result = errorResult(null, "null_test");
    expect(result.ok).toBe(false);
    const errResult = result as { ok: false; error: AppError };
    expect(errResult.error.code).toBe("unknown_error");
  });

  it("okResult with complex data preserves shape", () => {
    const data = { items: [1, 2, 3], meta: { page: 1 } };
    const result = okResult(data);
    if (result.ok) {
      expect(result.data).toEqual(data);
      expect(result.data.items).toHaveLength(3);
    }
  });
});
