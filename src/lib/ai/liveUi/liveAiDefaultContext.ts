import type { ConstructionKnowledgeSource } from "../constructionKnowledgeCore";
import type { AccountantFinanceContext } from "../accountantFinance";
import type { BuyerSourcingContext } from "../buyerSourcing";
import type { DirectorCompanyContext } from "../directorCompany";
import type { ForemanWorkdayContext } from "../foremanIntelligence";
import type { MarketplaceIntakeContext, MarketplaceOfferDraft } from "../marketplaceIntake";
import type { OfficeDocumentControlContext } from "../officeDocumentControl";
import type { WarehouseStockContext } from "../warehouseStock";
import type { LiveAiContextId } from "./liveAiRouteRegistry";

function source(params: {
  id: string;
  type: ConstructionKnowledgeSource["type"];
  labelRu: string;
  linkedObjectId?: string;
  linkedWorkId?: string;
  linkedMaterialId?: string;
  documentId?: string;
  fileName?: string;
  page?: number;
}): ConstructionKnowledgeSource {
  return {
    ...params,
    confidence: "high",
  };
}

export function buildLiveWarehouseDefaultContext(): WarehouseStockContext {
  return {
    screenId: "warehouse.main",
    role: "warehouse",
    countryCode: "KG",
    currency: "KGS",
    unitConversionConfigured: true,
    packageConversionConfigured: true,
    quantityNormalizationConfigured: true,
    documentsProviderConnected: true,
    stockItems: [
      {
        id: "STK-LIVE-1",
        materialId: "MAT-GKL",
        materialNameRu: "ГКЛ 12.5 мм",
        specificationText: "лист, 12.5 мм",
        inStockQty: 18,
        availableQty: 8,
        reservedQty: 10,
        incomingQty: 12,
        unit: "лист",
        warehouseNameRu: "Основной склад",
        location: {
          warehouseId: "WH-1",
          warehouseNameRu: "Основной склад",
          zone: "A",
          shelf: "GKL",
          sourceRefs: ["src:live:stock:gkl"],
        },
        objectId: "OBJ-1",
        objectNameRu: "Дом 1, 2 этаж",
        workId: "WRK-GKL",
        workNameRu: "Монтаж перегородок",
        requestId: "MR-GKL",
        requestLineId: "MRL-GKL",
        sourceRefs: ["src:live:stock:gkl"],
      },
    ],
    incoming: [
      {
        id: "INC-LIVE-1",
        materialId: "MAT-GKL",
        materialNameRu: "ГКЛ 12.5 мм",
        expectedQty: 12,
        quantity: 12,
        unit: "лист",
        supplierId: "SUP-GKL",
        supplierNameRu: "СтройМаркет",
        requestId: "MR-GKL",
        requestLineId: "MRL-GKL",
        status: "needs_documents",
        documentRefs: [],
        sourceRefs: ["src:live:request:gkl", "src:live:supplier:gkl"],
      },
    ],
    issues: [
      {
        id: "ISS-LIVE-1",
        materialId: "MAT-GKL",
        materialNameRu: "ГКЛ 12.5 мм",
        requestedQty: 42,
        issuedQty: 0,
        reservedQty: 10,
        unit: "лист",
        objectId: "OBJ-1",
        objectNameRu: "Дом 1, 2 этаж",
        workId: "WRK-GKL",
        workNameRu: "Монтаж перегородок",
        requestId: "MR-GKL",
        status: "blocked",
        sourceRefs: ["src:live:request:gkl", "src:live:work:gkl"],
      },
    ],
    reservations: [
      {
        id: "RSV-LIVE-1",
        materialId: "MAT-GKL",
        materialNameRu: "ГКЛ 12.5 мм",
        quantity: 10,
        unit: "лист",
        objectId: "OBJ-1",
        objectNameRu: "Дом 1, 2 этаж",
        workId: "WRK-GKL",
        workNameRu: "Монтаж перегородок",
        requestId: "MR-GKL",
        status: "active",
        sourceRefs: ["src:live:stock:gkl"],
      },
    ],
    transfers: [],
    inventoryCounts: [],
    locations: [
      {
        warehouseId: "WH-1",
        warehouseNameRu: "Основной склад",
        zone: "A",
        shelf: "GKL",
        sourceRefs: ["src:live:stock:gkl"],
      },
    ],
    sources: [
      source({ id: "src:live:stock:gkl", type: "warehouse_stock", labelRu: "Остаток ГКЛ: доступно 8, резерв 10", linkedObjectId: "OBJ-1", linkedWorkId: "WRK-GKL", linkedMaterialId: "MAT-GKL" }),
      source({ id: "src:live:request:gkl", type: "procurement_request", labelRu: "Заявка MR-GKL: нужно 42 листа", linkedObjectId: "OBJ-1", linkedWorkId: "WRK-GKL", linkedMaterialId: "MAT-GKL" }),
      source({ id: "src:live:supplier:gkl", type: "supplier_offer", labelRu: "Поставка СтройМаркет: 12 листов, документы ожидаются", linkedMaterialId: "MAT-GKL" }),
      source({ id: "src:live:work:gkl", type: "work", labelRu: "Работа WRK-GKL: монтаж перегородок", linkedObjectId: "OBJ-1", linkedWorkId: "WRK-GKL" }),
    ],
  };
}

