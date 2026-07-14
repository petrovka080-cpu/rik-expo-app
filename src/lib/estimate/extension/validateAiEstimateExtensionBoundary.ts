import { createAiEstimateFulfillmentExtensionContract } from "./AiEstimateFulfillmentExtensionContract";
import { createAiEstimatePricingExtensionContract } from "./AiEstimatePricingExtensionContract";
import { createAiEstimateProcurementExtensionContract } from "./AiEstimateProcurementExtensionContract";

export function validateAiEstimateExtensionBoundary() {
  const contracts = [
    createAiEstimateProcurementExtensionContract(),
    createAiEstimatePricingExtensionContract(),
    createAiEstimateFulfillmentExtensionContract(),
  ];
  const checks = {
    procurement_extension_contract_created: contracts.some((contract) => contract.extensionKind === "procurement"),
    pricing_extension_contract_created: contracts.some((contract) => contract.extensionKind === "pricing"),
    fulfillment_extension_contract_created: contracts.some((contract) => contract.extensionKind === "fulfillment"),
    all_extensions_versioned: contracts.every((contract) => contract.contractVersion === "ai-estimate-extension-v1"),
    no_extension_mutates_revision: contracts.every((contract) => contract.mayMutateRevision === false),
    no_extension_writes_ledger_directly: contracts.every((contract) => contract.mayWriteLedgerDirectly === false),
    approved_revision_only: contracts.every((contract) => contract.consumesApprovedRevisionOnly === true),
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    ...checks,
    blockingReasons,
  };
}
