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

  return {
    title: formatProposalBaseNo(
      proposalNoByPurchase[row.purchase_id] || row.po_no,
      row.purchase_id,
    ),
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
    subtitle: `Доступно ${fmtQty(available)} ${uomLabel} • Резерв ${fmtQty(reserved)}`,
    meta: picked > 0 ? `Выбрано: ${fmtQty(picked)} ${uomLabel}` : undefined,
    onHandLabel: fmtQty(onHand),
    isPicked: picked > 0,
  };
}

type ReqHeadCardParams = {
  row: ReqHeadRow;
  fmtRuDate: (iso?: string | null) => string;
};

function formatReqRouteLine(row: ReqHeadRow, fmtRuDate: (iso?: string | null) => string) {
  return [
    fmtRuDate(row.submitted_at),
    String(row.object_name || "").trim(),
    String(row.level_name || row.level_code || "").trim(),
    String(row.system_name || row.system_code || row.zone_name || row.zone_code || "").trim(),
  ]
    .filter(Boolean)
    .join(" • ");
}

export function mapWarehouseReqHeadToCardProps(params: ReqHeadCardParams) {
  const { row, fmtRuDate } = params;
  const totalPos = Math.max(0, Number(row.items_cnt ?? 0));
  const remainingQty = Math.max(0, Number(row.qty_left_sum ?? 0));
  const issuableNowQty = Math.max(0, Number(row.qty_can_issue_now_sum ?? 0));
  const issuableNowPos = Math.max(0, Number(row.issuable_now_cnt ?? 0));
  const hasRemaining = remainingQty > 0;
  const hasIssuableNow = hasRemaining && issuableNowQty > 0 && issuableNowPos > 0;
  const isBlocked = hasRemaining && !hasIssuableNow;
  const isFullyIssued = !hasRemaining && totalPos > 0;
  const companyLine = String(row.contractor_name || "").trim();
  const waitingLabel =
    row.waiting_stock || (hasRemaining && !hasIssuableNow) ? "Ожидает остатка" : "";
  const routeLine = [formatReqRouteLine(row, fmtRuDate), waitingLabel].filter(Boolean).join(" • ");

  const stripeColor = isFullyIssued
    ? "rgba(156,163,175,0.85)"
    : hasIssuableNow
      ? "#22c55e"
      : isBlocked
        ? "#f59e0b"
        : "rgba(156,163,175,0.65)";
  const metricColor = isFullyIssued
    ? "rgba(156,163,175,0.85)"
    : hasIssuableNow
      ? "#22c55e"
      : isBlocked
        ? "#f59e0b"
        : "#94A3B8";

  return {
    title: row.display_no || `REQ-${row.request_id.slice(0, 8)}`,
    companyLine: companyLine || "—",
    routeLine,
    stripeColor,
    metricColor,
    issuedCountLabel: String(Math.max(0, Number(row.done_cnt ?? 0))),
    totalCountLabel: String(totalPos),
  };
}
