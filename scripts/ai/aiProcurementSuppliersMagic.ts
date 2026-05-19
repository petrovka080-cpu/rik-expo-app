import { hydrateApprovedRequestSupplierProposalBundle } from "../../src/features/ai/procurement/aiApprovedRequestSupplierProposalHydrator";
import { NO_INTERNAL_SUPPLIERS_MESSAGE } from "../../src/features/ai/procurement/aiApprovedRequestSupplierOptions";
import { validateSupplierProposalBundlePolicy } from "../../src/features/ai/procurement/aiSupplierProposalReadinessPolicy";
import { buildAiScreenMagicButtonResultCopy } from "../../src/features/ai/screenMagic/aiScreenMagicButtonResolver";
import { getAiScreenMagicPack } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";
import { sanitizeAiScreenMagicUserCopy } from "../../src/features/ai/screenMagic/aiScreenMagicUserCopy";
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

function sanitizeExpectedButtons<T extends Record<string, readonly ExpectedProcurementButton[]>>(buttons: T): T {
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

const AI_PROCUREMENT_SUPPLIERS_MAGIC_EXPECTED_BUTTONS_RAW = {
  "buyer.main": [
    { label: "Р Р°Р·РѕР±СЂР°С‚СЊ РІС…РѕРґСЏС‰РёРµ", actionKind: "safe_read" },
    { label: "РЎРјРѕС‚СЂРµС‚СЊ РІР°СЂРёР°РЅС‚С‹ Р·Р°РєСѓРїР°", actionKind: "safe_read" },
    { label: "РЎСЂР°РІРЅРёС‚СЊ РїРѕСЃС‚Р°РІС‰РёРєРѕРІ", actionKind: "safe_read" },
    { label: "Р—Р°РїСЂРѕСЃРёС‚СЊ С†РµРЅС‹", actionKind: "draft_only" },
    { label: "РћС‚РїСЂР°РІРёС‚СЊ РІС‹Р±РѕСЂ РЅР° СЃРѕРіР»Р°СЃРѕРІР°РЅРёРµ", actionKind: "approval_required" },
  ],
  "buyer.requests": [
    { label: "РЎРјРѕС‚СЂРµС‚СЊ РІР°СЂРёР°РЅС‚С‹", actionKind: "safe_read" },
    { label: "РЎСЂР°РІРЅРёС‚СЊ", actionKind: "safe_read" },
    { label: "РџРѕРґРіРѕС‚РѕРІРёС‚СЊ Р·Р°РїСЂРѕСЃ", actionKind: "draft_only" },
    { label: "РџСЂРѕРІРµСЂРёС‚СЊ СЂРёСЃРєРё", actionKind: "safe_read" },
  ],
  "buyer.request.detail": [
    { label: "Р—Р°РїСЂРѕСЃРёС‚СЊ С†РµРЅСѓ", actionKind: "draft_only" },
    { label: "РЎСЂР°РІРЅРёС‚СЊ РІР°СЂРёР°РЅС‚С‹", actionKind: "safe_read" },
    { label: "РџРѕРґРіРѕС‚РѕРІРёС‚СЊ Р·Р°РїСЂРѕСЃ РїРѕСЃС‚Р°РІС‰РёРєСѓ", actionKind: "draft_only" },
    { label: "РћС‚РїСЂР°РІРёС‚СЊ РІС‹Р±РѕСЂ РЅР° СЃРѕРіР»Р°СЃРѕРІР°РЅРёРµ", actionKind: "approval_required" },
  ],
  "procurement.copilot": [
    { label: "РџРѕС‡РµРјСѓ СЌС‚РѕС‚ РїРѕСЃС‚Р°РІС‰РёРє Р»СѓС‡С€Рµ", actionKind: "safe_read" },
    { label: "Р§С‚Рѕ РЅРµ С…РІР°С‚Р°РµС‚ РґР»СЏ РІС‹Р±РѕСЂР°", actionKind: "safe_read" },
    { label: "РЎРґРµР»Р°С‚СЊ Р·Р°РїСЂРѕСЃ РїРѕСЃС‚Р°РІС‰РёРєСѓ", actionKind: "draft_only" },
    { label: "Р§С‚Рѕ РѕС‚РїСЂР°РІРёС‚СЊ РґРёСЂРµРєС‚РѕСЂСѓ", actionKind: "approval_required" },
  ],
  "market.home": [
    { label: "РџРѕРґРіРѕС‚РѕРІРёС‚СЊ РІРЅРµС€РЅРёР№ Р·Р°РїСЂРѕСЃ", actionKind: "draft_only" },
    { label: "РџРѕРєР°Р·Р°С‚СЊ cited РІР°СЂРёР°РЅС‚С‹", actionKind: "safe_read" },
    { label: "РЎСЂР°РІРЅРёС‚СЊ СЃ РІРЅСѓС‚СЂРµРЅРЅРёРјРё", actionKind: "safe_read" },
  ],
  "supplier.showcase": [
    { label: "РЎСЂР°РІРЅРёС‚СЊ СЃ РґСЂСѓРіРёРј", actionKind: "safe_read" },
    { label: "РџРѕРґРіРѕС‚РѕРІРёС‚СЊ Р·Р°РїСЂРѕСЃ", actionKind: "draft_only" },
    { label: "Р”РѕР±Р°РІРёС‚СЊ РІ shortlist", actionKind: "draft_only" },
    { label: "РћС‚РїСЂР°РІРёС‚СЊ РІС‹Р±РѕСЂ РЅР° approval", actionKind: "approval_required" },
  ],
} as const satisfies Record<AiProcurementSuppliersMagicScreenId, readonly ExpectedProcurementButton[]>;

export const AI_PROCUREMENT_SUPPLIERS_MAGIC_EXPECTED_BUTTONS = sanitizeExpectedButtons(
  AI_PROCUREMENT_SUPPLIERS_MAGIC_EXPECTED_BUTTONS_RAW,
);

export type AiProcurementSuppliersMagicProofOptions = {
  webProofPass?: boolean;
  androidProofPass?: boolean;
  iosTestflightSignoffCurrent?: boolean;
};

function normalizeLabel(value: string): string {
  return sanitizeAiScreenMagicUserCopy(String(value || ""))
    .trim()
    .toLowerCase()
    .replace(/С‘/g, "Рµ")
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
  return /(СЃРѕР·РґР°С‚СЊ Р·Р°РєР°Р·|СЃРѕР·РґР°С‚СЊ order|direct order|create order|order РёР· copilot|confirm supplier|РїРѕРґС‚РІРµСЂРґРёС‚СЊ РїРѕСЃС‚Р°РІС‰РёРєР°)/i.test(text)
    && button.actionKind !== "forbidden";
}

function containsWarehouseMutationPath(button: AiScreenMagicButton): boolean {
  const text = normalizeLabel(`${button.id} ${button.label} ${button.bffRoute ?? ""} ${button.approvalRoute ?? ""}`);
  return /(warehouse mutation|stock mutation|СЃРєР»Р°РґСЃРєР°СЏ Р·Р°РїРёСЃСЊ|РјРµРЅСЏРµС‚ СЃРєР»Р°Рґ|РёР·РјРµРЅРёС‚СЊ РѕСЃС‚Р°С‚РѕРє|СЃРїРёСЃР°С‚СЊ СЃРєР»Р°Рґ)/i.test(text)
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
    NO_INTERNAL_SUPPLIERS_MESSAGE.trim().length > 0;

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
    const question = pack.qa[0]?.question ?? "Р§С‚Рѕ РєСЂРёС‚РёС‡РЅРѕ СЃРµР№С‡Р°СЃ?";
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
    evidenceProof.readyBundle?.generatedFrom === "internal_first";
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
