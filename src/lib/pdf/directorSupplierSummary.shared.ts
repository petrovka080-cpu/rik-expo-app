import { esc, fmtDateOnly, formatArrowPeriodText, formatPaidRangeText, joinBulletParts, money, nnum } from "../api/pdf_director.format.ts";
import { joinHtml, renderBox, renderDocumentShell, renderInlineKpiRow, renderLabelValueCell, renderMuted, renderPageFooter, renderTable, renderTag } from "./pdf.director.sections.ts";

export type DirectorFinanceSupplierSummaryPdfRequest = {
  version: "v1";
  supplier: string;
  kindName?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  dueDaysDefault?: number | null;
  criticalDays?: number | null;
};

export type DirectorSupplierSummaryPdfInputShared = {
  supplier: string;
  periodFrom?: string | null;
  periodTo?: string | null;
  financeRows?: unknown[] | null;
  spendRows?: unknown[] | null;
  onlyOverpay?: boolean;
};

export type DirectorSupplierSummaryPdfModelShared = {
  supplier: string;
  periodText: string;
  kindFilter: string | null;
  totalApproved: number;
  totalPaid: number;
  totalRest: number;
  countAll: number;
  countUnpaid: number;
  countPartial: number;
  countPaid: number;
  kindRows: {
    kind: string;
    approved: number;
    paid: number;
    overpay: number;
  }[];
  detailRows: {
    title: string;
    amount: number;
    paid: number;
    rest: number;
    status: string;
    statusClassName: string;
    overpay: number;
    datesText: string;
  }[];
};

const SUPPLIER_SUMMARY_STYLES = `
    @page { margin: 14mm 12mm 20mm 12mm; }

    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:#0f172a}
    h1{font-size:18px;margin:0 0 8px 0}
    .muted{color:#64748b}
    .box{border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin:10px 0;background:#fff}
    .row{display:flex;gap:12px;flex-wrap:wrap}
    .cell{flex:1 1 220px}
    .lbl{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#64748b}
    .val{margin-top:4px;font-size:14px;font-weight:900}
    .kpi{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding:10px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px}

    table{width:100%;border-collapse:collapse;margin-top:10px;page-break-inside:auto}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    tr{page-break-inside:avoid;page-break-after:auto}
    th,td{border:1px solid #e5e7eb;padding:8px 10px;vertical-align:top;font-size:13px}
    th{background:#f8fafc;font-weight:900}

    .tag{display:inline-block;padding:3px 8px;border-radius:999px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:900;font-size:11px}
    .tag.bad{background:#fffbeb;border-color:#fde68a}
    .tag.mid{background:#eef2ff;border-color:#c7d2fe}
    .tag.ok{background:#ecfdf5;border-color:#a7f3d0}

    .page-footer{
      position:fixed;
      left:0; right:0;
      bottom:-12mm;
      text-align:center;
      color:#64748b;
      font-size:11px;
    }
    .page-footer:after{ content:"Стр. " counter(page); }
`;

const formatMoney = (value: number) => esc(money(value));
const formatMoneyKgs = (value: number) => `${formatMoney(value)} KGS`;

function toText(value: unknown) {
  return String(value ?? "").trim();
}

type SupplierSummaryRecord = Record<string, unknown>;
type SupplierSummaryRow = SupplierSummaryRecord & {
  row?: SupplierSummaryRecord | null;
  raw?: SupplierSummaryRecord | null;
  proposals?: SupplierSummaryRecord | null;
};

type SupplierSummaryItem = {
  title: string;
  invoiceDate: string | null;
  approvedAt: string | null;
  dueDate: string | null;
  paidFirstAt: string | null;
  paidLastAt: string | null;
  amount: number;
  paid: number;
  rest: number;
  status: string;
  overpay: number;
};

const isSupplierSummaryRecord = (value: unknown): value is SupplierSummaryRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asSupplierSummaryRow = (value: unknown): SupplierSummaryRow =>
  (isSupplierSummaryRecord(value) ? value : {}) as SupplierSummaryRow;

