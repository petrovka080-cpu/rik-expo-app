import type { DocumentDescriptor } from "./pdfDocument";
import {
  beginPdfOpenVisibilityWait,
  createPdfOpenFlowContext,
  failPdfOpenVisible,
  recordPdfOpenStage,
} from "../pdf/pdfOpenFlow";
import {
  recordPdfCrashBreadcrumb,
  shouldRecordPdfCrashBreadcrumbs,
} from "../pdf/pdfCrashBreadcrumbs";
import {
  createPdfActionBoundaryKey,
  createPdfActionBoundaryRun,
  recordPdfActionBoundaryEvent,
  toPdfActionBoundaryError,
} from "../pdf/pdfActionBoundary";
import {
  resolvePdfDocumentOpenFlowCleanupPlan,
  resolvePdfDocumentOpenFlowStartPlan,
} from "./pdfDocumentOpenFlowPlan";
import {
  resolvePdfDocumentBusyExecutionPlan,
  resolvePdfDocumentBusyRunOutputPlan,
  resolvePdfDocumentManualBusyCleanupPlan,
  resolvePdfDocumentVisibilityFailureRecordPlan,
  resolvePdfDocumentVisibilityFailureSignalPlan,
  resolvePdfDocumentVisibilityStartPlan,
  resolvePdfDocumentVisibilitySuccessPlan,
} from "./pdfDocumentVisibilityBusyPlan";
import { extractUriScheme } from "./pdfDocumentActionPreconditions";
import {
  getPdfFlowErrorMessage as getPdfFlowErrorMessageInternal,
} from "./pdfDocumentActionError";
import { traceAsync } from "../observability/sentry";
import type {
  PersistCriticalPdfBreadcrumbInput,
  PreparePdfDocumentArgs,
  PreviewPdfDocumentOpts,
} from "./pdfDocumentActionTypes";
import { executeOpenPdfDocumentExternal } from "./pdfDocumentExternalOpenAction";
import { executePreparePdfDocument } from "./pdfDocumentPrepareAction";
import {
  createPreparingPdfDocumentViewerSession,
  executePreviewPdfDocument,
  failPreparingPdfDocumentViewerSession,
  getPdfViewerSessionErrorMessage,
  materializePreparingPdfDocumentViewerSession,
} from "./pdfDocumentPreviewAction";
import { executeSharePdfDocument } from "./pdfDocumentShareAction";
import {
  createPdfDocumentViewerHref,
  pushPdfDocumentViewerRouteSafely,
  type PdfViewerRouterLike,
} from "./pdfDocumentViewerEntry";

type ActivePreviewFlow = {
  promise: Promise<DocumentDescriptor>;
  runId: string;
  startedAt: number;
};

const activePreviewFlows = new Map<string, ActivePreviewFlow>();
// D-MODAL-PDF: Track when each flow started so we can expire abandoned entries.
// If a flow promise is leaked (e.g., component unmounts during PDF generation),
// future opens of the same key would be blocked forever. 60s TTL prevents this.
const activePreviewFlowTimestamps = new Map<string, number>();
const ACTIVE_FLOW_MAX_TTL_MS = 60_000;
let pdfActionRunSeq = 0;
const latestPreviewRunByKey = new Map<string, string>();

export type { PdfViewerRouterLike } from "./pdfDocumentViewerEntry";

function nextPdfActionRunId(): string {
  pdfActionRunSeq += 1;
  return `pdf-action-${Date.now()}-${pdfActionRunSeq}`;
}

function assertCurrentPdfActionRun(
  flowKey: string,
  runId: string,
  stage: "prepare" | "viewer_entry" | "visibility",
): void {
  if (latestPreviewRunByKey.get(flowKey) === runId) return;
  throw toPdfActionBoundaryError(
    new Error(`Stale PDF action result ignored for ${flowKey}`),
    stage,
    "Stale PDF action result ignored",
  );
}

function persistCriticalPdfBreadcrumb(
  input: PersistCriticalPdfBreadcrumbInput,
): void {
  if (!shouldRecordPdfCrashBreadcrumbs(input.screen)) return;
  // L-PERF: fire-and-forget breadcrumbs must NOT block the critical open path.
  // Previously each await did 2 AsyncStorage I/O ops (read+write), and 6 sequential
  // awaits on the critical path added 12 I/O ops before the viewer route push.
  recordPdfCrashBreadcrumb(input);
}

export function getPdfFlowErrorMessage(
  error: unknown,
  fallback = "Не удалось открыть PDF",
): string {
  return getPdfFlowErrorMessageInternal(error, fallback);
}

