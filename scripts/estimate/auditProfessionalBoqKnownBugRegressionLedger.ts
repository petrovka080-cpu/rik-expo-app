import {
  auditProfessionalBoqKnownBugRegressionLedger,
  GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY,
} from "./professionalBoq11610RegressionSealCore";

export { auditProfessionalBoqKnownBugRegressionLedger };

if (require.main === module) {
  const summary = auditProfessionalBoqKnownBugRegressionLedger();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.final_status !== GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY) process.exitCode = 1;
}
