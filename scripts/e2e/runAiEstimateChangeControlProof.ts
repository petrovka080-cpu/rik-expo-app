import {
  buildChangeControlMatrix,
  runChangeControlScenario,
  writeScenarioArtifacts,
} from "./aiEstimateChangeControlProof.shared";

function main(): void {
  const { store, proof, blockers } = runChangeControlScenario();
  const matrix = buildChangeControlMatrix(store, blockers, {
    operatorUiReady: false,
    webSmokePassed: false,
  });
  writeScenarioArtifacts(store, proof, blockers, matrix);
  console.info(`${matrix.final_status}: ${store.changes.length} changes, ${store.validation_runs.length} validation runs`);
  if (matrix.final_status.startsWith("BLOCKED")) {
    process.exitCode = 1;
  }
}

main();
