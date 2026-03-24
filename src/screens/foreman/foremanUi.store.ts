import type { SetStateAction } from "react";
import { create } from "zustand";
import type { CandidateOptionGroup, ClarifyQuestion, ForemanAiQuickItem } from "./foreman.ai";
import type { ForemanHeaderAttentionState } from "./foreman.headerRequirements";

export type ForemanMainTab = "materials" | "subcontracts" | null;
export type ForemanAiOutcomeType =
  | "idle"
  | "resolved_items"
  | "candidate_options"
  | "clarify_required"
  | "ai_unavailable";

type ForemanUiStore = {
  isFioConfirmVisible: boolean;
  isFioLoading: boolean;
  fioBootstrapScopeKey: string | null;
  foremanMainTab: ForemanMainTab;
  aiQuickVisible: boolean;
  aiQuickText: string;
  aiQuickLoading: boolean;
  aiQuickError: string;
  aiQuickNotice: string;
  aiQuickPreview: ForemanAiQuickItem[];
  aiQuickOutcomeType: ForemanAiOutcomeType;
  aiQuickCandidateGroups: CandidateOptionGroup[];
  aiQuickQuestions: ClarifyQuestion[];
  aiUnavailableReason: string;
  headerAttention: ForemanHeaderAttentionState | null;
  selectedObjectName: string;
  foremanHistory: string[];
  setIsFioConfirmVisible: (value: boolean) => void;
  setIsFioLoading: (value: boolean) => void;
  setFioBootstrapScopeKey: (value: string | null) => void;
  setForemanMainTab: (value: ForemanMainTab) => void;
  setAiQuickVisible: (value: boolean) => void;
  setAiQuickText: (value: string) => void;
  setAiQuickLoading: (value: boolean) => void;
  setAiQuickError: (value: string) => void;
  setAiQuickNotice: (value: SetStateAction<string>) => void;
  setAiQuickPreview: (value: ForemanAiQuickItem[]) => void;
  setAiQuickOutcomeType: (value: ForemanAiOutcomeType) => void;
  setAiQuickCandidateGroups: (value: CandidateOptionGroup[]) => void;
  setAiQuickQuestions: (value: ClarifyQuestion[]) => void;
  setAiUnavailableReason: (value: string) => void;
  setHeaderAttention: (value: SetStateAction<ForemanHeaderAttentionState | null>) => void;
  setSelectedObjectName: (value: string) => void;
  setForemanHistory: (value: string[]) => void;
  resetAiQuickUi: () => void;
};

const resolveUpdate = <T,>(value: SetStateAction<T>, prev: T): T =>
  typeof value === "function" ? (value as (current: T) => T)(prev) : value;

export const useForemanUiStore = create<ForemanUiStore>((set) => ({
  isFioConfirmVisible: false,
  isFioLoading: false,
  fioBootstrapScopeKey: null,
  foremanMainTab: null,
  aiQuickVisible: false,
  aiQuickText: "",
  aiQuickLoading: false,
  aiQuickError: "",
  aiQuickNotice: "",
  aiQuickPreview: [],
  aiQuickOutcomeType: "idle",
  aiQuickCandidateGroups: [],
  aiQuickQuestions: [],
  aiUnavailableReason: "",
  headerAttention: null,
  selectedObjectName: "",
  foremanHistory: [],
  setIsFioConfirmVisible: (value) => set({ isFioConfirmVisible: value }),
  setIsFioLoading: (value) => set({ isFioLoading: value }),
  setFioBootstrapScopeKey: (value) => set({ fioBootstrapScopeKey: value }),
  setForemanMainTab: (value) => set({ foremanMainTab: value }),
  setAiQuickVisible: (value) => set({ aiQuickVisible: value }),
  setAiQuickText: (value) => set({ aiQuickText: value }),
  setAiQuickLoading: (value) => set({ aiQuickLoading: value }),
  setAiQuickError: (value) => set({ aiQuickError: value }),
  setAiQuickNotice: (value) => set((state) => ({ aiQuickNotice: resolveUpdate(value, state.aiQuickNotice) })),
  setAiQuickPreview: (value) => set({ aiQuickPreview: Array.isArray(value) ? value : [] }),
  setAiQuickOutcomeType: (value) => set({ aiQuickOutcomeType: value }),
  setAiQuickCandidateGroups: (value) =>
    set({ aiQuickCandidateGroups: Array.isArray(value) ? value : [] }),
  setAiQuickQuestions: (value) => set({ aiQuickQuestions: Array.isArray(value) ? value : [] }),
  setAiUnavailableReason: (value) => set({ aiUnavailableReason: value }),
  setHeaderAttention: (value) =>
    set((state) => ({ headerAttention: resolveUpdate(value, state.headerAttention) })),
  setSelectedObjectName: (value) => set({ selectedObjectName: value }),
  setForemanHistory: (value) => set({ foremanHistory: Array.isArray(value) ? value : [] }),
  resetAiQuickUi: () =>
    set({
      aiQuickVisible: false,
      aiQuickText: "",
      aiQuickLoading: false,
      aiQuickError: "",
      aiQuickNotice: "",
      aiQuickPreview: [],
      aiQuickOutcomeType: "idle",
      aiQuickCandidateGroups: [],
      aiQuickQuestions: [],
      aiUnavailableReason: "",
    }),
}));
