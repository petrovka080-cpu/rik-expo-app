import { resolveAiScreenWorkflowButton } from "../screenWorkflows/aiScreenWorkflowButtonResolver";
import type { AiScreenWorkflowAction } from "../screenWorkflows/aiScreenWorkflowTypes";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicButtonIntent,
  AiScreenMagicExpectedResult,
  AiScreenMagicPack,
} from "./aiScreenMagicTypes";
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
    label: params.label?.trim() || params.action.label,
    actionKind,
    resultType: actionKind,
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

export function buildAiScreenMagicIntentButton(params: {
  screenId: string;
  intent: AiScreenMagicButtonIntent;
  template?: AiScreenMagicButton;
  index: number;
}): AiScreenMagicButton {
  const actionKind = params.template?.actionKind === "exact_blocker"
    ? "exact_blocker"
    : params.intent.actionKind;
  return {
    id: `${params.screenId}.magic.intent.${actionKind}.${params.index + 1}`,
    label: params.intent.label.trim(),
    actionKind,
    resultType: actionKind,
    expectedResult: expectedResultFor(actionKind),
    bffRoute: actionKind === "safe_read" || actionKind === "draft_only"
      ? params.template?.bffRoute
      : undefined,
    approvalRoute: actionKind === "approval_required" ? params.template?.approvalRoute : undefined,
    forbiddenReason: actionKind === "forbidden"
      ? params.intent.userFacingReason ?? params.template?.forbiddenReason
      : undefined,
    exactBlocker: actionKind === "exact_blocker"
      ? params.intent.exactBlocker ?? params.template?.exactBlocker
      : params.intent.exactBlocker ?? params.template?.exactBlocker,
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
    resultType: button.resultType,
    answer: sanitizeAiScreenMagicUserCopy([
      `Готово от AI: ${button.label}.`,
      `Result type: ${button.resultType}.`,
      params.pack.screenSummary,
      params.pack.visibleDomainData.length > 0 ? `Данные экрана: ${params.pack.visibleDomainData.slice(0, 4).join("; ")}.` : null,
      params.pack.riskSummary.length > 0 ? `Риски: ${params.pack.riskSummary.slice(0, 3).join("; ")}.` : null,
      focusLine,
      missingLine,
      statusLine,
    ].filter(Boolean).join(" ")),
    providerCallAllowed: false,
    dbWriteUsed: false,
    directMutationUsed: false,
  };
}
