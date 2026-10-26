import {
  classifyConstructionWorkType,
  type ConstructionWorkType,
} from "./universalEntityExtractor";
import { parseUniversalRoleQaPeriod, type UniversalRoleQaPeriod } from "./universalPeriodParser";
import {
  parseUniversalRoleQaAmount,
  parseUniversalRoleQaQuantity,
  type UniversalRoleQaAmount,
  type UniversalRoleQaQuantity,
} from "./universalQuantityParser";
import { normalizeUniversalRoleQaQuestion } from "./universalQuestionNormalizer";

export type UniversalRoleQaStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "in_purchase"
  | "issued"
  | "closed"
  | "blocked"
  | "missing_docs"
  | "overdue"
  | "unknown";

export type UniversalRoleQaFilters = {
  period?: UniversalRoleQaPeriod;
  object?: { id?: string; nameRu?: string };
  building?: { id?: string; nameRu?: string };
  floor?: { number?: number; labelRu?: string };
  zone?: { id?: string; nameRu?: string };
  workType?: { id?: string; key?: ConstructionWorkType; labelRu?: string };
  material?: { id?: string; nameRu?: string; normalizedNameRu?: string };
  company?: { id?: string; nameRu?: string };
  supplier?: { id?: string; nameRu?: string };
  contractor?: { id?: string; nameRu?: string };
  status?: { normalized: UniversalRoleQaStatus; labelRu: string };
  amount?: UniversalRoleQaAmount;
  quantity?: UniversalRoleQaQuantity;
};

function extractFloor(text: string): UniversalRoleQaFilters["floor"] | undefined {
  if (/(перв|1)\s*этаж|первому/.test(text)) return { number: 1, labelRu: "1 этаж" };
  if (/(втор|2)\s*этаж/.test(text)) return { number: 2, labelRu: "2 этаж" };
  const match = text.match(/(\d+)\s*этаж/);
  return match ? { number: Number(match[1]), labelRu: `${match[1]} этаж` } : undefined;
}

function extractMaterial(text: string): UniversalRoleQaFilters["material"] | undefined {
  const materials: [string, string][] = [
    ["гкл", "ГКЛ"],
    ["гипсокартон", "ГКЛ"],
    ["профиль", "Профиль"],
    ["кабель", "Кабель"],
    ["цемент", "Цемент"],
    ["асфальт", "Асфальт"],
    ["ламинат", "Ламинат"],
  ];
  const found = materials.find(([needle]) => text.includes(needle));
  return found ? { nameRu: found[1], normalizedNameRu: found[0] } : undefined;
}

function extractStatus(text: string): UniversalRoleQaFilters["status"] | undefined {
  if (text.includes("утвержд") || text.includes("согласован")) return { normalized: "approved", labelRu: "утверждено" };
  if (text.includes("ждет") || text.includes("ожида") || text.includes("pending")) return { normalized: "pending", labelRu: "ждет согласования" };
  if (text.includes("закрыт")) return { normalized: "closed", labelRu: "закрыто" };
  if (text.includes("блок") || text.includes("не хватает документов")) return { normalized: "blocked", labelRu: "заблокировано" };
  if (text.includes("без документов") || text.includes("документов не хватает")) return { normalized: "missing_docs", labelRu: "не хватает документов" };
  if (text.includes("просроч")) return { normalized: "overdue", labelRu: "просрочено" };
  if (text.includes("закупк")) return { normalized: "in_purchase", labelRu: "в закупке" };
  return undefined;
}

export function extractUniversalRoleQaFilters(
  questionRu: string,
  referenceDate?: string,
): UniversalRoleQaFilters {
  const text = normalizeUniversalRoleQaQuestion(questionRu);
  const workType = classifyConstructionWorkType(text);
  const companyMatch = text.match(/(?:компани[яи]|осоо)\s+([а-яa-z0-9"«»\s.-]{2,40})/);
  const supplierMatch = text.match(/поставщик[а-я\s]*\s+([а-яa-z0-9"«»\s.-]{2,40})/);

  return {
    period: parseUniversalRoleQaPeriod(questionRu, referenceDate),
    floor: extractFloor(text),
    workType: workType === "unknown" ? undefined : { key: workType, labelRu: text },
    material: extractMaterial(text),
    company: companyMatch ? { nameRu: companyMatch[1].trim() } : undefined,
    supplier: supplierMatch ? { nameRu: supplierMatch[1].trim() } : undefined,
    status: extractStatus(text),
    amount: parseUniversalRoleQaAmount(questionRu),
    quantity: parseUniversalRoleQaQuantity(questionRu),
  };
}
