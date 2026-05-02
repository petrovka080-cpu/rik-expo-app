import type { DocumentAsset } from "../documents/pdfDocumentSessions";
import { resolvePdfViewerBootstrapPlan } from "./pdfViewerBootstrapPlan";
import type { PdfViewerPlatform, PdfViewerResolution } from "./pdfViewerContract";

export type PdfViewerHandoffPlan =
  | { action: "show_empty" }
  | { action: "show_loading" }
  | {
      action: "show_error";
      reason: "session_error" | "missing_asset" | "unsupported_mobile_source";
      errorMessage: string;
    }
  | {
      action: "start_native_handoff";
      asset: DocumentAsset;
      trigger: "primary";
    }
  | {
      action: "show_web_remote_iframe";
      asset: DocumentAsset;
      renderUri: string;
      sourceKind: DocumentAsset["sourceKind"];
    }
  | {
      action: "show_embedded_render";
      asset: DocumentAsset;
      renderUri: string | null;
      sourceKind: DocumentAsset["sourceKind"];
      renderer: "web-frame" | "native-webview";
      shouldValidateEmbeddedPreview: boolean;
    };

export type PdfViewerManualHandoffPlan =
  | {
      action: "reopen_native_handoff";
      asset: DocumentAsset;
      trigger: "manual";
    }
  | { action: "blocked"; reason: "not_in_native_handoff" };

export function resolvePdfViewerHandoffPlan(args: {
  resolution: PdfViewerResolution;
  platform: PdfViewerPlatform;
}): PdfViewerHandoffPlan {
  const bootstrapPlan = resolvePdfViewerBootstrapPlan({
    resolution: args.resolution,
    platform: args.platform,
  });

  switch (bootstrapPlan.action) {
    case "show_empty":
      return { action: "show_empty" };
    case "show_loading":
      return { action: "show_loading" };
    case "show_session_error":
      return {
        action: "show_error",
        reason: "session_error",
        errorMessage: bootstrapPlan.errorMessage,
      };
    case "show_missing_asset":
      return {
        action: "show_error",
        reason: "missing_asset",
        errorMessage: bootstrapPlan.errorMessage,
      };
    case "fail_resolution":
      return {
        action: "show_error",
        reason: "unsupported_mobile_source",
        errorMessage: bootstrapPlan.errorMessage,
      };
    case "start_native_handoff":
      return {
        action: "start_native_handoff",
        asset: bootstrapPlan.resolution.asset,
        trigger: "primary",
      };
    case "show_web_remote_iframe":
      return {
        action: "show_web_remote_iframe",
        asset: bootstrapPlan.resolution.asset,
        renderUri: bootstrapPlan.webRenderUri,
        sourceKind: bootstrapPlan.resolution.sourceKind,
      };
    case "show_embedded_render":
      return {
        action: "show_embedded_render",
        asset: bootstrapPlan.resolution.asset,
        renderUri: bootstrapPlan.webRenderUri,
        sourceKind: bootstrapPlan.resolution.sourceKind,
        renderer: bootstrapPlan.resolution.renderer,
        shouldValidateEmbeddedPreview:
          bootstrapPlan.shouldValidateEmbeddedPreview,
      };
  }
}

export function resolvePdfViewerManualHandoffPlan(args: {
  resolution: PdfViewerResolution;
}): PdfViewerManualHandoffPlan {
  if (args.resolution.kind !== "resolved-native-handoff") {
    return {
      action: "blocked",
      reason: "not_in_native_handoff",
    };
  }

  return {
    action: "reopen_native_handoff",
    asset: args.resolution.asset,
    trigger: "manual",
  };
}
