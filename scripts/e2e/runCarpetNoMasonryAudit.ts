import { runCarpetNoMasonryAudit } from "./confusionFirewall1500RealWorkCases";

const result = runCarpetNoMasonryAudit();
console.log(JSON.stringify(result, null, 2));
