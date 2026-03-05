import { Alert, Platform } from "react-native";
import * as Sharing from "expo-sharing";

import type { WorkMaterialRow } from "../../components/WorkMaterialsEditor";
import { openHtmlAsPdfUniversal } from "../../lib/api/pdf";

export type ContractorPdfWork = {
  progress_id: string;
  work_code: string | null;
  work_name: string | null;
  object_name: string | null;
  contractor_org?: string | null;
};

type SelectedWorkRow = {
  name: string;
  unit: string;
  price: number;
  qty?: number;
  comment?: string;
};

type GenerateWorkPdfOptions = {
  actDate?: string | Date;
  selectedWorks?: SelectedWorkRow[];
  contractorName?: string | null;
  contractorInn?: string | null;
  contractorPhone?: string | null;
  customerName?: string | null;
  customerInn?: string | null;
  contractNumber?: string | null;
  contractDate?: string | null;
  zoneText?: string | null;
  mainWorkName?: string | null;
  actNumber?: string | null;
};

async function generateWorkPdf(
  work: ContractorPdfWork | null,
  materials: WorkMaterialRow[],
  opts?: GenerateWorkPdfOptions
) {
  if (!work) return;

  try {
    const dt = opts?.actDate ? new Date(opts.actDate) : new Date();
    const dateStr = dt.toLocaleDateString("ru-RU");

    const objectName = work.object_name || "Объект не указан";
    const mainWorkName = String(opts?.mainWorkName || work.work_name || work.work_code || "—");
    const selectedWorks = opts?.selectedWorks || [];
    const actNo = String(opts?.actNumber || work.progress_id.slice(0, 8));
    const contractorName = String(opts?.contractorName || work.contractor_org || "—");
    const contractorInn = String(opts?.contractorInn || "—");
    const contractorPhone = String(opts?.contractorPhone || "—");
    const customerName = String(opts?.customerName || objectName || "—");
    const customerInn = String(opts?.customerInn || "—");
    const contractNumber = String(opts?.contractNumber || "—");
    const contractDate = String(opts?.contractDate || "—");
    const zoneText = String(opts?.zoneText || "—");

    const workUrl = `https://app.goxbuild.com/work/${work.progress_id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
      workUrl
    )}`;

    const fmtNum = (v: number) => Number.isFinite(v) ? v.toLocaleString("ru-RU") : "0";
    const fmtMoney = (v: number) => Number.isFinite(v) ? `${v.toLocaleString("ru-RU")} руб.` : "0 руб.";

    let totalMaterialsSum = 0;
    let totalWorksSum = 0;

    const worksRowsHtml = selectedWorks
      .map((w, i) => {
        const q = Number(w.qty || 0);
        const p = Number(w.price || 0);
        const sum = q * p;
        if (sum > 0) totalWorksSum += sum;
        return `
          <tr>
            <td class="cell-center">${i + 1}</td>
            <td>${w.name || "—"}</td>
            <td class="cell-center">${w.unit || "—"}</td>
            <td class="cell-right">${fmtNum(q)}</td>
            <td class="cell-right">${p > 0 ? fmtNum(p) : "—"}</td>
            <td class="cell-right">${sum > 0 ? fmtNum(sum) : "—"}</td>
            <td>${w.comment || ""}</td>
          </tr>
        `;
      })
      .join("");

    const matsRowsHtml = materials
      .map((m, i) => {
        const q = Number((m as any).act_used_qty ?? (m as any).qty_fact ?? 0);
        const p = m.price == null || Number.isNaN(Number(m.price)) ? 0 : Number(m.price);
        const sum = q * p;
        if (sum > 0) totalMaterialsSum += sum;
        return `
          <tr>
            <td class="cell-center">${selectedWorks.length + i + 1}</td>
            <td>${m.name || "—"}</td>
            <td class="cell-center">${m.uom || (m as any).unit || "—"}</td>
            <td class="cell-right">${fmtNum(q)}</td>
            <td class="cell-right">${p > 0 ? fmtNum(p) : "—"}</td>
            <td class="cell-right">${sum > 0 ? fmtNum(sum) : "—"}</td>
            <td></td>
          </tr>
        `;
      })
      .join("");

    const totalSum = totalWorksSum + totalMaterialsSum;

    const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 12mm 12mm 14mm 12mm; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10.8pt;
            line-height: 1.35;
            color: #111827;
          }
          .doc-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 6px;
            padding-bottom: 6px;
            border-bottom: 1px solid #d1d5db;
          }
          .doc-title { font-size: 14pt; font-weight: 700; text-transform: uppercase; }
          .doc-meta { font-size: 9pt; color: #6b7280; text-align: right; }
          .act-line { font-size: 10.5pt; margin-bottom: 6px; color: #374151; }
          .divider { border-top: 1px solid #d1d5db; margin: 6px 0 8px 0; }
          .head-grid {
            display: table;
            width: 100%;
            table-layout: fixed;
            margin-bottom: 6px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: 8px;
            box-sizing: border-box;
          }
          .head-col { display: table-cell; width: 50%; vertical-align: top; padding-right: 8px; }
          .head-col:last-child { padding-right: 0; padding-left: 8px; }
          .head-block { margin-bottom: 8px; }
          .head-block-title { font-size: 10.5pt; font-weight: 700; margin-bottom: 4px; color: #111827; }
          .kv { margin-bottom: 2px; }
          .kv-label { color: #6b7280; font-weight: 400; }
          .kv-value { color: #111827; font-weight: 600; }
          .section-title {
            font-size: 12pt;
            font-weight: 700;
            margin: 8px 0 6px 0;
            color: #111827;
            padding-bottom: 3px;
            border-bottom: 1px solid #e5e7eb;
          }
          table { border-collapse: collapse; width: 100%; margin-bottom: 8px; table-layout: fixed; }
          thead th {
            background: #f3f4f6;
            color: #111827;
            font-size: 10pt;
            font-weight: 700;
            border: 1px solid #d1d5db;
            padding: 6px 5px;
          }
          tbody td {
            border: 1px solid #d1d5db;
            padding: 6px 5px;
            font-size: 10pt;
            vertical-align: top;
          }
          .cell-center { text-align: center; }
          .cell-right { text-align: right; }
          .group-total td { background: #f9fafb; font-weight: 700; color: #111827; }
          .grand-total td { background: #eef6ff; font-weight: 700; color: #0f172a; }
          .signatures { margin-top: 12px; display: flex; gap: 12px; }
          .sign-col { flex: 1; }
          .sign-line {
            border-top: 1px solid #111827;
            margin-top: 20px;
            padding-top: 3px;
            font-size: 9.5pt;
            color: #374151;
            white-space: nowrap;
          }
          .footer {
            margin-top: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1px solid #e5e7eb;
            padding-top: 6px;
          }
          .footer-left { font-size: 8.5pt; color: #6b7280; }
          .footer-right { text-align: right; font-size: 8.5pt; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="doc-header">
          <div class="doc-title">Акт выполненных работ</div>
          <div class="doc-meta"><div>Форма КС-2</div></div>
        </div>
        <div class="act-line">№ акта: <b>${actNo}</b> &nbsp;&nbsp; от <b>${dateStr}</b></div>

        <div class="head-grid">
          <div class="head-col">
            <div class="head-block">
              <div class="head-block-title">Исполнитель (подрядчик)</div>
              <div class="kv"><span class="kv-label">Наименование: </span><span class="kv-value">${contractorName}</span></div>
              <div class="kv"><span class="kv-label">ИНН: </span><span class="kv-value">${contractorInn}</span></div>
              <div class="kv"><span class="kv-label">Телефон: </span><span class="kv-value">${contractorPhone}</span></div>
            </div>
            <div class="head-block">
              <div class="head-block-title">Заказчик</div>
              <div class="kv"><span class="kv-label">Наименование: </span><span class="kv-value">${customerName}</span></div>
              <div class="kv"><span class="kv-label">ИНН: </span><span class="kv-value">${customerInn}</span></div>
            </div>
          </div>
          <div class="head-col">
            <div class="head-block">
              <div class="head-block-title">Основание</div>
              <div class="kv"><span class="kv-label">Договор №: </span><span class="kv-value">${contractNumber}</span></div>
              <div class="kv"><span class="kv-label">Дата договора: </span><span class="kv-value">${contractDate}</span></div>
            </div>
            <div class="head-block">
              <div class="head-block-title">Объект</div>
              <div class="kv"><span class="kv-label">Объект: </span><span class="kv-value">${objectName}</span></div>
              <div class="kv"><span class="kv-label">Зона / Этаж: </span><span class="kv-value">${zoneText}</span></div>
              <div class="kv"><span class="kv-label">Основная работа: </span><span class="kv-value">${mainWorkName}</span></div>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="section-title">Подрядчик выполнил, а Заказчик принял следующие работы:</div>
        <table>
          <colgroup>
            <col style="width:4%">
            <col style="width:52%">
            <col style="width:8%">
            <col style="width:9%">
            <col style="width:9%">
            <col style="width:10%">
            <col style="width:8%">
          </colgroup>
          <thead>
            <tr>
              <th>№</th>
              <th style="text-align:left">Наименование</th>
              <th>Ед.</th>
              <th class="cell-right">Кол-во</th>
              <th class="cell-right">Цена</th>
              <th class="cell-right">Сумма</th>
              <th style="text-align:left">Прим.</th>
            </tr>
          </thead>
          <tbody>
            ${worksRowsHtml}
            <tr class="group-total">
              <td colspan="5" class="cell-right">Итого по работам</td>
              <td class="cell-right">${fmtMoney(totalWorksSum)}</td>
              <td></td>
            </tr>
            ${matsRowsHtml}
            <tr class="group-total">
              <td colspan="5" class="cell-right">Итого по материалам</td>
              <td class="cell-right">${fmtMoney(totalMaterialsSum)}</td>
              <td></td>
            </tr>
            <tr class="grand-total">
              <td colspan="5" class="cell-right">Общий итог</td>
              <td class="cell-right">${fmtMoney(totalSum)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div style="font-size:10pt; color:#374151; margin:8px 0 2px 0;">
          Работы выполнены в полном объеме и в соответствии с условиями договора.
        </div>
        <div style="font-size:10pt; color:#374151; margin-bottom:8px;">
          Заказчик претензий по объему, качеству и срокам выполнения работ не имеет.
        </div>

        <div class="signatures">
          <div class="sign-col"><div class="sign-line">Подрядчик / Прораб (ФИО, подпись)</div></div>
          <div class="sign-col"><div class="sign-line">Исполнитель работ / Бригадир (ФИО, подпись)</div></div>
          <div class="sign-col"><div class="sign-line">Заказчик / Представитель (ФИО, подпись)</div></div>
        </div>

        <div class="footer">
          <div class="footer-left"></div>
          <div class="footer-right">
            <div style="margin-bottom: 4px;">Проверка документа</div>
            <img src="${qrUrl}" style="width: 72px; height: 72px;" alt="QR" />
          </div>
        </div>
      </body>
    </html>
    `;

    const pdfUri = await openHtmlAsPdfUniversal(html);
    if (!pdfUri) {
      Alert.alert("PDF", "Не удалось сформировать PDF-файл. Повтори попытку.");
      return;
    }

    if (Platform.OS === "web") {
      const w = window.open(pdfUri, "_blank", "noopener,noreferrer");
      if (!w) {
        Alert.alert("PDF", "Браузер заблокировал новое окно. Разреши pop-up для этого сайта.");
      }
      return;
    }

    try {
      await Sharing.shareAsync(pdfUri);
    } catch (e) {
      console.warn("[generateWorkPdf] shareAsync error", e);
    }
  } catch (e: any) {
    console.warn("[generateWorkPdf] general error", e);
    Alert.alert("Ошибка PDF", String(e?.message || e));
  }
}

export type ActPdfMode = "normal" | "summary";

export type GenerateActPdfArgs = {
  mode: ActPdfMode;
  work: ContractorPdfWork | null;
  materials: WorkMaterialRow[];
  actDate?: string | Date;
  selectedWorks?: SelectedWorkRow[];
  contractorName?: string | null;
  contractorInn?: string | null;
  contractorPhone?: string | null;
  customerName?: string | null;
  customerInn?: string | null;
  contractNumber?: string | null;
  contractDate?: string | null;
  zoneText?: string | null;
  mainWorkName?: string | null;
  actNumber?: string | null;
};

export async function generateActPdf(args: GenerateActPdfArgs) {
  return generateWorkPdf(args.work, args.materials, {
    actDate: args.actDate,
    selectedWorks: args.selectedWorks,
    contractorName: args.contractorName,
    contractorInn: args.contractorInn,
    contractorPhone: args.contractorPhone,
    customerName: args.customerName,
    customerInn: args.customerInn,
    contractNumber: args.contractNumber,
    contractDate: args.contractDate,
    zoneText: args.zoneText,
    mainWorkName: args.mainWorkName,
    actNumber: args.actNumber,
  });
}
