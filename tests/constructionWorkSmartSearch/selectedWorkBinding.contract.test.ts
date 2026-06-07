import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
  GLOBAL_WORK_CATEGORIES,
  GLOBAL_WORK_TYPE_DEFINITIONS,
  searchGlobalWorkSmartSuggestions,
  type GlobalSelectedWorkBinding,
} from "../../src/lib/ai/globalEstimate";
import { BUILT_IN_AI_1000_ESTIMATE_CASES } from "../../src/lib/ai/builtInAi1000/builtInAi1000ConstructionCases";
import {
  buildConsumerRepairAiDraftFromGlobalEstimate,
  createConsumerRepairDraftFromGlobalEstimate,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairPdfStorageObject,
  __resetConsumerRepairRequestStoreForTests,
  type ConsumerRepairSelectedWork,
} from "../../src/lib/consumerRequests";
import { extractEstimatePdfText } from "../../src/lib/estimatePdf";
import {
  buildStructuredEstimateCatalogBinding,
  buildStructuredEstimatePayload,
} from "../../src/lib/estimateStructuredPipeline";
import {
  buildRequestEstimateDraftFromConsumerBundle,
  buildRequestEstimatePayloadSet,
  compareRequestEstimatePayloadParity,
} from "../../src/features/consumerRepair/buildRequestEstimatePayload";

const QUERY_CASES = [
  "\u043c\u043e\u043d\u0442\u0430\u0436",
  "\u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043c\u043e\u043d\u0442\u0430\u0436",
  "\u044d\u043b\u0435\u0442\u043a\u0440\u043e\u043c\u043e\u043d\u0442\u0430\u0436",
  "\u0431\u0440\u0443\u0441\u0447\u0430\u0442\u043a\u0430",
  "\u043a\u0440\u044b\u0448\u0430",
  "\u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442",
  "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f",
  "\u0441\u0442\u044f\u0436\u043a\u0430",
  "\u043f\u043b\u0438\u0442\u043a\u0430",
] as const;

const FORBIDDEN_VISIBLE_PATTERNS = [
  /foundation_system/i,
  /foundation_concrete/i,
  /\bwarning\b/i,
  /\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b/,
] as const;

const WEAK_GENERIC_ROW_PATTERNS = [
  /^\s*\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\s*$/i,
  /^\s*\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b\s*$/i,
  /^\s*\u0440\u0430\u0431\u043e\u0442\u044b\s*$/i,
  /^\s*\u043f\u0440\u043e\u0447\u0435\u0435\s*$/i,
  /^\s*material\s*$/i,
  /^\s*works?\s*$/i,
  /^\s*other\s*$/i,
] as const;

function expectVisibleTextSafe(text: string): void {
  for (const pattern of FORBIDDEN_VISIBLE_PATTERNS) {
    expect(text).not.toMatch(pattern);
  }
}

function toConsumerSelectedWork(binding: GlobalSelectedWorkBinding): ConsumerRepairSelectedWork {
  return {
    selectedWorkKey: binding.selectedWorkKey,
    selectedWorkTitleRu: binding.selectedTitleRu,
    selectedWorkCategoryKey: binding.selectedCategoryKey,
    selectedWorkCategoryTitleRu: binding.selectedCategoryTitleRu,
    selectedWorkRawInput: binding.rawInput,
    selectedWorkSource: "user_selected",
    selectedWorkResolverReGuessed: false,
  };
}

function sampleCasesAcrossManifestCategories(limit: number) {
  const grouped = new Map<string, typeof BUILT_IN_AI_1000_ESTIMATE_CASES[number][]>();
  for (const testCase of BUILT_IN_AI_1000_ESTIMATE_CASES) {
    const cases = grouped.get(testCase.category) ?? [];
    cases.push(testCase);
    grouped.set(testCase.category, cases);
  }

  const samples: typeof BUILT_IN_AI_1000_ESTIMATE_CASES[number][] = [];
  const categories = [...grouped.keys()].sort();
  for (let index = 0; samples.length < limit; index += 1) {
    for (const category of categories) {
      const next = grouped.get(category)?.[index];
      if (next) samples.push(next);
      if (samples.length >= limit) break;
    }
  }
  return samples;
}

