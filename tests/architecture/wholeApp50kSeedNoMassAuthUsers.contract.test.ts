import fs from "node:fs";
import path from "node:path";

import { assertNoRealUserMassCreation } from "../../src/lib/proofFixtures/50kProofFixtureGuards";

describe("whole-app 50k seed architecture: no mass auth users", () => {
  it("does not create or require 50k auth.users", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(() => assertNoRealUserMassCreation(source)).not.toThrow();
    expect(source).not.toMatch(/auth\.admin\.createUser|insert\s+into\s+auth\.users/i);
  });
});
