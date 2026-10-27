import { classifyConstructionDocument } from "./constructionDocumentClassifier";
import type {
  ConstructionDocumentInput,
  ConstructionEntityExtraction,
} from "./constructionKnowledgeTypes";

const DATE_PATTERN = /\b(\d{2}[./-]\d{2}[./-]\d{4}|\d{4}-\d{2}-\d{2})\b/g;
const QTY_PATTERN = /\b(\d+(?:[.,]\d+)?)\s*(м2|м²|м3|м³|м|кг|т|шт|компл|л|м\.п\.)\b/gi;
const ESTIMATE_LINE_PATTERN = /\b(?:EST|СМ|SM)-?\d+\b/gi;
const MATERIAL_PATTERN = /\b(бетон|арматура|кабель|труба|кирпич|блок|щебень|песок|плитка|краска|цемент)\b/gi;
const REQUIREMENT_PATTERN = /(?:требуется|должен|необходимо|required|shall)\s+([^.\n]{8,180})/gi;
const RISK_PATTERN = /(?:риск|замечание|дефект|расхождение|несоответствие)\s*[:\-]?\s*([^.\n]{8,180})/gi;

function sourceRef(baseId: string, kind: string, index: number): string {
  return `${baseId}:${kind}:${index + 1}`;
}

function normalizeNumber(value: string): number {
  return Number(value.replace(",", "."));
}

export function extractConstructionEntities(
  input: ConstructionDocumentInput,
): ConstructionEntityExtraction {
  const classification = classifyConstructionDocument(input);
  const source = classification.source;
  const text = input.pages?.map((page) => page.text).join("\n") ?? input.text ?? "";

  const dates = [...text.matchAll(DATE_PATTERN)].map((match, index) => ({
    value: match[1] ?? match[0],
    sourceRef: sourceRef(source.id, "date", index),
  }));

  const quantities = [...text.matchAll(QTY_PATTERN)].map((match, index) => ({
    value: normalizeNumber(match[1] ?? "0"),
    unit: match[2] ?? "",
    sourceRef: sourceRef(source.id, "qty", index),
  }));

  const materials = [...text.matchAll(MATERIAL_PATTERN)].map((match, index) => ({
    labelRu: match[1] ?? match[0],
    sourceRef: sourceRef(source.id, "material", index),
  }));

  const estimateLineIds = [...text.matchAll(ESTIMATE_LINE_PATTERN)].map((match, index) => ({
    id: match[0],
    sourceRef: sourceRef(source.id, "estimate", index),
  }));

  const requirements = [...text.matchAll(REQUIREMENT_PATTERN)].map((match, index) => ({
    textRu: (match[1] ?? match[0]).trim(),
    sourceRef: sourceRef(source.id, "requirement", index),
  }));

  const risks = [...text.matchAll(RISK_PATTERN)].map((match, index) => ({
    textRu: (match[1] ?? match[0]).trim(),
    sourceRef: sourceRef(source.id, "risk", index),
  }));

  return {
    source,
    dates,
    quantities,
    materials,
    estimateLineIds,
    requirements,
    risks,
  };
}

export const constructionEntityExtractor = extractConstructionEntities;
