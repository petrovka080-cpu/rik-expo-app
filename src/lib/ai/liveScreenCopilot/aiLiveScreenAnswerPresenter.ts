import type { AiAppEntityType, AiSourceRef } from "../appContextGraph";
import {
  answerUniversalRoleQa,
  type UniversalRoleQaAnswer,
  type UniversalRoleQaOpenLink,
} from "../universalRoleQa";
import type { AiLiveScreenButton } from "./aiLiveScreenButtonContract";
import {
  createAiLiveScreenQaInput,
  type AiLiveScreenCopilotRunOptions,
} from "./aiLiveScreenContextAdapter";
import { getAiLiveScreenManifest, type AiLiveScreenManifest } from "./aiLiveScreenManifest";
import { validateAiLiveButtonResult } from "./aiLiveScreenResultGuard";

export type AiLiveScreenPresentedOpenLink = {
  labelRu: string;
  sourceRefId: string;
  route?: string;
  enabled: boolean;
  entityType?: AiAppEntityType;
  disabledReasonRu?: string;
};

export type AiLiveScreenButtonAnswer = {
  manifest: AiLiveScreenManifest;
  button: AiLiveScreenButton;
  universalAnswer: UniversalRoleQaAnswer;
  presentedTextRu: string;
  sourceRefs: AiSourceRef[];
  openLinks: AiLiveScreenPresentedOpenLink[];
  safetyStatus: UniversalRoleQaAnswer["safetyStatus"];
  guard: ReturnType<typeof validateAiLiveButtonResult>;
  providerCallAllowed: false;
  dbWriteUsed: false;
  directMutationUsed: false;
};

function statusRu(answer: UniversalRoleQaAnswer, button: AiLiveScreenButton): string {
  if (button.actionMode === "approval_required") return "Требуется согласование";
  if (button.actionMode === "draft_only") return "Черновик подготовлен";
  if (answer.safetyStatus.approvalRequired) return "Требуется согласование";
  if (answer.safetyStatus.draftOnly) return "Черновик подготовлен";
  return "Данные не изменены";
}

function sourceDisclosureRu(answer: UniversalRoleQaAnswer): string[] {
  const mapValue = {
    used: "использованы",
    checked_empty: "проверены, не найдено",
    not_applicable: "не применимо",
    permission_limited: "доступ ограничен",
    not_used: "не нужен",
    not_connected: "не подключён",
    not_allowed: "не разрешён",
    used_as_draft: "черновик, не проектный факт",
  } as const;

  return [
    `данные приложения: ${mapValue[answer.sourceDisclosure.appData]}`,
    `PDF/документы: ${mapValue[answer.sourceDisclosure.pdfDocuments]}`,
    `маркетплейс: ${mapValue[answer.sourceDisclosure.marketplace]}`,
    `история поставщиков: ${mapValue[answer.sourceDisclosure.supplierHistory]}`,
    `внешний источник: ${mapValue[answer.sourceDisclosure.externalWeb]}`,
    `общие знания: ${mapValue[answer.sourceDisclosure.generalKnowledge]}`,
  ];
}

function entityLabel(entityType: AiAppEntityType): string {
  const labels: Record<AiAppEntityType, string> = {
    procurement_request: "Заявка",
    procurement_request_line: "Строка заявки",
    purchase_order: "Закупка",
    warehouse_stock: "Остаток склада",
    warehouse_incoming: "Приход склада",
    warehouse_issue: "Выдача склада",
    warehouse_reservation: "Резерв склада",
    work: "Работа",
    task: "Задача",
    object: "Объект",
    building: "Здание",
    floor: "Этаж",
    zone: "Зона",
    material: "Материал",
    marketplace_product: "Товар",
    supplier: "Поставщик",
    contractor: "Подрядчик",
    payment: "Платёж",
    invoice: "Счёт",
    act: "Акт",
    contract: "Договор",
    document: "Документ",
    pdf_document: "PDF",
    document_chunk: "Фрагмент документа",
    report: "Отчёт",
    approval: "Согласование",
    photo: "Фото",
    video: "Видео",
    media_asset: "Медиа",
    media_group: "Группа медиа",
    user: "Пользователь",
    company: "Компания",
  };
  return labels[entityType];
}

function relationChain(refs: readonly AiSourceRef[]): string {
  const ordered: AiAppEntityType[] = [
    "procurement_request",
    "warehouse_issue",
    "work",
    "pdf_document",
    "payment",
    "marketplace_product",
    "supplier",
  ];
  const present = ordered.filter((type) => refs.some((ref) => ref.entityType === type));
  return present.length > 1
    ? present.map(entityLabel).join(" → ")
    : "связи проверены через граф контекста приложения";
}

function shortAnswer(button: AiLiveScreenButton, answer: UniversalRoleQaAnswer): string {
  if (button.actionMode === "draft_only") {
    return `По кнопке «${button.labelRu}» подготовлен безопасный черновик. Данные приложения не изменены.`;
  }
  if (button.actionMode === "approval_required") {
    return `По кнопке «${button.labelRu}» подготовлена справка. Требуется проверка и согласование.`;
  }
  if (answer.sourceRefs.length > 0) {
    return `По кнопке «${button.labelRu}» найдено ${answer.sourceRefs.length} связанных источников приложения.`;
  }
  return `По кнопке «${button.labelRu}» выполнена проверка. Подходящие внутренние объекты не найдены.`;
}

