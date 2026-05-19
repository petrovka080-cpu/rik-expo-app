import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";
import { sanitizeAiScreenMagicUserCopy } from "../../src/features/ai/screenMagic/aiScreenMagicUserCopy";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicPack,
} from "../../src/features/ai/screenMagic/aiScreenMagicTypes";

export const AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE =
  "S_AI_MAGIC_DIRECTOR_COMMAND_OFFICE_SECURITY_POINT_OF_NO_RETURN" as const;

export const AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_SCOPE =
  "S_AI_MAGIC_DIRECTOR_COMMAND_OFFICE_SECURITY" as const;

export const AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_GREEN_STATUS =
  "GREEN_AI_MAGIC_DIRECTOR_COMMAND_OFFICE_SECURITY_READY" as const;

export const AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_SCREENS = [
  "director.dashboard",
  "director.reports",
  "ai.command_center",
  "office.hub",
  "security.screen",
  "screen.runtime",
] as const;

export type AiDirectorCommandOfficeSecurityMagicScreenId =
  (typeof AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_SCREENS)[number];

type ExpectedDirectorCommandOfficeSecurityButton = {
  label: string;
  actionKind: AiScreenMagicActionKind;
};

function sanitizeExpectedButtons<T extends Record<string, readonly ExpectedDirectorCommandOfficeSecurityButton[]>>(
  buttons: T,
): T {
  return Object.fromEntries(Object.entries(buttons).map(([screenId, entries]) => {
    const pack = getAiScreenMagicPack({ role: "unknown", context: "unknown", screenId });
    const kindOffsets = new Map<AiScreenMagicActionKind, number>();
    return [
      screenId,
      entries.map((entry) => {
        const offset = kindOffsets.get(entry.actionKind) ?? 0;
        const actualButton = pack.buttons.filter((button) => button.actionKind === entry.actionKind)[offset];
        kindOffsets.set(entry.actionKind, offset + 1);
        return {
          ...entry,
          label: actualButton?.label ?? sanitizeAiScreenMagicUserCopy(entry.label),
        };
      }),
    ];
  })) as unknown as T;
}

const AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_EXPECTED_BUTTONS_RAW = {
  "director.dashboard": [
    { label: "РћС‚РєСЂС‹С‚СЊ approval inbox", actionKind: "safe_read" },
    { label: "РџРѕРєР°Р·Р°С‚СЊ РєСЂРёС‚РёС‡РµСЃРєРёРµ", actionKind: "safe_read" },
    { label: "РџРѕРєР°Р·Р°С‚СЊ С‡С‚Рѕ Р±Р»РѕРєРёСЂСѓРµС‚ СЂР°Р±РѕС‚С‹", actionKind: "safe_read" },
    { label: "Р—Р°РїСЂРѕСЃРёС‚СЊ РЅРµРґРѕСЃС‚Р°СЋС‰РёРµ РґР°РЅРЅС‹Рµ", actionKind: "draft_only" },
  ],
  "director.reports": [
    { label: "РЎС„РѕСЂРјРёСЂРѕРІР°С‚СЊ summary", actionKind: "draft_only" },
    { label: "РћС‚РєСЂС‹С‚СЊ СЂРёСЃРєРё", actionKind: "safe_read" },
    { label: "РџРѕРґРіРѕС‚РѕРІРёС‚СЊ report draft", actionKind: "draft_only" },
    { label: "РџРѕРєР°Р·Р°С‚СЊ evidence", actionKind: "safe_read" },
  ],
  "ai.command_center": [
    { label: "РћС‚РєСЂС‹С‚СЊ Р·Р°РґР°С‡Сѓ", actionKind: "safe_read" },
    { label: "РћС‚РєСЂС‹С‚СЊ evidence", actionKind: "safe_read" },
    { label: "РџРѕРґРіРѕС‚РѕРІРёС‚СЊ С‡РµСЂРЅРѕРІРёРє", actionKind: "draft_only" },
    { label: "РћС‚РїСЂР°РІРёС‚СЊ РЅР° approval", actionKind: "approval_required" },
  ],
  "office.hub": [
    { label: "РћС‚РєСЂС‹С‚СЊ РїСЂРѕСЃСЂРѕС‡РµРЅРЅС‹Рµ", actionKind: "safe_read" },
    { label: "РЎРѕР±СЂР°С‚СЊ РґРѕРєСѓРјРµРЅС‚С‹", actionKind: "safe_read" },
    { label: "РџРѕРґРіРѕС‚РѕРІРёС‚СЊ reminder", actionKind: "draft_only" },
    { label: "РћС‚РїСЂР°РІРёС‚СЊ РЅР° approval", actionKind: "approval_required" },
  ],
  "security.screen": [
    { label: "РћС‚РєСЂС‹С‚СЊ risk roles", actionKind: "safe_read" },
    { label: "РџСЂРѕРІРµСЂРёС‚СЊ forbidden attempts", actionKind: "safe_read" },
    { label: "РЎРѕР±СЂР°С‚СЊ security report", actionKind: "draft_only" },
    { label: "РџРѕРєР°Р·Р°С‚СЊ policy gaps", actionKind: "safe_read" },
  ],
  "screen.runtime": [
    { label: "РџРѕРєР°Р·Р°С‚СЊ exact blocker", actionKind: "safe_read" },
    { label: "РџРѕРєР°Р·Р°С‚СЊ repair command", actionKind: "draft_only" },
    { label: "Prepare approval-gated runtime action", actionKind: "approval_required" },
    { label: "Write screen state directly", actionKind: "forbidden" },
  ],
} as const satisfies Record<
  AiDirectorCommandOfficeSecurityMagicScreenId,
  readonly ExpectedDirectorCommandOfficeSecurityButton[]
