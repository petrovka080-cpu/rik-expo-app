import fs from "node:fs";
import path from "node:path";

import { assertDeleteScopedByProofRunId } from "../../src/lib/proofFixtures/50kProofFixtureGuards";

describe("whole-app 50k synthetic fixture no business deletes contract", () => {
  it("keeps every delete statement scoped to proof markers", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );
    const deleteSnippets = source.match(/delete\s+from[\s\S]{0,900}/gi) ?? [];

    expect(deleteSnippets.length).toBeGreaterThan(0);
    for (const snippet of deleteSnippets) {
      expect(() => assertDeleteScopedByProofRunId(snippet)).not.toThrow();
    }
    expect(source).toContain("delete_without_proof_run_id_found: false");
  });
});
