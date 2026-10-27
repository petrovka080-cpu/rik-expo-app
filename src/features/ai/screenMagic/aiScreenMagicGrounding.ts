import { AI_DOCUMENT_SOURCE_REGISTRY } from "../knowledge/aiDocumentSourceRegistry";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicPack,
} from "./aiScreenMagicTypes";
import { sanitizeAiScreenMagicUserCopy } from "./aiScreenMagicUserCopy";

export type AiGroundedAnswerKind =
  | "grounded_read_result"
  | "grounded_draft"
  | "grounded_approval_route"
  | "exact_no_data_reason"
  | "clarifying_question";

export type AiGroundedSourceType =
  | "screen_context"
  | "screen_record"
  | "database_record"
  | "pdf_chunk"
  | "document"
  | "photo"
  | "work"
  | "object"
  | "approval"
  | "warehouse_stock"
  | "warehouse_incoming"
  | "warehouse_issue"
  | "procurement_request"
  | "supplier_offer"
  | "payment"
  | "chat_message"
  | "report"
  | "act";

export type AiGroundedFact = {
  textRu: string;
  sourceType: AiGroundedSourceType;
  sourceId: string;
  sourceLabelRu: string;
  page?: number;
  confidence: "high" | "medium" | "low";
};

export type AiGroundedAnswer = {
  screenId: string;
  actionId: string;
  actionLabelRu: string;
  userQuestion: string;
  questionRu: string;
  answerKind: AiGroundedAnswerKind;
  shortAnswerRu: string;
  facts: AiGroundedFact[];
  missingData: string[];
  nextStepRu: string;
  changedData: false;
  finalSubmit: false;
  autoApproval: false;
  exactNoDataReason?: string;
  exactNoDataReasonRu?: string;
  clarifyingQuestionRu?: string;
  providerTrace: string[];
};

export type AiGroundedQuestionRequest = {
  screenId: string;
  role: string;
  userText?: string;
  actionId?: string;
  actionLabelRu?: string;
  routeParams: Record<string, string | number | boolean | null | undefined>;
  selectedEntity?: {
    type: "work" | "object" | "document" | "request" | "payment" | "stockItem" | "chat" | "approval";
    id: string;
    labelRu: string;
  };
  locale: "ru";
  mode: "button" | "free_text";
};

export type AiActionQuestionMapping = {
  screenId: string;
  actionId: string;
  labelRu: string;
  concreteQuestionRu: string;
  requiredContext: (
    | "work"
    | "object"
    | "document"
    | "pdf"
    | "material_request"
    | "supplier_offer"
    | "stock"
    | "payment"
    | "approval"
    | "chat"
  )[];
  allowedSourceTypes: AiGroundedSourceType[];
  answerKind: Exclude<AiGroundedAnswerKind, "exact_no_data_reason" | "clarifying_question">;
  hideIfContextMissing: boolean;
};

export type PdfGroundingHit = {
  documentId: string;
  fileName: string;
  page?: number;
  sectionTitle?: string;
  chunkText: string;
  matchedTerms: string[];
  linkedObjectId?: string;
  linkedWorkId?: string;
  linkedRequestId?: string;
};

type GroundingDomain =
  | "finance"
  | "procurement"
  | "warehouse"
  | "field"
  | "documents"
  | "approval"
  | "chat"
  | "control"
  | "security"
  | "runtime"
  | "logistics"
  | "office";

const GENERIC_RESULT_PATTERNS = [
  /AI\s+собирает\s+этот\s+блок/i,
  /данных\s+текущего\s+экрана/i,
  /проверенных\s+маршрутов/i,
  /отсутствующие\s+факты/i,
  /safe_read|draft_only|approval_required|exact_blocker/i,
  /rationale|evidence/i,
  /prepared work/i,
  /generic fallback/i,
] as const;

function clean(value: string): string {
  return sanitizeAiScreenMagicUserCopy(value).trim();
}

function normalize(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => clean(value)).filter(Boolean))];
}

function sourceIdForScreen(screenId: string): string {
  return `screen:${screenId}`;
}

function userScreenLabel(pack: AiScreenMagicPack): string {
  return pack.userHeader || pack.screenSummary || pack.screenId;
}

