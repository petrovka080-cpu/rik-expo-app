import type { AssistantContext } from "../assistant.types";
import type { AiScreenNativeAssistantRegistryEntry } from "./aiScreenNativeAssistantTypes";

const ready = (screenId: string, coverageGroup: string, roleScope: string[], domain: string, title: string, summary: string, option: string, actions: string[], contexts: AssistantContext[], questions: string[]): AiScreenNativeAssistantRegistryEntry => ({
  screenId,
  coverageGroup,
  roleScope,
  domain,
  title,
  defaultSummary: summary,
  defaultReadyOptionTitle: option,
  defaultReadyOptionDescription: "AI prepared a screen-native work pack from the current read-only screen context. If evidence is missing, it is shown as missing data instead of being invented.",
  defaultNextActions: actions,
  contexts,
  chatStarterQuestions: questions,
});

export const AI_SCREEN_NATIVE_ASSISTANT_REGISTRY: readonly AiScreenNativeAssistantRegistryEntry[] = [
  ready("accountant.main", "accountant.main", ["accountant"], "finance", "Финансы сегодня", "Платежи, документы, риски и кандидаты на согласование собраны для проверки бухгалтером.", "Проверить критические оплаты", ["Проверить критические", "Собрать отчёт за сегодня", "Подготовить rationale", "Запросить документы", "Отправить на согласование"], ["accountant"], ["Что сегодня критично по оплатам?", "Сделай краткий отчёт по оплатам за сегодня."]),
  ready("accountant.payment", "accountant.payment", ["accountant"], "finance", "AI-проверка платежа", "Платёж разобран по основанию, документам, сумме, рискам и approval status.", "Подготовить rationale платежа", ["Проверить документы", "Подготовить rationale", "Запросить подтверждение", "Отправить на согласование"], ["accountant"], ["Почему этот платёж рискованный?", "Каких документов не хватает?"]),
  ready("accountant.history", "accountant.history", ["accountant"], "finance", "История оплат", "История оплат подготовлена для поиска повторяющихся missing documents, аномальных сумм и поставщиков с ручной проверкой.", "Показать отклонения", ["Показать отклонения", "Сравнить поставщиков", "Собрать отчёт по рискам"], ["accountant"], ["Что изменилось по истории оплат?", "Какие поставщики чаще требуют документы?"]),
  ready("buyer.main", "buyer.main", ["buyer"], "procurement", "Снабжение сегодня", "Входящие заявки, approved requests, варианты закупа, риски и следующие procurement actions собраны заранее.", "Разобрать входящие заявки", ["Разобрать входящие", "Смотреть варианты закупа", "Сравнить поставщиков", "Запросить цены", "Отправить выбор на согласование"], ["buyer", "request"], ["Что смотреть первым по заявке?", "Какие варианты закупа уже готовы?"]),
  ready("buyer.requests", "buyer.requests", ["buyer"], "procurement", "Очередь заявок снабжения", "Заявки превращены в очередь работы: срочность, approval status, готовые варианты, риски и missing data.", "Смотреть варианты по заявке", ["Смотреть варианты", "Сравнить", "Подготовить запрос", "Проверить риски"], ["buyer", "request"], ["Какую заявку открыть первой?", "Где не хватает данных?"]),
  ready("buyer.request.detail", "buyer.request.detail", ["buyer"], "procurement", "Готовые варианты закупки", "Деталь заявки показывает supplier options, покрытие, риски, missing data и безопасный следующий шаг.", "Сравнить варианты закупки", ["Смотреть варианты", "Сравнить", "Подготовить запрос", "Отправить выбор на согласование"], ["buyer", "request"], ["Почему этот вариант лучше?", "Что не хватает для выбора?"]),
  ready("procurement.copilot", "procurement.copilot", ["buyer"], "procurement", "Procurement workbench", "Workbench подготовил internal-first recommendation, comparison, risk summary, draft supplier request и approval candidate.", "Подготовить supplier request", ["Сравнить поставщиков", "Проверить missing data", "Подготовить запрос", "Подготовить approval candidate"], ["buyer", "request"], ["Почему первый поставщик лучше?", "Что отправить директору?"]),
  ready("market.home", "market.home", ["buyer", "office"], "market", "Рынок и внешние варианты", "Внешний поиск используется только как cited preview, когда внутренних данных недостаточно.", "Подготовить внешний запрос", ["Подготовить внешний запрос", "Показать cited варианты", "Сравнить с внутренними"], ["market"], ["Где нужны внешние источники?", "Какие варианты только cited preview?"]),
  ready("supplier.showcase", "supplier.showcase", ["buyer"], "procurement", "Карточка поставщика", "Поставщик разобран по покрытию, надёжности, связанным заявкам, missing data и approval-safe actions.", "Сравнить поставщика", ["Сравнить с другим", "Подготовить запрос", "Добавить в shortlist", "Отправить выбор на approval"], ["market"], ["Для каких заявок подходит поставщик?", "Где риски по поставщику?"]),
  ready("warehouse.main", "warehouse.main", ["warehouse"], "warehouse", "Склад сегодня", "Дефицит, приходы, выдачи, расхождения и спорные позиции подготовлены для кладовщика.", "Показать дефицит", ["Показать дефицит", "Подготовить проверку прихода", "Черновик перемещения", "Отправить спорные позиции на approval"], ["warehouse"], ["Что рискованно выдавать?", "Что проверить первым на складе?"]),
  ready("warehouse.incoming", "warehouse.incoming", ["warehouse"], "warehouse", "Приход", "Приход проверен на совпадения с заявкой, документы, спорные позиции и ручную проверку.", "Показать список расхождений", ["Список расхождений", "Запросить документ", "Отправить спорные позиции на согласование"], ["warehouse"], ["Что нельзя принимать?", "Каких документов не хватает?"]),
  ready("warehouse.issue", "warehouse.issue", ["warehouse"], "warehouse", "Выдача материалов", "Выдача подготовлена как черновик: кому, что запрошено, что доступно, дефицит и approval candidates.", "Черновик выдачи", ["Черновик выдачи", "Показать дефицит", "Предложить альтернативу", "Отправить на approval"], ["warehouse"], ["Что рискованно выдавать?", "Какая альтернатива есть?"]),
  ready("director.dashboard", "director.dashboard", ["director"], "control", "Решения на сегодня", "Критические решения, approvals, блокеры работ, деньги и закупки собраны в decision queue.", "Открыть критические решения", ["Открыть approval inbox", "Показать критические", "Показать что блокирует работы", "Запросить недостающие данные"], ["director"], ["Что требует моего решения сегодня?", "Что блокирует работы?"]),
  ready("director.finance", "director.finance", ["director"], "control", "Финансовые решения", "Рискованные платежи, необычные суммы, missing evidence и approval queue собраны для директора.", "Открыть рискованные платежи", ["Открыть рискованные платежи", "Сравнить историю поставщика", "Запросить rationale", "Approve/Reject через inbox"], ["director"], ["Какие платежи опасные?", "Где не хватает evidence?"]),
  ready("director.reports", "director.reports", ["director"], "control", "Executive summary", "Отчёты сведены в executive summary: закупки, склад, финансы, документы, evidence и решения.", "Сформировать summary", ["Сформировать summary", "Открыть риски", "Подготовить report draft", "Показать evidence"], ["director", "reports"], ["Что ухудшилось?", "Какое главное решение?"]),
  ready("ai.command_center", "ai.command_center", ["director", "buyer", "accountant", "warehouse", "foreman"], "command_center", "AI Command Center", "Следующие действия собраны как task queue: кому, почему, риск и approval status.", "Открыть next actions", ["Создать черновик задачи", "Открыть approval status", "Показать риски", "Подготовить summary"], ["unknown"], ["Какие следующие действия?", "Что требует approval?"]),
  ready("approval.inbox", "approval.inbox", ["director"], "approval", "На согласовании", "Каждая approval item показывает предложение, evidence, риски, последствия approval и запреты без approval.", "Открыть evidence", ["Approve", "Reject", "Запросить данные", "Открыть evidence"], ["director"], ["Почему это на согласовании?", "Что будет после approval?"]),
  ready("foreman.main", "foreman.main", ["foreman"], "projects", "Работы сегодня", "Closeout work, акты, reports, missing evidence, материалы и сообщения подрядчикам подготовлены заранее.", "Подготовить акт", ["Подготовить акт", "Подготовить отчёт", "Проверить missing evidence", "Написать подрядчику"], ["foreman"], ["Что закрыть сегодня?", "Каких evidence не хватает?"]),
  ready("foreman.ai.quick_modal", "foreman.ai.quick_modal", ["foreman"], "projects", "Быстрый workbench", "Быстрый AI прораба готовит акт, отчёт, missing evidence checklist или сообщение подрядчику.", "Выбрать черновик", ["Акт по текущей работе", "Отчёт за день", "Список missing evidence", "Сообщение подрядчику"], ["foreman"], ["Что можно подготовить?", "Что нельзя отправлять без проверки?"]),
  ready("foreman.subcontract", "foreman.subcontract", ["foreman"], "projects", "Subcontract status", "Субподряд разобран по выполненному, неподтверждённому, документам, рискам и draft actions.", "Подготовить акт", ["Подготовить акт", "Запросить документы", "Написать подрядчику"], ["foreman"], ["Что не подтверждено?", "Какие документы нужны?"]),
  ready("contractor.main", "contractor.main", ["contractor"], "projects", "Что нужно сдать", "Подрядчик видит missing evidence, документы, замечания и готовый безопасный ответ.", "Подготовить ответ", ["Подготовить ответ", "Список документов", "Что мешает приёмке"], ["contractor"], ["Что от меня ждут?", "Что мешает приёмке?"]),
  ready("documents.main", "documents", ["office", "accountant", "director"], "documents", "Документ", "Документ разобран по смыслу, связям, важным полям, missing evidence, рискам и draft actions.", "Подготовить резюме", ["Подготовить резюме", "Запросить missing evidence", "Подготовить комментарий"], ["reports", "profile"], ["Что важно в документе?", "Каких evidence не хватает?"]),
  ready("agent.documents.knowledge", "documents", ["office", "accountant", "director"], "documents", "Документы и knowledge", "Документная knowledge-панель показывает смысл, связи, evidence gaps и safe drafts.", "Подготовить резюме", ["Подготовить резюме", "Запросить missing evidence", "Подготовить комментарий"], ["reports", "profile"], ["К чему относится документ?", "Какой риск по документу?"]),
  ready("reports.modal", "reports.modal", ["office", "director", "foreman"], "reports", "Черновик отчёта", "Report modal подготовил события, риски, missing evidence, связанные заявки, платежи и документы.", "Собрать отчёт", ["Собрать отчёт", "Проверить evidence", "Добавить missing data", "Сохранить черновик"], ["reports"], ["Что включить в отчёт?", "Где missing evidence?"]),
  ready("chat.main", "chat.main", ["office"], "chat", "Итоги обсуждения", "Чат превращён в action extraction: итоги, договорённости, задачи, риски и approval candidates.", "Подготовить summary", ["Создать черновик задачи", "Подготовить summary", "Отправить на approval"], ["unknown"], ["Какие задачи из обсуждения?", "Что отправить на approval?"]),
  ready("map.main", "map.main", ["buyer", "warehouse", "office"], "logistics", "Логистика", "Карта показывает объекты, поставщиков рядом, доставку, логистические риски и влияние на сроки.", "Сравнить логистику", ["Сравнить поставщиков по логистике", "Показать риски маршрута", "Подготовить запрос доставки"], ["supplierMap", "market"], ["Кто ближе к объекту?", "Как доставка влияет на срок?"]),
  ready("office.hub", "office.hub", ["office"], "office", "Офис сегодня", "Офисный hub показывает зависшие документы, заявки без движения, отчёты, просрочки и approval candidates.", "Открыть просроченные", ["Открыть просроченные", "Собрать документы", "Подготовить reminder", "Отправить на approval"], ["profile"], ["Что зависло?", "Что просрочено?"]),
  ready("security.screen", "security.screen", ["security", "admin"], "security", "Security overview", "Security overview показывает risk roles, forbidden attempts, suspicious approvals и service-role risks.", "Открыть risk roles", ["Открыть risk roles", "Проверить forbidden attempts", "Собрать security report"], ["security"], ["Где рискованные роли?", "Был ли service-role green path?"]),
  ready("screen.runtime", "screen.runtime", ["admin", "developer"], "runtime", "Runtime diagnosis", "Runtime diagnosis доступен только dev/admin и показывает health, transport binding, blockers and artifacts.", "Проверить blocker", ["Открыть last artifact", "Проверить transport binding", "Показать failing runner"], ["security"], ["Что сломалось?", "Какой exact blocker?"]),
];

