import {
  analyzePriceHistory,
  getSupplierRecommendations,
  type PriceAnalysis,
  type SupplierScore,
} from "../../lib/ai_reports";
import { mapWithConcurrencyLimit } from "../../lib/async/mapWithConcurrencyLimit";

export type ProposalAnalyticSourceItem = {
  id: string;
  rikCode: string | null;
  name: string | null;
  price: number | null;
  supplier: string | null;
};

export type ProposalAnalyticInsight = {
  id: string;
  rikCode: string;
  name: string;
  currentPrice: number;
  priceAnalysis: PriceAnalysis | null;
  priceInsightLabel: string;
  priceInsightTone: "good" | "average" | "expensive" | "unknown";
  priceInsightText: string;
  supplierRecommendations: SupplierScore[];
  supplierInsightText: string | null;
};

export type ProposalAnalyticSummary = {
  tone: "good" | "average" | "expensive" | "unknown";
  headline: string;
  text: string;
  recommendedSupplierName: string | null;
};

type LoadProposalAnalyticInsightsOptions = {
  companyId?: string | null;
  itemLimit?: number;
  supplierLimit?: number;
  concurrencyLimit?: number;
};

const DEFAULT_ITEM_LIMIT = 3;
const DEFAULT_SUPPLIER_LIMIT = 3;
const DEFAULT_ANALYTIC_INSIGHT_CONCURRENCY_LIMIT = 2;

const toFinitePositiveNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const toTrimmedText = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  return text || null;
};

const formatAmount = (value: number): string =>
  value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const buildPriceInsightLabel = (
  analysis: PriceAnalysis | null,
): ProposalAnalyticInsight["priceInsightLabel"] => {
  if (!analysis) return "Истории мало";
  switch (analysis.recommendation) {
    case "good":
      return "Цена выгодная";
    case "expensive":
      return "Цена выше рынка";
    default:
      return "Цена в рынке";
  }
};

const buildPriceInsightTone = (
  analysis: PriceAnalysis | null,
): ProposalAnalyticInsight["priceInsightTone"] => {
  if (!analysis) return "unknown";
  return analysis.recommendation;
};

export const buildPriceInsightText = (
  analysis: PriceAnalysis | null,
  currentPrice: number,
): string => {
  if (!analysis) {
    return "Истории недостаточно для уверенного вывода.";
  }

  const deltaVsAverage = analysis.averagePrice > 0
    ? ((currentPrice - analysis.averagePrice) / analysis.averagePrice) * 100
    : 0;
  const deltaLabel = `${deltaVsAverage >= 0 ? "+" : ""}${deltaVsAverage.toFixed(0)}%`;
  const avgLabel = formatAmount(analysis.averagePrice);

  switch (analysis.recommendation) {
    case "good":
      return `Цена близка к нижнему диапазону. Отклонение от средней: ${deltaLabel}, средняя ${avgLabel}.`;
    case "expensive":
      return `Цена выше исторического диапазона. Отклонение от средней: ${deltaLabel}, средняя ${avgLabel}.`;
    default:
      return `Цена находится в рыночном диапазоне. Отклонение от средней: ${deltaLabel}, средняя ${avgLabel}.`;
  }
};

export const buildSupplierInsightText = (
  recommendations: SupplierScore[],
): string | null => {
  const top = recommendations[0];
  if (!top) return null;

  const parts = [
    `Рекомендуемый поставщик: ${top.name}.`,
    `Исторических заказов: ${top.orderCount}.`,
  ];

  const avgPrice = toFinitePositiveNumber(top.avgPrice);
  if (avgPrice != null) {
    parts.push(`Средняя цена по истории: ${formatAmount(avgPrice)}.`);
  }

  if (top.lastOrderDate) {
    parts.push(`Последний заказ: ${String(top.lastOrderDate).slice(0, 10)}.`);
  }

  return parts.join(" ");
};

