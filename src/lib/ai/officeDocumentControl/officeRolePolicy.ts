export const OFFICE_ROLE_POLICY = {
  role: "office",
  canReadOfficeControlDomains: true,
  canPrepareReminderDraft: true,
  canPrepareDirectorPackageDraft: true,
  canPrepareMissingDataRequest: true,
  finalReminderSendAllowed: false,
  directDocumentLinkAllowed: false,
  taskCloseAllowed: false,
  approvalStatusMutationAllowed: false,
  directPaymentAllowed: false,
  directWorkCloseAllowed: false,
  signingAllowed: false,
  autoApprovalAllowed: false,
  approvalBypassAllowed: false,
  rawRuntimeAccessAllowed: false,
  rawSecurityAccessAllowed: false,
  secretsAccessAllowed: false,
} as const;

export function assertOfficeReadOnlyPolicy(): true {
  if (OFFICE_ROLE_POLICY.finalReminderSendAllowed) throw new Error("OFFICE_POLICY_FINAL_REMINDER_SEND_ENABLED");
  if (OFFICE_ROLE_POLICY.directDocumentLinkAllowed) throw new Error("OFFICE_POLICY_DOCUMENT_LINK_MUTATION_ENABLED");
  if (OFFICE_ROLE_POLICY.taskCloseAllowed) throw new Error("OFFICE_POLICY_TASK_CLOSE_ENABLED");
  if (OFFICE_ROLE_POLICY.approvalStatusMutationAllowed) throw new Error("OFFICE_POLICY_APPROVAL_MUTATION_ENABLED");
  if (OFFICE_ROLE_POLICY.directPaymentAllowed) throw new Error("OFFICE_POLICY_PAYMENT_MUTATION_ENABLED");
  if (OFFICE_ROLE_POLICY.directWorkCloseAllowed) throw new Error("OFFICE_POLICY_WORK_CLOSE_ENABLED");
  if (OFFICE_ROLE_POLICY.signingAllowed) throw new Error("OFFICE_POLICY_SIGNING_ENABLED");
  if (OFFICE_ROLE_POLICY.autoApprovalAllowed) throw new Error("OFFICE_POLICY_AUTO_APPROVAL_ENABLED");
  return true;
}
