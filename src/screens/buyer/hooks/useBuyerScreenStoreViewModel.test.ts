import fs from "fs";
import path from "path";

import type { BuyerScreenState } from "../buyer.store";
import { selectBuyerScreenStoreViewModel } from "./useBuyerScreenStoreViewModel";

const readBuyerFile = (relativePath: string): string =>
  fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const setTab: BuyerScreenState["setTab"] = () => undefined;
const setSelectedRequestId: BuyerScreenState["setSelectedRequestId"] = () => undefined;
const setSelectedSupplierId: BuyerScreenState["setSelectedSupplierId"] = () => undefined;
const setFilters: BuyerScreenState["setFilters"] = () => undefined;
const setSortMode: BuyerScreenState["setSortMode"] = () => undefined;
const openModal: BuyerScreenState["openModal"] = () => undefined;
const closeModal: BuyerScreenState["closeModal"] = () => undefined;
const setLoading: BuyerScreenState["setLoading"] = () => undefined;
const setRefreshReason: BuyerScreenState["setRefreshReason"] = () => undefined;
const toggleSection: BuyerScreenState["toggleSection"] = () => undefined;

describe("useBuyerScreenStoreViewModel", () => {
  it("maps BuyerScreen store values and setters without changing behavior", () => {
    const state: BuyerScreenState = {
      activeTab: "pending",
      selectedRequestId: "req-1",
      selectedSupplierId: "supplier-1",
      filters: { searchQuery: "cement" },
      sortMode: "priority",
      modal: { type: "inbox", entityId: "req-1" },
      loading: { list: true, action: false },
      refreshReason: "manual",
      expandedSections: { "req-1": true },
      setTab,
      setSelectedRequestId,
      setSelectedSupplierId,
      setFilters,
      setSortMode,
      openModal,
      closeModal,
      setLoading,
      setRefreshReason,
      toggleSection,
    };

    expect(selectBuyerScreenStoreViewModel(state)).toEqual({
      tab: "pending",
      setTab,
      searchQuery: "cement",
      setFilters,
      setLoading,
      setRefreshReason,
    });
  });

  it("defaults missing search query the same way BuyerScreen did", () => {
    const state: BuyerScreenState = {
      activeTab: "inbox",
      selectedRequestId: null,
      selectedSupplierId: null,
      filters: {},
      sortMode: "date",
      modal: { type: "none" },
      loading: { list: false, action: false },
      refreshReason: null,
      expandedSections: {},
      setTab,
      setSelectedRequestId,
      setSelectedSupplierId,
      setFilters,
      setSortMode,
      openModal,
      closeModal,
      setLoading,
      setRefreshReason,
      toggleSection,
    };

    expect(selectBuyerScreenStoreViewModel(state).searchQuery).toBe("");
  });

  it("keeps BuyerScreen store selector pressure behind one typed hook", () => {
    const screenSource = readBuyerFile("BuyerScreen.tsx");
    const uiStateSource = readBuyerFile("hooks/useBuyerScreenUiState.ts");
    const hookSource = readBuyerFile("hooks/useBuyerScreenStoreViewModel.ts");
    const hookCalls = screenSource.match(/\buse[A-Z][A-Za-z0-9_]*\s*\(|React\.use[A-Z][A-Za-z0-9_]*\s*\(/g) ?? [];

    expect(screenSource).toContain('import { useBuyerScreenUiState } from "./hooks/useBuyerScreenUiState";');
    expect(screenSource).toContain("} = useBuyerScreenUiState({ supabase, alertUser: screenAlertUser });");
    expect(screenSource).not.toContain("useBuyerStore(");
    expect(screenSource).not.toContain("useBuyerScreenStoreViewModel();");
    expect(hookCalls.length).toBeLessThanOrEqual(36);

    expect(hookSource).toContain("export type BuyerScreenStoreViewModel");
    expect(hookSource).toContain("selectBuyerScreenStoreViewModel");
    expect(hookSource).toContain("useShallow(selectBuyerScreenStoreViewModel)");
    expect(hookSource.match(/useBuyerStore\(/g) ?? []).toHaveLength(1);
    expect(uiStateSource).toContain("useBuyerScreenStoreViewModel()");
  });
});
