import type {
  ConstructionEstimateLine,
  ConstructionKnowledgeSource,
} from "./constructionKnowledgeTypes";

export type ConstructionEstimateRowInput = {
  id: string;
  labelRu: string;
  qty: number;
  unit: string;
  amount?: number;
  currency?: string;
  linkedWorkId?: string;
  linkedMaterialId?: string;
};

const ESTIMATE_TEXT_LINE =
  /\b(EST-?\d+|СМ-?\d+|SM-?\d+)\b\s*[:;-]?\s*([^;\n]+?)\s+(\d+(?:[.,]\d+)?)\s*(м2|м²|м3|м³|м|кг|т|шт|компл|л|м\.п\.)/gi;

function normalizeNumber(value: string): number {
  return Number(value.replace(",", "."));
}

export function parseConstructionEstimate(params: {
  source: ConstructionKnowledgeSource;
  rows?: ConstructionEstimateRowInput[];
  text?: string;
}): {
  lines: ConstructionEstimateLine[];
  source: ConstructionKnowledgeSource;
  blockedReason?: "BLOCKED_ESTIMATE_PROVIDER_NOT_CONNECTED";
} {
  if (params.source.type !== "estimate_pdf" && params.source.type !== "boq") {
    return {
      lines: [],
      source: params.source,
      blockedReason: "BLOCKED_ESTIMATE_PROVIDER_NOT_CONNECTED",
    };
  }

  const rowLines = (params.rows ?? []).map((row) => ({
    id: row.id,
    labelRu: row.labelRu,
    qty: row.qty,
    unit: row.unit,
    amount: row.amount,
    currency: row.currency,
    sourceRef: params.source.id,
    linkedWorkId: row.linkedWorkId,
    linkedMaterialId: row.linkedMaterialId,
  }));

  const textLines = [...(params.text ?? "").matchAll(ESTIMATE_TEXT_LINE)].map((match) => ({
    id: match[1] ?? `estimate:${params.source.id}`,
    labelRu: (match[2] ?? "").trim(),
    qty: normalizeNumber(match[3] ?? "0"),
    unit: match[4] ?? "",
    sourceRef: params.source.id,
  }));

  return {
    lines: [...rowLines, ...textLines],
    source: params.source,
  };
}

export function aiEstimateProvider(params: {
  source: ConstructionKnowledgeSource;
  rows?: ConstructionEstimateRowInput[];
  text?: string;
}) {
  return parseConstructionEstimate(params);
}

export const aiBoqProvider = aiEstimateProvider;
export const constructionEstimateParser = parseConstructionEstimate;