describe("construction work smart search selected-work binding", () => {
  beforeEach(() => __resetConsumerRepairRequestStoreForTests());

  it("shows 3-8 visible Russian suggestions for broad inputs and hides internal keys", () => {
    for (const query of QUERY_CASES) {
      const suggestions = searchGlobalWorkSmartSuggestions({ query, limit: 8 });
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
      expect(suggestions.length).toBeLessThanOrEqual(8);

      const visible = suggestions.map((suggestion) => suggestion.visibleText).join("\n");
      expect(visible).toMatch(/[\u0400-\u04ff]/);
      expectVisibleTextSafe(visible);
      expect(visible).not.toContain(suggestions[0]?.workKey ?? "___missing_work_key___");
      expect(suggestions.every((suggestion) => suggestion.workKey && suggestion.titleRu && suggestion.categoryTitleRu)).toBe(true);
    }

    const typoElectrical = searchGlobalWorkSmartSuggestions({
      query: "\u044d\u043b\u0435\u0442\u043a\u0440\u043e\u043c\u043e\u043d\u0442\u0430\u0436",
      limit: 8,
    });
    expect(typoElectrical.some((suggestion) => suggestion.categoryKey === "electrical")).toBe(true);
    expect(typoElectrical.slice(0, 4).some((suggestion) => suggestion.categoryKey === "electrical")).toBe(true);
  });

  it("uses selected_work_key as source of truth and does not re-guess from raw text", () => {
    const rawInput =
      "\u043c\u043e\u043d\u0442\u0430\u0436 \u044d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0438 40 \u0440\u043e\u0437\u0435\u0442\u043e\u043a";
    const selectedWork = buildGlobalSelectedWorkBinding({
      selectedWorkKey: "ceramic_tile_laying",
      rawInput,
    });
    const estimate = calculateGlobalConstructionEstimateSync(
      buildGlobalEstimateInputWithSelectedWork(
        {
          text: rawInput,
          language: "ru",
          countryCode: "KG",
          city: "Bishkek",
          volume: 24,
          unit: "sq_m",
        },
        selectedWork,
      ),
    );

    expect(estimate.work.workKey).toBe("ceramic_tile_laying");
    expect(estimate.work.category).toBe("tile");
    expect(selectedWork.resolverReGuessed).toBe(false);

    const payload = buildStructuredEstimatePayload(estimate, {
      source: "request",
      selectedWork,
    });
    expect(payload.workKey).toBe(selectedWork.selectedWorkKey);
    expect(payload.selectedWork?.selectedWorkKey).toBe(selectedWork.selectedWorkKey);
    expect(payload.selectedWork?.resolverReGuessed).toBe(false);
    expect(payload.presentation.rows.length).toBeGreaterThan(0);
    expect(payload.presentation.rows.some((row) => WEAK_GENERIC_ROW_PATTERNS.some((pattern) => pattern.test(row.name)))).toBe(false);
  });

  it("keeps selected work across request, runtime trace, PDF and catalog visible-label bindings", () => {
    const rawInput =
      "\u044d\u043b\u0435\u0442\u043a\u0440\u043e\u043c\u043e\u043d\u0442\u0430\u0436 18 \u0448\u0442";
    const binding = buildGlobalSelectedWorkBinding({
      selectedWorkKey: "socket_installation",
      rawInput,
    });
    const selectedWork = toConsumerSelectedWork(binding);
    const estimate = calculateGlobalConstructionEstimateSync(
      buildGlobalEstimateInputWithSelectedWork(
        {
          text: rawInput,
          language: "ru",
          countryCode: "KG",
          city: "Bishkek",
          volume: 18,
          unit: "pcs",
        },
        binding,
      ),
    );

    const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(estimate, undefined, selectedWork);
    const bundle = createConsumerRepairDraftFromGlobalEstimate({
      consumerUserId: "selected-work-contract-user",
      estimate,
      originalText: rawInput,
      city: "Bishkek",
      contactPhone: "+996700000000",
      selectedWork,
    });
    const requestDraft = buildRequestEstimateDraftFromConsumerBundle(bundle);
    const payloads = buildRequestEstimatePayloadSet(requestDraft);
    const parity = compareRequestEstimatePayloadParity({
      visibleUi: payloads.visible_ui,
      pdfPayload: payloads.pdf_payload,
      saveDraftPayload: payloads.save_draft_payload,
      sendRequestPayload: payloads.send_request_payload,
      runtimeTracePayload: payloads.runtime_trace,
    });

    expect(aiDraft.selectedWork?.selectedWorkKey).toBe(binding.selectedWorkKey);
    expect(bundle.draft.selectedWorkKey).toBe(binding.selectedWorkKey);
    expect(requestDraft.workKey).toBe(binding.selectedWorkKey);
    expect(payloads.runtime_trace.runtimeTrace.selectedWorkKey).toBe(binding.selectedWorkKey);
    expect(parity.passed).toBe(true);
    expect(parity.selectedWorkMatchesPayloads).toBe(true);
    expect(parity.failures).toEqual([]);

    const pdfBundle = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-06-08T00:00:00.000Z",
    });
    const pdf = pdfBundle.pdfs[0];
    const storedPdf = getConsumerRepairPdfStorageObject({
      storageBucket: pdf.storageBucket,
      storageKey: pdf.storageKey,
    });
    expect(storedPdf).toBeTruthy();
    const pdfText = extractEstimatePdfText(storedPdf!.body);
    expect(pdfText).toContain(binding.selectedTitleRu);
    expectVisibleTextSafe(pdfText);

    const structuredPayload = buildStructuredEstimatePayload(estimate, { source: "request", selectedWork: binding });
    const catalog = buildStructuredEstimateCatalogBinding(structuredPayload);
    const catalogVisible = catalog.rows.flatMap((row) => [row.visibleName, row.searchQuery, row.buttonLabel]).join("\n");
    expect(catalog.rows.length).toBeGreaterThan(0);
    expectVisibleTextSafe(catalogVisible);
    expect(catalogVisible).not.toContain(binding.selectedWorkKey);
  });

  it("keeps selected work dominant for 150 real estimate cases and registry covers 25+ domains", () => {
    const samples = sampleCasesAcrossManifestCategories(150);
    const manifestCategories = new Set(samples.map((testCase) => testCase.category));
    const registryCategories = new Set(GLOBAL_WORK_TYPE_DEFINITIONS.map((definition) => definition.category));

    expect(samples).toHaveLength(150);
    expect(manifestCategories.size).toBeGreaterThanOrEqual(20);
    expect(GLOBAL_WORK_CATEGORIES.length).toBeGreaterThanOrEqual(25);
    expect(registryCategories.size).toBeGreaterThanOrEqual(25);

    for (const testCase of samples) {
      const binding = buildGlobalSelectedWorkBinding({
        selectedWorkKey: testCase.workKey,
        rawInput: "\u043c\u043e\u043d\u0442\u0430\u0436",
      });
      const estimate = calculateGlobalConstructionEstimateSync(
        buildGlobalEstimateInputWithSelectedWork(
          {
            text: "\u043c\u043e\u043d\u0442\u0430\u0436",
            language: "ru",
            countryCode: "KG",
            city: "Bishkek",
            volume: testCase.volume,
            unit: testCase.unit,
          },
          binding,
        ),
      );
      expect(estimate.work.workKey).toBe(testCase.workKey);
      expect(estimate.sections.flatMap((section) => section.rows).length).toBeGreaterThan(0);
    }
  });
});
