import type { SetStateAction } from "react";
import { create } from "zustand";
import { TABS, type Tab } from "./types";

const resolveUpdate = <T,>(value: SetStateAction<T>, prev: T): T =>
  typeof value === "function" ? (value as (current: T) => T)(prev) : value;

type AccountantUiStore = {
  tab: Tab;
  histSearchUi: string;
  dateFrom: string;
  dateTo: string;
  periodOpen: boolean;
  cardOpen: boolean;
  freezeWhileOpen: boolean;
  currentPaymentId: number | null;
  accountantFio: string;
  setTab: (value: SetStateAction<Tab>) => void;
  setHistSearchUi: (value: SetStateAction<string>) => void;
  setDateFrom: (value: SetStateAction<string>) => void;
  setDateTo: (value: SetStateAction<string>) => void;
  setPeriodOpen: (value: SetStateAction<boolean>) => void;
  setCardOpen: (value: SetStateAction<boolean>) => void;
  setFreezeWhileOpen: (value: SetStateAction<boolean>) => void;
  setCurrentPaymentId: (value: SetStateAction<number | null>) => void;
  setAccountantFio: (value: SetStateAction<string>) => void;
};

export const createAccountantUiStore = (initialTab: Tab) =>
  create<AccountantUiStore>((set) => ({
    tab: initialTab,
    histSearchUi: "",
    dateFrom: "",
    dateTo: "",
    periodOpen: false,
    cardOpen: false,
    freezeWhileOpen: false,
    currentPaymentId: null,
    accountantFio: "",
    setTab: (value) => set((state) => ({ tab: resolveUpdate(value, state.tab) })),
    setHistSearchUi: (value) => set((state) => ({ histSearchUi: resolveUpdate(value, state.histSearchUi) })),
    setDateFrom: (value) => set((state) => ({ dateFrom: resolveUpdate(value, state.dateFrom) })),
    setDateTo: (value) => set((state) => ({ dateTo: resolveUpdate(value, state.dateTo) })),
    setPeriodOpen: (value) => set((state) => ({ periodOpen: resolveUpdate(value, state.periodOpen) })),
    setCardOpen: (value) => set((state) => ({ cardOpen: resolveUpdate(value, state.cardOpen) })),
    setFreezeWhileOpen: (value) =>
      set((state) => ({ freezeWhileOpen: resolveUpdate(value, state.freezeWhileOpen) })),
    setCurrentPaymentId: (value) =>
      set((state) => ({ currentPaymentId: resolveUpdate(value, state.currentPaymentId) })),
    setAccountantFio: (value) => set((state) => ({ accountantFio: resolveUpdate(value, state.accountantFio) })),
  }));

export const useAccountantUiStore = createAccountantUiStore(TABS[0]);