export function buildLiveDirectorDefaultContext(): DirectorCompanyContext {
  return {
    screenId: "director.dashboard",
    role: "director",
    period: { from: "2026-05-20", to: "2026-05-20", labelRu: "2026-05-20" },
    forecastProviderConnected: true,
    securitySummaryProviderConnected: true,
    sources: [
      { id: "src:live:approval:pay", type: "approval", labelRu: "Approval PAY-GKL ожидает review", date: "2026-05-20" },
      { id: "src:live:finance:pay", type: "payment", labelRu: "Платёж PAY-GKL заблокирован документами", date: "2026-05-20" },
      { id: "src:live:request:gkl", type: "procurement_request", labelRu: "Закупка MR-GKL в sourcing", date: "2026-05-20" },
      { id: "src:live:warehouse:gkl", type: "warehouse_stock", labelRu: "Склад ГКЛ: дефицит 24 листа", date: "2026-05-20" },
      { id: "src:live:work:gkl", type: "work", labelRu: "Работа WRK-GKL заблокирована материалами", date: "2026-05-20" },
      { id: "src:live:document:waybill", type: "document", labelRu: "Накладная по поставке отсутствует", date: "2026-05-20" },
      { id: "src:live:office:pkg", type: "office_task", labelRu: "Office package PKG-GKL требует документов", date: "2026-05-20" },
      { id: "src:live:security:safe", type: "security_summary", labelRu: "Safe security summary: direct mutations not found", date: "2026-05-20" },
    ],
    approvals: [
      {
        id: "APR-GKL",
        titleRu: "Платёж PAY-GKL",
        status: "needs_data",
        approvalId: "APR-GKL",
        ownerRole: "director",
        riskLevel: "high",
        dueAt: "2026-05-20",
        linkedWorkId: "WRK-GKL",
        linkedRequestId: "MR-GKL",
        linkedInvoiceId: "INV-GKL",
        missingData: ["накладная", "подтверждение прихода"],
        sourceRefs: ["src:live:approval:pay", "src:live:finance:pay"],
      },
    ],
    works: [
      {
        id: "WRK-GKL",
        objectId: "OBJ-1",
        objectNameRu: "Дом 1, 2 этаж",
        workNameRu: "Монтаж перегородок",
        status: "blocked",
        contractorNameRu: "Бригада ГКЛ",
        materialNameRu: "ГКЛ 12.5 мм",
        missingPhotos: true,
        missingAct: true,
        blockerRu: "Не хватает материала и evidence для закрытия.",
        sourceRefs: ["src:live:work:gkl"],
      },
    ],
    procurementRequests: [
      {
        id: "MR-GKL",
        objectId: "OBJ-1",
        objectNameRu: "Дом 1, 2 этаж",
        workId: "WRK-GKL",
        workNameRu: "Монтаж перегородок",
        itemRu: "ГКЛ 12.5 мм",
        supplierNameRu: "СтройМаркет",
        status: "delivery_risk",
        deliveryDueAt: "2026-05-22",
        missingData: ["подтверждённый срок поставки"],
        sourceRefs: ["src:live:request:gkl"],
      },
    ],
    warehouse: [
      {
        id: "STK-GKL",
        materialNameRu: "ГКЛ 12.5 мм",
        objectId: "OBJ-1",
        objectNameRu: "Дом 1, 2 этаж",
        workId: "WRK-GKL",
        workNameRu: "Монтаж перегородок",
        requestedQty: 42,
        availableQty: 18,
        deficitQty: 24,
        unit: "лист",
        incomingConfirmed: false,
        sourceRefs: ["src:live:warehouse:gkl", "src:live:request:gkl"],
      },
    ],
    finance: [
      {
        id: "FIN-GKL",
        invoiceId: "INV-GKL",
        paymentId: "PAY-GKL",
        supplierNameRu: "СтройМаркет",
        amount: 125000,
        currency: "KGS",
        status: "blocked",
        riskLevel: "high",
        missingDocuments: ["накладная", "подтверждение прихода"],
        linkedRequestId: "MR-GKL",
        linkedWorkId: "WRK-GKL",
        linkedObjectId: "OBJ-1",
        sourceRefs: ["src:live:finance:pay"],
      },
    ],
    documents: [
      {
        id: "DOC-WAYBILL",
        titleRu: "Накладная по MR-GKL",
        documentType: "waybill",
        status: "missing",
        linkedObjectId: "OBJ-1",
        linkedWorkId: "WRK-GKL",
        sourceRefs: ["src:live:document:waybill"],
      },
    ],
    reports: [
      {
        id: "RPT-LIVE",
        titleRu: "Дневной отчёт по WRK-GKL",
        periodRu: "2026-05-20",
        status: "needs_evidence",
        missingData: ["фото после работ"],
        sourceRefs: ["src:live:work:gkl"],
      },
    ],
    officeTasks: [
      {
        id: "OFF-PKG-GKL",
        titleRu: "Собрать пакет PAY-GKL",
        ownerRole: "office",
        status: "overdue",
        dueAt: "2026-05-20",
        overdueDays: 1,
        sourceRefs: ["src:live:office:pkg"],
      },
    ],
    cashflowForecasts: [
      {
        id: "CF-GKL",
        periodRu: "неделя 20-26 мая",
        amount: -125000,
        currency: "KGS",
        assumptionRu: "forecast только как forecast после поступления документов",
        sourceRefs: ["src:live:finance:pay"],
      },
    ],
    securitySummaries: [
      {
        id: "SAFE-LIVE",
        titleRu: "Safe security summary",
        riskLevel: "low",
        forbiddenAttemptsCount: 0,
        summaryRu: "Запрещённые прямые действия не обнаружены.",
        sourceRefs: ["src:live:security:safe"],
      },
    ],
  };
}