function detectDomain(pack: AiScreenMagicPack, button: AiScreenMagicButton): GroundingDomain {
  const text = normalize(`${pack.screenId} ${pack.domain} ${button.label}`);
  if (text.includes("runtime")) return "runtime";
  if (text.includes("security") || text.includes("role") || text.includes("policy")) return "security";
  if (pack.screenId.startsWith("foreman.") || pack.screenId.startsWith("contractor.")) return "field";
  if (pack.domain === "finance") return "finance";
  if (pack.domain === "procurement" || pack.domain === "marketplace") return "procurement";
  if (pack.domain === "warehouse") return "warehouse";
  if (pack.domain === "projects" || pack.domain === "subcontracts") return "field";
  if (pack.domain === "documents" || pack.domain === "reports") return "documents";
  if (pack.domain === "chat") return "chat";
  if (pack.domain === "office") return "office";
  if (pack.domain === "control") return "control";
  if (text.includes("office")) return "office";
  if (text.includes("chat")) return "chat";
  if (text.includes("approval") || text.includes("соглас")) return "approval";
  if (text.includes("map") || text.includes("логист") || text.includes("маршрут")) return "logistics";
  if (text.includes("warehouse") || text.includes("склад") || text.includes("дефицит") || text.includes("приход") || text.includes("выдач")) return "warehouse";
  if (text.includes("foreman") || text.includes("contractor") || text.includes("subcontract") || text.includes("прораб") || text.includes("подряд")) return "field";
  if (text.includes("document") || text.includes("документ") || text.includes("report") || text.includes("отчет") || text.includes("отчёт") || text.includes("акт") || text.includes("checklist") || text.includes("чек")) return "documents";
  if (text.includes("payment") || text.includes("finance") || text.includes("плат") || text.includes("финанс")) return "finance";
  if (text.includes("buyer") || text.includes("procurement") || text.includes("market") || text.includes("supplier") || text.includes("закуп") || text.includes("постав") || text.includes("заявк") || text.includes("цен")) return "procurement";
  if (text.includes("director") || text.includes("control") || text.includes("директор")) return "control";
  return "control";
}

function sourceTypeForDomain(domain: GroundingDomain): AiGroundedSourceType {
  if (domain === "finance") return "payment";
  if (domain === "procurement") return "procurement_request";
  if (domain === "warehouse" || domain === "logistics") return "warehouse_stock";
  if (domain === "documents") return "document";
  if (domain === "field") return "work";
  if (domain === "approval") return "approval";
  if (domain === "chat") return "chat_message";
  return "screen_context";
}

function providerForDomain(domain: GroundingDomain): string {
  if (domain === "finance") return "aiFinanceGroundingProvider";
  if (domain === "procurement") return "aiProcurementGroundingProvider";
  if (domain === "warehouse" || domain === "logistics") return "aiWarehouseGroundingProvider";
  if (domain === "documents") return "aiDocumentGroundingProvider";
  if (domain === "field") return "aiWorkEvidenceProvider";
  if (domain === "approval") return "aiApprovalGroundingProvider";
  if (domain === "chat") return "aiChatGroundingProvider";
  if (domain === "security") return "aiSecurityGroundingProvider";
  if (domain === "runtime") return "aiRuntimeGroundingProvider";
  return "aiScreenGroundingProvider";
}

function sourceLabelForRef(ref: string): string {
  const value = clean(ref.replace(/^source:/, ""));
  const labels: Record<string, string> = {
    screen_state: "состояние открытого экрана",
    warehouse_status: "статус склада",
    procurement_context: "контекст заявки на материал",
    approval_policy: "маршрут согласования",
    finance_summary: "финансовая сводка",
    document_metadata: "метаданные документов",
    ledger_status: "статус согласования",
  };
  return labels[value] ?? value.replace(/_/g, " ");
}

function extractEvidenceRefs(pack: AiScreenMagicPack): string[] {
  return unique([
    ...pack.aiPreparedWork.flatMap((item) => item.evidence),
    ...pack.visibleDomainData.map((item) => `screen-field:${item}`),
  ]).slice(0, 10);
}

function hasHydratedBusinessEvidence(pack: AiScreenMagicPack): boolean {
  return extractEvidenceRefs(pack).some((ref) =>
    /^screen:param:/i.test(ref) ||
    /^payment:/i.test(ref) ||
    /^request:/i.test(ref) ||
    /^supplier:/i.test(ref) ||
    /^warehouse:/i.test(ref) ||
    /^document:/i.test(ref) ||
    /^pdf:/i.test(ref) ||
    /^work:/i.test(ref) ||
    /^approval:/i.test(ref),
  );
}

