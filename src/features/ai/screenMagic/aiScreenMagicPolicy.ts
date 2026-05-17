import {
  containsForbiddenAiScreenMagicUserCopy,
} from "./aiScreenMagicUserCopy";
import type {
  AiScreenMagicPack,
  AiScreenMagicValidationIssue,
} from "./aiScreenMagicTypes";

export type AiScreenMagicPolicyResult = {
  ok: boolean;
  issues: AiScreenMagicValidationIssue[];
};

export function validateAiScreenMagicPack(pack: AiScreenMagicPack): AiScreenMagicPolicyResult {
  const issues: AiScreenMagicValidationIssue[] = [];
  if (pack.aiPreparedWork.length === 0) {
    issues.push({ screenId: pack.screenId, code: "missing_prepared_work", exactReason: "Screen magic pack must include prepared work." });
  }
  if (pack.buttons.length === 0) {
    issues.push({ screenId: pack.screenId, code: "missing_button", exactReason: "Screen magic pack must include buttons." });
  }
  if (pack.qa.length < 5) {
    issues.push({ screenId: pack.screenId, code: "qa_coverage_missing", exactReason: "Screen magic pack must include at least five QA examples." });
  }
  if (pack.safety.fakeDataUsed) issues.push({ screenId: pack.screenId, code: "fake_data_used", exactReason: "Fake data is marked as used." });
  if (pack.safety.providerRequired) issues.push({ screenId: pack.screenId, code: "provider_required", exactReason: "Provider must not be required for screen magic." });
  if (pack.safety.dbWriteUsed) issues.push({ screenId: pack.screenId, code: "db_write_used", exactReason: "Screen magic must not write DB state." });
  if (pack.safety.directDangerousMutationAllowed || pack.safety.approvalBypassAllowed) {
    issues.push({ screenId: pack.screenId, code: "direct_execution_allowed", exactReason: "Direct mutation or approval bypass is allowed." });
  }

  for (const button of pack.buttons) {
    if (!button.label.trim()) issues.push({ screenId: pack.screenId, actionId: button.id, code: "missing_button_label", exactReason: "Button label is empty." });
    if (button.canExecuteDirectly !== false) issues.push({ screenId: pack.screenId, actionId: button.id, code: "direct_execution_allowed", exactReason: "Button can execute directly." });
    if (button.actionKind === "approval_required" && !button.approvalRoute) {
      issues.push({ screenId: pack.screenId, actionId: button.id, code: "approval_route_missing", exactReason: "Approval button lacks ledger route." });
    }
    if (button.actionKind === "forbidden" && !button.forbiddenReason) {
      issues.push({ screenId: pack.screenId, actionId: button.id, code: "forbidden_reason_missing", exactReason: "Forbidden button lacks user-facing reason." });
    }
    if (!button.expectedResult) {
      issues.push({ screenId: pack.screenId, actionId: button.id, code: "missing_button_resolution", exactReason: "Button has no expected result." });
    }
  }

  if (containsForbiddenAiScreenMagicUserCopy(JSON.stringify(pack))) {
    issues.push({ screenId: pack.screenId, code: "debug_copy_exposed", exactReason: "Screen magic contains forbidden debug/provider copy." });
  }

  return { ok: issues.length === 0, issues };
}

export function validateAiScreenMagicPacks(packs: readonly AiScreenMagicPack[]): AiScreenMagicPolicyResult {
  const issues = packs.flatMap((pack) => validateAiScreenMagicPack(pack).issues);
  return { ok: issues.length === 0, issues };
}

export function enforceAiScreenMagicPolicy(pack: AiScreenMagicPack): AiScreenMagicPack {
  return {
    ...pack,
    buttons: pack.buttons.map((button) => ({
      ...button,
      canExecuteDirectly: false,
    })),
    safety: {
      fakeDataUsed: false,
      directDangerousMutationAllowed: false,
      approvalBypassAllowed: false,
      providerRequired: false,
      dbWriteUsed: false,
    },
  };
}
