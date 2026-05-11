import type { AssistantContext, AssistantQuickPrompt, AssistantRole } from "./assistant.types";
import { resolveAiScreenIdForAssistantContext } from "./context/aiScreenContext";
import { buildAiKnowledgePromptBlock } from "./knowledge/aiKnowledgeResolver";
import { buildAiProfessionalResponsePolicyPrompt } from "./policy/aiProfessionalResponsePolicy";
import { normalizeAssistantRoleToAiUserRole } from "./schemas/aiRoleSchemas";

export function normalizeAssistantRole(value: string | null | undefined): AssistantRole {
  switch (String(value || "").trim().toLowerCase()) {
    case "foreman":
      return "foreman";
    case "director":
      return "director";
    case "buyer":
      return "buyer";
    case "accountant":
      return "accountant";
    case "warehouse":
      return "warehouse";
    case "contractor":
      return "contractor";
    case "security":
      return "security";
    default:
      return "unknown";
  }
}

export function normalizeAssistantContext(value: string | null | undefined): AssistantContext {
  switch (String(value || "").trim()) {
    case "foreman":
      return "foreman";
    case "director":
      return "director";
    case "buyer":
      return "buyer";
    case "accountant":
      return "accountant";
    case "warehouse":
      return "warehouse";
    case "contractor":
      return "contractor";
    case "security":
      return "security";
    case "market":
      return "market";
    case "supplierMap":
    case "suppliers-map":
      return "supplierMap";
    case "profile":
      return "profile";
    case "reports":
      return "reports";
    case "request":
    case "[id]":
      return "request";
    default:
      return "unknown";
  }
}

export function getAssistantContextLabel(context: AssistantContext): string {
  switch (context) {
    case "foreman":
      return "Прораб";
    case "director":
      return "Директор";
    case "buyer":
      return "Снабжение";
    case "accountant":
      return "Бухгалтерия";
    case "warehouse":
      return "Склад";
    case "contractor":
      return "Подрядчик";
    case "security":
      return "Безопасность";
    case "market":
      return "Маркет";
    case "supplierMap":
      return "Карта";
    case "profile":
      return "Профиль";
    case "reports":
      return "Отчеты";
    case "request":
      return "Заявка";
    default:
      return "GOX";
  }
}

export function getAssistantContextIntro(context: AssistantContext): string | null {
  switch (context) {
    case "market":
      return "Сейчас AI открыт из модуля Маркет.";
    case "supplierMap":
      return "Сейчас AI открыт из карты поставщиков и спроса.";
    case "warehouse":
      return "Сейчас AI открыт из складского контура.";
    case "buyer":
      return "Сейчас AI открыт из модуля снабжения.";
    case "director":
      return "Сейчас AI открыт из директорского контура.";
    case "profile":
      return "Сейчас AI открыт из профиля пользователя или компании.";
    case "reports":
      return "Сейчас AI открыт из модуля отчетов.";
    case "request":
      return "Сейчас AI открыт из карточки заявки.";
    case "foreman":
      return "Сейчас AI открыт из модуля прораба.";
    case "accountant":
      return "Сейчас AI открыт из бухгалтерского контура.";
    case "contractor":
      return "Сейчас AI открыт из контура подрядчика.";
    case "security":
      return "Сейчас AI открыт из модуля безопасности.";
    default:
      return null;
  }
}

