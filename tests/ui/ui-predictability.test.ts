/**
 * UI state predictability tests.
 *
 * WAVE X: Validates that UI stores produce predictable, stable state
 * transitions — especially on reopen/reset cycles. Focuses on the
 * Foreman AI panel (most complex modal cluster) and Warehouse UI store
 * (most filter/pick options).
 */

import { useForemanUiStore } from "../../src/screens/foreman/foremanUi.store";
import { useWarehouseUiStore } from "../../src/screens/warehouse/warehouseUi.store";

describe("UI predictability — foreman AI panel cluster", () => {
  beforeEach(() => {
    useForemanUiStore.setState(useForemanUiStore.getInitialState());
  });

  it("initial AI state is idle with no stale data", () => {
    const s = useForemanUiStore.getState();
    expect(s.aiQuickVisible).toBe(false);
    expect(s.aiQuickText).toBe("");
    expect(s.aiQuickLoading).toBe(false);
    expect(s.aiQuickError).toBe("");
    expect(s.aiQuickPreview).toEqual([]);
    expect(s.aiQuickOutcomeType).toBe("idle");
    expect(s.aiQuickCandidateGroups).toEqual([]);
    expect(s.aiQuickQuestions).toEqual([]);
    expect(s.aiUnavailableReason).toBe("");
  });

  it("resetAiQuickUi clears all AI-panel state", () => {
    const store = useForemanUiStore.getState();
    store.setAiQuickVisible(true);
    store.setAiQuickText("some query");
    store.setAiQuickLoading(true);
    store.setAiQuickError("some error");
    store.setAiQuickOutcomeType("hard_fail_safe");
    store.setAiUnavailableReason("model_down");

    useForemanUiStore.getState().resetAiQuickUi();
    const after = useForemanUiStore.getState();

    expect(after.aiQuickVisible).toBe(false);
    expect(after.aiQuickText).toBe("");
    expect(after.aiQuickLoading).toBe(false);
    expect(after.aiQuickError).toBe("");
    expect(after.aiQuickOutcomeType).toBe("idle");
    expect(after.aiUnavailableReason).toBe("");
    expect(after.aiQuickPreview).toEqual([]);
    expect(after.aiQuickCandidateGroups).toEqual([]);
    expect(after.aiQuickQuestions).toEqual([]);
  });

  it("resetAiQuickUi does NOT clear non-AI state", () => {
    const store = useForemanUiStore.getState();
    store.setForemanMainTab("materials");
    store.setSelectedObjectName("TestObject");
    store.setAiQuickVisible(true);
    store.setAiQuickText("query");

    useForemanUiStore.getState().resetAiQuickUi();
    const after = useForemanUiStore.getState();

    // Non-AI state preserved
    expect(after.foremanMainTab).toBe("materials");
    expect(after.selectedObjectName).toBe("TestObject");
    // AI state reset
    expect(after.aiQuickVisible).toBe(false);
    expect(after.aiQuickText).toBe("");
  });

  it("reopen cycle: open → fill → reset → open → state is clean", () => {
    const store = useForemanUiStore.getState();

    // First open
    store.setAiQuickVisible(true);
    store.setAiQuickText("query 1");
    store.setAiQuickOutcomeType("resolved_items");
    store.setAiQuickPreview([{ name: "test", unit: "kg", qty: 1 }] as any);

    // Close/reset
    useForemanUiStore.getState().resetAiQuickUi();

    // Second open
    useForemanUiStore.getState().setAiQuickVisible(true);
    const after = useForemanUiStore.getState();

    // No stale data from first session
    expect(after.aiQuickVisible).toBe(true);
    expect(after.aiQuickText).toBe("");
    expect(after.aiQuickOutcomeType).toBe("idle");
    expect(after.aiQuickPreview).toEqual([]);
  });

  it("pushAiQuickSessionTurn respects history limit", () => {
    const store = useForemanUiStore.getState();
    for (let i = 0; i < 10; i++) {
      useForemanUiStore.getState().pushAiQuickSessionTurn({
        prompt: `prompt ${i}`,
        items: [{ name: `item${i}`, unit: "kg", qty: 1 }] as any,
        createdAt: new Date().toISOString(),
      });
    }
    const after = useForemanUiStore.getState();
    // History capped at 5
    expect(after.aiQuickSessionHistory.length).toBeLessThanOrEqual(5);
    // Last item is most recent
    expect(after.aiQuickSessionHistory[after.aiQuickSessionHistory.length - 1].prompt).toBe("prompt 9");
  });

  it("pushAiQuickSessionTurn rejects empty/invalid turns", () => {
    const store = useForemanUiStore.getState();
    store.pushAiQuickSessionTurn(null as any);
    store.pushAiQuickSessionTurn({ prompt: "", items: [], createdAt: "" } as any);
    store.pushAiQuickSessionTurn({ prompt: "valid", items: [], createdAt: "" } as any);
    const after = useForemanUiStore.getState();
    expect(after.aiQuickSessionHistory).toEqual([]);
  });
});

