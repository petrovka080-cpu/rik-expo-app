import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
  listConsumerRepairWorkspaceHistory,
} from "../../src/lib/consumerRequests";
import { findConsumerRepairBundle, saveConsumerRepairBundle } from "../../src/lib/consumerRequests/consumerRequestRepository";
import * as projection from "../../src/lib/consumerRequests/consumerRequestEditableEstimateSnapshot";
import { assertEstimateRevisionStateIntegrity } from "../../src/lib/ai/estimateRevisions/estimateRevisionIntegrityGuard";
import { buildInitialConsumerRepairRequestState } from "../../src/features/consumerRepair/requestEstimateScreenActions";

function fixture(owner: string, ordinal: number) {
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: owner,
    problemText: `Workspace fixture ${ordinal}`,
    aiDraft: {
      titleRu: "Сохранённый состав", summaryRu: "Проверочный проект", repairType: "repair",
      missingData: [], dangerousDiyBlocked: false,
      items: [{ itemType: "material", titleRu: "Материал с известным количеством", quantity: 30, unit: "kg", source: "ai_suggested" }],
    },
  });
  return saveConsumerRepairBundle({
    ...bundle,
    draft: { ...bundle.draft, createdAt: new Date(Date.UTC(2026, 9, 5, 0, ordinal)).toISOString() },
  });
}

describe("workspace history reads without compatibility revision rebuilding", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());
  afterEach(() => { jest.restoreAllMocks(); __resetConsumerRepairRequestStoreForTests(); });

  it("keeps full isolated rows and hashes, without invoking the history binder or mutating storage", () => {
    const saved = fixture("owner", 0);
    const before = JSON.stringify(findConsumerRepairBundle(saved.draft.id));
    const bind = jest.spyOn(projection, "bindConsumerRepairEstimateRevisionHistory");
    const [read] = listConsumerRepairWorkspaceHistory("owner");
    expect(bind).not.toHaveBeenCalled();
    expect(JSON.stringify(read)).toBe(before);
    expect(read.items[0].quantity).toBe(30);
    expect(read.items[0].unitPrice).toBeNull();
    read.items[0].quantity = 999;
    read.draft.title = "Changed clone";
    expect(JSON.stringify(findConsumerRepairBundle(saved.draft.id))).toBe(before);
    listConsumerRepairRequestHistory("owner");
    expect(bind).toHaveBeenCalledTimes(1);
  });

  it("preserves owner, deleted-status, cursor and page filters", () => {
    const first = fixture("owner", 1);
    const second = fixture("owner", 2);
    const third = fixture("owner", 3);
    fixture("other", 4);
    const deleted = fixture("owner", 5);
    saveConsumerRepairBundle({ ...deleted, draft: { ...deleted.draft, status: "deleted_by_user" } });
    expect(listConsumerRepairWorkspaceHistory("owner", { limit: 2 }).map(b => b.draft.id)).toEqual([third.draft.id, second.draft.id]);
    expect(listConsumerRepairWorkspaceHistory("owner", { cursorCreatedAt: second.draft.createdAt }).map(b => b.draft.id)).toEqual([first.draft.id]);
    expect(listConsumerRepairWorkspaceHistory("owner", { statuses: ["consumer_approved"] })).toEqual([]);
  });

  it("restores an exact active draft outside the first archive page with its complete quantities", () => {
    const exact = fixture("owner", 0);
    for (let ordinal = 1; ordinal <= 21; ordinal += 1) fixture("owner", ordinal);
    expect(listConsumerRepairWorkspaceHistory("owner").some(b => b.draft.id === exact.draft.id)).toBe(false);
    const history = listConsumerRepairWorkspaceHistory("owner", { exactDraftId: exact.draft.id });
    const initial = buildInitialConsumerRepairRequestState({ initialDraftId: exact.draft.id, history });
    expect(initial.bundle?.draft.id).toBe(exact.draft.id);
    expect(initial.bundle?.items[0].quantity).toBe(30);
    expect(initial.bundle?.estimateRevisionState).toEqual(exact.estimateRevisionState);
    expect(initial.statusMessage).toBeNull();
  });

  it("never adds another owner's, approved or deleted exact workspace outside the page", () => {
    const other = fixture("other", 0);
    const approved = fixture("owner", 0);
    saveConsumerRepairBundle({ ...approved, draft: { ...approved.draft, status: "consumer_approved" } });
    const deleted = fixture("owner", 0);
    saveConsumerRepairBundle({ ...deleted, draft: { ...deleted.draft, deletedAt: "2026-10-05T01:00:00.000Z" } });
    for (let ordinal = 1; ordinal <= 21; ordinal += 1) fixture("owner", ordinal);
    for (const id of [other.draft.id, approved.draft.id, deleted.draft.id, "missing"]) {
      const history = listConsumerRepairWorkspaceHistory("owner", { exactDraftId: id });
      expect(history.some(b => b.draft.id === id)).toBe(false);
      expect(buildInitialConsumerRepairRequestState({ initialDraftId: id, history }).bundle).toBeNull();
    }
  });

  it("does not turn the screen read into integrity approval for a corrupt selected revision", () => {
    fixture("owner", 0);
    const [read] = listConsumerRepairWorkspaceHistory("owner");
    const state = read.estimateRevisionState!;
    const current = state.revisions.find(revision => revision.revision_id === state.current_revision_id)!;
    current.editable_estimate_snapshot.rows[0].quantity = 999;
    expect(() => assertEstimateRevisionStateIntegrity(state)).toThrow("ESTIMATE_REVISION_ROWS_HASH_STALE");
    expect(listConsumerRepairWorkspaceHistory("owner")[0].items[0].quantity).toBe(30);
  });
});