const asSupplierSummaryRows = (value: unknown[]): SupplierSummaryRow[] =>
  (Array.isArray(value) ? value : []).map(asSupplierSummaryRow);

function pickIso10(...vals: unknown[]) {
  for (const value of vals) {
    const text = toText(value);
    if (!text || text === "—") continue;
    return text.slice(0, 10);
  }
  return null;
}

function proposalPretty(row: SupplierSummaryRow) {
  const src = asSupplierSummaryRow(row.row ?? row.raw ?? row);
  const proposalNo = toText(
    src.proposal_no ??
      src.proposalNo ??
      src.pretty ??
      asSupplierSummaryRow(src.proposals).proposal_no ??
      "",
  );

  if (proposalNo) return proposalNo;

  const proposalId = toText(src.proposalId ?? src.proposal_id ?? src.id ?? "");
  return proposalId ? `PR-${proposalId.slice(0, 8)}` : "";
}

function kindNorm(name: unknown) {
  const kind = toText(name);
  if (!kind) return "Другое";
  if (kind === "Материалы" || kind === "Работы" || kind === "Услуги" || kind === "Другое") {
    return kind;
  }

  const lowered = kind.toLowerCase();
  if (lowered.includes("мат")) return "Материалы";
  if (lowered.includes("работ")) return "Работы";
  if (lowered.includes("услуг")) return "Услуги";
  return "Другое";
}

function proposalIdOf(row: SupplierSummaryRow) {
  return toText(row.proposalId ?? row.proposal_id ?? row.id ?? "");
}

function buildSupplierDatesText(row: {
  approvedAt: string | null;
  paidFirstAt: string | null;
  paidLastAt: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
}) {
  return (
    joinBulletParts([
      row.approvedAt ? `утв. ${fmtDateOnly(row.approvedAt)}` : "",
      formatPaidRangeText(row.paidFirstAt, row.paidLastAt),
      row.invoiceDate ? `счет ${fmtDateOnly(row.invoiceDate)}` : "",
      row.dueDate ? `срок ${fmtDateOnly(row.dueDate)}` : "",
    ]) || "—"
  );
}

function mapSupplierSummaryItem(
  row: SupplierSummaryRow,
  overpayByProposal: Map<string, number>,
): SupplierSummaryItem {
  const amount = nnum(row.amount);
  const paid = nnum(row.paidAmount);
  const rest = Math.max(amount - paid, 0);
  const status =
    amount <= 0 ? "прочее" : paid <= 0 ? "не оплачено" : rest <= 0 ? "оплачено" : "частично";
  const proposalId = proposalIdOf(row);
  const overpay = proposalId ? overpayByProposal.get(proposalId) ?? 0 : 0;

  return {
    title: toText(row.invoiceNumber ?? row.invoice_number)
      ? `Счет №${toText(row?.invoiceNumber ?? row?.invoice_number)}`
      : proposalPretty(row)
        ? `Предложение ${proposalPretty(row)}`
        : "Счет",
    invoiceDate: pickIso10(
      row?.invoiceDate,
      row?.invoice_date,
      row?.raw?.invoice_at,
      row?.raw?.invoice_created_at,
      row?.raw?.created_at,
    ),
    approvedAt: pickIso10(
      row?.director_approved_at,
      row?.approvedAtIso,
      row?.approved_at,
      row?.raw?.director_approved_at,
      row?.raw?.approved_at,
      row?.raw?.approvedAtIso,
      row?.created_at,
    ),
    dueDate: pickIso10(row?.dueDate, row?.due_date, row?.raw?.due_at),
    paidFirstAt: pickIso10(row?.paid_first_at, row?.raw?.paid_first_at),
    paidLastAt: pickIso10(row?.paid_last_at, row?.raw?.paid_last_at),
    amount,
    paid,
    rest,
    status,
    overpay,
  };
}

