import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { accountantLoadProposalFinancialState } from "../../lib/api/accountant";
import { normalizePaymentStatusKind, paymentStatusLabel } from "./accountant.status";
import type { AccountantInboxUiRow, Tab } from "./types";

export function useAccountantPostPaymentSync(params: {
  current: AccountantInboxUiRow | null;
  setTab: Dispatch<SetStateAction<Tab>>;
  load: (force?: boolean, tabOverride?: Tab) => Promise<void>;
  tabs: {
    pay: Tab;
    part: Tab;
    paid: Tab;
    rework: Tab;
  };
}) {
  const { setTab, load, tabs } = params;

  return useCallback(
    async (proposalId: string) => {
      const pid = String(proposalId || "").trim();
      if (!pid) return;

      const financialState = await accountantLoadProposalFinancialState(pid);
      const statusKey = normalizePaymentStatusKind(financialState.totals.paymentStatus);
      const statusLabel =
        financialState.totals.paymentStatus ?? paymentStatusLabel(statusKey);
      const nextTab =
        statusKey === "PAID"
          ? tabs.paid
          : statusKey === "PART"
            ? tabs.part
            : statusKey === "REWORK"
              ? tabs.rework
              : tabs.pay;

      setTab(nextTab);
      await load(true);
      return { st: statusLabel, financialState };
    },
    [load, setTab, tabs.paid, tabs.part, tabs.pay, tabs.rework],
  );
}
