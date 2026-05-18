import {
  getAiScreenWorkflowRegistryEntry,
  listAiScreenWorkflowRegistry,
} from "../screenWorkflows/aiScreenWorkflowRegistry";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButtonIntent,
  AiScreenMagicQa,
  AiScreenMagicRegistryEntry,
  AiScreenMagicRiskLevel,
} from "./aiScreenMagicTypes";

type MagicBlueprint = {
  userGoal: string;
  screenSummary: string;
  preparedWork: readonly {
    title: string;
    description: string;
    riskLevel: AiScreenMagicRiskLevel;
  }[];
  buttonLabels: Partial<Record<Exclude<AiScreenMagicActionKind, "exact_blocker">, string>>;
  qa: readonly string[];
};

type MagicFoundationContract = {
  userHeader: string;
  visibleDomainData: readonly string[];
  riskSummary: readonly string[];
  missingDataSummary: readonly string[];
  safeActions: readonly string[];
  approvalCandidates: readonly string[];
  exactBlockers: readonly string[];
  buttonIntents: readonly AiScreenMagicButtonIntent[];
};

const DEFAULT_QA = [
  "Что критично сейчас?",
  "Каких данных не хватает?",
  "Что можно безопасно открыть?",
  "Какой черновик можно подготовить?",
  "Что нужно отправить на согласование?",
] as const;

function prepared(
  titles: readonly string[],
  riskLevel: AiScreenMagicRiskLevel = "medium",
) {
  return titles.map((title) => ({
    title,
    description: "AI собирает этот блок только из hydrated screen context, audited routes и evidence labels; отсутствующие факты остаются missing data.",
    riskLevel,
  }));
}

const FINANCE_QA = [
  "Что сегодня критично по оплатам?",
  "Какие платежи без документов?",
  "Какие платежи требуют директора?",
  "Почему этот платёж рискованный?",
  "Сделай краткий отчёт по оплатам за сегодня.",
] as const;

const PROCUREMENT_QA = [
  "Что открыть первым?",
  "У каких заявок уже есть варианты?",
  "Где нет поставщика?",
  "Что отправить директору?",
  "Почему эта заявка срочная?",
] as const;

const WAREHOUSE_QA = [
  "Где дефицит?",
  "Какие приходы спорные?",
  "Что склад не закроет?",
  "Какие документы нужны?",
  "Что отправить на согласование?",
] as const;

const FIELD_QA = [
  "Что закрыть сегодня?",
  "Каких фото или документов не хватает?",
  "Какой акт подготовить?",
  "Что написать подрядчику?",
  "Какой checklist применить?",
] as const;

