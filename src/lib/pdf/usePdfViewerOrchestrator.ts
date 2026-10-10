import React from "react";

import type {
  DocumentAsset,
  DocumentSession,
} from "../documents/pdfDocumentSessions";
import {
  createPdfNativeHandoffGuardState,
  resetPdfNativeHandoffGuard,
} from "./pdfNativeHandoffGuard";
import type { PdfNativeHandoffGuardState } from "./pdfNativeHandoffGuard";
import {
  createPdfViewerLoadingTimeoutGuardState,
} from "./pdfViewerLoadingTimeoutGuard";
import type { PdfViewerLoadingTimeoutGuardState } from "./pdfViewerLoadingTimeoutGuard";
import type { PdfViewerState } from "./pdfViewerContract";

export type PdfViewerLoadingTransitionPlan =
  | { action: "show_empty" }
  | { action: "enter_loading" };

export type PdfViewerReadyTransitionPlan =
  | { action: "commit_ready" }
  | { action: "skip_ready"; reason: "already_committed" | "render_failed" };

export type PdfViewerRenderEventTransitionPlan =
  | { action: "commit_render_event" }
  | { action: "skip_render_event"; reason: "stale_render_key" | "render_failed" };

export type PdfViewerTimeoutTransitionPlan =
  | { action: "commit_timeout" }
  | { action: "skip_timeout"; reason: "stale_timeout" };

export function planPdfViewerLoadingTransition(args: {
  hasSession: boolean;
}): PdfViewerLoadingTransitionPlan {
  return args.hasSession ? { action: "enter_loading" } : { action: "show_empty" };
}

export function planPdfViewerReadyTransition(args: {
  readyCommitted: boolean;
  renderFailed: boolean;
}): PdfViewerReadyTransitionPlan {
  if (args.readyCommitted) {
    return { action: "skip_ready", reason: "already_committed" };
  }
  if (args.renderFailed) {
    return { action: "skip_ready", reason: "render_failed" };
  }
  return { action: "commit_ready" };
}

export function planPdfViewerRenderEventTransition(args: {
  isActiveRenderEvent: boolean;
  renderFailed: boolean;
}): PdfViewerRenderEventTransitionPlan {
  if (!args.isActiveRenderEvent) {
    return { action: "skip_render_event", reason: "stale_render_key" };
  }
  if (args.renderFailed) {
    return { action: "skip_render_event", reason: "render_failed" };
  }
  return { action: "commit_render_event" };
}

export function planPdfViewerTimeoutTransition(args: {
  shouldCommit: boolean;
}): PdfViewerTimeoutTransitionPlan {
  return args.shouldCommit
    ? { action: "commit_timeout" }
    : { action: "skip_timeout", reason: "stale_timeout" };
}

export type UsePdfViewerOrchestratorArgs = {
  initialSession: DocumentSession | null;
  initialAsset: DocumentAsset | null;
  initialState: PdfViewerState;
  initialErrorText: string;
};

