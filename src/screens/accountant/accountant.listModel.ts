import type { HistoryRow } from "./types";

export type AccountantInboxListRowBase = {
  proposal_id?: string | number | null;
};

export type AccountantListItem<TInbox extends AccountantInboxListRowBase> =
  | { __kind: "history"; data: HistoryRow }
  | { __kind: "inbox"; data: TInbox };

export function buildAccountantListModel<TInbox extends AccountantInboxListRowBase>({
  isHistory,
  historyRows,
  rows,
}: {
  isHistory: boolean;
  historyRows: HistoryRow[];
  rows: TInbox[];
}): AccountantListItem<TInbox>[] {
  if (isHistory) {
    return historyRows.map((row) => ({ __kind: "history" as const, data: row }));
  }
  return rows.map((row) => ({ __kind: "inbox" as const, data: row }));
}

export function getAccountantListItemKey<TInbox extends AccountantInboxListRowBase>(
  item: AccountantListItem<TInbox>,
  index: number,
): string {
  if (item.__kind === "history") {
    return `history:${String(item.data.payment_id ?? index)}`;
  }
  return `inbox:${String(item.data.proposal_id ?? index)}`;
}

export function getAccountantListEstimatedItemSize(isHistory: boolean): number {
  return isHistory ? 112 : 128;
}