export function buildLiveForemanDefaultContext(): ForemanWorkdayContext {
  return {
    screenId: "foreman.main",
    role: "foreman",
    currentDate: "2026-05-20",
    periodRu: "2026-05-20",
    sources: [
      source({ id: "src:live:foreman:work", type: "work", labelRu: "Работа WRK-GKL: монтаж перегородок", linkedObjectId: "OBJ-1", linkedWorkId: "WRK-GKL" }),
      source({ id: "src:live:foreman:photo", type: "photo", labelRu: "Фото до работ есть, фото после отсутствует", linkedObjectId: "OBJ-1", linkedWorkId: "WRK-GKL" }),
      source({ id: "src:live:foreman:stock", type: "warehouse_stock", labelRu: "Склад: дефицит ГКЛ 24 листа", linkedWorkId: "WRK-GKL", linkedMaterialId: "MAT-GKL" }),
      source({ id: "src:live:foreman:report", type: "report", labelRu: "Дневной отчёт требует evidence", documentId: "RPT-LIVE", fileName: "daily.pdf", page: 1 }),
    ],
    works: [
      {
        id: "WRK-GKL",
        nameRu: "Монтаж перегородок",
        date: "2026-05-20",
        objectId: "OBJ-1",
        objectNameRu: "Дом 1",
        zoneNameRu: "2 этаж",
        contractorId: "CTR-GKL",
        contractorNameRu: "Бригада ГКЛ",
        plannedQty: 42,
        actualQty: 18,
        unit: "м2",
        status: "blocked",
        materialIds: ["MAT-GKL"],
        blockers: [
          { kind: "material_missing", textRu: "дефицит ГКЛ 24 листа" },
          { kind: "photo_missing", textRu: "нет фото после выполнения" },
          { kind: "act_missing", textRu: "акт не подготовлен" },
        ],
        sourceRefs: ["src:live:foreman:work", "src:live:foreman:photo", "src:live:foreman:stock", "src:live:foreman:report"],
      },
    ],
  };
}

