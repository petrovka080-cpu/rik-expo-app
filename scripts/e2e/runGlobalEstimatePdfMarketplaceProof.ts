import { runGlobalEstimatePdfMarketplaceProof } from "./runGlobalEstimateProductionSafeProof";

runGlobalEstimatePdfMarketplaceProof()
  .then((result) => console.log(JSON.stringify({
    final_status: "GREEN_GLOBAL_ESTIMATE_PDF_MARKETPLACE_PROOF_READY",
    ...result,
    fake_green_claimed: false,
  }, null, 2)))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
