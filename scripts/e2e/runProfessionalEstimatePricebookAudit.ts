import { runProfessionalEstimatePricebookAudit } from "./professionalEstimate1500WorkCases";

const result = runProfessionalEstimatePricebookAudit();
console.log(JSON.stringify(result, null, 2));
