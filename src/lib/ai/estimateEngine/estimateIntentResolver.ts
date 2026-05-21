import type { AiQuestionKnowledgeMode } from "./estimateTypes";

export function normalizeAiQuestionText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function resolveAiQuestionKnowledgeMode(questionRu: string): AiQuestionKnowledgeMode | null {
  const question = normalizeAiQuestionText(questionRu);
  if (!question) return null;

  if (hasAny(question, [/проводк/, /учитывать аванс/, /учет аванс/, /учёт аванс/, /налог/, /финанс/])) {
    return "accounting_reference";
  }

  if (hasAny(question, [/документ.*нужн.*оплат/, /нужн.*документ.*оплат/, /для оплаты/, /документ.*расхожд/, /расхожд.*документ/])) {
    return "accounting_reference";
  }

  if (hasAny(question, [/найди.*поставщик/, /поставщик/, /сравни.*цен/, /подбери.*аналог/, /аналоги/])) {
    return "public_supplier_search";
  }

  if (hasAny(question, [/расход/, /сколько.*нужно/, /посчитай.*материал/])) {
    return "public_material_calculation";
  }

  if (hasAny(question, [/как принять/, /как проверить/, /чек.?лист качества/, /сдачи работы/, /сдать работу/, /гидроизоляц/, /приемк/, /приёмк/])) {
    return "public_construction_technology";
  }

  if (hasAny(question, [/смет/, /стоимост/, /сколько стоит/, /расценк/, /укладк/, /установк/, /асфальт/, /паркет/, /ламинат/])) {
    return "public_construction_estimate";
  }

  return null;
}