export function buildLiveBuyerDefaultContext(): BuyerSourcingContext {
  return {
    screenId: "buyer.main",
    role: "buyer",
    countryCode: "KG",
    cityOrRegion: "Бишкек",
    currency: "KGS",
    request: {
      id: "MR-GKL",
      status: "approved",
      createdAt: "2026-05-20",
      approvedByRu: "Директор",
      objectId: "OBJ-1",
      objectRu: "Дом 1, 2 этаж",
      workId: "WRK-GKL",
      workRu: "Монтаж перегородок",
      priority: "high",
      sourceRefs: ["src:live:buyer:request"],
      lines: [
        {
          id: "MRL-GKL",
          itemRu: "ГКЛ 12.5 мм",
          category: "ГКЛ",
          quantity: 42,
          unit: "лист",
          requiredDate: "2026-05-22",
          specificationText: "лист 12.5 мм",
          allowAnalogs: true,
          materialId: "MAT-GKL",
        },
      ],
    },
    selectedRequestLineId: undefined,
    sources: [
      source({ id: "src:live:buyer:request", type: "procurement_request", labelRu: "Approved request MR-GKL", linkedObjectId: "OBJ-1", linkedWorkId: "WRK-GKL", linkedMaterialId: "MAT-GKL" }),
      source({ id: "src:live:buyer:stock", type: "warehouse_stock", labelRu: "Склад: доступно 18 из 42", linkedMaterialId: "MAT-GKL" }),
      source({ id: "src:live:buyer:offer", type: "supplier_offer", labelRu: "Supplier offer СтройМаркет", linkedMaterialId: "MAT-GKL" }),
    ],
    warehouseStock: [
      {
        id: "STK-GKL",
        requestLineId: "MRL-GKL",
        materialId: "MAT-GKL",
        itemRu: "ГКЛ 12.5 мм",
        availableQty: 18,
        reservedQty: 0,
        incomingQty: 12,
        unit: "лист",
        sourceRef: "src:live:buyer:stock",
      },
    ],
    offers: [
      {
        id: "OFFER-GKL-1",
        requestId: "MR-GKL",
        requestLineId: "MRL-GKL",
        sourceType: "own_marketplace",
        supplierId: "SUP-GKL",
        supplierNameRu: "СтройМаркет",
        itemNameRu: "ГКЛ 12.5 мм",
        specificationMatch: "exact",
        quantityAvailable: 50,
        unit: "лист",
        price: 125,
        currency: "KGS",
        deliveryDays: 2,
        deliveryRegion: "Бишкек",
        availability: "in_stock",
        riskLevel: "low",
        riskReasonsRu: [],
        sourceLabelRu: "marketplace offer СтройМаркет",
        sourceDocumentId: "OFFER-GKL-1",
        lastCheckedAt: "2026-05-20T09:00:00+06:00",
      },
    ],
    externalMarketplaceConnected: false,
    internetSourcingConnected: false,
  };
}

export function buildLiveAccountantDefaultContext(): AccountantFinanceContext {
  return {
    screenId: "accountant.main",
    role: "accountant",
    countryCode: "KG",
    currency: "KGS",
    invoices: [
      {
        id: "INV-GKL",
        numberRu: "INV-GKL",
        supplierNameRu: "СтройМаркет",
        amount: 125000,
        currency: "KGS",
        invoiceDate: "2026-05-20",
        dueDate: "2026-05-22",
        status: "needs_check",
        requestId: "MR-GKL",
        workId: "WRK-GKL",
        objectId: "OBJ-1",
        sourceRefs: ["src:live:accountant:invoice"],
      },
    ],
    acts: [
      {
        id: "ACT-GKL",
        titleRu: "Акт WRK-GKL",
        signedByHuman: false,
        linkedWorkId: "WRK-GKL",
        sourceRefs: ["src:live:accountant:act"],
      },
    ],
    payments: [
      {
        id: "PAY-GKL",
        invoiceId: "INV-GKL",
        amount: 125000,
        currency: "KGS",
        status: "blocked",
        sourceRefs: ["src:live:accountant:payment"],
      },
    ],
    cashflow: [
      {
        id: "CF-GKL",
        scope: "object",
        periodRu: "май 2026",
        outgoingAmount: 125000,
        currency: "KGS",
        sourceRefs: ["src:live:accountant:payment"],
      },
    ],
    sources: [
      source({ id: "src:live:accountant:invoice", type: "payment", labelRu: "Invoice INV-GKL requires waybill", linkedObjectId: "OBJ-1", linkedWorkId: "WRK-GKL" }),
      source({ id: "src:live:accountant:act", type: "act", labelRu: "Act ACT-GKL unsigned", linkedObjectId: "OBJ-1", linkedWorkId: "WRK-GKL" }),
      source({ id: "src:live:accountant:payment", type: "payment", labelRu: "Payment PAY-GKL blocked", linkedObjectId: "OBJ-1", linkedWorkId: "WRK-GKL" }),
      source({ id: "src:live:accountant:request", type: "procurement_request", labelRu: "Request MR-GKL linked", linkedMaterialId: "MAT-GKL" }),
    ],
    chartOfAccountsConfigured: true,
    countryTaxProfileConfigured: true,
  };
}

