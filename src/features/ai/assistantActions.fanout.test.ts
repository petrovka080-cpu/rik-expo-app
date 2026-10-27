import { readFileSync } from "fs";
import { join } from "path";

describe("assistant action catalog fan-out discipline", () => {
  it("keeps assistant draft catalog matching behind a bounded batch plan", () => {
    const source = readFileSync(join(__dirname, "assistantActions.ts"), "utf8");

    expect(source).toContain("planFanoutBatch(items");
    expect(source).toContain("ASSISTANT_CATALOG_MATCH_ITEM_LIMIT");
    expect(source).toContain("matchPlan.sourceToResolveIndex");
    expect(source).toContain("match: resolvedMatches[resolveIndex]?.match ?? null");
  });

  it("keeps assistant market search query fan-out behind a bounded limiter", () => {
    const source = readFileSync(join(__dirname, "assistantActions.ts"), "utf8");

    expect(source).toContain("ASSISTANT_MARKET_SEARCH_QUERY_LIMIT");
    expect(source).toContain("ASSISTANT_MARKET_SEARCH_CONCURRENCY_LIMIT");
    expect(source).toContain("queries.slice(0, ASSISTANT_MARKET_SEARCH_QUERY_LIMIT)");
    expect(source).toContain("mapWithConcurrencyLimit(");
    expect(source).not.toContain("queries.slice(0, 3).map");
  });
});
