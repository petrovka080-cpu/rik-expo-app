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