export function buildLiveOfficeDefaultContext(): OfficeDocumentControlContext {
  return {
    screenId: "office.hub",
    role: "office",
    selectedDocumentId: undefined,
    period: { from: "2026-05-20", to: "2026-05-20", labelRu: "2026-05-20" },
    sources: [
      { id: "src:live:office:task", type: "office_task", labelRu: "Office task overdue", date: "2026-05-20" },
      { id: "src:live:office:doc", type: "document", labelRu: "Unlinked invoice PDF", date: "2026-05-20", page: 1 },
      { id: "src:live:office:package", type: "approval_package", labelRu: "Approval package incomplete", date: "2026-05-20" },
      { id: "src:live:office:reminder", type: "reminder", labelRu: "Reminder draft source", date: "2026-05-20" },
      { id: "src:live:office:deadline", type: "deadline", labelRu: "Deadline overdue", date: "2026-05-20" },
      { id: "src:live:office:payment", type: "payment", labelRu: "Payment PAY-GKL blocked", date: "2026-05-20" },
      { id: "src:live:office:work", type: "work", labelRu: "Work WRK-GKL waits closeout docs", date: "2026-05-20" },
    ],
    tasks: [
      {
        id: "TASK-GKL",
        titleRu: "Собрать пакет PAY-GKL",
        status: "overdue",
        ownerRole: "office",
        nextOwnerRole: "accountant",
        dueAt: "2026-05-20",
        overdueDays: 1,
        whyStuckRu: "Нужна накладная и link review PDF.",
        missingData: ["накладная", "link review PDF"],
        sourceRefs: ["src:live:office:task", "src:live:office:payment"],
      },
    ],
    documentsQueue: [
      {
        id: "DOC-GKL",
        titleRu: "Invoice PDF PAY-GKL",
        documentType: "pdf",
        status: "unlinked",
        ownerRole: "office",
        linkedPaymentId: "PAY-GKL",
        linkedApprovalPackageId: "PKG-GKL",
        blocks: ["payment", "approval", "director_package"],
        missingData: ["human link review", "waybill number"],
        sourceRefs: ["src:live:office:doc", "src:live:office:payment"],
      },
    ],
    approvalPackages: [
      {
        id: "PKG-GKL",
        titleRu: "Director package PAY-GKL",
        status: "waiting_documents",
        ownerRole: "office",
        approvalId: "APR-GKL",
        linkedPaymentId: "PAY-GKL",
        linkedWorkId: "WRK-GKL",
        relatedDocumentIds: ["DOC-GKL"],
        missingDocuments: ["waybill", "warehouse receipt"],
        missingData: ["document link not reviewed"],
        sourceRefs: ["src:live:office:package", "src:live:office:payment"],
      },
    ],
    reminders: [
      {
        id: "REM-GKL",
        targetRole: "accountant",
        targetLabelRu: "accountant for PAY-GKL",
        status: "draft",
        reasonRu: "Payment package waits waybill and link review.",
        blocks: ["payment", "approval"],
        sourceRefs: ["src:live:office:reminder", "src:live:office:package"],
        finalSent: false,
      },
    ],
    deadlines: [
      {
        id: "DL-GKL",
        titleRu: "Package PKG-GKL deadline",
        dueAt: "2026-05-20",
        status: "overdue",
        ownerRole: "office",
        linkedItemType: "approval_package",
        linkedItemId: "PKG-GKL",
        missingData: ["deadline extension rationale"],
        sourceRefs: ["src:live:office:deadline", "src:live:office:package"],
      },
    ],
  };
}

