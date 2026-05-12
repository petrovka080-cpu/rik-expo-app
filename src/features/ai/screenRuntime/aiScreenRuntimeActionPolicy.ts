import type { AiUserRole } from "../policy/aiRolePolicy";
import type {
  AiScreenRuntimeActionPlanInput,
  AiScreenRuntimeActionPlanOutput,
  AiScreenRuntimeCardAction,
  AiScreenRuntimeIntentPreviewInput,
  AiScreenRuntimeIntentPreviewOutput,
  AiScreenRuntimeRegistryEntry,
} from "./aiScreenRuntimeTypes";
import { normalizeAiScreenRuntimeEvidenceRefs } from "./aiScreenRuntimeEvidence";

function roleAllowed(role: AiUserRole, entry: AiScreenRuntimeRegistryEntry): boolean {
  return role !== "unknown" && entry.allowedRoles.includes(role);
}

export function actionsForAiScreenRuntimeEntry(
  entry: AiScreenRuntimeRegistryEntry,
): AiScreenRuntimeCardAction[] {
  const actions: AiScreenRuntimeCardAction[] = ["ask_why", "open_source"];
  if (entry.availableIntents.some((intent) => intent === "read" || intent === "search" || intent === "compare")) {
    actions.push("preview_tool");
  }
  if (
    entry.availableIntents.some(
      (intent) =>
        intent === "draft" ||
        intent === "prepare_report" ||
        intent === "prepare_act" ||
        intent === "prepare_request",
    )
  ) {
    actions.push("create_draft");
  }
  if (entry.availableIntents.includes("submit_for_approval")) {
    actions.push("submit_for_approval");
  }
  return [...new Set(actions)];
}

export function previewAiScreenRuntimeIntent(params: {
  role: AiUserRole;
  entry: AiScreenRuntimeRegistryEntry | null;
  input: AiScreenRuntimeIntentPreviewInput;
}): AiScreenRuntimeIntentPreviewOutput {
  const evidenceRefs = normalizeAiScreenRuntimeEvidenceRefs(params.input.evidenceRefs);
  const base = {
    screenId: params.input.screenId,
    role: params.role,
    intent: String(params.input.intent ?? params.input.intent ?? ""),
    evidenceRefs,
    approvalBoundary: {
      requiredForRiskyActions: true,
      finalMutationAllowed: false,
    },
    mutationCount: 0,
    finalMutationAllowed: false,
  } as const;

  if (!params.entry) {
    return {
      ...base,
      status: "blocked",
      allowed: false,
      reason: "AI screen runtime screenId is not registered.",
      nextAction: "blocked",
    };
  }

  if (params.entry.mounted !== "mounted") {
    return {
      ...base,
      status: "not_mounted",
      allowed: false,
      reason: "AI screen runtime entry is future_or_not_mounted.",
      nextAction: "blocked",
    };
  }

  if (!roleAllowed(params.role, params.entry)) {
    return {
      ...base,
      status: "blocked",
      allowed: false,
      reason: "AI role cannot use this screen runtime.",
      nextAction: "blocked",
    };
  }

  const intent = String(params.input.intent ?? "").trim();
  const allowed = params.entry.availableIntents.some((entryIntent) => entryIntent === intent);
  if (!allowed) {
    return {
      ...base,
      status: "blocked",
      allowed: false,
      reason: "Intent is blocked for this screen runtime.",
      nextAction: "blocked",
    };
  }

  const nextAction =
    intent === "submit_for_approval"
      ? "submit_for_approval"
      : intent === "draft" || intent.startsWith("prepare_")
        ? "create_draft"
        : "explain";

  return {
    ...base,
    status: "loaded",
    allowed: true,
    reason: "Intent allowed by screen runtime role and evidence policy.",
    nextAction,
  };
}

export function planAiScreenRuntimeAction(params: {
  role: AiUserRole;
  entry: AiScreenRuntimeRegistryEntry | null;
  input: AiScreenRuntimeActionPlanInput;
}): AiScreenRuntimeActionPlanOutput {
  const evidenceRefs = normalizeAiScreenRuntimeEvidenceRefs(params.input.evidenceRefs);
  const base = {
    screenId: params.input.screenId,
    role: params.role,
    action: params.input.action,
    evidenceRefs,
    mutationCount: 0,
    finalMutationAllowed: false,
    executed: false,
  } as const;

  if (!params.entry || params.entry.mounted !== "mounted" || !roleAllowed(params.role, params.entry)) {
    return {
      ...base,
      status: "blocked",
      planMode: "blocked",
      requiresApproval: true,
    };
  }

  if (!actionsForAiScreenRuntimeEntry(params.entry).includes(params.input.action)) {
    return {
      ...base,
      status: "blocked",
      planMode: "blocked",
      requiresApproval: true,
    };
  }

  if (params.input.action === "submit_for_approval") {
    return {
      ...base,
      status: "planned",
      planMode: "approval_boundary",
      requiresApproval: true,
    };
  }

  if (params.input.action === "create_draft") {
    return {
      ...base,
      status: "planned",
      planMode: "draft_only",
      requiresApproval: params.entry.approvalRequired,
    };
  }

  return {
    ...base,
    status: "planned",
    planMode: "safe_read_preview",
    requiresApproval: false,
  };
}
