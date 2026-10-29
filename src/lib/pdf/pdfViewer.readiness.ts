import type { DocumentAsset, DocumentSession } from "../documents/pdfDocumentSessions";
import { resolvePdfViewerBootstrapPlan, type PdfViewerBootstrapPlan } from "./pdfViewerBootstrapPlan";
import {
  resolvePdfViewerResolution,
  resolvePdfViewerState,
  type PdfViewerPlatform,
  type PdfViewerResolution,
  type PdfViewerState,
} from "./pdfViewerContract";

import type {WebPdfPreviewRestoreReason} from '../documents/pdfWebPreviewCache';
import type {CanonicalPdfRecoveryResult} from '../documents/pdfCanonicalWebPreviewPersistence';
export type PdfViewerRecoveryReason=WebPdfPreviewRestoreReason|Extract<CanonicalPdfRecoveryResult,{recovered:false}>['reason'];

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
  | { kind: "empty"; title: string; subtitle: string;allowRecovery:boolean }
  | {
      kind: "error";
      title: string;
      subtitle: string;
      allowOpenExternal: boolean;
      allowRetry: boolean;
      retryLabel?: string;
    }
  | { kind: "missing-asset"; title: string; subtitle: string;allowRecovery:boolean }
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
  retryRequiresRecreation?: boolean;
  canRecoverCanonical?:boolean;
  recoveryReason?:PdfViewerRecoveryReason|null;
}): PdfViewerContentModel {
  const fallback = resolvePdfViewerFallbackEligibility({
    asset: args.asset,
    resolvedSource: args.resolvedSource,
  });

  if (args.state === "empty") {
    return {
      kind: "empty",
      title: "Просмотр PDF недоступен",
      subtitle: ['AUTHORIZATION_UNAVAILABLE','AUTHORIZATION_CHANGED','ACCESS_DENIED'].includes(args.recoveryReason??'')
        ?'Не удалось подтвердить доступ к сохранённой версии. Проверьте вход и откройте документ снова.'
        :'Этот просмотр больше недоступен. Откройте документ снова из той же сохранённой версии сметы.',
      allowRecovery:args.canRecoverCanonical===true,
    };
  }

  if (args.state === "error") {
    return {
      kind: "error",
      title: "Не удалось открыть PDF",
      subtitle: args.errorText || "Не удалось загрузить просмотр сохранённого документа.",
      allowOpenExternal: fallback.canOpenExternally,
      allowRetry: fallback.canRetry,
      retryLabel:args.canRecoverCanonical?"Открыть сохранённую версию":args.retryRequiresRecreation||!args.asset?"Вернуться к смете":"Повторить",
    };
  }

  if (args.resolvedSource.kind === "missing-asset") {
    if (args.state === "loading" && !args.isReadyToRender) {
      return { kind: "loading" };
    }
    return {
      kind: "missing-asset",
      title: "Просмотр PDF недоступен",
      subtitle: "Файл этого просмотра недоступен. Откройте документ из сохранённой версии сметы.",
      allowRecovery:args.canRecoverCanonical===true,
    };
  }

  if (args.resolvedSource.kind === "preparing-asset") {
    return { kind: "loading" };
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
      title: "Не удалось открыть PDF",
      subtitle:
        args.resolvedSource.kind === "unsupported-mobile-source"
          ? args.resolvedSource.errorMessage
          : "Не удалось загрузить просмотр сохранённого документа.",
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
      title: "Просмотр PDF недоступен",
      subtitle: "Файл этого просмотра недоступен. Откройте документ из сохранённой версии сметы.",
      allowRecovery:args.canRecoverCanonical===true,
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
