import {
  benchmarkProfessionalBoq11610Scale,
  GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY,
} from "./professionalBoq11610RegressionSealCore";

export { benchmarkProfessionalBoq11610Scale };

if (require.main === module) {
  const summary = benchmarkProfessionalBoq11610Scale();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.final_status !== GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY) process.exitCode = 1;
}
