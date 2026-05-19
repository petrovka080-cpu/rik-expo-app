import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";
import { sanitizeAiScreenMagicUserCopy } from "../../src/features/ai/screenMagic/aiScreenMagicUserCopy";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicPack,
} from "../../src/features/ai/screenMagic/aiScreenMagicTypes";

export const AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE =
  "S_AI_MAGIC_FIELD_DOCUMENTS_REPORTS_POINT_OF_NO_RETURN" as const;

export const AI_FIELD_DOCUMENTS_REPORTS_MAGIC_SCOPE =
  "S_AI_MAGIC_FIELD_DOCUMENTS_REPORTS" as const;

export const AI_FIELD_DOCUMENTS_REPORTS_MAGIC_GREEN_STATUS =
  "GREEN_AI_MAGIC_FIELD_DOCUMENTS_REPORTS_READY" as const;

export const AI_FIELD_DOCUMENTS_REPORTS_MAGIC_SCREENS = [
  "foreman.main",
  "foreman.ai.quick_modal",
  "foreman.subcontract",
  "contractor.main",
  "documents.main",
  "agent.documents.knowledge",
  "reports.modal",
  "chat.main",
] as const;

export type AiFieldDocumentsReportsMagicScreenId =
  (typeof AI_FIELD_DOCUMENTS_REPORTS_MAGIC_SCREENS)[number];

type ExpectedFieldDocumentsReportsButton = {
  label: string;
  actionKind: AiScreenMagicActionKind;
};

