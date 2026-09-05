import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "scripts/estimate/r4a6/runR4A6Platform30.ts"),
  "utf8",
);

describe("R4-A6 Platform30 evidence lineage", () => {
  it("accepts an explicit exact-SHA Group50 predecessor without weakening its terminal checks", () => {
    expect(source).toContain("R4_A6_GROUP50_SOURCE_SHA");
    expect(source).toContain("STOP_PLATFORM30_GROUP50_SOURCE_SHA_INVALID");
    expect(source).toContain("terminal.source?.commitSha !== GROUP50_SOURCE_SHA");
    expect(source).toContain("Number(terminal.passedCases) !== 118_400");
  });
});
