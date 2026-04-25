import { readFileSync } from "fs";
import { join } from "path";

jest.mock("../../src/screens/foreman/foreman.durableDraft.store", () => ({
  getForemanDurableDraftState: jest.fn(),
}));

import { getForemanDurableDraftState } from "../../src/screens/foreman/foreman.durableDraft.store";
import {
  runForemanDraftBoundaryLiveCleanupEffect,
  runForemanDraftBoundaryRemoteDetailsEffect,
  runForemanDraftBoundaryRemoteItemsEffect,
} from "../../src/screens/foreman/foreman.draftBoundary.effects";
import type { ForemanLocalDraftSnapshot } from "../../src/screens/foreman/foreman.localDraft";

const mockGetForemanDurableDraftState = getForemanDurableDraftState as unknown as jest.Mock;

const makeSnapshot = (
  patch: Partial<ForemanLocalDraftSnapshot> = {},
): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: "owner-1",
  requestId: "req-1",
  displayNo: null,
  status: "draft",
  header: {
    foreman: "",
    comment: "",
    objectType: "",
    level: "",
    system: "",
    zone: "",
  },
  items: [],
  qtyDrafts: {},
  pendingDeletes: [],
  submitRequested: false,
  lastError: null,
  updatedAt: "2026-04-22T00:00:00.000Z",
  ...patch,
});

describe("foreman draft boundary effect owners", () => {
  beforeEach(() => {
    mockGetForemanDurableDraftState.mockReset();
  });

  it("stays free of React hook ownership and owns the extracted runtime/effect paths", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "screens", "foreman", "foreman.draftBoundary.effects.ts"),
      "utf8",
    );

    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("useCallback");
    expect(source).toContain("AppState");
    expect(source).toContain("subscribePlatformNetwork");
    expect(source).toContain("planForemanAppActiveRestoreTrigger");
    expect(source).toContain("planForemanNetworkBackRestoreTrigger");
    expect(source).toContain("resolveForemanDraftBoundaryLiveCleanupPlan");
    expect(source).toContain("resolveForemanDraftBoundaryRemoteEffectsPlan");
  });

  it("executes live terminal cleanup against the resolved durable snapshot", () => {
    const snapshot = makeSnapshot({ requestId: "req-terminal" });
    mockGetForemanDurableDraftState.mockReturnValue({
      snapshot,
      recoverableLocalSnapshot: null,
      conflictType: "server_terminal_conflict",
    });

    const clearTerminalLocalDraft = jest.fn(async () => undefined);
    const reportDraftBoundaryFailure = jest.fn();

    const cleanupDecision = runForemanDraftBoundaryLiveCleanupEffect({
      bootstrapReady: true,
      boundaryConflictType: "server_terminal_conflict",
      requestId: "req-terminal",
      requestDetailsStatus: "submitted",
      localDraftSnapshotRef: { current: null },
      clearTerminalLocalDraft,
      reportDraftBoundaryFailure,
    });

    expect(cleanupDecision).toMatchObject({
      shouldClear: true,
      requestId: "req-terminal",
      remoteStatus: "submitted",
    });
    expect(clearTerminalLocalDraft).toHaveBeenCalledWith({
      snapshot,
      requestId: "req-terminal",
      remoteStatus: "submitted",
    });
    expect(reportDraftBoundaryFailure).not.toHaveBeenCalled();
  });

  it("routes remote detail and item loads through the extracted effect owner", () => {
    const preloadDisplayNo = jest.fn(async () => undefined);
    const loadDetails = jest.fn(async () => null);
    const loadItems = jest.fn(async () => undefined);
    const skipRemoteHydrationRequestIdRef = { current: null as string | null };

    const detailsPlan = runForemanDraftBoundaryRemoteDetailsEffect({
      bootstrapReady: true,
      requestId: "req-remote",
      skipRemoteDraftEffects: false,
      skipRemoteHydrationRequestId: null,
      preloadDisplayNo,
      loadDetails,
    });
    const itemsPlan = runForemanDraftBoundaryRemoteItemsEffect({
      bootstrapReady: true,
      requestId: "req-remote",
      skipRemoteDraftEffects: false,
      skipRemoteHydrationRequestIdRef,
      loadItems,
    });

    expect(detailsPlan).toEqual({
      action: "load",
      requestId: "req-remote",
    });
    expect(itemsPlan).toEqual({
      action: "load_items",
    });
    expect(preloadDisplayNo).toHaveBeenCalledWith("req-remote");
    expect(loadDetails).toHaveBeenCalledWith("req-remote");
    expect(loadItems).toHaveBeenCalledTimes(1);
  });
});
