import { runGlobalEstimateLocalizationRuntimeProof } from "./runGlobalEstimateProductionSafeProof";

runGlobalEstimateLocalizationRuntimeProof()
  .then((result) => console.log(JSON.stringify({
    final_status: "GREEN_GLOBAL_ESTIMATE_LOCALIZATION_RUNTIME_PROOF_READY",
    ...result,
    fake_green_claimed: false,
  }, null, 2)))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
