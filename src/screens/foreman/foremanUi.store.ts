import type { SetStateAction } from "react";
import { create } from "zustand";
import type { ForemanHeaderAttentionState } from "./foreman.headerRequirements";
import type { ForemanAiQuickItem } from "./foreman.ai";

export type ForemanMainTab = "materials" | "subcontracts" | null;
export type ForemanSelectedWorkType = { code: string; name: string } | null;

type ForemanUiStore = {
  isFioConfirmVisible: boolean;
  isFioLoading: boolean;
  draftOpen: boolean;
  busy: boolean;
  foremanMainTab: ForemanMainTab;
  draftDeleteBusy: boolean;
  draftSendBusy: boolean;
  calcVisible: boolean;
  catalogVisible: boolean;
  workTypePickerVisible: boolean;
  selectedWorkType: ForemanSelectedWorkType;
  aiQuickVisible: boolean;
  aiQuickText: string;
  aiQuickLoading: boolean;
  aiQuickError: string;
  aiQuickNotice: string;
  aiQuickPreview: ForemanAiQuickItem[];
  headerAttention: ForemanHeaderAttentionState | null;
  selectedObjectName: string;
  setIsFioConfirmVisible: (value: boolean) => void;
  setIsFioLoading: (value: boolean) => void;
  setDraftOpen: (value: boolean) => void;
  setBusy: (value: boolean) => void;
  setForemanMainTab: (value: ForemanMainTab) => void;
  setDraftDeleteBusy: (value: boolean) => void;
  setDraftSendBusy: (value: boolean) => void;
  setCalcVisible: (value: boolean) => void;
  setCatalogVisible: (value: boolean) => void;
  setWorkTypePickerVisible: (value: boolean) => void;
  setSelectedWorkType: (value: ForemanSelectedWorkType) => void;
  setAiQuickVisible: (value: boolean) => void;
  setAiQuickText: (value: string) => void;
  setAiQuickLoading: (value: boolean) => void;
  setAiQuickError: (value: string) => void;
  setAiQuickNotice: (value: SetStateAction<string>) => void;
  setAiQuickPreview: (value: ForemanAiQuickItem[]) => void;
  setHeaderAttention: (value: SetStateAction<ForemanHeaderAttentionState | null>) => void;
  setSelectedObjectName: (value: string) => void;
  resetAiQuickUi: () => void;
};

const resolveUpdate = <T,>(value: SetStateAction<T>, prev: T): T =>
  typeof value === "function" ? (value as (current: T) => T)(prev) : value;

export const useForemanUiStore = create<ForemanUiStore>((set) => ({
  isFioConfirmVisible: false,
  isFioLoading: false,
  draftOpen: false,
  busy: false,
  foremanMainTab: null,
  draftDeleteBusy: false,
  draftSendBusy: false,
  calcVisible: false,
  catalogVisible: false,
  workTypePickerVisible: false,
  selectedWorkType: null,
  aiQuickVisible: false,
  aiQuickText: "",
  aiQuickLoading: false,
  aiQuickError: "",
  aiQuickNotice: "",
  aiQuickPreview: [],
  headerAttention: null,
  selectedObjectName: "",
  setIsFioConfirmVisible: (value) => set({ isFioConfirmVisible: value }),
  setIsFioLoading: (value) => set({ isFioLoading: value }),
  setDraftOpen: (value) => set({ draftOpen: value }),
  setBusy: (value) => set({ busy: value }),
  setForemanMainTab: (value) => set({ foremanMainTab: value }),
  setDraftDeleteBusy: (value) => set({ draftDeleteBusy: value }),
  setDraftSendBusy: (value) => set({ draftSendBusy: value }),
  setCalcVisible: (value) => set({ calcVisible: value }),
  setCatalogVisible: (value) => set({ catalogVisible: value }),
  setWorkTypePickerVisible: (value) => set({ workTypePickerVisible: value }),
  setSelectedWorkType: (value) => set({ selectedWorkType: value }),
  setAiQuickVisible: (value) => set({ aiQuickVisible: value }),
  setAiQuickText: (value) => set({ aiQuickText: value }),
  setAiQuickLoading: (value) => set({ aiQuickLoading: value }),
  setAiQuickError: (value) => set({ aiQuickError: value }),
  setAiQuickNotice: (value) => set((state) => ({ aiQuickNotice: resolveUpdate(value, state.aiQuickNotice) })),
  setAiQuickPreview: (value) => set({ aiQuickPreview: Array.isArray(value) ? value : [] }),
  setHeaderAttention: (value) => set((state) => ({ headerAttention: resolveUpdate(value, state.headerAttention) })),
  setSelectedObjectName: (value) => set({ selectedObjectName: value }),
  resetAiQuickUi: () =>
    set({
      aiQuickVisible: false,
      aiQuickText: "",
      aiQuickLoading: false,
      aiQuickError: "",
      aiQuickNotice: "",
      aiQuickPreview: [],
    }),
}));
