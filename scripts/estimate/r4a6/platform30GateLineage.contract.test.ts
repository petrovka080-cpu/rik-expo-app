import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "scripts/estimate/r4a6/runR4A6Platform30.ts"),
  "utf8",
);

describe("R4-A8 Platform30 evidence lineage", () => {
  it("accepts an explicit exact-SHA Group50 predecessor without weakening its terminal checks", () => {
    expect(source).toContain("R4_A8_GROUP50_SOURCE_SHA");
    expect(source).toContain("R4_A6_GROUP50_SOURCE_SHA");
    expect(source).toContain("STOP_PLATFORM30_GROUP50_SOURCE_SHA_INVALID");
    expect(source).toContain("terminal.source?.commitSha !== GROUP50_SOURCE_SHA");
    expect(source).toContain("Number(terminal.passedCases) !== 118_400");
  });

  it("binds the current tracked release and R4-A8 master", () => {
    expect(source).toContain("r568-local-developer-canonical-release.json");
    expect(source).toContain("cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1");
    expect(source).not.toContain('const RELEASE_ID = "3788cc88-701d-5cc9-9130-c61262cb9979"');
  });

  it("supports exact R4-A10 scale and live-canary rebinding", () => {
    expect(source).toContain("R4_A10_MASTER_PATH");
    expect(source).toContain("R4_A10_MASTER_SHA256");
    expect(source).toContain("R4_A10_GROUP50_SOURCE_SHA");
    expect(source).toContain("R4_A10_GROUP50_ROOT");
    expect(source).toContain("R4_A10_LIVE_CANARY_SOURCE_SHA");
    expect(source).toContain("R4_A10_LIVE_CANARY_PATH");
    expect(source).toContain("R4_A10_SCALE_ROOT");
  });

  it("streams shard receipts and preserves the twelve counters", () => {
    expect(source).toContain("Promise<string>");
    expect(source).toContain("const receiptPaths: string[] = []");
    expect(source).toContain("const receipt = loadJson<Json>(receiptPath)");
    expect(source).toContain("STOP_PLATFORM30_EXPLICIT_GC_REQUIRED");
    expect(source).not.toContain("const receipts: Json[] = []");
    expect(source).toContain('"duplicateExecutionRed",');
    const counterBlock = source.slice(source.indexOf("const COUNTER_KEYS"), source.indexOf("] as const;", source.indexOf("const COUNTER_KEYS")));
    expect((counterBlock.match(/"[a-zA-Z]+Red"/gu) ?? [])).toHaveLength(12);
  });
});
