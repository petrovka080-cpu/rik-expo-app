import fs from "node:fs";
import path from "node:path";

import {
  buildReal10000EstimateAuditMatrix,
  runAllReal10000EstimateAuditPhases,
  writeReal10000AuditJson,
} from "./real10000EstimateAuditCore";

if (require.main === module) {
  const results = runAllReal10000EstimateAuditPhases();
  const holes = results.flatMap((result) => result.holes);
  const matrix = buildReal10000EstimateAuditMatrix(results);
  const riskRegister = holes.map((item, index) => ({
    id: `REAL10000_AUDIT_${String(index + 1).padStart(3, "0")}`,
    ...item,
  }));
  writeReal10000AuditJson("holes.json", holes);
  writeReal10000AuditJson("risk_register.json", riskRegister);
  writeReal10000AuditJson("failures.json", holes.filter((item) => item.severity === "P0"));
  writeReal10000AuditJson("matrix.json", matrix);
  const proof = [
    "# Real 10,000 Estimate Audit",
    "",
    `Status: ${matrix.final_status}`,
    `Governed acceptance cases proven: ${String(matrix.governed_acceptance_cases_proven)}`,
    `Real external user traffic proven: ${String(matrix.real_external_user_traffic_proven)}`,
    `Real user traffic claimed: ${String(matrix.real_user_traffic_claimed)}`,
    `P0 holes: ${matrix.p0_holes}`,
    `P1 holes: ${matrix.p1_holes}`,
    `P2 holes: ${matrix.p2_holes}`,
    "",
    "Top holes:",
    ...holes.slice(0, 20).map((item) => `- ${item.severity} ${item.phase}/${item.classification}: ${item.reason}`),
    "",
    `Fake green claimed: ${String(matrix.fake_green_claimed)}`,
    "",
  ].join("\n");
  writeReal10000AuditJson("phase_results.json", results);
  fs.writeFileSync(path.join(process.cwd(), "artifacts", "S_REAL_10000_AUDIT", "proof.md"), proof, "utf8");
  console.info(JSON.stringify(matrix, null, 2));
  if (matrix.p0_holes > 0) process.exit(1);
}
