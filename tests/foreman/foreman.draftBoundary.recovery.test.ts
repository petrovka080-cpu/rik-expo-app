import { readFileSync } from "fs";
import { join } from "path";

jest.mock("../../src/lib/catalog_api", () => ({
  fetchRequestDetails: jest.fn(),
}));

jest.mock("../../src/screens/foreman/foreman.durableDraft.store", () => ({
  getForemanDurableDraftState: jest.fn(),
  patchForemanDurableDraftRecoveryState: jest.fn(),
}));

import { fetchRequestDetails } from "../../src/lib/catalog_api";
import { getForemanDurableDraftState } from "../../src/screens/foreman/foreman.durableDraft.store";
import {
  runForemanClearTerminalRecoveryOwnerIfNeeded,
  runForemanRestoreDraftIfNeeded,
  runForemanRestoreTriggerPlan,
} from "../../src/screens/foreman/foreman.draftBoundary.recovery";
import type { ForemanDurableDraftRecord } from "../../src/screens/foreman/foreman.durableDraft.store";
import type { ForemanLocalDraftSnapshot } from "../../src/screens/foreman/foreman.localDraft";

const mockFetchRequestDetails = fetchRequestDetails as jest.MockedFunction<typeof fetchRequestDetails>;
const mockGetForemanDurableDraftState =
  getForemanDurableDraftState as jest.MockedFunction<typeof getForemanDurableDraftState>;

const makeSnapshot = (
  patch: Partial<ForemanLocalDraftSnapshot> = {},
): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: "owner-1",
  requestId: "req-1",
  displayNo: "REQ-1",
  status: "draft",
  header: {
    foreman: "Foreman",
    comment: "",
    objectType: "OBJ",
    level: "L1",
    system: "SYS",
    zone: "Z1",
  },
  items: [
    {
      local_id: "local-1",
      remote_item_id: "remote-1",
      rik_code: "MAT-1",
      name_human: "Material",
      qty: 1,
      uom: "pcs",
      status: "draft",
      note: null,
      app_code: null,
      kind: "material",
      line_no: 1,
    },
  ],
  qtyDrafts: {},
  pendingDeletes: [],
  submitRequested: false,
  lastError: null,
  updatedAt: "2026-04-21T00:00:00.000Z",
  ...patch,
});

const makeDurableState = (
  patch: Partial<ForemanDurableDraftRecord> = {},
): ForemanDurableDraftRecord => ({
  version: 2,
  hydrated: true,
  snapshot: null,
  syncStatus: "idle",
  lastSyncAt: null,
  lastError: null,
  lastErrorAt: null,
  lastErrorStage: null,
  conflictType: "none",
  lastConflictAt: null,
  retryCount: 0,
  repeatedFailureStageCount: 0,
  pendingOperationsCount: 0,
  queueDraftKey: null,
  requestIdKnown: false,
  attentionNeeded: false,
  availableRecoveryActions: [],
  recoverableLocalSnapshot: null,
  lastTriggerSource: "unknown",
  telemetry: [],
  updatedAt: null,
  ...patch,
});