function documentSourcesForPack(pack: AiScreenMagicPack): PdfGroundingHit[] {
  const domains = new Set([pack.domain, pack.screenId.split(".")[0]]);
  const roleScope = pack.screenId.startsWith("foreman.")
    ? ["foreman"]
    : pack.screenId.startsWith("contractor.")
      ? ["contractor"]
      : pack.screenId.startsWith("accountant.")
        ? ["accountant"]
        : pack.screenId.startsWith("warehouse.")
          ? ["warehouse"]
          : pack.screenId.startsWith("buyer.") || pack.screenId.startsWith("market.") || pack.screenId.startsWith("supplier.")
            ? ["buyer"]
            : pack.roleScope;
  const roles = new Set(roleScope);
  const labelBySource: Record<string, string> = {
    director_reports: "директорские отчёты",
    foreman_daily_reports: "ежедневные отчёты прораба",
    ai_reports: "AI-отчёты",
    acts: "акты",
    subcontract_documents: "документы подрядчика",
    request_documents: "документы заявки",
    warehouse_documents: "складские документы",
    finance_documents: "финансовые документы",
    chat_attachments: "вложения чата",
    pdf_exports: "ПДФ-экспорты",
  };
  return AI_DOCUMENT_SOURCE_REGISTRY
    .filter((source) => source.domains.some((domain) => domains.has(domain)))
    .filter((source) => source.readableByRoles.some((role) => roles.has(role)))
    .slice(0, 2)
    .map((source, index) => ({
      documentId: `docsrc:${source.sourceId}`,
      fileName: `${labelBySource[source.sourceId] ?? source.sourceId.replace(/_/g, " ")}.пдф`,
      page: index + 1,
      sectionTitle: source.kind,
      chunkText: `Реестр документов допускает только редактированные метаданные источника ${source.sourceId}.`,
      matchedTerms: [pack.domain, pack.screenId],
      linkedObjectId: pack.screenId.startsWith("foreman.") ? sourceIdForScreen(pack.screenId) : undefined,
      linkedWorkId: pack.screenId.startsWith("foreman.") ? `work-context:${pack.screenId}` : undefined,
      linkedRequestId: pack.domain === "procurement" ? `request-context:${pack.screenId}` : undefined,
    }));
}

function actionRequiresDocumentGrounding(pack: AiScreenMagicPack, button: AiScreenMagicButton): boolean {
  if (pack.domain === "security" || pack.domain === "runtime") return false;
  const text = normalize(`${pack.screenId} ${pack.domain} ${button.label}`);
  return pack.screenId.startsWith("foreman.") ||
    pack.screenId.includes("reports") ||
    pack.domain === "documents" ||
    pack.domain === "reports" ||
    /документ|пдф|чек-лист|чеклист|акт|отчет|отчёт|резюме|комментар/i.test(text);
}

function exactMissingContextReason(pack: AiScreenMagicPack, domain: GroundingDomain): string {
  if (domain === "field") {
    return "не выбрана конкретная работа, объект или подрядчик; без этого нельзя назвать фото, акт, подпись или материал как подтвержденный факт";
  }
  if (domain === "documents") {
    return "не выбран конкретный документ или ПДФ-файл; документный провайдер может показать только источники, которые привязаны к роли и экрану";
  }
  if (domain === "procurement") {
    return "нет связанной заявки на материал, количества или поставщика для этой кнопки";
  }
  if (domain === "finance") {
    return "нет выбранного платежа, документа-основания или записи согласования";
  }
  if (domain === "warehouse" || domain === "logistics") {
    return "нет выбранной складской позиции, прихода, выдачи или связанной заявки";
  }
  if (domain === "approval") {
    return "нет выбранного элемента согласования с основанием и ответственным согласующим";
  }
  if (domain === "chat") {
    return "нет выбранного обсуждения или сообщения, из которого можно извлечь задачи";
  }
  if (domain === "runtime") {
    return "нет выбранного артефакта или сбойного проверочного запуска для диагностики";
  }
  if (domain === "security") {
    return "нет выбранного события аудита, роли или пробела политики для проверки";
  }
  return `для экрана «${userScreenLabel(pack)}» не передан конкретный объект, запись или документ`;
}

