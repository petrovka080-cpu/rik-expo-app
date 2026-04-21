import { readFileSync } from "fs";
import { join } from "path";

import type { ForemanDurableDraftRecord } from "../../src/screens/foreman/foreman.durableDraft.store";
import {
  resolveForemanDraftBoundaryFailurePlan,
  resolveForemanDraftBoundaryManualRecoveryTelemetryPlan,
  resolveForemanDraftBoundaryRefreshPlan,
  resolveForemanDraftBoundaryRestoreAttemptPlan,
  resolveForemanDraftBoundaryRestoreRemotePlan,
  resolveForemanDraftBoundarySnapshot,
} from "../../src/screens/foreman/foreman.draftBoundary.logic";
import {
  FOREMAN_LOCAL_ONLY_REQUEST_ID,
  type ForemanLocalDraftSnapshot,
} from "../../src/screens/foreman/foreman.localDraft";

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
  items: [
    {
      local_id: "local-1",
      remote_item_id: "item-1",
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

describe("foreman draft boundary pure logic", () => {
  it("stays free of React, state setters, queue mutations, and fetch side effects", () => {
    const source = readFileSync(
      join(__dirname, "../../src/screens/foreman/foreman.draftBoundary.logic.ts"),
      "utf8",
    );

    expect(source).not.toContain("useState");
    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("setRequestDetails");
    expect(source).not.toContain("fetchRequestDetails");
    expect(source).not.toContain("enqueueForemanMutation");
    expect(source).not.toContain("clearForemanMutationsForDraft");
    expect(source).not.toContain("patchForemanDurableDraftRecoveryState");
    expect(source).not.toContain("AppState");
  });

  it("selects the authoritative boundary snapshot from durable, local, and override inputs", () => {
    const durableSnapshot = makeSnapshot({ requestId: "req-durable" });
    const localSnapshot = makeSnapshot({ requestId: "req-local" });

    expect(resolveForemanDraftBoundarySnapshot({
      durableSnapshot,
      localSnapshot,
    })).toBe(durableSnapshot);

    expect(resolveForemanDraftBoundarySnapshot({
      durableSnapshot,
      localSnapshot,
      snapshotOverride: localSnapshot,
    })).toBe(localSnapshot);

    expect(resolveForemanDraftBoundarySnapshot({
      durableSnapshot,
      localSnapshot,
      snapshotOverride: null,
    })).toBeNull();
  });

  it("resolves refresh state for a newly created local draft without changing sync semantics", () => {
    const localSnapshot = makeSnapshot({
      requestId: "",
      items: [
        {
          local_id: "local-only-1",
          remote_item_id: null,
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
    });
    const durableState = makeDurableState({
      snapshot: null,
      syncStatus: "dirty_local",
      attentionNeeded: true,
      requestIdKnown: false,
    });

    const plan = resolveForemanDraftBoundaryRefreshPlan({
      durableState,
      localSnapshot,
      pendingOperationsCount: 2,
    });

    expect(plan.snapshot).toBe(localSnapshot);
    expect(plan.boundaryPatch).toMatchObject({
      draftDirty: true,
      syncNeeded: true,
      syncStatus: "dirty_local",
      pendingOperationsCount: 2,
      requestIdKnown: false,
      attentionNeeded: true,
    });
  });

  it("builds recovery telemetry with stable draft-key fallback for active and local-only drafts", () => {
    const durableState = makeDurableState({
      retryCount: 2,
      pendingOperationsCount: 3,
      conflictType: "retryable_sync_failure",
    });

    const activePlan = resolveForemanDraftBoundaryManualRecoveryTelemetryPlan({
      durableState,
      localSnapshot: null,
      activeRequestId: "req-route",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      recoveryAction: "retry_now",
      result: "progress",
      networkOnline: false,
    });
    expect(activePlan.telemetry).toMatchObject({
      draftKey: "req-route",
      requestId: null,
      localOnlyDraftKey: false,
      attemptNumber: 3,
      queueSizeBefore: 3,
      queueSizeAfter: 3,
      conflictType: "retryable_sync_failure",
      recoveryAction: "retry_now",
      offlineState: "offline",
    });

    const localOnlyPlan = resolveForemanDraftBoundaryManualRecoveryTelemetryPlan({
      durableState,
      localSnapshot: null,
      activeRequestId: null,
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      recoveryAction: "clear_failed_queue",
      result: "success",
      networkOnline: null,
    });
    expect(localOnlyPlan.telemetry).toMatchObject({
      draftKey: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      localOnlyDraftKey: true,
      offlineState: "unknown",
      recoveryAction: "clear_failed_queue",
      result: "success",
    });
  });

  it("classifies conflict and retryable failures without losing the active request identity", () => {
    const conflictPlan = resolveForemanDraftBoundaryFailurePlan({
      durableState: makeDurableState({
        snapshot: makeSnapshot({ requestId: "req-conflict" }),
      }),
      localSnapshot: null,
      activeRequestId: "req-route",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      event: "boundary_conflict",
      error: new Error("request conflict already modified"),
      stage: "recovery",
    });
    expect(conflictPlan.classified).toMatchObject({
      retryable: false,
      conflictType: "remote_divergence_requires_attention",
      errorClass: "remote_divergence",
    });
    expect(conflictPlan.catchDiscipline).toMatchObject({
      kind: "soft_failure",
      sourceKind: "draft_boundary:auto_recover",
    });
    expect(conflictPlan.catchDiscipline.extra).toMatchObject({
      queueDraftKey: "req-conflict",
      requestId: "req-conflict",
      retryable: false,
    });

    const retryablePlan = resolveForemanDraftBoundaryFailurePlan({
      durableState: makeDurableState(),
      localSnapshot: null,
      activeRequestId: "req-route-fallback",
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      event: "boundary_retryable",
      error: new Error("network timeout"),
      stage: "recovery",
    });
    expect(retryablePlan.classified).toMatchObject({
      retryable: true,
      conflictType: "retryable_sync_failure",
      errorClass: "network",
    });
    expect(retryablePlan.catchDiscipline.extra).toMatchObject({
      queueDraftKey: "req-route-fallback",
      requestId: "req-route-fallback",
      retryable: true,
    });

    const localOnlyPlan = resolveForemanDraftBoundaryFailurePlan({
      durableState: makeDurableState(),
      localSnapshot: null,
      activeRequestId: null,
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      event: "boundary_local_only_retryable",
      error: new Error("offline fetch failed"),
      stage: "recovery",
    });
    expect(localOnlyPlan.catchDiscipline.extra).toMatchObject({
      queueDraftKey: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      requestId: null,
      retryable: true,
    });
  });

  it("plans restore attempts from bootstrap truth and conflict recoverability", () => {
    expect(resolveForemanDraftBoundaryRestoreAttemptPlan({
      bootstrapReady: false,
      durableState: makeDurableState(),
      localSnapshot: null,
    })).toEqual({
      action: "skip",
      reason: "bootstrap_not_ready",
      snapshot: null,
      remoteCheckPlan: { action: "skip_terminal_check", requestId: null },
      shouldSyncAfterRemoteCheck: false,
    });

    const snapshot = makeSnapshot({ requestId: "req-restore" });
    const retryablePlan = resolveForemanDraftBoundaryRestoreAttemptPlan({
      bootstrapReady: true,
      durableState: makeDurableState({
        snapshot,
        conflictType: "retryable_sync_failure",
      }),
      localSnapshot: null,
    });
    expect(retryablePlan).toEqual({
      action: "restore",
      snapshot,
      remoteCheckPlan: { action: "check_terminal", requestId: "req-restore" },
      shouldSyncAfterRemoteCheck: true,
    });

    const blockedPlan = resolveForemanDraftBoundaryRestoreAttemptPlan({
      bootstrapReady: true,
      durableState: makeDurableState({
        snapshot,
        conflictType: "validation_conflict",
      }),
      localSnapshot: null,
    });
    expect(blockedPlan).toEqual({
      action: "restore",
      snapshot,
      remoteCheckPlan: { action: "check_terminal", requestId: "req-restore" },
      shouldSyncAfterRemoteCheck: false,
    });
  });

  it("treats only non-draft remote statuses as terminal during restore", () => {
    expect(resolveForemanDraftBoundaryRestoreRemotePlan({
      requestId: "req-terminal",
      remoteStatus: "approved",
    })).toEqual({
      action: "clear_terminal",
      requestId: "req-terminal",
      remoteStatus: "approved",
    });

    expect(resolveForemanDraftBoundaryRestoreRemotePlan({
      requestId: "req-terminal",
      remoteStatus: "draft",
    })).toEqual({
      action: "preserve",
      requestId: "req-terminal",
      remoteStatus: "draft",
    });

    expect(resolveForemanDraftBoundaryRestoreRemotePlan({
      requestId: "req-terminal",
      remoteStatus: null,
    })).toEqual({
      action: "preserve",
      requestId: "req-terminal",
      remoteStatus: null,
    });
  });
});
