import { writeGlobalEstimateDataOpsAdminGovernanceArtifacts } from "./runGlobalEstimateDataOpsAdminGovernanceProof";

async function main(): Promise<void> {
  const matrix = await writeGlobalEstimateDataOpsAdminGovernanceArtifacts();
  if (!matrix.data_ops_proof_passed || matrix.final_status !== "GREEN_GLOBAL_ESTIMATE_DATA_OPS_PRICEBOOK_TAX_ADMIN_READY") {
    throw new Error("GLOBAL_ESTIMATE_DATA_OPS_PROOF_NOT_GREEN");
  }
  console.log(JSON.stringify(matrix, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
