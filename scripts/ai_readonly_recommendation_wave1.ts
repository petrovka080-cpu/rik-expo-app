import fs from "node:fs";
import path from "node:path";

import {
  buildProposalAnalyticSummary,
  type ProposalAnalyticInsight,
} from "../src/features/ai/aiAnalyticInsights";

const projectRoot = process.cwd();
const fullOutPath = path.join(projectRoot, "artifacts/ai-readonly-recommendation-wave1.json");
const summaryOutPath = path.join(projectRoot, "artifacts/ai-readonly-recommendation-wave1.summary.json");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const makeInsight = (
  id: string,
  tone: ProposalAnalyticInsight["priceInsightTone"],
  supplierName?: string,
  supplierScore = 0,
): ProposalAnalyticInsight => ({
  id,
  rikCode: `RIK-${id}`,
  name: `Item ${id}`,
  currentPrice: 100,
  priceAnalysis: null,
  priceInsightLabel: tone,
  priceInsightTone: tone,
  priceInsightText: `Insight ${id}`,
  supplierRecommendations: supplierName
    ? [
        {
          name: supplierName,
          score: supplierScore,
          orderCount: 3,
          avgPrice: 100,
          lastOrderDate: "2026-03-20",
          specializations: [],
        },
      ]
    : [],
  supplierInsightText: supplierName ? `Supplier ${supplierName}` : null,
});

const cases = [
  {
    id: "competitive_offer",
    insights: [
      makeInsight("good-1", "good", "ОсОО Альфа", 92),
      makeInsight("good-2", "good", "ОсОО Альфа", 88),
      makeInsight("avg-1", "average", "ОсОО Бета", 54),
    ],
    expected: { tone: "good", headlineIncludes: "конкурент", supplier: "ОсОО Альфа" },
  },
  {
    id: "needs_price_review",
    insights: [
      makeInsight("exp-1", "expensive", "ОсОО Гамма", 40),
      makeInsight("exp-2", "expensive", "ОсОО Гамма", 41),
      makeInsight("avg-2", "average", "ОсОО Дельта", 33),
    ],
    expected: { tone: "expensive", headlineIncludes: "проверк", supplier: "ОсОО Гамма" },
  },
  {
    id: "market_range_with_sparse_history",
    insights: [
      makeInsight("avg-3", "average", "ОсОО Эпсилон", 52),
      makeInsight("unknown-1", "unknown"),
      makeInsight("unknown-2", "unknown"),
    ],
    expected: { tone: "average", headlineIncludes: "диапазон", supplier: "ОсОО Эпсилон" },
  },
  {
    id: "insufficient_history",
    insights: [makeInsight("unknown-3", "unknown"), makeInsight("unknown-4", "unknown")],
    expected: { tone: "unknown", headlineIncludes: "Истории", supplier: null },
  },
  {
    id: "empty_input",
    insights: [],
    expected: null,
  },
] as const;

const results = cases.map((testCase) => {
  const summary = buildProposalAnalyticSummary(testCase.insights);
  const passed = testCase.expected == null
    ? summary == null
    : summary != null
      && summary.tone === testCase.expected.tone
      && summary.headline.includes(testCase.expected.headlineIncludes)
      && summary.recommendedSupplierName === testCase.expected.supplier;

  return {
    id: testCase.id,
    passed,
    summary,
    expected: testCase.expected,
  };
});

const summary = {
  status: results.every((item) => item.passed) ? "passed" : "failed",
  gate: results.every((item) => item.passed) ? "GREEN" : "RED",
  caseCount: results.length,
  passedCount: results.filter((item) => item.passed).length,
  goodToneSupported: results.some((item) => item.summary?.tone === "good"),
  expensiveToneSupported: results.some((item) => item.summary?.tone === "expensive"),
  averageToneSupported: results.some((item) => item.summary?.tone === "average"),
  unknownToneSupported: results.some((item) => item.summary?.tone === "unknown"),
};

writeJson(fullOutPath, {
  generatedAt: new Date().toISOString(),
  summary,
  results,
});
writeJson(summaryOutPath, summary);

if (summary.status !== "passed") {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
