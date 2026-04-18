import type { PdfNativeHandoffGuardDecision } from "./pdfNativeHandoffGuard";

export type PdfNativeHandoffTrigger = "primary" | "manual";

export const PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS = [
  "clear_loading_timeout",
  "close_menu",
  "clear_error",
  "set_loading",
  "allow_render",
  "reset_native_handoff_completion",
] as const;

export const PDF_NATIVE_HANDOFF_READY_COMMANDS = [
  "set_native_handoff_completed",
  "mark_ready",
] as const;

export const PDF_NATIVE_HANDOFF_ERROR_COMMANDS = ["mark_error"] as const;

export type PdfNativeHandoffStartPlan =
  | {
      action: "start";
      trigger: PdfNativeHandoffTrigger;
      reason: "primary_guard_start" | "manual_trigger";
      commands: typeof PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS;
    }
  | {
      action: "mark_ready";
      trigger: "primary";
      reason: "primary_settled";
    }
  | {
      action: "record_duplicate_skip";
      trigger: "primary";
      reason: "primary_in_flight";
    };

export type PdfNativeHandoffSuccessCompletionPlan =
  | {
      action: "complete_guard";
      trigger: "primary";
      result: "success";
    }
  | {
      action: "commit_ready";
      trigger: PdfNativeHandoffTrigger;
      commands: typeof PDF_NATIVE_HANDOFF_READY_COMMANDS;
    }
  | {
      action: "noop";
      trigger: PdfNativeHandoffTrigger;
      result: "success";
      reason: "unmounted" | "stale_completion";
    };

export type PdfNativeHandoffErrorCompletionPlan =
  | {
      action: "complete_guard";
      trigger: "primary";
      result: "failure";
    }
  | {
      action: "commit_error";
      trigger: PdfNativeHandoffTrigger;
      message: string;
      commands: typeof PDF_NATIVE_HANDOFF_ERROR_COMMANDS;
    }
  | {
      action: "noop";
      trigger: PdfNativeHandoffTrigger;
      result: "failure";
      reason: "unmounted" | "stale_completion";
    };

export function planPdfNativeHandoffStart(
  args:
    | {
        trigger: "primary";
        guardDecision: PdfNativeHandoffGuardDecision;
      }
    | {
        trigger: "manual";
      },
): PdfNativeHandoffStartPlan {
  if (args.trigger === "manual") {
    return {
      action: "start",
      trigger: "manual",
      reason: "manual_trigger",
      commands: PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS,
    };
  }

  if (args.guardDecision === "skip_settled") {
    return {
      action: "mark_ready",
      trigger: "primary",
      reason: "primary_settled",
    };
  }

  if (args.guardDecision === "skip_in_flight") {
    return {
      action: "record_duplicate_skip",
      trigger: "primary",
      reason: "primary_in_flight",
    };
  }

  return {
    action: "start",
    trigger: "primary",
    reason: "primary_guard_start",
    commands: PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS,
  };
}

export function planPdfNativeHandoffSuccessCompletion(args: {
  trigger: PdfNativeHandoffTrigger;
  isMounted: boolean;
  primaryGuardCompleted?: boolean;
}): PdfNativeHandoffSuccessCompletionPlan {
  if (!args.isMounted) {
    return {
      action: "noop",
      trigger: args.trigger,
      result: "success",
      reason: "unmounted",
    };
  }

  if (args.trigger === "primary" && args.primaryGuardCompleted === undefined) {
    return {
      action: "complete_guard",
      trigger: "primary",
      result: "success",
    };
  }

  if (args.trigger === "primary" && !args.primaryGuardCompleted) {
    return {
      action: "noop",
      trigger: "primary",
      result: "success",
      reason: "stale_completion",
    };
  }

  return {
    action: "commit_ready",
    trigger: args.trigger,
    commands: PDF_NATIVE_HANDOFF_READY_COMMANDS,
  };
}

export function planPdfNativeHandoffErrorCompletion(args: {
  trigger: PdfNativeHandoffTrigger;
  isMounted: boolean;
  primaryGuardCompleted?: boolean;
  error: unknown;
}): PdfNativeHandoffErrorCompletionPlan {
  if (!args.isMounted) {
    return {
      action: "noop",
      trigger: args.trigger,
      result: "failure",
      reason: "unmounted",
    };
  }

  if (args.trigger === "primary" && args.primaryGuardCompleted === undefined) {
    return {
      action: "complete_guard",
      trigger: "primary",
      result: "failure",
    };
  }

  if (args.trigger === "primary" && !args.primaryGuardCompleted) {
    return {
      action: "noop",
      trigger: "primary",
      result: "failure",
      reason: "stale_completion",
    };
  }

  return {
    action: "commit_error",
    trigger: args.trigger,
    message: normalizePdfNativeHandoffErrorMessage(args.error),
    commands: PDF_NATIVE_HANDOFF_ERROR_COMMANDS,
  };
}

export function normalizePdfNativeHandoffErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