const BLUEPRINTS: Record<string, MagicBlueprint> = {
  "accountant.main": {
    userGoal: "Бухгалтер сразу видит оплаты на сегодня, критические риски, missing documents и безопасный следующий шаг.",
    screenSummary: "Готово от AI · Финансы сегодня",
    preparedWork: prepared(["Поступило на оплату", "Критические платежи", "Без документов", "Ждут согласования"], "high"),
    buttonLabels: {
      safe_read: "Проверить критические",
      draft_only: "Собрать отчёт за сегодня",
      approval_required: "Отправить на согласование",
      forbidden: "Провести оплату напрямую",
    },
    qa: FINANCE_QA,
  },
  "accountant.payment": {
    userGoal: "Бухгалтер получает rationale по конкретному платежу, документы, missing evidence и approval path.",
    screenSummary: "Готово от AI · Проверка платежа",
    preparedWork: prepared(["Документы платежа", "Риск суммы", "Риск поставщика", "Готовый rationale"], "high"),
    buttonLabels: {
      safe_read: "Проверить документы",
      draft_only: "Подготовить rationale директору",
      approval_required: "Отправить на согласование",
      forbidden: "Оплатить сейчас",
    },
    qa: FINANCE_QA,
  },
  "accountant.history": {
    userGoal: "Бухгалтер и директор видят повторяющиеся финансовые риски, историю поставщиков и missing documents.",
    screenSummary: "Готово от AI · История оплат",
    preparedWork: prepared(["Повторяющиеся missing documents", "Поставщики с отклонениями", "Необычные суммы", "Риск-отчёт"], "medium"),
    buttonLabels: {
      safe_read: "Показать отклонения",
      draft_only: "Собрать отчёт по рискам",
      approval_required: "Отправить correction request",
      forbidden: "Переписать историю оплат",
    },
    qa: FINANCE_QA,
  },
  "buyer.main": {
    userGoal: "Снабженец видит входящие, утверждённые заявки, готовые варианты закупа, срочность и missing prices.",
    screenSummary: "Готово от AI · Снабжение сегодня",
    preparedWork: prepared(["Входящие заявки", "Утверждены директором", "Готовые варианты закупки", "Критические по сроку"], "high"),
    buttonLabels: {
      safe_read: "Разобрать входящие",
      draft_only: "Запросить цены",
      approval_required: "Отправить выбор на согласование",
      forbidden: "Подтвердить поставщика напрямую",
    },
    qa: PROCUREMENT_QA,
  },
  "buyer.requests": {
    userGoal: "Список заявок работает как очередь: AI показывает варианты, риски, missing data и следующий шаг по каждой заявке.",
    screenSummary: "Готово от AI · Очередь заявок",
    preparedWork: prepared(["Готовые варианты закупки", "Лучший evidence-backed вариант", "Риски", "Следующий шаг"], "high"),
    buttonLabels: {
      safe_read: "Смотреть варианты",
      draft_only: "Подготовить запрос",
      approval_required: "Отправить proposal pack",
      forbidden: "Создать заказ напрямую",
    },
    qa: PROCUREMENT_QA,
  },
  "buyer.request.detail": {
    userGoal: "Снабженец получает supplier comparison по заявке только из evidence-backed supplier, price и delivery signals.",
    screenSummary: "Готово от AI · Варианты закупки",
    preparedWork: prepared(["Внутренние поставщики", "Цена или missing price", "Срок или missing delivery", "Риски выбора"], "high"),
    buttonLabels: {
      safe_read: "Сравнить варианты",
      draft_only: "Подготовить запрос поставщику",
      approval_required: "Отправить выбор на согласование",
      forbidden: "Финализировать поставщика",
    },
    qa: PROCUREMENT_QA,
  },
  "procurement.copilot": {
    userGoal: "Procurement workbench готовит internal-first recommendation, comparison, missing data и approval candidate.",
    screenSummary: "Готово от AI · Procurement workbench",
    preparedWork: prepared(["Internal-first recommendation", "Supplier comparison", "Missing data checklist", "Approval candidate"], "high"),
    buttonLabels: {
      safe_read: "Почему вариант лучше",
      draft_only: "Сделать запрос поставщику",
      approval_required: "Что отправить директору",
      forbidden: "Создать order из copilot",
    },
    qa: PROCUREMENT_QA,
  },
  "market.home": {
    userGoal: "Снабжение видит внешний рынок как cited preview с реальными citations и приоритетом внутренних вариантов.",
    screenSummary: "Готово от AI · Рынок",
    preparedWork: prepared(["Позиции без внутренних поставщиков", "Внешний cited preview", "Сравнение с внутренними", "Missing citations"], "medium"),
    buttonLabels: {
      safe_read: "Показать cited варианты",
      draft_only: "Подготовить внешний запрос",
      approval_required: "Отправить market-backed request",
      forbidden: "Создать внешнего поставщика без evidence",
    },
    qa: PROCUREMENT_QA,
  },
  "supplier.showcase": {
    userGoal: "Снабженец понимает пригодность поставщика, покрытие активных позиций, историю и риски.",
    screenSummary: "Готово от AI · Поставщик",
    preparedWork: prepared(["Покрытие активных позиций", "Подходит к заявкам", "История надёжности", "Риски и missing data"], "medium"),
    buttonLabels: {
      safe_read: "Сравнить с другим",
      draft_only: "Подготовить запрос",
      approval_required: "Отправить выбор на approval",
      forbidden: "Подтвердить поставщика напрямую",
    },
    qa: PROCUREMENT_QA,
  },
  "warehouse.main": {
    userGoal: "Склад видит дефицит, ожидаемые приходы, спорные позиции и что нельзя закрыть без evidence.",
    screenSummary: "Готово от AI · Склад сегодня",
    preparedWork: prepared(["Риски дефицита", "Ожидаемые приходы", "Заявки, которые склад не закроет", "Спорные позиции"], "high"),
    buttonLabels: {
      safe_read: "Показать дефицит",
      draft_only: "Подготовить проверку прихода",
      approval_required: "Отправить спорные позиции на approval",
      forbidden: "Изменить остатки напрямую",
    },
    qa: WAREHOUSE_QA,
  },
  "warehouse.incoming": {
    userGoal: "Кладовщик видит расхождения прихода, missing documents и безопасный draft проверки.",
    screenSummary: "Готово от AI · Приход",
    preparedWork: prepared(["Пришло позиций", "Не совпадает с заявкой", "Документов не хватает", "Ручная проверка"], "high"),
    buttonLabels: {
      safe_read: "Список расхождений",
      draft_only: "Запросить документ",
      approval_required: "Отправить спорные позиции на согласование",
      forbidden: "Подтвердить приход AI",
    },
    qa: WAREHOUSE_QA,
  },
  "warehouse.issue": {
    userGoal: "Склад и прораб видят доступность, дефицит и approval-required выдачи без изменения остатков напрямую.",
    screenSummary: "Готово от AI · Выдача материалов",
    preparedWork: prepared(["Запрошено позиций", "Доступно полностью", "Дефицит", "Требует согласования"], "high"),
    buttonLabels: {
      safe_read: "Показать дефицит",
      draft_only: "Черновик выдачи",
      approval_required: "Отправить на approval",
      forbidden: "Списать или выдать напрямую",
    },
    qa: WAREHOUSE_QA,
  },
  "director.dashboard": {
    userGoal: "Директор получает очередь решений: критические, блокирующие работы, approvals и missing data.",
    screenSummary: "Готово от AI · Решения на сегодня",
    preparedWork: prepared(["Критические решения", "Ждут согласования", "Блокируют работы", "Запросить недостающие данные"], "high"),
    buttonLabels: {
      safe_read: "Показать критические",
      draft_only: "Запросить недостающие данные",
      approval_required: "Открыть approval path",
      forbidden: "Принять решение за директора",
    },
    qa: ["Что критично сегодня?", "Что блокирует работы?", "Что ждёт согласования?", "Каких данных не хватает?", "Что открыть первым?"],
  },
  "director.finance": {
    userGoal: "Директор видит финансовые решения, risk payments, supplier deltas и evidence gaps.",
    screenSummary: "Готово от AI · Финансовые решения",
    preparedWork: prepared(["Платежи с высоким риском", "Поставщики с отклонениями", "Платежи без полного evidence", "Approval queue"], "high"),
    buttonLabels: {
      safe_read: "Открыть рискованные платежи",
      draft_only: "Запросить rationale",
      approval_required: "Approve/Reject через inbox",
      forbidden: "Провести платёж AI",
    },
    qa: FINANCE_QA,
  },
  "director.reports": {
    userGoal: "Директор получает executive summary по закупкам, складу, финансам, документам и top decision.",
    screenSummary: "Готово от AI · Executive summary",
    preparedWork: prepared(["Закупки", "Склад", "Финансы", "Документы"], "medium"),
    buttonLabels: {
      safe_read: "Показать evidence",
      draft_only: "Сформировать summary",
      approval_required: "Submit report package",
      forbidden: "Опубликовать финальный report",
    },
    qa: DEFAULT_QA,
  },
  "ai.command_center": {
    userGoal: "Command Center показывает cross-role next actions без direct dangerous execution.",
    screenSummary: "Готово от AI · Command Center",
    preparedWork: prepared(["Buyer next action", "Accountant next action", "Warehouse next action", "Director approval"], "high"),
    buttonLabels: {
      safe_read: "Открыть evidence",
      draft_only: "Подготовить черновик",
      approval_required: "Отправить на approval",
      forbidden: "Execute без ledger",
    },
    qa: DEFAULT_QA,
  },
  "approval.inbox": {
    userGoal: "Approver видит proposal, reason, evidence, risks, effect after approval и forbidden boundaries.",
    screenSummary: "Готово от AI · На согласовании",
    preparedWork: prepared(["Что предлагается", "Почему", "Evidence", "Что будет после approval"], "critical"),
    buttonLabels: {
      safe_read: "Открыть evidence",
      draft_only: "Запросить данные",
      approval_required: "Approve/Reject human only",
      forbidden: "Approve от имени AI",
    },
    qa: ["Что предлагается?", "Почему это нужно?", "Какие риски?", "Что будет после approval?", "Что запрещено без approval?"],
  },
  "foreman.main": {
    userGoal: "Прораб видит работы на сегодня, missing evidence, материалы, подрядчиков и безопасные drafts.",
    screenSummary: "Готово от AI · Работы сегодня",
    preparedWork: prepared(["Можно подготовить акт", "Missing photo/document/signature", "Материалы задерживают работу", "Подрядчик не сдал документ"], "high"),
    buttonLabels: {
      safe_read: "Проверить missing evidence",
      draft_only: "Подготовить акт",
      approval_required: "Отправить заявку на approval",
      forbidden: "Approve own field request",
    },
    qa: FIELD_QA,
  },
  "foreman.ai.quick_modal": {
    userGoal: "Быстрый AI modal готовит акт, отчёт, missing evidence, сообщение подрядчику и checklist.",
    screenSummary: "Готово от AI · Быстрые черновики",
    preparedWork: prepared(["Акт по текущей работе", "Отчёт за день", "Список missing evidence", "Проверка безопасности"], "medium"),
    buttonLabels: {
      safe_read: "Строительный checklist",
      draft_only: "Акт по текущей работе",
      approval_required: "Отправить quick request на approval",
      forbidden: "Финально отправить без проверки",
    },
    qa: FIELD_QA,
  },
  "foreman.subcontract": {
    userGoal: "Прораб видит subcontract status, documents missing, risk и draft closeout без signing.",
    screenSummary: "Готово от AI · Subcontract status",
    preparedWork: prepared(["Выполнено", "Не подтверждено", "Документов не хватает", "Риск"], "medium"),
    buttonLabels: {
      safe_read: "Показать checklist",
      draft_only: "Подготовить акт",
      approval_required: "Submit subcontract progress",
      forbidden: "Sign subcontract directly",
    },
    qa: FIELD_QA,
  },
  "contractor.main": {
    userGoal: "Подрядчик видит что нужно сдать, missing photos/documents, замечания и safe replies.",
    screenSummary: "Готово от AI · Что нужно сдать",
    preparedWork: prepared(["Фото по зоне", "Документ к акту", "Ответ прорабу", "Работы с замечаниями"], "medium"),
    buttonLabels: {
      safe_read: "Что мешает приёмке",
      draft_only: "Подготовить ответ",
      approval_required: "Submit contractor progress",
      forbidden: "Изменить work status напрямую",
    },
    qa: FIELD_QA,
  },
  "documents.main": {
    userGoal: "Любая роль получает summary документа, связи, important fields, missing evidence и risks.",
    screenSummary: "Готово от AI · Документ",
    preparedWork: prepared(["Краткое содержание", "Связанные объекты", "Важное", "Missing evidence"], "medium"),
    buttonLabels: {
      safe_read: "Открыть связанные объекты",
      draft_only: "Подготовить резюме",
      approval_required: "Submit document change",
      forbidden: "Подписать или удалить документ",
    },
    qa: ["Что важно в документе?", "С чем документ связан?", "Каких evidence не хватает?", "Какие риски?", "Подготовь комментарий."],
  },
  "reports.modal": {
    userGoal: "AI готовит report draft: события, риски, missing evidence, linked objects и decisions.",
    screenSummary: "Готово от AI · Черновик отчёта",
    preparedWork: prepared(["Основные события", "Риски", "Missing evidence", "Что требует решения"], "medium"),
    buttonLabels: {
      safe_read: "Проверить evidence",
      draft_only: "Собрать отчёт",
      approval_required: "Submit report",
      forbidden: "Final send without review",
    },
    qa: DEFAULT_QA,
  },
  "chat.main": {
    userGoal: "Команда получает итоги обсуждения, задачи по ролям, missing data и approval candidates.",
    screenSummary: "Готово от AI · Итоги обсуждения",
    preparedWork: prepared(["Итоги обсуждения", "Задачи Buyer/Warehouse/Director/Foreman", "Риск срока", "Approval candidate"], "medium"),
    buttonLabels: {
      safe_read: "Подготовить summary",
      draft_only: "Создать черновик задачи",
      approval_required: "Отправить на approval",
      forbidden: "Отправить сообщение напрямую",
    },
    qa: DEFAULT_QA,
  },
  "map.main": {
    userGoal: "Логистика видит nearby suppliers, objects, route risks and linked requests только из evidence-backed distance/ETA signals.",
    screenSummary: "Готово от AI · Логистика",
    preparedWork: prepared(["Ближайшие поставщики", "Объекты рядом", "Маршруты с риском", "Связанные заявки"], "medium"),
    buttonLabels: {
      safe_read: "Сравнить поставщиков по логистике",
      draft_only: "Подготовить запрос доставки",
      approval_required: "Submit site context",
      forbidden: "Создать map record directly",
    },
    qa: DEFAULT_QA,
  },
  "office.hub": {
    userGoal: "Офис видит documents to process, stalled requests, reports, overdue tasks and approval needs.",
    screenSummary: "Готово от AI · Офис сегодня",
    preparedWork: prepared(["Документы на обработку", "Заявки без движения", "Отчёты на проверку", "Просроченные задачи"], "medium"),
    buttonLabels: {
      safe_read: "Открыть просроченные",
      draft_only: "Подготовить reminder",
      approval_required: "Отправить на approval",
      forbidden: "Change user role directly",
    },
    qa: DEFAULT_QA,
  },
  "security.screen": {
    userGoal: "Security/admin видит risky roles, forbidden attempts, suspicious approvals and policy gaps without permission changes.",
    screenSummary: "Готово от AI · Security overview",
    preparedWork: prepared(["Роли с повышенным риском", "Forbidden attempts", "Подозрительные approvals", "Policy gaps"], "high"),
    buttonLabels: {
      safe_read: "Проверить forbidden attempts",
      draft_only: "Собрать security report",
      approval_required: "Submit security change request",
      forbidden: "Grant permission directly",
    },
    qa: DEFAULT_QA,
  },
  "screen.runtime": {
    userGoal: "Dev/admin only получает runtime diagnosis, exact blocker, last artifact and safe repair command.",
    screenSummary: "Готово от AI · Runtime diagnosis",
    preparedWork: prepared(["Runtime health", "Transport binding", "Fallback entries", "Exact blocker"], "medium"),
    buttonLabels: {
      safe_read: "Показать exact blocker",
      draft_only: "Показать repair command",
      approval_required: "Prepare approval-gated runtime action",
      forbidden: "Write screen state directly",
    },
    qa: DEFAULT_QA,
  },
};