export function usePdfViewerOrchestrator({
  initialSession,
  initialAsset,
  initialState,
  initialErrorText,
}: UsePdfViewerOrchestratorArgs) {
  const [documentSnapshot, setDocumentSnapshot] = React.useState({
    session: initialSession, asset: initialAsset,
  });
  const { session, asset } = documentSnapshot;
  const setSession = React.useCallback((action: React.SetStateAction<DocumentSession | null>) => {
    setDocumentSnapshot(prev => {const next=typeof action === 'function' ? action(prev.session) : action;return next===prev.session?prev:{...prev,session:next};});
  }, []);
  const setAsset = React.useCallback((action: React.SetStateAction<DocumentAsset | null>) => {
    setDocumentSnapshot(prev => {const next=typeof action === 'function' ? action(prev.asset) : action;return next===prev.asset?prev:{...prev,asset:next};});
  }, []);
  const commitDocumentSnapshot = React.useCallback((nextSession: DocumentSession | null, nextAsset: DocumentAsset | null) => {
    setDocumentSnapshot(prev => {
      const sameSession = prev.session?.sessionId === nextSession?.sessionId
        && prev.session?.status === nextSession?.status
        && prev.session?.errorMessage === nextSession?.errorMessage
        && prev.session?.assetId === nextSession?.assetId
        && prev.session?.preparationState === nextSession?.preparationState
        && prev.session?.preparationToken === nextSession?.preparationToken
        && prev.session?.preparationStartedAt === nextSession?.preparationStartedAt;
      const sameAsset = prev.asset?.assetId === nextAsset?.assetId && prev.asset?.uri === nextAsset?.uri;
      return sameSession && sameAsset ? prev : {session: sameSession ? prev.session : nextSession, asset: sameAsset ? prev.asset : nextAsset};
    });
  }, []);
  const [state, setState] = React.useState<PdfViewerState>(initialState);
  const [errorText, setErrorText] = React.useState(initialErrorText);
  const [isReadyToRender, setIsReadyToRender] = React.useState(false);
  const [nativeHandoffCompleted, setNativeHandoffCompleted] = React.useState(false);
  const [loadAttempt, setLoadAttempt] = React.useState(0);
  const [webRenderUri, setWebRenderUri] = React.useState<string | null>(null);

  const openedAtRef = React.useRef<number>(Date.now());
  const isMountedRef = React.useRef(true);
  const renderFailedRef = React.useRef(false);
  const readyCommittedRef = React.useRef(false);
  const webRenderUriRef = React.useRef<string | null>(null);
  const viewerCycleRef = React.useRef(0);
  const [viewerCycleGeneration, setViewerCycleGeneration] = React.useState(0);
  const openSignalSettledRef = React.useRef(false);
  const webIframeRenderLoggedKeyRef = React.useRef("");
  const activeRenderInstanceKeyRef = React.useRef("");
  const nativeHandoffGuardRef = React.useRef<PdfNativeHandoffGuardState>(
    createPdfNativeHandoffGuardState(),
  );
  const loadingTimeoutGuardRef = React.useRef<PdfViewerLoadingTimeoutGuardState>(
    createPdfViewerLoadingTimeoutGuardState(),
  );

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const resetOpenAttemptGuards = React.useCallback((resetOpenSignal = true) => {
    if (resetOpenSignal) openSignalSettledRef.current = false;
    readyCommittedRef.current = false;
    webIframeRenderLoggedKeyRef.current = "";
    resetPdfNativeHandoffGuard(nativeHandoffGuardRef.current);
  }, []);

  const beginBootstrapCycle = React.useCallback(() => {
    viewerCycleRef.current += 1;
    setViewerCycleGeneration(viewerCycleRef.current);
    resetPdfNativeHandoffGuard(nativeHandoffGuardRef.current, { preserveSettled: true });
    openedAtRef.current = Date.now();
    renderFailedRef.current = false;
    readyCommittedRef.current = false;
    setIsReadyToRender(false);
    setNativeHandoffCompleted(false);
  }, []);

  const commitEmptyState = React.useCallback(() => {
    setState("empty");
  }, []);

  const commitLoadingState = React.useCallback(() => {
    setState("loading");
  }, []);

  const commitErrorState = React.useCallback((message: string) => {
    renderFailedRef.current = true;
    setIsReadyToRender(false);
    setErrorText(message);
    setState("error");
  }, []);

  const claimReadyCommit = React.useCallback(() => {
    const plan = planPdfViewerReadyTransition({
      readyCommitted: readyCommittedRef.current,
      renderFailed: renderFailedRef.current,
    });
    if (plan.action === "commit_ready") {
      readyCommittedRef.current = true;
    }
    return plan;
  }, []);

  const commitReadyState = React.useCallback(() => {
    setErrorText("");
    setState("ready");
  }, []);

  const resetForNativeHandoffStart = React.useCallback(() => {
    renderFailedRef.current = false;
    readyCommittedRef.current = false;
    setErrorText("");
    setState("loading");
    setIsReadyToRender(true);
    setNativeHandoffCompleted(false);
  }, []);

  const commitNativeHandoffCompleted = React.useCallback(() => {
    setNativeHandoffCompleted(true);
  }, []);

  const retry = React.useCallback(() => {
    setErrorText("");
    setNativeHandoffCompleted(false);
    setLoadAttempt((value) => value + 1);
  }, []);

  const planRenderEventCommit = React.useCallback((isActiveRenderEvent: boolean) =>
    planPdfViewerRenderEventTransition({
      isActiveRenderEvent,
      renderFailed: renderFailedRef.current,
    }), []);

  return {
    session,
    setSession,
    asset,
    setAsset,
    commitDocumentSnapshot,
    state,
    setState,
    errorText,
    setErrorText,
    isReadyToRender,
    setIsReadyToRender,
    nativeHandoffCompleted,
    setNativeHandoffCompleted,
    loadAttempt,
    setLoadAttempt,
    webRenderUri,
    setWebRenderUri,
    openedAtRef,
    isMountedRef,
    renderFailedRef,
    readyCommittedRef,
    webRenderUriRef,
    viewerCycleRef,
    viewerCycleGeneration,
    openSignalSettledRef,
    webIframeRenderLoggedKeyRef,
    activeRenderInstanceKeyRef,
    nativeHandoffGuardRef,
    loadingTimeoutGuardRef,
    resetOpenAttemptGuards,
    beginBootstrapCycle,
    commitEmptyState,
    commitLoadingState,
    commitErrorState,
    claimReadyCommit,
    commitReadyState,
    resetForNativeHandoffStart,
    commitNativeHandoffCompleted,
    retry,
    planRenderEventCommit,
  };
}
