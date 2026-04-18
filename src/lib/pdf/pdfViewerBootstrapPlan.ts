import type {
  PdfViewerPlatform,
  PdfViewerResolution,
} from "./pdfViewerContract";

type EmbeddedResolution = Extract<PdfViewerResolution, { kind: "resolved-embedded" }>;
type NativeHandoffResolution = Extract<PdfViewerResolution, { kind: "resolved-native-handoff" }>;

export type PdfViewerBootstrapPlan =
  | { action: "show_empty" }
  | { action: "show_session_error"; errorMessage: string }
  | { action: "show_missing_asset"; errorMessage: string }
  | { action: "fail_resolution"; errorMessage: string }
  | {
      action: "start_native_handoff";
      resolution: NativeHandoffResolution;
    }
  | {
      action: "show_web_remote_iframe";
      resolution: EmbeddedResolution;
      webRenderUri: string;
    }
  | {
      action: "show_embedded_render";
      resolution: EmbeddedResolution;
      shouldValidateEmbeddedPreview: boolean;
      webRenderUri: string | null;
    };

export function resolvePdfViewerBootstrapPlan(args: {
  resolution: PdfViewerResolution;
  platform: PdfViewerPlatform;
}): PdfViewerBootstrapPlan {
  const { resolution, platform } = args;

  if (resolution.kind === "missing-session") return { action: "show_empty" };
  if (resolution.kind === "session-error") {
    return {
      action: "show_session_error",
      errorMessage: resolution.errorMessage,
    };
  }
  if (resolution.kind === "missing-asset") {
    return {
      action: "show_missing_asset",
      errorMessage: "Missing document asset.",
    };
  }
  if (resolution.kind === "unsupported-mobile-source") {
    return {
      action: "fail_resolution",
      errorMessage: resolution.errorMessage,
    };
  }
  if (resolution.kind === "resolved-native-handoff") {
    return {
      action: "start_native_handoff",
      resolution,
    };
  }

  if (platform !== "web") {
    return {
      action: "show_embedded_render",
      resolution,
      shouldValidateEmbeddedPreview: true,
      webRenderUri: null,
    };
  }

  if (resolution.sourceKind === "remote-url") {
    return {
      action: "show_web_remote_iframe",
      resolution,
      webRenderUri: resolution.asset.uri,
    };
  }

  return {
    action: "show_embedded_render",
    resolution,
    shouldValidateEmbeddedPreview: false,
    webRenderUri: resolution.asset.uri,
  };
}
