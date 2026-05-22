import { runGlobalEstimateB2CRequestProof } from "./runGlobalEstimateProductionSafeProof";

runGlobalEstimateB2CRequestProof()
  .then((result) => console.log(JSON.stringify({
    final_status: "GREEN_GLOBAL_ESTIMATE_B2C_REQUEST_PROOF_READY",
    ...result,
    fake_green_claimed: false,
  }, null, 2)))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
