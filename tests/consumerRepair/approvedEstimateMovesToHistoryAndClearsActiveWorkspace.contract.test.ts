import fs from "node:fs";
import path from "node:path";

import {
  createConsumerRepairRequestDraft,
  deleteConsumerRepairRequestDraft,
  listConsumerRepairRequestHistory,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import {
  awaitConsumerRepairBundleDurableCommit,
  getConsumerRepairBundle,
  saveConsumerRepairBundle,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import { InMemoryEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore.memory";
import { setConsumerRepairTransactionalStoreForTests } from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { buildApprovedConsumerRepairWorkspaceClearedState } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import {
  CONSUMER_REPAIR_TEST_USER_ID,
  createApprovedConsumerRepairRequest,
} from "./consumerRepairTestHelpers";

describe("approved estimate lifecycle clears active workspace", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("moves approved laminate to history and clears active editable estimate state", () => {
    const approved = createApprovedConsumerRepairRequest();
    const history = listConsumerRepairRequestHistory(CONSUMER_REPAIR_TEST_USER_ID);
    const state = buildApprovedConsumerRepairWorkspaceClearedState({
      history,
      statusMessage: "approved",
    });

    expect(history.map((bundle) => bundle.draft.id)).toContain(approved.draft.id);
    expect(history.find((bundle) => bundle.draft.id === approved.draft.id)?.draft.status).toBe("consumer_approved");
    expect(history.find((bundle) => bundle.draft.id === approved.draft.id)?.pdfs[0]?.revisionId).toBeTruthy();

    expect(state.bundle).toBeNull();
    expect(state.aiAnswerRu).toBeNull();
    expect(state.selectedWork).toBeNull();
    expect(state.selectedHistoryId).toBeNull();
    expect(buildRequestEstimateViewModel(state.bundle)).toBeNull();
    expect(state.bundle?.items ?? []).toHaveLength(0);
    expect(state.bundle?.estimateRevisionState?.current_revision_id ?? null).toBeNull();
  });

  it("does not auto-select the approved history card after approve clears the workspace", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("buildApprovedConsumerRepairWorkspaceClearedState");
    expect(source).not.toContain("selectedHistoryId: bundle.draft.id");
    expect(source).toContain('router.replace("/request")');
    expect(source).toContain("rollbackBundle: synced");
    expect(source).toContain("rollbackBundle: current");
    expect(source).not.toContain("this.state.history.find((candidate) => candidate.draft.id === result.draftId)");
    expect(source).toContain("Можно выбрать следующую работу");
  });

  it("clears the route-owned preview and transient deep-link workspace on the clean request route", () => {
    const container = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx"),
      "utf8",
    );
    const photoCaptureController = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/useConsumerRepairPhotoCaptureController.tsx"),
      "utf8",
    );

    expect(container).toContain("props.initialCanonicalRevisionId,");
    expect(container).toContain("props.initialDraftId,");
    expect(container).toContain("pendingCanonicalEstimateBundleRef.current = null");
    expect(container).toContain("setCanonicalEstimatePreview(null)");
    expect(container).toContain("canonicalDeepLinkWorkspaceDraftIdRef.current = null");
    expect(container).toContain("canonicalDeepLinkWorkspaceDraftIdsByConsumer.delete(resolvedConsumerUserId)");
    expect(container).toContain("workspaceGenerationRef.current += 1");
    expect(container).toContain('throw new Error("CANONICAL_WORKSPACE_REPLACED")');
    expect(container).toContain("expectedWorkspaceGeneration,");
    expect(container).toContain("result.workspaceGeneration !== workspaceGenerationRef.current");
    expect(container).toContain("workspaceGeneration: workspaceGenerationRef.current");
    expect(photoCaptureController).toContain("new AbortController()");
    expect(photoCaptureController).toContain("signal: controller.signal");
    expect(photoCaptureController).toContain("PHOTO_WORKSPACE_REPLACED");
    expect(photoCaptureController).toContain("currentWorkspaceGenerationRef.current");
  });

  it("restores a proven durable draft after a failed terminal transition and allows a clean retry", async () => {
    const initial = createConsumerRepairRequestDraft({
      consumerUserId: "terminal-reconciliation-user",
      problemText: "terminal reconciliation fixture",
      repairType: "durable_transition_test",
    });
    const durableStore = new InMemoryEstimateRevisionDurableStore();
    const seeded = await durableStore.writeBundleAtomically(initial.draft.id, null, initial);
    expect(seeded.status).toBe("WRITTEN");
    setConsumerRepairTransactionalStoreForTests(durableStore);
    durableStore.setFailureInjector((point) => {
      if (point === "before_pointer_switch") throw new Error("EXPECTED_TERMINAL_WRITE_FAILURE");
    });

    const attempted = saveConsumerRepairBundle({
      ...initial,
      draft: {
        ...initial.draft,
        status: "consumer_approved",
        updatedAt: "2026-09-22T00:00:01.000Z",
      },
    });
    await expect(awaitConsumerRepairBundleDurableCommit({
      requestDraftId: attempted.draft.id,
      expectedStatus: "consumer_approved",
      expectedRevisionId: attempted.estimateDraftRevisionState?.currentRevisionId ?? null,
      rollbackBundle: initial,
    })).rejects.toThrow("CONSUMER_REPAIR_TRANSACTIONAL_COMMIT_NOT_DURABLE");
    expect(getConsumerRepairBundle(initial.draft.id).draft.status).toBe("draft");

    durableStore.setFailureInjector(null);
    const retried = saveConsumerRepairBundle({
      ...getConsumerRepairBundle(initial.draft.id),
      draft: {
        ...getConsumerRepairBundle(initial.draft.id).draft,
        status: "consumer_approved",
        updatedAt: "2026-09-22T00:00:02.000Z",
      },
    });
    await expect(awaitConsumerRepairBundleDurableCommit({
      requestDraftId: retried.draft.id,
      expectedStatus: "consumer_approved",
      expectedRevisionId: retried.estimateDraftRevisionState?.currentRevisionId ?? null,
      rollbackBundle: initial,
    })).resolves.toBeUndefined();
    expect(getConsumerRepairBundle(initial.draft.id).draft.status).toBe("consumer_approved");
  });

  it("keeps a draft after a failed durable delete and removes only after a confirmed retry", async () => {
    class ToggleFailureStorage implements Storage {
      readonly values = new Map<string, string>();
      failWrites = false;
      get length(): number { return this.values.size; }
      clear(): void { this.values.clear(); }
      getItem(key: string): string | null { return this.values.get(key) ?? null; }
      key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
      removeItem(key: string): void { this.values.delete(key); }
      setItem(key: string, value: string): void {
        if (this.failWrites) throw new Error("EXPECTED_LOCAL_DURABLE_WRITE_FAILURE");
        this.values.set(key, value);
      }
    }

    const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const storage = new ToggleFailureStorage();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage,
    });
    try {
      __resetConsumerRepairRequestStoreForTests();
      const initial = createConsumerRepairRequestDraft({
        consumerUserId: "delete-reconciliation-user",
        problemText: "delete reconciliation fixture",
        repairType: "durable_delete_test",
      });
      storage.failWrites = true;
      const attempted = deleteConsumerRepairRequestDraft({
        requestDraftId: initial.draft.id,
        userId: initial.draft.consumerUserId,
      });
      await expect(awaitConsumerRepairBundleDurableCommit({
        requestDraftId: attempted.draft.id,
        expectedStatus: "deleted_by_user",
        expectedRevisionId: attempted.estimateDraftRevisionState?.currentRevisionId ?? null,
        rollbackBundle: initial,
      })).rejects.toThrow("CONSUMER_REPAIR_LOCAL_DURABLE_COMMIT_NOT_DURABLE");
      expect(getConsumerRepairBundle(initial.draft.id).draft.status).toBe("draft");
      expect(listConsumerRepairRequestHistory(initial.draft.consumerUserId)).toHaveLength(1);

      storage.failWrites = false;
      const retried = deleteConsumerRepairRequestDraft({
        requestDraftId: initial.draft.id,
        userId: initial.draft.consumerUserId,
      });
      await expect(awaitConsumerRepairBundleDurableCommit({
        requestDraftId: retried.draft.id,
        expectedStatus: "deleted_by_user",
        expectedRevisionId: retried.estimateDraftRevisionState?.currentRevisionId ?? null,
        rollbackBundle: initial,
      })).resolves.toBeUndefined();
      expect(listConsumerRepairRequestHistory(initial.draft.consumerUserId)).toEqual([]);
    } finally {
      storage.failWrites = false;
      __resetConsumerRepairRequestStoreForTests();
      if (originalLocalStorage) {
        Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
      } else {
        delete (globalThis as { localStorage?: Storage }).localStorage;
      }
    }
  });

  it("allows the owner to reconcile an indeterminate delete by retrying the same terminal operation", () => {
    const initial = createConsumerRepairRequestDraft({
      consumerUserId: "delete-unknown-outcome-user",
      problemText: "delete unknown outcome fixture",
      repairType: "durable_transition_test",
    });
    const deleted = deleteConsumerRepairRequestDraft({
      requestDraftId: initial.draft.id,
      userId: initial.draft.consumerUserId,
    });

    const retry = deleteConsumerRepairRequestDraft({
      requestDraftId: initial.draft.id,
      userId: initial.draft.consumerUserId,
    });

    expect(retry.draft.status).toBe("deleted_by_user");
    expect(retry.draft.id).toBe(deleted.draft.id);
    expect(retry.estimateDraftRevisionState?.currentRevisionId ?? null).toBe(
      deleted.estimateDraftRevisionState?.currentRevisionId ?? null,
    );
  });
});
