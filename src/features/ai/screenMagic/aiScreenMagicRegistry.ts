import {
  getAiScreenWorkflowRegistryEntry,
  listAiScreenWorkflowRegistry,
} from "../screenWorkflows/aiScreenWorkflowRegistry";
import type {
  AiScreenMagicActionKind,
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

function toQa(questions: readonly string[]): AiScreenMagicQa[] {
  const merged = [...questions, ...DEFAULT_QA];
  return [...new Set(merged.map((question) => question.trim()).filter(Boolean))]
    .slice(0, 5)
    .map((question) => ({
      question,
      answerIntent: "answer_from_hydrated_screen_context",
    }));
}

function fallbackBlueprint(screenId: string): MagicBlueprint {
  return {
    userGoal: "AI prepares safe screen-specific work from hydrated context and audited action policy.",
    screenSummary: `Готово от AI · ${screenId}`,
    preparedWork: prepared(["Сегодня / Сейчас", "Критические", "Недостающие данные", "Следующий шаг"]),
    buttonLabels: {},
    qa: DEFAULT_QA,
  };
}

export function listAiScreenMagicRegistry(): AiScreenMagicRegistryEntry[] {
  return listAiScreenWorkflowRegistry().map((entry) => {
    const blueprint = BLUEPRINTS[entry.screenId] ?? fallbackBlueprint(entry.screenId);
    return {
      screenId: entry.screenId,
      roleScope: [...entry.roleScope],
      domain: entry.domain,
      userGoal: blueprint.userGoal,
      screenSummary: blueprint.screenSummary,
      preparedWork: blueprint.preparedWork,
      buttonLabels: blueprint.buttonLabels,
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
