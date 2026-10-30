import { readFileSync } from "fs";
import { join } from "path";

import {
  buildForemanDraftBoundaryHeaderState,
  buildForemanDraftBoundaryViewState,
  resolveForemanDraftBoundaryCanEditItem,
  resolveForemanDraftBoundaryLiveCleanupPlan,
  resolveForemanDraftBoundaryPersistPlan,
  resolveForemanDraftBoundaryRemoteEffectsPlan,
} from "../../src/screens/foreman/foreman.draftBoundary.plan";
import type { ReqItemRow } from "../../src/lib/catalog_api";
import type { ForemanLocalDraftSnapshot } from "../../src/screens/foreman/foreman.localDraft";
import type { ForemanDurableDraftRecord } from "../../src/screens/foreman/foreman.durableDraft.store";

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

describe("foreman draft boundary plan", () => {
  it("stays free of React hooks and network side effects", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "screens", "foreman", "foreman.draftBoundary.plan.ts"),
      "utf8",
    );

    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("useCallback");
    expect(source).not.toContain("AppState");
    expect(source).not.toContain("fetchRequestDetails");
    expect(source).not.toContain("enqueueForemanMutation");
    expect(source).not.toContain("patchForemanDurableDraftRecoveryState");
  });

  it("builds boundary view state without changing authoritative snapshot semantics", () => {
    const snapshot = makeSnapshot({ ownerId: "owner-active", requestId: "req-1" });
    const headerState = buildForemanDraftBoundaryHeaderState({
      foreman: "Foreman",
      comment: "Comment",
      objectType: "OBJ",
      level: "L1",
      system: "SYS",
      zone: "Z1",
    });

    const viewState = buildForemanDraftBoundaryViewState({
      localSnapshot: snapshot,
      activeDraftOwnerId: "owner-active",
      requestId: "req-1",
      requestStatus: "draft",
      requestDetailsId: "req-1",
      headerState,
      bootstrapReady: true,
    });

    expect(viewState.activeLocalDraftSnapshot).toBe(snapshot);
    expect(viewState.draftActivityState).toEqual({
      hasLocalDraft: true,
      isDraftActive: true,
    });
    expect(viewState.requestDraftMeta).toEqual({
      foreman_name: "Foreman",
      comment: "Comment",
      object_type_code: "OBJ",
      level_code: "L1",
      system_code: "SYS",
      zone_code: "Z1",
    });
    expect(viewState.skipRemoteDraftEffects).toBe(true);
    expect(viewState.detailsRequestId).toBe("req-1");
  });

  it("plans lifecycle persistence only when the snapshot is both allowed and non-empty", () => {
    const snapshot = makeSnapshot();

    expect(resolveForemanDraftBoundaryPersistPlan({
      bootstrapReady: true,
      isDraftActive: true,
      localDraftSnapshotRefCleared: false,
      hasRequestDetails: true,
      detailsRequestId: "req-1",
      requestId: "req-1",
      hasLocalDraft: true,
      snapshot,
    })).toEqual({
      action: "persist",
      snapshot,
    });

    expect(resolveForemanDraftBoundaryPersistPlan({
      bootstrapReady: false,
      isDraftActive: true,
      localDraftSnapshotRefCleared: false,
      hasRequestDetails: true,
      detailsRequestId: "req-1",
      requestId: "req-1",
      hasLocalDraft: true,
      snapshot,
    })).toEqual({
      action: "skip",
    });
  });

  it("composes remote effects plans without owning the fetch side effects", () => {
    const plans = resolveForemanDraftBoundaryRemoteEffectsPlan({
      bootstrapReady: true,
      requestId: "req-1",
      skipRemoteDraftEffects: false,
      skipRemoteHydrationRequestId: null,
    });

    expect(plans.detailsPlan).toEqual({
      action: "load",
      requestId: "req-1",
    });
    expect(plans.itemsPlan).toEqual({
      action: "load_items",
    });
  });

  it("preserves live terminal cleanup planning and item edit eligibility", () => {
    const snapshot = makeSnapshot();
    const row: ReqItemRow = {
      id: "item-1",
      request_id: "req-1",
      rik_code: "MAT-1",
      name_human: "Material",
      qty: 1,
      uom: "pcs",
      status: "draft",
      app_code: null,
      note: null,
      line_no: 1,
    };
    const durableState = makeDurableState({
      syncStatus: "failed_terminal",
      attentionNeeded: true,
      conflictType: "server_terminal_conflict",
      pendingOperationsCount: 1,
      retryCount: 1,
      recoverableLocalSnapshot: snapshot,
      availableRecoveryActions: ["discard_local"],
    });

    const cleanupPlan = resolveForemanDraftBoundaryLiveCleanupPlan({
      bootstrapReady: true,
      boundaryConflictType: "server_terminal_conflict",
      requestId: "req-1",
      remoteStatus: "submitted",
      snapshot,
      durableState,
    });

    expect(cleanupPlan).toMatchObject({
      shouldClear: true,
      requestId: "req-1",
      remoteStatus: "submitted",
      isTerminalConflict: true,
      isTerminalStatus: true,
    });

    expect(resolveForemanDraftBoundaryCanEditItem({
      row,
      isDraftActive: true,
      requestDetailsId: "req-1",
      requestStatus: "draft",
      requestId: "req-1",
      localOnlyRequestId: "__foreman_local_draft__",
    })).toBe(true);
  });
});
