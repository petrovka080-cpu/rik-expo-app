import { readFileSync } from "fs";
import { join } from "path";

import {
  PDF_NATIVE_HANDOFF_ERROR_COMMANDS,
  PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS,
  PDF_NATIVE_HANDOFF_READY_COMMANDS,
  normalizePdfNativeHandoffErrorMessage,
  planPdfNativeHandoffErrorCompletion,
  planPdfNativeHandoffStart,
  planPdfNativeHandoffSuccessCompletion,
} from "./pdfNativeHandoffPlan";

describe("pdfNativeHandoffPlan", () => {
  it("plans the primary trigger start after the guard allows it", () => {
    expect(
      planPdfNativeHandoffStart({
        trigger: "primary",
        guardDecision: "start",
      }),
    ).toEqual({
      action: "start",
      trigger: "primary",
      reason: "primary_guard_start",
      commands: PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS,
    });
  });

  it("plans the manual trigger start without a guard decision", () => {
    expect(planPdfNativeHandoffStart({ trigger: "manual" })).toEqual({
      action: "start",
      trigger: "manual",
      reason: "manual_trigger",
      commands: PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS,
    });
  });

  it("plans settled primary guard skip as the existing ready branch", () => {
    expect(
      planPdfNativeHandoffStart({
        trigger: "primary",
        guardDecision: "skip_settled",
      }),
    ).toEqual({
      action: "mark_ready",
      trigger: "primary",
      reason: "primary_settled",
    });
  });

  it("plans duplicate in-flight guard skip without opening native preview again", () => {
    expect(
      planPdfNativeHandoffStart({
        trigger: "primary",
        guardDecision: "skip_in_flight",
      }),
    ).toEqual({
      action: "record_duplicate_skip",
      trigger: "primary",
      reason: "primary_in_flight",
    });
  });

  it("keeps timeout and loading reset commands before the native open command", () => {
    expect(
      planPdfNativeHandoffStart({
        trigger: "primary",
        guardDecision: "start",
      }),
    ).toMatchObject({
      commands: [
        "clear_loading_timeout",
        "close_menu",
        "clear_error",
        "set_loading",
        "allow_render",
        "reset_native_handoff_completion",
      ],
    });
  });

  it("plans primary success through mounted check, guard completion, then ready", () => {
    expect(
      planPdfNativeHandoffSuccessCompletion({
        trigger: "primary",
        isMounted: true,
      }),
    ).toEqual({
      action: "complete_guard",
      trigger: "primary",
      result: "success",
    });

    expect(
      planPdfNativeHandoffSuccessCompletion({
        trigger: "primary",
        isMounted: true,
        primaryGuardCompleted: true,
      }),
    ).toEqual({
      action: "commit_ready",
      trigger: "primary",
      commands: PDF_NATIVE_HANDOFF_READY_COMMANDS,
    });
  });

  it("plans manual success directly to ready when the screen is mounted", () => {
    expect(
      planPdfNativeHandoffSuccessCompletion({
        trigger: "manual",
        isMounted: true,
      }),
    ).toEqual({
      action: "commit_ready",
      trigger: "manual",
      commands: PDF_NATIVE_HANDOFF_READY_COMMANDS,
    });
  });

  it("suppresses stale or unmounted success completion", () => {
    expect(
      planPdfNativeHandoffSuccessCompletion({
        trigger: "primary",
        isMounted: false,
      }),
    ).toEqual({
      action: "noop",
      trigger: "primary",
      result: "success",
      reason: "unmounted",
    });

    expect(
      planPdfNativeHandoffSuccessCompletion({
        trigger: "primary",
        isMounted: true,
        primaryGuardCompleted: false,
      }),
    ).toEqual({
      action: "noop",
      trigger: "primary",
      result: "success",
      reason: "stale_completion",
    });
  });

  it("plans primary failure through mounted check, guard completion, then error", () => {
    const error = new Error("Native viewer failed");

    expect(
      planPdfNativeHandoffErrorCompletion({
        trigger: "primary",
        isMounted: true,
        error,
      }),
    ).toEqual({
      action: "complete_guard",
      trigger: "primary",
      result: "failure",
    });

    expect(
      planPdfNativeHandoffErrorCompletion({
        trigger: "primary",
        isMounted: true,
        primaryGuardCompleted: true,
        error,
      }),
    ).toEqual({
      action: "commit_error",
      trigger: "primary",
      message: "Native viewer failed",
      commands: PDF_NATIVE_HANDOFF_ERROR_COMMANDS,
    });
  });

  it("plans manual failure directly to error when the screen is mounted", () => {
    expect(
      planPdfNativeHandoffErrorCompletion({
        trigger: "manual",
        isMounted: true,
        error: "manual failed",
      }),
    ).toEqual({
      action: "commit_error",
      trigger: "manual",
      message: "manual failed",
      commands: PDF_NATIVE_HANDOFF_ERROR_COMMANDS,
    });
  });

  it("suppresses stale or unmounted failure completion before message normalization", () => {
    const error = {
      toString: jest.fn(() => "should not be read"),
    };

    expect(
      planPdfNativeHandoffErrorCompletion({
        trigger: "primary",
        isMounted: false,
        error,
      }),
    ).toEqual({
      action: "noop",
      trigger: "primary",
      result: "failure",
      reason: "unmounted",
    });
    expect(error.toString).not.toHaveBeenCalled();

    expect(
      planPdfNativeHandoffErrorCompletion({
        trigger: "primary",
        isMounted: true,
        primaryGuardCompleted: false,
        error,
      }),
    ).toEqual({
      action: "noop",
      trigger: "primary",
      result: "failure",
      reason: "stale_completion",
    });
    expect(error.toString).not.toHaveBeenCalled();
  });

  it("normalizes native handoff errors like the viewer did", () => {
    expect(normalizePdfNativeHandoffErrorMessage(new Error("boom"))).toBe(
      "boom",
    );
    expect(normalizePdfNativeHandoffErrorMessage("plain")).toBe("plain");
    expect(normalizePdfNativeHandoffErrorMessage(null)).toBe("null");
  });

  it("stays pure and does not import runtime side-effect APIs", () => {
    const source = readFileSync(
      join(__dirname, "pdfNativeHandoffPlan.ts"),
      "utf8",
    );

    expect(source).not.toContain("openPdfPreview");
    expect(source).not.toContain("beginPdfNativeHandoff");
    expect(source).not.toContain("completePdfNativeHandoff");
    expect(source).not.toContain("clearLoadingTimeout");
    expect(source).not.toContain("setState");
    expect(source).not.toContain("setNativeHandoffCompleted");
    expect(source).not.toContain("markReady");
    expect(source).not.toContain("markError");
    expect(source).not.toContain("recordViewerBreadcrumb");
    expect(source).not.toContain("recordPdfCriticalPathEvent");
    expect(source).not.toContain("console.");
  });
});
