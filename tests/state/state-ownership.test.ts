/**
 * State ownership discipline tests.
 *
 * WAVE T: Validates that Zustand UI stores have correct initial state,
 * proper reset/cleanup methods, and no state bleed between actions.
 *
 * Focused on the Director UI store as the most complex single-screen
 * state cluster (24 state fields, mixed selection/modal/loading/filter).
 */

import { useDirectorUiStore } from "../../src/screens/director/directorUi.store";
import { useBuyerStore } from "../../src/screens/buyer/buyer.store";

describe("state ownership — directorUi.store", () => {
  beforeEach(() => {
    // Reset to initial state
    useDirectorUiStore.setState(useDirectorUiStore.getInitialState());
  });

  it("initial state has no stale selection", () => {
    const state = useDirectorUiStore.getState();
    expect(state.selectedRequestId).toBeNull();
    expect(state.selectedProposalId).toBeNull();
    expect(state.actingId).toBeNull();
    expect(state.decidingId).toBeNull();
    expect(state.sheetKind).toBe("none");
  });

  it("initial state has no stale loading flags", () => {
    const state = useDirectorUiStore.getState();
    expect(state.finLoading).toBe(false);
    expect(state.loadingRows).toBe(false);
    expect(state.loadingProps).toBe(false);
    expect(state.loadingPropId).toBeNull();
  });

  it("openRequestSheet sets selection and clears proposal", () => {
    const { openRequestSheet } = useDirectorUiStore.getState();
    openRequestSheet("req-123");
    const after = useDirectorUiStore.getState();
    expect(after.sheetKind).toBe("request");
    expect(after.selectedRequestId).toBe("req-123");
    expect(after.selectedProposalId).toBeNull();
  });

  it("openProposalSheet sets selection and clears request", () => {
    const { openProposalSheet } = useDirectorUiStore.getState();
    openProposalSheet("prop-456");
    const after = useDirectorUiStore.getState();
    expect(after.sheetKind).toBe("proposal");
    expect(after.selectedProposalId).toBe("prop-456");
    expect(after.selectedRequestId).toBeNull();
  });

  it("closeSheetUi clears all sheet state", () => {
    const store = useDirectorUiStore.getState();
    store.openRequestSheet("req-123");
    useDirectorUiStore.getState().closeSheetUi();
    const after = useDirectorUiStore.getState();
    expect(after.sheetKind).toBe("none");
    expect(after.selectedRequestId).toBeNull();
    expect(after.selectedProposalId).toBeNull();
  });

  it("closeFinanceUi resets all finance state without touching sheet state", () => {
    const store = useDirectorUiStore.getState();
    store.setFinOpen(true);
    store.setFinPage("supplier");
    store.setFinLoading(true);
    store.setFinKindName("materials");
    store.setFinSupplierSelection({ supplier: "s1", kindName: "k1" });
    store.openRequestSheet("req-999");

    useDirectorUiStore.getState().closeFinanceUi();
    const after = useDirectorUiStore.getState();

    // Finance should be reset
    expect(after.finOpen).toBe(false);
    expect(after.finPage).toBe("home");
    expect(after.finLoading).toBe(false);
    expect(after.finKindName).toBe("");
    expect(after.finSupplierSelection).toBeNull();

    // Sheet state should NOT be affected by finance close
    expect(after.sheetKind).toBe("request");
    expect(after.selectedRequestId).toBe("req-999");
  });

  it("openRequestSheet sanitizes empty/nullish IDs", () => {
    const store = useDirectorUiStore.getState();
    store.openRequestSheet("" as unknown as number);
    const after = useDirectorUiStore.getState();
    expect(after.selectedRequestId).toBeNull();
  });
});

describe("state ownership — buyer.store", () => {
  beforeEach(() => {
    useBuyerStore.setState(useBuyerStore.getInitialState());
  });

  it("initial state has clean selection", () => {
    const state = useBuyerStore.getState();
    expect(state.selectedRequestId).toBeNull();
    expect(state.selectedSupplierId).toBeNull();
    expect(state.modal.type).toBe("none");
    expect(state.loading.list).toBe(false);
    expect(state.loading.action).toBe(false);
  });

  it("openModal sets type and entityId", () => {
    const store = useBuyerStore.getState();
    store.openModal("prop_details", "entity-1");
    const after = useBuyerStore.getState();
    expect(after.modal.type).toBe("prop_details");
    expect(after.modal.entityId).toBe("entity-1");
  });

  it("closeModal resets modal to none", () => {
    const store = useBuyerStore.getState();
    store.openModal("prop_details", "entity-1");
    useBuyerStore.getState().closeModal();
    const after = useBuyerStore.getState();
    expect(after.modal.type).toBe("none");
  });

  it("setFilters merges without overwriting unrelated keys", () => {
    const store = useBuyerStore.getState();
    store.setFilters({ searchQuery: "test" });
    useBuyerStore.getState().setFilters({ status: "pending" });
    const after = useBuyerStore.getState();
    expect(after.filters.searchQuery).toBe("test");
    expect(after.filters.status).toBe("pending");
  });

  it("toggleSection toggles correctly and is idempotent on double-toggle", () => {
    const store = useBuyerStore.getState();
    store.toggleSection("sec-1");
    expect(useBuyerStore.getState().expandedSections["sec-1"]).toBe(true);
    useBuyerStore.getState().toggleSection("sec-1");
    expect(useBuyerStore.getState().expandedSections["sec-1"]).toBe(false);
  });

  it("setLoading merges without overwriting unrelated loading keys", () => {
    const store = useBuyerStore.getState();
    store.setLoading({ list: true });
    const after1 = useBuyerStore.getState();
    expect(after1.loading.list).toBe(true);
    expect(after1.loading.action).toBe(false);

    useBuyerStore.getState().setLoading({ action: true });
    const after2 = useBuyerStore.getState();
    expect(after2.loading.list).toBe(true);
    expect(after2.loading.action).toBe(true);
  });
});
