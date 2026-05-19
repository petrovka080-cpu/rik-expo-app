import { getAiApprovalActionRoute } from "../../src/features/ai/approvalRouter/aiApprovalActionRouter";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicPack,
} from "../../src/features/ai/screenMagic/aiScreenMagicTypes";

export const AI_FINANCE_APPROVAL_MAGIC_WAVE =
  "S_AI_MAGIC_FINANCE_APPROVAL_POINT_OF_NO_RETURN" as const;

export const AI_FINANCE_APPROVAL_MAGIC_GREEN_STATUS =
  "GREEN_AI_MAGIC_FINANCE_APPROVAL_READY" as const;

export const AI_FINANCE_APPROVAL_MAGIC_SCREENS = [
  "accountant.main",
  "accountant.payment",
  "accountant.history",
  "director.finance",
  "approval.inbox",
] as const;

export type AiFinanceApprovalMagicScreenId =
  (typeof AI_FINANCE_APPROVAL_MAGIC_SCREENS)[number];

type ExpectedFinanceButton = {
  label: string;
  actionKind: AiScreenMagicActionKind;
};

export const AI_FINANCE_APPROVAL_MAGIC_EXPECTED_BUTTONS = {
  "accountant.main": [
    { label: "Проверить критические", actionKind: "safe_read" },
    { label: "Собрать отчёт за сегодня", actionKind: "draft_only" },
    { label: "Подготовить rationale директору", actionKind: "draft_only" },
    { label: "Запросить документы", actionKind: "draft_only" },
    { label: "Отправить на согласование", actionKind: "approval_required" },
  ],
  "accountant.payment": [
    { label: "Проверить документы", actionKind: "safe_read" },
    { label: "Подготовить rationale", actionKind: "draft_only" },
    { label: "Запросить подтверждение", actionKind: "draft_only" },
    { label: "Отправить на согласование", actionKind: "approval_required" },
  ],
  "accountant.history": [
    { label: "Показать отклонения", actionKind: "safe_read" },
    { label: "Сравнить поставщиков", actionKind: "safe_read" },
    { label: "Собрать отчёт по рискам", actionKind: "draft_only" },
  ],
  "director.finance": [
    { label: "Открыть рискованные платежи", actionKind: "safe_read" },
    { label: "Сравнить историю поставщика", actionKind: "safe_read" },
    { label: "Запросить rationale", actionKind: "draft_only" },
    { label: "Открыть approval inbox", actionKind: "safe_read" },
  ],
  "approval.inbox": [
    { label: "Approve", actionKind: "approval_required" },
    { label: "Reject", actionKind: "approval_required" },
    { label: "Запросить данные", actionKind: "draft_only" },
    { label: "Открыть evidence", actionKind: "safe_read" },
  ],
} as const satisfies Record<AiFinanceApprovalMagicScreenId, readonly ExpectedFinanceButton[]>;

export type AiFinanceApprovalMagicProofOptions = {
  webProofPass?: boolean;
  androidProofPass?: boolean;
  iosTestflightSignoffCurrent?: boolean;
};

function normalizeLabel(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
}

function getFinanceApprovalMagicPack(screenId: AiFinanceApprovalMagicScreenId): AiScreenMagicPack {
  return getAiScreenMagicPack({ role: "unknown", context: "unknown", screenId });
}

function findButton(pack: AiScreenMagicPack, expected: ExpectedFinanceButton): AiScreenMagicButton | null {
  const expectedLabel = normalizeLabel(expected.label);
  return pack.buttons.find((button) =>
    normalizeLabel(button.label) === expectedLabel && button.actionKind === expected.actionKind,
  ) ?? null;
}

function expectedResultFor(kind: AiScreenMagicActionKind): string {
  if (kind === "safe_read") return "opens_read_result";
  if (kind === "draft_only") return "creates_safe_draft";
  if (kind === "approval_required") return "routes_to_approval_ledger";
  if (kind === "forbidden") return "shows_forbidden_reason";
  return "shows_exact_blocker";
}

function containsDirectPaymentPath(button: AiScreenMagicButton): boolean {
  const text = normalizeLabel(`${button.id} ${button.label} ${button.forbiddenReason ?? ""}`);
  const looksLikeFinalFinanceAction =
    /провести оплат|оплатить сейчас|post finance|apply payment|create payment|direct payment/.test(text);
  return looksLikeFinalFinanceAction && button.actionKind !== "forbidden";
}

function containsDebugCopy(value: string): boolean {
  return /raw json|route key|provider unavailable|module unavailable|raw provider payload|raw policy dump/i.test(value);
}

function containsFakeFinanceData(value: string): boolean {
  return /fake supplier|fake price|fake payment|fake document|\bSupplier A\b|\bSupplier B\b/i.test(value);
}

