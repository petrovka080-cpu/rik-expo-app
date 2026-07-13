import {
  runProfessionalBoq11610PromptFuzzRegression,
  GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY,
} from "./professionalBoq11610RegressionSealCore";

export { runProfessionalBoq11610PromptFuzzRegression };

if (require.main === module) {
  const summary = runProfessionalBoq11610PromptFuzzRegression();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.final_status !== GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY) process.exitCode = 1;
}
