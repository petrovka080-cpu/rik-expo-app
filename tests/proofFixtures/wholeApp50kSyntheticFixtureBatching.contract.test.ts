import fs from "node:fs";
import path from "node:path";

describe("whole-app 50k synthetic fixture batching contract", () => {
  it("keeps large fixture writes batched and progress-safe", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(source).toContain("const REQUEST_BATCH = 5_000");
    expect(source).toContain("const AI_EVENT_BATCH = 50_000");
    expect(source).toContain("const MARKET_BATCH = 5_000");
    expect(source).toContain("console.log(`seeding requests");
    expect(source).toContain("console.log(`seeding marketplace listings");
    expect(source).toContain("console.log(`seeding AI event ledger rows");
  });
});