function foundLines(button: AiLiveScreenButton, answer: UniversalRoleQaAnswer): string[] {
  const byType = new Map<AiAppEntityType, number>();
  for (const ref of answer.sourceRefs) {
    byType.set(ref.entityType, (byType.get(ref.entityType) ?? 0) + 1);
  }
  const fromRefs = [...byType.entries()].slice(0, 6).map(([type, count]) => `${entityLabel(type)}: ${count}`);
  const expectedAreas = button.expectedOpenLinkTypes
    .filter((type) => !byType.has(type))
    .slice(0, 3)
    .map((type) => `Проверенная область: ${entityLabel(type)}`);
  const buttonLine = `Проверен запрос кнопки: ${button.expectedAnswerSignalsRu.join(", ")}.`;
  if (fromRefs.length === 0) {
    return [
      buttonLine,
      ...expectedAreas,
      "Подходящие записи не найдены в доступном графе контекста.",
    ];
  }
  return [buttonLine, ...fromRefs, ...expectedAreas];
}

function missingLines(button: AiLiveScreenButton, answer: UniversalRoleQaAnswer): string[] {
  if (button.actionMode === "draft_only") {
    return ["нужна проверка человеком перед финальным действием"];
  }
  if (button.actionMode === "approval_required") {
    return ["нужно согласование ответственного специалиста"];
  }
  if (answer.missingData.length > 0) return answer.missingData.slice(0, 4);
  return ["критичных недостающих данных не найдено"];
}

function normalizeOpenLinks(answer: UniversalRoleQaAnswer): AiLiveScreenPresentedOpenLink[] {
  const refById = new Map(answer.sourceRefs.map((ref) => [ref.id, ref]));
  return answer.openLinks.map((link: UniversalRoleQaOpenLink) => {
    const ref = refById.get(link.sourceRefId);
    return {
      labelRu: ref ? entityLabel(ref.entityType) : link.labelRu,
      sourceRefId: link.sourceRefId,
      route: link.route,
      enabled: link.enabled,
      entityType: ref?.entityType,
      disabledReasonRu: link.disabledReasonRu,
    };
  });
}

export function presentAiLiveScreenAnswer(input: {
  manifest: AiLiveScreenManifest;
  button: AiLiveScreenButton;
  answer: UniversalRoleQaAnswer;
}): { textRu: string; openLinks: AiLiveScreenPresentedOpenLink[] } {
  const links = normalizeOpenLinks(input.answer);
  const openLines = links.length > 0
    ? links.slice(0, 8).map((link) => `- ${link.labelRu}${link.enabled ? "" : ` (${link.disabledReasonRu ?? "доступ ограничен"})`}`)
    : ["- внутренних ссылок для текущего ответа нет"];

  const lines = [
    "Коротко:",
    shortAnswer(input.button, input.answer),
    "",
    "Что найдено:",
    ...foundLines(input.button, input.answer).map((line) => `- ${line}`),
    "",
    "Связи:",
    `- ${relationChain(input.answer.sourceRefs)}`,
    "",
    "Открыть:",
    ...openLines,
    "",
    "Источник ответа:",
    ...sourceDisclosureRu(input.answer).map((line) => `- ${line}`),
    "",
    "Чего не хватает:",
    ...missingLines(input.button, input.answer).map((line) => `- ${line}`),
    "",
    "Следующий шаг:",
    input.button.actionMode === "draft_only"
      ? "Проверить черновик и отправить на согласование, если всё верно."
      : "Открыть связанные объекты и проверить недостающие связи без изменения данных.",
    "",
    "Статус:",
    statusRu(input.answer, input.button),
  ];

  return { textRu: lines.join("\n"), openLinks: links };
}

export function answerAiLiveScreenButton(
  button: AiLiveScreenButton,
  options: AiLiveScreenCopilotRunOptions = {},
): AiLiveScreenButtonAnswer {
  const manifest = getAiLiveScreenManifest(button.screenId);
  const universalAnswer = answerUniversalRoleQa(createAiLiveScreenQaInput(button, options));
  const presented = presentAiLiveScreenAnswer({ manifest, button, answer: universalAnswer });
  const guard = validateAiLiveButtonResult({
    button,
    answerTextRu: presented.textRu,
    sourceRefs: universalAnswer.sourceRefs,
    openLinks: presented.openLinks,
    safetyStatus: universalAnswer.safetyStatus,
    clicked: true,
    resultVisible: true,
  });

  return {
    manifest,
    button,
    universalAnswer,
    presentedTextRu: presented.textRu,
    sourceRefs: universalAnswer.sourceRefs,
    openLinks: presented.openLinks,
    safetyStatus: universalAnswer.safetyStatus,
    guard,
    providerCallAllowed: false,
    dbWriteUsed: false,
    directMutationUsed: false,
  };
}
