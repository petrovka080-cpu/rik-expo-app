import { formatProposalBaseNo } from "../../../lib/format";
import { nz } from "../warehouse.utils";
import { uomLabelRu } from "../warehouse.uom";
import type { IncomingRow, ReqHeadRow, StockRow } from "../warehouse.types";

type IncomingCardParams = {
  row: IncomingRow;
  fmtRuDate: (iso?: string | null) => string;
  proposalNoByPurchase: Record<string, string | null | undefined>;
};

export function mapWarehouseIncomingToCardProps(params: IncomingCardParams) {
  const { row, fmtRuDate, proposalNoByPurchase } = params;
  const recSum = Math.round(nz(row.qty_received_sum, 0));
  const leftSum = Math.round(nz(row.qty_expected_sum, 0) - nz(row.qty_received_sum, 0));

  const title = formatProposalBaseNo(
    proposalNoByPurchase[row.purchase_id] || row.po_no,
    row.purchase_id,
  );

  return {
    title,
    subtitle: fmtRuDate(row.purchase_created_at) || "—",
    receivedLabel: `Принято ${recSum}`,
    leftLabel: `Осталось ${leftSum}`,
  };
}

const fmtQty = (n: number) =>
  Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 3 });

type StockCardParams = {
  row: StockRow;
  pickedQty?: number;
};

export function mapWarehouseStockToCardProps(params: StockCardParams) {
  const { row, pickedQty } = params;
  const onHand = nz(row.qty_on_hand, 0);
  const reserved = nz(row.qty_reserved, 0);
  const available = nz(row.qty_available, 0);
  const uomLabel = uomLabelRu(row.uom_id);
  const picked = Number(pickedQty ?? 0);

  return {
    title: String(row.name ?? "").trim() || "—",
    subtitle: `Доступно ${fmtQty(available)} ${uomLabel} · Резерв ${fmtQty(reserved)}`,
    meta: picked > 0 ? `Выбрано: ${fmtQty(picked)} ${uomLabel}` : undefined,
    onHandLabel: fmtQty(onHand),
    isPicked: picked > 0,
  };
}

type ReqHeadCardParams = {
  row: ReqHeadRow;
  fmtRuDate: (iso?: string | null) => string;
};

export function mapWarehouseReqHeadToCardProps(params: ReqHeadCardParams) {
  const { row, fmtRuDate } = params;
  const totalPos = Math.max(0, Number(row.items_cnt ?? 0));
  const openPos = Math.max(0, Number(row.ready_cnt ?? 0));
  const issuedPos = Math.max(0, Number(row.done_cnt ?? 0));
  const hasToIssue = openPos > 0;
  const isFullyIssued = issuedPos >= totalPos && totalPos > 0;

  const locParts: string[] = [];
  const obj = String(row.object_name || "").trim();
  const lvl = String(row.level_name || row.level_code || "").trim();
  const sys = String(row.system_name || row.system_code || "").trim();
  if (obj) locParts.push(obj);
  if (lvl) locParts.push(lvl);
  if (sys) locParts.push(sys);

  return {
    title: row.display_no || `REQ-${row.request_id.slice(0, 8)}`,
    subtitle: fmtRuDate(row.submitted_at),
    meta: locParts.length > 0 ? locParts.join(" • ") : undefined,
    hasToIssue,
    isFullyIssued,
    openPos,
    issuedPos,
  };
}