function missingDataForDomain(pack: AiScreenMagicPack, domain: GroundingDomain): string[] {
  const base = unique(pack.missingDataSummary);
  const requiredByDomain: Record<GroundingDomain, string[]> = {
    finance: ["платеж", "документ-основание", "запись согласования"],
    procurement: ["заявка на материал", "количество", "вариант поставщика"],
    warehouse: ["складская позиция", "остаток", "приход или выдача"],
    field: ["работа", "объект", "фото или акт", "подрядчик"],
    documents: ["документ", "ПДФ-источник", "связанная запись"],
    approval: ["элемент согласования", "основание", "ответственный согласующий"],
    chat: ["сообщение", "обсуждение", "ответственный"],
    control: ["домен решения", "основание", "ответственный"],
    security: ["событие аудита", "роль", "пробел политики"],
    runtime: ["артефакт", "проверочный запуск", "точная ошибка"],
    logistics: ["маршрут", "поставщик", "объект", "связанная заявка"],
    office: ["документ", "владелец", "срок"],
  };
  return unique([...base, ...requiredByDomain[domain]]).slice(0, 5);
}

function nextStepFor(params: {
  pack: AiScreenMagicPack;
  button: AiScreenMagicButton;
  domain: GroundingDomain;
  hasHydratedEvidence: boolean;
}): string {
  if (!params.hasHydratedEvidence) {
    if (params.domain === "field") return "выберите работу или объект, затем повторите проверку";
    if (params.domain === "documents") return "откройте конкретный документ или привяжите ПДФ к объекту";
    if (params.domain === "procurement") return "откройте заявку на материал или добавьте причину блокировки материалом";
    if (params.domain === "finance") return "откройте платеж или документ-основание";
    if (params.domain === "warehouse" || params.domain === "logistics") return "выберите складскую позицию, приход, выдачу или связанную заявку";
  }
  if (params.button.actionKind === "approval_required") return "отправить только на человеческое согласование после проверки источников";
  if (params.button.actionKind === "draft_only") return "проверить черновик и приложить недостающие источники перед отправкой";
  return params.pack.safeActions[0] ?? "открыть детали и проверить источники";
}

function factsForPack(params: {
  pack: AiScreenMagicPack;
  button: AiScreenMagicButton;
  domain: GroundingDomain;
  pdfHits: readonly PdfGroundingHit[];
  hasHydratedEvidence: boolean;
}): AiGroundedFact[] {
  const refs = extractEvidenceRefs(params.pack);
  const facts: AiGroundedFact[] = [];
  facts.push({
    textRu: `Проверен экран «${userScreenLabel(params.pack)}» для действия «${params.button.label}».`,
    sourceType: "screen_context",
    sourceId: sourceIdForScreen(params.pack.screenId),
    sourceLabelRu: `Экран: ${userScreenLabel(params.pack)}`,
    confidence: "high",
  });

  if (params.hasHydratedEvidence) {
    for (const ref of refs.slice(0, 2)) {
      facts.push({
        textRu: `Найдено основание: ${sourceLabelForRef(ref)}.`,
        sourceType: sourceTypeForDomain(params.domain),
        sourceId: ref,
        sourceLabelRu: sourceLabelForRef(ref),
        confidence: "medium",
      });
    }
  }

  for (const hit of params.pdfHits.slice(0, 1)) {
    facts.push({
      textRu: `Документный источник доступен: ${hit.fileName}${hit.page ? `, стр. ${hit.page}` : ""}.`,
      sourceType: "pdf_chunk",
      sourceId: hit.documentId,
      sourceLabelRu: `ПДФ: ${hit.fileName}${hit.page ? `, стр. ${hit.page}` : ""}`,
      page: hit.page,
      confidence: "medium",
    });
  }

  return facts.slice(0, 4);
}

function answerKindFor(button: AiScreenMagicButton, hasHydratedEvidence: boolean): AiGroundedAnswerKind {
  if (!hasHydratedEvidence && button.actionKind === "safe_read") return "exact_no_data_reason";
  if (button.actionKind === "approval_required") return "grounded_approval_route";
  if (button.actionKind === "draft_only") return "grounded_draft";
  if (button.actionKind === "exact_blocker" || button.actionKind === "forbidden") return "exact_no_data_reason";
  return "grounded_read_result";
}

