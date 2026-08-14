export type CanonicalEstimateIntent = "estimate" | "request_draft" | null;

const ESTIMATE_SIGNAL = /(?:\bboq\b|\bestimate\b|\bquote\b|\bcost\b|смет|расс?ч[её]т|посчитай|сколько\s+стоит|стоимост|расценк)/iu;
const CONSTRUCTION_SIGNAL = /(?:гкл|гипсокартон|асфальт|дорог|электр|розет|кабел|ремонт|монтаж|демонтаж|кладк|бетон|фасад|кровл|штукатур|шпакл|плитк|сантех|вентиляц|отоплен|drywall|asphalt|electrical|construction|install|repair|pave)/iu;
const QUANTITY_SIGNAL = /(?:\d+(?:[.,]\d+)?\s*(?:м(?:²|2|³|3)?|mm|cm|m2|m3|sqm|шт|кг|т|pcs?)\b)/iu;
const REQUEST_SIGNAL = /(?:заявк|заказ|отправ|подрядчик|request|order)/iu;

/** Lightweight ingress classifier. Catalog resolution and calculation stay on the backend. */
export function classifyCanonicalEstimateIntent(text: string): CanonicalEstimateIntent {
  const value = String(text ?? "").trim();
  if (!value) return null;
  const estimate = ESTIMATE_SIGNAL.test(value) || (CONSTRUCTION_SIGNAL.test(value) && QUANTITY_SIGNAL.test(value));
  if (!estimate) return null;
  return REQUEST_SIGNAL.test(value) ? "request_draft" : "estimate";
}
