import { useMemo } from "react";
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
  getReceiveStatusText: (incomingId: string) => string | null;
  getPickedQty: (codeRaw: string, uomId: string | null) => number;
  openStockIssue: (row: StockRow) => void;
}) {
  const renderReqHeadItem = useMemo(
    () =>
      createWarehouseReqHeadRenderer({
        openReq: params.openReq,
        fmtRuDate: params.fmtRuDate,
      }),
    [params.openReq, params.fmtRuDate],
  );

  const renderIncomingItem = useMemo(
    () =>
      createWarehouseIncomingRenderer({
        openItemsModal: params.openItemsModal,
        fmtRuDate: params.fmtRuDate,
        getReceiveStatusText: params.getReceiveStatusText,
      }),
    [params.openItemsModal, params.fmtRuDate, params.getReceiveStatusText],
  );

  const renderStockItem = useMemo(
    () =>
      createWarehouseStockRenderer({
        getPickedQty: params.getPickedQty,
        openStockIssue: params.openStockIssue,
      }),
    [params.getPickedQty, params.openStockIssue],
  );

  return { renderReqHeadItem, renderIncomingItem, renderStockItem };
}
