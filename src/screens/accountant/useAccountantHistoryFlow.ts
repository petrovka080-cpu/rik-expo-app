import { useCallback } from "react";

import { accountantLoadProposalFinancialState } from "../../lib/api/accountant";
import { mapHistoryRowToCurrentRow } from "./accountant.history.service";
import type { AccountantInboxUiRow, HistoryRow } from "./types";

export function useAccountantHistoryFlow(params: {
  setCurrentPaymentId: (id: number | null) => void;
  setAccountantFio: (fio: string) => void;
  openCard: (row: AccountantInboxUiRow) => void;
  safeAlert: (title: string, message: string) => void;
  errText: (error: unknown) => string;
}) {
  const { setCurrentPaymentId, setAccountantFio, openCard, safeAlert, errText } = params;

  const onOpenHistoryRow = useCallback(
    async (item: HistoryRow) => {
      setCurrentPaymentId(Number(item.payment_id));
      setAccountantFio(String(item.accountant_fio ?? "").trim());

      try {
        const financialState = await accountantLoadProposalFinancialState(
          String(item.proposal_id),
        );
        const mappedRow = mapHistoryRowToCurrentRow({
          item,
          totalPaid: financialState.totals.totalPaid,
          paymentsCount: financialState.totals.paymentsCount,
          paymentStatus:
            financialState.totals.paymentStatus ?? "К оплате",
        });
        openCard(mappedRow);
      } catch (error) {
        safeAlert(
          "Ошибка финансового состояния",
          `Не удалось открыть серверное финансовое состояние предложения: ${errText(error)}`,
        );
      }
    },
    [errText, openCard, safeAlert, setAccountantFio, setCurrentPaymentId],
  );

  return { onOpenHistoryRow };
}
