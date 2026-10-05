import type { DocumentAsset, DocumentSession } from "../documents/pdfDocumentSessions";
import { REQUEST_TIMEOUT_POLICY_MS } from "../requestTimeoutPolicy";

export type PdfViewerLoadingTimeoutGuardState = {
  activeCycle: number;
  sequence: number;
};

export function createPdfViewerLoadingTimeoutGuardState(): PdfViewerLoadingTimeoutGuardState {
  return {
    activeCycle: 0,
    sequence: 0,
  };
}

export function armPdfViewerLoadingTimeout(
  state: PdfViewerLoadingTimeoutGuardState,
): number {
  state.sequence += 1;
  state.activeCycle = state.sequence;
  return state.activeCycle;
}

export function cancelPdfViewerLoadingTimeout(
  state: PdfViewerLoadingTimeoutGuardState,
) {
  state.activeCycle = 0;
}

export function shouldCommitPdfViewerLoadingTimeout(
  state: PdfViewerLoadingTimeoutGuardState,
  cycle: number,
): boolean {
  return cycle > 0 && state.activeCycle === cycle;
}
export type PdfViewerPhaseTimeout = {
  phase: "preparation" | "render";
  sessionId: string;
  identity: string;
  timeoutMs: number;
  message: string;
};

export function planPdfViewerPhaseTimeout(session: DocumentSession, asset: DocumentAsset | null, now = Date.now()): PdfViewerPhaseTimeout {
  if (session.status === "preparing" && !asset) {
    const startedAt = Date.parse(session.preparationStartedAt || session.createdAt);
    const elapsed = Number.isFinite(startedAt) ? Math.max(0, now - startedAt) : 0;
    return {
      phase: "preparation", sessionId: session.sessionId,
      identity: session.preparationToken || session.assetId,
      timeoutMs: Math.max(0, REQUEST_TIMEOUT_POLICY_MS.heavy_report_or_pdf_or_storage - elapsed),
      message: "Подготовка PDF заняла слишком долго. Можно продолжить ожидание или вернуться к смете.",
    };
  }
  return { phase: "render", sessionId: session.sessionId, identity: asset?.assetId || session.assetId,
    timeoutMs: 15000, message: "Document loading timed out." };
}

export function isPdfViewerPhaseTimeoutCurrent(plan: PdfViewerPhaseTimeout, session: DocumentSession | null, asset: DocumentAsset | null): boolean {
  if (!session || session.sessionId !== plan.sessionId) return false;
  return plan.phase === "preparation"
    ? session.status === "preparing" && !asset && (session.preparationToken || session.assetId) === plan.identity
    : session.status === "ready" && asset?.assetId === plan.identity;
}
