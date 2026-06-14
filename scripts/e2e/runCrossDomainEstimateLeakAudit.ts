import { runCrossDomainEstimateLeakAudit } from "./confusionFirewall1500RealWorkCases";

const result = runCrossDomainEstimateLeakAudit();
console.log(JSON.stringify(result, null, 2));