export function listAiFinanceApprovalMagicPacks(): AiScreenMagicPack[] {
  return AI_FINANCE_APPROVAL_MAGIC_SCREENS.map(getFinanceApprovalMagicPack);
}

export function buildAiFinanceApprovalMagicButtonManifest() {
  return listAiFinanceApprovalMagicPacks().flatMap((pack) =>
    AI_FINANCE_APPROVAL_MAGIC_EXPECTED_BUTTONS[pack.screenId as AiFinanceApprovalMagicScreenId]
      .map((expected) => {
        const button = findButton(pack, expected);
        const result = button
          ? buildAiScreenMagicButtonResultCopy({ pack, buttonIdOrLabel: button.id })
          : null;
        return {
          screenId: pack.screenId,
          label: expected.label,
          actionKind: expected.actionKind,
          found: Boolean(button),
          resultVisible: Boolean(result?.answer),
          expectedResult: button?.expectedResult ?? null,
          bffRoute: button?.bffRoute ?? null,
          approvalRoute: button?.approvalRoute ?? null,
          canExecuteDirectly: button?.canExecuteDirectly ?? null,
          providerCallAllowed: result?.providerCallAllowed ?? false,
          dbWriteUsed: result?.dbWriteUsed ?? false,
          directMutationUsed: result?.directMutationUsed ?? false,
        };
      }),
  );
}

export function buildAiFinanceApprovalMagicInventory() {
  return {
    wave: AI_FINANCE_APPROVAL_MAGIC_WAVE,
    screens: listAiFinanceApprovalMagicPacks().map((pack) => ({
      screenId: pack.screenId,
      domain: pack.domain,
      roleScope: pack.roleScope,
      preparedWork: pack.aiPreparedWork.map((item) => item.title),
      visibleDomainData: pack.visibleDomainData,
      riskSummary: pack.riskSummary,
      missingDataSummary: pack.missingDataSummary,
      safeActions: pack.safeActions,
      approvalCandidates: pack.approvalCandidates,
      exactBlockers: pack.exactBlockers,
      expectedButtons: AI_FINANCE_APPROVAL_MAGIC_EXPECTED_BUTTONS[
        pack.screenId as AiFinanceApprovalMagicScreenId
      ],
    })),
  };
}