describe("foreman draft boundary recovery", () => {
  beforeEach(() => {
    mockFetchRequestDetails.mockReset();
    mockGetForemanDurableDraftState.mockReset();
    mockGetForemanDurableDraftState.mockReturnValue(makeDurableState());
  });

  it("keeps recovery ownership out of React hooks and silent swallows", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "screens", "foreman", "foreman.draftBoundary.recovery.ts"),
      "utf8",
    );

    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("useCallback");
    expect(source).not.toContain("catch {}");
    expect(source).toContain("runForemanRestoreDraftIfNeeded");
    expect(source).toContain("runForemanRestoreTriggerPlan");
  });

  it("skips restore attempts until bootstrap is authoritative", async () => {
    const clearTerminalRecoveryOwnerIfNeeded = jest.fn();
    const clearTerminalLocalDraft = jest.fn();
    const reportDraftBoundaryFailure = jest.fn();
    const syncLocalDraftNow = jest.fn();

    await runForemanRestoreDraftIfNeeded(
      {
        bootstrapReady: false,
        localDraftSnapshotRef: { current: null },
        clearTerminalRecoveryOwnerIfNeeded,
        clearTerminalLocalDraft,
        reportDraftBoundaryFailure,
        syncLocalDraftNow,
      },
      "app_active",
    );

    expect(clearTerminalRecoveryOwnerIfNeeded).not.toHaveBeenCalled();
    expect(clearTerminalLocalDraft).not.toHaveBeenCalled();
    expect(syncLocalDraftNow).not.toHaveBeenCalled();
    expect(reportDraftBoundaryFailure).not.toHaveBeenCalled();
  });

  it("clears terminal drafts when the remote restore check returns a terminal status", async () => {
    const snapshot = makeSnapshot({ requestId: "req-terminal" });
    mockGetForemanDurableDraftState.mockReturnValue(makeDurableState({
      snapshot,
      conflictType: "retryable_sync_failure",
    }));
    mockFetchRequestDetails.mockResolvedValueOnce({ status: "submitted" } as never);

    const clearTerminalRecoveryOwnerIfNeeded = jest.fn(async () => false);
    const clearTerminalLocalDraft = jest.fn(async () => undefined);
    const reportDraftBoundaryFailure = jest.fn();
    const syncLocalDraftNow = jest.fn();

    await runForemanRestoreDraftIfNeeded(
      {
        bootstrapReady: true,
        localDraftSnapshotRef: { current: null },
        clearTerminalRecoveryOwnerIfNeeded,
        clearTerminalLocalDraft,
        reportDraftBoundaryFailure,
        syncLocalDraftNow,
      },
      "focus",
    );

    expect(mockFetchRequestDetails).toHaveBeenCalledWith("req-terminal");
    expect(clearTerminalLocalDraft).toHaveBeenCalledWith({
      snapshot,
      requestId: "req-terminal",
      remoteStatus: "submitted",
    });
    expect(syncLocalDraftNow).not.toHaveBeenCalled();
    expect(reportDraftBoundaryFailure).not.toHaveBeenCalled();
  });

  it("reports degraded remote-check failures and still retries sync for recoverable conflicts", async () => {
    const snapshot = makeSnapshot({ requestId: "req-retry" });
    mockGetForemanDurableDraftState.mockReturnValue(makeDurableState({
      snapshot,
      conflictType: "retryable_sync_failure",
    }));
    mockFetchRequestDetails.mockRejectedValueOnce(new Error("remote check failed"));

    const clearTerminalRecoveryOwnerIfNeeded = jest.fn(async () => false);
    const clearTerminalLocalDraft = jest.fn(async () => undefined);
    const reportDraftBoundaryFailure = jest.fn();
    const syncLocalDraftNow = jest.fn(async () => ({ requestId: "req-retry", submitted: null }));

    await runForemanRestoreDraftIfNeeded(
      {
        bootstrapReady: true,
        localDraftSnapshotRef: { current: null },
        clearTerminalRecoveryOwnerIfNeeded,
        clearTerminalLocalDraft,
        reportDraftBoundaryFailure,
        syncLocalDraftNow,
      },
      "focus",
    );

    expect(reportDraftBoundaryFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "restore_remote_terminal_check_failed",
        context: "focus",
        stage: "recovery",
        kind: "degraded_fallback",
      }),
    );
    expect(syncLocalDraftNow).toHaveBeenCalledWith({ context: "focus" });
    expect(clearTerminalLocalDraft).not.toHaveBeenCalled();
  });

  it("reports terminal recovery remote-check failures and keeps the owner for retry", async () => {
    const snapshot = makeSnapshot({
      requestId: "req-terminal-retry",
      displayNo: "req-terminal-retry",
    });
    const remoteCheckError = new Error("remote check unavailable");
    mockGetForemanDurableDraftState.mockReturnValue(makeDurableState({
      recoverableLocalSnapshot: snapshot,
      conflictType: "retryable_sync_failure",
      pendingOperationsCount: 1,
      queueDraftKey: "req-terminal-retry",
      requestIdKnown: true,
      attentionNeeded: true,
    }));
    mockFetchRequestDetails.mockRejectedValueOnce(remoteCheckError);

    const clearTerminalLocalDraft = jest.fn(async () => undefined);
    const reportDraftBoundaryFailure = jest.fn();

    const result = await runForemanClearTerminalRecoveryOwnerIfNeeded(
      {
        localDraftSnapshotRef: { current: null },
        requestId: "req-terminal-retry",
        clearTerminalLocalDraft,
        reportDraftBoundaryFailure,
      },
      "bootstrap_complete",
    );

    expect(result).toBe(false);
    expect(mockFetchRequestDetails).toHaveBeenCalledTimes(1);
    expect(mockFetchRequestDetails).toHaveBeenCalledWith("req-terminal-retry");
    expect(clearTerminalLocalDraft).not.toHaveBeenCalled();
    expect(reportDraftBoundaryFailure).toHaveBeenCalledWith({
      event: "terminal_recovery_remote_check_failed",
      error: remoteCheckError,
      context: "bootstrap_complete",
      stage: "recovery",
      kind: "degraded_fallback",
      sourceKind: "rpc:fetch_request_details",
      extra: {
        candidateRequestId: "req-terminal-retry",
        candidateSource: "recoverable_snapshot",
        fallbackReason: "keep_recovery_owner_for_next_check",
      },
    });
  });

  it("runs restore trigger plans through the extracted recovery owner and reports failures explicitly", async () => {
    const restoreDraftIfNeeded = jest.fn().mockRejectedValue(new Error("restore failed"));
    const reportDraftBoundaryFailure = jest.fn();

    runForemanRestoreTriggerPlan(
      {
        action: "restore",
        context: "network_back",
        failureTelemetry: {
          event: "restore_draft_on_network_back_failed",
          context: "network_back",
          stage: "recovery",
          sourceKind: "draft_boundary:network_restore",
        },
      },
      {
        restoreDraftIfNeeded,
        reportDraftBoundaryFailure,
      },
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(restoreDraftIfNeeded).toHaveBeenCalledWith("network_back");
    expect(reportDraftBoundaryFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "restore_draft_on_network_back_failed",
        context: "network_back",
        stage: "recovery",
      }),
    );
  });
});
