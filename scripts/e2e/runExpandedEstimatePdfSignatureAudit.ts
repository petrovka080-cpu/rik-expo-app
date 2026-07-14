import { runExpandedPdfSignatureAudit } from "./confusionFirewall1500RealWorkCases";

const result = runExpandedPdfSignatureAudit();
console.log(JSON.stringify(result, null, 2));
