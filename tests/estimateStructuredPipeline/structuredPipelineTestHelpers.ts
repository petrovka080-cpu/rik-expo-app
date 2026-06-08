import { createBuiltInAiAssistantMessage } from "../../src/features/ai/assistantAnswerPipeline";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  buildAiEstimatePdfSourceFromGlobalEstimate,
  generateAiEstimatePdf,
} from "../../src/lib/ai/estimatePdf";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";
import { createAiEstimatePdf } from "../../src/lib/aiEstimatePdf";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  buildConsumerRepairCanonicalDraftPayload,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairPdfStorageObject,
  listConsumerRepairRequestHistory,
  sendConsumerRepairRequestToMarketplace,
} from "../../src/lib/consumerRequests";
import { extractEstimatePdfText, validateEstimatePdf } from "../../src/lib/estimatePdf";
import { visibleEstimateLabelViolations } from "../../src/lib/estimatePresentation/visibleEstimateLabelPolicy";
import {
  buildStructuredEstimateCatalogBinding,
  buildStructuredEstimateForemanBinding,
  buildStructuredEstimateHistoryBinding,
  buildStructuredEstimatePayload,
  buildStructuredEstimatePdfViewModel,
  stableStructuredEstimateHash,
  type StructuredEstimatePayload,
} from "../../src/lib/estimateStructuredPipeline";

export const STRUCTURED_PIPELINE_CASES = [
  { id: "foundation_rebar", prompt: "смета на ленточный фундамент 10*10*1,8*0,4", expectedWorkKey: "strip_foundation" },
  { id: "paving_stone", prompt: "смета на укладку брусчатки 587 м2", expectedWorkKey: "paving_stone_laying" },
  { id: "roof", prompt: "смета на кровлю 120 м2", expectedWorkKey: "roof_repair" },
  { id: "electrical_outlets", prompt: "смета на электрику 40 розеток", expectedWorkKey: "socket_installation" },
  { id: "plumbing_house", prompt: "смета на сантехнику в доме 100 м2", expectedWorkKey: "plumbing_basic" },
] as const;

export const FORBIDDEN_VISIBLE_PATTERNS = [
  /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430/i,
  /РєРѕРЅС‚СЂРѕР»СЊ\s+РєР°С‡РµСЃС‚РІР°/i,
  /\bquality\s+control\b/i,
  /foundation system/i,
  /foundation_system/i,
  /foundation_system_assurance/i,
  /foundation_concrete/i,
  /\bwarning\b/i,
  /\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b/,
  /контроль\s+сметного\s+объ[её]ма/i,
  /исполнительная\s+фиксация\s+объ[её]ма/i,
  /резерв\s+профильных\s+материалов/i,
  /креп[её]ж\s+и\s+профильные\s+расходники/i,
] as const;

export const WEAK_GENERIC_ROW_PATTERNS = [
  /^\s*материал\s*$/i,
  /^\s*материалы\s*$/i,
  /^\s*работы\s*$/i,
  /^\s*прочее\s*$/i,
  /^\s*material\s*$/i,
  /^\s*works?\s*$/i,
  /^\s*other\s*$/i,
] as const;