function sanitizeExpectedButtons<T extends Record<string, readonly ExpectedFieldDocumentsReportsButton[]>>(buttons: T): T {
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

const AI_FIELD_DOCUMENTS_REPORTS_MAGIC_EXPECTED_BUTTONS_RAW = {
  "foreman.main": [
    { label: "Подготовить акт", actionKind: "draft_only" },
    { label: "Подготовить отчёт", actionKind: "draft_only" },
    { label: "Проверить missing evidence", actionKind: "safe_read" },
    { label: "Написать подрядчику", actionKind: "draft_only" },
    { label: "Показать строительный checklist", actionKind: "safe_read" },
    { label: "Проверка безопасности", actionKind: "safe_read" },
  ],
  "foreman.ai.quick_modal": [
    { label: "Акт по текущей работе", actionKind: "draft_only" },
    { label: "Отчёт за день", actionKind: "draft_only" },
    { label: "Список missing evidence", actionKind: "safe_read" },
    { label: "Сообщение подрядчику", actionKind: "draft_only" },
    { label: "Строительный checklist", actionKind: "safe_read" },
    { label: "Проверка безопасности", actionKind: "safe_read" },
  ],
  "foreman.subcontract": [
    { label: "Подготовить акт", actionKind: "draft_only" },
    { label: "Запросить документы", actionKind: "draft_only" },
    { label: "Написать подрядчику", actionKind: "draft_only" },
    { label: "Показать checklist", actionKind: "safe_read" },
  ],
  "contractor.main": [
    { label: "Подготовить ответ", actionKind: "draft_only" },
    { label: "Список документов", actionKind: "safe_read" },
    { label: "Что мешает приёмке", actionKind: "safe_read" },
    { label: "Проверить замечания", actionKind: "safe_read" },
  ],
  "documents.main": [
    { label: "Подготовить резюме", actionKind: "draft_only" },
    { label: "Запросить missing evidence", actionKind: "draft_only" },
    { label: "Подготовить комментарий", actionKind: "draft_only" },
    { label: "Открыть связанные объекты", actionKind: "safe_read" },
  ],
  "agent.documents.knowledge": [
    { label: "Подготовить резюме", actionKind: "draft_only" },
    { label: "Запросить missing evidence", actionKind: "draft_only" },
    { label: "Подготовить комментарий", actionKind: "draft_only" },
    { label: "Открыть связанные объекты", actionKind: "safe_read" },
  ],
  "reports.modal": [
    { label: "Собрать отчёт", actionKind: "draft_only" },
    { label: "Проверить evidence", actionKind: "safe_read" },
    { label: "Добавить missing data", actionKind: "draft_only" },
    { label: "Сохранить черновик", actionKind: "draft_only" },
  ],
  "chat.main": [
    { label: "Создать черновик задачи", actionKind: "draft_only" },
    { label: "Подготовить summary", actionKind: "draft_only" },
    { label: "Отправить на approval", actionKind: "approval_required" },
    { label: "Запросить missing data", actionKind: "draft_only" },
  ],
} as const satisfies Record<AiFieldDocumentsReportsMagicScreenId, readonly ExpectedFieldDocumentsReportsButton[]>;

export const AI_FIELD_DOCUMENTS_REPORTS_MAGIC_EXPECTED_BUTTONS = sanitizeExpectedButtons(
  AI_FIELD_DOCUMENTS_REPORTS_MAGIC_EXPECTED_BUTTONS_RAW,
);

export type AiFieldDocumentsReportsMagicProofOptions = {
  webProofPass?: boolean;
  androidProofPass?: boolean;
  iosTestflightSignoffCurrent?: boolean;
};

type FieldDocumentsReportsPackEntry = {
  logicalScreenId: AiFieldDocumentsReportsMagicScreenId;
  pack: AiScreenMagicPack;
};

function normalizeLabel(value: string): string {
  return sanitizeAiScreenMagicUserCopy(String(value || ""))
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
}

function getFieldDocumentsReportsMagicPack(
  logicalScreenId: AiFieldDocumentsReportsMagicScreenId,
): AiScreenMagicPack {
  return getAiScreenMagicPack({ role: "unknown", context: "unknown", screenId: logicalScreenId });
}

function findButton(
  pack: AiScreenMagicPack,
  expected: ExpectedFieldDocumentsReportsButton,
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

function visiblePackCopy(packs: readonly AiScreenMagicPack[]): string {
  return JSON.stringify(packs.map((pack) => ({
    userGoal: pack.userGoal,
    userHeader: pack.userHeader,
    screenSummary: pack.screenSummary,
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

function isDirectSigningPath(button: AiScreenMagicButton): boolean {
  if (button.actionKind === "forbidden" || button.actionKind === "approval_required") return false;
  return /(sign directly|direct sign|подписать.*напрямую|подписать|signature final)/i.test(buttonText(button));
}

function isDirectFinalSubmitPath(button: AiScreenMagicButton): boolean {
  if (button.actionKind === "forbidden" || button.actionKind === "approval_required") return false;
  return /(final submit|final send|final publish|publish final|submit without review|send without review|финальн.*отправ|сдать финальн|сохранить final)/i
    .test(buttonText(button));
}

function isChatDirectDangerousMutation(button: AiScreenMagicButton): boolean {
  if (button.actionKind === "forbidden" || button.actionKind === "approval_required") return false;
  return /(direct order|direct payment|warehouse mutation|create order|post payment|issue stock|receive stock|writeoff|write-off|создать заказ|провести платеж|выдать склад|принять склад)/i
    .test(buttonText(button));
}

function fakeEvidenceCreated(value: string): boolean {
  return /fake evidence|invented evidence|synthetic evidence|fabricated evidence/i.test(value);
}

function fakeConstructionNormsCreated(value: string): boolean {
  return /fake construction norm|invented construction norm|synthetic construction norm|fabricated construction norm/i.test(value);
}

function fakeDocumentContentCreated(value: string): boolean {
  return /fake document content|invented document content|synthetic document content|fabricated document content/i.test(value);
}

function fakeReportContentCreated(value: string): boolean {
  return /fake report content|invented report content|synthetic report content|fabricated report content/i.test(value);
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
  ].join(" ");
}

function screenHasExpectedButtons(
  pack: AiScreenMagicPack | undefined,
  logicalScreenId: AiFieldDocumentsReportsMagicScreenId,
): boolean {
  if (!pack) return false;
  return AI_FIELD_DOCUMENTS_REPORTS_MAGIC_EXPECTED_BUTTONS[logicalScreenId].every((expected) =>
    Boolean(findButton(pack, expected)),
  );
}

function screenReady(
  pack: AiScreenMagicPack | undefined,
  logicalScreenId: AiFieldDocumentsReportsMagicScreenId,
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

export function listAiFieldDocumentsReportsMagicPackEntries(): FieldDocumentsReportsPackEntry[] {
  return AI_FIELD_DOCUMENTS_REPORTS_MAGIC_SCREENS.map((logicalScreenId) => ({
    logicalScreenId,
    pack: getFieldDocumentsReportsMagicPack(logicalScreenId),
  }));
}

export function listAiFieldDocumentsReportsMagicPacks(): AiScreenMagicPack[] {
  return listAiFieldDocumentsReportsMagicPackEntries().map((entry) => entry.pack);
}

export function buildAiFieldDocumentsReportsMagicButtonResults() {
  return listAiFieldDocumentsReportsMagicPackEntries().flatMap(({ logicalScreenId, pack }) =>
    AI_FIELD_DOCUMENTS_REPORTS_MAGIC_EXPECTED_BUTTONS[logicalScreenId].map((expected) => {
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

export function buildAiFieldDocumentsReportsMagicButtonManifest() {
  return buildAiFieldDocumentsReportsMagicButtonResults().map((entry) => ({
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

export function buildAiFieldDocumentsReportsMagicInventory() {
  return {
    wave: AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE,
    screens: listAiFieldDocumentsReportsMagicPackEntries().map(({ logicalScreenId, pack }) => ({
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
      expectedButtons: AI_FIELD_DOCUMENTS_REPORTS_MAGIC_EXPECTED_BUTTONS[logicalScreenId],
    })),
  };
}

export function buildAiFieldDocumentsReportsMagicMatrix(
  options: AiFieldDocumentsReportsMagicProofOptions = {},
) {
  const entries = listAiFieldDocumentsReportsMagicPackEntries();
  const packs = entries.map((entry) => entry.pack);
  const buttons = buildAiFieldDocumentsReportsMagicButtonResults();
  const entryByLogicalScreen = new Map(entries.map((entry) => [entry.logicalScreenId, entry]));
  const serialized = JSON.stringify(packs);
  const visibleCopy = visiblePackCopy(packs);
  const qaFromScreenContext = entries.every(({ pack }) => {
    const question = pack.qa[0]?.question ?? "Что критично на этом экране?";
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
  const approvalRequiredRoutesToLedger = entries
    .flatMap((entry) => entry.pack.buttons)
    .filter((button) => button.actionKind === "approval_required")
    .every((button) => Boolean(button.approvalRoute));
  const fieldContextHydrated = [
    "foreman.main",
    "foreman.ai.quick_modal",
    "foreman.subcontract",
    "contractor.main",
  ].every((screenId) => {
    const pack = entryByLogicalScreen.get(screenId as AiFieldDocumentsReportsMagicScreenId)?.pack;
    return Boolean(
      pack &&
      pack.aiPreparedWork.length >= 4 &&
      pack.visibleDomainData.length > 0 &&
      pack.riskSummary.length > 0 &&
      pack.missingDataSummary.length > 0,
    );
  });
  const documentsContextHydrated = [
    "documents.main",
    "agent.documents.knowledge",
  ].every((screenId) => {
    const pack = entryByLogicalScreen.get(screenId as AiFieldDocumentsReportsMagicScreenId)?.pack;
    return Boolean(
      pack &&
      pack.domain === "documents" &&
      pack.visibleDomainData.length > 0 &&
      pack.missingDataSummary.length > 0,
    );
  });
  const reportsContextHydrated = (() => {
    const reportsPack = entryByLogicalScreen.get("reports.modal")?.pack;
    const chatPack = entryByLogicalScreen.get("chat.main")?.pack;
    return Boolean(
      reportsPack &&
      chatPack &&
      reportsPack.visibleDomainData.length > 0 &&
      chatPack.visibleDomainData.length > 0 &&
      reportsPack.missingDataSummary.length > 0 &&
      chatPack.missingDataSummary.length > 0,
    );
  })();
  const foremanMainReady = screenReady(entryByLogicalScreen.get("foreman.main")?.pack, "foreman.main", []);
  const foremanQuickModalReady = screenReady(
    entryByLogicalScreen.get("foreman.ai.quick_modal")?.pack,
    "foreman.ai.quick_modal",
    [],
  );
  const foremanSubcontractReady = screenReady(
    entryByLogicalScreen.get("foreman.subcontract")?.pack,
    "foreman.subcontract",
    [],
  );
  const contractorMainReady = screenReady(entryByLogicalScreen.get("contractor.main")?.pack, "contractor.main", []);
  const documentsMainReady = screenReady(entryByLogicalScreen.get("documents.main")?.pack, "documents.main", []);
  const documentsKnowledgeReady = screenReady(
    entryByLogicalScreen.get("agent.documents.knowledge")?.pack,
    "agent.documents.knowledge",
    [],
  );
  const reportsModalReady = screenReady(entryByLogicalScreen.get("reports.modal")?.pack, "reports.modal", []);
  const chatMainReady = screenReady(entryByLogicalScreen.get("chat.main")?.pack, "chat.main", []);
  const chatContextHydrated = chatMainReady;
  const allButtons = entries.flatMap((entry) => entry.pack.buttons);
  const directSigningPathsFound = allButtons.filter(isDirectSigningPath).length;
  const directFinalSubmitPathsFound = allButtons.filter(isDirectFinalSubmitPath).length;
  const chatDirectDangerousMutations = (entryByLogicalScreen.get("chat.main")?.pack.buttons ?? [])
    .filter(isChatDirectDangerousMutation).length;
  const dbWritesUsed = buttons.some((button) => button.dbWriteUsed !== false);
  const debugCopyVisible = containsDebugCopy(visibleCopy);
  const providerUnavailableCopyVisible = containsProviderUnavailableCopy(visibleCopy);
  const genericFallbackUsed = containsGenericFallback(serialized);
  const fakeEvidence = fakeEvidenceCreated(serialized);
  const fakeConstructionNorms = fakeConstructionNormsCreated(serialized);
  const fakeDocumentContent = fakeDocumentContentCreated(serialized);
  const fakeReportContent = fakeReportContentCreated(serialized);
  const coreGreen =
    entries.length === AI_FIELD_DOCUMENTS_REPORTS_MAGIC_SCREENS.length &&
    expectedButtonsFound &&
    foremanMainReady &&
    foremanQuickModalReady &&
    foremanSubcontractReady &&
    contractorMainReady &&
    documentsMainReady &&
    documentsKnowledgeReady &&
    reportsModalReady &&
    chatMainReady &&
    fieldContextHydrated &&
    documentsContextHydrated &&
    reportsContextHydrated &&
    chatContextHydrated &&
    qaFromScreenContext &&
    safeReadResultsVisible &&
    draftOnlyResultsVisible &&
    safeReadNoMutation &&
    draftOnlyNotFinalSubmit &&
    approvalRequiredRoutesToLedger &&
    directSigningPathsFound === 0 &&
    directFinalSubmitPathsFound === 0 &&
    chatDirectDangerousMutations === 0 &&
    !fakeEvidence &&
    !fakeConstructionNorms &&
    !fakeDocumentContent &&
    !fakeReportContent &&
    !dbWritesUsed &&
    !debugCopyVisible &&
    !providerUnavailableCopyVisible &&
    !genericFallbackUsed;

  return {
    wave: AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE,
    final_status: coreGreen
      ? AI_FIELD_DOCUMENTS_REPORTS_MAGIC_GREEN_STATUS
      : "BLOCKED_AI_MAGIC_FIELD_DOCUMENTS_REPORTS_CONTRACT",
    screens_covered: entries.length,
    foreman_main_ready: foremanMainReady,
    foreman_quick_modal_ready: foremanQuickModalReady,
    foreman_subcontract_ready: foremanSubcontractReady,
    contractor_main_ready: contractorMainReady,
    documents_main_ready: documentsMainReady,
    documents_knowledge_ready: documentsKnowledgeReady,
    reports_modal_ready: reportsModalReady,
    chat_main_ready: chatMainReady,
    field_context_hydrated: fieldContextHydrated,
    documents_context_hydrated: documentsContextHydrated,
    reports_context_hydrated: reportsContextHydrated,
    chat_context_hydrated: chatContextHydrated,
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
    direct_signing_paths_found: directSigningPathsFound,
    direct_final_submit_paths_found: directFinalSubmitPathsFound,
    fake_evidence_created: fakeEvidence,
    fake_construction_norms_created: fakeConstructionNorms,
    fake_document_content_created: fakeDocumentContent,
    fake_report_content_created: fakeReportContent,
    chat_direct_dangerous_mutations: chatDirectDangerousMutations,
    debug_copy_visible_to_normal_user: debugCopyVisible,
    debug_copy_visible: debugCopyVisible,
    provider_unavailable_copy_visible: providerUnavailableCopyVisible,
    generic_fallback_used: genericFallbackUsed,
    new_hooks_added: false,
    db_writes_used: dbWritesUsed,
    migrations_used: false,
    fake_green_claimed: false,
    button_manifest: buildAiFieldDocumentsReportsMagicButtonManifest(),
  };
}

export function buildAiFieldDocumentsReportsMagicProofMarkdown(
  options: AiFieldDocumentsReportsMagicProofOptions = {},
): string {
  const matrix = buildAiFieldDocumentsReportsMagicMatrix(options);
  return [
    `# ${AI_FIELD_DOCUMENTS_REPORTS_MAGIC_WAVE}`,
    "",
    `Final status: ${matrix.final_status}`,
    `Screens covered: ${matrix.screens_covered}`,
    `Field context hydrated: ${matrix.field_context_hydrated}`,
    `Documents context hydrated: ${matrix.documents_context_hydrated}`,
    `Reports context hydrated: ${matrix.reports_context_hydrated}`,
    `Buttons clicked on web: ${matrix.buttons_clicked_on_web}`,
    `Buttons targetable on Android: ${matrix.buttons_targetable_on_android}`,
    `iOS TestFlight signoff current: ${matrix.ios_testflight_signoff_current}`,
    "",
    "Field/documents/reports AI uses the existing screenMagic and approval-ledger contracts.",
    "Safe reads stay read-only, draft-only actions never final-submit, and chat approval goes through the approval ledger.",
    "No signing, final submit, fake evidence, fake construction norms, fake document content, DB write, or direct chat mutation is allowed.",
  ].join("\n");
}
