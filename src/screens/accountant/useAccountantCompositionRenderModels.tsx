import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";

import { UI } from "./ui";
import ListRow from "./components/ListRow";
import { HistoryHeader, HistoryRowCard } from "./components/HistorySection";
import type { AccountantInboxUiRow, HistoryRow } from "./types";

type AccountantCompositionRenderModelsParams = {
  openCard: (row: AccountantInboxUiRow) => void;
  onOpenHistoryRow: (item: HistoryRow) => void;
  historyTotalCount: number;
  historyTotalAmount: number;
  historyCurrency: string;
  dateFrom: string;
  dateTo: string;
  histSearchUi: string;
  setHistSearchUi: Dispatch<SetStateAction<string>>;
  setPeriodOpen: Dispatch<SetStateAction<boolean>>;
  loadHistory: (force?: boolean) => Promise<void>;
};

export function useAccountantCompositionRenderModels({
  openCard,
  onOpenHistoryRow,
  historyTotalCount,
  historyTotalAmount,
  historyCurrency,
  dateFrom,
  dateTo,
  histSearchUi,
  setHistSearchUi,
  setPeriodOpen,
  loadHistory,
}: AccountantCompositionRenderModelsParams) {
  const renderInboxRow = useCallback(
    (item: AccountantInboxUiRow) => <ListRow item={item} onPress={() => openCard(item)} />,
    [openCard],
  );

  const historyHeader = useMemo(
    () => (
      <HistoryHeader
        totalCount={historyTotalCount}
        totalAmount={historyTotalAmount}
        totalCurrency={historyCurrency}
        dateFrom={dateFrom}
        dateTo={dateTo}
        searchValue={histSearchUi}
        setSearchValue={setHistSearchUi}
        onOpenPeriod={() => setPeriodOpen(true)}
        onRefresh={() => void loadHistory(true)}
        ui={{ text: UI.text, sub: UI.sub, cardBg: UI.cardBg }}
      />
    ),
    [
      historyTotalCount,
      historyTotalAmount,
      historyCurrency,
      dateFrom,
      dateTo,
      histSearchUi,
      loadHistory,
      setHistSearchUi,
      setPeriodOpen,
    ],
  );

  const renderHistoryRow = useCallback(
    (item: HistoryRow) => (
      <HistoryRowCard item={item} onOpen={onOpenHistoryRow} ui={{ cardBg: UI.cardBg, text: UI.text, sub: UI.sub }} />
    ),
    [onOpenHistoryRow],
  );

  return {
    renderInboxRow,
    historyHeader,
    renderHistoryRow,
  };
}