describe("UI predictability — warehouse UI store", () => {
  beforeEach(() => {
    useWarehouseUiStore.setState(useWarehouseUiStore.getInitialState());
  });

  it("initial state has no stale modals or selections", () => {
    const s = useWarehouseUiStore.getState();
    expect(s.isRecipientModalVisible).toBe(false);
    expect(s.issueDetailsId).toBeNull();
    expect(s.incomingDetailsId).toBeNull();
    expect(s.itemsModal).toBeNull();
    expect(s.isFioConfirmVisible).toBe(false);
    expect(s.pickModal.what).toBeNull();
    expect(s.pickFilter).toBe("");
  });

  it("pick modal open/close cycle doesn't leak state", () => {
    const store = useWarehouseUiStore.getState();
    store.setPickModal({ what: "object" });
    store.setPickFilter("search term");
    const mid = useWarehouseUiStore.getState();
    expect(mid.pickModal.what).toBe("object");
    expect(mid.pickFilter).toBe("search term");

    // Close pick modal
    useWarehouseUiStore.getState().setPickModal({ what: null });
    useWarehouseUiStore.getState().setPickFilter("");
    const after = useWarehouseUiStore.getState();
    expect(after.pickModal.what).toBeNull();
    expect(after.pickFilter).toBe("");
  });

  it("SetStateAction updater works correctly (functional updates)", () => {
    const store = useWarehouseUiStore.getState();
    store.setPickFilter("initial");
    useWarehouseUiStore.getState().setPickFilter((prev) => prev + " updated");
    const after = useWarehouseUiStore.getState();
    expect(after.pickFilter).toBe("initial updated");
  });

  it("items modal open/close preserves other state", () => {
    const store = useWarehouseUiStore.getState();
    store.setObjectOpt({ id: "obj1", label: "Object 1" } as any);
    store.setItemsModal({
      incomingId: "inc-1",
      purchaseId: "pur-1",
      poNo: "PO-001",
      status: "active",
    });

    const mid = useWarehouseUiStore.getState();
    expect(mid.itemsModal).toBeTruthy();
    expect(mid.objectOpt).toBeTruthy();

    // Close modal
    useWarehouseUiStore.getState().setItemsModal(null);
    const after = useWarehouseUiStore.getState();
    expect(after.itemsModal).toBeNull();
    // Object filter preserved
    expect(after.objectOpt).toEqual({ id: "obj1", label: "Object 1" });
  });

  it("full reset cycle returns to clean initial state", () => {
    const store = useWarehouseUiStore.getState();
    store.setPickModal({ what: "zone" });
    store.setPickFilter("test");
    store.setRecipientText("someone");
    store.setIssueDetailsId(42);
    store.setIsFioConfirmVisible(true);

    // Full reset
    useWarehouseUiStore.setState(useWarehouseUiStore.getInitialState());
    const after = useWarehouseUiStore.getState();

    expect(after.pickModal.what).toBeNull();
    expect(after.pickFilter).toBe("");
    expect(after.recipientText).toBe("");
    expect(after.issueDetailsId).toBeNull();
    expect(after.isFioConfirmVisible).toBe(false);
  });
});
