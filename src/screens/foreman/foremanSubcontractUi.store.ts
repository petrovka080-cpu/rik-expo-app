import { create } from "zustand";
import type { Subcontract } from "../subcontracts/subcontracts.shared";

export type DateTarget = "contractDate" | "dateStart" | "dateEnd" | null;
export type SubcontractFlowScreen = "details" | "draft" | "catalog" | "workType" | "calc";
export type SubcontractSelectedWorkType = { code: string; name: string } | null;

type ForemanSubcontractUiStore = {
  historyOpen: boolean;
  subcontractFlowOpen: boolean;
  subcontractFlowScreen: SubcontractFlowScreen;
  selectedWorkType: SubcontractSelectedWorkType;
  dateTarget: DateTarget;
  templateContract: Subcontract | null;
  setHistoryOpen: (value: boolean) => void;
  setSubcontractFlowOpen: (value: boolean) => void;
  setSubcontractFlowScreen: (value: SubcontractFlowScreen) => void;
  setSelectedWorkType: (value: SubcontractSelectedWorkType) => void;
  setDateTarget: (value: DateTarget) => void;
  setTemplateContract: (value: Subcontract | null) => void;
  closeSubcontractFlow: () => void;
};

export const useForemanSubcontractUiStore = create<ForemanSubcontractUiStore>((set) => ({
  historyOpen: false,
  subcontractFlowOpen: false,
  subcontractFlowScreen: "details",
  selectedWorkType: null,
  dateTarget: null,
  templateContract: null,
  setHistoryOpen: (value) => set({ historyOpen: value }),
  setSubcontractFlowOpen: (value) => set({ subcontractFlowOpen: value }),
  setSubcontractFlowScreen: (value) => set({ subcontractFlowScreen: value }),
  setSelectedWorkType: (value) => set({ selectedWorkType: value }),
  setDateTarget: (value) => set({ dateTarget: value }),
  setTemplateContract: (value) => set({ templateContract: value }),
  closeSubcontractFlow: () =>
    set({
      subcontractFlowOpen: false,
      subcontractFlowScreen: "details",
      selectedWorkType: null,
      dateTarget: null,
      templateContract: null,
    }),
}));
