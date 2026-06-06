import fs from "node:fs";
import path from "node:path";

import { statusIgnoringReleaseArtifacts } from "../../scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate";

describe("request estimate release gate rejects dirty worktree", () => {
  it("does not count dirty non-artifact files as clean", () => {
    expect(statusIgnoringReleaseArtifacts(" M src/features/consumerRepair/ConsumerRepairRequestScreen.tsx")).toHaveLength(1);
    expect(statusIgnoringReleaseArtifacts("M src/features/consumerRepair/ConsumerRepairRequestScreen.tsx")).toHaveLength(1);
    expect(statusIgnoringReleaseArtifacts(" M artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_matrix.json")).toEqual([]);
    expect(statusIgnoringReleaseArtifacts("M artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_matrix.json")).toEqual([]);
  });

  it("allows release-generated proof artifacts during release verify without allowing product dirt", () => {
    const previous = process.env.RELEASE_GUARD_IN_PROGRESS;
    process.env.RELEASE_GUARD_IN_PROGRESS = "1";
    try {
      expect(
        statusIgnoringReleaseArtifacts(
          [
            " M artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/proof.md",
            " M artifacts/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG/failure_reproduction.json",
            " M src/lib/ai/globalEstimate.ts",
          ].join("\n"),
        ),
      ).toEqual(["src/lib/ai/globalEstimate.ts"]);
    } finally {
      if (previous === undefined) {
        delete process.env.RELEASE_GUARD_IN_PROGRESS;
      } else {
        process.env.RELEASE_GUARD_IN_PROGRESS = previous;
      }
    }
  });

  it("uses the shared release dirty scope in prerequisite proof runners", () => {
    const files = [
      "scripts/e2e/runSourceGovernanceProof.ts",
      "scripts/e2e/runRequestEstimateStateMachineProof.ts",
      "scripts/e2e/runRequestEstimateDraftStatePayloadProof.ts",
    ];

    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).toContain("releaseVerifyBlockingDirtyFiles");
      expect(source).toContain("line.trimEnd()");
      expect(source).toContain("line.replace(/^[MADRCU?!]\\s/, \"\")");
    }
  });
});
