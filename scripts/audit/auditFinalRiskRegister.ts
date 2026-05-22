import { FINAL_50K_92_BLOCKED_STATUS, writeFinal50k92ScoreReauditArtifacts } from "./final50k92ScoreReaudit.shared";

const report = writeFinal50k92ScoreReauditArtifacts();
const risks = report.riskRegister.risks;
const expectedExternalBlockers = new Set([
  "SUPABASE_RLS_PROOF_DATABASE_URL_REQUIRED",
  "WHOLE_APP_50K_DATABASE_URL_REQUIRED",
]);
const riskBlockers = new Set(risks.map((risk) => risk.external_blocker));

const passed =
  report.matrix.final_status === FINAL_50K_92_BLOCKED_STATUS
  && report.riskRegister.p0_remaining === 0
  && report.riskRegister.p1_remaining === expectedExternalBlockers.size
  && risks.every((risk) => risk.severity === "P1" && risk.blocks_9_2 && risk.blocks_production_50k_claim)
  && [...expectedExternalBlockers].every((blocker) => riskBlockers.has(blocker));

console.log(JSON.stringify({
  wave: report.evidenceMap.wave,
  final_status: report.matrix.final_status,
  p0_remaining: report.riskRegister.p0_remaining,
  p1_remaining: report.riskRegister.p1_remaining,
  risks,
  passed,
}, null, 2));

if (!passed) process.exit(1);