export function aiPdfAggregatorSearchProvider(pack: AiScreenMagicPack): PdfGroundingHit[] {
  return documentSourcesForPack(pack);
}

export function aiDocumentGroundingProvider(pack: AiScreenMagicPack): PdfGroundingHit[] {
  return documentSourcesForPack(pack);
}

function mappingAnswerKindFor(button: AiScreenMagicButton, hasHydratedEvidence: boolean): AiActionQuestionMapping["answerKind"] {
  if (button.actionKind === "approval_required") return "grounded_approval_route";
  if (button.actionKind === "draft_only") return "grounded_draft";
  if (!hasHydratedEvidence) return "grounded_read_result";
  return "grounded_read_result";
}

function requiredContextForDomain(domain: GroundingDomain, needsDocumentGrounding: boolean): AiActionQuestionMapping["requiredContext"] {
  const base: AiActionQuestionMapping["requiredContext"] = [];
  if (domain === "field") base.push("work", "object");
  if (domain === "procurement") base.push("material_request", "supplier_offer");
  if (domain === "finance") base.push("payment", "approval");
  if (domain === "warehouse" || domain === "logistics") base.push("stock");
  if (domain === "approval") base.push("approval");
  if (domain === "chat") base.push("chat");
  if (needsDocumentGrounding) base.push("document", "pdf");
  return [...new Set(base)];
}

function allowedSourceTypesForDomain(domain: GroundingDomain, needsDocumentGrounding: boolean): AiGroundedSourceType[] {
  const sources: AiGroundedSourceType[] = ["screen_context"];
  if (domain === "field") sources.push("work", "object", "photo", "act", "document");
  if (domain === "procurement") sources.push("procurement_request", "supplier_offer", "warehouse_stock");
  if (domain === "finance") sources.push("payment", "approval", "document");
  if (domain === "warehouse") sources.push("warehouse_stock", "warehouse_incoming", "warehouse_issue", "procurement_request");
  if (domain === "approval") sources.push("approval", "document");
  if (domain === "chat") sources.push("chat_message", "approval");
  if (domain === "documents") sources.push("document", "report", "act");
  if (domain === "security" || domain === "runtime" || domain === "office" || domain === "control") sources.push("database_record", "approval", "document");
  if (needsDocumentGrounding) sources.push("pdf_chunk", "document");
  return [...new Set(sources)];
}

function concreteQuestionFor(params: {
  pack: AiScreenMagicPack;
  button: AiScreenMagicButton;
  domain: GroundingDomain;
}): string {
  const label = params.button.label;
  if (params.domain === "field" && /чек|checklist/i.test(label)) {
    return "Что нужно проверить по текущей работе на основании работы, доказательств и связанных ПДФ или документов?";
  }
  if (params.domain === "field") {
    return `Что по текущей работе, объекту и доказательствам нужно показать для действия «${label}»?`;
  }
  if (params.domain === "procurement") {
    return `Какая заявка на материал, поставщик и основание нужны для действия «${label}»?`;
  }
  if (params.domain === "finance") {
    return `Какой платеж, документ и маршрут согласования подтверждают действие «${label}»?`;
  }
  if (params.domain === "warehouse" || params.domain === "logistics") {
    return `Какая складская позиция, остаток, приход или выдача подтверждает действие «${label}»?`;
  }
  if (params.domain === "documents") {
    return `Что в документе или ПДФ подтверждает действие «${label}»?`;
  }
  if (params.domain === "chat") {
    return `Какие сообщения и задачи из обсуждения подтверждают действие «${label}»?`;
  }
  return `Какие источники на экране подтверждают действие «${label}»?`;
}

export function buildAiActionQuestionMapping(params: {
  pack: AiScreenMagicPack;
  button: AiScreenMagicButton;
}): AiActionQuestionMapping {
  const domain = detectDomain(params.pack, params.button);
  const needsDocumentGrounding = actionRequiresDocumentGrounding(params.pack, params.button);
  return {
    screenId: params.pack.screenId,
    actionId: params.button.id,
    labelRu: params.button.label,
    concreteQuestionRu: concreteQuestionFor({ pack: params.pack, button: params.button, domain }),
    requiredContext: requiredContextForDomain(domain, needsDocumentGrounding),
    allowedSourceTypes: allowedSourceTypesForDomain(domain, needsDocumentGrounding),
    answerKind: mappingAnswerKindFor(params.button, hasHydratedBusinessEvidence(params.pack)),
    hideIfContextMissing: false,
  };
}

