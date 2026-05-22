import fs from "node:fs";
import path from "node:path";

import { assertDeleteScopedByProofRunId } from "../../src/lib/proofFixtures/50kProofFixtureGuards";

describe("whole-app 50k seed architecture: cleanup scoped", () => {
  it("uses proof_run_id/proof-marker scoped cleanup only", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );
    const deleteSnippets = source.match(/delete\s+from[\s\S]{0,900}/gi) ?? [];

    expect(source).toContain('cleanup_scope: "proof_run_id_only"');
    for (const snippet of deleteSnippets) {
      expect(() => assertDeleteScopedByProofRunId(snippet)).not.toThrow();
    }
  });
});
