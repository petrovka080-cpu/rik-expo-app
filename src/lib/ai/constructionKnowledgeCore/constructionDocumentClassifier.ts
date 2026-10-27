import { classifyConstructionDiscipline } from "./constructionDisciplineClassifier";
import type {
  ConstructionClassificationResult,
  ConstructionDocumentInput,
  ConstructionDocumentType,
  ConstructionKnowledgeSource,
} from "./constructionKnowledgeTypes";

const DOCUMENT_RULES: readonly {
  documentType: ConstructionDocumentType;
  sourceType: ConstructionKnowledgeSource["type"];
  terms: string[];
}[] = [
  { documentType: "architecture_project", sourceType: "architecture_pdf", terms: ["архитектур", "раздел ар", "ар-", "план этажа", "экспликация"] },
  { documentType: "structural_project", sourceType: "project_pdf", terms: ["конструктив", "раздел кр", "кр-", "армирование", "фундамент"] },
  { documentType: "engineering_project", sourceType: "engineering_pdf", terms: ["инженер", "ов", "вк", "эом", "электр", "вентиляц", "водопровод"] },
  { documentType: "estimate", sourceType: "estimate_pdf", terms: ["смета", "локальная смета", "estimate", "стоимость", "итого"] },
  { documentType: "boq", sourceType: "boq", terms: ["ведомость объемов", "boq", "bill of quantities", "объем работ"] },
  { documentType: "material_specification", sourceType: "specification", terms: ["спецификация", "ведомость материалов", "materials specification"] },
  { documentType: "work_schedule", sourceType: "project_pdf", terms: ["график работ", "календарный план", "schedule"] },
  { documentType: "hidden_work_act", sourceType: "act", terms: ["акт скрытых работ", "скрытые работы"] },
  { documentType: "completion_act", sourceType: "act", terms: ["акт выполненных работ", "кс-2", "форма 2", "completion act"] },
  { documentType: "as_built_scheme", sourceType: "project_pdf", terms: ["исполнительная схема", "исполнительный чертеж", "as-built"] },
  { documentType: "defect_act", sourceType: "act", terms: ["дефектный акт", "дефектовка", "замечания"] },
  { documentType: "contract", sourceType: "project_pdf", terms: ["договор", "контракт", "стороны договора"] },
  { documentType: "invoice", sourceType: "payment", terms: ["счет на оплату", "invoice", "счет-фактура"] },
  { documentType: "delivery_note", sourceType: "material", terms: ["накладная", "товарная накладная", "приход"] },
  { documentType: "payment_document", sourceType: "payment", terms: ["платежное поручение", "оплата", "платеж"] },
  { documentType: "normative_document", sourceType: "normative_pdf", terms: ["снип", "сп ", "гост", "норма", "норматив", "строительные нормы"] },
  { documentType: "company_standard", sourceType: "company_standard", terms: ["стандарт компании", "регламент компании", "внутренний стандарт"] },
  { documentType: "technical_assignment", sourceType: "project_pdf", terms: ["техническое задание", "тз", "scope of work"] },
  { documentType: "work_log", sourceType: "report", terms: ["журнал работ", "общий журнал", "work log"] },
  { documentType: "daily_report", sourceType: "report", terms: ["ежедневный отчет", "дневной отчет", "daily report"] },
  { documentType: "photo_report", sourceType: "photo", terms: ["фотоотчет", "фото отчет", "photo report"] },
];

function normalize(value: string): string {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function sourceTypeForUnknown(fileName: string): ConstructionKnowledgeSource["type"] {
  return normalize(fileName).endsWith(".pdf") ? "project_pdf" : "report";
}

function documentPriority(documentType: ConstructionDocumentType): number {
  if (documentType === "hidden_work_act") return 30;
  if (documentType === "completion_act" || documentType === "defect_act") return 25;
  if (documentType === "estimate" || documentType === "boq") return 20;
  if (documentType === "material_specification") return 18;
  return 0;
}

export function classifyConstructionDocument(
  input: ConstructionDocumentInput,
): ConstructionClassificationResult {
  const text = input.pages?.map((page) => page.text).join("\n") ?? input.text ?? "";
  const haystack = normalize(`${input.fileName} ${text}`);
  const scored = DOCUMENT_RULES
    .map((rule) => ({
      ...rule,
      matchedTerms: rule.terms.filter((term) => haystack.includes(normalize(term))),
    }))
    .filter((item) => item.matchedTerms.length > 0)
    .sort((a, b) =>
      (b.matchedTerms.length - a.matchedTerms.length) ||
      (documentPriority(b.documentType) - documentPriority(a.documentType))
    );

  const best = scored[0];
  const discipline = classifyConstructionDiscipline({ fileName: input.fileName, text });
  const documentType = best?.documentType ?? "unknown";
  const sourceType = best?.sourceType ?? sourceTypeForUnknown(input.fileName);
  const confidence = best
    ? best.matchedTerms.length >= 2 ? "high" : "medium"
    : "low";

  return {
    documentId: input.id,
    documentType,
    discipline: discipline.discipline,
    confidence,
    source: {
      id: `source:document:${input.id}`,
      type: sourceType,
      labelRu: input.fileName,
      documentId: input.id,
      fileName: input.fileName,
      page: input.pages?.[0]?.page,
      linkedObjectId: input.linkedObjectId,
      linkedWorkId: input.linkedWorkId,
      confidence,
    },
    reasons: best?.matchedTerms ?? ["document type was not asserted without evidence"],
  };
}

export function aiDocumentClassifierProvider(input: ConstructionDocumentInput) {
  return classifyConstructionDocument(input);
}
