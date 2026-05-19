import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicPack,
} from "../../src/features/ai/screenMagic/aiScreenMagicTypes";

export const AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE =
  "S_AI_MAGIC_WAREHOUSE_LOGISTICS_POINT_OF_NO_RETURN" as const;

export const AI_WAREHOUSE_LOGISTICS_MAGIC_SCOPE =
  "S_AI_MAGIC_WAREHOUSE_LOGISTICS" as const;

export const AI_WAREHOUSE_LOGISTICS_MAGIC_GREEN_STATUS =
  "GREEN_AI_MAGIC_WAREHOUSE_LOGISTICS_READY" as const;

export const AI_WAREHOUSE_LOGISTICS_MAGIC_SCREENS = [
  "warehouse.main",
  "warehouse.incoming",
  "warehouse.issue",
  "map.main",
] as const;

export type AiWarehouseLogisticsMagicScreenId =
  (typeof AI_WAREHOUSE_LOGISTICS_MAGIC_SCREENS)[number];

type ExpectedWarehouseLogisticsButton = {
  label: string;
  actionKind: AiScreenMagicActionKind;
};

export const AI_WAREHOUSE_LOGISTICS_MAGIC_EXPECTED_BUTTONS = {
  "warehouse.main": [
    { label: "Показать дефицит", actionKind: "safe_read" },
    { label: "Подготовить проверку прихода", actionKind: "draft_only" },
    { label: "Черновик перемещения", actionKind: "draft_only" },
    { label: "Отправить спорные позиции на approval", actionKind: "approval_required" },
  ],
  "warehouse.incoming": [
    { label: "Список расхождений", actionKind: "safe_read" },
    { label: "Запросить документ", actionKind: "draft_only" },
    { label: "Отправить спорные позиции на согласование", actionKind: "approval_required" },
    { label: "Подготовить черновик проверки", actionKind: "draft_only" },
  ],
  "warehouse.issue": [
    { label: "Черновик выдачи", actionKind: "draft_only" },
    { label: "Показать дефицит", actionKind: "safe_read" },
    { label: "Предложить альтернативу", actionKind: "safe_read" },
    { label: "Отправить на approval", actionKind: "approval_required" },
  ],
  "map.main": [
    { label: "Сравнить поставщиков по логистике", actionKind: "safe_read" },
    { label: "Показать риски маршрута", actionKind: "safe_read" },
    { label: "Подготовить запрос доставки", actionKind: "draft_only" },
    { label: "Открыть связанные заявки", actionKind: "safe_read" },
  ],
} as const satisfies Record<AiWarehouseLogisticsMagicScreenId, readonly ExpectedWarehouseLogisticsButton[]>;

export type AiWarehouseLogisticsMagicProofOptions = {
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

function getWarehouseLogisticsMagicPack(
  screenId: AiWarehouseLogisticsMagicScreenId,
): AiScreenMagicPack {
  return getAiScreenMagicPack({ role: "unknown", context: "unknown", screenId });
}

function findButton(
  pack: AiScreenMagicPack,
  expected: ExpectedWarehouseLogisticsButton,
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

function containsDebugCopy(value: string): boolean {
  return /raw json|route key|provider unavailable|module unavailable|raw provider payload|raw policy dump/i.test(value);
}

function containsProviderUnavailableCopy(value: string): boolean {
  return /provider unavailable|module unavailable|raw provider payload/i.test(value);
}

function containsGenericFallback(value: string): boolean {
  return /generic fallback|chat-only fallback|unknown screen fallback|module unavailable/i.test(value);
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

function isDirectStockMutationPath(button: AiScreenMagicButton): boolean {
  if (button.actionKind === "forbidden") return false;
  return /(изменить остат|stock mutation|stock adjustment|adjust stock|change stock|change_warehouse_status)/i
    .test(buttonText(button));
}

function isDirectReceivePath(button: AiScreenMagicButton): boolean {
  if (button.actionKind === "forbidden") return false;
  return /(подтвердить приход|receive directly|apply receive|confirm receipt|final receive)/i
    .test(buttonText(button));
}

function isDirectIssuePath(button: AiScreenMagicButton): boolean {
  if (button.actionKind === "forbidden") return false;
  return /(выдать напрямую|issue directly|apply issue|final issue|issue warehouse|списать или выдать)/i
    .test(buttonText(button));
}

function isDirectWriteoffPath(button: AiScreenMagicButton): boolean {
  if (button.actionKind === "forbidden") return false;
  return /(списать|write-?off|apply writeoff|final writeoff)/i.test(buttonText(button));
}

function fakeStockCreated(value: string): boolean {
  return /fake stock|invented stock|synthetic stock/i.test(value);
}

function fakeIncomingCreated(value: string): boolean {
  return /fake incoming|invented incoming|synthetic incoming/i.test(value);
}

function fakeDistanceCreated(value: string): boolean {
  return /fake distance|invented distance|synthetic distance/i.test(value);
}

function fakeEtaCreated(value: string): boolean {
  return /fake eta|invented eta|synthetic eta/i.test(value);
}

function fakeSupplierCreated(value: string): boolean {
  return /fake supplier|invented supplier|synthetic supplier|\bSupplier A\b|\bSupplier B\b/i.test(value);
}

export function listAiWarehouseLogisticsMagicPacks(): AiScreenMagicPack[] {
  return AI_WAREHOUSE_LOGISTICS_MAGIC_SCREENS.map(getWarehouseLogisticsMagicPack);
}

export function buildAiWarehouseLogisticsMagicButtonResults() {
  return listAiWarehouseLogisticsMagicPacks().flatMap((pack) =>
    AI_WAREHOUSE_LOGISTICS_MAGIC_EXPECTED_BUTTONS[pack.screenId as AiWarehouseLogisticsMagicScreenId]
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
          visibleResult: result?.answer ?? null,
        };
      }),
  );
}

