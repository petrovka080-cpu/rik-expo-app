import { CONSTRUCTION_DOMAIN_MAP } from "../worldConstructionOntology";
import { normalizeConstructionPrompt } from "./normalizeConstructionPrompt";

const estimateTriggers = [
  "смет",
  "стоим",
  "сколько стоит",
  "посчитай",
  "рассчитай",
  "цена работ",
  "quote",
  "estimate",
  "boq",
  "cost",
];

const constructionActions = [
  "уложить",
  "установка",
  "установить",
  "монтаж",
  "смонтировать",
  "кладка",
  "построить",
  "ремонт",
  "выполнить",
  "гидроизоля",
  "асфальтирование",
  "бурение",
  "замена",
  "демонтаж",
  "заливка",
  "покраска",
  "install",
  "build",
  "repair",
  "waterproof",
  "pave",
];

const domainTokens = CONSTRUCTION_DOMAIN_MAP.flatMap((definition) => [
  definition.labelRu,
  ...definition.objects,
  ...definition.operations,
  ...definition.methods,
  ...definition.materialSystems,
  ...definition.laborTypes,
]);

export function detectConstructionIntent(text: string): {
  isConstruction: boolean;
  isEstimate: boolean;
  confidence: "high" | "medium" | "low";
} {
  const normalized = normalizeConstructionPrompt(text);
  const estimate = estimateTriggers.some((token) => normalized.includes(token));
  const construction =
    constructionActions.some((token) => normalized.includes(token)) ||
    domainTokens.some((token) => normalized.includes(normalizeConstructionPrompt(String(token))));
  const hasQuantity = /\d/.test(normalized);
  const isConstruction = construction || (estimate && hasQuantity);
  const isEstimate = estimate || (construction && hasQuantity);
  const confidence = estimate && construction ? "high" : estimate || construction ? "medium" : "low";
  return { isConstruction, isEstimate, confidence };
}
