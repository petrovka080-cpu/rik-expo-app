import type { AccountantInboxUiRow, Tab } from "./types";

type AccountantCompositionMetricsParams = {
  tab: Tab;
  tabs: {
    pay: Tab;
    part: Tab;
    paid: Tab;
    rework: Tab;
    history: Tab;
  };
  amount: string;
  current: AccountantInboxUiRow | null;
  busyKey: string | null | undefined;
};

export function buildAccountantCompositionMetrics({
  tab,
  tabs,
  amount,
  current,
  busyKey,
}: AccountantCompositionMetricsParams) {
  const isReadOnlyTab = tab === tabs.history || tab === tabs.paid || tab === tabs.rework;
  const isPayActiveTab = tab === tabs.pay || tab === tabs.part;
  const payAccent =
    isPayActiveTab && !isReadOnlyTab
      ? { borderColor: "rgba(34,197,94,0.55)", backgroundColor: "rgba(34,197,94,0.06)" }
      : null;

  const parsedAmount = Number(String(amount || "").replace(",", "."));
  const amountNum = Number.isFinite(parsedAmount) ? parsedAmount : 0;

  return {
    isReadOnlyTab,
    isPayActiveTab,
    payAccent,
    canPayUi: !isReadOnlyTab && !!current?.proposal_id && amountNum > 0 && !busyKey,
    isHistoryTab: tab === tabs.history,
  };
}
