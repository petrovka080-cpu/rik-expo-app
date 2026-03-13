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
  return ({ item }) => <ReqHeadRowItem row={item} onPress={params.openReq} fmtRuDate={params.fmtRuDate} />;
}

export function createWarehouseIncomingRenderer(params: {
  openItemsModal: (row: IncomingRow) => void;
  fmtRuDate: (iso?: string | null) => string;
  proposalNoByPurchase: Record<string, string | null | undefined>;
}): ListRenderItem<IncomingRow> {
  return ({ item }) => (
    <IncomingRowItem
      row={item}
      onPress={params.openItemsModal}
      fmtRuDate={params.fmtRuDate}
      proposalNoByPurchase={params.proposalNoByPurchase}
    />
  );
}

export function createWarehouseStockRenderer(params: {
  getPickedQty: (codeRaw: string, uomId: string | null) => number;
  openStockIssue: (row: StockRow) => void;
}): ListRenderItem<StockRow> {
  return ({ item }) => (
    <StockRowView
      r={item}
      pickedQty={selectWarehousePickedQty(item, params.getPickedQty)}
      onPress={params.openStockIssue}
    />
  );
}