const FOUNDATION_CONTRACTS: Record<string, MagicFoundationContract> = {
  "accountant.main": {
    userHeader: "Финансы сегодня",
    visibleDomainData: ["платежи на проверке", "общая сумма", "критические платежи", "платежи без документов", "платежи ждут директора", "первый платеж для открытия"],
    riskSummary: ["критические платежи", "missing documents", "платежи без директорского решения"],
    missingDataSummary: ["документы-основания", "подтверждение поставщика", "rationale для директора"],
    safeActions: ["проверить критические", "открыть платежи без документов"],
    approvalCandidates: ["отправить платеж на согласование директору"],
    exactBlockers: ["оплата напрямую запрещена без документов и human approval"],
    buttonIntents: [
      { label: "Проверить критические", actionKind: "safe_read" },
      { label: "Собрать отчет за сегодня", actionKind: "draft_only" },
      { label: "Подготовить rationale директору", actionKind: "draft_only" },
      { label: "Запросить документы", actionKind: "draft_only" },
      { label: "Отправить на согласование", actionKind: "approval_required" },
      { label: "Провести оплату напрямую", actionKind: "forbidden", userFacingReason: "AI не проводит платежи напрямую и не скрывает missing documents." },
    ],
  },
  "accountant.payment": {
    userHeader: "Финансы сегодня",
    visibleDomainData: ["поставщик", "сумма", "основание", "связанные документы", "missing documents", "риск суммы", "риск поставщика"],
    riskSummary: ["риск суммы", "риск поставщика", "платеж без полного evidence"],
    missingDataSummary: ["документ-основание", "подтверждение поставщика", "директорский rationale"],
    safeActions: ["проверить документы", "показать связанные документы"],
    approvalCandidates: ["отправить платеж на согласование"],
    exactBlockers: ["платеж нельзя проводить без evidence и approval ledger"],
    buttonIntents: [
      { label: "Проверить документы", actionKind: "safe_read" },
      { label: "Подготовить rationale", actionKind: "draft_only" },
      { label: "Запросить подтверждение", actionKind: "draft_only" },
      { label: "Отправить на согласование", actionKind: "approval_required" },
      { label: "Оплатить сейчас", actionKind: "forbidden", userFacingReason: "AI не выполняет оплату и не подменяет решение бухгалтера или директора." },
    ],
  },
  "accountant.history": {
    userHeader: "Финансы сегодня",
    visibleDomainData: ["повторные missing documents", "необычные суммы", "ручные проверки", "отклонения по истории"],
    riskSummary: ["поставщики с повторными документными проблемами", "аномальные суммы", "частые ручные проверки"],
    missingDataSummary: ["историческое evidence по поставщику", "причины отклонений"],
    safeActions: ["показать отклонения", "сравнить поставщиков"],
    approvalCandidates: ["передать risk report на review"],
    exactBlockers: ["историю оплат нельзя переписывать AI-действием"],
    buttonIntents: [
      { label: "Показать отклонения", actionKind: "safe_read" },
      { label: "Сравнить поставщиков", actionKind: "safe_read" },
      { label: "Собрать отчет по рискам", actionKind: "draft_only" },
      { label: "Переписать историю оплат", actionKind: "forbidden", userFacingReason: "История оплат остается неизменной; AI готовит только чтение и черновики." },
    ],
  },
  "buyer.main": {
    userHeader: "Снабжение сегодня",
    visibleDomainData: ["входящие заявки", "утвержденные директором", "готовые варианты закупа", "срочные", "без поставщика", "первая заявка для работы"],
    riskSummary: ["срочные заявки без поставщика", "выбор без цены", "заявки без evidence"],
    missingDataSummary: ["цены", "наличие", "надежность поставщика", "срок поставки"],
    safeActions: ["разобрать входящие", "смотреть варианты закупа", "сравнить поставщиков"],
    approvalCandidates: ["отправить выбор поставщика на согласование"],
    exactBlockers: ["заказ напрямую запрещен без approval и evidence"],
    buttonIntents: [
      { label: "Разобрать входящие", actionKind: "safe_read" },
      { label: "Смотреть варианты закупа", actionKind: "safe_read" },
      { label: "Сравнить поставщиков", actionKind: "safe_read" },
      { label: "Запросить цены", actionKind: "draft_only" },
      { label: "Отправить выбор на согласование", actionKind: "approval_required" },
      { label: "Создать заказ напрямую", actionKind: "forbidden", userFacingReason: "AI не создает заказ, не выдумывает цену и не меняет склад." },
    ],
  },
  "buyer.requests": {
    userHeader: "Снабжение сегодня",
    visibleDomainData: ["статус заявки", "количество позиций", "срочность", "готовые варианты закупа", "лучший вариант или no-evidence", "риски", "следующий шаг"],
    riskSummary: ["approved-заявка без вариантов", "нет поставщика", "нет цены или срока"],
    missingDataSummary: ["варианты закупа", "цены", "availability", "evidence выбора"],
    safeActions: ["смотреть варианты", "сравнить", "проверить риски"],
    approvalCandidates: ["отправить proposal pack на согласование"],
    exactBlockers: ["если evidence нет, показывается no-evidence вместо выдуманного варианта"],
    buttonIntents: [
      { label: "Смотреть варианты", actionKind: "safe_read" },
      { label: "Сравнить", actionKind: "safe_read" },
      { label: "Подготовить запрос", actionKind: "draft_only" },
      { label: "Проверить риски", actionKind: "safe_read" },
      { label: "Создать заказ напрямую", actionKind: "forbidden", userFacingReason: "AI не создает заказ из карточки заявки." },
    ],
  },
  "buyer.request.detail": {
    userHeader: "Снабжение сегодня",
    visibleDomainData: ["варианты поставщиков", "source", "покрытие позиций", "цена или missing", "срок или missing", "reliability", "risks"],
    riskSummary: ["выбор без цены", "неполное покрытие позиций", "низкая надежность поставщика"],
    missingDataSummary: ["price signal", "delivery signal", "reliability evidence"],
    safeActions: ["сравнить варианты", "показать coverage"],
    approvalCandidates: ["отправить выбор поставщика на согласование"],
    exactBlockers: ["финальный выбор поставщика требует human approval"],
    buttonIntents: [
      { label: "Запросить цену", actionKind: "draft_only" },
      { label: "Сравнить варианты", actionKind: "safe_read" },
      { label: "Подготовить запрос поставщику", actionKind: "draft_only" },
      { label: "Отправить выбор на согласование", actionKind: "approval_required" },
      { label: "Финализировать поставщика", actionKind: "forbidden", userFacingReason: "AI не финализирует поставщика без approval ledger." },
    ],
  },
  "procurement.copilot": {
    userHeader: "Снабжение сегодня",
    visibleDomainData: ["internal-first recommendation", "supplier comparison", "risk summary", "missing data checklist", "draft supplier request", "approval candidate"],
    riskSummary: ["выбор без internal-first проверки", "внешний вариант без citation", "missing data по цене или сроку"],
    missingDataSummary: ["ценовой сигнал", "срок", "reliability", "evidence для директора"],
    safeActions: ["почему поставщик лучше", "что не хватает для выбора"],
    approvalCandidates: ["что отправить директору"],
    exactBlockers: ["copilot не создает order и не меняет бизнес-состояние"],
    buttonIntents: [
      { label: "Почему этот поставщик лучше", actionKind: "safe_read" },
      { label: "Что не хватает для выбора", actionKind: "safe_read" },
      { label: "Сделать запрос поставщику", actionKind: "draft_only" },
      { label: "Что отправить директору", actionKind: "approval_required" },
      { label: "Создать order из copilot", actionKind: "forbidden", userFacingReason: "Workbench готовит evidence и approval candidate, но не создает заказ напрямую." },
    ],
  },
  "market.home": {
    userHeader: "Снабжение сегодня",
    visibleDomainData: ["позиции без внутренних поставщиков", "cited preview", "внутренние варианты в приоритете", "reliability", "risks", "missing data"],
    riskSummary: ["внешний рынок без citation", "сравнение без внутреннего варианта", "неподтвержденная доступность"],
    missingDataSummary: ["citation", "цена", "availability", "delivery"],
    safeActions: ["показать cited варианты", "сравнить с внутренними"],
    approvalCandidates: ["отправить внешний выбор на approval"],
    exactBlockers: ["внешний поставщик не создается без evidence"],
    buttonIntents: [
      { label: "Подготовить внешний запрос", actionKind: "draft_only" },
      { label: "Показать cited варианты", actionKind: "safe_read" },
      { label: "Сравнить с внутренними", actionKind: "safe_read" },
      { label: "Отправить выбор на approval", actionKind: "approval_required" },
      { label: "Создать внешнего поставщика без evidence", actionKind: "forbidden", userFacingReason: "AI не создает поставщика и не подставляет рынок без citation." },
    ],
  },
  "supplier.showcase": {
    userHeader: "Снабжение сегодня",
    visibleDomainData: ["supplier reliability", "history", "coverage", "risks", "missing data"],
    riskSummary: ["supplier without reliability signal", "неполное покрытие заявки", "missing price"],
    missingDataSummary: ["reliability history", "price", "coverage proof"],
    safeActions: ["сравнить с внутренними", "показать cited варианты"],
    approvalCandidates: ["отправить выбор на approval"],
    exactBlockers: ["поставщик не подтверждается напрямую AI"],
    buttonIntents: [
      { label: "Сравнить с внутренними", actionKind: "safe_read" },
      { label: "Показать cited варианты", actionKind: "safe_read" },
      { label: "Подготовить запрос", actionKind: "draft_only" },
      { label: "Отправить выбор на approval", actionKind: "approval_required" },
      { label: "Подтвердить поставщика напрямую", actionKind: "forbidden", userFacingReason: "AI не подтверждает поставщика без approval." },
    ],
  },
  "warehouse.main": {
    userHeader: "Склад сегодня",
    visibleDomainData: ["риски дефицита", "ожидаемые приходы", "заявки, которые склад не закроет", "спорные позиции"],
    riskSummary: ["дефицит", "спорный приход", "заявка без достаточного остатка"],
    missingDataSummary: ["документы прихода", "точный остаток", "approval для спорной позиции"],
    safeActions: ["показать дефицит"],
    approvalCandidates: ["спорные позиции на approval"],
    exactBlockers: ["AI не меняет остатки, не принимает и не списывает склад"],
    buttonIntents: [
      { label: "Показать дефицит", actionKind: "safe_read" },
      { label: "Подготовить проверку прихода", actionKind: "draft_only" },
      { label: "Черновик перемещения", actionKind: "draft_only" },
      { label: "Отправить спорные позиции на approval", actionKind: "approval_required" },
      { label: "Изменить остатки напрямую", actionKind: "forbidden", userFacingReason: "AI не меняет складские остатки и не проводит приемку, выдачу или списание." },
    ],
  },
  "warehouse.incoming": {
    userHeader: "Склад сегодня",
    visibleDomainData: ["пришло позиций", "расхождения с заявкой", "missing documents", "ручная проверка"],
    riskSummary: ["расхождение прихода", "нет документа", "ручная проверка обязательна"],
    missingDataSummary: ["накладная", "акт расхождения", "подтверждение поставщика"],
    safeActions: ["список расхождений"],
    approvalCandidates: ["спорные позиции на согласование"],
    exactBlockers: ["AI не подтверждает приход напрямую"],
    buttonIntents: [
      { label: "Список расхождений", actionKind: "safe_read" },
      { label: "Запросить документ", actionKind: "draft_only" },
      { label: "Отправить спорные позиции на согласование", actionKind: "approval_required" },
      { label: "Подготовить черновик проверки", actionKind: "draft_only" },
      { label: "Подтвердить приход AI", actionKind: "forbidden", userFacingReason: "Приход подтверждает человек после проверки документов и расхождений." },
    ],
  },
  "warehouse.issue": {
    userHeader: "Склад сегодня",
    visibleDomainData: ["запрошенные позиции", "доступно полностью", "дефицит", "позиции, где нужен approval"],
    riskSummary: ["выдача при дефиците", "позиция требует approval", "альтернатива без evidence"],
    missingDataSummary: ["точный остаток", "approval reason", "альтернативная позиция"],
    safeActions: ["показать дефицит", "предложить альтернативу"],
    approvalCandidates: ["выдача позиции, где нужен approval"],
    exactBlockers: ["AI не выдает и не списывает материалы напрямую"],
    buttonIntents: [
      { label: "Черновик выдачи", actionKind: "draft_only" },
      { label: "Показать дефицит", actionKind: "safe_read" },
      { label: "Предложить альтернативу", actionKind: "safe_read" },
      { label: "Отправить на approval", actionKind: "approval_required" },
      { label: "Списать или выдать напрямую", actionKind: "forbidden", userFacingReason: "AI не делает складскую мутацию." },
    ],
  },
  "director.dashboard": {
    userHeader: "Решения на сегодня",
    visibleDomainData: ["критические вопросы", "pending approvals", "что блокирует работы", "top issues", "next action"],
    riskSummary: ["скрытый риск", "решение без evidence", "работы заблокированы"],
    missingDataSummary: ["документы", "rationale", "связанные заявки или платежи"],
    safeActions: ["открыть approval inbox", "показать критические", "показать что блокирует работы"],
    approvalCandidates: ["pending approvals для человеческого решения"],
    exactBlockers: ["AI не принимает решение за директора"],
    buttonIntents: [
      { label: "Открыть approval inbox", actionKind: "safe_read" },
      { label: "Показать критические", actionKind: "safe_read" },
      { label: "Показать что блокирует работы", actionKind: "safe_read" },
      { label: "Запросить недостающие данные", actionKind: "draft_only" },
      { label: "Принять решение за директора", actionKind: "forbidden", userFacingReason: "AI показывает evidence и риски, но не принимает решение вместо директора." },
    ],
  },
  "director.finance": {
    userHeader: "Финансы сегодня",
    visibleDomainData: ["high-risk payments", "supplier amount deviations", "payments without full evidence", "payments waiting approval"],
    riskSummary: ["high-risk payment", "supplier amount deviation", "payment without evidence"],
    missingDataSummary: ["rationale", "supplier history", "document evidence"],
    safeActions: ["открыть рискованные платежи", "сравнить историю поставщика"],
    approvalCandidates: ["Approve/Reject через inbox human only"],
    exactBlockers: ["AI не approve/reject и не проводит платеж"],
    buttonIntents: [
      { label: "Открыть рискованные платежи", actionKind: "safe_read" },
      { label: "Сравнить историю поставщика", actionKind: "safe_read" },
      { label: "Запросить rationale", actionKind: "draft_only" },
      { label: "Approve/Reject через inbox", actionKind: "approval_required" },
      { label: "Провести платеж AI", actionKind: "forbidden", userFacingReason: "Финальное решение остается в human approval inbox." },
    ],
  },
  "director.reports": {
    userHeader: "Решения на сегодня",
    visibleDomainData: ["procurement summary", "warehouse summary", "finance summary", "documents summary", "critical deviations", "top decision"],
    riskSummary: ["critical deviation", "summary without evidence", "decision missing context"],
    missingDataSummary: ["evidence", "linked documents", "approval status"],
    safeActions: ["открыть риски", "показать evidence"],
    approvalCandidates: ["report package review"],
    exactBlockers: ["AI не публикует финальный отчет без review"],
    buttonIntents: [
      { label: "Сформировать summary", actionKind: "draft_only" },
      { label: "Открыть риски", actionKind: "safe_read" },
      { label: "Подготовить report draft", actionKind: "draft_only" },
      { label: "Показать evidence", actionKind: "safe_read" },
      { label: "Опубликовать финальный report", actionKind: "forbidden", userFacingReason: "AI готовит черновик и evidence, но не публикует финальный отчет." },
    ],
  },
  "ai.command_center": {
    userHeader: "AI помощник",
    visibleDomainData: ["cross-role next actions", "buyer next action", "accountant next action", "warehouse next action", "director approval"],
    riskSummary: ["action without ledger", "missing evidence", "blocked route"],
    missingDataSummary: ["last artifact", "evidence label", "approval candidate"],
    safeActions: ["открыть evidence", "показать блокеры"],
    approvalCandidates: ["cross-role approval candidate"],
    exactBlockers: ["dangerous execution stays blocked without approval ledger"],
    buttonIntents: [
      { label: "Открыть evidence", actionKind: "safe_read" },
      { label: "Показать блокеры", actionKind: "safe_read" },
      { label: "Подготовить черновик", actionKind: "draft_only" },
      { label: "Отправить на approval", actionKind: "approval_required" },
      { label: "Execute без ledger", actionKind: "forbidden", userFacingReason: "Command Center не исполняет опасные действия без approval ledger." },
    ],
  },
  "approval.inbox": {
    userHeader: "Решения на сегодня",
    visibleDomainData: ["что предлагается", "почему", "evidence", "risks", "effect after approval", "что запрещено без approval"],
    riskSummary: ["approval без evidence", "hidden risk", "AI self-approval"],
    missingDataSummary: ["rationale", "evidence", "effect after approval"],
    safeActions: ["открыть evidence"],
    approvalCandidates: ["Approve/Reject human only"],
    exactBlockers: ["AI не approve itself и не меняет статус"],
    buttonIntents: [
      { label: "Approve", actionKind: "approval_required" },
      { label: "Reject", actionKind: "approval_required" },
      { label: "Запросить данные", actionKind: "draft_only" },
      { label: "Открыть evidence", actionKind: "safe_read" },
      { label: "Approve от имени AI", actionKind: "forbidden", userFacingReason: "AI не утверждает сам себя и не скрывает риски." },
    ],
  },
  "foreman.main": {
    userHeader: "Работы сегодня",
    visibleDomainData: ["что можно закрыть", "missing фото/документы/подписи", "material blockers", "subcontractor blockers", "construction checklist if source exists"],
    riskSummary: ["акт без evidence", "нет подписи", "материалы блокируют работу"],
    missingDataSummary: ["фото", "документ", "подпись", "норма или checklist source"],
    safeActions: ["проверить missing evidence", "показать строительный checklist", "проверка безопасности"],
    approvalCandidates: ["полевая заявка на approval"],
    exactBlockers: ["AI не подписывает и не делает final submit"],
    buttonIntents: [
      { label: "Подготовить акт", actionKind: "draft_only" },
      { label: "Подготовить отчет", actionKind: "draft_only" },
      { label: "Проверить missing evidence", actionKind: "safe_read" },
      { label: "Написать подрядчику", actionKind: "draft_only" },
      { label: "Показать строительный checklist", actionKind: "safe_read" },
      { label: "Проверка безопасности", actionKind: "safe_read" },
      { label: "Подписать акт напрямую", actionKind: "forbidden", userFacingReason: "AI не подписывает и не отправляет финальный акт без review." },
    ],
  },
  "foreman.ai.quick_modal": {
    userHeader: "Работы сегодня",
    visibleDomainData: ["акт по текущей работе", "отчет за день", "missing evidence", "сообщение подрядчику", "checklist", "safety check"],
    riskSummary: ["final submit без review", "missing evidence", "checklist without source"],
    missingDataSummary: ["фото", "подпись", "документ", "source checklist"],
    safeActions: ["список missing evidence", "строительный checklist", "проверка безопасности"],
    approvalCandidates: ["quick request на approval"],
    exactBlockers: ["final submit запрещен без review"],
    buttonIntents: [
      { label: "Акт по текущей работе", actionKind: "draft_only" },
      { label: "Отчет за день", actionKind: "draft_only" },
      { label: "Список missing evidence", actionKind: "safe_read" },
      { label: "Сообщение подрядчику", actionKind: "draft_only" },
      { label: "Строительный checklist", actionKind: "safe_read" },
      { label: "Проверка безопасности", actionKind: "safe_read" },
      { label: "Финально отправить без проверки", actionKind: "forbidden", userFacingReason: "Quick modal готовит только draft/result preview." },
    ],
  },
  "foreman.subcontract": {
    userHeader: "Работы сегодня",
    visibleDomainData: ["subcontract status", "documents missing", "risk", "draft closeout"],
    riskSummary: ["closing without subcontract evidence", "missing document", "signature risk"],
    missingDataSummary: ["акт", "подпись", "документ подрядчика"],
    safeActions: ["показать checklist", "проверить missing evidence"],
    approvalCandidates: ["submit subcontract progress"],
    exactBlockers: ["AI не подписывает subcontract"],
    buttonIntents: [
      { label: "Показать checklist", actionKind: "safe_read" },
      { label: "Подготовить акт", actionKind: "draft_only" },
      { label: "Submit subcontract progress", actionKind: "approval_required" },
      { label: "Sign subcontract directly", actionKind: "forbidden", userFacingReason: "Подписание остается человеческим действием." },
    ],
  },
  "contractor.main": {
    userHeader: "Работы сегодня",
    visibleDomainData: ["missing photos", "missing documents", "reply to foreman", "works with remarks"],
    riskSummary: ["приемка блокируется missing evidence", "работы с замечаниями"],
    missingDataSummary: ["фото", "документ", "ответ прорабу"],
    safeActions: ["список документов", "что мешает приемке", "проверить замечания"],
    approvalCandidates: ["contractor progress submit"],
    exactBlockers: ["AI не меняет work status напрямую"],
    buttonIntents: [
      { label: "Подготовить ответ", actionKind: "draft_only" },
      { label: "Список документов", actionKind: "safe_read" },
      { label: "Что мешает приемке", actionKind: "safe_read" },
      { label: "Проверить замечания", actionKind: "safe_read" },
      { label: "Изменить work status напрямую", actionKind: "forbidden", userFacingReason: "Статус работы меняется только утвержденным человеческим действием." },
    ],
  },
  "documents.main": {
    userHeader: "AI помощник",
    visibleDomainData: ["document summary", "linked request/payment/act/supplier", "amount/supplier/date/terms", "obligations", "missing evidence", "risks"],
    riskSummary: ["document without evidence", "missing obligation", "linked object absent"],
    missingDataSummary: ["linked object", "amount", "supplier", "terms", "evidence"],
    safeActions: ["открыть связанные объекты"],
    approvalCandidates: ["document comment or evidence request"],
    exactBlockers: ["AI не подписывает и не удаляет документы"],
    buttonIntents: [
      { label: "Подготовить резюме", actionKind: "draft_only" },
      { label: "Запросить missing evidence", actionKind: "draft_only" },
      { label: "Подготовить комментарий", actionKind: "draft_only" },
      { label: "Открыть связанные объекты", actionKind: "safe_read" },
      { label: "Подписать или удалить документ", actionKind: "forbidden", userFacingReason: "AI не подписывает, не удаляет и не меняет документ напрямую." },
    ],
  },
  "reports.modal": {
    userHeader: "Готово от AI",
    visibleDomainData: ["draft report", "main events", "risks", "missing evidence", "linked requests/payments/documents", "decisions needed"],
    riskSummary: ["report without evidence", "missing linked object", "decision needed"],
    missingDataSummary: ["evidence", "linked objects", "missing data"],
    safeActions: ["проверить evidence"],
    approvalCandidates: ["report review"],
    exactBlockers: ["final report submit is forbidden without review"],
    buttonIntents: [
      { label: "Собрать отчет", actionKind: "draft_only" },
      { label: "Проверить evidence", actionKind: "safe_read" },
      { label: "Добавить missing data", actionKind: "draft_only" },
      { label: "Сохранить черновик", actionKind: "draft_only" },
      { label: "Final send without review", actionKind: "forbidden", userFacingReason: "AI сохраняет только черновик/result preview." },
    ],
  },
  "chat.main": {
    userHeader: "AI помощник",
    visibleDomainData: ["discussion summary", "extracted tasks", "blockers", "approval needs", "missing data"],
    riskSummary: ["task without owner", "approval need hidden", "direct order/payment/warehouse mutation from chat"],
    missingDataSummary: ["owner", "deadline", "linked object", "approval evidence"],
    safeActions: ["подготовить summary", "запросить missing data"],
    approvalCandidates: ["отправить на approval"],
    exactBlockers: ["chat не делает direct order/payment/warehouse mutation"],
    buttonIntents: [
      { label: "Открыть summary", actionKind: "safe_read" },
      { label: "Создать черновик задачи", actionKind: "draft_only" },
      { label: "Подготовить summary", actionKind: "draft_only" },
      { label: "Отправить на approval", actionKind: "approval_required" },
      { label: "Запросить missing data", actionKind: "draft_only" },
      { label: "Отправить сообщение напрямую", actionKind: "forbidden", userFacingReason: "AI готовит черновик, но не выполняет бизнес-действие из чата." },
    ],
  },
  "map.main": {
    userHeader: "AI помощник",
    visibleDomainData: ["nearby suppliers", "nearby objects", "route risks", "delivery impact on requests"],
    riskSummary: ["distance without evidence", "ETA without evidence", "supplier creation risk"],
    missingDataSummary: ["distance signal", "ETA signal", "linked request"],
    safeActions: ["сравнить поставщиков по логистике", "показать риски маршрута", "открыть связанные заявки"],
    approvalCandidates: ["запрос доставки"],
    exactBlockers: ["AI не выдумывает distance/ETA и не создает supplier"],
    buttonIntents: [
      { label: "Сравнить поставщиков по логистике", actionKind: "safe_read" },
      { label: "Показать риски маршрута", actionKind: "safe_read" },
      { label: "Подготовить запрос доставки", actionKind: "draft_only" },
      { label: "Открыть связанные заявки", actionKind: "safe_read" },
      { label: "Создать map record directly", actionKind: "forbidden", userFacingReason: "AI не создает гео-объекты и не подставляет distance/ETA." },
    ],
  },
  "office.hub": {
    userHeader: "AI помощник",
    visibleDomainData: ["documents to process", "stuck requests", "reports to review", "overdue tasks", "items requiring approval"],
    riskSummary: ["overdue task", "stuck request", "approval needed"],
    missingDataSummary: ["linked document", "owner", "deadline", "approval route"],
    safeActions: ["открыть просроченные", "собрать документы"],
    approvalCandidates: ["отправить на approval"],
    exactBlockers: ["AI не меняет роли и не закрывает задачи напрямую"],
    buttonIntents: [
      { label: "Открыть просроченные", actionKind: "safe_read" },
      { label: "Собрать документы", actionKind: "safe_read" },
      { label: "Подготовить reminder", actionKind: "draft_only" },
      { label: "Отправить на approval", actionKind: "approval_required" },
      { label: "Change user role directly", actionKind: "forbidden", userFacingReason: "Office hub не меняет роли и права напрямую." },
    ],
  },
  "security.screen": {
    userHeader: "AI помощник",
    visibleDomainData: ["risky roles", "forbidden action attempts", "suspicious approvals", "служебный путь повышенного риска"],
    riskSummary: ["risky role", "forbidden attempt", "suspicious approval", "служебный путь повышенного риска"],
    missingDataSummary: ["audit evidence", "policy gap", "approval trace"],
    safeActions: ["открыть risk roles", "проверить forbidden attempts", "показать policy gaps"],
    approvalCandidates: ["security report"],
    exactBlockers: ["AI не выдает роли, не отключает policy и не разрешает служебный путь повышенного риска"],
    buttonIntents: [
      { label: "Открыть risk roles", actionKind: "safe_read" },
      { label: "Проверить forbidden attempts", actionKind: "safe_read" },
      { label: "Собрать security report", actionKind: "draft_only" },
      { label: "Показать policy gaps", actionKind: "safe_read" },
      { label: "Grant permission directly", actionKind: "forbidden", userFacingReason: "AI не меняет роли, права или policy." },
    ],
  },
  "screen.runtime": {
    userHeader: "AI помощник",
    visibleDomainData: ["runtime health", "explicit transport binding", "fallback entries", "failing child runner", "exact blocker", "last artifact", "recommended repair command"],
    riskSummary: ["runtime blocker", "child runner failed", "fallback entry"],
    missingDataSummary: ["last artifact", "runner result", "repair command"],
    safeActions: ["показать exact blocker", "показать last artifact"],
    approvalCandidates: ["approval-gated runtime action"],
    exactBlockers: ["screen.runtime доступен только dev/admin и не должен показываться обычному пользователю"],
    buttonIntents: [
      { label: "Показать exact blocker", actionKind: "safe_read" },
      { label: "Показать repair command", actionKind: "draft_only" },
      { label: "Prepare approval-gated runtime action", actionKind: "approval_required" },
      { label: "Write screen state directly", actionKind: "forbidden", userFacingReason: "Runtime screen не пишет состояние напрямую." },
    ],
  },
};

