import fs from "node:fs";
import path from "node:path";

import { assertNoDestructiveSql } from "../../src/lib/proofFixtures/50kProofFixtureGuards";

describe("whole-app 50k seed architecture: no destructive SQL", () => {
  it("does not use drop, truncate, reset, disable RLS, or broad policies", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(() => assertNoDestructiveSql(source)).not.toThrow();
    expect(source).not.toMatch(/\bdrop\s+table\b|\btruncate(?:\s+table)?\b|\breset\s+database\b/i);
  });
});
