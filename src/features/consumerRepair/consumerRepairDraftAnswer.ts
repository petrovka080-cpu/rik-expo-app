import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import { formatEstimateUserTextRu } from "../../lib/ai/globalEstimate/formatEstimateUserTextRu";
import type { ConsumerRepairAiDraft } from "../../lib/consumerRequests/consumerRequestTypes";

export function composeConsumerRepairDraftAnswerRu(
  draft: ConsumerRepairAiDraft,
): string {
  return [
    "Коротко:",
    formatEstimateUserTextRu(draft.summaryRu),
    "",
    "Позиции:",
    ...draft.items.map(
      (item, index) =>
        `${index + 1}. ${item.titleRu} - ${item.quantity} ${formatEstimateUnitLabel(item.unit)}`,
    ),
    "",
    "Что уточнить:",
    ...draft.missingData.map((item) => `- ${item}`),
    "",
    "Следующий шаг:",
    "Проверьте количество и нажмите «Утвердить заявку».",
    "",
    "Статус:",
    "Черновик. Не отправлен.",
  ].join("\n");
}
