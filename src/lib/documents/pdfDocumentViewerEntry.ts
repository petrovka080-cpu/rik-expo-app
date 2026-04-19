import { router as rootRouter, type Href } from "expo-router";
import { InteractionManager, Platform } from "react-native";

export type PdfViewerRouterLike = {
  push: (href: Href, options?: unknown) => void;
  replace?: (href: Href, options?: unknown) => void;
};

function toSafeRouteParam(value: unknown) {
  return String(value ?? "").trim();
}

export function createPdfDocumentViewerHref(sessionId: unknown, openToken: unknown) {
  const safeSessionId = toSafeRouteParam(sessionId);
  const safeOpenToken = toSafeRouteParam(openToken);
  if (!safeSessionId) {
    throw new Error("PDF viewer navigation requires a non-empty sessionId");
  }
  return {
    safeSessionId,
    safeOpenToken,
    href: `/pdf-viewer?sessionId=${encodeURIComponent(safeSessionId)}&openToken=${encodeURIComponent(safeOpenToken)}` as Href,
  };
}

export async function pushPdfDocumentViewerRouteSafely(
  router: PdfViewerRouterLike,
  href: Href,
  onBeforeNavigate?: (() => void | Promise<void>) | null,
) {
  if (__DEV__) console.info("[pdf-document-actions] viewer_patch_v3_navigation_call", {
    href: String(href),
    platform: Platform.OS,
    patchVersion: "v3",
  });
  if (__DEV__) console.info("[pdf-document-actions] viewer_route_push_pre_schedule", {
    href: String(href),
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
        if (__DEV__) console.info("[pdf-document-actions] viewer_route_replace_start", {
          href: String(href),
          platform: Platform.OS,
          method: Platform.OS === "ios" ? "push" : "replace",
        });
        if (Platform.OS === "ios") {
          if (typeof rootRouter?.push === "function") {
            rootRouter.push(href);
          } else {
            router.push(href);
          }
        } else if (typeof rootRouter?.replace === "function") {
          rootRouter.replace(href);
        } else if (typeof router.replace === "function") {
          router.replace(href);
        } else {
          router.push(href);
        }
        if (__DEV__) console.info("[pdf-document-actions] viewer_route_replace_done", {
          href: String(href),
          platform: Platform.OS,
        });
        resolve();
      } catch (error) {
        if (__DEV__) console.error("[pdf-document-actions] viewer_route_replace_crash", {
          href: String(href),
          platform: Platform.OS,
          errorName: error instanceof Error ? error.name : undefined,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        reject(error);
      }
    };
    // L-PERF: Only wait for InteractionManager when a modal dismiss was triggered.
    if (hadModalDismiss && typeof InteractionManager?.runAfterInteractions === "function") {
      InteractionManager.runAfterInteractions(() => {
        if (Platform.OS === "android" && hadModalDismiss) {
          setTimeout(runPush, 80);
        } else {
          runPush();
        }
      });
    } else {
      Promise.resolve().then(runPush).catch(reject);
    }
  });
}
