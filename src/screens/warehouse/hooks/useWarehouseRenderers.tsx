import { useCallback } from "react";
import {
  createWarehouseIncomingRenderer,
  createWarehouseReqHeadRenderer,
  createWarehouseStockRenderer,
} from "../warehouse.renderers";
import type { IncomingRow, ReqHeadRow, StockRow } from "../warehouse.types";

export function useWarehouseRenderers(params: {
  openReq: (row: ReqHeadRow) => void;
  fmtRuDate: (iso?: string | null) => string;
  openItemsModal: (row: IncomingRow) => void;
  proposalNoByPurchase: Record<string, string | null | undefined>;
  getPickedQty: (codeRaw: string, uomId: string | null) => number;
  openStockIssue: (row: StockRow) => void;
}) {
  const reqRendererParams = {
    openReq: params.openReq,
    fmtRuDate: params.fmtRuDate,
  };
  const incomingRendererParams = {
    openItemsModal: params.openItemsModal,
    fmtRuDate: params.fmtRuDate,
    proposalNoByPurchase: params.proposalNoByPurchase,
  };
  const stockRendererParams = {
    getPickedQty: params.getPickedQty,
    openStockIssue: params.openStockIssue,
  };

  const renderReqHeadItem = useCallback(
    createWarehouseReqHeadRenderer(reqRendererParams),
    [reqRendererParams.openReq, reqRendererParams.fmtRuDate],
  );

  const renderIncomingItem = useCallback(
    createWarehouseIncomingRenderer(incomingRendererParams),
    [
      incomingRendererParams.openItemsModal,
      incomingRendererParams.fmtRuDate,
      incomingRendererParams.proposalNoByPurchase,
    ],
  );

  const renderStockItem = useCallback(
    createWarehouseStockRenderer(stockRendererParams),
    [stockRendererParams.getPickedQty, stockRendererParams.openStockIssue],
  );

  return { renderReqHeadItem, renderIncomingItem, renderStockItem };
}
