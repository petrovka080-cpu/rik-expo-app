import type { ConstructionKnowledgeSource } from "../../src/lib/ai/constructionKnowledgeCore";
import type { MarketplaceIntakeContext, MarketplaceOfferDraft } from "../../src/lib/ai/marketplaceIntake";

function sources(): ConstructionKnowledgeSource[] {
  return [
    {
      id: "src:supplier:SUP-1",
      type: "supplier_offer",
      labelRu: "Профиль поставщика SUP-1",
      confidence: "high",
    },
    {
      id: "src:price:PL-1",
      type: "specification",
      labelRu: "Прайс-лист SUP-1 от 19.05.2026",
      documentId: "DOC-PL-1",
      fileName: "price_list_sup1.pdf",
      page: 1,
      confidence: "high",
    },
    {
      id: "src:request:MR-1042",
      type: "procurement_request",
      labelRu: "Заявка MR-1042: ГКЛ 12.5 мм",
      linkedObjectId: "OBJ-1",
      linkedWorkId: "WRK-1042",
      linkedMaterialId: "MAT-GKL",
      confidence: "high",
    },
    {
      id: "src:contractor:CON-1",
      type: "work",
      labelRu: "Подрядчик CON-1: отделочные работы",
      linkedObjectId: "OBJ-1",
      linkedWorkId: "WRK-FIN-1",
      confidence: "high",
    },
    {
      id: "src:payment:hidden",
      type: "payment",
      labelRu: "Full cashflow hidden from marketplace intake",
      confidence: "high",
    },
  ];
}

export function marketplaceProductDraft(overrides: Partial<MarketplaceOfferDraft> = {}): MarketplaceOfferDraft {
  return {
    id: "MP-DRAFT-1",
    ownerRole: "supplier",
    ownerId: "SUP-1",
    ownerNameRu: "ОсОО СтройМаркет",
    offerType: "product",
    titleRu: "ГКЛ 12.5 мм",
    category: "ГКЛ / профили",
    specificationText: "ГКЛ 12.5 мм для перегородок, сертификат требуется перед approval.",
    unit: "лист",
    price: 125,
    currency: "KGS",
    priceValidUntil: "2026-05-25",
    availability: "limited",
    quantityAvailable: 80,
    minOrderQty: 10,
    deliveryRegion: "Бишкек",
    deliveryDays: 1,
    documents: [
      {
        documentId: "DOC-PL-1",
        fileName: "price_list_sup1.pdf",
        documentType: "price_list",
      },
    ],
    sourceRefs: ["src:supplier:SUP-1", "src:price:PL-1"],
    moderationStatus: "needs_data",
    missingData: ["сертификат соответствия"],
    riskFlags: ["нет сертификата соответствия"],
    published: false,
    ...overrides,
  };
}

export function marketplaceServiceDraft(overrides: Partial<MarketplaceOfferDraft> = {}): MarketplaceOfferDraft {
  return {
    id: "MP-SERVICE-1",
    ownerRole: "contractor",
    ownerId: "CON-1",
    ownerNameRu: "Бригада Отделка Плюс",
    offerType: "service",
    titleRu: "Монтаж перегородок ГКЛ",
    category: "отделочные работы",
    discipline: "finishing",
    specificationText: "Монтаж перегородок по проекту, цена за м2.",
    unit: "м2",
    price: 450,
    currency: "KGS",
    priceValidUntil: "2026-05-28",
    availability: "scheduled",
    deliveryRegion: "Бишкек",
    deliveryDays: 3,
    documents: [
      {
        documentId: "DOC-LIC-1",
        fileName: "contractor_license.pdf",
        documentType: "license",
      },
    ],
    sourceRefs: ["src:contractor:CON-1", "DOC-LIC-1"],
    moderationStatus: "pending_review",
    missingData: [],
    riskFlags: [],
    published: false,
    ...overrides,
  };
}

export function approvedMarketplaceOffer(overrides: Partial<MarketplaceOfferDraft> = {}): MarketplaceOfferDraft {
  return marketplaceProductDraft({
    id: "MP-APPROVED-1",
    moderationStatus: "approved",
    missingData: [],
    riskFlags: [],
    documents: [
      {
        documentId: "DOC-PL-1",
        fileName: "price_list_sup1.pdf",
        documentType: "price_list",
      },
      {
        documentId: "DOC-CERT-1",
        fileName: "certificate_gkl.pdf",
        documentType: "certificate",
      },
    ],
    sourceRefs: ["src:supplier:SUP-1", "src:price:PL-1", "DOC-CERT-1"],
    ...overrides,
  });
}

export function buildMarketplaceIntakeFixture(overrides: Partial<MarketplaceIntakeContext> = {}): MarketplaceIntakeContext {
  return {
    screenId: "market.home",
    role: "supplier",
    actorId: "SUP-1",
    actorNameRu: "ОсОО СтройМаркет",
    selectedOfferId: "MP-DRAFT-1",
    selectedRequestId: "MR-1042",
    offerDrafts: [
      marketplaceProductDraft(),
      approvedMarketplaceOffer(),
      marketplaceServiceDraft(),
      marketplaceProductDraft({
        id: "MP-OTHER-PRIVATE",
        ownerId: "SUP-2",
        ownerNameRu: "Другой поставщик",
        moderationStatus: "pending_review",
        sourceRefs: ["src:supplier:SUP-2"],
      }),
    ],
    buyerRequests: [
      {
        requestId: "MR-1042",
        requestLineId: "MRL-1",
        objectRu: "Дом 1, 2 этаж",
        workRu: "Монтаж перегородок",
        itemRu: "ГКЛ 12.5 мм",
        quantity: 42,
        unit: "лист",
        requiredDate: "2026-05-22",
        matchKind: "exact",
        sourceRefs: ["src:request:MR-1042"],
      },
    ],
    sources: sources(),
    checkedAt: "2026-05-20T09:00:00+06:00",
    ...overrides,
  };
}
