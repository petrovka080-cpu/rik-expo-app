import { runProfessionalEstimateCrossDomainLeakAudit } from "./professionalEstimate1500WorkCases";

const result = runProfessionalEstimateCrossDomainLeakAudit();
console.log(JSON.stringify(result, null, 2));
