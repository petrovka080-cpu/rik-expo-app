import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AccountantInboxUiRow, Tab } from "./types";
import { computePayStatus, computePayStatusKey, fetchPaidAggByProposal } from "./accountant.payment";

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
  const { current, setTab, load, tabs } = params;

  return useCallback(
    async (proposalId: string) => {
      const pid = String(proposalId || "").trim();
      if (!pid) return;

      const agg = await fetchPaidAggByProposal(pid);
      const inv = Number(current?.invoice_amount ?? 0);
      const statusKey = computePayStatusKey(current?.payment_status, inv, agg.total_paid);
      const statusLabel = computePayStatus(current?.payment_status, inv, agg.total_paid);
      const nextTab =
        statusKey === "PAID" ? tabs.paid : statusKey === "PART" ? tabs.part : statusKey === "REWORK" ? tabs.rework : tabs.pay;

      setTab(nextTab);
      await load(true);
      return { st: statusLabel, agg };
    },
    [current, load, setTab, tabs.paid, tabs.part, tabs.pay, tabs.rework],
  );
}

