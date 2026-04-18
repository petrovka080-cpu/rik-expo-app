import type { PdfNativeHandoffGuardDecision } from "./pdfNativeHandoffGuard";
import type { DocumentAsset } from "../documents/pdfDocumentSessions";

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

type PdfNativeHandoffAsset = Pick<
  DocumentAsset,
  | "documentType"
  | "entityId"
  | "fileName"
  | "originModule"
  | "sizeBytes"
  | "sourceKind"
  | "uri"
>;

type PdfNativeHandoffCommandContext = {
  diagnosticsScreen: string | null;
  openToken: string;
  sessionId: string;
  uriKind: string | null;
};

type PdfNativeHandoffExtra = {
  trigger: PdfNativeHandoffTrigger;
  handoffType: "native_handoff";
};

type PdfNativeHandoffConsolePayload = {
  sessionId: string;
  documentType: PdfNativeHandoffAsset["documentType"];
  originModule: PdfNativeHandoffAsset["originModule"];
  uri: string;
  sourceKind?: PdfNativeHandoffAsset["sourceKind"];
  scheme?: string | null;
  trigger: PdfNativeHandoffTrigger;
  error?: string;
};

type PdfNativeHandoffBreadcrumbPayload = {
  uri: string;
  uriKind: string | null;
  sourceKind: PdfNativeHandoffAsset["sourceKind"];
  fileSizeBytes: number | undefined;
  fileExists: boolean | null;
  previewPath: "native_handoff";
  errorMessage?: string;
  terminalState?: "success" | "error";
  extra: PdfNativeHandoffExtra;
};

type PdfNativeHandoffCriticalPathPayload = {
  event: "pdf_render_start";
  screen: PdfNativeHandoffAsset["originModule"] | string;
  sourceKind: PdfNativeHandoffAsset["sourceKind"];
  documentType: PdfNativeHandoffAsset["documentType"];
  originModule: PdfNativeHandoffAsset["originModule"];
  entityId: PdfNativeHandoffAsset["entityId"];
  fileName: string;
  sessionId: string;
  openToken: string;
  uri: string;
  uriKind: string | null;
  previewPath: "native_handoff";
  extra: PdfNativeHandoffExtra;
};

type PdfNativeHandoffOpenPreviewCommand = {
  uri: string;
  fileName: string;
};

export type PdfNativeHandoffDuplicateSkipCommandPlan = {
  action: "record_duplicate_skip";
  trigger: "primary";
  console: {
    label: "[pdf-viewer] native_handoff_duplicate_skipped";
    payload: PdfNativeHandoffConsolePayload;
  };
  breadcrumb: {
    marker: "native_open_duplicate_skipped";
    payload: PdfNativeHandoffBreadcrumbPayload;
  };
};

export type PdfNativeHandoffStartCommandPlan = {
  action: "start";
  trigger: PdfNativeHandoffTrigger;
  commands: typeof PDF_NATIVE_HANDOFF_PRE_OPEN_COMMANDS;
  console: {
    label: "[pdf-viewer] native_handoff_start";
    payload: PdfNativeHandoffConsolePayload;
  };
  breadcrumb: {
    marker: "native_open_start";
    payload: PdfNativeHandoffBreadcrumbPayload;
  };
  criticalPath: PdfNativeHandoffCriticalPathPayload;
  openPreview: PdfNativeHandoffOpenPreviewCommand;
};

export type PdfNativeHandoffSuccessTelemetryPlan = {
  action: "record_success";
  trigger: PdfNativeHandoffTrigger;
  console: {
    label: "[pdf-viewer] native_handoff_ready";
    payload: PdfNativeHandoffConsolePayload;
  };
  breadcrumb: {
    marker: "native_open_success";
    payload: PdfNativeHandoffBreadcrumbPayload;
  };
};

export type PdfNativeHandoffErrorCommandPlan = {
  action: "commit_error";
  trigger: PdfNativeHandoffTrigger;
  commands: typeof PDF_NATIVE_HANDOFF_ERROR_COMMANDS;
  console: {
    label: "[pdf-viewer] native_handoff_error";
    payload: PdfNativeHandoffConsolePayload;
  };
  breadcrumb: {
    marker: "native_open_error";
    payload: PdfNativeHandoffBreadcrumbPayload;
  };
  terminalError: {
    message: string;
    phase: "render";
  };
};

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

export function resolvePdfNativeHandoffDuplicateSkipCommandPlan(args: {
  startPlan: Extract<PdfNativeHandoffStartPlan, { action: "record_duplicate_skip" }>;
  asset: PdfNativeHandoffAsset;
  context: PdfNativeHandoffCommandContext;
}): PdfNativeHandoffDuplicateSkipCommandPlan {
  const extra = buildNativeHandoffExtra(args.startPlan.trigger);
  return {
    action: "record_duplicate_skip",
    trigger: args.startPlan.trigger,
    console: {
      label: "[pdf-viewer] native_handoff_duplicate_skipped",
      payload: buildConsolePayload({
        asset: args.asset,
        context: args.context,
        trigger: args.startPlan.trigger,
      }),
    },
    breadcrumb: {
      marker: "native_open_duplicate_skipped",
      payload: buildBreadcrumbPayload({ asset: args.asset, context: args.context, extra }),
    },
  };
}