export function getAssistantGreeting(
  role: AssistantRole,
  fullName?: string | null,
  context: AssistantContext = "unknown",
): string {
  const introName = String(fullName || "").trim();
  const prefix = introName ? `${introName}, ` : "";
  const contextIntro = getAssistantContextIntro(context);

  switch (role) {
    case "buyer":
      return `${prefix}я AI-ассистент снабжения. ${contextIntro ? `${contextIntro} ` : ""}Помогу с поиском поставщиков, сравнением вариантов, рынком и маршрутом закупки, но не меняю статусы и не выполняю операции за вас.`;
    case "director":
      return `${prefix}я AI-ассистент директора. ${contextIntro ? `${contextIntro} ` : ""}Помогу с навигацией по отчетам, заявкам, закупкам и складу, но не изменяю данные и не запускаю операции.`;
    case "warehouse":
      return `${prefix}я AI-ассистент склада. ${contextIntro ? `${contextIntro} ` : ""}Подскажу, где смотреть расход, приход, остатки и статусы склада, без изменения логики выдачи.`;
    case "accountant":
      return `${prefix}я AI-ассистент бухгалтерии. ${contextIntro ? `${contextIntro} ` : ""}Помогу понять, где искать оплаты, документы и финансовые маршруты, не меняя бухгалтерские данные.`;
    case "foreman":
      return `${prefix}я AI-ассистент прораба. ${contextIntro ? `${contextIntro} ` : ""}Помогу сформулировать запросы, пройти по экранам заявок и быстро найти нужный модуль.`;
    case "contractor":
      return `${prefix}я AI-ассистент подрядчика. ${contextIntro ? `${contextIntro} ` : ""}Подскажу по работам, актам и связанным материалам, без изменения данных системы.`;
    case "security":
      return `${prefix}я AI-ассистент безопасности. ${contextIntro ? `${contextIntro} ` : ""}Помогу с навигацией и пояснением модулей приложения.`;
    default:
      return `${prefix}я AI-ассистент GOX. ${contextIntro ? `${contextIntro} ` : ""}Могу помочь по маркету, карте поставщиков, заявкам, складу, отчетам и навигации по приложению, не меняя бизнес-логику и данные.`;
  }
}

export function buildAssistantSystemPrompt(
  role: AssistantRole,
  context: AssistantContext = "unknown",
): string {
  const aiRole = normalizeAssistantRoleToAiUserRole(role);
  const aiKnowledgeBlock = buildAiKnowledgePromptBlock({
    role: aiRole,
    screenId: resolveAiScreenIdForAssistantContext(context),
  });
  return [
    "Ты встроенный AI-ассистент приложения GOX/RIK для строительной компании.",
    "Отвечай на русском языке коротко и по делу.",
    "Нельзя выдумывать live-данные, статусы, остатки, оплаты, заявки или результаты поиска, если пользователь их не прислал.",
    "Нельзя утверждать, что ты создал заявку, предложение, оплату, выдачу или изменил что-либо в системе.",
    "Ты не выполняешь мутации: только объясняешь, подсказываешь и помогаешь сформулировать следующий шаг.",
    "Если вопрос про данные приложения, но точных данных в сообщении нет, говори об этом прямо и давай безопасный маршрут по экрану.",
    "В приложении есть модули: Маркет, Карта поставщиков, Профиль, Прораб, Директор, Снабженец, Бухгалтер, Склад, Отчеты.",
    `Текущая роль пользователя: ${role}.`,
    `Текущий модуль, из которого открыт AI: ${context}.`,
    "Для роли buyer делай упор на закупки, market, supplier map и предложения.",
    "Для роли warehouse делай упор на расход, приход, остатки, статусы склада и ограничения выдачи.",
    "Для роли director делай упор на отчеты, заявки, предложения и обзор по модулям.",
    "Для роли accountant делай упор на оплаты, документы и финансовые маршруты.",
    "Если пользователь просит найти товар или поставщика, помоги сформулировать поисковый запрос и подскажи открыть Маркет или Карту.",
    aiKnowledgeBlock,
    buildAiProfessionalResponsePolicyPrompt({ role: aiRole }),
    "Не используй markdown-таблицы. Только обычный текст или короткие списки.",
  ].join("\n");
}