export function estimateForPrompt(prompt: string): GlobalEstimateResult {
  const answer = answerBuiltInAi({
    text: prompt,
    screenContext: "request",
    route: "/request",
    role: "consumer",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  if (!answer.toolResult.estimate) throw new Error(`ESTIMATE_MISSING:${prompt}`);
  return answer.toolResult.estimate;
}

export function payloadForPrompt(prompt: string): StructuredEstimatePayload {
  return buildStructuredEstimatePayload(estimateForPrompt(prompt));
}

export function allPayloads(): StructuredEstimatePayload[] {
  return STRUCTURED_PIPELINE_CASES.map((testCase) => {
    const payload = payloadForPrompt(testCase.prompt);
    expect(payload.workKey).toBe(testCase.expectedWorkKey);
    return payload;
  });
}

export function visibleTextFromPayload(payload: StructuredEstimatePayload): string {
  const catalog = buildStructuredEstimateCatalogBinding(payload);
  const pdf = buildStructuredEstimatePdfViewModel(payload, {
    generatedAt: "2026-06-07T00:00:00.000Z",
    language: "ru",
  });
  return [
    payload.presentation.workTitle,
    payload.presentation.localContext.displayLine,
    ...payload.presentation.rows.map((row) => row.name),
    ...payload.presentation.sourceLabels,
    ...payload.presentation.assumptions,
    ...catalog.rows.flatMap((row) => [row.visibleName, row.searchQuery, row.buttonLabel]),
    ...pdf.sections.flatMap((section) => section.rows.map((row) => row.name)),
    ...pdf.sources,
  ].join("\n");
}

export function expectNoForbiddenVisibleText(text: string): void {
  for (const pattern of FORBIDDEN_VISIBLE_PATTERNS) {
    expect(text).not.toMatch(pattern);
  }
}

export function expectPayloadVisibleRowsSafe(payload: StructuredEstimatePayload): void {
  for (const row of payload.presentation.rows) {
    expect(visibleEstimateLabelViolations(row.name)).toEqual([]);
    expect(WEAK_GENERIC_ROW_PATTERNS.some((pattern) => pattern.test(row.name))).toBe(false);
  }
  expectNoForbiddenVisibleText(visibleTextFromPayload(payload));
}

export function payloadRowsFingerprint(payload: StructuredEstimatePayload): string {
  return stableStructuredEstimateHash(payload.rows.map((row) => ({
    rowId: row.rowId,
    visibleName: row.visibleName,
    quantity: row.quantity,
    unit: row.unit,
    total: row.total,
  })));
}

export function buildRequestBundleFromPayload(payload: StructuredEstimatePayload) {
  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraft(payload.presentation.originalText ?? payload.workTitle, { city: "Bishkek" });
  return createConsumerRepairRequestDraft({
    consumerUserId: "structured-pipeline-user",
    problemText: payload.presentation.originalText ?? payload.workTitle,
    repairType: payload.workCategory,
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft,
  });
}

export function buildApprovedMarketplaceBundle(payload: StructuredEstimatePayload) {
  let bundle = buildRequestBundleFromPayload(payload);
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  bundle = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    generatedAt: "2026-06-07T00:00:00.000Z",
  });
  bundle = approveConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    generatedAt: "2026-06-07T00:00:00.000Z",
  });
  return sendConsumerRepairRequestToMarketplace({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    idempotencyKey: `structured-pipeline:${bundle.draft.id}`,
  });
}

export function requestPdfTextForPayload(payload: StructuredEstimatePayload): string {
  const bundle = generateConsumerRepairRequestPdfForDraft({
    requestDraftId: buildRequestBundleFromPayload(payload).draft.id,
    userId: "structured-pipeline-user",
    generatedAt: "2026-06-07T00:00:00.000Z",
  });
  const pdf = bundle.pdfs[0];
  const object = getConsumerRepairPdfStorageObject({ storageBucket: pdf.storageBucket, storageKey: pdf.storageKey });
  if (!object) throw new Error("REQUEST_PDF_OBJECT_MISSING");
  const validation = validateEstimatePdf({ pdf: object.body, requiredText: [payload.rows[0]?.visibleName ?? payload.workTitle] });
  expect(validation.valid).toBe(true);
  return extractEstimatePdfText(object.body);
}

export function aiPdfTextForPayload(payload: StructuredEstimatePayload): string {
  const direct = createAiEstimatePdf({
    estimate: payload.sourceEstimate,
    runtimeTraceId: `structured-pipeline:${payload.workKey}`,
    route: "/request",
    generatedAt: "2026-06-07T00:00:00.000Z",
    documentMode: "estimate",
  });
  expect(direct.validation.valid).toBe(true);
  return direct.validation.text;
}

export function aiActionPdfTextForPayload(payload: StructuredEstimatePayload): string {
  const source = buildAiEstimatePdfSourceFromGlobalEstimate(payload.sourceEstimate);
  const result = generateAiEstimatePdf({ source, userConfirmed: true });
  const validation = validateEstimatePdf({ pdf: result.access.uri, requiredText: [payload.rows[0]?.visibleName ?? payload.workTitle] });
  expect(validation.valid).toBe(true);
  return validation.text;
}

export function foremanMessageForPayload(payload: StructuredEstimatePayload) {
  const message = createBuiltInAiAssistantMessage({
    text: payload.presentation.originalText ?? payload.workTitle,
    assistantContext: "foreman",
    assistantPresentationRole: "foreman",
    routeContext: "/ai?context=foreman",
    userId: "structured-pipeline-foreman",
  });
  if (!message) throw new Error("FOREMAN_MESSAGE_MISSING");
  return message;
}

export function historyBindingForPayload(payload: StructuredEstimatePayload) {
  const bundle = buildApprovedMarketplaceBundle(payload);
  const history = listConsumerRepairRequestHistory(bundle.draft.consumerUserId);
  const binding = buildStructuredEstimateHistoryBinding({ payload, bundle });
  const marketplacePayload = buildConsumerRepairCanonicalDraftPayload(bundle, "marketplace_send");
  return { bundle, history, binding, marketplacePayload };
}

export function foremanBindingForPayload(payload: StructuredEstimatePayload) {
  return buildStructuredEstimateForemanBinding(payload, "structured-pipeline-foreman");
}
