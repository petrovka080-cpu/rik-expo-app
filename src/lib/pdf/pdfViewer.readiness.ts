import type { DocumentAsset, DocumentSession } from "../documents/pdfDocumentSessions";
import { resolvePdfViewerBootstrapPlan, type PdfViewerBootstrapPlan } from "./pdfViewerBootstrapPlan";
import {
  resolvePdfViewerResolution,
  resolvePdfViewerState,
  type PdfViewerPlatform,
  type PdfViewerResolution,
  type PdfViewerState,
} from "./pdfViewerContract";

export type PdfViewerReadinessModel = {
  initialState: PdfViewerState;
  resolvedSource: PdfViewerResolution;
  bootstrapPlan: PdfViewerBootstrapPlan;
  previewPath: string;
};

export type PdfViewerFallbackEligibility = {
  canRetry: boolean;
  canOpenExternally: boolean;
  canShareFromNativeHandoff: boolean;
};

export type PdfViewerContentModel =
  | { kind: "empty"; title: string; subtitle: string }
  | {
      kind: "error";
      title: string;
      subtitle: string;
      allowOpenExternal: boolean;
      allowRetry: boolean;
    }
  | { kind: "missing-asset"; title: string; subtitle: string }
  | {
      kind: "unsupported";
      title: string;
      subtitle: string;
      allowOpenExternal: boolean;
      allowRetry: boolean;
    }
  | { kind: "loading" }
  | { kind: "native-handoff"; allowShare: boolean }
  | { kind: "embedded-web"; showLoadingOverlay: boolean }
  | { kind: "embedded-native"; showLoadingOverlay: boolean };

export type PdfViewerChromeModel = {
  showChrome: boolean;
  headerHeight: number;
  pageIndicatorText: string;
  showPageIndicator: boolean;
};

export function resolvePdfViewerReadinessModel(args: {
  session: DocumentSession | null;
  asset: DocumentAsset | null;
  platform: PdfViewerPlatform;
}): PdfViewerReadinessModel {
  const { session, asset, platform } = args;
  const resolvedSource = resolvePdfViewerResolution({ session, asset, platform });
  return {
    initialState: resolvePdfViewerState(session, asset, platform),
    resolvedSource,
    bootstrapPlan: resolvePdfViewerBootstrapPlan({
      resolution: resolvedSource,
      platform,
    }),
    previewPath:
      resolvedSource.kind === "resolved-embedded"
        ? resolvedSource.renderer
        : resolvedSource.kind,
  };
}

export function resolvePdfViewerFallbackEligibility(args: {
  asset: DocumentAsset | null;
  resolvedSource: PdfViewerResolution;
}): PdfViewerFallbackEligibility {
  return {
    canRetry: true,
    canOpenExternally: Boolean(args.asset),
    canShareFromNativeHandoff:
      args.resolvedSource.kind === "resolved-native-handoff" && Boolean(args.asset),
  };
}

export function resolvePdfViewerTerminalState(args: {
  state: PdfViewerState;
}): "success" | "error" | null {
  if (args.state === "ready") return "success";
  if (args.state === "error") return "error";
  return null;
}

export function resolvePdfViewerContentModel(args: {
  state: PdfViewerState;
  errorText: string;
  asset: DocumentAsset | null;
  resolvedSource: PdfViewerResolution;
  isReadyToRender: boolean;
  hasRenderableSource: boolean;
}): PdfViewerContentModel {
  const fallback = resolvePdfViewerFallbackEligibility({
    asset: args.asset,
    resolvedSource: args.resolvedSource,
  });

  if (args.state === "empty") {
    return {
      kind: "empty",
      title: "Document not found",
      subtitle: "Viewer session was not found or has expired.",
    };
  }

  if (args.state === "error") {
    return {
      kind: "error",
      title: "Unable to open document",
      subtitle: args.errorText || "Preview failed to load.",
      allowOpenExternal: fallback.canOpenExternally,
      allowRetry: fallback.canRetry,
    };
  }

  if (args.resolvedSource.kind === "missing-asset") {
    return {
      kind: "missing-asset",
      title: "Document not found",
      subtitle: "Missing document asset.",
    };
  }

  if (args.resolvedSource.kind !== "resolved-embedded") {
    if (args.resolvedSource.kind === "resolved-native-handoff") {
      return {
        kind: "native-handoff",
        allowShare: fallback.canShareFromNativeHandoff,
      };
    }
    return {
      kind: "unsupported",
      title: "Unable to open document",
      subtitle:
        args.resolvedSource.kind === "unsupported-mobile-source"
          ? args.resolvedSource.errorMessage
          : "Preview failed to load.",
      allowOpenExternal: fallback.canOpenExternally,
      allowRetry: fallback.canRetry,
    };
  }

  if (!args.isReadyToRender) {
    return { kind: "loading" };
  }

  if (!args.hasRenderableSource) {
    return {
      kind: "missing-asset",
      title: "Document not found",
      subtitle: "Missing document asset.",
    };
  }

  if (args.resolvedSource.renderer === "web-frame") {
    return {
      kind: "embedded-web",
      showLoadingOverlay: args.state === "loading",
    };
  }

  return {
    kind: "embedded-native",
    showLoadingOverlay: args.state === "loading",
  };
}

export function resolvePdfViewerChromeModel(args: {
  platform: PdfViewerPlatform;
  width: number;
  topInset: number;
  chromeVisible: boolean;
  state: PdfViewerState;
  asset: DocumentAsset | null;
  resolvedSource: PdfViewerResolution;
}): PdfViewerChromeModel {
  const headerBarHeight = args.platform === "web" || args.width >= 768 ? 56 : 50;
  return {
    showChrome: args.platform === "web" ? true : args.chromeVisible,
    headerHeight: headerBarHeight + (args.platform === "web" ? 0 : args.topInset),
    pageIndicatorText: args.state === "ready" ? "1 / 1" : "…",
    showPageIndicator:
      Boolean(args.asset) && args.resolvedSource.kind === "resolved-embedded",
  };
}