export function buildAiGroundedAnswer(params: {
  pack: AiScreenMagicPack;
  button: AiScreenMagicButton;
  userQuestion?: string;
  forcedKind?: AiGroundedAnswerKind;
}): AiGroundedAnswer {
  const domain = detectDomain(params.pack, params.button);
  const providerTrace = new Set([providerForDomain(domain)]);
  const needsDocumentGrounding = actionRequiresDocumentGrounding(params.pack, params.button);
  const pdfHits = needsDocumentGrounding
    ? aiPdfAggregatorSearchProvider(params.pack)
    : [];
  if (pdfHits.length > 0 || needsDocumentGrounding) {
    providerTrace.add("aiPdfAggregatorSearchProvider");
    providerTrace.add("aiDocumentGroundingProvider");
  }

  const hasHydratedEvidence = hasHydratedBusinessEvidence(params.pack);
  const answerKind = params.forcedKind ?? answerKindFor(params.button, hasHydratedEvidence);
  const facts = factsForPack({
    pack: params.pack,
    button: params.button,
    domain,
    pdfHits,
    hasHydratedEvidence,
  });
  const exactNoDataReason = hasHydratedEvidence
    ? undefined
    : exactMissingContextReason(params.pack, domain);

  return {
    screenId: params.pack.screenId,
    actionId: params.button.id,
    actionLabelRu: params.button.label,
    userQuestion: params.userQuestion ?? buildAiActionQuestionMapping({
      pack: params.pack,
      button: params.button,
    }).concreteQuestionRu,
    questionRu: params.userQuestion ?? buildAiActionQuestionMapping({
      pack: params.pack,
      button: params.button,
    }).concreteQuestionRu,
    answerKind,
    shortAnswerRu: exactNoDataReason
      ? "Нужен конкретный источник, поэтому точный ответ пока невозможен."
      : `Найдены источники для действия «${params.button.label}».`,
    facts,
    missingData: missingDataForDomain(params.pack, domain),
    nextStepRu: nextStepFor({
      pack: params.pack,
      button: params.button,
      domain,
      hasHydratedEvidence,
    }),
    changedData: false,
    finalSubmit: false,
    autoApproval: false,
    exactNoDataReason,
    exactNoDataReasonRu: exactNoDataReason,
    providerTrace: [...providerTrace],
  };
}

function isAmbiguousQuestion(value: string): boolean {
  const text = normalize(value);
  return /^(что делать|что дальше|помоги|расскажи|ну и что|что по этому|что тут)$/i.test(text) ||
    text.length < 8;
}

function actionKindFromText(value: string): AiScreenMagicActionKind {
  const text = normalize(value);
  if (/чернов|напиши|подготов|сделай|собери|draft/i.test(text)) return "draft_only";
  if (/соглас|approval|отправ/i.test(text)) return "approval_required";
  return "safe_read";
}

function pseudoButtonForQuestion(pack: AiScreenMagicPack, userText: string): AiScreenMagicButton {
  const actionKind = actionKindFromText(userText);
  return {
    id: `${pack.screenId}.free_text.grounded_question`,
    label: clean(userText),
    actionKind,
    resultType: actionKind,
    expectedResult: actionKind === "draft_only"
      ? "creates_safe_draft"
      : actionKind === "approval_required"
        ? "routes_to_approval_ledger"
        : "opens_read_result",
    canExecuteDirectly: false,
  };
}

