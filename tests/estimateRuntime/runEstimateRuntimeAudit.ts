const mode = process.argv[2];

async function main(): Promise<void> {
  if (mode === "semantic-acceptance-source") {
    const { auditWorkEstimateSemanticAcceptance } = await import(
      "../../scripts/estimate/auditWorkEstimateSemanticAcceptance"
    );
    const result = auditWorkEstimateSemanticAcceptance({
      requireGateFlags: false,
      requireRuntimeEvidence: false,
      writeSummary: false,
      writeSamples: false,
    });
    console.log(JSON.stringify(result.summary));
  } else if (mode === "full-11610-output-audit") {
    const { audit11610WorkEstimateOutputs } = await import(
      "../../scripts/estimate/audit11610WorkEstimateOutputs"
    );
    const result = audit11610WorkEstimateOutputs({
      writeLedger: false,
      writeSummary: false,
    });
    console.log(JSON.stringify(result.summary));
  } else if (mode === "real-named-boq-source-audit") {
    const { audit11610RealNamedProfessionalBoqLineItems } = await import(
      "../../scripts/estimate/audit11610RealNamedProfessionalBoqLineItems"
    );
    const result = audit11610RealNamedProfessionalBoqLineItems({
      writeLedger: false,
      writeSummary: false,
      requireRuntimeEvidence: false,
    });
    console.log(JSON.stringify(result.summary));
  } else if (mode === "trusted-costing-pricebook-source-audit") {
    const { audit11610TrustedCostingPricebook } = await import(
      "../../scripts/estimate/audit11610TrustedCostingPricebook"
    );
    const result = audit11610TrustedCostingPricebook({
      writeLedger: false,
      writeSummary: false,
      writeSamples: false,
    });
    console.log(JSON.stringify(result.summary));
  } else if (mode === "material-completeness-source-audit") {
    const { audit11610MaterialCompletenessNoTruncation } = await import(
      "../../scripts/estimate/audit11610MaterialCompletenessNoTruncation"
    );
    const result = audit11610MaterialCompletenessNoTruncation({
      writeLedger: false,
      writeSummary: false,
      writeSamples: false,
      requireRuntimeEvidence: false,
    });
    console.log(JSON.stringify(result.summary));
  } else if (mode === "material-quantity-accuracy-source-audit") {
    const { audit11610MaterialQuantityAccuracy } = await import(
      "../../scripts/estimate/audit11610MaterialQuantityAccuracy"
    );
    const result = audit11610MaterialQuantityAccuracy({
      writeLedger: false,
      writeSummary: false,
      writeSamples: false,
      requireRuntimeEvidence: false,
    });
    console.log(JSON.stringify(result.summary));
  } else {
    throw new Error(`Unknown estimate runtime audit mode: ${mode ?? "<missing>"}`);
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
