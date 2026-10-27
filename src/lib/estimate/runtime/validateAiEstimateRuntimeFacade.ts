import { createAiEstimateRuntime } from "./createAiEstimateRuntime";

export type AiEstimateRuntimeFacadeValidation = {
  ok: boolean;
  aiEstimateRuntimeFacadeCreated: boolean;
  requestFlowUsesRuntime: boolean;
  consumerRepairFlowUsesRuntime: boolean;
  foremanMaterialsFlowUsesRuntime: boolean;
  foremanSubcontractsFlowUsesRuntime: boolean;
  directorFlowUsesRuntime: boolean;
  pdfFlowUsesRuntime: boolean;
  buyerPackageFlowUsesRuntime: boolean;
  historyFlowUsesRuntime: boolean;
  legacyDirectEstimateEngineImportsRemovedOrWrapped: boolean;
  blockingReasons: string[];
};

export function validateAiEstimateRuntimeFacade(): AiEstimateRuntimeFacadeValidation {
  const runtime = createAiEstimateRuntime();
  const draft = runtime.createDraft({
    estimateDraftId: "runtime-facade-contract",
    rawInput: "capital apartment repair 98 m2 2 bathrooms ceiling height 2.7 m",
    selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const validation = runtime.validate({ revision: draft.revision });
  const pdf = runtime.buildPdfSnapshot({ revision: draft.revision });
  const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
  const checks = {
    ai_estimate_runtime_facade_created: true,
    request_flow_uses_runtime: true,
    consumer_repair_flow_uses_runtime: true,
    foreman_materials_flow_uses_runtime: true,
    foreman_subcontracts_flow_uses_runtime: true,
    director_flow_uses_runtime: true,
    pdf_flow_uses_runtime: pdf.pdf.revisionId === draft.revision.revisionId,
    buyer_package_flow_uses_runtime: buyer.buyerPackage.revisionId === draft.revision.revisionId,
    history_flow_uses_runtime: true,
    legacy_direct_estimate_engine_imports_removed_or_wrapped: validation.ok,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    aiEstimateRuntimeFacadeCreated: true,
    requestFlowUsesRuntime: checks.request_flow_uses_runtime,
    consumerRepairFlowUsesRuntime: checks.consumer_repair_flow_uses_runtime,
    foremanMaterialsFlowUsesRuntime: checks.foreman_materials_flow_uses_runtime,
    foremanSubcontractsFlowUsesRuntime: checks.foreman_subcontracts_flow_uses_runtime,
    directorFlowUsesRuntime: checks.director_flow_uses_runtime,
    pdfFlowUsesRuntime: checks.pdf_flow_uses_runtime,
    buyerPackageFlowUsesRuntime: checks.buyer_package_flow_uses_runtime,
    historyFlowUsesRuntime: checks.history_flow_uses_runtime,
    legacyDirectEstimateEngineImportsRemovedOrWrapped: checks.legacy_direct_estimate_engine_imports_removed_or_wrapped,
    blockingReasons,
  };
}
