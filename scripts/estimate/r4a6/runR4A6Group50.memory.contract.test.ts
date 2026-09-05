import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("R4-A8 Group50 memory ownership", () => {
  const source = readFileSync(resolve("scripts/estimate/r4a6/runR4A6Group50.ts"), "utf8");

  it("binds the gate to the tracked current release and R4-A8 master", () => {
    expect(source).toContain("r568-local-developer-canonical-release.json");
    expect(source).toContain("cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1");
    expect(source).not.toContain('const RELEASE_ID = "3788cc88-701d-5cc9-9130-c61262cb9979"');
  });

  it("streams immutable shard receipts instead of retaining all result arrays", () => {
    expect(source).toContain("Promise<string>");
    expect(source).toContain("const receiptPaths: string[] = []");
    expect(source).toContain("const receipt = loadJson<Json>(receiptPath)");
    expect(source).not.toContain("const receipts: Json[] = []");
    expect(source).not.toContain("const resultByCaseId = new Map<string, Json>()");
  });

  it("collects unreachable memory without relaxing performance limits", () => {
    expect(source).toContain("STOP_GROUP50_EXPLICIT_GC_REQUIRED");
    expect(source).toContain("maximumRssBytes > 1_610_612_736");
    expect(source).toContain("rssGrowthBytes > 805_306_368");
    expect(source).toContain("percentile(durations, 0.99) > 5_000");
  });
});
