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
});