export function listAiScreenNativeAssistantRegistry(): AiScreenNativeAssistantRegistryEntry[] {
  return [...AI_SCREEN_NATIVE_ASSISTANT_REGISTRY];
}

export function listAiScreenNativeCoverageGroups(): string[] {
  return [...new Set(AI_SCREEN_NATIVE_ASSISTANT_REGISTRY.map((entry) => entry.coverageGroup))];
}

export function getAiScreenNativeAssistantRegistryEntry(screenId: string): AiScreenNativeAssistantRegistryEntry | null {
  return AI_SCREEN_NATIVE_ASSISTANT_REGISTRY.find((entry) => entry.screenId === screenId) ?? null;
}

export function resolveDefaultScreenNativeScreenId(context: AssistantContext): string {
  switch (context) {
    case "accountant":
      return "accountant.main";
    case "buyer":
    case "request":
      return "buyer.main";
    case "warehouse":
      return "warehouse.main";
    case "foreman":
      return "foreman.main";
    case "contractor":
      return "contractor.main";
    case "director":
      return "director.dashboard";
    case "market":
      return "market.home";
    case "supplierMap":
      return "map.main";
    case "reports":
      return "documents.main";
    case "profile":
      return "office.hub";
    case "security":
      return "security.screen";
    default:
      return "chat.main";
  }
}
