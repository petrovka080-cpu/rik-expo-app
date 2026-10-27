import { readFileSync } from "fs";
import { join } from "path";

import {
  analyzePriceHistory,
  getSupplierRecommendations,
  type PriceAnalysis,
} from "../../lib/ai_reports";
import { loadProposalAnalyticInsights } from "./aiAnalyticInsights";

jest.mock("../../lib/ai_reports", () => ({
  analyzePriceHistory: jest.fn(),
  getSupplierRecommendations: jest.fn(),
}));

const mockAnalyzePriceHistory = analyzePriceHistory as jest.MockedFunction<
  typeof analyzePriceHistory
>;
const mockGetSupplierRecommendations =
  getSupplierRecommendations as jest.MockedFunction<
    typeof getSupplierRecommendations
  >;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolveValue: ((value: T) => void) | null = null;
  const promise = new Promise<T>((resolve) => {
    resolveValue = resolve;
  });

  return {
    promise,
    resolve: (value: T) => {
      if (!resolveValue) throw new Error("deferred resolve was not initialized");
      resolveValue(value);
    },
  };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const priceAnalysis = (recommendation: PriceAnalysis["recommendation"]): PriceAnalysis => ({
  averagePrice: 100,
  minPrice: 80,
  maxPrice: 140,
  lastPrice: 100,
  priceChange: 0,
  recommendation,
  history: [],
});

describe("aiAnalyticInsights fan-out discipline", () => {
  beforeEach(() => {
    mockAnalyzePriceHistory.mockReset();
    mockGetSupplierRecommendations.mockReset();
  });

  it("keeps proposal analytic item fan-out bounded while preserving source order", async () => {
    const priceByCode = new Map<string, Deferred<PriceAnalysis | null>>();
    mockAnalyzePriceHistory.mockImplementation((rikCode: string) => {
      const deferred = createDeferred<PriceAnalysis | null>();
      priceByCode.set(rikCode, deferred);
      return deferred.promise;
    });
    mockGetSupplierRecommendations.mockResolvedValue([]);

    const pending = loadProposalAnalyticInsights(
      [
        { id: "a", rikCode: "A", name: "Item A", price: 10, supplier: null },
        { id: "b", rikCode: "B", name: "Item B", price: 20, supplier: null },
        { id: "c", rikCode: "C", name: "Item C", price: 30, supplier: null },
      ],
      { itemLimit: 3, concurrencyLimit: 2 },
    );

    expect(mockAnalyzePriceHistory.mock.calls.map((call) => call[0])).toEqual([
      "A",
      "B",
    ]);

    priceByCode.get("B")?.resolve(priceAnalysis("average"));
    await flushMicrotasks();

    expect(mockAnalyzePriceHistory.mock.calls.map((call) => call[0])).toEqual([
      "A",
      "B",
      "C",
    ]);

    priceByCode.get("C")?.resolve(priceAnalysis("expensive"));
    priceByCode.get("A")?.resolve(priceAnalysis("good"));

    await expect(pending).resolves.toMatchObject([
      { id: "a", rikCode: "A", priceInsightTone: "good" },
      { id: "b", rikCode: "B", priceInsightTone: "average" },
      { id: "c", rikCode: "C", priceInsightTone: "expensive" },
    ]);
  });

  it("uses the shared bounded concurrency executor for the outer item fan-out", () => {
    const source = readFileSync(join(__dirname, "aiAnalyticInsights.ts"), "utf8");

    expect(source).toContain("mapWithConcurrencyLimit");
    expect(source).toContain("DEFAULT_ANALYTIC_INSIGHT_CONCURRENCY_LIMIT");
    expect(source).not.toContain("normalizedItems.map(async");
  });
});
