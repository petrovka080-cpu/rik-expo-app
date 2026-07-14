import {
  audit11610WorkEstimateOutputs,
} from "../../scripts/estimate/audit11610WorkEstimateOutputs";
import {
  audit11610RealNamedProfessionalBoqLineItems,
} from "../../scripts/estimate/audit11610RealNamedProfessionalBoqLineItems";
import {
  auditWorkEstimateSemanticAcceptance,
} from "../../scripts/estimate/auditWorkEstimateSemanticAcceptance";
import {
  audit11610TrustedCostingPricebook,
} from "../../scripts/estimate/audit11610TrustedCostingPricebook";
import {
  audit11610MaterialCompletenessNoTruncation,
} from "../../scripts/estimate/audit11610MaterialCompletenessNoTruncation";
import {
  audit11610MaterialQuantityAccuracy,
} from "../../scripts/estimate/audit11610MaterialQuantityAccuracy";

const mode = process.argv[2];

if (mode === "semantic-acceptance-source") {
  const result = auditWorkEstimateSemanticAcceptance({
    requireGateFlags: false,
    requireRuntimeEvidence: false,
    writeSummary: false,
    writeSamples: false,
  });
  console.log(JSON.stringify(result.summary));
} else if (mode === "full-11610-output-audit") {
  const result = audit11610WorkEstimateOutputs({
    writeLedger: false,
    writeSummary: false,
  });
  console.log(JSON.stringify(result.summary));
} else if (mode === "real-named-boq-source-audit") {
  const result = audit11610RealNamedProfessionalBoqLineItems({
    writeLedger: false,
    writeSummary: false,
    requireRuntimeEvidence: false,
  });
  console.log(JSON.stringify(result.summary));
} else if (mode === "trusted-costing-pricebook-source-audit") {
  const result = audit11610TrustedCostingPricebook({
    writeLedger: false,
    writeSummary: false,
    writeSamples: false,
  });
  console.log(JSON.stringify(result.summary));
} else if (mode === "material-completeness-source-audit") {
  const result = audit11610MaterialCompletenessNoTruncation({
    writeLedger: false,
    writeSummary: false,
    writeSamples: false,
    requireRuntimeEvidence: false,
  });
  console.log(JSON.stringify(result.summary));
} else if (mode === "material-quantity-accuracy-source-audit") {
  const result = audit11610MaterialQuantityAccuracy({
    writeLedger: false,
    writeSummary: false,
    writeSamples: false,
    requireRuntimeEvidence: false,
  });
  console.log(JSON.stringify(result.summary));
} else {
  console.error(`Unknown estimate runtime audit mode: ${mode ?? "<missing>"}`);
  process.exitCode = 1;
}
