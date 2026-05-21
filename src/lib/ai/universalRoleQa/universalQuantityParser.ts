import { normalizeUniversalRoleQaQuestion } from "./universalQuestionNormalizer";

export type UniversalRoleQaQuantity = {
  value: number;
  unit: string;
  source: "question" | "app_data" | "pdf" | "unknown";
};

export type UniversalRoleQaAmount = {
  min?: number;
  max?: number;
  currency?: string;
};

export function parseUniversalRoleQaQuantity(questionRu: string): UniversalRoleQaQuantity | undefined {
  const text = normalizeUniversalRoleQaQuestion(questionRu);
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(м2|м²|кв|кв\.?м|лист|листа|шт|штук|точек|м3|кг|тонн?)/);
  if (!match) return undefined;
  const unit = match[2].startsWith("кв") || match[2] === "м²" ? "м2" : match[2];
  return {
    value: Number(match[1].replace(",", ".")),
    unit,
    source: "question",
  };
}

export function parseUniversalRoleQaAmount(questionRu: string): UniversalRoleQaAmount | undefined {
  const text = normalizeUniversalRoleQaQuestion(questionRu).replace(/\s+(?=\d{3}\b)/g, "");
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(kgs|сом|usd|eur|rub)/);
  if (!match) return undefined;
  return {
    min: Number(match[1].replace(",", ".")),
    max: Number(match[1].replace(",", ".")),
    currency: match[2].toUpperCase() === "СОМ" ? "KGS" : match[2].toUpperCase(),
  };
}
