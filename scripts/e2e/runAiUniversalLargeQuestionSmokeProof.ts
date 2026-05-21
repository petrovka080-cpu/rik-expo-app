import fs from "node:fs";
import path from "node:path";

import {
  answerLiveAiForContext,
  type ExternalMarketplaceSearchResult,
  type ExternalWebSearchResult,
  type LiveAiContextId,
  type LiveAiQueryIntent,
  type LiveAiQueryIntentSources,
} from "../../src/lib/ai/liveUi";

const PREFIX = "S_AI_UNIVERSAL_50_SCREEN_70_WEB_SMOKE";
const artifactsDir = path.join(process.cwd(), "artifacts");

type SmokeCase = {
  id: string;
  group: "screen" | "internet";
  context: LiveAiContextId;
  questionRu: string;
  expectedIntents?: LiveAiQueryIntent[];
  requiredSignals?: string[];
  forbiddenSignals?: string[];
  webResultId?: string;
  useMarketplace?: boolean;
};

type WebTopic = {
  id: string;
  phraseRu: string;
  quantityRu: string;
  requiredSignals: string[];
  webResultId: string;
  repeats: number;
  forbiddenSignals?: string[];
};

const bannedUserCopy = [
  "Нужен конкретный источник",
  "нет выбранной работы",
  "нет выбранной заявки",
  "нет выбранного платежа",
  "нет выбранной складской позиции",
  "нет выбранного обсуждения",
  "Проверен экран",
  "generic fallback",
];

