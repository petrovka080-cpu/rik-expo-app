import { evaluateReleaseGuardConsistency } from "../../scripts/release/releaseStateCleanupCore";
import { tempReleaseRoot } from "./releaseStateCleanupTestHelpers";

it("rejects mandatory release gates that point to missing scripts", () => {
  const report = evaluateReleaseGuardConsistency({
    rootDir: tempReleaseRoot(),
    requiredGates: [
      {
        name: "tsc",
        command: "npx tsx scripts/audit/missingReleaseGate.ts",
      },
    ],
    ownerOnlyGates: [],
    matrixPathList: [],
  });

  expect(report.final_status).toBe("BLOCKED_RELEASE_GUARD_REFERENCES_MISSING_SCRIPT");
  expect(report.missing_scripts).toEqual(["scripts/audit/missingReleaseGate.ts"]);
});
