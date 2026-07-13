import {
  auditProfessionalBoq11610FormulaInvariantMatrix,
  GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY,
} from "./professionalBoq11610RegressionSealCore";

export function runProfessionalBoq11610FormulaInvariantMatrix() {
  return auditProfessionalBoq11610FormulaInvariantMatrix();
}

if (require.main === module) {
  const summary = runProfessionalBoq11610FormulaInvariantMatrix();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.final_status !== GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY) process.exitCode = 1;
}
