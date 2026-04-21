import { resolvePdfDocumentOpenFlowStartPlan } from "./pdfDocumentOpenFlowPlan";
import { resolvePdfDocumentPreviewSessionPlan } from "./pdfDocumentPreviewSessionPlan";
import {
  resolvePdfDocumentBusyExecutionPlan,
  resolvePdfDocumentBusyRunOutputPlan,
  resolvePdfDocumentManualBusyCleanupPlan,
  resolvePdfDocumentVisibilityFailureRecordPlan,
  resolvePdfDocumentVisibilityFailureSignalPlan,
  resolvePdfDocumentVisibilityStartPlan,
  resolvePdfDocumentVisibilitySuccessPlan,
} from "./pdfDocumentVisibilityBusyPlan";

export type PdfDocumentActionKind =
  | "prepare"
  | "preview"
  | "share"
  | "external_open";

export type PdfDocumentPreviewMode =
  | "in_memory_remote_session"
  | "session_viewer_contract"
  | "direct_preview";

export function resolvePdfDocumentActionKindPlan(
  action: PdfDocumentActionKind,
): {
  action: PdfDocumentActionKind;
} {
  return {
    action,
  };
}

export function resolvePdfDocumentPreviewModePlan(args: {
  platform: string;
  sourceKind?: string | null;
  hasRouter: boolean;
}): {
  mode: PdfDocumentPreviewMode;
  fallbackEligible: boolean;
} {
  const sessionPlan = resolvePdfDocumentPreviewSessionPlan(args);
  if (sessionPlan.action === "use_in_memory_remote_session") {
    return {
      mode: "in_memory_remote_session",
      fallbackEligible: false,
    };
  }

  if (args.hasRouter) {
    return {
      mode: "session_viewer_contract",
      fallbackEligible: false,
    };
  }

  return {
    mode: "direct_preview",
    fallbackEligible: true,
  };
}

export function resolvePdfDocumentOpenFlowStartActionPlan(args: {
  flowKey?: string | null;
  existingRunId?: string | null;
  existingStartedAt?: number | null;
  existingTimestamp?: number | null;
  nowMs: number;
  maxTtlMs: number;
}) {
  return resolvePdfDocumentOpenFlowStartPlan(args);
}

export function resolvePdfDocumentVisibilityStartActionPlan(args: {
  hasRouter: boolean;
}) {
  return resolvePdfDocumentVisibilityStartPlan(args);
}

export function resolvePdfDocumentVisibilitySuccessActionPlan(args: {
  hasVisibilityWait: boolean;
}) {
  return resolvePdfDocumentVisibilitySuccessPlan(args);
}

export function resolvePdfDocumentVisibilityFailureSignalActionPlan(args: {
  visibilityToken?: string | null;
}) {
  return resolvePdfDocumentVisibilityFailureSignalPlan(args);
}

export function resolvePdfDocumentVisibilityFailureRecordActionPlan(args: {
  signalledFailure: boolean;
}) {
  return resolvePdfDocumentVisibilityFailureRecordPlan(args);
}

export function resolvePdfDocumentBusyExecutionActionPlan(args: {
  hasBusyRun: boolean;
  hasBusyShow: boolean;
  hasBusyHide: boolean;
  flowKey: string;
  label?: string;
}) {
  return resolvePdfDocumentBusyExecutionPlan(args);
}

export function resolvePdfDocumentBusyRunOutputActionPlan(args: {
  hasOutput: boolean;
}) {
  return resolvePdfDocumentBusyRunOutputPlan(args);
}

export function resolvePdfDocumentManualBusyCleanupActionPlan(args: {
  isBusy: boolean;
}) {
  return resolvePdfDocumentManualBusyCleanupPlan(args);
}