export function getAssistantQuickPrompts(role: AssistantRole): AssistantQuickPrompt[] {
  switch (role) {
    case "foreman":
      return [
        { id: "foreman-ai-request", label: "Собрать черновик", prompt: "Собери черновик заявки: цемент М400 50 мешков, кирпич 2000 шт." },
        { id: "foreman-ai-send", label: "Отправить черновик", prompt: "Отправь черновик директору" },
        { id: "foreman-market-search", label: "Найти на рынке", prompt: "Найди на рынке цемент М400 и арматуру A500C." },
        { id: "foreman-flow", label: "Маршрут заявки", prompt: "Куда дальше идет заявка после отправки директору?" },
      ];
    case "buyer":
      return [
        { id: "buyer-market", label: "Поиск поставщика", prompt: "Помоги сформулировать запрос для поиска поставщика на рынке." },
        { id: "buyer-compare", label: "Сравнить варианты", prompt: "Как лучше сравнить предложения по одной позиции в приложении?" },
        { id: "buyer-flow", label: "Маршрут закупки", prompt: "Куда идти после утверждения заявки директором?" },
      ];
    case "warehouse":
      return [
        { id: "wh-expense", label: "Расход", prompt: "Объясни, чем отличается видимость заявки в расходе от возможности выдачи." },
        { id: "wh-status", label: "WAITING_STOCK", prompt: "Что означает статус WAITING_STOCK в складском контуре?" },
        { id: "wh-incoming", label: "Приход", prompt: "Где в приложении смотреть приход и что делать после поступления?" },
      ];
    case "director":
      return [
        { id: "dir-reports", label: "Отчеты", prompt: "Какие отчеты доступны директору и где их открывать?" },
        { id: "dir-market", label: "Рынок", prompt: "Как директор может использовать маркет и карту поставщиков?" },
        { id: "dir-requests", label: "Заявки", prompt: "Куда смотреть после утверждения заявки и что происходит дальше?" },
      ];
    case "accountant":
      return [
        { id: "acc-payments", label: "Оплаты", prompt: "Где бухгалтеру смотреть оплаты и задолженности?" },
        { id: "acc-docs", label: "Документы", prompt: "Подскажи маршрут до документов и отчетов для бухгалтерии." },
        { id: "acc-status", label: "Статусы", prompt: "Какие статусы предложений и оплат важны бухгалтеру?" },
      ];
    default:
      return [
        { id: "base-market", label: "Маркет", prompt: "Как пользоваться маркетом и картой поставщиков в этом приложении?" },
        { id: "base-requests", label: "Заявки", prompt: "Объясни маршрут заявки от создания до склада простыми словами." },
        { id: "base-modules", label: "Модули", prompt: "Кратко объясни, за что отвечают основные модули приложения." },
      ];
  }
}

export function getAssistantContextQuickPrompts(context: AssistantContext): AssistantQuickPrompt[] {
  switch (context) {
    case "foreman":
      return [
        { id: "ctx-foreman-request", label: "Собрать черновик", prompt: "Собери черновик заявки: цемент М400 50 мешков, щебень 5 м3, арматура A500C 1.2 т." },
        { id: "ctx-foreman-send", label: "Отправить черновик", prompt: "Отправь черновик директору" },
        { id: "ctx-foreman-clarify", label: "Уточнить позиции", prompt: "Мне нужен цемент и кирпич, помоги собрать заявку и скажи, чего не хватает." },
      ];
    case "market":
      return [
        { id: "ctx-market-find", label: "Найти поставщика", prompt: "Я сейчас в Маркете. Подскажи, как быстрее найти нужного поставщика или объявление." },
        { id: "ctx-market-map", label: "Маркет -> карта", prompt: "Я сейчас в Маркете. Объясни, когда лучше переходить на карту поставщиков и что там смотреть." },
      ];
    case "supplierMap":
      return [
        { id: "ctx-map-demand", label: "Спрос на карте", prompt: "Я сейчас на карте поставщиков. Подскажи, как читать спрос и предложения на карте." },
        { id: "ctx-map-focus", label: "Фильтры карты", prompt: "Я сейчас на карте. Помоги выбрать фильтры по типу, городу и стороне рынка." },
      ];
    case "warehouse":
      return [
        { id: "ctx-wh-expense", label: "Очередь расхода", prompt: "Я сейчас в модуле Склад. Объясни разницу между видимостью заявки в расходе и возможностью выдать сейчас." },
        { id: "ctx-wh-stock", label: "Нет остатка", prompt: "Я сейчас в Складе. Что значит, если заявка видна, но qty_can_issue_now = 0?" },
      ];
    case "buyer":
      return [
        { id: "ctx-buyer-inbox", label: "Очередь снабжения", prompt: "Я сейчас в снабжении. Объясни, как лучше разбирать входящие позиции и что смотреть первым." },
        { id: "ctx-buyer-market", label: "Искать на рынке", prompt: "Я сейчас в снабжении. Подскажи, когда лучше идти в Маркет и карту поставщиков." },
      ];
    case "director":
      return [
        { id: "ctx-dir-report", label: "Что смотреть", prompt: "Я сейчас в директорском модуле. Подскажи, какие экраны и отчеты смотреть для общего контроля." },
        { id: "ctx-dir-requests", label: "После утверждения", prompt: "Я сейчас у директора. Объясни, что происходит после утверждения заявки." },
      ];
    case "profile":
      return [
        { id: "ctx-profile-company", label: "Профиль компании", prompt: "Я сейчас в профиле. Подскажи, как использовать профиль компании вместе с витриной, картой и AI." },
        { id: "ctx-profile-market", label: "Мои объявления", prompt: "Я сейчас в профиле. Что лучше заполнить в объявлениях и витрине поставщика?" },
      ];
    case "reports":
      return [
        { id: "ctx-reports-route", label: "Навигация по отчетам", prompt: "Я сейчас в отчетах. Подскажи, какой отчет выбирать под разные управленческие вопросы." },
        { id: "ctx-reports-read", label: "Как читать отчет", prompt: "Я сейчас в отчетах. Объясни, как правильно читать сводки и что проверять первым." },
      ];
    case "request":
      return [
        { id: "ctx-request-status", label: "Статус заявки", prompt: "Я сейчас в заявке. Объясни, что означает ее текущий статус и какой следующий шаг по роли." },
        { id: "ctx-request-route", label: "Маршрут заявки", prompt: "Я сейчас в карточке заявки. Кратко объясни ее маршрут через директора, снабжение и склад." },
      ];
    default:
      return [];
  }
}

