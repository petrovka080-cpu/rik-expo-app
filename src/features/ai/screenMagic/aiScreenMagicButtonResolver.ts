import { resolveAiScreenWorkflowButton } from "../screenWorkflows/aiScreenWorkflowButtonResolver";
import type { AiScreenWorkflowAction } from "../screenWorkflows/aiScreenWorkflowTypes";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicButtonIntent,
  AiScreenMagicExpectedResult,
  AiScreenMagicPack,
} from "./aiScreenMagicTypes";
import {
  buildAiGroundedAnswer,
  buildAiGroundedFreeTextAnswer,
  formatAiGroundedAnswer,
  type AiGroundedAnswer,
} from "./aiScreenMagicGrounding";
import { sanitizeAiScreenMagicUserCopy } from "./aiScreenMagicUserCopy";

export const AI_SCREEN_MAGIC_CLICK_PREFIX = "Готово от AI:";

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
    label: sanitizeAiScreenMagicUserCopy(params.label?.trim() || params.action.label),
    actionKind,
    resultType: actionKind,
    expectedResult: expectedResultFor(actionKind),
    bffRoute: actionKind === "safe_read" || actionKind === "draft_only"
      ? params.action.routeOrHandler
      : undefined,
    approvalRoute: actionKind === "approval_required" ? params.action.approvalRoute : undefined,
    forbiddenReason: actionKind === "forbidden"
      ? sanitizeAiScreenMagicUserCopy(params.action.forbiddenReason ?? resolution.userFacingReason)
      : undefined,
    exactBlocker: actionKind === "exact_blocker"
      ? sanitizeAiScreenMagicUserCopy(params.action.exactBlocker ?? resolution.userFacingReason)
      : params.action.exactBlocker ? sanitizeAiScreenMagicUserCopy(params.action.exactBlocker) : undefined,
    canExecuteDirectly: false,
  };
}

export function buildAiScreenMagicIntentButton(params: {
  screenId: string;
  intent: AiScreenMagicButtonIntent;
  template?: AiScreenMagicButton;
  index: number;
}): AiScreenMagicButton {
  const actionKind = params.template?.actionKind === "exact_blocker"
    ? "exact_blocker"
    : params.intent.actionKind;
  const exactBlocker = params.intent.exactBlocker ?? params.template?.exactBlocker;
  return {
    id: `${params.screenId}.magic.intent.${actionKind}.${params.index + 1}`,
    label: sanitizeAiScreenMagicUserCopy(params.intent.label.trim()),
    actionKind,
    resultType: actionKind,
    expectedResult: expectedResultFor(actionKind),
    bffRoute: actionKind === "safe_read" || actionKind === "draft_only"
      ? params.template?.bffRoute
      : undefined,
    approvalRoute: actionKind === "approval_required" ? params.template?.approvalRoute : undefined,
    forbiddenReason: actionKind === "forbidden"
      ? sanitizeAiScreenMagicUserCopy(params.intent.userFacingReason ?? params.template?.forbiddenReason ?? "")
      : undefined,
    exactBlocker: actionKind === "exact_blocker"
      ? sanitizeAiScreenMagicUserCopy(exactBlocker ?? "")
      : exactBlocker ? sanitizeAiScreenMagicUserCopy(exactBlocker) : undefined,
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
      userFacingReason: "Открывает безопасный результат чтения по данным текущего экрана.",
      canExecuteDirectly: false,
    };
  }
  if (button.actionKind === "draft_only") {
    return {
      button,
      status: "clickable_draft_only",
      userFacingReason: "Создаёт только безопасный черновик без финальной отправки.",
      canExecuteDirectly: false,
    };
  }
  if (button.actionKind === "approval_required") {
    return {
      button,
      status: "routes_to_approval_ledger",
      userFacingReason: "Маршрутизирует действие через журнал согласования и не исполняет его напрямую.",
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

function normalizeButtonText(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function exactButtonTarget(value: string): string {
  const raw = String(value || "").trim();
  const prefixed = /^\s*Готово от AI:\s*(.+?)\s*$/i.exec(raw);
  return prefixed?.[1] ?? raw;
}

function findButton(pack: AiScreenMagicPack, buttonIdOrLabel: string): AiScreenMagicButton | null {
  const needle = normalizeButtonText(exactButtonTarget(buttonIdOrLabel));
  if (!needle) return null;
  return pack.buttons.find((button) => {
    const id = normalizeButtonText(button.id);
    const label = normalizeButtonText(button.label);
    return needle === id || needle === label;
  }) ?? null;
}

export function buildAiScreenMagicClickPayload(button: Pick<AiScreenMagicButton, "label">): string {
  return `${AI_SCREEN_MAGIC_CLICK_PREFIX} ${button.label}`;
}

export function isAiScreenMagicClickPayload(value: string): boolean {
  return /^\s*Готово от AI:\s*.+?\s*$/i.test(String(value || ""));
}

export type AiScreenMagicButtonResultCopy = {
  button: AiScreenMagicButton;
  userLabel: string;
  resultType: AiScreenMagicActionKind;
  answer: string;
  groundedAnswer: AiGroundedAnswer;
  providerCallAllowed: false;
  dbWriteUsed: false;
  directMutationUsed: false;
};

export function buildAiScreenMagicButtonResultCopy(params: {
  pack: AiScreenMagicPack;
  buttonIdOrLabel: string;
}): AiScreenMagicButtonResultCopy | null {
  const button = findButton(params.pack, params.buttonIdOrLabel);
  if (!button) return null;
  const groundedAnswer = buildAiGroundedAnswer({ pack: params.pack, button });

  return {
    button,
    userLabel: button.label,
    resultType: button.resultType,
    answer: sanitizeAiScreenMagicUserCopy(formatAiGroundedAnswer({
      answer: groundedAnswer,
      actionKind: button.actionKind,
    })),
    groundedAnswer,
    providerCallAllowed: false,
    dbWriteUsed: false,
    directMutationUsed: false,
  };
}

export function buildAiScreenMagicFreeTextResultCopy(params: {
  pack: AiScreenMagicPack;
  userText: string;
  routeParams?: Record<string, string | number | boolean | null | undefined>;
}): AiScreenMagicButtonResultCopy {
  const groundedAnswer = buildAiGroundedFreeTextAnswer({
    pack: params.pack,
    userText: params.userText,
    routeParams: params.routeParams,
  });
  const actionKind = groundedAnswer.answerKind === "grounded_draft"
    ? "draft_only"
    : groundedAnswer.answerKind === "grounded_approval_route"
      ? "approval_required"
      : "safe_read";
  const button: AiScreenMagicButton = {
    id: groundedAnswer.actionId,
    label: groundedAnswer.actionLabelRu,
    actionKind,
    resultType: actionKind,
    expectedResult: expectedResultFor(actionKind),
    canExecuteDirectly: false,
  };

  return {
    button,
    userLabel: groundedAnswer.actionLabelRu,
    resultType: actionKind,
    answer: sanitizeAiScreenMagicUserCopy(formatAiGroundedAnswer({
      answer: groundedAnswer,
      actionKind,
    })),
    groundedAnswer,
    providerCallAllowed: false,
    dbWriteUsed: false,
    directMutationUsed: false,
  };
}
