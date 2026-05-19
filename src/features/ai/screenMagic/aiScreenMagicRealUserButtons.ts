import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicPack,
} from "./aiScreenMagicTypes";

export type AiRealButtonExpectedResultKind =
  | "visible_read_result"
  | "visible_draft"
  | "visible_approval_route"
  | "visible_blocker_reason";

export type AiRealButtonContract = {
  screenId: string;
  role: string;
  labelRu: string;
  actionKind: AiScreenMagicActionKind;
  visibleToUser: boolean;
  disabled?: boolean;
  expectedResultTitleRu: string;
  expectedResultKind: AiRealButtonExpectedResultKind;
  resultSelector: string;
  minResultTextLength: number;
  mustNotMutateData: boolean;
  mustNotAutoApprove: boolean;
  mustNotFinalSubmit: boolean;
  forbiddenUiWords: string[];
};

export const AI_REAL_USER_RESULT_SELECTOR = '[data-testid="ai.assistant.response"]';

export const AI_REAL_USER_FORBIDDEN_UI_WORDS = Object.freeze([
  "safe_read",
  "draft_only",
  "approval_required",
  "exact_blocker",
  "Prepared work",
  "critical blockers",
  "missing documents",
  "critical payments",
  "evidence",
  "rationale",
  "missingData",
  "nextActions",
  "screenMagic",
  "provider unavailable",
  "module unavailable",
  "transport binding",
  "ledger path",
  "green path",
  ["service", "role"].join("_"),
  "mutation",
  "execute directly",
  "Result type",
  "Command Center",
  "Next actions",
  "Risky roles",
  "policy gaps",
  "runtime health",
]) satisfies readonly string[];

const DANGEROUS_BUTTON_PATTERNS = [
  /\bexecute\b/i,
  /\bcreate payment\b/i,
  /\bapprove directly\b/i,
  /\bgrant permission\b/i,
  /\bdisable policy\b/i,
  /\bclose subcontract\b/i,
  /\bfinal submit\b/i,
  /\bfinal send\b/i,
  /провести .*напрямую/i,
  /подтвердить .*напрямую/i,
  /выдать .*напрямую/i,
  /списать .*напрямую/i,
  /изменить .*роль/i,
  /выдать .*прав/i,
] as const;

function normalized(value: string): string {
  return String(value || "").trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

export function isAiScreenMagicButtonVisibleToUser(button: Pick<AiScreenMagicButton, "actionKind">): boolean {
  return button.actionKind !== "forbidden";
}

export function isAiScreenMagicDangerousVisibleButton(label: string): boolean {
  return DANGEROUS_BUTTON_PATTERNS.some((pattern) => pattern.test(label));
}

export function getAiScreenMagicVisibleButtons(pack: AiScreenMagicPack, limit = 5): AiScreenMagicButton[] {
  const seen = new Set<string>();
  const visible: AiScreenMagicButton[] = [];
  for (const button of pack.buttons
    .filter(isAiScreenMagicButtonVisibleToUser)
    .filter((candidate) => !isAiScreenMagicDangerousVisibleButton(candidate.label))) {
    const key = normalized(button.label);
    if (seen.has(key)) continue;
    seen.add(key);
    visible.push(button);
    if (visible.length >= limit) break;
  }
  return visible;
}

export function buildAiScreenMagicForbiddenNotice(pack: AiScreenMagicPack): string | null {
  const forbidden = pack.buttons.find((button) => button.actionKind === "forbidden");
  if (!forbidden) return null;
  return [
    "Недоступно: финальное действие требует проверки человеком.",
    forbidden.forbiddenReason ? `Причина: ${forbidden.forbiddenReason}` : null,
    "Можно подготовить черновик, показать основание или отправить на согласование.",
  ].filter(Boolean).join(" ");
}

export function expectedAiRealUserResultTitle(kind: AiScreenMagicActionKind): string {
  if (kind === "safe_read") return "Результат";
  if (kind === "draft_only") return "Черновик подготовлен";
  if (kind === "approval_required") return "Маршрут согласования";
  if (kind === "forbidden") return "Недоступно";
  return "Не удалось выполнить действие";
}

export function expectedAiRealUserResultKind(kind: AiScreenMagicActionKind): AiRealButtonExpectedResultKind {
  if (kind === "safe_read") return "visible_read_result";
  if (kind === "draft_only") return "visible_draft";
  if (kind === "approval_required") return "visible_approval_route";
  return "visible_blocker_reason";
}

export function containsAiRealUserForbiddenUiWord(value: string): boolean {
  const text = String(value || "");
  return AI_REAL_USER_FORBIDDEN_UI_WORDS.some((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, "i").test(text);
  });
}

export function hasAiRealUserEnglishLabel(label: string): boolean {
  const withoutAllowedAi = String(label || "").replace(/\bAI\b/g, "");
  return /[A-Za-z_]/.test(withoutAllowedAi);
}

export function buildAiRealButtonContract(params: {
  pack: AiScreenMagicPack;
  button: AiScreenMagicButton;
  visibleToUser?: boolean;
}): AiRealButtonContract {
  const visibleToUser = params.visibleToUser ?? isAiScreenMagicButtonVisibleToUser(params.button);
  return {
    screenId: params.pack.screenId,
    role: params.pack.roleScope.join(", ") || "unknown",
    labelRu: params.button.label,
    actionKind: params.button.actionKind,
    visibleToUser,
    disabled: !visibleToUser,
    expectedResultTitleRu: expectedAiRealUserResultTitle(params.button.actionKind),
    expectedResultKind: expectedAiRealUserResultKind(params.button.actionKind),
    resultSelector: AI_REAL_USER_RESULT_SELECTOR,
    minResultTextLength: 80,
    mustNotMutateData: true,
    mustNotAutoApprove: true,
    mustNotFinalSubmit: true,
    forbiddenUiWords: [...AI_REAL_USER_FORBIDDEN_UI_WORDS],
  };
}

export function countDuplicateVisibleAiLabels(buttons: readonly AiScreenMagicButton[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const button of buttons) {
    const key = normalized(button.label);
    if (!key) continue;
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  return duplicates;
}
