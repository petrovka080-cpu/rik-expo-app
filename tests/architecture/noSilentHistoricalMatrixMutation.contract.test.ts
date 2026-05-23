import fs from "node:fs";
import path from "node:path";

import { REQUIRED_SUPERSESSIONS } from "../../scripts/audit/greenClaimArtifactReconciliation.shared";

const repoRoot = path.resolve(__dirname, "../..");

describe("no silent historical matrix mutation", () => {
  it("keeps historical matrices as history and writes only superseding matrices", () => {
    const sharedSource = fs.readFileSync(
      path.join(repoRoot, "scripts/audit/greenClaimArtifactReconciliation.shared.ts"),
      "utf8",
    );

    for (const entry of REQUIRED_SUPERSESSIONS) {
      const oldMatrix = JSON.parse(fs.readFileSync(path.join(repoRoot, entry.oldArtifact), "utf8"));
      expect(oldMatrix.superseded_by).toBeUndefined();
      expect(oldMatrix.replay_verified).toBeUndefined();
      expect(sharedSource).not.toContain(`writeJson(rootDir, "${entry.oldArtifact}"`);
      expect(sharedSource).toContain(entry.supersededBy);
    }
  });
});