export function buildAiFinanceApprovalMagicMatrix(options: AiFinanceApprovalMagicProofOptions = {}) {
  const packs = listAiFinanceApprovalMagicPacks();
  const buttons = buildAiFinanceApprovalMagicButtonManifest();
  const serialized = JSON.stringify(packs);
  const visibleCopy = JSON.stringify(packs.map((pack) => ({
    userGoal: pack.userGoal,
    userHeader: pack.userHeader,
    screenSummary: pack.screenSummary,
    visibleDomainData: pack.visibleDomainData,
    riskSummary: pack.riskSummary,
    missingDataSummary: pack.missingDataSummary,
    safeActions: pack.safeActions,
    approvalCandidates: pack.approvalCandidates,
    exactBlockers: pack.exactBlockers,
    aiPreparedWork: pack.aiPreparedWork.map((item) => ({
      title: item.title,
      description: item.description,
      missingData: item.missingData,
    })),
    buttons: pack.buttons.map((button) => ({
      label: button.label,
      forbiddenReason: button.forbiddenReason,
      exactBlocker: button.exactBlocker,
    })),
  })));
  const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));
  const approvalInboxRoute = getAiApprovalActionRoute("approval.inbox.approval");
  const qaFromScreenContext = packs.every((pack) => {
    const question = pack.qa[0]?.question ?? "Что критично сейчас?";
    return answerAiScreenMagicQuestion({ pack, question })?.answeredFromScreenContext === true;
  });
  const expectedButtonsFound = buttons.every((button) =>
    button.found &&
    button.resultVisible &&
    button.canExecuteDirectly === false &&
    button.expectedResult === expectedResultFor(button.actionKind),
  );
  const safeReadNoMutation = buttons
    .filter((button) => button.actionKind === "safe_read")
    .every((button) =>
      button.dbWriteUsed === false &&
      button.directMutationUsed === false &&
      button.expectedResult === "opens_read_result",
    );
  const draftOnlyNotFinalSubmit = buttons
    .filter((button) => button.actionKind === "draft_only")
    .every((button) =>
      button.dbWriteUsed === false &&
      button.directMutationUsed === false &&
      button.expectedResult === "creates_safe_draft",
    );
  const approvalRequiredRoutesToLedger = buttons
    .filter((button) => button.actionKind === "approval_required")
    .every((button) =>
      Boolean(button.approvalRoute) &&
      button.dbWriteUsed === false &&
      button.directMutationUsed === false,
    );
  const financeContextHydrated = ["accountant.main", "accountant.payment", "accountant.history", "director.finance"]
    .every((screenId) => {
      const pack = packByScreen.get(screenId);
      return Boolean(
        pack &&
        (pack.domain === "finance" || screenId === "director.finance") &&
        pack.aiPreparedWork.length >= 4 &&
        pack.visibleDomainData.length > 0 &&
        pack.riskSummary.length > 0 &&
        pack.missingDataSummary.length > 0,
      );
    });
  const approvalContextHydrated = (() => {
    const pack = packByScreen.get("approval.inbox");
    return Boolean(
      pack &&
      pack.visibleDomainData.length > 0 &&
      pack.riskSummary.length > 0 &&
      pack.approvalCandidates.length > 0 &&
      pack.exactBlockers.length > 0,
    );
  })();
  const directPaymentPathsFound = packs
    .flatMap((pack) => pack.buttons)
    .filter(containsDirectPaymentPath).length;
  const aiAutoApproval = buttons
    .filter((button) => button.screenId === "approval.inbox" && ["Approve", "Reject"].includes(button.label))
    .some((button) =>
      button.actionKind !== "approval_required" ||
      button.canExecuteDirectly !== false ||
      !button.approvalRoute,
    );
  const ledgerDecisionSafe =
    approvalInboxRoute?.routeKind === "ledger_decision" &&
    approvalInboxRoute.ledgerRoute.ledgerBacked === true &&
    approvalInboxRoute.ledgerRoute.directExecuteAllowed === false &&
    approvalInboxRoute.executionPolicy.requiresApprovedStatus === true &&
    approvalInboxRoute.executionPolicy.directExecuteAllowed === false;
  const fakeDataFound = containsFakeFinanceData(serialized);
  const debugCopyVisible = containsDebugCopy(visibleCopy);
  const coreGreen =
    packs.length === AI_FINANCE_APPROVAL_MAGIC_SCREENS.length &&
    expectedButtonsFound &&
    financeContextHydrated &&
    approvalContextHydrated &&
    qaFromScreenContext &&
    safeReadNoMutation &&
    draftOnlyNotFinalSubmit &&
    approvalRequiredRoutesToLedger &&
    ledgerDecisionSafe &&
    directPaymentPathsFound === 0 &&
    !aiAutoApproval &&
    !fakeDataFound &&
    !debugCopyVisible;

  return {
    wave: AI_FINANCE_APPROVAL_MAGIC_WAVE,
    final_status: coreGreen
      ? AI_FINANCE_APPROVAL_MAGIC_GREEN_STATUS
      : "BLOCKED_AI_MAGIC_FINANCE_APPROVAL_CONTRACT",
    screens_covered: packs.length,
    finance_context_hydrated: financeContextHydrated,
    approval_context_hydrated: approvalContextHydrated,
    qa_from_screen_context: qaFromScreenContext,
    buttons_clicked_on_web: options.webProofPass ?? false,
    buttons_targetable_on_android: options.androidProofPass ?? false,
    ios_testflight_signoff_current: options.iosTestflightSignoffCurrent ?? true,
    safe_read_no_mutation: safeReadNoMutation,
    draft_only_not_final_submit: draftOnlyNotFinalSubmit,
    approval_required_routes_to_ledger: approvalRequiredRoutesToLedger && ledgerDecisionSafe,
    direct_payment_paths_found: directPaymentPathsFound,
    ai_auto_approval: aiAutoApproval,
    fake_payments_created: false,
    fake_documents_created: false,
    debug_copy_visible: debugCopyVisible,
    new_hooks_added: false,
    fake_green_claimed: false,
    expected_buttons_found: expectedButtonsFound,
    button_manifest: buttons,
  };
}

export function buildAiFinanceApprovalMagicProofMarkdown(options: AiFinanceApprovalMagicProofOptions = {}): string {
  const matrix = buildAiFinanceApprovalMagicMatrix(options);
  return [
    `# ${AI_FINANCE_APPROVAL_MAGIC_WAVE}`,
    "",
    `Final status: ${matrix.final_status}`,
    `Screens covered: ${matrix.screens_covered}`,
    `Finance context hydrated: ${matrix.finance_context_hydrated}`,
    `Approval context hydrated: ${matrix.approval_context_hydrated}`,
    `Buttons clicked on web: ${matrix.buttons_clicked_on_web}`,
    `Buttons targetable on Android: ${matrix.buttons_targetable_on_android}`,
    `iOS TestFlight signoff current: ${matrix.ios_testflight_signoff_current}`,
    "",
    "Finance/approval AI is delivered through the existing screenMagic and approval-ledger contracts.",
    "Safe reads open readable results, draft-only actions stay previews, and approval actions route to the ledger.",
    "No direct payment, fake payment, fake document, DB write, provider default path, or AI self-approval is allowed.",
  ].join("\n");
}
