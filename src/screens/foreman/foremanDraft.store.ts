import { create } from "zustand";

type ForemanDraftStore = {
  draftOpen: boolean;
  busy: boolean;
  draftDeleteBusy: boolean;
  draftSendBusy: boolean;
  aiEstimateVisible: boolean;
  catalogVisible: boolean;
  setDraftOpen: (value: boolean) => void;
  openDraft: () => void;
  closeDraft: () => void;
  setBusy: (value: boolean) => void;
  setDraftDeleteBusy: (value: boolean) => void;
  setDraftSendBusy: (value: boolean) => void;
  setAiEstimateVisible: (value: boolean) => void;
  setCatalogVisible: (value: boolean) => void;
  openCatalog: () => void;
  closeCatalog: () => void;
  openAiEstimateComposer: () => void;
  closeAiEstimateComposer: () => void;
};

export const useForemanDraftStore = create<ForemanDraftStore>((set) => ({
  draftOpen: false,
  busy: false,
  draftDeleteBusy: false,
  draftSendBusy: false,
  aiEstimateVisible: false,
  catalogVisible: false,
  setDraftOpen: (value) => set({ draftOpen: value }),
  openDraft: () => set({ draftOpen: true }),
  closeDraft: () => set({ draftOpen: false }),
  setBusy: (value) => set({ busy: value }),
  setDraftDeleteBusy: (value) => set({ draftDeleteBusy: value }),
  setDraftSendBusy: (value) => set({ draftSendBusy: value }),
  setAiEstimateVisible: (value) => set({ aiEstimateVisible: value }),
  setCatalogVisible: (value) => set({ catalogVisible: value }),
  openCatalog: () => set({ catalogVisible: true }),
  closeCatalog: () => set({ catalogVisible: false }),
  openAiEstimateComposer: () => set({ aiEstimateVisible: true }),
  closeAiEstimateComposer: () => set({ aiEstimateVisible: false }),
}));
