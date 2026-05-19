import type {
  ConstructionKnowledgeSource,
  ConstructionQuestionRequest,
} from "../../src/lib/ai/constructionKnowledgeCore";

export const constructionSources: ConstructionKnowledgeSource[] = [
  {
    id: "source:project:ar:14",
    type: "architecture_pdf",
    labelRu: "Проект АР.pdf",
    documentId: "doc-ar",
    fileName: "Проект АР.pdf",
    page: 14,
    linkedObjectId: "object-1",
    linkedWorkId: "work-1",
    confidence: "high",
  },
  {
    id: "source:estimate:77",
    type: "estimate_pdf",
    labelRu: "Смета объекта",
    linkedEstimateLineId: "EST-77",
    linkedWorkId: "work-1",
    linkedMaterialId: "mat-1",
    confidence: "high",
  },
  {
    id: "source:work:1",
    type: "work",
    labelRu: "Монтаж перегородок",
    linkedObjectId: "object-1",
    linkedWorkId: "work-1",
    confidence: "high",
  },
  {
    id: "source:stock:1",
    type: "warehouse_stock",
    labelRu: "Склад: блок перегородочный",
    linkedMaterialId: "mat-1",
    linkedWorkId: "work-1",
    confidence: "high",
  },
  {
    id: "source:procurement:1",
    type: "procurement_request",
    labelRu: "Заявка REQ-1",
    linkedMaterialId: "mat-1",
    linkedWorkId: "work-1",
    confidence: "high",
  },
  {
    id: "source:supplier:1",
    type: "supplier_offer",
    labelRu: "Коммерческое предложение SUP-1",
    linkedMaterialId: "mat-1",
    confidence: "high",
  },
  {
    id: "source:act:1",
    type: "act",
    labelRu: "Акт выполненных работ ACT-1",
    linkedWorkId: "work-1",
    confidence: "high",
  },
  {
    id: "source:payment:1",
    type: "payment",
    labelRu: "Счет INV-1",
    linkedWorkId: "work-1",
    confidence: "high",
  },
  {
    id: "source:approval:1",
    type: "approval",
    labelRu: "Approval AP-1",
    linkedWorkId: "work-1",
    confidence: "high",
  },
  {
    id: "source:norm:kg:1",
    type: "normative_pdf",
    labelRu: "Нормативный PDF",
    documentId: "doc-norm",
    fileName: "Нормативный PDF.pdf",
    page: 3,
    countryCode: "KG",
    confidence: "high",
  },
  {
    id: "source:country:kg",
    type: "country_profile",
    labelRu: "Country profile KG",
    countryCode: "KG",
    confidence: "high",
  },
  {
    id: "source:company:standard",
    type: "company_standard",
    labelRu: "Стандарт компании",
    documentId: "doc-standard",
    fileName: "company-standard.pdf",
    confidence: "high",
  },
];

export function requestFor(
  role: ConstructionQuestionRequest["role"],
  questionRu: string,
  sources = constructionSources,
): ConstructionQuestionRequest {
  return {
    role,
    screenId: `${role}.main`,
    questionRu,
    sources,
  };
}
