import { runConfusionPairHardAudit } from "./confusionFirewall1500RealWorkCases";

const result = runConfusionPairHardAudit();
console.log(JSON.stringify(result, null, 2));