export function buildOfflineAssistantReply(
  role: AssistantRole,
  message: string,
  context: AssistantContext = "unknown",
): string {
  const text = String(message || "").trim().toLowerCase();
  const aiRole = normalizeAssistantRoleToAiUserRole(role);
  const knowledgeBlock = buildAiKnowledgePromptBlock({
    role: aiRole,
    screenId: resolveAiScreenIdForAssistantContext(context),
  });

  if (!text) {
    return getAssistantGreeting(role, null, context);
  }

  if (/(what can|can you do|available|allowed|capabilit|help on this screen)/i.test(text)) {
    return [
      "Short conclusion: I can help only within this role and screen knowledge policy.",
      knowledgeBlock,
      "High-risk actions are never executed silently. submit, approve, send, payment, supplier confirmation, order, and stock mutation require approval_required through aiApprovalGate.",
    ].join("\n");
  }

  if (/(маркет|рынок|поставщик|цена|объявлен|listing|supplier)/i.test(text)) {
    return "Для рынка используйте вкладку «Маркет» и экран «Карта». В маркете удобно искать по названию, городу и описанию, а на карте смотреть спрос и предложения по географии.";
  }

  if (/(склад|расход|приход|остат|waiting_stock|выдач)/i.test(text)) {
    return "По складу безопасная логика такая: видимость заявки в очереди расхода и фактическая возможность выдачи — не одно и то же. Смотрите модуль «Склад», а выдача разрешается только когда есть доступное количество.";
  }

  if (/(заявк|request|утвержд|директор|снабжен)/i.test(text)) {
    return "Маршрут заявки обычно идет через создание позиции, утверждение директором, затем снабжение и склад. Я не меняю статусы сам, но могу подсказать следующий экран под вашу роль.";
  }

  if (/(отчет|аналит|сводк)/i.test(text)) {
    return "Для сводок и аналитики откройте модуль «Отчеты» или директорские экраны. Если нужен конкретный отчет, напишите, что именно хотите посмотреть.";
  }

  if (/(профил|компан|аккаунт|настройк)/i.test(text)) {
    return "Профиль и данные компании находятся во вкладке «Профиль». Оттуда же удобно открывать маркетплейс, витрину поставщика и AI.";
  }

  const contextHint = getAssistantContextIntro(context);
  return `${contextHint ? `${contextHint} ` : ""}AI-ключ сейчас не настроен или недоступен, поэтому я работаю в safe guide mode: подсказываю маршрут по приложению, объясняю статусы и помогаю сформулировать запрос для нужного модуля.`;
}
