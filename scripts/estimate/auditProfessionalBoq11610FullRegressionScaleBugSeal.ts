import {
  auditProfessionalBoq11610FullRegressionScaleBugSeal,
  GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_FULL_CATALOG_REGRESSION_SCALE_BUG_SEALED_NO_RELEASE,
} from "./professionalBoq11610RegressionSealCore";

export { auditProfessionalBoq11610FullRegressionScaleBugSeal };

if (require.main === module) {
  const result = auditProfessionalBoq11610FullRegressionScaleBugSeal({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, artifact: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_FULL_CATALOG_REGRESSION_SCALE_BUG_SEALED_NO_RELEASE) {
    process.exitCode = 1;
  }
}
