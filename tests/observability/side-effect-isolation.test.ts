/**
 * Side-effect isolation discipline tests.
 *
 * WAVE U: Validates the catch discipline module — the canonical
 * side-effect isolation boundary. This module controls how errors
 * are reported, swallowed, and observed without phantom invocations.
 */

import { getPlatformObservabilityEvents, resetPlatformObservabilityEvents } from "../../src/lib/observability/platformObservability";
import { recordCatchDiscipline, reportAndSwallow } from "../../src/lib/observability/catchDiscipline";

describe("side-effect isolation — catchDiscipline", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("recordCatchDiscipline emits exactly one observability event", () => {
    recordCatchDiscipline({
      screen: "warehouse",
      surface: "receive_flow",
      event: "submit_failed",
      error: new Error("network timeout"),
      kind: "soft_failure",
    });

    const events = getPlatformObservabilityEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      screen: "warehouse",
      surface: "receive_flow",
      event: "submit_failed",
      result: "error",
    });
  });

  it("critical_fail emits event with errorClass and errorMessage", () => {
    recordCatchDiscipline({
      screen: "buyer",
      surface: "proposal_submit",
      event: "rpc_failed",
      error: new Error("constraint violation"),
      kind: "critical_fail",
    });

    const events = getPlatformObservabilityEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      result: "error",
      errorClass: "Error",
      errorMessage: "constraint violation",
    });
  });

  it("cleanup_only uses reload category", () => {
    recordCatchDiscipline({
      screen: "foreman",
      surface: "timer_cleanup",
      event: "cleanup_error",
      error: new Error("already cleared"),
      kind: "cleanup_only",
    });

    const events = getPlatformObservabilityEvents();
    expect(events[0].category).toBe("reload");
  });

  it("degraded_fallback sets fallbackUsed flag", () => {
    recordCatchDiscipline({
      screen: "director",
      surface: "finance_data",
      event: "fallback_used",
      error: new Error("rpc missing"),
      kind: "degraded_fallback",
    });

    const events = getPlatformObservabilityEvents();
    expect(events[0].fallbackUsed).toBe(true);
  });

  it("soft_failure does NOT set fallbackUsed", () => {
    recordCatchDiscipline({
      screen: "accountant",
      surface: "payment",
      event: "load_failed",
      error: new Error("timeout"),
      kind: "soft_failure",
    });

    const events = getPlatformObservabilityEvents();
    expect(events[0].fallbackUsed).toBeFalsy();
  });

  it("extra fields are preserved in event", () => {
    recordCatchDiscipline({
      screen: "warehouse",
      surface: "receive",
      event: "test_extra",
      error: new Error("test"),
      kind: "soft_failure",
      extra: { requestId: "req-123", retryCount: 3 },
    });

    const events = getPlatformObservabilityEvents();
    expect(events[0].extra).toEqual(
      expect.objectContaining({
        requestId: "req-123",
        retryCount: 3,
        catchKind: "soft_failure",
      }),
    );
  });
});

describe("side-effect isolation — reportAndSwallow", () => {
  beforeEach(() => {
    resetPlatformObservabilityEvents();
  });

  it("defaults to soft_failure kind when not specified", () => {
    reportAndSwallow({
      screen: "contractor",
      surface: "progress",
      event: "save_failed",
      error: new Error("conflict"),
    });

    const events = getPlatformObservabilityEvents();
    expect(events).toHaveLength(1);
    expect(events[0].extra).toEqual(
      expect.objectContaining({
        catchKind: "soft_failure",
      }),
    );
  });

  it("includes scope in extra", () => {
    reportAndSwallow({
      screen: "buyer",
      surface: "list",
      event: "refresh_error",
      error: new Error("stale"),
      scope: "buyer.list.refresh",
    });

    const events = getPlatformObservabilityEvents();
    expect(events[0].extra).toEqual(
      expect.objectContaining({
        scope: "buyer.list.refresh",
      }),
    );
  });

  it("handles non-Error objects gracefully", () => {
    reportAndSwallow({
      screen: "foreman",
      surface: "draft",
      event: "sync_error",
      error: { message: "custom error object" },
    });

    const events = getPlatformObservabilityEvents();
    expect(events).toHaveLength(1);
    expect(events[0].errorMessage).toBe("custom error object");
  });

  it("handles string errors gracefully", () => {
    reportAndSwallow({
      screen: "director",
      surface: "reports",
      event: "string_error",
      error: "raw string error",
    });

    const events = getPlatformObservabilityEvents();
    expect(events).toHaveLength(1);
    // Should extract the string as the error message
    expect(events[0].errorMessage).toBeTruthy();
  });

  it("handles null/undefined errors gracefully", () => {
    expect(() => {
      reportAndSwallow({
        screen: "warehouse",
        surface: "stock",
        event: "null_error",
        error: null,
      });
    }).not.toThrow();

    expect(() => {
      reportAndSwallow({
        screen: "warehouse",
        surface: "stock",
        event: "undefined_error",
        error: undefined,
      });
    }).not.toThrow();

    const events = getPlatformObservabilityEvents();
    expect(events).toHaveLength(2);
  });
});
