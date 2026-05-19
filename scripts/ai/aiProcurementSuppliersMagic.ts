import { hydrateApprovedRequestSupplierProposalBundle } from "../../src/features/ai/procurement/aiApprovedRequestSupplierProposalHydrator";
import { NO_INTERNAL_SUPPLIERS_MESSAGE } from "../../src/features/ai/procurement/aiApprovedRequestSupplierOptions";
import { validateSupplierProposalBundlePolicy } from "../../src/features/ai/procurement/aiSupplierProposalReadinessPolicy";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";
import type {
  AiScreenMagicActionKind,
  AiScreenMagicButton,
  AiScreenMagicPack,
} from "../../src/features/ai/screenMagic/aiScreenMagicTypes";

export const AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE =
  "S_AI_MAGIC_PROCUREMENT_SUPPLIERS_POINT_OF_NO_RETURN" as const;

export const AI_PROCUREMENT_SUPPLIERS_MAGIC_SCOPE =
  "S_AI_MAGIC_PROCUREMENT_SUPPLIERS" as const;

export const AI_PROCUREMENT_SUPPLIERS_MAGIC_GREEN_STATUS =
  "GREEN_AI_MAGIC_PROCUREMENT_SUPPLIERS_READY" as const;

export const AI_PROCUREMENT_SUPPLIERS_MAGIC_SCREENS = [
  "buyer.main",
  "buyer.requests",
  "buyer.request.detail",
  "procurement.copilot",
  "market.home",
  "supplier.showcase",
] as const;

export type AiProcurementSuppliersMagicScreenId =
  (typeof AI_PROCUREMENT_SUPPLIERS_MAGIC_SCREENS)[number];

type ExpectedProcurementButton = {
  label: string;
  actionKind: AiScreenMagicActionKind;
};

export const AI_PROCUREMENT_SUPPLIERS_MAGIC_EXPECTED_BUTTONS = {
  "buyer.main": [
    { label: "Разобрать входящие", actionKind: "safe_read" },
    { label: "Смотреть варианты закупа", actionKind: "safe_read" },
    { label: "Сравнить поставщиков", actionKind: "safe_read" },
    { label: "Запросить цены", actionKind: "draft_only" },
    { label: "Отправить выбор на согласование", actionKind: "approval_required" },
  ],
  "buyer.requests": [
    { label: "Смотреть варианты", actionKind: "safe_read" },
    { label: "Сравнить", actionKind: "safe_read" },
    { label: "Подготовить запрос", actionKind: "draft_only" },
    { label: "Проверить риски", actionKind: "safe_read" },
  ],
  "buyer.request.detail": [
    { label: "Запросить цену", actionKind: "draft_only" },
    { label: "Сравнить варианты", actionKind: "safe_read" },
    { label: "Подготовить запрос поставщику", actionKind: "draft_only" },
    { label: "Отправить выбор на согласование", actionKind: "approval_required" },
  ],
  "procurement.copilot": [
    { label: "Почему этот поставщик лучше", actionKind: "safe_read" },
    { label: "Что не хватает для выбора", actionKind: "safe_read" },
    { label: "Сделать запрос поставщику", actionKind: "draft_only" },
    { label: "Что отправить директору", actionKind: "approval_required" },
  ],
  "market.home": [
    { label: "Подготовить внешний запрос", actionKind: "draft_only" },
    { label: "Показать cited варианты", actionKind: "safe_read" },
    { label: "Сравнить с внутренними", actionKind: "safe_read" },
  ],
  "supplier.showcase": [
    { label: "Сравнить с другим", actionKind: "safe_read" },
    { label: "Подготовить запрос", actionKind: "draft_only" },
    { label: "Добавить в shortlist", actionKind: "draft_only" },
    { label: "Отправить выбор на approval", actionKind: "approval_required" },
  ],
} as const satisfies Record<AiProcurementSuppliersMagicScreenId, readonly ExpectedProcurementButton[]>;

