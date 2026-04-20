import type { PdfViewerPlatform } from "./pdfViewerContract";

export const PDF_VIEWER_WEB_IFRAME_READY_FALLBACK_MS = 180;

export type PdfViewerWebIframeReadyFallbackPlan =
  | {
      action: "schedule_ready_fallback";
      delayMs: number;
      reason: "web_remote_pdf_iframe_load_unreliable";
    }
  | {
      action: "skip_ready_fallback";
      reason: "non_web_platform" | "non_remote_source" | "missing_render_uri";
    };

export function resolvePdfViewerWebIframeReadyFallbackPlan(args: {
  platform: PdfViewerPlatform;
  sourceKind?: string | null;
  renderUri?: string | null;
}): PdfViewerWebIframeReadyFallbackPlan {
  if (args.platform !== "web") {
    return { action: "skip_ready_fallback", reason: "non_web_platform" };
  }
  if (args.sourceKind !== "remote-url") {
    return { action: "skip_ready_fallback", reason: "non_remote_source" };
  }
  if (!String(args.renderUri || "").trim()) {
    return { action: "skip_ready_fallback", reason: "missing_render_uri" };
  }
  return {
    action: "schedule_ready_fallback",
    delayMs: PDF_VIEWER_WEB_IFRAME_READY_FALLBACK_MS,
    reason: "web_remote_pdf_iframe_load_unreliable",
  };
}
