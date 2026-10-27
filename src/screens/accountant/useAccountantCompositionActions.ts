import { useCallback, type Dispatch, type SetStateAction } from "react";

import { getAccountantErrorText } from "./helpers";
import type { AccountantInboxUiRow, Tab } from "./types";
import { useAccountantHistoryFlow } from "./useAccountantHistoryFlow";
import { useAccountantPayActions } from "./useAccountantPayActions";
import { useAccountantPostPaymentSync } from "./useAccountantPostPaymentSync";
import { useAccountantReturnAction } from "./useAccountantReturnAction";

type AllocRow = { proposal_item_id: string; amount: number };
type PayKind = "bank" | "cash";

type AccountantCompositionActionsParams = {
  current: AccountantInboxUiRow | null;
  amount: string;
  accountantFio: string;
  payKind: PayKind;
  note: string;
  allocRows: AllocRow[];
  allocOk: boolean;
  purposePrefix: string;
  invoiceNo: string;
  invoiceDate: string;
  setTab: Dispatch<SetStateAction<Tab>>;
  load: (force?: boolean, tabOverride?: Tab) => Promise<void>;
  closeCard: () => void;
  setCurrentPaymentId: Dispatch<SetStateAction<number | null>>;
  setRows: Dispatch<SetStateAction<AccountantInboxUiRow[]>>;
  setAccountantFio: Dispatch<SetStateAction<string>>;
  openCard: (row: AccountantInboxUiRow) => void;
  safeAlert: (title: string, msg: string) => void;
  tabs: {
    pay: Tab;
    part: Tab;
    paid: Tab;
    rework: Tab;
  };
};

export function useAccountantCompositionActions({
  current,
  amount,
  accountantFio,
  payKind,
  note,
  allocRows,
  allocOk,
  purposePrefix,
  invoiceNo,
  invoiceDate,
  setTab,
  load,
  closeCard,
  setCurrentPaymentId,
  setRows,
  setAccountantFio,
  openCard,
  safeAlert,
  tabs,
}: AccountantCompositionActionsParams) {
  const afterPaymentSync = useAccountantPostPaymentSync({
    current,
    setTab,
    load,
    tabs,
  });
  const errText = useCallback((error: unknown) => getAccountantErrorText(error), []);

  const { onPayConfirm } = useAccountantPayActions({
    canAct: true,
    current,
    amount,
    accountantFio,
    payKind,
    note,
    allocRows,
    allocOk,
    purposePrefix,
    afterPaymentSync,
    closeCard,
    setCurrentPaymentId,
    setRows,
    safeAlert,
    errText,
    invoiceNumber: invoiceNo,
    invoiceDate,
    invoiceCurrency: current?.invoice_currency ?? "KGS",
  });

  const onReturnToBuyer = useAccountantReturnAction({
    canAct: true,
    current,
    note,
    closeCard,
    load: () => load(true),
    setRows,
    safeAlert,
    errText,
  });

  const { onOpenHistoryRow } = useAccountantHistoryFlow({
    setCurrentPaymentId,
    setAccountantFio,
    openCard,
    safeAlert,
    errText,
  });

  return {
    onPayConfirm,
    onReturnToBuyer,
    onOpenHistoryRow,
  };
}
