import React from "react";
import type { ListRenderItem } from "react-native";

import IncomingRowItem from "./components/IncomingRowItem";
import ReqHeadRowItem from "./components/ReqHeadRowItem";
import StockRowView from "./components/StockRowView";
import type { IncomingRow, ReqHeadRow, StockRow } from "./warehouse.types";

function toWarehouseStockPickLookup(row: StockRow) {
  return {
    codeRaw: String(row.code ?? "").trim(),
    uomId: row?.uom_id ? String(row.uom_id).trim() : null,
  };
}

export function selectWarehousePickedQty(
  row: StockRow,
  getPickedQty: (codeRaw: string, uomId: string | null) => number,
) {
  const lookup = toWarehouseStockPickLookup(row);
  return getPickedQty(lookup.codeRaw, lookup.uomId);
}

export function createWarehouseReqHeadRenderer(params: {
  openReq: (row: ReqHeadRow) => void;
  fmtRuDate: (iso?: string | null) => string;
}): ListRenderItem<ReqHeadRow> {
  return function renderWarehouseReqHeadItem({ item }) {
    return <ReqHeadRowItem row={item} onPress={params.openReq} fmtRuDate={params.fmtRuDate} />;
  };
}

export function createWarehouseIncomingRenderer(params: {
  openItemsModal: (row: IncomingRow) => void;
  fmtRuDate: (iso?: string | null) => string;
  getReceiveStatusText?: (incomingId: string) => string | null;
}): ListRenderItem<IncomingRow> {
  return function renderWarehouseIncomingItem({ item }) {
    return (
      <IncomingRowItem
        row={item}
        onPress={params.openItemsModal}
        fmtRuDate={params.fmtRuDate}
        syncStatusText={params.getReceiveStatusText?.(String(item.incoming_id ?? "").trim()) ?? null}
      />
    );
  };
}

export function createWarehouseStockRenderer(params: {
  getPickedQty: (codeRaw: string, uomId: string | null) => number;
  openStockIssue: (row: StockRow) => void;
}): ListRenderItem<StockRow> {
  return function renderWarehouseStockItem({ item }) {
    return (
      <StockRowView
        r={item}
        pickedQty={selectWarehousePickedQty(item, params.getPickedQty)}
        onPress={params.openStockIssue}
      />
    );
  };
}
