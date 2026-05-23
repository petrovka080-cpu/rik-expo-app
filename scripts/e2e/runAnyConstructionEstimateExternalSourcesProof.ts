import { buildAnyEstimateProofArtifacts, writeAnyEstimateProofArtifacts } from "./anyEstimateSourceBackedProofShared";

const proof = buildAnyEstimateProofArtifacts();
writeAnyEstimateProofArtifacts();

if (!proof.matrix.external_source_registry_ready || !proof.matrix.every_priced_row_has_source_evidence || proof.matrix.fake_source_labels_found) {
  console.error(JSON.stringify({ status: "BLOCKED_ANY_ESTIMATE_EXTERNAL_SOURCES_FAILED", matrix: proof.matrix }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "GREEN_ANY_CONSTRUCTION_ESTIMATE_EXTERNAL_SOURCES_PROOF_READY",
  connectors: proof.externalSources.connectors.length,
  sourceBackedRowsInAsphalt: proof.inventory.sourceBackedRowsInAsphalt,
}, null, 2));