function requireFoundationContract(screenId: string): MagicFoundationContract {
  const contract = FOUNDATION_CONTRACTS[screenId];
  if (!contract) {
    throw new Error(`BLOCKED_AI_CHAT_FOUNDATION_CONTRACT_MISSING:${screenId}`);
  }
  return contract;
}

function toQa(questions: readonly string[]): AiScreenMagicQa[] {
  const merged = [...questions, ...DEFAULT_QA];
  return [...new Set(merged.map((question) => question.trim()).filter(Boolean))]
    .slice(0, 5)
    .map((question) => ({
      question,
      answerIntent: "answer_from_hydrated_screen_context",
    }));
}

function requireBlueprint(screenId: string): MagicBlueprint {
  const blueprint = BLUEPRINTS[screenId];
  if (!blueprint) {
    throw new Error(`BLOCKED_AI_SCREEN_MAGIC_BLUEPRINT_MISSING:${screenId}`);
  }
  return blueprint;
}

export function listAiScreenMagicRegistry(): AiScreenMagicRegistryEntry[] {
  return listAiScreenWorkflowRegistry().map((entry) => {
    const blueprint = requireBlueprint(entry.screenId);
    const contract = requireFoundationContract(entry.screenId);
    return {
      screenId: entry.screenId,
      roleScope: entry.screenId === "screen.runtime" ? ["admin", "developer"] : [...entry.roleScope],
      domain: entry.domain,
      userGoal: blueprint.userGoal,
      userHeader: contract.userHeader,
      screenSummary: blueprint.screenSummary,
      visibleDomainData: contract.visibleDomainData,
      riskSummary: contract.riskSummary,
      missingDataSummary: contract.missingDataSummary,
      safeActions: contract.safeActions,
      approvalCandidates: contract.approvalCandidates,
      exactBlockers: contract.exactBlockers,
      preparedWork: blueprint.preparedWork,
      buttonLabels: blueprint.buttonLabels,
      buttonIntents: contract.buttonIntents,
      qa: toQa(blueprint.qa),
    };
  });
}

export function getAiScreenMagicRegistryEntry(screenId: string): AiScreenMagicRegistryEntry | null {
  const workflow = getAiScreenWorkflowRegistryEntry(screenId);
  if (!workflow) return null;
  return listAiScreenMagicRegistry().find((entry) => entry.screenId === workflow.screenId) ?? null;
}

export function getAiScreenMagicCoverageCount(): number {
  return listAiScreenMagicRegistry().length;
}
