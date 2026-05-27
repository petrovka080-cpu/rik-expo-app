import { builtInAiEstimateText } from "./builtInAiToolRegistry";
import type { BuiltInAiIntentRoute, BuiltInAiProductSearchResult, BuiltInAiToolResult } from "./builtInAiTypes";

function money(value: number | null, currency: string): string {
  if (value == null) return "цена недоступна";
  return `${Math.round(value).toLocaleString("ru-RU")} ${currency}`;
}

function composeProductSearch(result: BuiltInAiProductSearchResult): string {
  return [
    "## Найденные материалы / товары",
    "",
    "| № | Товар / материал | Кол-во нужно | Цена | Источник | Статус |",
    "|---|---|---:|---:|---|---|",
    ...result.candidates.map((candidate, index) => {
      const evidence = candidate.sourceEvidence[0];
      const source = evidence ? `${evidence.label}, checked ${evidence.checkedAt}, confidence ${evidence.confidence}` : "source missing";
      const status = candidate.stockKnown ? candidate.availabilityStatus : "наличие не заявлено, нужен marketplace/supplier confirm";
      return `| ${index + 1} | ${candidate.title} | ${candidate.neededQuantity} ${candidate.unit} | ${money(candidate.unitPrice, candidate.currency)} | ${source} | ${status} |`;
    }),
    "",
    "## Что уточнить",
    "- город и адрес доставки;",
    "- бренд, класс/марка и требования к качеству;",
    "- нужен ли запас, разгрузка и подъем;",
    "- подтвержденное наличие у продавца.",
    "",
    "Действия: Создать закупку / Сделать PDF / Обновить цены.",
  ].join("\n");
}

export function composeBuiltInAiAnswer(route: BuiltInAiIntentRoute, result: BuiltInAiToolResult): string {
  const estimateText = builtInAiEstimateText(result);
  if (estimateText) return estimateText;
  if (result.blockedBy === "AMBIGUOUS_NEEDS_DISAMBIGUATION" && result.fallbackUsed) return result.fallbackUsed;
  if (result.blockedBy === "TEMPLATE_GAP_SAFE_TRIAGE" && result.fallbackUsed) return result.fallbackUsed;
  if (result.productSearch) return composeProductSearch(result.productSearch);
  if (route.intent === "pdf_action") {
    return "PDF создается только из структурированной сметы или подбора. Откройте смету и нажмите «Сделать PDF».";
  }
  if (route.intent === "request_draft") {
    return "Черновик заявки создается через backend-service. Для известной сметы сначала будет вызван calculate_global_estimate.";
  }
  if (route.intent === "role_status_qa") {
    return "Ролевой статус доступен только когда вопрос не является сметой, подбором товара или PDF-действием.";
  }
  return "Я могу помочь со сметой, подбором материалов, marketplace, PDF или ролевым вопросом. Для сметы укажите вид работ и объем.";
}
