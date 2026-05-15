import type { AiCapability, AiDomain, AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiScreenButtonActionEntry,
  AiScreenButtonActionKind,
  AiScreenMutationRisk,
} from "../screenAudit/aiScreenButtonRoleActionTypes";

export type AiBffAuthorizationContractMode =
  | "safe_read"
  | "draft_preview"
  | "submit_for_approval"
  | "forbidden_no_route";

export type AiBffAuthorizationContract = {
  screenId: string;
  actionId: string;
  actionKind: AiScreenButtonActionKind;
  domain: AiDomain;
  mode: AiBffAuthorizationContractMode;
  requiredCapability: AiCapability | null;
  allowedRoleScope: readonly AiUserRole[];
  mutationRisk: AiScreenMutationRisk;
  authRequired: true;
  roleScopeResolvedServerSide: true;
  organizationScopeResolvedServerSide: true;
  evidenceRequired: true;
  redactionRequired: true;
  rawRowsAllowed: false;
  rawPromptsAllowed: false;
  rawProviderPayloadsAllowed: false;
  directDbWriteAllowed: false;
  finalExecutionAllowed: false;
  approvalLedgerRequired: boolean;
  executeOnlyAfterApprovedLedgerStatus: boolean;
  forbiddenForAllRoles: boolean;
  servicePrivilegeAllowed: false;
};

function modeForActionKind(actionKind: AiScreenButtonActionKind): AiBffAuthorizationContractMode {
  if (actionKind === "safe_read") return "safe_read";
  if (actionKind === "draft_only") return "draft_preview";
  if (actionKind === "approval_required") return "submit_for_approval";
  return "forbidden_no_route";
}

function requiredCapabilityForActionKind(actionKind: AiScreenButtonActionKind): AiCapability | null {
  if (actionKind === "safe_read") return "read_context";
  if (actionKind === "draft_only") return "draft";
  if (actionKind === "approval_required") return "submit_for_approval";
  return null;
}

export function buildAiBffAuthorizationContract(params: {
  entry: Pick<
    AiScreenButtonActionEntry,
    "screenId" | "actionId" | "actionKind" | "roleScope" | "mutationRisk"
  >;
  domain: AiDomain;
}): AiBffAuthorizationContract {
  const requiredCapability = requiredCapabilityForActionKind(params.entry.actionKind);
  const isApprovalRequired = params.entry.actionKind === "approval_required";
  const isForbidden = params.entry.actionKind === "forbidden";

  return Object.freeze({
    screenId: params.entry.screenId,
    actionId: params.entry.actionId,
    actionKind: params.entry.actionKind,
    domain: params.domain,
    mode: modeForActionKind(params.entry.actionKind),
    requiredCapability,
    allowedRoleScope: [...params.entry.roleScope],
    mutationRisk: params.entry.mutationRisk,
    authRequired: true,
    roleScopeResolvedServerSide: true,
    organizationScopeResolvedServerSide: true,
    evidenceRequired: true,
    redactionRequired: true,
    rawRowsAllowed: false,
    rawPromptsAllowed: false,
    rawProviderPayloadsAllowed: false,
    directDbWriteAllowed: false,
    finalExecutionAllowed: false,
    approvalLedgerRequired: isApprovalRequired,
    executeOnlyAfterApprovedLedgerStatus: isApprovalRequired,
    forbiddenForAllRoles: isForbidden,
    servicePrivilegeAllowed: false,
  } satisfies AiBffAuthorizationContract);
}

export function isAiBffAuthorizationContractSafe(contract: AiBffAuthorizationContract): boolean {
  return (
    contract.authRequired === true &&
    contract.roleScopeResolvedServerSide === true &&
    contract.organizationScopeResolvedServerSide === true &&
    contract.evidenceRequired === true &&
    contract.redactionRequired === true &&
    contract.rawRowsAllowed === false &&
    contract.rawPromptsAllowed === false &&
    contract.rawProviderPayloadsAllowed === false &&
    contract.directDbWriteAllowed === false &&
    contract.finalExecutionAllowed === false &&
    contract.servicePrivilegeAllowed === false &&
    (contract.actionKind !== "approval_required" ||
      (contract.approvalLedgerRequired === true &&
        contract.executeOnlyAfterApprovedLedgerStatus === true)) &&
    (contract.actionKind !== "forbidden" || contract.forbiddenForAllRoles === true)
  );
}
