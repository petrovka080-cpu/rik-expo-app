import { FINAL_50K_92_BLOCKED_STATUS, writeFinal50k92ScoreReauditArtifacts } from "./final50k92ScoreReaudit.shared";

const report = writeFinal50k92ScoreReauditArtifacts();
const activeCapNames = report.scoreCaps.active_caps.map((cap) => cap.name);
const expectedExternalBlockers = [
  "SUPABASE_RLS_PROOF_DATABASE_URL_REQUIRED",
  "WHOLE_APP_50K_DATABASE_URL_REQUIRED",
];

const passed =
  report.scoreCaps.score_caps_applied === true
  && activeCapNames.includes("rls_dynamic_incomplete")
  && activeCapNames.includes("whole_app_50k_missing")
  && report.scoreCaps.effective_max_score === 8
  && report.matrix.final_status === FINAL_50K_92_BLOCKED_STATUS
  && expectedExternalBlockers.every((blocker) => report.matrix.external_blockers.includes(blocker));

console.log(JSON.stringify({
  wave: report.evidenceMap.wave,
  final_status: report.matrix.final_status,
  score_caps_applied: report.scoreCaps.score_caps_applied,
  effective_max_score: report.scoreCaps.effective_max_score,
  active_caps: activeCapNames,
  passed,
}, null, 2));

if (!passed) process.exit(1);
