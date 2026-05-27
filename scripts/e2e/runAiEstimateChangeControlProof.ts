import {
  buildChangeControlMatrix,
  detectChangeControlOperatorUiReadiness,
  detectChangeControlWebSmokeEvidence,
  runChangeControlScenario,
  writeScenarioArtifacts,
} from "./aiEstimateChangeControlProof.shared";

function main(): void {
  const { store, proof, blockers } = runChangeControlScenario();
  const operatorUiReady = detectChangeControlOperatorUiReadiness();
  const webSmokePassed = detectChangeControlWebSmokeEvidence();
  const matrix = buildChangeControlMatrix(store, blockers, {
    operatorUiReady,
    webSmokePassed,
  });
  writeScenarioArtifacts(store, proof, blockers, matrix);
  console.info(`${matrix.final_status}: ${store.changes.length} changes, ${store.validation_runs.length} validation runs`);
  if (matrix.final_status !== "GREEN_AI_ESTIMATE_TEMPLATE_RATE_CATALOG_ONTOLOGY_CHANGE_CONTROL_READY") {
    process.exitCode = 1;
  }
}

main();
