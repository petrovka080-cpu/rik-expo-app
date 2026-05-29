export type AiEstimateProofRunnerIsolationInput = {
  fixtureMode: boolean;
  stagingDataApproved: boolean;
  productionSupabaseWrite: boolean;
  productionSourceRefresh: boolean;
  productionCatalogMutation: boolean;
  productionPdfStorageUpload: boolean;
  liveSupplierStockCalls: boolean;
  userSessionMutation: boolean;
};

export type AiEstimateProofRunnerIsolationReport = AiEstimateProofRunnerIsolationInput & {
  proof_runner_isolation_ready: boolean;
  proof_runner_production_calls_found: boolean;
  failures: string[];
};

export function assertProofRunnerIsolation(
  input: AiEstimateProofRunnerIsolationInput,
): AiEstimateProofRunnerIsolationReport {
  const failures: string[] = [];
  if (!input.fixtureMode && !input.stagingDataApproved) failures.push("fixture_or_staging_data_required");
  if (input.productionSupabaseWrite) failures.push("production_supabase_write");
  if (input.productionSourceRefresh) failures.push("production_source_refresh");
  if (input.productionCatalogMutation) failures.push("production_catalog_mutation");
  if (input.productionPdfStorageUpload) failures.push("production_pdf_storage_upload");
  if (input.liveSupplierStockCalls) failures.push("live_supplier_stock_calls");
  if (input.userSessionMutation) failures.push("user_session_mutation");

  return {
    ...input,
    proof_runner_isolation_ready: failures.length === 0,
    proof_runner_production_calls_found: failures.some((failure) => failure.startsWith("production_") || failure === "live_supplier_stock_calls"),
    failures,
  };
}
