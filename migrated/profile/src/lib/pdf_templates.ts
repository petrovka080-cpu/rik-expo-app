// ============ SHARED UTILITIES (exported for use in rik_api.ts) ============

export const escapeHtml = (str: string) => {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

export const formatNumber = (n: number) => {
    return n.toLocaleString('ru-RU');
};

export const formatDate = (d: Date | string | null) => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('ru-RU');
};

export const PREMIUM_CSS = `
  body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 30px; color: #000; font-size: 11px; }
  .header { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
  .subtitle { font-size: 12px; color: #666; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 12px; font-weight: bold; margin-bottom: 8px; border-bottom: 2px solid #0ea5e9; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 6px; }
  th { background: #f1f5f9; font-weight: 600; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .muted { color: #64748b; }
  .totals-row td { font-weight: bold; background: #f8fafc; }
  .total-value { color: #1e3a8a; }
  .cell-note { font-size: 10px; color: #64748b; margin-top: 2px; }
`;

export interface DocHeaderParams {
    title: string;
    docNumber: string;
    date: string;
    status: string;
    qrDataUrl?: string;
}

export const buildDocHeader = (params: DocHeaderParams) => {
    return `
    <div class="header">
      <div>
        <div class="title">${escapeHtml(params.title)} № ${escapeHtml(params.docNumber)}</div>
        <div class="subtitle">Дата: ${escapeHtml(params.date)} | Статус: ${escapeHtml(params.status)}</div>
      </div>
      ${params.qrDataUrl ? `<img src="${params.qrDataUrl}" width="80" height="80" />` : ''}
    </div>
  `;
};

export interface SupplierCardParams {
    name: string;
    inn?: string;
    account?: string;
    phone?: string;
    email?: string;
    address?: string;
    specialization?: string;
}

export const buildSupplierCard = (params: SupplierCardParams) => {
    return `
    <div style="padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; background: #fff;">
      <div style="font-weight: 800; margin-bottom: 4px;">${escapeHtml(params.name)}</div>
      <div style="color: #334155; display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px;">
        ${params.inn ? `<span>ИНН: ${escapeHtml(params.inn)}</span>` : ''}
        ${params.account ? `<span>Счёт: ${escapeHtml(params.account)}</span>` : ''}
        ${params.phone ? `<span>Тел.: ${escapeHtml(params.phone)}</span>` : ''}
        ${params.email ? `<span>Email: ${escapeHtml(params.email)}</span>` : ''}
        ${params.address ? `<span>Адрес: ${escapeHtml(params.address)}</span>` : ''}
        ${params.specialization ? `<span>Спец.: ${escapeHtml(params.specialization)}</span>` : ''}
      </div>
    </div>
  `;
};

export const buildSignatures = (buyer: string, director: string) => {
    return `
    <div style="margin-top: 40px; display: flex; justify-content: space-between;">
      <div style="width: 40%; text-align: center;">
        <div style="font-weight: bold; margin-bottom: 5px;">Снабженец</div>
        <div style="border-bottom: 1px solid #000; height: 20px; margin-bottom: 5px;"></div>
        <div style="font-size: 10px; color: #64748b;">/ ${escapeHtml(buyer)} /</div>
      </div>
      <div style="width: 40%; text-align: center;">
        <div style="font-weight: bold; margin-bottom: 5px;">Директор</div>
        <div style="border-bottom: 1px solid #000; height: 20px; margin-bottom: 5px;"></div>
        <div style="font-size: 10px; color: #64748b;">/ ${escapeHtml(director)} /</div>
      </div>
    </div>
  `;
};

export const buildDocFooter = () => {
    return `
    <div style="margin-top: 30px; text-align: center; font-size: 9px; color: #94a3b8;">
      Сформировано в системе SOLTO
    </div>
  `;
};

export const wrapInHtmlDocument = (body: string, title: string) => {
    return `<!doctype html><html lang="ru"><head>
    <meta charset="utf-8"/>
    <title>${escapeHtml(title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <style>${PREMIUM_CSS}</style>
  </head><body>${body}</body></html>`;
};

// ============ WORK ACT PDF ============

export interface PdfData {
    reportId: string;
    date: string;
    objectName: string;
    companyName?: string;

