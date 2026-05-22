import fs from "node:fs";
import path from "node:path";

import { assertNoRealUserMassCreation } from "../../src/lib/proofFixtures/50kProofFixtureGuards";

describe("whole-app 50k architecture: no mass auth users", () => {
  it("uses one existing auth user and never creates 50k auth.users", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(source).toContain("select id from auth.users order by created_at asc limit 1");
    expect(source).not.toMatch(/insert\s+into\s+auth\.users/i);
    expect(() => assertNoRealUserMassCreation(source)).not.toThrow();
  });
});
