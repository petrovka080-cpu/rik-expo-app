import type { SetStateAction } from "react";
import { create } from "zustand";

type WorkOverlayModal = "none" | "contract" | "estimate" | "stage";

type ContractorUiStore = {
  code: string;
  workModalVisible: boolean;
  workModalReadOnly: boolean;
  workModalLoading: boolean;
  workOverlayModal: WorkOverlayModal;
  historyOpen: boolean;
  issuedOpen: boolean;
  actBuilderVisible: boolean;
  actBuilderHint: string;
  workModalHint: string;
  workSearchVisible: boolean;
  setCode: (value: SetStateAction<string>) => void;
  setWorkModalVisible: (value: SetStateAction<boolean>) => void;
  setWorkModalReadOnly: (value: SetStateAction<boolean>) => void;
  setWorkModalLoading: (value: SetStateAction<boolean>) => void;
  setWorkOverlayModal: (value: SetStateAction<WorkOverlayModal>) => void;
  setHistoryOpen: (value: SetStateAction<boolean>) => void;
  setIssuedOpen: (value: SetStateAction<boolean>) => void;
  setActBuilderVisible: (value: SetStateAction<boolean>) => void;
  setActBuilderHint: (value: SetStateAction<string>) => void;
  setWorkModalHint: (value: SetStateAction<string>) => void;
  setWorkSearchVisible: (value: SetStateAction<boolean>) => void;
};

const resolveUpdate = <T,>(value: SetStateAction<T>, prev: T): T =>
  typeof value === "function" ? (value as (current: T) => T)(prev) : value;

export const useContractorUiStore = create<ContractorUiStore>((set) => ({
  code: "",
  workModalVisible: false,
  workModalReadOnly: false,
  workModalLoading: false,
  workOverlayModal: "none",
  historyOpen: false,
  issuedOpen: false,
  actBuilderVisible: false,
  actBuilderHint: "",
  workModalHint: "",
  workSearchVisible: false,
  setCode: (value) => set((state) => ({ code: resolveUpdate(value, state.code) })),
  setWorkModalVisible: (value) => set((state) => ({ workModalVisible: resolveUpdate(value, state.workModalVisible) })),
  setWorkModalReadOnly: (value) =>
    set((state) => ({ workModalReadOnly: resolveUpdate(value, state.workModalReadOnly) })),
  setWorkModalLoading: (value) =>
    set((state) => ({ workModalLoading: resolveUpdate(value, state.workModalLoading) })),
  setWorkOverlayModal: (value) =>
    set((state) => ({ workOverlayModal: resolveUpdate(value, state.workOverlayModal) })),
  setHistoryOpen: (value) => set((state) => ({ historyOpen: resolveUpdate(value, state.historyOpen) })),
  setIssuedOpen: (value) => set((state) => ({ issuedOpen: resolveUpdate(value, state.issuedOpen) })),
  setActBuilderVisible: (value) =>
    set((state) => ({ actBuilderVisible: resolveUpdate(value, state.actBuilderVisible) })),
  setActBuilderHint: (value) => set((state) => ({ actBuilderHint: resolveUpdate(value, state.actBuilderHint) })),
  setWorkModalHint: (value) => set((state) => ({ workModalHint: resolveUpdate(value, state.workModalHint) })),
  setWorkSearchVisible: (value) =>
    set((state) => ({ workSearchVisible: resolveUpdate(value, state.workSearchVisible) })),
}));
