import { useCallback } from "react";
import { fetchPaidAggByProposal, computePayStatus } from "./accountant.payment";
import { mapHistoryRowToCurrentRow } from "./accountant.history.service";
import type { HistoryRow, AccountantInboxUiRow } from "./types";

export function useAccountantHistoryFlow(params: {
    setCurrentPaymentId: (id: number | null) => void;
    setAccountantFio: (fio: string) => void;
    openCard: (row: AccountantInboxUiRow) => void;
}) {
    const { setCurrentPaymentId, setAccountantFio, openCard } = params;

    const onOpenHistoryRow = useCallback(async (item: HistoryRow) => {
        setCurrentPaymentId(Number(item.payment_id));
        setAccountantFio(String(item.accountant_fio ?? "").trim());

        let agg = { total_paid: 0, payments_count: 0, last_paid_at: 0 };
        try {
            agg = await fetchPaidAggByProposal(String(item.proposal_id));
        } catch { }

        const inv = Number(item.invoice_amount ?? 0);
        const st = computePayStatus(null, inv, agg.total_paid);

        const mappedRow = mapHistoryRowToCurrentRow({
            item,
            totalPaid: agg.total_paid,
            paymentsCount: agg.payments_count,
            paymentStatus: st,
        });
        openCard(mappedRow);
    }, [setCurrentPaymentId, setAccountantFio, openCard]);

    return { onOpenHistoryRow };
}
