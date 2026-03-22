import { create } from "zustand";
import type { FinPage, Group, SheetKind, Tab } from "./director.types";

type DirectorUiStore = {
  requestTab: Tab;
  dirTab: string;
  finOpen: boolean;
  finPage: FinPage;
  finPeriodOpen: boolean;
  finFrom: string | null;
  finTo: string | null;
  sheetKind: SheetKind;
  sheetRequest: Group | null;
  sheetProposalId: string | null;
  refreshReason: string | null;
  setRequestTab: (value: Tab) => void;
  setDirTab: (value: string) => void;
  setFinOpen: (value: boolean) => void;
  setFinPage: (value: FinPage) => void;
  setFinPeriodOpen: (value: boolean) => void;
  setFinFrom: (value: string | null) => void;
  setFinTo: (value: string | null) => void;
  setSheetKind: (value: SheetKind) => void;
  setSheetRequest: (value: Group | null) => void;
  setSheetProposalId: (value: string | null) => void;
  setRefreshReason: (value: string | null) => void;
  closeFinanceUi: () => void;
  closeSheetUi: () => void;
};

export const useDirectorUiStore = create<DirectorUiStore>((set) => ({
  requestTab: "foreman",
  dirTab: "Заявки",
  finOpen: false,
  finPage: "home",
  finPeriodOpen: false,
  finFrom: null,
  finTo: null,
  sheetKind: "none",
  sheetRequest: null,
  sheetProposalId: null,
  refreshReason: null,
  setRequestTab: (value) => set({ requestTab: value }),
  setDirTab: (value) => set({ dirTab: value }),
  setFinOpen: (value) => set({ finOpen: value }),
  setFinPage: (value) => set({ finPage: value }),
  setFinPeriodOpen: (value) => set({ finPeriodOpen: value }),
  setFinFrom: (value) => set({ finFrom: value }),
  setFinTo: (value) => set({ finTo: value }),
  setSheetKind: (value) => set({ sheetKind: value }),
  setSheetRequest: (value) => set({ sheetRequest: value }),
  setSheetProposalId: (value) => set({ sheetProposalId: value }),
  setRefreshReason: (value) => set({ refreshReason: value }),
  closeFinanceUi: () =>
    set({
      finOpen: false,
      finPage: "home",
      finPeriodOpen: false,
    }),
  closeSheetUi: () =>
    set({
      sheetKind: "none",
      sheetRequest: null,
      sheetProposalId: null,
    }),
}));