function marketplaceOffer(overrides: Partial<MarketplaceOfferDraft> = {}): MarketplaceOfferDraft {
  return {
    id: "MP-GKL",
    ownerRole: "supplier",
    ownerId: "SUP-GKL",
    ownerNameRu: "СтройМаркет",
    offerType: "product",
    titleRu: "ГКЛ 12.5 мм",
    category: "ГКЛ",
    unit: "лист",
    price: 125,
    currency: "KGS",
    availability: "limited",
    quantityAvailable: 50,
    deliveryRegion: "Бишкек",
    deliveryDays: 2,
    documents: [
      { documentId: "DOC-PRICE-GKL", fileName: "price_gkl.pdf", documentType: "price_list" },
    ],
    sourceRefs: ["src:live:market:supplier", "src:live:market:price"],
    moderationStatus: "needs_data",
    missingData: ["certificate"],
    riskFlags: ["certificate missing"],
    published: false,
    ...overrides,
  };
}

export function buildLiveMarketplaceDefaultContext(context: LiveAiContextId): MarketplaceIntakeContext {
  const supplierContext = context === "supplier";
  const contractorContext = context === "contractor";
  return {
    screenId: contractorContext ? "contractor.main" : supplierContext ? "supplier.showcase" : "market.home",
    role: contractorContext ? "contractor" : supplierContext ? "supplier" : "buyer",
    actorId: contractorContext ? "CTR-GKL" : supplierContext ? "SUP-GKL" : "BUYER-LIVE",
    actorNameRu: contractorContext ? "Бригада ГКЛ" : supplierContext ? "СтройМаркет" : "Снабжение",
    checkedAt: "2026-05-20T09:00:00+06:00",
    permissions: {
      canAddMarketplaceProduct: supplierContext,
      canAddMarketplaceService: contractorContext,
      canSubmitModeration: supplierContext || contractorContext,
      canSeeApprovedMarketplaceSources: true,
      canSeeOwnPrivateOffers: true,
      canSeeOtherSupplierPrivateOffers: false,
      directPublishAllowed: false,
      directOrderAllowed: false,
      autoApprovalAllowed: false,
    },
    offerDrafts: [
      marketplaceOffer({
        ownerRole: contractorContext ? "contractor" : "supplier",
        ownerId: contractorContext ? "CTR-GKL" : "SUP-GKL",
        ownerNameRu: contractorContext ? "Бригада ГКЛ" : "СтройМаркет",
        offerType: contractorContext ? "service" : "product",
        titleRu: contractorContext ? "Монтаж перегородок ГКЛ" : "ГКЛ 12.5 мм",
        category: contractorContext ? "отделочные работы" : "ГКЛ",
      }),
    ],
    buyerRequests: [
      {
        requestId: "MR-GKL",
        requestLineId: "MRL-GKL",
        objectRu: "Дом 1, 2 этаж",
        workRu: "Монтаж перегородок",
        itemRu: "ГКЛ 12.5 мм",
        quantity: 42,
        unit: "лист",
        requiredDate: "2026-05-22",
        matchKind: "exact",
        sourceRefs: ["src:live:market:request"],
      },
    ],
    sources: [
      source({ id: "src:live:market:supplier", type: "supplier_offer", labelRu: "Marketplace card СтройМаркет" }),
      source({ id: "src:live:market:price", type: "specification", labelRu: "Price list PDF", documentId: "DOC-PRICE-GKL", fileName: "price_gkl.pdf", page: 1 }),
      source({ id: "src:live:market:request", type: "procurement_request", labelRu: "Buyer request MR-GKL", linkedObjectId: "OBJ-1", linkedWorkId: "WRK-GKL", linkedMaterialId: "MAT-GKL" }),
      source({ id: "src:live:market:work", type: "work", labelRu: "Own contractor work WRK-GKL", linkedObjectId: "OBJ-1", linkedWorkId: "WRK-GKL" }),
    ],
  };
}
