import { readFileSync } from "fs";
import { join } from "path";

jest.mock("../../src/screens/foreman/foreman.durableDraft.store", () => ({
  getForemanDurableDraftState: jest.fn(),
  patchForemanDurableDraftRecoveryState: jest.fn(async () => undefined),
}));

jest.mock("../../src/screens/foreman/foremanUi.store", () => ({
  useForemanUiStore: {
    getState: jest.fn(),
  },
}));

import {
  getForemanDurableDraftState,
  patchForemanDurableDraftRecoveryState,
} from "../../src/screens/foreman/foreman.durableDraft.store";
import { runForemanDraftBoundaryPostSubmitSuccess } from "../../src/screens/foreman/foreman.draftBoundary.postSubmit";
import { useForemanUiStore } from "../../src/screens/foreman/foremanUi.store";
import type { ForemanLocalDraftSnapshot } from "../../src/screens/foreman/foreman.localDraft";

const mockGetForemanDurableDraftState = getForemanDurableDraftState as unknown as jest.Mock;
const mockPatchForemanDurableDraftRecoveryState =
  patchForemanDurableDraftRecoveryState as unknown as jest.Mock;
const mockUseForemanUiStore = useForemanUiStore as unknown as {
  getState: jest.Mock;
};

const makeSnapshot = (
  patch: Partial<ForemanLocalDraftSnapshot> = {},
): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: "owner-1",
  requestId: "req-before-submit",
  displayNo: null,
  status: "draft",
  header: {
    foreman: "Foreman",
    comment: "Comment",
    objectType: "OBJ",
    level: "L1",
    system: "SYS",
    zone: "ZONE",
  },
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
  qtyDrafts: {},
  pendingDeletes: [],
  submitRequested: true,
  lastError: null,
  updatedAt: "2026-04-22T01:02:03.000Z",
  ...patch,
});

describe("foreman draft boundary post-submit owner", () => {
  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    mockGetForemanDurableDraftState.mockReset();
    mockPatchForemanDurableDraftRecoveryState.mockReset();
    mockUseForemanUiStore.getState.mockReset();
  });

  it("stays free of React hook ownership and keeps post-submit execution in one owner", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "screens", "foreman", "foreman.draftBoundary.postSubmit.ts"),
      "utf8",
    );

    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("useCallback");
    expect(source).not.toContain("useState");
    expect(source).toContain("resolveForemanPostSubmitDraftPlan");
    expect(source).toContain("patchForemanDurableDraftRecoveryState");
  });

  it("preserves the legacy post-submit effect order while keeping the hook thin", async () => {
    const events: string[] = [];
    const resetAiQuickUi = jest.fn(() => {
      events.push("resetAiQuickUi");
    });
    const clearAiQuickSessionHistory = jest.fn(() => {
      events.push("clearAiQuickSessionHistory");
    });
    mockUseForemanUiStore.getState.mockReturnValue({
      resetAiQuickUi,
      clearAiQuickSessionHistory,
    });
    mockPatchForemanDurableDraftRecoveryState.mockImplementation(async () => {
      events.push("patchForemanDurableDraftRecoveryState");
      return undefined;
    });

    const snapshot = makeSnapshot();
    const deps = {
      localDraftSnapshotRef: { current: snapshot },
      activeDraftOwnerIdRef: { current: "owner-active" },
      lastSubmittedOwnerIdRef: { current: null as string | null },
      skipRemoteHydrationRequestIdRef: { current: "req-before-submit" },
      requestId: "req-active",
      currentHeaderState: snapshot.header,
      setActiveDraftOwnerId: jest.fn((ownerId?: string | null) => {
        events.push("setActiveDraftOwnerId");
        return String(ownerId ?? "");
      }),
      setDisplayNoByReq: jest.fn(() => {
        events.push("setDisplayNoByReq");
      }),
      invalidateRequestDetailsLoads: jest.fn(() => {
        events.push("invalidateRequestDetailsLoads");
      }),
      applyLocalDraftSnapshotToBoundary: jest.fn(() => {
        events.push("applyLocalDraftSnapshotToBoundary");
      }),
      refreshBoundarySyncState: jest.fn(async () => {
        events.push("refreshBoundarySyncState");
      }),
    };

    await runForemanDraftBoundaryPostSubmitSuccess(deps, {
      rid: "req-submitted",
      submitted: {
        display_no: "REQ-42",
      } as never,
    });

    expect(deps.lastSubmittedOwnerIdRef.current).toBe("owner-1");
    expect(deps.skipRemoteHydrationRequestIdRef.current).toBeNull();
    expect(events).toEqual([
      "setActiveDraftOwnerId",
      "setDisplayNoByReq",
      "invalidateRequestDetailsLoads",
      "resetAiQuickUi",
      "clearAiQuickSessionHistory",
      "applyLocalDraftSnapshotToBoundary",
      "patchForemanDurableDraftRecoveryState",
      "refreshBoundarySyncState",
    ]);
    expect(mockPatchForemanDurableDraftRecoveryState).toHaveBeenCalledWith(
      expect.objectContaining({
        lastSyncAt: expect.any(Number),
      }),
    );
  });
});
