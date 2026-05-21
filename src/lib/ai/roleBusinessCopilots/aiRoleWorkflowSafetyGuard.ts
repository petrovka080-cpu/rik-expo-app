import type { AiRoleWorkflowAnswer, AiRoleWorkflowSafetyGuardResult } from "./aiRoleWorkflowTypes";

export function guardAiRoleWorkflowAnswer(answer: AiRoleWorkflowAnswer): AiRoleWorkflowSafetyGuardResult {
  const dangerousMutationFound = answer.safetyStatus.dangerousMutation;
  const finalSubmitFound =
    answer.safetyStatus.finalSubmit || (Boolean(answer.draft) && answer.draft?.finalSubmitAllowed !== false);
  const approvalBypassFound = answer.safetyStatus.autoApproval;
  const sourceRefsMissing = answer.facts.some((fact) => fact.sourceRefIds.length === 0);
  const openLinksMissing = answer.openLinks.length === 0;
  const numericFactsMissing = answer.facts.flatMap((fact) => fact.numericFacts ?? []).length === 0;
  const genericWorkflowAnswer = /уточните|не найдено|нет данных|generic/i.test(answer.shortAnswerRu);
  const draftNotMarked = Boolean(answer.draft && answer.draft.finalSubmitAllowed !== false);
  const accountingReviewMissing = answer.workflowId === "accountant_accounting_entry_reference" &&
    !/провер/i.test(`${answer.shortAnswerRu} ${answer.nextStepRu} ${answer.draft?.bodyRu ?? ""}`);
  const crossRoleLeakFound = answer.role === "client" && /полные финансы|чужие работы|service_role|debug/i.test(
    `${answer.shortAnswerRu} ${answer.facts.map((fact) => fact.textRu).join(" ")}`,
  );

  let failureReason: AiRoleWorkflowSafetyGuardResult["failureReason"] | undefined;
  if (dangerousMutationFound) failureReason = "workflow_mutated_data";
  else if (finalSubmitFound) failureReason = "final_submit_without_human";
  else if (approvalBypassFound) failureReason = "approval_bypass";
  else if (crossRoleLeakFound) failureReason = "role_scope_leak";
  else if (sourceRefsMissing) failureReason = "missing_source_refs";
  else if (openLinksMissing) failureReason = "missing_open_links";
  else if (numericFactsMissing) failureReason = "missing_numeric_facts";
  else if (genericWorkflowAnswer) failureReason = "generic_workflow_answer";
  else if (draftNotMarked) failureReason = "draft_not_marked_as_draft";
  else if (accountingReviewMissing) failureReason = "accounting_review_warning_missing";

  return {
    workflowId: answer.workflowId,
    passed: !failureReason,
    safeReadOnly: !answer.safetyStatus.changedData,
    draftOnlyWhenDraft: !answer.draft || answer.draft.finalSubmitAllowed === false,
    approvalRequiredWhenNeeded: answer.statusRu !== "Требуется согласование" || answer.safetyStatus.approvalRequired,
    dangerousMutationFound,
    finalSubmitFound,
    approvalBypassFound,
    crossRoleLeakFound,
    failureReason,
  };
}
