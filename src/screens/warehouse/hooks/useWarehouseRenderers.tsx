import { useCallback } from "react";
import type { ListRenderItem } from "react-native";

import IncomingRowItem from "../components/IncomingRowItem";
import ReqHeadRowItem from "../components/ReqHeadRowItem";
import StockRowView from "../components/StockRowView";
import type { IncomingRow, ReqHeadRow, StockRow } from "../warehouse.types";

export function useWarehouseRenderers(params: {
  openReq: (row: ReqHeadRow) => void;
  fmtRuDate: (iso?: string | null) => string;
  openItemsModal: (row: IncomingRow) => void;
  proposalNoByPurchase: Record<string, string | null | undefined>;
  getPickedQty: (codeRaw: string, uomId: string | null) => number;
  openStockIssue: (row: StockRow) => void;
}) {
  const {
    openReq,
    fmtRuDate,
    openItemsModal,
    proposalNoByPurchase,
    getPickedQty,
    openStockIssue,
  } = params;

  const renderReqHeadItem = useCallback<ListRenderItem<ReqHeadRow>>(({ item }) => {
    return <ReqHeadRowItem row={item} onPress={openReq} fmtRuDate={fmtRuDate} />;
  }, [openReq, fmtRuDate]);

  const renderIncomingItem = useCallback<ListRenderItem<IncomingRow>>(({ item }) => {
    return (
      <IncomingRowItem
        row={item}
        onPress={openItemsModal}
        fmtRuDate={fmtRuDate}
        proposalNoByPurchase={proposalNoByPurchase}
      />
    );
  }, [openItemsModal, fmtRuDate, proposalNoByPurchase]);

  const renderStockItem = useCallback<ListRenderItem<StockRow>>(({ item }) => {
    const codeRaw = String(item.code ?? "").trim();
    const pickedQty = getPickedQty(codeRaw, item?.uom_id ? String(item.uom_id).trim() : null);
    return <StockRowView r={item} pickedQty={pickedQty} onPress={openStockIssue} />;
  }, [getPickedQty, openStockIssue]);

  return { renderReqHeadItem, renderIncomingItem, renderStockItem };
}
