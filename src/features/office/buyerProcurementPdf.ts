import type { BuyerInboxRow } from "../../lib/api/types";
import {
  buildRequestContextLines,
  buildRequestContextView,
  buildRequestLineItemView,
  cleanOfficeText,
  parseRequestContextFromNotes,
  type RequestContextView,
} from "./requestContextView";
import { selectProcurementUnknownFieldsUx } from "./procurementPresentation";
import { buildProcurementLifecycleItemView } from "./procurementLifecycle";

export type BuyerProcurementLineMeta = {
  price?: string;
  supplier?: string;
  note?: string;
  procurementStatus?: string;
  proposalStatus?: string;
  tender?: boolean;
  tenderState?: string;
  proposalId?: string;
  proposalItemId?: string;
  purchaseId?: string;
  purchaseItemId?: string;
  incomingId?: string;
  qtyOrdered?: number | string;
  qtyExpected?: number | string;
  qtyReceived?: number | string;
  qtyLeft?: number | string;
  invoiceAmount?: number | string;
  outstandingAmount?: number | string;
  totalPaid?: number | string;
  paymentStatus?: string;
  hasInvoice?: boolean;
  invoiceNumber?: string;
};

export type BuyerProcurementPdfLineView = {
  id: string | null;
  index: number;
  name: string;
  qtyText: string;
  uom: string;
  statusLabel: string;
  priceText: string;
  counterpartyText: string;
  noteText: string;
  sumText: string;
  orderedText: string;
  receivedText: string;
  remainingText: string;
  financialStatusLabel: string;
};

export type BuyerProcurementPdfView = {
  title: string;
  context: RequestContextView;
  contextLines: string[];
  itemIndexText: string;
  items: BuyerProcurementPdfLineView[];
  generatedAt: string;
};

