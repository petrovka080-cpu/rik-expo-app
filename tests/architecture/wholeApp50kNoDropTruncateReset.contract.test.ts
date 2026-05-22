import fs from "node:fs";
import path from "node:path";

import { assertNoDestructiveSql } from "../../src/lib/proofFixtures/50kProofFixtureGuards";

describe("whole-app 50k architecture: no drop/truncate/reset", () => {
  it("keeps the fixture runner free of destructive database operations", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(() => assertNoDestructiveSql(source)).not.toThrow();
    expect(source).not.toMatch(/\bdrop\s+table\b/i);
    expect(source).not.toMatch(/\btruncate(?:\s+table)?\b/i);
    expect(source).not.toMatch(/\breset\s+database\b/i);
  });
});
