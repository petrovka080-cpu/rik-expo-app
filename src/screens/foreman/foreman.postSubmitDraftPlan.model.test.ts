import { readFileSync } from "fs";
import { join } from "path";

import { FOREMAN_LOCAL_ONLY_REQUEST_ID } from "./foreman.localDraft.constants";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";
import {
  resolveForemanPostSubmitDraftPlan,
  resolveForemanPostSubmitSubmittedOwnerId,
} from "./foreman.postSubmitDraftPlan.model";

const makeSnapshot = (
  patch: Partial<ForemanLocalDraftSnapshot> = {},
): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: "owner-1",
  requestId: "req-1",
  displayNo: null,
  status: "draft",
  header: {
    foreman: "Foreman",
    comment: "",
    objectType: "Object",
    level: "Level",
    system: "System",
    zone: "Zone",
  },
  items: [],
  qtyDrafts: {},
  pendingDeletes: [],
  submitRequested: false,
  lastError: null,
  updatedAt: "2026-04-19T00:00:00.000Z",
  baseServerRevision: null,
  ...patch,
});

describe("foreman post-submit draft command plan", () => {
  it("stays free of hook, store, persistence, and clock side effects", () => {
    const source = readFileSync(join(__dirname, "foreman.postSubmitDraftPlan.model.ts"), "utf8");

    expect(source).not.toContain("useForemanUiStore");
    expect(source).not.toContain("patchForemanDurableDraftRecoveryState");
    expect(source).not.toContain("setDisplayNoByReq");
    expect(source).not.toContain("applyLocalDraftSnapshotToBoundary");
    expect(source).not.toContain("refreshBoundarySyncState");
    expect(source).not.toContain("getForemanDurableDraftState");
    expect(source).not.toContain("Date.now");
    expect(source).not.toContain("console.");
  });

  it("prefers the submitted snapshot owner before the active owner ref", () => {
    expect(
      resolveForemanPostSubmitSubmittedOwnerId({
        activeSnapshot: makeSnapshot({ ownerId: " snapshot-owner " }),
        activeDraftOwnerId: "active-owner",
      }),
    ).toBe("snapshot-owner");

    expect(
      resolveForemanPostSubmitSubmittedOwnerId({
        activeSnapshot: null,
        activeDraftOwnerId: " active-owner ",
      }),
    ).toBe("active-owner");

    expect(
      resolveForemanPostSubmitSubmittedOwnerId({
        activeSnapshot: makeSnapshot({ ownerId: "" }),
        activeDraftOwnerId: "",
      }),
    ).toBeNull();
  });

  it("plans legacy post-submit fresh draft promotion without executing effects", () => {
    const activeSnapshot = makeSnapshot({
      ownerId: "submitted-owner",
      requestId: "req-before-submit",
      items: [
        {
          local_id: "local-1",
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
      submitRequested: true,
    });
    const freshDraftSnapshot = makeSnapshot({
      ownerId: "fresh-owner",
      requestId: "",
      items: [],
      submitRequested: false,
      updatedAt: "2026-04-19T01:02:03.000Z",
    });

    const plan = resolveForemanPostSubmitDraftPlan({
      rid: "req-submitted",
      activeRequestId: "req-active",
      activeSnapshot,
      submitted: { display_no: "REQ-42" },
      submittedOwnerId: "submitted-owner",
      freshDraftSnapshot,
    });

    expect(plan.submittedOwnerId).toBe("submitted-owner");
    expect(plan.nextActiveDraftOwnerId).toBe("fresh-owner");
    expect(plan.displayNoPatch).toEqual({
      requestId: "req-submitted",
      displayNo: "REQ-42",
    });
    expect(plan.applySnapshot).toEqual({
      snapshot: freshDraftSnapshot,
      options: {
        restoreHeader: true,
        clearWhenEmpty: true,
        restoreSource: "snapshot",
        restoreIdentity: "post-submit:fresh:2026-04-19T01:02:03.000Z",
      },
    });
    expect(plan.durablePatch).toEqual({
      snapshot: freshDraftSnapshot,
      syncStatus: "idle",
      pendingOperationsCount: 0,
      queueDraftKey: null,
      requestIdKnown: false,
      attentionNeeded: false,
      conflictType: "none",
      lastConflictAt: null,
      recoverableLocalSnapshot: null,
      lastError: null,
      lastErrorAt: null,
      lastErrorStage: null,
      retryCount: 0,
      repeatedFailureStageCount: 0,
      lastTriggerSource: "submit",
    });
    expect(plan.refreshBoundarySnapshot).toBe(freshDraftSnapshot);
    expect(plan.devTelemetry).toEqual({
      draftId: "req-before-submit",
      requestId: "req-submitted",
      submitSuccess: true,
      postSubmitAction: "promoted_fresh_local_draft",
      activeDraftIdBefore: "req-before-submit",
      activeDraftIdAfter: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      activeDraftOwnerIdAfter: "fresh-owner",
      freshDraftCreated: true,
      runtimeResult: "post_submit_fresh_draft_state",
    });
  });

  it("falls back active draft id through current request and rid like the legacy hook", () => {
    const freshDraftSnapshot = makeSnapshot({ ownerId: "fresh-owner", requestId: "" });

    expect(
      resolveForemanPostSubmitDraftPlan({
        rid: "req-submitted",
        activeRequestId: " req-active ",
        activeSnapshot: null,
        submitted: null,
        submittedOwnerId: null,
        freshDraftSnapshot,
      }).devTelemetry.draftId,
    ).toBe("req-active");

    expect(
      resolveForemanPostSubmitDraftPlan({
        rid: "  req-raw-rid  ",
        activeRequestId: "",
        activeSnapshot: makeSnapshot({ requestId: "" }),
        submitted: { display_no: null },
        submittedOwnerId: null,
        freshDraftSnapshot,
      }).devTelemetry.draftId,
    ).toBe("  req-raw-rid  ");
  });

  it("keeps display number patch on the legacy truthy branch", () => {
    const freshDraftSnapshot = makeSnapshot({ ownerId: "fresh-owner", requestId: "" });

    expect(
      resolveForemanPostSubmitDraftPlan({
        rid: "req-submitted",
        activeRequestId: null,
        activeSnapshot: null,
        submitted: { display_no: null },
        submittedOwnerId: null,
        freshDraftSnapshot,
      }).displayNoPatch,
    ).toBeNull();

    expect(
      resolveForemanPostSubmitDraftPlan({
        rid: "req-submitted",
        activeRequestId: null,
        activeSnapshot: null,
        submitted: { display_no: 0 },
        submittedOwnerId: null,
        freshDraftSnapshot,
      }).displayNoPatch,
    ).toBeNull();

    expect(
      resolveForemanPostSubmitDraftPlan({
        rid: "req-submitted",
        activeRequestId: null,
        activeSnapshot: null,
        submitted: { display_no: "  " },
        submittedOwnerId: null,
        freshDraftSnapshot,
      }).displayNoPatch,
    ).toEqual({ requestId: "req-submitted", displayNo: "  " });
  });

  it("keeps hook post-submit effect execution in the legacy order", () => {
    const source = readFileSync(
      join(__dirname, "hooks", "useForemanDraftBoundary.ts"),
      "utf8",
    );
    const start = source.indexOf("const handlePostSubmitSuccess = useCallback");
    const end = source.indexOf("useEffect(() => {\n    handlePostSubmitSuccessRef.current", start);
    const block = source.slice(start, end);
    const expectedOrder = [
      "resolveForemanPostSubmitSubmittedOwnerId",
      "lastSubmittedOwnerIdRef.current = submittedOwnerId",
      "buildFreshForemanLocalDraftSnapshot",
      "resolveForemanPostSubmitDraftPlan",
      "setActiveDraftOwnerId(postSubmitPlan.nextActiveDraftOwnerId)",
      "setDisplayNoByReq",
      "skipRemoteHydrationRequestIdRef.current = null",
      "invalidateRequestDetailsLoads()",
      "resetAiQuickUi()",
      "clearAiQuickSessionHistory()",
      "applyLocalDraftSnapshotToBoundary",
      "patchForemanDurableDraftRecoveryState",
      "refreshBoundarySyncState(postSubmitPlan.refreshBoundarySnapshot)",
      'console.info("[foreman.post-submit]"',
    ];

    let previousIndex = -1;
    for (const marker of expectedOrder) {
      const nextIndex = block.indexOf(marker);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }
  });
});
