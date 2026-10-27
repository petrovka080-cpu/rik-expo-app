import {
  armPdfViewerLoadingTimeout,
  cancelPdfViewerLoadingTimeout,
  createPdfViewerLoadingTimeoutGuardState,
  shouldCommitPdfViewerLoadingTimeout,
  planPdfViewerPhaseTimeout,
  isPdfViewerPhaseTimeoutCurrent,
} from "./pdfViewerLoadingTimeoutGuard";
import type { DocumentAsset, DocumentSession } from "../documents/pdfDocumentSessions";

describe("pdfViewerLoadingTimeoutGuard", () => {
  const preparing: DocumentSession = {
    sessionId: "own-preparation", assetId: "pending", status: "preparing",
    preparationToken: "pending", preparationState: "pending",
    createdAt: new Date(1000).toISOString(), preparationStartedAt: new Date(1000).toISOString(),
  };
  const asset = { assetId: "ready" } as DocumentAsset;

  it("uses the remaining PDF preparation budget without restarting it on a presentation bootstrap", () => {
    expect(planPdfViewerPhaseTimeout(preparing, null, 16000)).toMatchObject({ phase: "preparation", timeoutMs: 45000 });
    expect(planPdfViewerPhaseTimeout(preparing, null, 61000).timeoutMs).toBe(0);
  });

  it("invalidates preparation timeout when the asset is ready and starts the 15s render budget", () => {
    const plan = planPdfViewerPhaseTimeout(preparing, null, 1000);
    const ready = { ...preparing, status: "ready" as const, assetId: asset.assetId };
    expect(isPdfViewerPhaseTimeoutCurrent(plan, ready, asset)).toBe(false);
    expect(planPdfViewerPhaseTimeout(ready, asset, 62000)).toMatchObject({ phase: "render", timeoutMs: 15000 });
    expect(isPdfViewerPhaseTimeoutCurrent(plan, { ...preparing, preparationToken: "new" }, null)).toBe(false);
  });

  it("allows only the currently armed loading timeout to commit", () => {
    const state = createPdfViewerLoadingTimeoutGuardState();

    const firstCycle = armPdfViewerLoadingTimeout(state);
    const secondCycle = armPdfViewerLoadingTimeout(state);

    expect(shouldCommitPdfViewerLoadingTimeout(state, firstCycle)).toBe(false);
    expect(shouldCommitPdfViewerLoadingTimeout(state, secondCycle)).toBe(true);
  });

  it("ignores a queued timeout after the viewer cycle is cancelled", () => {
    const state = createPdfViewerLoadingTimeoutGuardState();
    const cycle = armPdfViewerLoadingTimeout(state);

    cancelPdfViewerLoadingTimeout(state);

    expect(shouldCommitPdfViewerLoadingTimeout(state, cycle)).toBe(false);
  });
});
