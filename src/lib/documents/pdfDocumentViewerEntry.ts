import { router as rootRouter, type Href } from "expo-router";
import { InteractionManager, Platform } from "react-native";
import { registerTimeout } from "../lifecycle/timerRegistry";
import { logger } from "../logger";
import { normalizePostAuthReturnTo } from "../authRouting";
import { redactSensitiveText } from "../security/redaction";
import {parseCanonicalPdfRecoveryReference,type CanonicalPdfRecoveryReference} from "./pdfDocument";

export type PdfViewerRouterLike = {
  push: (href: Href, options?: unknown) => void;
  replace?: (href: Href, options?: unknown) => void;
};

function shouldLogPdfViewerNavigationDiagnostics() {
  return __DEV__ && process.env.EXPO_PUBLIC_RIK_DEBUG_PDF_LOGS === "1";
}

function logPdfViewerNavigationInfo(event: string, payload: Record<string, unknown>) {
  if (!shouldLogPdfViewerNavigationDiagnostics()) return;

  logger.info("pdf-document-actions", event, payload);
}

function toSafeRouteParam(value: unknown) {
  return String(value ?? "").trim();
}

export function createPdfDocumentViewerHref(
  sessionId: unknown,
  openToken: unknown,
  returnTo?: unknown,
  callerRouteKey?: unknown,
  canonicalRecovery?:CanonicalPdfRecoveryReference|null,
) {
  const safeSessionId = toSafeRouteParam(sessionId);
  const safeOpenToken = toSafeRouteParam(openToken);
  const safeReturnTo = normalizePostAuthReturnTo(toSafeRouteParam(returnTo));
  if (!safeSessionId) {
    throw new Error("PDF viewer navigation requires a non-empty sessionId");
  }
  const returnToQuery = safeReturnTo
    ? `&returnTo=${encodeURIComponent(safeReturnTo)}`
    : "";
  const safeCallerRouteKey = toSafeRouteParam(callerRouteKey);
  const callerQuery = safeCallerRouteKey
    ? `&callerRouteKey=${encodeURIComponent(safeCallerRouteKey)}`
    : "";
  const recovery=canonicalRecovery==null?null:parseCanonicalPdfRecoveryReference(canonicalRecovery);
  if(canonicalRecovery!=null&&!recovery)throw new Error("Invalid canonical PDF recovery reference");
  const recoveryQuery=recovery?`&canonicalRecovery=${encodeURIComponent(JSON.stringify(recovery))}`:"";
  return {
    safeSessionId,
    safeOpenToken,
    safeReturnTo,
    href: `/pdf-viewer?sessionId=${encodeURIComponent(safeSessionId)}&openToken=${encodeURIComponent(safeOpenToken)}${returnToQuery}${callerQuery}${recoveryQuery}` as Href,
  };
}

export async function pushPdfDocumentViewerRouteSafely(
  router: PdfViewerRouterLike,
  href: Href,
  onBeforeNavigate?: (() => void | Promise<void>) | null,
) {
  const hrefForDiagnostics = redactSensitiveText(String(href).replace(/([?&]canonicalRecovery=)[^&]*/gu,"$1[locator]"));
  logPdfViewerNavigationInfo("viewer_patch_v3_navigation_call", {
    href: hrefForDiagnostics,
    platform: Platform.OS,
    patchVersion: "v3",
  });
  logPdfViewerNavigationInfo("viewer_route_push_pre_schedule", {
    href: hrefForDiagnostics,
    platform: Platform.OS,
  });
  const hadModalDismiss = typeof onBeforeNavigate === "function";
  if (hadModalDismiss) {
    try {
      await Promise.resolve(onBeforeNavigate());
    } catch (error) {
      if (__DEV__) console.warn("[pdf-document-actions] onBeforeNavigate error (non-fatal)", error);
    }
  }
  await new Promise<void>((resolve, reject) => {
    const runPush = () => {
      try {
        logPdfViewerNavigationInfo("viewer_route_replace_start", {
          href: hrefForDiagnostics,
          platform: Platform.OS,
          method: "push",
        });
        // Preserve the caller in the Android router stack. Replacing it made
        // the native PDF handoff depend entirely on an in-memory viewer route;
        // after activity/process recreation the user could return to launcher
        // instead of the estimate that opened the document.
        if (typeof rootRouter?.push === "function") {
          rootRouter.push(href);
        } else {
          router.push(href);
        }
        logPdfViewerNavigationInfo("viewer_route_replace_done", {
          href: hrefForDiagnostics,
          platform: Platform.OS,
        });
        resolve();
      } catch (error) {
        if (__DEV__) console.error("[pdf-document-actions] viewer_route_replace_crash", {
          href: hrefForDiagnostics,
          platform: Platform.OS,
          errorName: error instanceof Error ? error.name : undefined,
          errorMessage: redactSensitiveText(error instanceof Error ? error.message : String(error)),
        });
        reject(error);
      }
    };
    // L-PERF: Only wait for InteractionManager when a modal dismiss was triggered.
    if (hadModalDismiss && typeof InteractionManager?.runAfterInteractions === "function") {
      InteractionManager.runAfterInteractions(() => {
        if (Platform.OS === "android" && hadModalDismiss) {
          registerTimeout("pdf-viewer:android-modal-dismiss-push", runPush, 80);
        } else {
          runPush();
        }
      });
    } else {
      Promise.resolve().then(runPush).catch(reject);
    }
  });
}