export function normalizeDirectorFinanceSupplierSummaryPdfRequest(
  value: unknown,
): DirectorFinanceSupplierSummaryPdfRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("director finance supplier summary request must be an object");
  }

  const row = value as Record<string, unknown>;
  const version = toText(row.version);
  const supplier = toText(row.supplier);
  const kindName = toText(row.kindName);
  const periodFrom = toText(row.periodFrom);
  const periodTo = toText(row.periodTo);
  const dueDaysDefault = Number(row.dueDaysDefault ?? 7);
  const criticalDays = Number(row.criticalDays ?? 14);

  if (version !== "v1") {
    throw new Error(`director finance supplier summary request invalid version: ${version || "<empty>"}`);
  }
  if (!supplier) {
    throw new Error("director finance supplier summary request missing supplier");
  }

  return {
    version: "v1",
    supplier,
    kindName: kindName || null,
    periodFrom: periodFrom || null,
    periodTo: periodTo || null,
    dueDaysDefault: Number.isFinite(dueDaysDefault) ? Math.max(0, Math.trunc(dueDaysDefault)) : 7,
    criticalDays: Number.isFinite(criticalDays) ? Math.max(1, Math.trunc(criticalDays)) : 14,
  };
}

export function filterDirectorSupplierSummarySpendRowsByKind(
  spendRows: unknown[],
  kindName?: string | null,
) {
  const normalizedKind = toText(kindName);
  if (!normalizedKind) return Array.isArray(spendRows) ? spendRows : [];
  return asSupplierSummaryRows(spendRows).filter(
    (row) => kindNorm(row.kind_name ?? row.kindName) === normalizedKind,
  );
}

