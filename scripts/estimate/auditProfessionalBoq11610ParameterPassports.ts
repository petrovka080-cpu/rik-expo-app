import {
  auditProfessionalBoq11610ParameterPassports,
  GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY,
} from "./professionalBoq11610RegressionSealCore";

export { auditProfessionalBoq11610ParameterPassports };

if (require.main === module) {
  const summary = auditProfessionalBoq11610ParameterPassports();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.final_status !== GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY) process.exitCode = 1;
}