    // Work Stats
    workType: string;
    unit: string;
    planQty: string;
    factQty: string;
    restQty: string;

    // Materials
    materials: Array<{
        name: string;
        unit: string;
        qty: string;
        note: string;
    }>;

    // Signatures
    foremanName: string;
}

export const generateWorkActHtml = (data: PdfData) => {
    // Generate Rows for materials
    const matRows = data.materials.length > 0
        ? data.materials.map((m, i) => `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${m.name}</td>
                <td style="text-align: center;">${m.unit}</td>
                <td style="text-align: center;">${m.qty}</td>
                <td>${m.note || ''}</td>
            </tr>
        `).join('')
        : `<tr><td colspan="5" style="text-align: center; padding: 10px;">Материалы по факту не указаны</td></tr>`;

    return `
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Helvetica', sans-serif; padding: 30px; color: #000; }
        .header { margin-bottom: 20px; }
        .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
        .subtitle { font-size: 12px; margin-bottom: 15px; }
        
        .bold { font-weight: bold; }
        .row { margin-bottom: 5px; font-size: 14px; }
        
        .stats-block { margin: 20px 0; font-size: 14px; }
        .stat-row { display: flex; justify-content: space-between; width: 400px; margin-bottom: 3px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #000; padding: 4px 8px; }
        th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
        
        .c-header { background-color: #f8f8f8; font-weight: bold; text-align: left; padding: 5px; border: none; border-bottom: 1px solid #000; }
        
        .signatures { margin-top: 60px; font-size: 14px; }
        .sig-row { display: flex; justify-content: space-between; margin-bottom: 25px; align-items: flex-end; }
        .sig-label { width: 200px; }
        .sig-line { border-bottom: 1px solid #000; flex: 1; margin: 0 10px; }
        .sig-desc { font-size: 10px; text-align: center; width: 100px; }
        
        .footer { margin-top: 50px; text-align: right; }
        .qr-placeholder { display: inline-block; width: 100px; height: 100px; background-color: #eee; }
        
        .meta-info { font-size: 8px; color: #666; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Акт выполнения работ № ${data.reportId.substring(0, 8)}</div>
        <div class="subtitle">Дата: ${data.date}</div>
    </div>

    <div class="row"><span class="bold">Объект:</span> ${data.objectName}</div>
    <div class="row"><span class="bold">Работа:</span> ${data.workType}</div>

    <div class="stats-block">
        <div class="stat-row">
            <span class="bold">Плановый объём:</span>
            <span>${data.planQty || '-'} ${data.unit}</span>
        </div>
        <div class="stat-row">
            <span class="bold">Выполнено по акту:</span>
            <span>${data.factQty} ${data.unit}</span>
        </div>
        <div class="stat-row">
            <span class="bold">Остаток по плану:</span>
            <span>${data.restQty || '-'} ${data.unit}</span>
        </div>
    </div>

    <div style="font-size: 12px; font-weight: bold; margin-top: 20px;">Использованные материалы (по факту)</div>
    <table>
        <thead>
            <tr>
                <th style="width: 30px;">№</th>
                <th>Наименование</th>
                <th style="width: 50px;">Ед.</th>
                <th style="width: 80px;">Количество</th>
                <th>Примечание</th>
            </tr>
        </thead>
        <tbody>
            ${matRows}
        </tbody>
    </table>

    <div class="signatures">
        <div class="sig-row">
            <div class="sig-label">Прораб</div>
            <div class="sig-line"></div>
            <div class="sig-desc">(ФИО, подпись)</div>
        </div>
        <div class="sig-row">
            <div class="sig-label">Мастер/Бригадир</div>
            <div class="sig-line"></div>
            <div class="sig-desc">(ФИО, подпись)</div>
        </div>
        <div class="sig-row">
            <div class="sig-label">Представитель заказчика</div>
            <div class="sig-line"></div>
            <div class="sig-desc">(ФИО, подпись)</div>
        </div>
    </div>

    <div class="footer">
        <div style="font-size: 10px; margin-bottom: 5px;">QR для скачивания PDF</div>
        ${data.reportId ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`https://hfhpminaxxzyosquorii.supabase.co/functions/v1/pdf-download?type=act&id=${data.reportId}`)}" width="100" />` : ''}
        <div style="font-size: 8px; color: #0ea5e9; margin-top: 5px;">Сканируйте для скачивания</div>
    </div>

    <div class="meta-info">
        Сформировано в системе SOLTO<br/>
        ID работы: ${data.reportId}
    </div>
    `;
};

// ============ PROPOSAL PDF (Same Act Style) ============

export interface ProposalPdfData {
    proposalId: string;
    date: string;
    status: string;

    // Buyer/Supplier Info
    buyerName: string;
    supplierName?: string;
    supplierInn?: string;
    supplierPhone?: string;

    // Object Info (optional)
    objectName?: string;

    // Items
    items: Array<{
        code?: string;
        name: string;
        unit: string;
        qty: string;
        price: string;
        amount: string;
        supplier?: string;
    }>;

    // Total
    totalAmount: string;

    // QR Code (optional - generated locally)
    qrDataUrl?: string;
}

export const generateProposalActHtml = (data: ProposalPdfData) => {
    // Generate Rows for items
    const itemRows = data.items.length > 0
        ? data.items.map((item, i) => `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td style="text-align: center; font-family: monospace; font-weight: 600; color: #1e3a8a;">${item.code ? '#' + escapeHtml(item.code) : ''}</td>
                <td>${escapeHtml(item.name)}</td>
                <td style="text-align: center;">${item.qty}</td>
                <td style="text-align: center;">${escapeHtml(item.unit)}</td>
                <td style="text-align: center;">${item.supplier || ''}</td>
                <td style="text-align: right;">${item.price}</td>
                <td style="text-align: right;">${item.amount}</td>
            </tr>
        `).join('')
        : `<tr><td colspan="8" style="text-align: center; padding: 10px;">Нет позиций</td></tr>`;

    return `
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Helvetica', sans-serif; padding: 30px; color: #000; }
        .header { margin-bottom: 20px; }
        .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
        .subtitle { font-size: 12px; margin-bottom: 15px; color: #666; }
        
        .bold { font-weight: bold; }
        .row { margin-bottom: 5px; font-size: 14px; }
        
        .info-block { margin: 15px 0; padding: 10px; background: #f9f9f9; border-radius: 4px; }
        .info-row { display: flex; margin-bottom: 3px; font-size: 13px; }
        .info-label { width: 140px; font-weight: bold; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #000; padding: 6px 8px; }
        th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
        
        .total-row td { font-weight: bold; background-color: #f8f8f8; }
        
        .signatures { margin-top: 60px; font-size: 14px; }
        .sig-row { display: flex; justify-content: space-between; margin-bottom: 25px; align-items: flex-end; }
        .sig-label { width: 200px; }
        .sig-line { border-bottom: 1px solid #000; flex: 1; margin: 0 10px; }
        .sig-desc { font-size: 10px; text-align: center; width: 100px; }
        
        .footer { margin-top: 50px; text-align: right; }
        .meta-info { font-size: 8px; color: #666; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Предложение на закупку № ${data.proposalId.length > 12 ? data.proposalId.substring(0, 8) + '...' : data.proposalId}</div>
        <div class="subtitle">Дата: ${data.date} | Статус: ${data.status}</div>
    </div>

    <div class="info-block">
        ${data.supplierName ? `<div class="info-row"><span class="info-label">Поставщик:</span><span>${escapeHtml(data.supplierName)}</span></div>` : ''}
        ${data.supplierInn ? `<div class="info-row"><span class="info-label">ИНН:</span><span>${data.supplierInn}</span></div>` : ''}
        ${data.supplierPhone ? `<div class="info-row"><span class="info-label">Телефон:</span><span>${data.supplierPhone}</span></div>` : ''}
        ${data.objectName ? `<div class="info-row"><span class="info-label">Объект:</span><span>${escapeHtml(data.objectName)}</span></div>` : ''}
    </div>

    <div style="font-size: 12px; font-weight: bold; margin-top: 20px;">Материалы и услуги</div>
    <table>
        <thead>
            <tr>
                <th style="width: 30px;">№</th>
                <th style="width: 80px;">Код</th>
                <th>Наименование</th>
                <th style="width: 70px;">Кол-во</th>
                <th style="width: 50px;">Ед.</th>
                <th style="width: 120px;">Поставщик</th>
                <th style="width: 90px;">Цена</th>
                <th style="width: 100px;">Сумма</th>
            </tr>
        </thead>
        <tbody>
            ${itemRows}
            <tr class="total-row">
                <td colspan="6" style="text-align: right;">ИТОГО</td>
                <td style="text-align: right;">${data.totalAmount}</td>
            </tr>
        </tbody>
    </table>

    <div class="signatures">
        <div class="sig-row">
            <div class="sig-label">Снабженец</div>
            <div class="sig-line"></div>
            <div class="sig-desc">(ФИО, подпись)</div>
        </div>
        <div class="sig-row">
            <div class="sig-label">Директор</div>
            <div class="sig-line"></div>
            <div class="sig-desc">(ФИО, подпись)</div>
        </div>
    </div>

    <div class="footer">
        <div style="font-size: 10px; margin-bottom: 5px;">QR для скачивания PDF</div>
        ${(() => {
            // Use Edge Function for direct PDF download
            const pdfUrl = `https://hfhpminaxxzyosquorii.supabase.co/functions/v1/pdf-download?type=proposal&id=${data.proposalId}`;
            return data.qrDataUrl
                ? `<img src="${data.qrDataUrl}" width="100" height="100" />`
                : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(pdfUrl)}" width="100" />`;
        })()}
        <div style="font-size: 8px; color: #0ea5e9; margin-top: 5px; word-break: break-all;">Сканируйте для скачивания</div>
    </div>

    <div class="meta-info">
        Сформировано в системе SOLTO<br/>
        ID предложения: ${data.proposalId}
    </div>
</body>
</html>
    `;
};

// ============ CONSTRUCTION REPORT PDF (Same Act Style) ============

export interface ConstructionReportPdfData {
    reportId: string;
    date: string;
    objectName: string;
    objectAddress?: string;
    foremanName?: string;

    // Work Reports
    workReports: Array<{
        workType: string;
        unit: string;
        planQty: number;
        factQty: number;
    }>;

    // Materials
    materials: Array<{
        name: string;
        qty: number;
        unit: string;
        document?: string;
        hasCertificate: boolean;
    }>;

    // Journal Entries
    journalEntries: Array<{
        date: string;
        events: string;
        team?: string;
        notes?: string;
    }>;

    // QR Code (optional - generated locally)
    qrDataUrl?: string;
}

export const generateConstructionReportHtml = (data: ConstructionReportPdfData) => {
    const workRows = data.workReports.length > 0
        ? data.workReports.map((w, i) => {
            const deviation = w.factQty - w.planQty;
            const devColor = deviation < 0 ? '#dc2626' : '#16a34a';
            return `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${escapeHtml(w.workType)}</td>
                <td style="text-align: center;">${w.unit}</td>
                <td style="text-align: center;">${w.planQty}</td>
                <td style="text-align: center;">${w.factQty}</td>
                <td style="text-align: center; color: ${devColor};">${deviation >= 0 ? '+' : ''}${deviation}</td>
            </tr>
        `;
        }).join('')
        : `<tr><td colspan="6" style="text-align: center;">Нет данных</td></tr>`;

    const matRows = data.materials.length > 0
        ? data.materials.map((m, i) => `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${escapeHtml(m.name)}</td>
                <td style="text-align: center;">${m.qty}</td>
                <td style="text-align: center;">${m.unit}</td>
                <td>${m.document || '—'}</td>
                <td style="text-align: center;">${m.hasCertificate ? '✓' : '—'}</td>
            </tr>
        `).join('')
        : `<tr><td colspan="6" style="text-align: center;">Нет данных</td></tr>`;

    const journalRows = data.journalEntries.length > 0
        ? data.journalEntries.map(j => `
            <tr>
                <td>${j.date}</td>
                <td>${escapeHtml(j.events)}</td>
                <td>${j.team || '—'}</td>
                <td style="color: #dc2626;">${j.notes || '—'}</td>
            </tr>
        `).join('')
        : `<tr><td colspan="4" style="text-align: center;">Нет данных</td></tr>`;

    const totalPlan = data.workReports.reduce((s, w) => s + w.planQty, 0);
    const totalFact = data.workReports.reduce((s, w) => s + w.factQty, 0);

    return `
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Helvetica', sans-serif; padding: 30px; color: #000; font-size: 11px; }
        .header { margin-bottom: 20px; text-align: center; }
        .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
        .subtitle { font-size: 13px; color: #666; margin-bottom: 15px; }
        
        .section { margin-bottom: 20px; page-break-inside: avoid; }
        .section-title { font-size: 12px; font-weight: bold; margin-bottom: 8px; border-bottom: 2px solid #0ea5e9; padding-bottom: 3px; background: #f8fafc; padding-left: 5px; }
        
        .info-row { display: flex; margin-bottom: 3px; }
        .info-label { width: 140px; color: #64748b; font-weight: 600; }
        .info-value { flex: 1; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 6px; }
        th { background: #f1f5f9; font-weight: 600; font-size: 10px; }
        
        .summary { background: #eff6ff; padding: 10px; border-radius: 6px; margin-top: 15px; border: 1px solid #bfdbfe; }
        .summary-row { display: flex; justify-content: space-between; margin: 3px 0; }
        .summary-label { color: #1e40af; }
        .summary-value { font-weight: 700; color: #1e3a8a; }
        
        .signatures { margin-top: 40px; }
        .sig-row { display: flex; justify-content: space-between; margin-top: 20px; }
        .sig-box { width: 30%; text-align: center; }
        .sig-line { border-bottom: 1px solid #94a3b8; margin-bottom: 3px; height: 18px; }
        .sig-label { font-size: 9px; color: #64748b; }
        
        .footer { margin-top: 30px; text-align: right; }
        .meta-info { font-size: 8px; color: #666; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">📋 Строительный отчёт</div>
        <div class="subtitle">${escapeHtml(data.objectName)} | ${data.date}</div>
    </div>

    <div class="section">
        <div class="section-title">1. Паспорт объекта</div>
        <div class="info-row"><span class="info-label">Адрес:</span><span class="info-value">${data.objectAddress || '—'}</span></div>
        <div class="info-row"><span class="info-label">Прораб:</span><span class="info-value">${data.foremanName || '—'}</span></div>
    </div>

    <div class="section">
        <div class="section-title">2. Выполненные работы</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 30px;">№</th>
                    <th>Вид работ</th>
                    <th style="width: 50px;">Ед.</th>
                    <th style="width: 60px;">План</th>
                    <th style="width: 60px;">Факт</th>
                    <th style="width: 60px;">Откл.</th>
                </tr>
            </thead>
            <tbody>
                ${workRows}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">3. Материалы и поставки</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 30px;">№</th>
                    <th>Наименование</th>
                    <th style="width: 60px;">Кол-во</th>
                    <th style="width: 50px;">Ед.</th>
                    <th style="width: 100px;">Документ</th>
                    <th style="width: 60px;">Серт.</th>
                </tr>
            </thead>
            <tbody>
                ${matRows}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">4. Журнал работ</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 80px;">Дата</th>
                    <th>События</th>
                    <th style="width: 100px;">Бригады</th>
                    <th style="width: 120px;">Замечания</th>
                </tr>
            </thead>
            <tbody>
                ${journalRows}
            </tbody>
        </table>
    </div>

    <div class="summary">
        <div class="summary-row">
            <span class="summary-label">Всего план:</span>
            <span class="summary-value">${totalPlan}</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Всего факт:</span>
            <span class="summary-value">${totalFact}</span>
        </div>
    </div>

    <div class="signatures">
        <div class="sig-row">
            <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Прораб</div>
            </div>
            <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Мастер</div>
            </div>
            <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">Заказчик</div>
            </div>
        </div>
    </div>

    <div class="footer">
        <div style="font-size: 10px; margin-bottom: 5px;">QR для скачивания PDF</div>
        ${data.qrDataUrl
            ? `<img src="${data.qrDataUrl}" width="100" height="100" />`
            : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`https://hfhpminaxxzyosquorii.supabase.co/functions/v1/pdf-download?type=construction&id=${data.reportId}`)}" width="100" />`}
        <div style="font-size: 8px; color: #0ea5e9; margin-top: 5px;">Сканируйте для скачивания</div>
    </div>

    <div class="meta-info">
        Сформировано в системе SOLTO<br/>
        ID отчёта: ${data.reportId}
    </div>
</body>
</html>
    `;
};