export function prepareDirectorSupplierSummaryPdfModelShared(
  input: DirectorSupplierSummaryPdfInputShared,
): DirectorSupplierSummaryPdfModelShared {
  const supplier = toText(input.supplier) || "—";
  const financeRows = asSupplierSummaryRows(input.financeRows);
  const spendRows = asSupplierSummaryRows(input.spendRows ?? []);
  const onlyOverpay = Boolean(input.onlyOverpay);
  const from = input.periodFrom ? String(input.periodFrom).slice(0, 10) : null;
  const to = input.periodTo ? String(input.periodTo).slice(0, 10) : null;

  const inPeriod = (iso: unknown) => {
    if (!from && !to) return true;
    const date = toText(iso).slice(0, 10);
    if (!date) return true;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };

  const spendForDetect = spendRows
    .filter((row) => toText(row.supplier) === supplier)
    .filter((row) => inPeriod(row.director_approved_at));

  const kindSet = new Set<string>(
    spendForDetect
      .map((row) => kindNorm(row.kind_name ?? row.kindName))
      .filter(Boolean),
  );
  const kindFilter = kindSet.size === 1 ? Array.from(kindSet)[0] : null;

  const spend = spendRows
    .filter((row) => toText(row.supplier) === supplier)
    .filter((row) => inPeriod(row.director_approved_at))
    .filter((row) => !kindFilter || kindNorm(row.kind_name ?? row.kindName) === kindFilter)
    .filter((row) => !onlyOverpay || nnum(row.overpay_alloc) > 0);

  const overpayByProposal = new Map<string, number>();
  for (const row of spend) {
    const proposalId = toText(row.proposal_id);
    if (!proposalId) continue;
    const overpay = nnum(row.overpay_alloc);
    if (overpay > 0) {
      overpayByProposal.set(proposalId, (overpayByProposal.get(proposalId) ?? 0) + overpay);
    }
  }

  let totalApproved = 0;
  let totalPaid = 0;
  let totalRest = 0;
  let items: ReturnType<typeof mapSupplierSummaryItem>[] = [];

  if (kindFilter) {
    const spendByKind = spendRows
      .filter((row) => toText(row.supplier) === supplier)
      .filter((row) => inPeriod(row.director_approved_at))
      .filter((row) => kindNorm(row.kind_name ?? row.kindName) === kindFilter);

    totalApproved = spendByKind.reduce<number>((sum, row) => sum + nnum(row.approved_alloc), 0);
    totalPaid = spendByKind.reduce<number>(
      (sum, row) => sum + nnum(row.paid_alloc_cap ?? row.paid_alloc),
      0,
    );
    totalRest = Math.max(totalApproved - totalPaid, 0);

    const proposalIds = new Set<string>(spendByKind.map((row) => proposalIdOf(row)).filter(Boolean));

    const finance = financeRows
      .filter((row) => toText(row.supplier) === supplier)
      .filter((row) => inPeriod(row.approvedAtIso ?? row.approved_at ?? row.director_approved_at))
      .filter((row) => {
        const proposalId = proposalIdOf(row);
        return proposalId && proposalIds.has(proposalId);
      });

    items = finance.map((row) => mapSupplierSummaryItem(row, overpayByProposal));
    if (onlyOverpay) items = items.filter((row) => nnum(row.overpay) > 0);
  } else {
    const finance = financeRows
      .filter((row) => toText(row.supplier) === supplier)
      .filter((row) => inPeriod(row.approvedAtIso ?? row.approved_at ?? row.director_approved_at));

    items = finance.map((row) => mapSupplierSummaryItem(row, overpayByProposal));
    if (onlyOverpay) items = items.filter((row) => nnum(row.overpay) > 0);

    totalApproved = items.reduce((sum, row) => sum + nnum(row.amount), 0);
    totalPaid = items.reduce((sum, row) => sum + nnum(row.paid), 0);
    totalRest = Math.max(totalApproved - totalPaid, 0);
  }

  const countAll = items.length;
  const countUnpaid = items.filter((row) => row.status === "не оплачено").length;
  const countPartial = items.filter((row) => row.status === "частично").length;
  const countPaid = items.filter((row) => row.status === "оплачено").length;

  const byKind = new Map<string, { approved: number; paid: number; overpay: number }>();
  for (const row of spend) {
    const kind = kindNorm(row.kind_name ?? row.kindName);
    const approved = nnum(row.approved_alloc);
    const paid = nnum(row.paid_alloc_cap ?? row.paid_alloc);
    const overpay = nnum(row.overpay_alloc);
    const current = byKind.get(kind) ?? { approved: 0, paid: 0, overpay: 0 };
    current.approved += approved;
    current.paid += paid;
    current.overpay += overpay;
    byKind.set(kind, current);
  }

  const kindOrder = ["Материалы", "Работы", "Услуги", "Другое"];
  const kindRows = kindOrder
    .filter((kind) => byKind.has(kind))
    .map((kind) => ({ kind, ...byKind.get(kind)! }))
    .filter((row) => row.approved !== 0 || row.paid !== 0 || row.overpay !== 0);

  const detailRows = [...items]
    .sort((left, right) => {
      const leftWeight = left.status === "не оплачено" ? 0 : left.status === "частично" ? 1 : 2;
      const rightWeight = right.status === "не оплачено" ? 0 : right.status === "частично" ? 1 : 2;
      if (leftWeight !== rightWeight) return leftWeight - rightWeight;
      const leftDate = toText(left.dueDate ?? left.invoiceDate).slice(0, 10);
      const rightDate = toText(right.dueDate ?? right.invoiceDate).slice(0, 10);
      return leftDate.localeCompare(rightDate);
    })
    .slice(0, 80)
    .map((row) => ({
      title: row.title,
      amount: row.amount,
      paid: row.paid,
      rest: row.rest,
      status: row.status,
      statusClassName:
        row.status === "не оплачено"
          ? "tag bad"
          : row.status === "частично"
            ? "tag mid"
            : "tag ok",
      overpay: row.overpay,
      datesText: buildSupplierDatesText(row),
    }));

  return {
    supplier,
    periodText: formatArrowPeriodText(from, to),
    kindFilter,
    totalApproved,
    totalPaid,
    totalRest,
    countAll,
    countUnpaid,
    countPartial,
    countPaid,
    kindRows,
    detailRows,
  };
}