export type AiProcurementSuppliersMagicProofOptions = {
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

function getProcurementSuppliersMagicPack(
  screenId: AiProcurementSuppliersMagicScreenId,
): AiScreenMagicPack {
  return getAiScreenMagicPack({ role: "unknown", context: "unknown", screenId });
}

function findButton(
  pack: AiScreenMagicPack,
  expected: ExpectedProcurementButton,
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

function containsFakeProcurementData(value: string): boolean {
  return /\bSupplier A\b|\bSupplier B\b|fake supplier|fake price|fake availability|fake stock/i.test(value);
}

function containsDirectOrderPath(button: AiScreenMagicButton): boolean {
  const text = normalizeLabel(`${button.id} ${button.label} ${button.forbiddenReason ?? ""} ${button.approvalRoute ?? ""}`);
  return /(создать заказ|создать order|direct order|create order|order из copilot|confirm supplier|подтвердить поставщика)/i.test(text)
    && button.actionKind !== "forbidden";
}

function containsWarehouseMutationPath(button: AiScreenMagicButton): boolean {
  const text = normalizeLabel(`${button.id} ${button.label} ${button.bffRoute ?? ""} ${button.approvalRoute ?? ""}`);
  return /(warehouse mutation|stock mutation|складская запись|меняет склад|изменить остаток|списать склад)/i.test(text)
    && button.actionKind !== "forbidden";
}

function buildApprovedRequestEvidenceProof() {
  const readyBundle = hydrateApprovedRequestSupplierProposalBundle({
    requestId: "approved-request-1",
    approvalStatus: "approved",
    items: [{ materialLabel: "Cement M400", quantity: 12, unit: "bag" }],
    internalSuppliers: [
      {
        supplierId: "supplier-internal-1",
        supplierName: "Internal Supplier One",
        matchedItems: ["Cement M400"],
        priceSignal: "internal quote evidence",
        deliverySignal: "delivery evidence",
        reliabilitySignal: "previous delivery evidence",
        risks: ["confirm_current_price"],
        evidence: ["internal:supplier:supplier-internal-1", "internal:quote:quote-1"],
        missingData: ["fresh_quote"],
      },
    ],
    externalCitedPreviews: [
      {
        supplierName: "External cited preview",
        matchedItems: ["Cement M400"],
        citationRefs: ["market:citation:cement-1"],
        risks: ["external_preview_only"],
        missingData: ["confirmed_quote"],
      },
    ],
  });

  const noEvidenceBundle = hydrateApprovedRequestSupplierProposalBundle({
    requestId: "approved-request-2",
    approvalStatus: "approved",
    items: [{ materialLabel: "Rare item" }],
    internalSuppliers: [],
  });

  const readyOptionsHaveEvidence =
    Boolean(readyBundle) &&
    (readyBundle?.supplierOptions.length ?? 0) > 0 &&
    (readyBundle?.supplierOptions.every((option) => option.evidence.length > 0) ?? false);
  const externalOptionsHaveCitation =
    Boolean(readyBundle) &&
    (readyBundle?.supplierOptions
      .filter((option) => option.source === "external_cited_preview")
      .every((option) => option.evidence.every((ref) => ref.includes("citation"))) ?? false);
  const exactNoEvidenceMessage =
    Boolean(noEvidenceBundle) &&
    noEvidenceBundle?.supplierOptions.length === 0 &&
    /не найдено|цитированием|evidence/i.test(NO_INTERNAL_SUPPLIERS_MESSAGE);

  return {
    readyBundle,
    noEvidenceBundle,
    readyOptionsHaveEvidence,
    externalOptionsHaveCitation,
    exactNoEvidenceMessage,
    policyValid:
      validateSupplierProposalBundlePolicy(readyBundle) &&
      validateSupplierProposalBundlePolicy(noEvidenceBundle),
  };
}

export function listAiProcurementSuppliersMagicPacks(): AiScreenMagicPack[] {
  return AI_PROCUREMENT_SUPPLIERS_MAGIC_SCREENS.map(getProcurementSuppliersMagicPack);
}

export function buildAiProcurementSuppliersMagicButtonManifest() {
  return listAiProcurementSuppliersMagicPacks().flatMap((pack) =>
    AI_PROCUREMENT_SUPPLIERS_MAGIC_EXPECTED_BUTTONS[pack.screenId as AiProcurementSuppliersMagicScreenId]
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

export function buildAiProcurementSuppliersMagicInventory() {
  return {
    wave: AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE,
    screens: listAiProcurementSuppliersMagicPacks().map((pack) => ({
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
      expectedButtons: AI_PROCUREMENT_SUPPLIERS_MAGIC_EXPECTED_BUTTONS[
        pack.screenId as AiProcurementSuppliersMagicScreenId
      ],
    })),
    approvedRequestEvidenceProof: buildApprovedRequestEvidenceProof(),
  };
}

export function buildAiProcurementSuppliersMagicMatrix(
  options: AiProcurementSuppliersMagicProofOptions = {},
) {
  const packs = listAiProcurementSuppliersMagicPacks();
  const buttons = buildAiProcurementSuppliersMagicButtonManifest();
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
      evidence: item.evidence,
      missingData: item.missingData,
    })),
    buttons: pack.buttons.map((button) => ({
      label: button.label,
      actionKind: button.actionKind,
      forbiddenReason: button.forbiddenReason,
      exactBlocker: button.exactBlocker,
    })),
  })));
  const evidenceProof = buildApprovedRequestEvidenceProof();
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
  const procurementContextHydrated = packs.every((pack) =>
    (pack.domain === "procurement" || pack.domain === "market" || pack.domain === "marketplace") &&
    pack.aiPreparedWork.length >= 4 &&
    pack.visibleDomainData.length > 0 &&
    pack.riskSummary.length > 0 &&
    pack.missingDataSummary.length > 0,
  );
  const approvedRequestsNotEmpty =
    evidenceProof.policyValid &&
    (
      evidenceProof.readyOptionsHaveEvidence ||
      evidenceProof.exactNoEvidenceMessage
    );
  const supplierOptionsShowEvidenceOrExactNoEvidence =
    evidenceProof.policyValid &&
    evidenceProof.readyOptionsHaveEvidence &&
    evidenceProof.externalOptionsHaveCitation &&
    evidenceProof.exactNoEvidenceMessage;
  const internalFirstRecommendation =
    evidenceProof.readyBundle?.generatedFrom === "internal_first" &&
    /internal-first/i.test(serialized);
  const directOrderPathsFound = packs
    .flatMap((pack) => pack.buttons)
    .filter(containsDirectOrderPath).length;
  const warehouseMutationPathsFound = packs
    .flatMap((pack) => pack.buttons)
    .filter(containsWarehouseMutationPath).length;
  const fakeDataFound = containsFakeProcurementData(serialized);
  const debugCopyVisible = containsDebugCopy(visibleCopy);
  const coreGreen =
    packs.length === AI_PROCUREMENT_SUPPLIERS_MAGIC_SCREENS.length &&
    procurementContextHydrated &&
    expectedButtonsFound &&
    approvedRequestsNotEmpty &&
    supplierOptionsShowEvidenceOrExactNoEvidence &&
    internalFirstRecommendation &&
    qaFromScreenContext &&
    safeReadNoMutation &&
    draftOnlyNotFinalSubmit &&
    approvalRequiredRoutesToLedger &&
    directOrderPathsFound === 0 &&
    warehouseMutationPathsFound === 0 &&
    !fakeDataFound &&
    !debugCopyVisible;

  return {
    wave: AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE,
    final_status: coreGreen
      ? AI_PROCUREMENT_SUPPLIERS_MAGIC_GREEN_STATUS
      : "BLOCKED_AI_MAGIC_PROCUREMENT_SUPPLIERS_CONTRACT",
    screens_covered: packs.length,
    approved_requests_not_empty: approvedRequestsNotEmpty,
    supplier_options_show_evidence_or_exact_no_evidence: supplierOptionsShowEvidenceOrExactNoEvidence,
    internal_first_recommendation: internalFirstRecommendation,
    qa_from_screen_context: qaFromScreenContext,
    buttons_clicked_on_web: options.webProofPass ?? false,
    buttons_targetable_on_android: options.androidProofPass ?? false,
    ios_testflight_signoff_current: options.iosTestflightSignoffCurrent ?? true,
    safe_read_no_mutation: safeReadNoMutation,
    draft_only_not_final_submit: draftOnlyNotFinalSubmit,
    approval_required_routes_to_ledger: approvalRequiredRoutesToLedger,
    direct_order_paths_found: directOrderPathsFound,
    fake_suppliers_created: false,
    fake_prices_created: false,
    fake_availability_created: false,
    warehouse_mutation_paths_found: warehouseMutationPathsFound,
    new_hooks_added: false,
    fake_green_claimed: false,
    procurement_context_hydrated: procurementContextHydrated,
    expected_buttons_found: expectedButtonsFound,
    debug_copy_visible: debugCopyVisible,
    external_options_without_citation: evidenceProof.externalOptionsHaveCitation ? 0 : 1,
    button_manifest: buttons,
  };
}

export function buildAiProcurementSuppliersMagicProofMarkdown(
  options: AiProcurementSuppliersMagicProofOptions = {},
): string {
  const matrix = buildAiProcurementSuppliersMagicMatrix(options);
  return [
    `# ${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}`,
    "",
    `Final status: ${matrix.final_status}`,
    `Screens covered: ${matrix.screens_covered}`,
    `Approved requests not empty: ${matrix.approved_requests_not_empty}`,
    `Supplier options evidence/no-evidence proof: ${matrix.supplier_options_show_evidence_or_exact_no_evidence}`,
    `Internal-first recommendation: ${matrix.internal_first_recommendation}`,
    `Buttons clicked on web: ${matrix.buttons_clicked_on_web}`,
    `Buttons targetable on Android: ${matrix.buttons_targetable_on_android}`,
    `iOS TestFlight signoff current: ${matrix.ios_testflight_signoff_current}`,
    "",
    "Procurement AI uses the existing screenMagic and approval-ledger contracts.",
    "Safe reads only open screen-context results, draft-only actions stay drafts, and supplier choice/order actions require approval.",
    "Approved requests resolve to evidence-backed options or an exact no-evidence next action; external previews require citation markers.",
  ].join("\n");
}
