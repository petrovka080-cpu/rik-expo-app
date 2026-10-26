import type { UniversalRoleQaAnswer } from "./universalAnswerComposer";

function disclosureRu(answer: UniversalRoleQaAnswer): string[] {
  return [
    `данные приложения: ${answer.sourceDisclosure.appData}`,
    `PDF/документы: ${answer.sourceDisclosure.pdfDocuments}`,
    `marketplace: ${answer.sourceDisclosure.marketplace}`,
    `история поставщиков: ${answer.sourceDisclosure.supplierHistory}`,
    `внешний источник: ${answer.sourceDisclosure.externalWeb}`,
    `общие знания: ${answer.sourceDisclosure.generalKnowledge}`,
  ];
}

export function adaptUniversalRoleQaAnswerToUiText(answer: UniversalRoleQaAnswer): string {
  const lines = [
    "Коротко:",
    answer.shortAnswerRu,
    "",
    ...answer.sections.flatMap((section) => [
      `${section.titleRu}:`,
      ...section.items.map((item) => `- ${item.textRu}`),
      "",
    ]),
    "Открыть:",
    ...(answer.openLinks.length
      ? answer.openLinks.map((link) => `- ${link.labelRu}${link.enabled ? "" : ` (${link.disabledReasonRu ?? "доступ ограничен"})`}`)
      : ["- внутренних ссылок для текущего ответа нет"]),
    "",
    "Источник ответа:",
    ...disclosureRu(answer).map((line) => `- ${line}`),
    "",
    "Чего не хватает:",
    ...(answer.missingData.length ? answer.missingData.map((item) => `- ${item}`) : ["- критичных недостающих данных не найдено"]),
    "",
    "Следующий шаг:",
    answer.nextStepRu,
    "",
    "Статус:",
    answer.statusRu,
  ];

  return lines.join("\n");
}
