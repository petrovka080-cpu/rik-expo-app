/**
 * API contract stabilization tests.
 *
 * WAVE V: Validates the RPC error classification and API utility
 * boundaries to ensure frontend↔backend contract is explicit and stable.
 */

import {
  classifyRpcCompatError,
  parseErr,
  normStr,
  normalizeUuid,
  toFilterId,
  toRpcId,
} from "../../src/lib/api/_core";

describe("API contract — classifyRpcCompatError", () => {
  it("missing_function on PGRST302", () => {
    const result = classifyRpcCompatError({ code: "PGRST302", message: "" });
    expect(result.kind).toBe("missing_function");
    expect(result.allowNextVariant).toBe(true);
  });

  it("missing_function on 'could not find'", () => {
    const result = classifyRpcCompatError({ message: "could not find the function" });
    expect(result.kind).toBe("missing_function");
    expect(result.allowNextVariant).toBe(true);
  });

  it("missing_function on 'function does not exist'", () => {
    const result = classifyRpcCompatError({ message: "function pdf_source_v2 does not exist" });
    expect(result.kind).toBe("missing_function");
  });

  it("missing_function on /rpc/ 404", () => {
    const result = classifyRpcCompatError({ message: "/rpc/my_function returned 404" });
    expect(result.kind).toBe("missing_function");
  });

  it("permission on 42501", () => {
    const result = classifyRpcCompatError({ code: "42501", message: "" });
    expect(result.kind).toBe("permission");
    expect(result.allowNextVariant).toBe(false);
  });

  it("permission on 'permission denied'", () => {
    const result = classifyRpcCompatError({ message: "permission denied for table payments" });
    expect(result.kind).toBe("permission");
  });

  it("permission on 'row-level security'", () => {
    const result = classifyRpcCompatError({ message: "new row violates row-level security" });
    expect(result.kind).toBe("permission");
  });

  it("auth on PGRST301", () => {
    const result = classifyRpcCompatError({ code: "PGRST301", message: "" });
    expect(result.kind).toBe("auth");
    expect(result.allowNextVariant).toBe(false);
  });

  it("auth on 'jwt' error", () => {
    const result = classifyRpcCompatError({ message: "JWT expired" });
    expect(result.kind).toBe("auth");
  });

  it("validation on code 23505 (unique violation)", () => {
    const result = classifyRpcCompatError({ code: "23505", message: "" });
    expect(result.kind).toBe("validation");
    expect(result.allowNextVariant).toBe(false);
  });

  it("validation on 'violates'", () => {
    const result = classifyRpcCompatError({ message: "violates not-null constraint" });
    expect(result.kind).toBe("validation");
  });

  it("transient on network errors", () => {
    for (const msg of ["network error", "Failed to fetch", "timeout", "connection refused"]) {
      const result = classifyRpcCompatError({ message: msg });
      expect(result.kind).toBe("transient");
      expect(result.allowNextVariant).toBe(false);
    }
  });

  it("transient on code 08xxx", () => {
    const result = classifyRpcCompatError({ code: "08001", message: "" });
    expect(result.kind).toBe("transient");
  });

  it("unknown for unrecognized errors", () => {
    const result = classifyRpcCompatError({ message: "something completely unexpected" });
    expect(result.kind).toBe("unknown");
    expect(result.allowNextVariant).toBe(false);
  });

  it("handles null/undefined errors", () => {
    expect(() => classifyRpcCompatError(null)).not.toThrow();
    expect(() => classifyRpcCompatError(undefined)).not.toThrow();
    expect(classifyRpcCompatError(null).kind).toBe("unknown");
  });

  it("handles plain string errors", () => {
    const result = classifyRpcCompatError("fetch failed");
    expect(result.kind).toBe("transient");
  });
});

describe("API contract — parseErr", () => {
  it("extracts message from Error", () => {
    expect(parseErr(new Error("test message"))).toBe("test message");
  });

  it("extracts message from object", () => {
    expect(parseErr({ message: "from object" })).toBe("from object");
  });

  it("extracts error_description from object", () => {
    expect(parseErr({ error_description: "desc" })).toBe("desc");
  });

  it("handles string input", () => {
    expect(parseErr("raw string")).toBe("raw string");
  });

  it("handles null/undefined", () => {
    expect(typeof parseErr(null)).toBe("string");
    expect(typeof parseErr(undefined)).toBe("string");
  });
});

describe("API contract — normalizeUuid", () => {
  it("accepts valid UUID", () => {
    expect(normalizeUuid("550e8400-e29b-41d4-a716-446655440000"))
      .toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("strips leading # from UUID", () => {
    expect(normalizeUuid("#550e8400-e29b-41d4-a716-446655440000"))
      .toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("returns null for non-UUID", () => {
    expect(normalizeUuid("not-a-uuid")).toBeNull();
    expect(normalizeUuid("12345")).toBeNull();
    expect(normalizeUuid("")).toBeNull();
    expect(normalizeUuid(null)).toBeNull();
    expect(normalizeUuid(undefined)).toBeNull();
  });
});

describe("API contract — toFilterId", () => {
  it("accepts valid UUID", () => {
    expect(toFilterId("550e8400-e29b-41d4-a716-446655440000"))
      .toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects numeric-only IDs", () => {
    expect(toFilterId(12345)).toBeNull();
    expect(toFilterId("99999")).toBeNull();
  });

  it("rejects empty", () => {
    expect(toFilterId("")).toBeNull();
  });
});

describe("API contract — utility helpers", () => {
  it("normStr trims and lowercases", () => {
    expect(normStr("  HELLO  ")).toBe("hello");
    expect(normStr(null)).toBe("");
    expect(normStr(undefined)).toBe("");
  });

  it("toRpcId converts number to string", () => {
    expect(toRpcId(123)).toBe("123");
    expect(toRpcId("abc")).toBe("abc");
  });
});
