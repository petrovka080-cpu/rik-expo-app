import { useShallow } from "zustand/react/shallow";

import {
  type AccountantUiStore,
  useAccountantUiStore,
} from "./accountantUi.store";

export type AccountantScreenViewModel = Pick<
  AccountantUiStore,
  | "tab"
  | "setTab"
  | "histSearchUi"
  | "setHistSearchUi"
  | "dateFrom"
  | "setDateFrom"
  | "dateTo"
  | "setDateTo"
  | "periodOpen"
  | "setPeriodOpen"
  | "cardOpen"
  | "setCardOpen"
  | "currentPaymentId"
  | "setCurrentPaymentId"
  | "accountantFio"
  | "setAccountantFio"
  | "freezeWhileOpen"
  | "setFreezeWhileOpen"
>;

export const selectAccountantScreenViewModel = (
  state: AccountantUiStore,
): AccountantScreenViewModel => ({
  tab: state.tab,
  setTab: state.setTab,
  histSearchUi: state.histSearchUi,
  setHistSearchUi: state.setHistSearchUi,
  dateFrom: state.dateFrom,
  setDateFrom: state.setDateFrom,
  dateTo: state.dateTo,
  setDateTo: state.setDateTo,
  periodOpen: state.periodOpen,
  setPeriodOpen: state.setPeriodOpen,
  cardOpen: state.cardOpen,
  setCardOpen: state.setCardOpen,
  currentPaymentId: state.currentPaymentId,
  setCurrentPaymentId: state.setCurrentPaymentId,
  accountantFio: state.accountantFio,
  setAccountantFio: state.setAccountantFio,
  freezeWhileOpen: state.freezeWhileOpen,
  setFreezeWhileOpen: state.setFreezeWhileOpen,
});

export function useAccountantScreenViewModel(): AccountantScreenViewModel {
  return useAccountantUiStore(useShallow(selectAccountantScreenViewModel));
}
