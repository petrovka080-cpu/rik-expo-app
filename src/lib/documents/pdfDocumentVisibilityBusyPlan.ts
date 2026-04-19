export type PdfDocumentVisibilityStartPlan =
  | {
      action: "begin_visibility_wait";
      reason: "router_available";
    }
  | {
      action: "skip_visibility_wait";
      reason: "missing_router";
    };

export type PdfDocumentVisibilitySuccessPlan =
  | {
      action: "await_visibility_wait";
      assertStage: "visibility";
    }
  | {
      action: "record_no_router_visible";
      stage: "first_open_visible";
      assertStage: "visibility";
    };

export type PdfDocumentVisibilityFailureSignalPlan =
  | {
      action: "signal_visibility_failure";
      token: string;
    }
  | {
      action: "skip_visibility_failure_signal";
      reason: "missing_visibility_token";
    };

export type PdfDocumentVisibilityFailureRecordPlan = {
  recordOpenFailedStage: boolean;
};

export type PdfDocumentBusyExecutionPlan =
  | {
      mode: "busy_run";
      key: string;
      label?: string;
      minMs: 200;
      recordBusyClearedAfterRun: true;
    }
  | {
      mode: "manual_busy";
      key: string;
      label?: string;
      recordBusyClearedInFinally: true;
    }
  | {
      mode: "direct";
      recordBusyCleared: false;
    };

export type PdfDocumentBusyRunOutputPlan =
  | {
      action: "return_output";
    }
  | {
      action: "throw_cancelled";
      message: "PDF open cancelled";
    };

export type PdfDocumentManualBusyCleanupPlan = {
  hideBusy: boolean;
  recordBusyCleared: true;
};

const toText = (value: unknown): string => String(value ?? "");

export function resolvePdfDocumentVisibilityStartPlan(args: {
  hasRouter: boolean;
}): PdfDocumentVisibilityStartPlan {
  if (args.hasRouter) {
    return {
      action: "begin_visibility_wait",
      reason: "router_available",
    };
  }

  return {
    action: "skip_visibility_wait",
    reason: "missing_router",
  };
}

export function resolvePdfDocumentVisibilitySuccessPlan(args: {
  hasVisibilityWait: boolean;
}): PdfDocumentVisibilitySuccessPlan {
  if (args.hasVisibilityWait) {
    return {
      action: "await_visibility_wait",
      assertStage: "visibility",
    };
  }

  return {
    action: "record_no_router_visible",
    stage: "first_open_visible",
    assertStage: "visibility",
  };
}

export function resolvePdfDocumentVisibilityFailureSignalPlan(args: {
  visibilityToken?: string | null;
}): PdfDocumentVisibilityFailureSignalPlan {
  const token = toText(args.visibilityToken);
  if (token) {
    return {
      action: "signal_visibility_failure",
      token,
    };
  }

  return {
    action: "skip_visibility_failure_signal",
    reason: "missing_visibility_token",
  };
}

export function resolvePdfDocumentVisibilityFailureRecordPlan(args: {
  signalledFailure: boolean;
}): PdfDocumentVisibilityFailureRecordPlan {
  return {
    recordOpenFailedStage: !args.signalledFailure,
  };
}

export function resolvePdfDocumentBusyExecutionPlan(args: {
  hasBusyRun: boolean;
  hasBusyShow: boolean;
  hasBusyHide: boolean;
  flowKey: string;
  label?: string;
}): PdfDocumentBusyExecutionPlan {
  if (args.hasBusyRun) {
    return {
      mode: "busy_run",
      key: args.flowKey,
      label: args.label,
      minMs: 200,
      recordBusyClearedAfterRun: true,
    };
  }

  if (args.hasBusyShow && args.hasBusyHide) {
    return {
      mode: "manual_busy",
      key: args.flowKey || "pdf:open",
      label: args.label,
      recordBusyClearedInFinally: true,
    };
  }

  return {
    mode: "direct",
    recordBusyCleared: false,
  };
}

export function resolvePdfDocumentBusyRunOutputPlan(args: {
  hasOutput: boolean;
}): PdfDocumentBusyRunOutputPlan {
  if (args.hasOutput) {
    return {
      action: "return_output",
    };
  }

  return {
    action: "throw_cancelled",
    message: "PDF open cancelled",
  };
}

export function resolvePdfDocumentManualBusyCleanupPlan(args: {
  isBusy: boolean;
}): PdfDocumentManualBusyCleanupPlan {
  return {
    hideBusy: args.isBusy,
    recordBusyCleared: true,
  };
}