export function resolvePdfNativeHandoffStartCommandPlan(args: {
  startPlan: Extract<PdfNativeHandoffStartPlan, { action: "start" }>;
  asset: PdfNativeHandoffAsset;
  context: PdfNativeHandoffCommandContext;
}): PdfNativeHandoffStartCommandPlan {
  const extra = buildNativeHandoffExtra(args.startPlan.trigger);
  return {
    action: "start",
    trigger: args.startPlan.trigger,
    commands: args.startPlan.commands,
    console: {
      label: "[pdf-viewer] native_handoff_start",
      payload: buildConsolePayload({
        asset: args.asset,
        context: args.context,
        trigger: args.startPlan.trigger,
        scheme: args.context.uriKind,
      }),
    },
    breadcrumb: {
      marker: "native_open_start",
      payload: buildBreadcrumbPayload({ asset: args.asset, context: args.context, extra }),
    },
    criticalPath: {
      event: "pdf_render_start",
      screen: args.asset.originModule ?? args.context.diagnosticsScreen ?? "pdf_viewer",
      sourceKind: args.asset.sourceKind,
      documentType: args.asset.documentType,
      originModule: args.asset.originModule,
      entityId: args.asset.entityId,
      fileName: args.asset.fileName,
      sessionId: args.context.sessionId,
      openToken: args.context.openToken,
      uri: args.asset.uri,
      uriKind: args.context.uriKind,
      previewPath: "native_handoff",
      extra,
    },
    openPreview: {
      uri: args.asset.uri,
      fileName: args.asset.fileName,
    },
  };
}

export function resolvePdfNativeHandoffSuccessTelemetryPlan(args: {
  asset: PdfNativeHandoffAsset;
  context: PdfNativeHandoffCommandContext;
  trigger: PdfNativeHandoffTrigger;
}): PdfNativeHandoffSuccessTelemetryPlan {
  const extra = buildNativeHandoffExtra(args.trigger);
  return {
    action: "record_success",
    trigger: args.trigger,
    console: {
      label: "[pdf-viewer] native_handoff_ready",
      payload: buildConsolePayload({
        asset: args.asset,
        context: args.context,
        trigger: args.trigger,
      }),
    },
    breadcrumb: {
      marker: "native_open_success",
      payload: buildBreadcrumbPayload({
        asset: args.asset,
        context: args.context,
        extra,
        terminalState: "success",
      }),
    },
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

export function resolvePdfNativeHandoffErrorCommandPlan(args: {
  errorPlan: Extract<PdfNativeHandoffErrorCompletionPlan, { action: "commit_error" }>;
  asset: PdfNativeHandoffAsset;
  context: PdfNativeHandoffCommandContext;
}): PdfNativeHandoffErrorCommandPlan {
  const extra = buildNativeHandoffExtra(args.errorPlan.trigger);
  return {
    action: "commit_error",
    trigger: args.errorPlan.trigger,
    commands: args.errorPlan.commands,
    console: {
      label: "[pdf-viewer] native_handoff_error",
      payload: buildConsolePayload({
        asset: args.asset,
        context: args.context,
        trigger: args.errorPlan.trigger,
        error: args.errorPlan.message,
      }),
    },
    breadcrumb: {
      marker: "native_open_error",
      payload: buildBreadcrumbPayload({
        asset: args.asset,
        context: args.context,
        errorMessage: args.errorPlan.message,
        extra,
        terminalState: "error",
      }),
    },
    terminalError: {
      message: args.errorPlan.message,
      phase: "render",
    },
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

function buildNativeHandoffExtra(
  trigger: PdfNativeHandoffTrigger,
): PdfNativeHandoffExtra {
  return {
    trigger,
    handoffType: "native_handoff",
  };
}

function buildConsolePayload(args: {
  asset: PdfNativeHandoffAsset;
  context: PdfNativeHandoffCommandContext;
  trigger: PdfNativeHandoffTrigger;
  scheme?: string | null;
  error?: string;
}): PdfNativeHandoffConsolePayload {
  return {
    sessionId: args.context.sessionId,
    documentType: args.asset.documentType,
    originModule: args.asset.originModule,
    uri: args.asset.uri,
    ...(args.scheme === undefined ? {} : { scheme: args.scheme }),
    sourceKind: args.asset.sourceKind,
    trigger: args.trigger,
    ...(args.error === undefined ? {} : { error: args.error }),
  };
}

function buildBreadcrumbPayload(args: {
  asset: PdfNativeHandoffAsset;
  context: PdfNativeHandoffCommandContext;
  errorMessage?: string;
  extra: PdfNativeHandoffExtra;
  terminalState?: "success" | "error";
}): PdfNativeHandoffBreadcrumbPayload {
  return {
    uri: args.asset.uri,
    uriKind: args.context.uriKind,
    sourceKind: args.asset.sourceKind,
    fileSizeBytes: args.asset.sizeBytes,
    fileExists: typeof args.asset.sizeBytes === "number" ? true : null,
    previewPath: "native_handoff",
    ...(args.errorMessage === undefined ? {} : { errorMessage: args.errorMessage }),
    ...(args.terminalState === undefined ? {} : { terminalState: args.terminalState }),
    extra: args.extra,
  };
}
