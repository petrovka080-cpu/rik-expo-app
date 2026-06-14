import { runConfusionFirewall1500Audit } from "./confusionFirewall1500RealWorkCases";

const result = runConfusionFirewall1500Audit();
console.log(JSON.stringify(result, null, 2));
