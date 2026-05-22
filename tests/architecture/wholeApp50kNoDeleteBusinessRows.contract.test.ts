import fs from "node:fs";
import path from "node:path";

import { assertDeleteScopedByProofRunId } from "../../src/lib/proofFixtures/50kProofFixtureGuards";

describe("whole-app 50k architecture: no business-row cleanup", () => {
  it("requires every fixture delete in the runner to be proof-scoped", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );
    const deleteSnippets = source.match(/delete\s+from[\s\S]{0,900}/gi) ?? [];

    expect(deleteSnippets.length).toBeGreaterThan(0);
    for (const snippet of deleteSnippets) {
      expect(() => assertDeleteScopedByProofRunId(snippet)).not.toThrow();
    }
  });
});
