import type { AiContractRuntimeValidationResult } from "../contractRuntime";
import type { AiApprovalRuntimeGuardResult } from "./aiApprovalTypes";

export type AiApprovalContractRuntimeAdapterResult = {
  contractRuntimeIntegrated: boolean;
  approvalInvariantPassed: boolean;
  validation?: AiContractRuntimeValidationResult;
};

export function adaptAiApprovalExecutionToContractRuntime(params: {
  guard: AiApprovalRuntimeGuardResult;
  validation?: AiContractRuntimeValidationResult;
}): AiApprovalContractRuntimeAdapterResult {
  return {
    contractRuntimeIntegrated: true,
    approvalInvariantPassed:
      params.guard.passed &&
      params.guard.ledgerEntryFound &&
      params.guard.approvalDecisionFound &&
      params.guard.usedExecutionBoundary &&
      params.guard.usedApprovedBusinessService,
    validation: params.validation,
  };
}