const escapeHtml = (value: unknown): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(value ?? "").replace(/[&<>"']/g, (char) => map[char] ?? char);
};

const escapeItemTextHtml = (value: unknown): string => escapeHtml(value).replace(/\s+/g, "&#160;<wbr>");

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = cleanOfficeText(value);
  if (!raw) return null;
  const parsed = Number(raw.replace(/\s+/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveLineMeta = (
  row: BuyerInboxRow,
  metaByRequestItemId?: Record<string, Partial<BuyerProcurementLineMeta> | undefined>,
): Partial<BuyerProcurementLineMeta> => {
  const key = cleanOfficeText(row.request_item_id);
  return key ? metaByRequestItemId?.[key] ?? {} : {};
};

const splitProcurementUserNote = (value: unknown): string => {
  const parts = String(value ?? "")
    .split(/[\n;]+/g)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .filter((part) => {
      const normalized = part.toLowerCase();
      return !(
        normalized.includes("инн:") ||
        normalized.includes("счёт:") ||
        normalized.includes("счет:") ||
        normalized.includes("тел.:") ||
        normalized.includes("тел:") ||
        normalized.includes("email:")
      );
    })
    .join(" • ");
};

function buildBuyerProcurementContext(args: {
  requestId: string;
  requestLabel?: string | null;
  items: BuyerInboxRow[];
}): RequestContextView {
  const first = args.items[0] ?? null;
  const noteContext = parseRequestContextFromNotes([
    first?.request_note,
    first?.request_comment,
    ...args.items.map((item) => item.note),
  ]);

  return buildRequestContextView(
    {
      requestId: args.requestId,
      requestNo: args.requestLabel || first?.request_no,
      displayNo: first?.display_no,
      objectName: first?.object_name,
      object: first?.object,
      siteAddress: first?.site_address_snapshot,
      levelCode: first?.level_code,
      systemCode: first?.system_code,
      zoneCode: first?.zone_code,
      status: "procurement_ready",
      createdAt: first?.created_at,
      submittedAt: first?.submitted_at,
      approvedAt: first?.approved_at,
      neededBy: first?.need_by,
    },
    noteContext,
  );
}

export function buildBuyerProcurementPdfView(args: {
  requestId: string | number;
  requestLabel?: string | null;
  items: BuyerInboxRow[];
  metaByRequestItemId?: Record<string, Partial<BuyerProcurementLineMeta> | undefined>;
  generatedAt?: string | null;
}): BuyerProcurementPdfView {
  const requestId = cleanOfficeText(args.requestId);
  const items = Array.isArray(args.items) ? args.items : [];
  const context = buildBuyerProcurementContext({
    requestId,
    requestLabel: args.requestLabel,
    items,
  });
  const pdfItems = items.map((row, index) => {
    const line = buildRequestLineItemView({
      id: row.request_item_id,
      nameHuman: row.name_human,
      qty: row.qty,
      uom: row.uom,
      status: row.status || "procurement_ready",
      note: row.note,
      appCode: row.app_code,
      rikCode: row.rik_code,
      itemKind: row.kind,
    });
    const meta = resolveLineMeta(row, args.metaByRequestItemId);
    const price = parseNumber(meta.price);
    const sum = price == null ? null : line.qtyValue * price;
    const lifecycle = buildProcurementLifecycleItemView({
      requestId,
      requestItemId: row.request_item_id,
      proposalId: meta.proposalId,
      proposalItemId: meta.proposalItemId,
      purchaseId: meta.purchaseId,
      purchaseItemId: meta.purchaseItemId,
      incomingId: meta.incomingId,
      supplier: meta.supplier,
      price: meta.price,
      note: meta.note,
      qty: row.qty,
      procurementStatus: meta.procurementStatus ?? row.status,
      proposalStatus: meta.proposalStatus,
      tender: meta.tender,
      tenderState: meta.tenderState,
      qtyOrdered: meta.qtyOrdered,
      qtyExpected: meta.qtyExpected,
      qtyReceived: meta.qtyReceived,
      qtyLeft: meta.qtyLeft,
      invoiceAmount: meta.invoiceAmount,
      outstandingAmount: meta.outstandingAmount,
      totalPaid: meta.totalPaid,
      paymentStatus: meta.paymentStatus,
      hasInvoice: meta.hasInvoice,
      invoiceNumber: meta.invoiceNumber,
    });
    const fieldUx = selectProcurementUnknownFieldsUx({
      price: meta.price,
      counterparty: meta.supplier,
      note: splitProcurementUserNote(meta.note),
      sum,
    });

    return {
      id: line.id,
      index: index + 1,
      name: line.name,
      qtyText: line.qtyText,
      uom: line.uom,
      statusLabel: lifecycle.stageLabel || line.statusLabel,
      priceText: fieldUx.priceText,
      counterpartyText: fieldUx.counterpartyText,
      noteText: fieldUx.noteText,
      sumText: fieldUx.sumText,
      orderedText: lifecycle.orderedText,
      receivedText: lifecycle.receivedText,
      remainingText: lifecycle.remainingText,
      financialStatusLabel: lifecycle.financialStatusLabel,
    };
  });
  const title = `Закупочный лист ${context.requestNo || requestId || "заявка"}`;

  return {
    title,
    context,
    contextLines: buildRequestContextLines(context, { includeRequestNo: true, maxLines: 10 }),
    itemIndexText: pdfItems.map((item) => item.name).filter(Boolean).join(" • "),
    generatedAt: args.generatedAt || new Date().toLocaleString("ru-RU"),
    items: pdfItems,
  };
}

export function renderBuyerProcurementPdfHtml(view: BuyerProcurementPdfView): string {
  const contextRows = view.contextLines
    .map((line) => {
      const [label, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (!value) return `<div class="meta-row"><b>${escapeHtml(line)}</b></div>`;
      return `<div class="meta-row"><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</div>`;
    })
    .join("");

  const bodyRows = view.items
    .map(
      (item) => `<tr>
        <td class="center">${item.index}</td>
        <td>${escapeItemTextHtml(item.name)}</td>
        <td class="center">${escapeHtml(item.uom)}</td>
        <td class="right">${escapeHtml(item.qtyText)}</td>
        <td>${escapeHtml(item.statusLabel)}</td>
        <td>${escapeHtml(item.priceText)}</td>
        <td>${escapeHtml(item.counterpartyText)}</td>
        <td>${escapeHtml(item.noteText)}</td>
        <td>${escapeHtml(item.sumText)}</td>
        <td>${escapeHtml(item.orderedText)}</td>
        <td>${escapeHtml(item.receivedText)}</td>
        <td>${escapeHtml(item.remainingText)}</td>
        <td>${escapeHtml(item.financialStatusLabel)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(view.title)}</title>
  <style>
    @page { margin: 14mm; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #111827; background: #fff; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .sub { color: #475569; font-size: 12px; margin-bottom: 14px; }
    .item-index { color: #334155; font-size: 9px; line-height: 1.35; margin: 0 0 12px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; margin: 12px 0 16px; font-size: 12px; }
    .meta-row { border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; page-break-inside: auto; }
    thead { display: table-header-group; }
    th, td { border: 1px solid #cbd5e1; padding: 6px; vertical-align: top; }
    th { background: #f8fafc; text-align: left; }
    .center { text-align: center; }
    .right { text-align: right; }
  </style>
</head>
<body>
  <h1>${escapeHtml(view.title)}</h1>
  <div class="sub">Сформировано: ${escapeHtml(view.generatedAt)} · Позиций: ${view.items.length}</div>
  ${view.itemIndexText ? `<div class="item-index">${escapeItemTextHtml(view.itemIndexText)}</div>` : ""}
  <section class="meta">${contextRows}</section>
  <h2>Жизненный цикл закупки</h2>
  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>Позиция</th>
        <th>Ед.</th>
        <th>Количество</th>
        <th>Статус</th>
        <th>Цена</th>
        <th>Поставщик</th>
        <th>Примечание</th>
        <th>Сумма</th>
        <th>Заказано</th>
        <th>Принято на склад</th>
        <th>Остаток к приёмке</th>
        <th>Финансовый статус</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="13">Позиции не найдены</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}
