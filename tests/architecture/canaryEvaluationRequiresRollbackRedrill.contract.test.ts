import fs from "node:fs";
import path from "node:path";

test("canary evaluation proof requires rollback redrill", () => {
  const proof = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiEstimateCanaryEvaluationProof.ts"),
    "utf8",
  );
  const redrill = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiEstimateCanaryEvaluationRollbackRedrill.ts"),
    "utf8",
  );
  expect(proof).toContain("runCanaryEvaluationRollbackRedrill");
  expect(redrill).toContain("rollback_redrill_passed");
});
