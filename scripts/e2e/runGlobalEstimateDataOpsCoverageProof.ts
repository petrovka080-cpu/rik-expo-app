import { buildGlobalEstimateDataOpsAdminGovernanceProof } from "./runGlobalEstimateDataOpsAdminGovernanceProof";

async function main(): Promise<void> {
  const proof = await buildGlobalEstimateDataOpsAdminGovernanceProof();
  const result = {
    final_status: proof.matrix.final_status,
    coverage_matrix_ready: proof.matrix.coverage_matrix_ready,
    coverage_matrix_generated: proof.matrix.coverage_matrix_generated,
    estimate_qa_console_ready: proof.matrix.estimate_qa_console_ready,
    data_integrity_guard_ready: proof.matrix.data_integrity_guard_ready,
    fake_green_claimed: proof.matrix.fake_green_claimed,
  };
  if (!result.coverage_matrix_ready || !result.coverage_matrix_generated || !result.data_integrity_guard_ready) {
    throw new Error("GLOBAL_ESTIMATE_DATA_OPS_COVERAGE_PROOF_NOT_GREEN");
  }
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