const renderSupplierSummaryMeta = (model: DirectorSupplierSummaryPdfModelShared) =>
  `<div class="muted">Поставщик: <b>${esc(model.supplier)}</b> • Период: <b>${esc(model.periodText)}</b>${model.kindFilter ? ` • Вид: <b>${esc(model.kindFilter)}</b>` : ""}</div>`;

const renderSupplierSummaryOverview = (model: DirectorSupplierSummaryPdfModelShared) =>
  renderBox(
    joinHtml([
      `<div class="row">
        ${renderLabelValueCell("Утверждено", formatMoneyKgs(model.totalApproved))}
        ${renderLabelValueCell("Оплачено", formatMoneyKgs(model.totalPaid))}
        ${renderLabelValueCell("Остаток", formatMoneyKgs(model.totalRest))}
      </div>`,
      renderInlineKpiRow("Счетов всего", esc(String(model.countAll))),
      renderInlineKpiRow("Не оплачено", esc(String(model.countUnpaid))),
      renderInlineKpiRow("Частично", esc(String(model.countPartial))),
      renderInlineKpiRow("Оплачено", esc(String(model.countPaid))),
    ]),
  );

const renderSupplierSummaryKinds = (model: DirectorSupplierSummaryPdfModelShared) =>
  renderBox(
    joinHtml([
      `<div class="lbl">Разрез по видам (allocation)</div>`,
      model.kindRows.length
        ? renderTable({
            headers: [
              { label: "Вид" },
              { label: "Утверждено" },
              { label: "Оплачено" },
              { label: "Переплата" },
            ],
            rowsHtml: model.kindRows
              .map(
                (row) => `<tr>
                    <td>${esc(row.kind)}</td>
                    <td>${formatMoneyKgs(row.approved)}</td>
                    <td>${formatMoneyKgs(row.paid)}</td>
                    <td>${row.overpay > 0 ? formatMoneyKgs(row.overpay) : "—"}</td>
                  </tr>`,
              )
              .join(""),
          })
        : renderMuted("Нет данных по видам.", "margin-top:8px"),
    ]),
  );

const renderSupplierSummaryDetails = (model: DirectorSupplierSummaryPdfModelShared) =>
  renderBox(
    joinHtml([
      `<div class="lbl">Детализация счетов</div>`,
      model.detailRows.length
        ? renderTable({
            headers: [
              { label: "Счет" },
              { label: "Сумма" },
              { label: "Оплачено" },
              { label: "Остаток" },
              { label: "Статус" },
              { label: "Переплата" },
              { label: "Даты" },
            ],
            rowsHtml: model.detailRows
              .map(
                (row) => `<tr>
  <td>${esc(row.title)}</td>
  <td>${formatMoney(row.amount)}</td>
  <td>${formatMoney(row.paid)}</td>
  <td>${formatMoney(row.rest)}</td>
  <td>${renderTag(row.status, row.statusClassName)}</td>
  <td>${row.overpay > 0 ? formatMoney(row.overpay) : "—"}</td>
  <td>${esc(row.datesText)}</td>
</tr>`,
              )
              .join(""),
          })
        : renderMuted("Нет счетов по поставщику за период.", "margin-top:8px"),
    ]),
  );

export function renderDirectorSupplierSummaryPdfHtmlShared(
  model: DirectorSupplierSummaryPdfModelShared,
) {
  return renderDocumentShell({
    lang: "ru",
    title: "Сводка по поставщику",
    styles: SUPPLIER_SUMMARY_STYLES,
    body: joinHtml([
      `<h1>Сводка по поставщику</h1>`,
      renderSupplierSummaryMeta(model),
      renderSupplierSummaryOverview(model),
      renderSupplierSummaryKinds(model),
      renderSupplierSummaryDetails(model),
      renderPageFooter(),
    ]),
  });
}