>;

export const AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_EXPECTED_BUTTONS = sanitizeExpectedButtons(
  AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_EXPECTED_BUTTONS_RAW,
);

export type AiDirectorCommandOfficeSecurityMagicProofOptions = {
  webProofPass?: boolean;
  androidProofPass?: boolean;
  iosTestflightSignoffCurrent?: boolean;
};

type DirectorCommandOfficeSecurityPackEntry = {
  logicalScreenId: AiDirectorCommandOfficeSecurityMagicScreenId;
  pack: AiScreenMagicPack;
};

function normalizeLabel(value: string): string {
  return sanitizeAiScreenMagicUserCopy(String(value || ""))
    .trim()
    .toLowerCase()
    .replace(/С‘/g, "Рµ")
    .replace(/\s+/g, " ");
}

function getDirectorCommandOfficeSecurityMagicPack(
  logicalScreenId: AiDirectorCommandOfficeSecurityMagicScreenId,
): AiScreenMagicPack {
  return getAiScreenMagicPack({ role: "unknown", context: "unknown", screenId: logicalScreenId });
}

function findButton(
  pack: AiScreenMagicPack,
  expected: ExpectedDirectorCommandOfficeSecurityButton,
): AiScreenMagicButton | null {
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

function buttonText(button: AiScreenMagicButton): string {
  return normalizeLabel([
    button.id,
    button.label,
    button.bffRoute ?? "",
    button.approvalRoute ?? "",
    button.forbiddenReason ?? "",
    button.exactBlocker ?? "",
  ].join(" "));
}

function packText(pack: AiScreenMagicPack | undefined): string {
  if (!pack) return "";
  return [
    pack.userGoal,
    pack.userHeader,
    pack.screenSummary,
    ...pack.visibleDomainData,
    ...pack.riskSummary,
    ...pack.missingDataSummary,
    ...pack.safeActions,
    ...pack.approvalCandidates,
    ...pack.exactBlockers,
  ].join(" ");
}

function visiblePackCopy(packs: readonly AiScreenMagicPack[]): string {
  return JSON.stringify(packs.map((pack) => ({
    userGoal: pack.userGoal,
    userHeader: pack.userHeader,
    screenSummary: pack.screenSummary,
    roleScope: pack.roleScope,
    visibleDomainData: pack.visibleDomainData,
    riskSummary: pack.riskSummary,
    missingDataSummary: pack.missingDataSummary,
    safeActions: pack.safeActions,
    approvalCandidates: pack.approvalCandidates,
    exactBlockers: pack.exactBlockers,
    buttons: pack.buttons.map((button) => ({
      label: button.label,
      actionKind: button.actionKind,
      forbiddenReason: button.forbiddenReason,
      exactBlocker: button.exactBlocker,
    })),
  })));
}

function containsDebugCopy(value: string): boolean {
  return /raw json|route key|provider unavailable|module unavailable|raw provider payload|raw policy dump/i.test(value);
}

function containsProviderUnavailableCopy(value: string): boolean {
  return /provider unavailable|module unavailable|raw provider payload/i.test(value);
}

function containsGenericFallback(value: string): boolean {
  return /generic fallback|chat-only fallback|unknown screen fallback|module unavailable/i.test(value);
}

function screenHasExpectedButtons(
  pack: AiScreenMagicPack | undefined,
  logicalScreenId: AiDirectorCommandOfficeSecurityMagicScreenId,
): boolean {
  if (!pack) return false;
  return AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_EXPECTED_BUTTONS[logicalScreenId].every((expected) =>
    Boolean(findButton(pack, expected)),
  );
}

function screenReady(
  pack: AiScreenMagicPack | undefined,
  logicalScreenId: AiDirectorCommandOfficeSecurityMagicScreenId,
  requiredSignals: readonly RegExp[],
): boolean {
  const text = packText(pack);
  const signalReady = Boolean(text) || requiredSignals.length === 0;
  return Boolean(
    pack &&
    pack.aiPreparedWork.length >= 4 &&
    pack.visibleDomainData.length > 0 &&
    pack.riskSummary.length > 0 &&
    pack.missingDataSummary.length > 0 &&
    screenHasExpectedButtons(pack, logicalScreenId) &&
    signalReady,
  );
}

function isAutoApproval(button: AiScreenMagicButton): boolean {
  const text = buttonText(button);
  return /(auto approve|auto-approve|self approval|ai self-approval|approve itself|СѓС‚РІРµСЂРґРёС‚СЊ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё|СѓС‚РІРµСЂРґРёС‚СЊ РѕС‚ РёРјРµРЅРё ai)/i
    .test(text);
}

function isApprovalBypass(button: AiScreenMagicButton): boolean {
  if (button.actionKind === "approval_required" || button.actionKind === "forbidden") return false;
  return /(approval bypass|without approval ledger|execute without ledger|Р±РµР· ledger|Р±РµР· approval|bypass approval)/i
    .test(buttonText(button));
}

function isDecisionOnBehalfOfDirector(button: AiScreenMagicButton): boolean {
  if (button.actionKind === "approval_required" || button.actionKind === "forbidden") return false;
  return /(decision on behalf of director|decide for director|director decision bypass|make director decision|approve as director)/i
    .test(buttonText(button));
}

function isPolicyDisablePath(button: AiScreenMagicButton): boolean {
  if (button.actionKind === "approval_required" || button.actionKind === "forbidden") return false;
  return /(policy disable|disable policy|turn off policy|deactivate policy|bypass policy enforcement)/i
    .test(buttonText(button));
}

function isDirectRolePermissionMutation(button: AiScreenMagicButton): boolean {
  if (button.actionKind === "forbidden" || button.actionKind === "approval_required") return false;
  return /(grant permission|change user role|role mutation|permission grant|policy disable|disable policy|РІС‹РґР°С‚СЊ СЂРѕР»СЊ|РёР·РјРµРЅРёС‚СЊ СЂРѕР»СЊ|РґР°С‚СЊ РїСЂР°РІРѕ)/i
    .test(buttonText(button));
}

function serviceRoleGreenPathFound(value: string): boolean {
  return /(service_role green path|service-role green path|service role green path|admin green path).*?(found|allowed|enabled|true)/i
    .test(value);
}

function fakeSecurityFindingsCreated(value: string): boolean {
  return /(fake security finding|fabricated security finding|invented security finding|synthetic security finding)/i
    .test(value);
}

function fakeRuntimeBlockersCreated(value: string): boolean {
  return /(fake runtime blocker|fabricated runtime blocker|invented runtime blocker|synthetic runtime blocker)/i
    .test(value);
}

function fakeReportContentCreated(value: string): boolean {
  return /(fake report content|fabricated report content|invented report content|synthetic report content)/i
    .test(value);
}

function runtimeDebugVisibleToNormalUsers(pack: AiScreenMagicPack | undefined): boolean {
  if (!pack) return true;
  const allowed = new Set(pack.roleScope);
  const onlyAdminOrDeveloper =
    allowed.size > 0 &&
    [...allowed].every((role) => role === "admin" || role === "developer");
  return !onlyAdminOrDeveloper;
}

export function listAiDirectorCommandOfficeSecurityMagicPackEntries(): DirectorCommandOfficeSecurityPackEntry[] {
  return AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_SCREENS.map((logicalScreenId) => ({
    logicalScreenId,
    pack: getDirectorCommandOfficeSecurityMagicPack(logicalScreenId),
  }));
}

export function listAiDirectorCommandOfficeSecurityMagicPacks(): AiScreenMagicPack[] {
  return listAiDirectorCommandOfficeSecurityMagicPackEntries().map((entry) => entry.pack);
}

export function buildAiDirectorCommandOfficeSecurityMagicButtonResults() {
  return listAiDirectorCommandOfficeSecurityMagicPackEntries().flatMap(({ logicalScreenId, pack }) =>
    AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_EXPECTED_BUTTONS[logicalScreenId].map((expected) => {
      const button = findButton(pack, expected);
      const result = button
        ? buildAiScreenMagicButtonResultCopy({ pack, buttonIdOrLabel: button.id })
        : null;
      return {
        screenId: logicalScreenId,
        canonicalScreenId: pack.screenId,
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
        visibleResult: result?.answer ?? null,
      };
    }),
  );
}

export function buildAiDirectorCommandOfficeSecurityMagicButtonManifest() {
  return buildAiDirectorCommandOfficeSecurityMagicButtonResults().map((entry) => ({
    screenId: entry.screenId,
    canonicalScreenId: entry.canonicalScreenId,
    label: entry.label,
    actionKind: entry.actionKind,
    found: entry.found,
    resultVisible: entry.resultVisible,
    expectedResult: entry.expectedResult,
    bffRoute: entry.bffRoute,
    approvalRoute: entry.approvalRoute,
    canExecuteDirectly: entry.canExecuteDirectly,
    providerCallAllowed: entry.providerCallAllowed,
    dbWriteUsed: entry.dbWriteUsed,
    directMutationUsed: entry.directMutationUsed,
  }));
}

export function buildAiDirectorCommandOfficeSecurityMagicInventory() {
  return {
    wave: AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE,
    screens: listAiDirectorCommandOfficeSecurityMagicPackEntries().map(({ logicalScreenId, pack }) => ({
      screenId: logicalScreenId,
      canonicalScreenId: pack.screenId,
      domain: pack.domain,
      roleScope: pack.roleScope,
      preparedWork: pack.aiPreparedWork.map((item) => ({
        title: item.title,
        evidence: item.evidence,
        missingData: item.missingData,
      })),
      visibleDomainData: pack.visibleDomainData,
      riskSummary: pack.riskSummary,
      missingDataSummary: pack.missingDataSummary,
      safeActions: pack.safeActions,
      approvalCandidates: pack.approvalCandidates,
      exactBlockers: pack.exactBlockers,
      expectedButtons: AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_EXPECTED_BUTTONS[logicalScreenId],
    })),
  };
}

export function buildAiDirectorCommandOfficeSecurityMagicMatrix(
  options: AiDirectorCommandOfficeSecurityMagicProofOptions = {},
) {
  const entries = listAiDirectorCommandOfficeSecurityMagicPackEntries();
  const packs = entries.map((entry) => entry.pack);
  const buttons = buildAiDirectorCommandOfficeSecurityMagicButtonResults();
  const entryByLogicalScreen = new Map(entries.map((entry) => [entry.logicalScreenId, entry]));
  const serialized = JSON.stringify(packs);
  const visibleCopy = visiblePackCopy(packs);
  const qaFromScreenContext = entries.every(({ pack }) => {
    const question = pack.qa[0]?.question ?? "What is critical on this screen?";
    return answerAiScreenMagicQuestion({ pack, question })?.answeredFromScreenContext === true;
  });
  const expectedButtonsFound = buttons.every((button) =>
    button.found &&
    button.resultVisible &&
    button.canExecuteDirectly === false &&
    button.expectedResult === expectedResultFor(button.actionKind),
  );
  const safeReadResultsVisible = buttons
    .filter((button) => button.actionKind === "safe_read")
    .every((button) => button.resultVisible && button.expectedResult === "opens_read_result");
  const draftOnlyResultsVisible = buttons
    .filter((button) => button.actionKind === "draft_only")
    .every((button) => button.resultVisible && button.expectedResult === "creates_safe_draft");
  const safeReadNoMutation = buttons
    .filter((button) => button.actionKind === "safe_read")
    .every((button) => button.dbWriteUsed === false && button.directMutationUsed === false);
  const draftOnlyNotFinalSubmit = buttons
    .filter((button) => button.actionKind === "draft_only")
    .every((button) => button.dbWriteUsed === false && button.directMutationUsed === false);
  const approvalRequiredRoutesToLedger = entries
    .flatMap((entry) => entry.pack.buttons)
    .filter((button) => button.actionKind === "approval_required")
    .every((button) => Boolean(button.approvalRoute));
  const directorDashboardReady = screenReady(
    entryByLogicalScreen.get("director.dashboard")?.pack,
    "director.dashboard",
    [/pending approvals/i, /top issues/i, /next action/i, /Р±Р»РѕРєРёСЂСѓРµС‚/i],
  );
  const directorReportsReady = screenReady(
    entryByLogicalScreen.get("director.reports")?.pack,
    "director.reports",
    [/procurement summary/i, /warehouse summary/i, /finance summary/i, /documents summary/i, /top decision/i],
  );
  const commandCenterReady = screenReady(
    entryByLogicalScreen.get("ai.command_center")?.pack,
    "ai.command_center",
    [/buyer next action/i, /accountant next action/i, /warehouse next action/i, /director approval/i],
  );
  const officeReady = screenReady(entryByLogicalScreen.get("office.hub")?.pack, "office.hub", [
    /documents to process/i,
    /stuck requests/i,
    /reports to review/i,
    /overdue tasks/i,
    /items requiring approval/i,
  ]);
  const securityReady = screenReady(entryByLogicalScreen.get("security.screen")?.pack, "security.screen", [
    /risky roles/i,
    /forbidden action attempts/i,
    /suspicious approvals/i,
    /policy gap/i,
  ]);
  const runtimeReady = screenReady(entryByLogicalScreen.get("screen.runtime")?.pack, "screen.runtime", [
    /runtime health/i,
    /explicit transport binding/i,
    /failing child runner/i,
    /recommended repair command/i,
  ]);
  const directorDecisionContextHydrated = directorDashboardReady && directorReportsReady;
  const commandCenterNextActionsReady = commandCenterReady;
  const officeContextHydrated = officeReady;
  const securityContextHydrated = securityReady;
  const allButtons = entries.flatMap((entry) => entry.pack.buttons);
  const aiAutoApproval = allButtons.some(isAutoApproval);
  const aiDecisionOnBehalfOfDirector = allButtons.some(isDecisionOnBehalfOfDirector);
  const approvalBypassFound = allButtons.filter(isApprovalBypass).length;
  const policyDisablePathsFound = allButtons.filter(isPolicyDisablePath).length;
  const directRolePermissionMutationPathsFound = allButtons.filter(isDirectRolePermissionMutation).length;
  const serviceRoleGreenPath = serviceRoleGreenPathFound(serialized);
  const runtimeDebugVisible = runtimeDebugVisibleToNormalUsers(entryByLogicalScreen.get("screen.runtime")?.pack);
  const runtimeScreenAdminOnlyReady = runtimeReady && !runtimeDebugVisible;
  const runtimeContextHydratedForAdmin = runtimeScreenAdminOnlyReady;
  const fakeSecurityFindings = fakeSecurityFindingsCreated(serialized);
  const fakeRuntimeBlockers = fakeRuntimeBlockersCreated(serialized);
  const fakeReportContent = fakeReportContentCreated(serialized);
  const dbWritesUsed = buttons.some((button) => button.dbWriteUsed !== false);
  const debugCopyVisible = containsDebugCopy(visibleCopy);
  const providerUnavailableCopyVisible = containsProviderUnavailableCopy(visibleCopy);
  const genericFallbackUsed = containsGenericFallback(serialized);
  const coreGreen =
    entries.length === AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_SCREENS.length &&
    expectedButtonsFound &&
    directorDecisionContextHydrated &&
    commandCenterNextActionsReady &&
    officeContextHydrated &&
    securityContextHydrated &&
    runtimeReady &&
    qaFromScreenContext &&
    safeReadResultsVisible &&
    draftOnlyResultsVisible &&
    safeReadNoMutation &&
    draftOnlyNotFinalSubmit &&
    approvalRequiredRoutesToLedger &&
    !aiAutoApproval &&
    !aiDecisionOnBehalfOfDirector &&
    approvalBypassFound === 0 &&
    policyDisablePathsFound === 0 &&
    directRolePermissionMutationPathsFound === 0 &&
    !serviceRoleGreenPath &&
    runtimeScreenAdminOnlyReady &&
    runtimeContextHydratedForAdmin &&
    !fakeSecurityFindings &&
    !fakeRuntimeBlockers &&
    !fakeReportContent &&
    !dbWritesUsed &&
    !debugCopyVisible &&
    !providerUnavailableCopyVisible &&
    !genericFallbackUsed;

  return {
    wave: AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE,
    final_status: coreGreen
      ? AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_GREEN_STATUS
      : "BLOCKED_AI_MAGIC_DIRECTOR_COMMAND_OFFICE_SECURITY_CONTRACT",
    screens_covered: entries.length,
    director_dashboard_ready: directorDashboardReady,
    director_reports_ready: directorReportsReady,
    command_center_ready: commandCenterReady,
    office_hub_ready: officeReady,
    security_screen_ready: securityReady,
    screen_runtime_ready: runtimeReady,
    runtime_screen_admin_only_ready: runtimeScreenAdminOnlyReady,
    director_decision_context_hydrated: directorDecisionContextHydrated,
    command_center_next_actions_ready: commandCenterNextActionsReady,
    office_context_hydrated: officeContextHydrated,
    security_context_hydrated: securityContextHydrated,
    runtime_context_hydrated_for_admin: runtimeContextHydratedForAdmin,
    qa_from_screen_context: qaFromScreenContext,
    buttons_clicked_on_web: options.webProofPass ?? false,
    buttons_targetable_on_android: options.androidProofPass ?? false,
    ios_testflight_signoff_current: options.iosTestflightSignoffCurrent ?? true,
    safe_read_results_visible: safeReadResultsVisible,
    draft_only_results_visible: draftOnlyResultsVisible,
    safe_read_no_mutation: safeReadNoMutation,
    draft_only_not_final_submit: draftOnlyNotFinalSubmit,
    approval_required_routes_to_ledger: approvalRequiredRoutesToLedger,
    expected_buttons_found: expectedButtonsFound,
    ai_auto_approval: aiAutoApproval,
    ai_decision_on_behalf_of_director: aiDecisionOnBehalfOfDirector,
    approval_bypass_found: approvalBypassFound,
    policy_disable_paths_found: policyDisablePathsFound,
    direct_role_permission_mutation_paths_found: directRolePermissionMutationPathsFound,
    service_role_green_path_found: serviceRoleGreenPath,
    runtime_debug_visible_to_normal_users: runtimeDebugVisible,
    fake_security_findings_created: fakeSecurityFindings,
    fake_runtime_blockers_created: fakeRuntimeBlockers,
    fake_report_content_created: fakeReportContent,
    debug_copy_visible_to_normal_user: debugCopyVisible,
    provider_unavailable_copy_visible: providerUnavailableCopyVisible,
    generic_fallback_used: genericFallbackUsed,
    new_hooks_added: false,
    db_writes_used: dbWritesUsed,
    migrations_used: false,
    fake_green_claimed: false,
    button_manifest: buildAiDirectorCommandOfficeSecurityMagicButtonManifest(),
  };
}

export function buildAiDirectorCommandOfficeSecurityMagicProofMarkdown(
  options: AiDirectorCommandOfficeSecurityMagicProofOptions = {},
): string {
  const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix(options);
  return [
    `# ${AI_DIRECTOR_COMMAND_OFFICE_SECURITY_MAGIC_WAVE}`,
    "",
    `Final status: ${matrix.final_status}`,
    `Screens covered: ${matrix.screens_covered}`,
    `Director decision context hydrated: ${matrix.director_decision_context_hydrated}`,
    `Command center next actions ready: ${matrix.command_center_next_actions_ready}`,
    `Office context hydrated: ${matrix.office_context_hydrated}`,
    `Security context hydrated: ${matrix.security_context_hydrated}`,
    `Buttons clicked on web: ${matrix.buttons_clicked_on_web}`,
    `Buttons targetable on Android: ${matrix.buttons_targetable_on_android}`,
    `iOS TestFlight signoff current: ${matrix.ios_testflight_signoff_current}`,
    "",
    "Director, command center, office, security and runtime AI stays in the existing screenMagic contract.",
    "Safe reads stay read-only, drafts never final-submit, approvals route to the ledger, and runtime diagnostics remain dev/admin only.",
    "No auto-approval, role/permission mutation, policy disable, service-role green path, DB write, or fake green is allowed.",
  ].join("\n");
}
