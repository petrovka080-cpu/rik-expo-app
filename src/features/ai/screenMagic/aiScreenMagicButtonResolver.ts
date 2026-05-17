import { resolveAiScreenWorkflowButton } from "../screenWorkflows/aiScreenWorkflowButtonResolver";
import type { AiScreenWorkflowAction } from "../screenWorkflows/aiScreenWorkflowTypes";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicExpectedResult,
  AiScreenMagicPack,
} from "./aiScreenMagicTypes";
import { sanitizeAiScreenMagicUserCopy } from "./aiScreenMagicUserCopy";

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

function normalizeButtonText(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function findButton(pack: AiScreenMagicPack, buttonIdOrLabel: string): AiScreenMagicButton | null {
  const needle = normalizeButtonText(buttonIdOrLabel);
  if (!needle) return null;
  return pack.buttons.find((button) => {
    const id = normalizeButtonText(button.id);
    const label = normalizeButtonText(button.label);
    return needle === id || needle === label || needle.includes(label) || needle.includes(id);
  }) ?? null;
}

export type AiScreenMagicButtonResultCopy = {
  button: AiScreenMagicButton;
  userLabel: string;
  answer: string;
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
  const resolution = resolveAiScreenMagicButton(button);
  const focus = params.pack.aiPreparedWork[0];
  const missing = [...new Set(params.pack.aiPreparedWork.flatMap((item) => item.missingData))].slice(0, 3);
  const focusLine = focus ? `${focus.title}: ${focus.description}` : params.pack.userGoal;
  const missingLine = missing.length > 0
    ? `Недостающие данные: ${missing.join("; ")}.`
    : "Недостающие данные не выдумываются; если evidence нет, действие остаётся в safe preview.";
  const statusLine =
    resolution.status === "clickable_safe_read"
      ? "Открыт безопасный результат чтения из hydrated screen context. Запись в БД не выполнялась."
      : resolution.status === "clickable_draft_only"
        ? "Черновик готов как draft-only preview. Финальная отправка и запись запрещены без проверки."
        : resolution.status === "routes_to_approval_ledger"
          ? "Маршрут согласования подготовлен через approval ledger. AI не approve и не исполняет действие сам."
          : resolution.status === "forbidden_with_reason"
            ? `Действие запрещено для прямого AI-исполнения: ${resolution.userFacingReason}`
            : `Точный blocker: ${resolution.userFacingReason}`;

  return {
    button,
    userLabel: button.label,
    answer: sanitizeAiScreenMagicUserCopy([
      `Готово от AI: ${button.label}.`,
      params.pack.screenSummary,
      focusLine,
      missingLine,
      statusLine,
    ].join(" ")),
    providerCallAllowed: false,
    dbWriteUsed: false,
    directMutationUsed: false,
  };
}
