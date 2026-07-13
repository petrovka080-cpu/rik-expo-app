import { runProfessionalEstimateTemplateCoverageAudit } from "./professionalEstimate1500WorkCases";

const result = runProfessionalEstimateTemplateCoverageAudit();
console.log(JSON.stringify(result, null, 2));