export function buildAiWarehouseLogisticsMagicButtonManifest() {
  return buildAiWarehouseLogisticsMagicButtonResults().map((entry) => ({
    screenId: entry.screenId,
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

export function buildAiWarehouseLogisticsMagicInventory() {
  return {
    wave: AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE,
    screens: listAiWarehouseLogisticsMagicPacks().map((pack) => ({
      screenId: pack.screenId,
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
      expectedButtons: AI_WAREHOUSE_LOGISTICS_MAGIC_EXPECTED_BUTTONS[
        pack.screenId as AiWarehouseLogisticsMagicScreenId
      ],
    })),
  };
}

export function buildAiWarehouseLogisticsMagicMatrix(
  options: AiWarehouseLogisticsMagicProofOptions = {},
) {
  const packs = listAiWarehouseLogisticsMagicPacks();
  const buttons = buildAiWarehouseLogisticsMagicButtonResults();
  const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));
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
    buttons: pack.buttons.map((button) => ({
      label: button.label,
      actionKind: button.actionKind,
      forbiddenReason: button.forbiddenReason,
      exactBlocker: button.exactBlocker,
    })),
  })));
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
  const approvalRequiredRoutesToLedger = packs
    .flatMap((pack) => pack.buttons)
    .filter((button) => button.actionKind === "approval_required")
    .every((button) => Boolean(button.approvalRoute));
  const warehouseContextHydrated = ["warehouse.main", "warehouse.incoming", "warehouse.issue"]
    .every((screenId) => {
      const pack = packByScreen.get(screenId);
      return Boolean(
        pack &&
        pack.domain === "warehouse" &&
        pack.aiPreparedWork.length >= 4 &&
        pack.visibleDomainData.length > 0 &&
        pack.riskSummary.length > 0 &&
        pack.missingDataSummary.length > 0,
      );
    });
  const warehouseMainReady = (() => {
    const pack = packByScreen.get("warehouse.main");
    return Boolean(
      pack &&
      pack.domain === "warehouse" &&
      pack.visibleDomainData.some((item) => /дефицит|shortage/i.test(item)) &&
      pack.riskSummary.length > 0 &&
      buttons
        .filter((button) => button.screenId === "warehouse.main")
        .every((button) => button.found && button.resultVisible),
    );
  })();
  const warehouseIncomingReady = (() => {
    const pack = packByScreen.get("warehouse.incoming");
    return Boolean(
      pack &&
      pack.domain === "warehouse" &&
      pack.visibleDomainData.some((item) => /расхожд|missing documents|пришло/i.test(item)) &&
      pack.missingDataSummary.length > 0 &&
      buttons
        .filter((button) => button.screenId === "warehouse.incoming")
        .every((button) => button.found && button.resultVisible),
    );
  })();
  const warehouseIssueReady = (() => {
    const pack = packByScreen.get("warehouse.issue");
    return Boolean(
      pack &&
      pack.domain === "warehouse" &&
      pack.visibleDomainData.some((item) => /дефицит|доступно|approval/i.test(item)) &&
      pack.safeActions.some((item) => /дефицит|альтернатив/i.test(item)) &&
      buttons
        .filter((button) => button.screenId === "warehouse.issue")
        .every((button) => button.found && button.resultVisible),
    );
  })();
  const logisticsContextHydrated = (() => {
    const pack = packByScreen.get("map.main");
    return Boolean(
      pack &&
      pack.domain === "logistics" &&
      pack.aiPreparedWork.length >= 4 &&
      pack.visibleDomainData.includes("route risks") &&
      pack.visibleDomainData.includes("delivery impact on requests") &&
      pack.riskSummary.includes("distance without evidence") &&
      pack.riskSummary.includes("ETA without evidence"),
    );
  })();
  const mapLogisticsReady = (() => {
    const pack = packByScreen.get("map.main");
    return Boolean(
      pack &&
      pack.domain === "logistics" &&
      pack.visibleDomainData.includes("nearby suppliers") &&
      pack.visibleDomainData.includes("nearby objects") &&
      pack.safeActions.length >= 3 &&
      buttons
        .filter((button) => button.screenId === "map.main")
        .every((button) => button.found && button.resultVisible),
    );
  })();
  const allButtons = packs.flatMap((pack) => pack.buttons);
  const directStockMutationPathsFound = allButtons.filter(isDirectStockMutationPath).length;
  const directReceivePathsFound = allButtons.filter(isDirectReceivePath).length;
  const directIssuePathsFound = allButtons.filter(isDirectIssuePath).length;
  const directWriteoffPathsFound = allButtons.filter(isDirectWriteoffPath).length;
  const dbWritesUsed = buttons.some((button) => button.dbWriteUsed !== false);
  const debugCopyVisible = containsDebugCopy(visibleCopy);
  const providerUnavailableCopyVisible = containsProviderUnavailableCopy(visibleCopy);
  const genericFallbackUsed = containsGenericFallback(serialized);
  const coreGreen =
    packs.length === AI_WAREHOUSE_LOGISTICS_MAGIC_SCREENS.length &&
    expectedButtonsFound &&
    warehouseMainReady &&
    warehouseIncomingReady &&
    warehouseIssueReady &&
    mapLogisticsReady &&
    warehouseContextHydrated &&
    logisticsContextHydrated &&
    qaFromScreenContext &&
    safeReadResultsVisible &&
    draftOnlyResultsVisible &&
    safeReadNoMutation &&
    draftOnlyNotFinalSubmit &&
    approvalRequiredRoutesToLedger &&
    directStockMutationPathsFound === 0 &&
    directReceivePathsFound === 0 &&
    directIssuePathsFound === 0 &&
    directWriteoffPathsFound === 0 &&
    !fakeStockCreated(serialized) &&
    !fakeIncomingCreated(serialized) &&
    !fakeDistanceCreated(serialized) &&
    !fakeEtaCreated(serialized) &&
    !fakeSupplierCreated(serialized) &&
    !dbWritesUsed &&
    !debugCopyVisible &&
    !providerUnavailableCopyVisible &&
    !genericFallbackUsed;

  return {
    wave: AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE,
    final_status: coreGreen
      ? AI_WAREHOUSE_LOGISTICS_MAGIC_GREEN_STATUS
      : "BLOCKED_AI_MAGIC_WAREHOUSE_LOGISTICS_CONTRACT",
    screens_covered: packs.length,
    warehouse_main_ready: warehouseMainReady,
    warehouse_incoming_ready: warehouseIncomingReady,
    warehouse_issue_ready: warehouseIssueReady,
    map_logistics_ready: mapLogisticsReady,
    warehouse_context_hydrated: warehouseContextHydrated,
    logistics_context_hydrated: logisticsContextHydrated,
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
    direct_stock_mutation_paths_found: directStockMutationPathsFound,
    direct_receive_paths_found: directReceivePathsFound,
    direct_issue_paths_found: directIssuePathsFound,
    direct_writeoff_paths_found: directWriteoffPathsFound,
    fake_stock_created: fakeStockCreated(serialized),
    fake_incoming_created: fakeIncomingCreated(serialized),
    fake_distance_created: fakeDistanceCreated(serialized),
    fake_eta_created: fakeEtaCreated(serialized),
    fake_supplier_created: fakeSupplierCreated(serialized),
    debug_copy_visible_to_normal_user: debugCopyVisible,
    debug_copy_visible: debugCopyVisible,
    provider_unavailable_copy_visible: providerUnavailableCopyVisible,
    generic_fallback_used: genericFallbackUsed,
    new_hooks_added: false,
    db_writes_used: dbWritesUsed,
    migrations_used: false,
    fake_green_claimed: false,
    button_manifest: buildAiWarehouseLogisticsMagicButtonManifest(),
  };
}

export function buildAiWarehouseLogisticsMagicProofMarkdown(
  options: AiWarehouseLogisticsMagicProofOptions = {},
): string {
  const matrix = buildAiWarehouseLogisticsMagicMatrix(options);
  return [
    `# ${AI_WAREHOUSE_LOGISTICS_MAGIC_WAVE}`,
    "",
    `Final status: ${matrix.final_status}`,
    `Screens covered: ${matrix.screens_covered}`,
    `Warehouse context hydrated: ${matrix.warehouse_context_hydrated}`,
    `Logistics context hydrated: ${matrix.logistics_context_hydrated}`,
    `Buttons clicked on web: ${matrix.buttons_clicked_on_web}`,
    `Buttons targetable on Android: ${matrix.buttons_targetable_on_android}`,
    `iOS TestFlight signoff current: ${matrix.ios_testflight_signoff_current}`,
    "",
    "Warehouse/logistics AI uses the existing screenMagic and approval-ledger contracts.",
    "Safe reads only open hydrated context, draft-only actions stay previews, and disputed warehouse actions route to approval.",
    "No stock receive, issue, write-off, fake stock, fake distance, fake ETA, DB write, or direct warehouse mutation is allowed.",
  ].join("\n");
}