export async function preparePdfDocument(
  args: PreparePdfDocumentArgs,
): Promise<DocumentDescriptor> {
  return await executePreparePdfDocument(args);
}

export async function previewPdfDocument(
  doc: DocumentDescriptor,
  opts?: PreviewPdfDocumentOpts,
): Promise<void> {
  return await executePreviewPdfDocument(doc, opts, {
    persistCriticalPdfBreadcrumb,
  });
}

export async function sharePdfDocument(doc: DocumentDescriptor): Promise<void> {
  return await executeSharePdfDocument(doc);
}

export async function prepareAndPreviewPdfDocument(
  args: PreparePdfDocumentArgs & {
    router?: PdfViewerRouterLike;
    /** Optional earlier tap timestamp used when descriptor/source creation happens before this boundary. */
    openFlowStartedAt?: number | null;
    /** Called before router.push to dismiss native Modals that sit above the navigation Stack. */
    onBeforeNavigate?: (() => void | Promise<void>) | null;
  },
): Promise<DocumentDescriptor> {
  const descriptorUri =
    args.descriptor.uri ?? args.descriptor.fileSource?.uri ?? null;
  const flowKey = createPdfActionBoundaryKey({
    key: args.key,
    documentType: args.descriptor.documentType,
    originModule: args.descriptor.originModule,
    entityId: args.descriptor.entityId ?? null,
    fileName: args.descriptor.fileName,
    uri: descriptorUri,
  });
  const runId = nextPdfActionRunId();
  const boundaryRun = createPdfActionBoundaryRun({
    runId,
    key: flowKey,
    label: args.label,
    documentType: args.descriptor.documentType,
    originModule: args.descriptor.originModule,
    entityId: args.descriptor.entityId ?? null,
    fileName: args.descriptor.fileName,
  });
  const baseContext = createPdfOpenFlowContext({
    key: flowKey,
    label: args.label,
    fileName: args.descriptor.fileName,
    entityId: args.descriptor.entityId ?? null,
    documentType: args.descriptor.documentType,
    originModule: args.descriptor.originModule,
    startedAt: args.openFlowStartedAt,
  });
  const recordBoundary = (
    event: string,
    stage: "access" | "prepare" | "viewer_entry" | "visibility",
    result: "success" | "error" | "joined_inflight" = "success",
    error?: unknown,
    extra?: Record<string, unknown>,
  ) => {
    recordPdfActionBoundaryEvent({
      run: boundaryRun,
      event,
      stage,
      result,
      sourceKind: args.descriptor.fileSource?.kind ?? "pdf:document",
      error,
      extra,
    });
  };

  if (flowKey) {
    const existing = activePreviewFlows.get(flowKey);
    const existingTs = activePreviewFlowTimestamps.get(flowKey) ?? existing?.startedAt ?? 0;
    const startPlan = resolvePdfDocumentOpenFlowStartPlan({
      flowKey,
      existingRunId: existing?.runId,
      existingStartedAt: existing?.startedAt,
      existingTimestamp: existingTs,
      nowMs: Date.now(),
      maxTtlMs: ACTIVE_FLOW_MAX_TTL_MS,
    });
    if (startPlan.action === "join_existing" && existing) {
      recordPdfOpenStage({
        context: baseContext,
        stage: "tap_start",
        result: "joined_inflight",
        extra: {
          guardReason: startPlan.guardReason,
        },
      });
      recordBoundary("pdf_action_started", "access", "joined_inflight", undefined, {
        duplicateStrategy: "join_inflight",
        joinedRunId: startPlan.joinedRunId,
      });
      return await existing.promise;
    }
    // D-MODAL-PDF: Stale flow entry (abandoned promise or TTL expired) — clean
    // up and proceed with a fresh open rather than blocking indefinitely.
    if (startPlan.action === "start_new" && startPlan.clearExisting) {
      activePreviewFlows.delete(flowKey);
      activePreviewFlowTimestamps.delete(flowKey);
    }
  }

  latestPreviewRunByKey.set(flowKey, runId);
  const assertCurrentRun = (stage: "prepare" | "viewer_entry" | "visibility") => {
    assertCurrentPdfActionRun(flowKey, runId, stage);
  };

  const runFlow = async () => traceAsync(
    "pdf.viewer.open",
    {
      flow: "pdf_viewer_open",
      platform: "unknown",
      pdf_guard_triggered: Boolean(args.busy?.run || args.busy?.show),
    },
    async () => {
    recordPdfOpenStage({
      context: baseContext,
      stage: "tap_start",
      extra: {
        hasBusyOwner: Boolean(args.busy?.run || args.busy?.show),
      },
    });
    recordBoundary("pdf_action_started", "access", "success", undefined, {
      hasBusyOwner: Boolean(args.busy?.run || args.busy?.show),
    });
    persistCriticalPdfBreadcrumb({
      marker: "tap_start",
      screen: args.descriptor.originModule,
      documentType: args.descriptor.documentType,
      originModule: args.descriptor.originModule,
      sourceKind: args.descriptor.fileSource?.kind ?? null,
      uriKind:
        extractUriScheme(args.descriptor.uri ?? args.descriptor.fileSource?.uri) || null,
      uri: args.descriptor.uri ?? args.descriptor.fileSource?.uri ?? null,
      fileName: args.descriptor.fileName,
      entityId: args.descriptor.entityId,
      previewPath: "document_open_orchestrator",
      extra: {
        hasBusyOwner: Boolean(args.busy?.run || args.busy?.show),
      },
    });

    const execute = async () => {
      recordPdfOpenStage({
        context: baseContext,
        stage: "busy_shown",
      });
      recordPdfOpenStage({
        context: baseContext,
        stage: "document_prepare_start",
      });
      recordBoundary("pdf_access_requested", "access");
      recordBoundary("pdf_document_prepare_started", "prepare");

      const visibilityStartPlan = resolvePdfDocumentVisibilityStartPlan({
        hasRouter: Boolean(args.router),
      });
      const visibilityWait =
        visibilityStartPlan.action === "begin_visibility_wait"
          ? beginPdfOpenVisibilityWait(baseContext)
          : null;
      const earlyViewerSession = args.router
        ? createPreparingPdfDocumentViewerSession(args.descriptor)
        : null;

      if (args.router && earlyViewerSession) {
        const {
          safeSessionId,
          safeOpenToken,
          href: viewerHref,
        } = createPdfDocumentViewerHref(
          earlyViewerSession.session.sessionId,
          visibilityWait?.token,
        );
        recordPdfOpenStage({
          context: baseContext,
          stage: "viewer_route_push_attempt",
          sourceKind: args.descriptor.fileSource?.kind ?? "pdf:document",
          extra: {
            route: "/pdf-viewer",
            sessionId: safeSessionId,
            openToken: safeOpenToken,
            previewPath: "preparing_session_viewer_contract",
            materializationMode: "prepare_then_background_cache",
          },
        });
        recordBoundary("pdf_viewer_entry_started", "viewer_entry");
        await pushPdfDocumentViewerRouteSafely(
          args.router,
          viewerHref,
          args.onBeforeNavigate,
        );
        recordBoundary("pdf_viewer_entry_confirmed", "viewer_entry");
      }

      let document: DocumentDescriptor;
      try {
        document = await preparePdfDocument({
          ...args,
          busy: undefined,
        });
        assertCurrentRun("prepare");
        recordBoundary("pdf_access_resolved", "access", "success", undefined, {
          sourceKind: document.fileSource.kind,
        });
        recordBoundary("pdf_document_prepare_completed", "prepare", "success", undefined, {
          sourceKind: document.fileSource.kind,
        });
      } catch (error) {
        const sessionErrorMessage = getPdfViewerSessionErrorMessage(
          error,
          "PDF document prepare failed",
        );
        const boundaryError = toPdfActionBoundaryError(
          error,
          "prepare",
          "PDF document prepare failed",
        );
        recordPdfOpenStage({
          context: baseContext,
          stage: "document_prepare_fail",
          result: "error",
          sourceKind: args.descriptor.fileSource?.kind ?? "pdf:document",
          error: boundaryError,
          extra: {
            source:
              args.descriptor.uri ?? args.descriptor.fileSource?.uri ?? null,
          },
        });
        recordBoundary("pdf_terminal_failure", "prepare", "error", boundaryError);
        if (earlyViewerSession) {
          failPreparingPdfDocumentViewerSession(
            earlyViewerSession.session.sessionId,
            sessionErrorMessage,
          );
        }
        throw boundaryError;
      }

      try {
        assertCurrentRun("prepare");
        if (earlyViewerSession) {
          await materializePreparingPdfDocumentViewerSession({
            sessionId: earlyViewerSession.session.sessionId,
            doc: document,
          });
        } else {
          await previewPdfDocument(document, {
            router: args.router,
            onBeforeNavigate: args.onBeforeNavigate,
            boundaryRun,
            assertCurrentRun,
            openFlow: visibilityWait
              ? {
                  ...baseContext,
                  openToken: visibilityWait.token,
                }
              : baseContext,
          });
        }
        const visibilitySuccessPlan = resolvePdfDocumentVisibilitySuccessPlan({
          hasVisibilityWait: Boolean(visibilityWait),
        });
        if (visibilitySuccessPlan.action === "await_visibility_wait") {
          await visibilityWait!.promise;
          assertCurrentRun(visibilitySuccessPlan.assertStage);
        } else {
          recordPdfOpenStage({
            context: baseContext,
            stage: visibilitySuccessPlan.stage,
            sourceKind: document.fileSource.kind,
          });
          assertCurrentRun(visibilitySuccessPlan.assertStage);
        }
        recordBoundary("pdf_terminal_success", "visibility", "success", undefined, {
          sourceKind: document.fileSource.kind,
        });
        return document;
      } catch (error) {
        const boundaryError = toPdfActionBoundaryError(
          error,
          "visibility",
          "PDF viewer readiness failed",
        );
        const failureSignalPlan = resolvePdfDocumentVisibilityFailureSignalPlan({
          visibilityToken: visibilityWait?.token,
        });
        const signalledFailure =
          failureSignalPlan.action === "signal_visibility_failure"
            ? failPdfOpenVisible(failureSignalPlan.token, boundaryError, {
                sourceKind: document.fileSource.kind,
              })
            : false;
        const failureRecordPlan = resolvePdfDocumentVisibilityFailureRecordPlan({
          signalledFailure,
        });
        if (failureRecordPlan.recordOpenFailedStage) {
          recordPdfOpenStage({
            context: baseContext,
            stage: "open_failed",
            result: "error",
            sourceKind: document.fileSource.kind,
            error: boundaryError,
          });
        }
        recordBoundary("pdf_terminal_failure", "visibility", "error", boundaryError, {
          sourceKind: document.fileSource.kind,
        });
        throw boundaryError;
      }
    };

    const busyExecutionPlan = resolvePdfDocumentBusyExecutionPlan({
      hasBusyRun: Boolean(args.busy?.run),
      hasBusyShow: Boolean(args.busy?.show),
      hasBusyHide: Boolean(args.busy?.hide),
      flowKey,
      label: args.label,
    });
    try {
      if (busyExecutionPlan.mode === "busy_run" && args.busy?.run) {
        const output = await args.busy.run(execute, {
          key: busyExecutionPlan.key,
          label: busyExecutionPlan.label,
          minMs: busyExecutionPlan.minMs,
        });
        const outputPlan = resolvePdfDocumentBusyRunOutputPlan({
          hasOutput: Boolean(output),
        });
        if (outputPlan.action === "throw_cancelled") {
          throw new Error(outputPlan.message);
        }
        if (!output) {
          throw new Error("PDF action completed without a document descriptor");
        }
        return output;
      }
      if (
        busyExecutionPlan.mode === "manual_busy" &&
        args.busy?.show &&
        args.busy?.hide
      ) {
        const manualBusyKey = busyExecutionPlan.key;
        args.busy.show(manualBusyKey, busyExecutionPlan.label);
        try {
          return await execute();
        } finally {
          const cleanupPlan = resolvePdfDocumentManualBusyCleanupPlan({
            isBusy: Boolean(args.busy.isBusy?.(manualBusyKey)),
          });
          if (cleanupPlan.hideBusy) {
            args.busy.hide(manualBusyKey);
          }
          recordPdfOpenStage({
            context: baseContext,
            stage: "busy_cleared",
          });
        }
      }
      return await execute();
    } finally {
      if (busyExecutionPlan.mode === "busy_run") {
        recordPdfOpenStage({
          context: baseContext,
          stage: "busy_cleared",
        });
      }
    }
    },
  );

  const promise = runFlow().finally(() => {
    if (flowKey) {
      const active = activePreviewFlows.get(flowKey);
      const cleanupPlan = resolvePdfDocumentOpenFlowCleanupPlan({
        flowKey,
        activeRunId: active?.runId,
        latestRunId: latestPreviewRunByKey.get(flowKey),
        currentRunId: runId,
      });
      if (cleanupPlan.clearActiveFlow) {
        activePreviewFlows.delete(flowKey);
        activePreviewFlowTimestamps.delete(flowKey);
      }
      if (cleanupPlan.clearLatestRun) {
        latestPreviewRunByKey.delete(flowKey);
      }
    }
  });

  if (flowKey) {
    const startedAt = Date.now();
    activePreviewFlows.set(flowKey, {
      promise,
      runId,
      startedAt,
    });
    activePreviewFlowTimestamps.set(flowKey, Date.now());
  }

  return await promise;
}

export async function openPdfDocumentExternal(
  doc: DocumentDescriptor,
): Promise<void> {
  return await executeOpenPdfDocumentExternal(doc);
}
