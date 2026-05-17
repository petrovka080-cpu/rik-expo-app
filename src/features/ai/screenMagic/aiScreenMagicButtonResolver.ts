import { resolveAiScreenWorkflowButton } from "../screenWorkflows/aiScreenWorkflowButtonResolver";
import type { AiScreenWorkflowAction } from "../screenWorkflows/aiScreenWorkflowTypes";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicExpectedResult,
} from "./aiScreenMagicTypes";

function expectedResultFor(kind: AiScreenMagicActionKind): AiScreenMagicExpectedResult {
  if (kind === "safe_read") return "opens_read_result";
  if (kind === "draft_only") return "creates_safe_draft";
  if (kind === "approval_required") return "routes_to_approval_ledger";
  if (kind === "forbidden") return "shows_forbidden_reason";
  return "shows_exact_blocker";
}

export function buildAiScreenMagicButton(params: {
  action: AiScreenWorkflowAction;
  label?: string;
}): AiScreenMagicButton {
  const resolution = resolveAiScreenWorkflowButton(params.action);
  const actionKind: AiScreenMagicActionKind =
    resolution.status === "exact_blocker"
      ? "exact_blocker"
      : params.action.actionKind;

  return {
    id: params.action.id,
    label: params.label?.trim() || params.action.label,
    actionKind,
    expectedResult: expectedResultFor(actionKind),
    bffRoute: actionKind === "safe_read" || actionKind === "draft_only"
      ? params.action.routeOrHandler
      : undefined,
    approvalRoute: actionKind === "approval_required" ? params.action.approvalRoute : undefined,
    forbiddenReason: actionKind === "forbidden"
      ? params.action.forbiddenReason ?? resolution.userFacingReason
      : undefined,
    exactBlocker: actionKind === "exact_blocker"
      ? params.action.exactBlocker ?? resolution.userFacingReason
      : params.action.exactBlocker,
    canExecuteDirectly: false,
  };
}

export type AiScreenMagicButtonResolution = {
  button: AiScreenMagicButton;
  status:
    | "clickable_safe_read"
    | "clickable_draft_only"
    | "routes_to_approval_ledger"
    | "forbidden_with_reason"
    | "exact_blocker";
  userFacingReason: string;
  canExecuteDirectly: false;
};

export function resolveAiScreenMagicButton(button: AiScreenMagicButton): AiScreenMagicButtonResolution {
  if (button.actionKind === "safe_read") {
    return {
      button,
      status: "clickable_safe_read",
      userFacingReason: "Открывает безопасный read-result из hydrated screen context.",
      canExecuteDirectly: false,
    };
  }
  if (button.actionKind === "draft_only") {
    return {
      button,
      status: "clickable_draft_only",
      userFacingReason: "Создаёт только безопасный черновик без финальной записи.",
      canExecuteDirectly: false,
    };
  }
  if (button.actionKind === "approval_required") {
    return {
      button,
      status: "routes_to_approval_ledger",
      userFacingReason: "Маршрутизирует действие через approval ledger и не исполняет его напрямую.",
      canExecuteDirectly: false,
    };
  }
  if (button.actionKind === "forbidden") {
    return {
      button,
      status: "forbidden_with_reason",
      userFacingReason: button.forbiddenReason ?? "AI не может выполнить это действие напрямую.",
      canExecuteDirectly: false,
    };
  }
  return {
    button,
    status: "exact_blocker",
    userFacingReason: button.exactBlocker ?? "Для действия нужен точный production route/blocker.",
    canExecuteDirectly: false,
  };
}