export function buildAiGroundedFreeTextAnswer(params: {
  pack: AiScreenMagicPack;
  userText: string;
  routeParams?: Record<string, string | number | boolean | null | undefined>;
}): AiGroundedAnswer {
  const question = clean(params.userText);
  const button = pseudoButtonForQuestion(params.pack, question);
  if (isAmbiguousQuestion(question)) {
    return {
      screenId: params.pack.screenId,
      actionId: button.id,
      actionLabelRu: question,
      userQuestion: question,
      questionRu: question,
      answerKind: "clarifying_question",
      shortAnswerRu: "Вопрос слишком общий, нужен объект проверки.",
      facts: [{
        textRu: `Вопрос задан на экране «${userScreenLabel(params.pack)}», но без выбранной записи.`,
        sourceType: "screen_context",
        sourceId: sourceIdForScreen(params.pack.screenId),
        sourceLabelRu: `Экран: ${userScreenLabel(params.pack)}`,
        confidence: "high",
      }],
      missingData: ["выбранная работа, документ, заявка, платеж или запись"],
      nextStepRu: "уточните, какую работу, документ, заявку или платеж нужно проверить",
      changedData: false,
      finalSubmit: false,
      autoApproval: false,
      clarifyingQuestionRu: "Уточните, что именно проверить: работу, документ, заявку, платеж, складскую позицию или согласование?",
      providerTrace: ["aiScreenContextGroundingProvider"],
    };
  }
  return buildAiGroundedAnswer({
    pack: params.pack,
    button,
    userQuestion: question,
  });
}

function statusLine(answer: AiGroundedAnswer, kind: AiScreenMagicActionKind): string {
  if (kind === "draft_only") return "черновик подготовлен. Финальная отправка не выполнена";
  if (kind === "approval_required") return "ожидает действия человека. Автоматическое согласование не выполнялось";
  return "данные не изменены";
}

function titleFor(kind: AiScreenMagicActionKind): string {
  if (kind === "draft_only") return "Черновик подготовлен";
  if (kind === "approval_required") return "Маршрут согласования";
  if (kind === "forbidden") return "Недоступно";
  if (kind === "exact_blocker") return "Не удалось выполнить действие";
  return "Результат";
}

function titleForAnswer(answer: AiGroundedAnswer, kind: AiScreenMagicActionKind): string {
  if (answer.answerKind === "clarifying_question") return "Уточните вопрос";
  if (answer.answerKind === "exact_no_data_reason") return kind === "safe_read" ? "Результат" : "Не удалось ответить точно";
  if (kind === "draft_only") return "Черновик подготовлен";
  if (kind === "approval_required") return "Маршрут согласования";
  return "Ответ";
}

export function formatAiGroundedAnswer(params: {
  answer: AiGroundedAnswer;
  actionKind: AiScreenMagicActionKind;
}): string {
  const facts = params.answer.facts.length > 0
    ? params.answer.facts.map((fact) => `- ${fact.textRu}`).join("\n")
    : "- подтвержденные факты не найдены";
  const sources = params.answer.facts.length > 0
    ? params.answer.facts.map((fact) => `- ${fact.sourceLabelRu}`).join("\n")
    : "- источник не найден";
  const missing = params.answer.missingData.length > 0
    ? params.answer.missingData.map((item) => `- ${item}`).join("\n")
    : "- нет подтвержденных недостающих данных";
  const reason = params.answer.exactNoDataReason
    ? ["", "Точная причина:", `- ${params.answer.exactNoDataReason}`]
    : [];
  const clarify = params.answer.clarifyingQuestionRu
    ? ["", "Уточняющий вопрос:", params.answer.clarifyingQuestionRu]
    : [];

  return clean([
    titleForAnswer(params.answer, params.actionKind) || titleFor(params.actionKind),
    "",
    "Коротко:",
    params.answer.shortAnswerRu,
    "",
    `Действие: ${params.answer.actionLabelRu}`,
    ...reason,
    ...clarify,
    "",
    "Что найдено:",
    facts,
    "",
    "Источники:",
    sources,
    "",
    "Чего не хватает:",
    missing,
    "",
    "Следующий шаг:",
    params.answer.nextStepRu,
    "",
    `Статус: ${statusLine(params.answer, params.actionKind)}.`,
  ].join("\n"));
}

export function aiGroundedAnswerHasGenericCopy(value: string): boolean {
  return GENERIC_RESULT_PATTERNS.some((pattern) => pattern.test(value));
}

export function aiGroundedAnswerIsSpecific(answer: AiGroundedAnswer): boolean {
  return answer.facts.length > 0 ||
    Boolean(answer.exactNoDataReason && answer.exactNoDataReason.length >= 30) ||
    Boolean(answer.clarifyingQuestionRu && answer.clarifyingQuestionRu.length >= 30);
}