export const buildProposalAnalyticSummary = (
  insights: readonly ProposalAnalyticInsight[],
): ProposalAnalyticSummary | null => {
  if (!insights.length) return null;

  let goodCount = 0;
  let averageCount = 0;
  let expensiveCount = 0;
  let unknownCount = 0;

  const supplierScores = new Map<string, number>();

  for (const insight of insights) {
    switch (insight.priceInsightTone) {
      case "good":
        goodCount += 1;
        break;
      case "expensive":
        expensiveCount += 1;
        break;
      case "average":
        averageCount += 1;
        break;
      default:
        unknownCount += 1;
        break;
    }

    for (const recommendation of insight.supplierRecommendations) {
      const supplierName = toTrimmedText(recommendation.name);
      if (!supplierName) continue;
      const currentScore = supplierScores.get(supplierName) ?? 0;
      supplierScores.set(supplierName, currentScore + Number(recommendation.score || 0));
    }
  }

  const recommendedSupplierName = [...supplierScores.entries()]
    .sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;

  if (expensiveCount > 0 && expensiveCount >= goodCount) {
    return {
      tone: "expensive",
      headline: "Нужна дополнительная проверка",
      text: [
        `Есть ${expensiveCount} поз. с ценой выше исторического диапазона.`,
        averageCount > 0 ? `Ещё ${averageCount} поз. находятся в рабочем диапазоне.` : null,
        recommendedSupplierName ? `Для сверки стоит проверить историю по поставщику ${recommendedSupplierName}.` : null,
      ].filter(Boolean).join(" "),
      recommendedSupplierName,
    };
  }

  if (goodCount > 0 && expensiveCount === 0) {
    return {
      tone: "good",
      headline: "Предложение выглядит конкурентным",
      text: [
        `Выгодный исторический сигнал есть по ${goodCount} поз.`,
        averageCount > 0 ? `${averageCount} поз. остаются в рыночном диапазоне.` : null,
        recommendedSupplierName ? `Сильный supplier signal: ${recommendedSupplierName}.` : null,
      ].filter(Boolean).join(" "),
      recommendedSupplierName,
    };
  }

  if (averageCount > 0) {
    return {
      tone: "average",
      headline: "Цена в рабочем диапазоне",
      text: [
        `По ${averageCount} поз. цена находится в ожидаемом историческом диапазоне.`,
        unknownCount > 0 ? `По ${unknownCount} поз. истории недостаточно для уверенного вывода.` : null,
        recommendedSupplierName ? `Из доступной истории чаще всего выигрывает ${recommendedSupplierName}.` : null,
      ].filter(Boolean).join(" "),
      recommendedSupplierName,
    };
  }

  return {
    tone: "unknown",
    headline: "Истории недостаточно",
    text: [
      `По ${unknownCount || insights.length} поз. нет достаточной истории для уверенного сравнения.`,
      recommendedSupplierName ? `Есть слабый supplier signal в пользу ${recommendedSupplierName}, но без жёсткой рекомендации.` : null,
    ].filter(Boolean).join(" "),
    recommendedSupplierName,
  };
};

const normalizeProposalAnalyticSourceItems = (
  items: readonly ProposalAnalyticSourceItem[],
  itemLimit: number,
): ProposalAnalyticSourceItem[] => {
  const seen = new Set<string>();
  const normalized: ProposalAnalyticSourceItem[] = [];

  for (const item of items) {
    const rikCode = toTrimmedText(item.rikCode);
    const price = toFinitePositiveNumber(item.price);
    if (!rikCode || price == null) continue;
    if (seen.has(rikCode)) continue;
    seen.add(rikCode);
    normalized.push({
      id: toTrimmedText(item.id) || rikCode,
      rikCode,
      name: toTrimmedText(item.name),
      price,
      supplier: toTrimmedText(item.supplier),
    });
    if (normalized.length >= itemLimit) break;
  }

  return normalized;
};

export async function loadProposalAnalyticInsights(
  items: readonly ProposalAnalyticSourceItem[],
  options?: LoadProposalAnalyticInsightsOptions,
): Promise<ProposalAnalyticInsight[]> {
  const itemLimit = Math.max(1, Math.trunc(options?.itemLimit ?? DEFAULT_ITEM_LIMIT));
  const supplierLimit = Math.max(1, Math.trunc(options?.supplierLimit ?? DEFAULT_SUPPLIER_LIMIT));
  const concurrencyLimit = Math.max(
    1,
    Math.trunc(options?.concurrencyLimit ?? DEFAULT_ANALYTIC_INSIGHT_CONCURRENCY_LIMIT),
  );
  const normalizedItems = normalizeProposalAnalyticSourceItems(items, itemLimit);

  const insights = await mapWithConcurrencyLimit(
    normalizedItems,
    concurrencyLimit,
    async (item) => {
      const rikCode = item.rikCode;
      if (!rikCode) return null;
      const currentPrice = Number(item.price);
      const [priceAnalysis, supplierRecommendations] = await Promise.all([
        analyzePriceHistory(rikCode, currentPrice, options?.companyId ?? null),
        getSupplierRecommendations(rikCode, supplierLimit, options?.companyId ?? null),
      ]);

      return {
        id: item.id,
        rikCode,
        name: item.name || rikCode,
        currentPrice,
        priceAnalysis,
        priceInsightLabel: buildPriceInsightLabel(priceAnalysis),
        priceInsightTone: buildPriceInsightTone(priceAnalysis),
        priceInsightText: buildPriceInsightText(priceAnalysis, currentPrice),
        supplierRecommendations,
        supplierInsightText: buildSupplierInsightText(supplierRecommendations),
      } satisfies ProposalAnalyticInsight;
    },
  );

  return insights.filter(
    (insight): insight is ProposalAnalyticInsight =>
      insight != null &&
      (Boolean(insight.priceAnalysis) || insight.supplierRecommendations.length > 0),
  );
}