const webResultsById: Record<string, ExternalWebSearchResult> = {
  asphalt: {
    id: "asphalt",
    title: "Технология укладки асфальта: подготовка, выравнивание и уплотнение",
    snippetRu: "Укладка асфальта включает подготовку нижележащего слоя, выравнивание, обработку основания и уплотнение смеси катками.",
    url: "https://nflg.ru/stati/post/tehnologii-ukladki-asfalta",
    sourceDomain: "nflg.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
  paving: {
    id: "paving",
    title: "Брусчатка: справочное описание покрытия",
    snippetRu: "Брусчатку укладывают по подготовленному основанию с подсыпкой, подрезкой, заполнением швов и уплотнением.",
    url: "https://ru.wikipedia.org/wiki/%D0%91%D1%80%D1%83%D1%81%D1%87%D0%B0%D1%82%D0%BA%D0%B0",
    sourceDomain: "ru.wikipedia.org",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "low",
  },
  concrete: {
    id: "concrete",
    title: "Этапы выполнения монолитных работ",
    snippetRu: "Монолитные работы включают армирование, установку опалубки, бетонирование, демонтаж опалубки и уход за бетоном.",
    url: "https://bhng.ru/clauses/stati-o-proektirovanii/etapy-vypolneniya-monolitnykh-rabot/",
    sourceDomain: "bhng.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
  concreteCare: {
    id: "concreteCare",
    title: "Бетонирование, заливка бетона, монолитные работы",
    snippetRu: "После заливки бетон уплотняют, выравнивают и обеспечивают условия созревания; вертикальные конструкции бетонируют послойно с вибрированием.",
    url: "https://www.avtobeton.ru/statyi_o_stroitelstve/betonirovanie.html",
    sourceDomain: "avtobeton.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
  openingsWindows: {
    id: "openingsWindows",
    title: "Монтаж окон: отлив, подоконник и герметизация",
    snippetRu: "При монтаже окна учитывают подставочный профиль, отлив, подоконник, герметизацию и отделку откосов.",
    url: "https://www.ivd.ru/stroitelstvo-i-remont/okna/montazh-okon-v-kvartire-na-chto-obratit-vnimanie-i-kak-izbezhat-oshibok-25071",
    sourceDomain: "ivd.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
  openingsDoors: {
    id: "openingsDoors",
    title: "Что входит в установку дверей: полный перечень работ",
    snippetRu: "Установка дверей включает сборку и монтаж коробки, навешивание полотна, петли, замок/защёлку и проверку работы двери.",
    url: "https://dveri-max.ru/stati/29-chto-vkhodit-v-ustanovku-dverej-polnyj-perechen-rabot-2",
    sourceDomain: "dveri-max.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
  gkl: {
    id: "gkl",
    title: "КНАУФ ГКЛ 12.5 мм 2500x1200 мм",
    snippetRu: "Карточка строительного материала ГКЛ 12.5 мм с описанием товара и условиями доставки у поставщика.",
    url: "https://www.baza5.ru/knauf-gkl-125-mm-25001200-mm-gipsokarton-12-mm",
    sourceDomain: "baza5.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
  genericBuild: {
    id: "genericBuild",
    title: "Процессы бетонных и железобетонных работ",
    snippetRu: "Строительные работы требуют подготовки, материалов, технологических операций, контроля качества и безопасного выполнения.",
    url: "https://www.sbh.ru/articles/art2_1.htm",
    sourceDomain: "sbh.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "low",
  },
};

const marketplaceResults: ExternalMarketplaceSearchResult[] = [
  {
    id: "ext-market-gkl-1",
    titleRu: "Внешний marketplace: ГКЛ 12.5 мм, поставщик с доставкой",
    url: "https://www.baza5.ru/knauf-gkl-125-mm-25001200-mm-gipsokarton-12-mm",
    sourceDomain: "baza5.ru",
    checkedAt: "2026-05-20T00:00:00.000Z",
    confidence: "medium",
  },
];

const procurementRequests = [
  {
    id: "MR-101",
    createdAt: "2026-05-03",
    objectRu: "Дом 1",
    zoneRu: "Секция А",
    floorRu: "1 этаж",
    itemRu: "ГКЛ 12.5 мм",
    statusRu: "approved",
    nextStepRu: "подобрать поставщиков",
    sourceRefs: ["src:request:MR-101", "src:object:house-1-floor-1"],
  },
  {
    id: "MR-108",
    createdAt: "2026-05-14",
    objectRu: "Дом 1",
    zoneRu: "Секция Б",
    floorRu: "1 этаж",
    itemRu: "Профиль стоечный",
    statusRu: "pending",
    nextStepRu: "дождаться согласования",
    sourceRefs: ["src:request:MR-108", "src:object:house-1-floor-1"],
  },
  {
    id: "MR-205",
    createdAt: "2026-04-22",
    objectRu: "Дом 2",
    zoneRu: "Секция В",
    floorRu: "2 этаж",
    itemRu: "Краска интерьерная",
    statusRu: "closed",
    nextStepRu: "данные не изменены",
    sourceRefs: ["src:request:MR-205", "src:object:house-2-floor-2"],
  },
];

const screenCases: SmokeCase[] = [
  ["screen-buyer-count-may", "buyer", "сколько заявок было за месяц май", ["app_data_count"]],
  ["screen-buyer-count-april", "buyer", "сколько заявок было за апрель", ["app_data_count"]],
  ["screen-foreman-first-floor-requests", "foreman", "выдай заявки все по первому этажу", ["procurement_request_search", "app_data_list"]],
  ["screen-buyer-first-floor-requests", "buyer", "покажи заявки по первому этажу", ["procurement_request_search", "app_data_list"]],
  ["screen-warehouse-deficits", "warehouse", "какие материалы в дефиците", ["warehouse_query"]],
  ["screen-warehouse-stock", "warehouse", "что сейчас по складу", ["warehouse_query", "role_summary_query"]],
  ["screen-warehouse-issue", "warehouse", "что можно выдать со склада", ["warehouse_query"]],
  ["screen-director-today", "director", "что мне решить сегодня", ["role_summary_query"]],
  ["screen-director-finance", "director", "что мешает оплате", ["finance_query"]],
  ["screen-director-procurement", "director", "какие закупки зависли", ["role_summary_query"]],
  ["screen-foreman-today", "foreman", "что сделали сегодня", ["role_summary_query"]],
  ["screen-foreman-photos", "foreman", "каких фото не хватает", ["document_pdf_query"]],
  ["screen-foreman-report", "foreman", "подготовь отчёт за сегодня", ["document_pdf_query", "draft_action_request"]],
  ["screen-contractor-acceptance", "contractor", "что мешает приёмке", ["role_summary_query"]],
  ["screen-contractor-docs", "contractor", "каких моих документов не хватает", ["document_pdf_query"]],
  ["screen-accountant-docs", "accountant", "каких документов не хватает для оплаты", ["finance_query", "document_pdf_query"]],
  ["screen-accountant-critical", "accountant", "проверь критические платежи", ["finance_query"]],
  ["screen-accountant-invoice-count", "accountant", "сколько счетов для оплаты есть у меня", ["app_data_count"]],
  ["screen-office-stuck", "office", "что застряло сегодня", ["role_summary_query"]],
  ["screen-office-reminders", "office", "кому напомнить", ["role_summary_query"]],
  ["screen-office-documents", "office", "какие документы в очереди", ["document_pdf_query", "role_summary_query"]],
  ["screen-documents-pdf", "documents", "что в этом документе", ["document_pdf_query"]],
  ["screen-documents-missing", "documents", "каких документов не хватает", ["document_pdf_query"]],
  ["screen-reports-daily", "reports", "подготовь дневной отчёт", ["document_pdf_query", "draft_action_request"]],
  ["screen-chat-summary", "chat", "собери выводы из чата", ["role_summary_query"]],
  ["screen-market-intake", "market", "какие предложения marketplace есть", ["marketplace_product_request", "role_summary_query"]],
  ["screen-supplier-showcase", "supplier", "что показать по поставщику", ["marketplace_product_request", "role_summary_query"]],
  ["screen-admin-org", "admin", "какие роли и доступы проверить", ["role_summary_query"]],
  ["screen-security-summary", "security", "дай безопасную сводку безопасности", ["role_summary_query"]],
  ["screen-runtime-health", "runtime", "покажи runtime health без секретов", ["role_summary_query"]],
  ["screen-client-progress", "client", "какой прогресс видит клиент", ["role_summary_query"]],
  ["screen-client-evidence", "client", "каких фото не хватает клиенту", ["document_pdf_query", "role_summary_query"]],
  ["screen-buyer-approved", "buyer", "какие заявки утверждены", ["app_data_list", "role_summary_query"]],
  ["screen-buyer-pending", "buyer", "какие заявки ждут согласования", ["app_data_list", "role_summary_query"]],
  ["screen-warehouse-incoming", "warehouse", "что по приходам на склад", ["warehouse_query"]],
  ["screen-warehouse-reserve", "warehouse", "что зарезервировано", ["warehouse_query"]],
  ["screen-director-approvals", "director", "какие approvals ждут", ["role_summary_query"]],
  ["screen-director-warehouse", "director", "какие складские риски сегодня", ["warehouse_query"]],
  ["screen-foreman-materials", "foreman", "какие материалы блокируют работы", ["marketplace_product_request", "warehouse_query"]],
  ["screen-foreman-acts", "foreman", "какие акты не готовы", ["document_pdf_query"]],
  ["screen-accountant-cashflow", "accountant", "что по cashflow", ["finance_query"]],
  ["screen-office-deadlines", "office", "какие дедлайны просрочены", ["role_summary_query"]],
  ["screen-office-packages", "office", "какие approval packages неполные", ["role_summary_query"]],
  ["screen-documents-unlinked", "documents", "какие PDF не связаны", ["document_pdf_query"]],
  ["screen-reports-evidence", "reports", "каких evidence не хватает в отчётах", ["document_pdf_query"]],
  ["screen-chat-task", "chat", "вытащи задачи из чата", ["role_summary_query"]],
  ["screen-market-gkl", "market", "найди варианты ГКЛ", ["marketplace_product_request"]],
  ["screen-supplier-documents", "supplier", "каких документов поставщика не хватает", ["marketplace_product_request", "document_pdf_query", "role_summary_query"]],
  ["screen-admin-users", "admin", "каких пользователей проверить", ["role_summary_query"]],
  ["screen-security-events", "security", "какие security events показать безопасно", ["role_summary_query"]],
].map(([id, context, questionRu, expectedIntents]) => ({
  id: id as string,
  group: "screen" as const,
  context: context as LiveAiContextId,
  questionRu: questionRu as string,
  expectedIntents: expectedIntents as LiveAiQueryIntent[],
  forbiddenSignals: bannedUserCopy,
}));

const webTopics: WebTopic[] = [
  { id: "asphalt", phraseRu: "укладку асфальта", quantityRu: "100 м2", requiredSignals: ["асфальт", "смета"], webResultId: "asphalt", repeats: 3 },
  { id: "paving", phraseRu: "укладку брусчатки", quantityRu: "80 м2", requiredSignals: ["брусчат", "смета"], webResultId: "paving", repeats: 3 },
  { id: "screed", phraseRu: "бетонную стяжку", quantityRu: "50 м2", requiredSignals: ["стяж", "смета"], webResultId: "concreteCare", repeats: 3 },
  { id: "monolith", phraseRu: "заливку монолита", quantityRu: "1200 кв метров", requiredSignals: ["монолит", "1200", "смета"], webResultId: "concrete", repeats: 3, forbiddenSignals: ["ГКЛ", "PAY-GKL"] },
  { id: "foundation", phraseRu: "бетонный фундамент", quantityRu: "120 м2", requiredSignals: ["фундамент", "смета"], webResultId: "concrete", repeats: 3 },
  { id: "masonry", phraseRu: "кладку кирпича", quantityRu: "200 м2", requiredSignals: ["клад", "смета"], webResultId: "genericBuild", repeats: 3 },
  { id: "drywall", phraseRu: "перегородки ГКЛ", quantityRu: "60 м2", requiredSignals: ["ГКЛ", "смета"], webResultId: "gkl", repeats: 3 },
  { id: "plaster", phraseRu: "штукатурку стен", quantityRu: "300 м2", requiredSignals: ["штукатур", "смета"], webResultId: "genericBuild", repeats: 3 },
  { id: "painting", phraseRu: "покраску стен", quantityRu: "300 м2", requiredSignals: ["покраск", "смета"], webResultId: "genericBuild", repeats: 3 },
  { id: "flooring", phraseRu: "укладку ламината", quantityRu: "90 м2", requiredSignals: ["ламинат", "смета"], webResultId: "genericBuild", repeats: 3 },
  { id: "roofing", phraseRu: "кровлю", quantityRu: "150 м2", requiredSignals: ["кров", "смета"], webResultId: "genericBuild", repeats: 3 },
  { id: "facade", phraseRu: "фасадные работы", quantityRu: "200 м2", requiredSignals: ["фасад", "смета"], webResultId: "genericBuild", repeats: 3 },
  { id: "windows", phraseRu: "установку окон", quantityRu: "10 штук", requiredSignals: ["окн", "смета"], webResultId: "openingsWindows", repeats: 3, forbiddenSignals: ["PAY-GKL"] },
  { id: "doors", phraseRu: "монтаж дверей", quantityRu: "8 штук", requiredSignals: ["двер", "смета"], webResultId: "openingsDoors", repeats: 3, forbiddenSignals: ["PAY-GKL"] },
  { id: "electrical", phraseRu: "электрику", quantityRu: "40 точек", requiredSignals: ["электр", "смета"], webResultId: "genericBuild", repeats: 3 },
  { id: "plumbing", phraseRu: "сантехнику", quantityRu: "в санузле", requiredSignals: ["сантех", "смета"], webResultId: "genericBuild", repeats: 3 },
  { id: "heating", phraseRu: "отопление", quantityRu: "120 м2", requiredSignals: ["отоплен", "смета"], webResultId: "genericBuild", repeats: 3 },
  { id: "ventilation", phraseRu: "вентиляцию", quantityRu: "офиса", requiredSignals: ["вентиляц", "смета"], webResultId: "genericBuild", repeats: 3 },
  { id: "fire", phraseRu: "пожарную сигнализацию", quantityRu: "офиса", requiredSignals: ["пожар", "смета"], webResultId: "genericBuild", repeats: 2 },
  { id: "lowvoltage", phraseRu: "слаботочку и СКС", quantityRu: "офиса", requiredSignals: ["слаботоч", "смета"], webResultId: "genericBuild", repeats: 2 },
  { id: "earthworks", phraseRu: "земляные работы котлован", quantityRu: "300 м2", requiredSignals: ["землян", "смета"], webResultId: "genericBuild", repeats: 2 },
  { id: "roadworks", phraseRu: "дорожное покрытие", quantityRu: "400 м2", requiredSignals: ["дорож", "смета"], webResultId: "asphalt", repeats: 2 },
  { id: "landscaping", phraseRu: "благоустройство газона", quantityRu: "500 м2", requiredSignals: ["благоустрой", "смета"], webResultId: "genericBuild", repeats: 2 },
  { id: "metal", phraseRu: "металлоконструкции навеса", quantityRu: "", requiredSignals: ["металлоконструк", "смета"], webResultId: "genericBuild", repeats: 2 },
  { id: "waterproofing", phraseRu: "гидроизоляцию фундамента", quantityRu: "120 м2", requiredSignals: ["гидроизоляц", "смета"], webResultId: "genericBuild", repeats: 2 },
  { id: "insulation", phraseRu: "утепление минватой", quantityRu: "200 м2", requiredSignals: ["утеплен", "смета"], webResultId: "genericBuild", repeats: 2 },
];

const webQuestionTemplates = [
  (topic: WebTopic) => `дай смету на ${topic.phraseRu} ${topic.quantityRu}`.trim(),
  (topic: WebTopic) => `посчитай стоимость на ${topic.phraseRu} ${topic.quantityRu}`.trim(),
  (topic: WebTopic) => `что нужно для ${topic.phraseRu} ${topic.quantityRu} и дай смету`.trim(),
];

const internetCases: SmokeCase[] = webTopics.flatMap((topic) =>
  Array.from({ length: topic.repeats }, (_, index) => ({
    id: `internet-${topic.id}-${index + 1}`,
    group: "internet" as const,
    context: (index % 3 === 0 ? "foreman" : index % 3 === 1 ? "director" : "buyer") as LiveAiContextId,
    questionRu: topic.id === "flooring" && index === 0
      ? "дай сметуц на укладку ламинат на площади 100 кв м"
      : webQuestionTemplates[index % webQuestionTemplates.length](topic),
    expectedIntents: ["construction_estimate_request"] as LiveAiQueryIntent[],
    requiredSignals: [...topic.requiredSignals, "Интернет: использован", "Источник ответа", "Следующий шаг", "Статус"],
    forbiddenSignals: [...bannedUserCopy, ...(topic.forbiddenSignals ?? [])],
    webResultId: topic.webResultId,
    useMarketplace: topic.id === "drywall",
  })),
);

if (screenCases.length !== 50) {
  throw new Error(`Expected 50 screen questions, got ${screenCases.length}`);
}
if (internetCases.length !== 70) {
  throw new Error(`Expected 70 internet questions, got ${internetCases.length}`);
}

function normalizeForCheck(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е");
}

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sourcesForCase(item: SmokeCase): LiveAiQueryIntentSources {
  return {
    procurementRequests,
    externalWeb: item.webResultId
      ? {
          enabled: true,
          results: [webResultsById[item.webResultId]],
        }
      : undefined,
    externalMarketplace: item.useMarketplace
      ? {
          enabled: true,
          results: marketplaceResults,
        }
      : undefined,
  };
}

const cases = [...screenCases, ...internetCases];
const transcripts = cases.map((item) => {
  const answer = answerLiveAiForContext({
    context: item.context,
    userText: item.questionRu,
    intentSources: sourcesForCase(item),
  });
  const text = normalizeForCheck(answer.answerTextRu);
  const publicWebFacts = answer.sourceProvenance.filter((source) =>
    source.origin === "public_web" && source.canBePresentedAsFact,
  );
  const requiredMissing = (item.requiredSignals ?? ["Источник ответа", "Следующий шаг", "Статус"])
    .filter((signal) => !text.includes(normalizeForCheck(signal)));
  const forbiddenPresent = (item.forbiddenSignals ?? bannedUserCopy)
    .filter((signal) => text.includes(normalizeForCheck(signal)));
  const blockers = [
    ...(item.expectedIntents?.includes(answer.queryIntent) ?? true ? [] : [`intent mismatch: ${answer.queryIntent}`]),
    ...(requiredMissing.length ? [`missing signals: ${requiredMissing.join(", ")}`] : []),
    ...(forbiddenPresent.length ? [`forbidden signals: ${forbiddenPresent.join(", ")}`] : []),
    ...(answer.sourceProvenanceBlockers.length ? answer.sourceProvenanceBlockers : []),
    ...(answer.answerTextRu.includes("Источник ответа:") ? [] : ["source disclosure missing"]),
    ...(answer.answerTextRu.includes("Следующий шаг:") ? [] : ["next step missing"]),
    ...(answer.answerTextRu.includes("Статус:") ? [] : ["status missing"]),
    ...(item.group === "screen" && publicWebFacts.length > 0 ? ["screen/app question used public web fact"] : []),
    ...(item.group === "internet" && publicWebFacts.length === 0 ? ["internet question did not use public web fact"] : []),
    ...(publicWebFacts.some((source) => !source.sourceUrl || !source.checkedAt) ? ["public web source missing URL/date"] : []),
    ...(answer.dangerousMutationsFound > 0 ? ["dangerous mutation found"] : []),
    ...(answer.approvalBypassFound > 0 ? ["approval bypass found"] : []),
    ...(answer.genericAnswerUsed ? ["generic answer used"] : []),
  ];

  return {
    id: item.id,
    group: item.group,
    route: `/ai?context=${item.context}`,
    questionRu: item.questionRu,
    queryIntent: answer.queryIntent,
    explicitUserIntentUsed: answer.explicitUserIntentUsed,
    publicWebFacts: publicWebFacts.map((source) => ({
      labelRu: source.sourceLabelRu,
      url: source.sourceUrl,
      checkedAt: source.checkedAt,
    })),
    sourceOrigins: answer.sourceProvenance.map((source) => source.origin),
    shortRu: answer.shortRu,
    nextStepRu: answer.nextStepRu,
    status: answer.status,
    providerTrace: answer.providerTrace,
    sourceTrace: answer.sourceTrace,
    requiredMissing,
    forbiddenPresent,
    blockers,
    answerTextRu: answer.answerTextRu,
  };
});

const blockers = transcripts.flatMap((item) => item.blockers.map((blocker) => `${item.id}: ${blocker}`));
const passed = blockers.length === 0;
const summary = {
  wave: "S_AI_UNIVERSAL_50_SCREEN_70_WEB_SMOKE_PROOF",
  final_status: passed
    ? "GREEN_AI_UNIVERSAL_50_SCREEN_70_WEB_SMOKE_READY"
    : "BLOCKED_AI_UNIVERSAL_50_SCREEN_70_WEB_SMOKE",
  questions_total: transcripts.length,
  screen_questions: transcripts.filter((item) => item.group === "screen").length,
  internet_questions: transcripts.filter((item) => item.group === "internet").length,
  screen_questions_used_public_web_fact: transcripts.filter((item) => item.group === "screen" && item.publicWebFacts.length > 0).length,
  internet_questions_used_public_web_fact: transcripts.filter((item) => item.group === "internet" && item.publicWebFacts.length > 0).length,
  generic_answers_found: transcripts.filter((item) => item.answerTextRu.toLowerCase().includes("generic fallback")).length,
  dangerous_mutations_found: transcripts.filter((item) => item.blockers.some((blocker) => blocker.includes("dangerous mutation"))).length,
  blockers,
  fake_green_claimed: false,
};

writeJson(`artifacts/${PREFIX}_transcripts.json`, transcripts);
writeJson(`artifacts/${PREFIX}_summary.json`, summary);
fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactsDir, `${PREFIX}_proof.md`),
  [
    "# S_AI_UNIVERSAL_50_SCREEN_70_WEB_SMOKE_PROOF",
    "",
    `final_status: ${summary.final_status}`,
    `questions_total: ${summary.questions_total}`,
    `screen_questions: ${summary.screen_questions}`,
    `internet_questions: ${summary.internet_questions}`,
    `screen_questions_used_public_web_fact: ${summary.screen_questions_used_public_web_fact}`,
    `internet_questions_used_public_web_fact: ${summary.internet_questions_used_public_web_fact}`,
    `fake_green_claimed: ${summary.fake_green_claimed}`,
    "",
    "## Blockers",
    blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- none",
    "",
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify({
  summary,
  sample: transcripts.slice(0, 8).map((item) => ({
    id: item.id,
    intent: item.queryIntent,
    publicWebFacts: item.publicWebFacts.length,
    blockers: item.blockers,
    shortRu: item.shortRu,
  })),
  internetSample: transcripts.filter((item) => item.group === "internet").slice(0, 8).map((item) => ({
    id: item.id,
    intent: item.queryIntent,
    publicWebFacts: item.publicWebFacts.length,
    blockers: item.blockers,
    shortRu: item.shortRu,
  })),
}, null, 2));

if (!passed) {
  process.exitCode = 1;
}
