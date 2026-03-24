import { create } from "zustand";

export type ForemanDraftSelectedWorkType = { code: string; name: string } | null;

type ForemanDraftStore = {
  draftOpen: boolean;
  busy: boolean;
  draftDeleteBusy: boolean;
  draftSendBusy: boolean;
  calcVisible: boolean;
  catalogVisible: boolean;
  workTypePickerVisible: boolean;
  selectedWorkType: ForemanDraftSelectedWorkType;
  setDraftOpen: (value: boolean) => void;
  openDraft: () => void;
  closeDraft: () => void;
  setBusy: (value: boolean) => void;
  setDraftDeleteBusy: (value: boolean) => void;
  setDraftSendBusy: (value: boolean) => void;
  setCalcVisible: (value: boolean) => void;
  setCatalogVisible: (value: boolean) => void;
  setWorkTypePickerVisible: (value: boolean) => void;
  setSelectedWorkType: (value: ForemanDraftSelectedWorkType) => void;
  openCatalog: () => void;
  closeCatalog: () => void;
  openWorkTypePicker: () => void;
  closeWorkTypePicker: () => void;
  showCalcForWorkType: (value: ForemanDraftSelectedWorkType) => void;
  closeCalc: () => void;
  backToWorkTypePicker: () => void;
};

export const useForemanDraftStore = create<ForemanDraftStore>((set) => ({
  draftOpen: false,
  busy: false,
  draftDeleteBusy: false,
  draftSendBusy: false,
  calcVisible: false,
  catalogVisible: false,
  workTypePickerVisible: false,
  selectedWorkType: null,
  setDraftOpen: (value) => set({ draftOpen: value }),
  openDraft: () => set({ draftOpen: true }),
  closeDraft: () => set({ draftOpen: false }),
  setBusy: (value) => set({ busy: value }),
  setDraftDeleteBusy: (value) => set({ draftDeleteBusy: value }),
  setDraftSendBusy: (value) => set({ draftSendBusy: value }),
  setCalcVisible: (value) => set({ calcVisible: value }),
  setCatalogVisible: (value) => set({ catalogVisible: value }),
  setWorkTypePickerVisible: (value) => set({ workTypePickerVisible: value }),
  setSelectedWorkType: (value) => set({ selectedWorkType: value }),
  openCatalog: () => set({ catalogVisible: true }),
  closeCatalog: () => set({ catalogVisible: false }),
  openWorkTypePicker: () => set({ workTypePickerVisible: true }),
  closeWorkTypePicker: () => set({ workTypePickerVisible: false }),
  showCalcForWorkType: (value) =>
    set({
      selectedWorkType: value,
      workTypePickerVisible: false,
      calcVisible: true,
    }),
  closeCalc: () => set({ calcVisible: false, selectedWorkType: null }),
  backToWorkTypePicker: () =>
    set({
      calcVisible: false,
      selectedWorkType: null,
      workTypePickerVisible: true,
    }),
}));
