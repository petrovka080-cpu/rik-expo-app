import fs from "node:fs";
import path from "node:path";

import { buildDataOpsTruth } from "../../scripts/audit/greenClaimArtifactReconciliation.shared";

const repoRoot = path.resolve(__dirname, "../..");

describe("Data Ops operator UI cannot be claimed by shell", () => {
  it("detects the shared shell and keeps operator-grade UI as a follow-up", () => {
    const shellSource = fs.readFileSync(
      path.join(repoRoot, "src/lib/ai/globalEstimate/dataOps/AdminGlobalEstimateRoute.tsx"),
      "utf8",
    );
    const truth = buildDataOpsTruth(repoRoot);

    expect(shellSource).toContain("writes: approval-only backend apply");
    expect(truth.data_ops_minimal_shared_shell).toBe(true);
    expect(truth.operator_grade_admin_ui_status).toBe("NOT_GREEN");
  });
});
