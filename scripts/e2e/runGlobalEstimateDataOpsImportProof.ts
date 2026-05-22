import { buildGlobalEstimateDataOpsAdminGovernanceProof } from "./runGlobalEstimateDataOpsAdminGovernanceProof";

async function main(): Promise<void> {
  const proof = await buildGlobalEstimateDataOpsAdminGovernanceProof();
  const result = {
    final_status: proof.matrix.final_status,
    pricebook_import_ready: proof.matrix.pricebook_import_ready,
    admin_import_preview_passed: proof.matrix.admin_import_preview_passed,
    suspicious_price_detection_passed: proof.matrix.suspicious_price_detection_passed,
    import_preview_writes_to_db: proof.matrix.import_preview_writes_to_db,
    fake_green_claimed: proof.matrix.fake_green_claimed,
  };
  if (!result.pricebook_import_ready || !result.admin_import_preview_passed || !result.suspicious_price_detection_passed) {
    throw new Error("GLOBAL_ESTIMATE_DATA_OPS_IMPORT_PROOF_NOT_GREEN");
  }
  if (result.import_preview_writes_to_db) {
    throw new Error("GLOBAL_ESTIMATE_DATA_OPS_IMPORT_PROOF_WROTE_TO_DB");
  }
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
