import { readFileSync } from "node:fs";

import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import {
  __resetConsumerRepairRequestStoreForTests,
  applyConsumerRepairDraftRevisionParamPatch,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairPdfStorageObject,
  getConsumerRepairRequest,
} from "../../src/lib/consumerRequests";
import { extractEstimatePdfText } from "../../src/lib/estimatePdf";

type PromptCase = {
  id: string;
  prompt: string;
};

function promptForCase(caseId: string): string {
  const cases = JSON.parse(
    readFileSync("tests/fixtures/aiPromptPacks/ai_5000_next_real_work_prompts.json", "utf8"),
  ) as PromptCase[];
  const testCase = cases.find((candidate) => candidate.id === caseId);
  if (!testCase) throw new Error(`PROMPT_CASE_NOT_FOUND:${caseId}`);
  return testCase.prompt;
}

describe("request autoPrepare source-backed structured estimate", () => {
  beforeEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  it("reuses structured BOQ price completeness instead of running a second estimator pass", () => {
    const integration = readFileSync(
      "src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts",
      "utf8",
    );
    const requestRoute = readFileSync("app/(tabs)/request/index.tsx", "utf8");

    expect(integration).toContain("payload.boq.totals.missingPriceRowsCount");
    expect(integration).not.toContain("buildExactMaterialPriceEstimate");
    const draftPanel = readFileSync(
      "src/features/consumerRepair/ConsumerRepairDraftPanel.tsx",
      "utf8",
    );
    expect(draftPanel).toContain("bundle?.structuredEstimatePayload == null");
    expect(requestRoute).toContain(
      'features/consumerRepair/ConsumerRepairRequestScreenContainer"',
    );
    expect(requestRoute).not.toContain(
      'from "../../../src/features/consumerRepair"',
    );
  });

  it("keeps the real Web route draft priced and professional without changing the structured payload contract", () => {
    const prompt = promptForCase("W159-04-01");
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "request-autoprepare-source-backed",
      problemText: prompt,
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });
    const viewModel = buildRequestEstimateViewModel(bundle);
    const primaryText = [
      viewModel?.title,
      viewModel?.summary,
      viewModel?.totalLabel,
      viewModel?.priceStatusLabel,
      ...(viewModel?.visibleLines.slice(0, 8).map((line) => line.text) ?? []),
    ].join("\n");

    expect(aiDraft.selectedWork?.selectedWorkKey).toBe("dynamic_foundation_estimate");
    expect(aiDraft.structuredEstimatePayload?.workKey).toBe("dynamic_foundation_estimate");
    expect(aiDraft.structuredEstimatePayload?.selectedWork).toBeUndefined();
    expect(aiDraft.structuredEstimatePayload?.boq.totals.missingPriceRowsCount).toBe(0);
    expect(aiDraft.items.length).toBeGreaterThan(20);
    expect(aiDraft.items.every((item) => item.unitPrice != null && item.priceSource !== "missing")).toBe(true);

    expect(bundle.draft.selectedWorkKey).toBe("dynamic_foundation_estimate");
    expect(bundle.structuredEstimatePayload?.workKey).toBe("dynamic_foundation_estimate");
    expect(bundle.structuredEstimatePayload?.selectedWork).toBeUndefined();
    expect(bundle.items).toHaveLength(aiDraft.items.length);
    expect(bundle.items.every((item) => item.unitPrice != null && item.totalPrice != null)).toBe(true);
    expect(bundle.estimateDraftSession).not.toBeNull();
    expect(bundle.estimateDraftSession?.workIntent?.canonicalWorkKey).toBe(
      "dynamic_foundation_estimate",
    );

    expect(viewModel?.title).not.toMatch(/Заявка на ремонт|dynamic_foundation_estimate|PRICE_MISSING/i);
    expect(viewModel?.priceStatusLabel).toContain(`${bundle.items.length}/${bundle.items.length}`);
    expect(viewModel?.sections.length).toBeGreaterThanOrEqual(3);
    expect(primaryText).not.toMatch(/Заявка на ремонт|READY_PROFESSIONAL|PRELIMINARY_REQUIRES_INPUT|PRICE_MISSING|dynamic_foundation_estimate/i);
  });

  it("prefers the structured electrical BOQ over a shallow priced catalog match", () => {
    const prompt =
      "электромонтаж 10 розеток и 10 выключателей\nдлина трассы 154 метра\nплощадь 87 м²\n8 точек освещения";
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "request-autoprepare-electrical-structured",
      problemText: prompt,
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    expect(aiDraft.selectedWork?.selectedWorkKey).toBe("electrical_area_installation");
    expect(aiDraft.structuredEstimatePayload?.workKey).toBe("electrical_area_installation");
    expect(aiDraft.items.length).toBeGreaterThan(10);
    expect(bundle.items).toHaveLength(aiDraft.items.length);
    expect(bundle.items.map((item) => item.titleRu).join("\n")).toMatch(/кабел|розет|выключ/i);
    expect(bundle.estimateDraftSession?.status).toBe("REVIEW");
    expect(bundle.canonicalParameterSession?.status).toBe("PRELIMINARY_WITH_ASSUMPTIONS");
    const parameters = Object.fromEntries(
      bundle.canonicalParameterSession?.parameters.map((parameter) => [
        parameter.parameterId,
        parameter,
      ]) ?? [],
    );
    expect(parameters.area_m2?.value).toBe(87);
    expect(parameters.route_length_m?.value).toBe(154);
    expect(parameters.outlet_count?.value).toBe(10);
    expect(parameters.switch_count?.value).toBe(10);
    expect(parameters.lighting_point_count?.value).toBe(8);
    expect(parameters.electrical_points_total?.value).toBe(28);
    expect(parameters.electrical_points_total?.source).toBe("CALCULATED");
    expect(
      bundle.items.some((item) => item.quantity === 100 && /кабел/i.test(item.titleRu)),
    ).toBe(false);
    const initialRowCodes = bundle.items.map((item) =>
      String(item.sourceParameters?.rowCode),
    );
    expect(new Set(initialRowCodes).size).toBe(initialRowCodes.length);
    expect(initialRowCodes.join("\n")).not.toMatch(
      /assurance|universal_registered|required_plan/i,
    );
    const initialCableQuantity = bundle.items
      .filter((item) =>
        /^electrical_(?:power|lighting)_cable$/.test(
          String(item.sourceParameters?.rowCode),
        )
      )
      .reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    expect(initialCableQuantity).toBe(154);
    expect(buildRequestEstimateViewModel(bundle)?.visibleLines.length).toBe(
      aiDraft.items.length,
    );

    const initialTotal = bundle.items.reduce(
      (sum, item) => sum + (item.totalPrice ?? 0),
      0,
    );
    const initialOutletQuantity = bundle.items.find((item) =>
      String(item.sourceParameters?.rowCode).startsWith("electrical_outlets")
    )?.quantity;
    const recalculated = applyConsumerRepairDraftRevisionParamPatch({
      requestDraftId: bundle.draft.id,
      operation: "update_param",
      paramKey: "route_length_m",
      rawValue: "200",
      createdAt: "2026-07-28T12:00:00.000Z",
    });
    const recalculatedParameters = Object.fromEntries(
      recalculated.canonicalParameterSession?.parameters.map((parameter) => [
        parameter.parameterId,
        parameter,
      ]) ?? [],
    );
    const recalculatedTotal = recalculated.items.reduce(
      (sum, item) => sum + (item.totalPrice ?? 0),
      0,
    );
    expect(recalculatedParameters.route_length_m?.value).toBe(200);
    expect(recalculatedParameters.route_length_m?.source).toBe("USER_EXPLICIT");
    expect(recalculatedParameters.outlet_count?.source).toBe("TEXT_EXTRACTED");
    expect(recalculatedParameters.group_count?.source).toBe("ASSUMED");
    expect(initialTotal).toBe(0);
    expect(recalculatedTotal).toBe(0);
    const recalculatedCableQuantity = recalculated.items
      .filter((item) =>
        /^electrical_(?:power|lighting)_cable$/.test(
          String(item.sourceParameters?.rowCode),
        )
      )
      .reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    expect(recalculatedCableQuantity).toBe(200);
    expect(
      recalculated.items.find((item) =>
        String(item.sourceParameters?.rowCode).startsWith("electrical_outlets")
      )?.quantity,
    ).toBe(initialOutletQuantity);
    expect(recalculated.estimateDraftRevisionState?.revisions).toHaveLength(2);
    expect(
      recalculated.estimateDraftRevisionState?.diffs.at(-1)?.changedParams,
    ).toContainEqual(expect.objectContaining({
      key: "route_length_m",
      before: 154,
      after: 200,
    }));
    const reloaded = getConsumerRepairRequest(bundle.draft.id);
    expect(reloaded.canonicalParameterSession?.fingerprint).toBe(
      recalculated.canonicalParameterSession?.fingerprint,
    );
    expect(
      reloaded.canonicalParameterSession?.parameters.find(
        (parameter) => parameter.parameterId === "route_length_m",
      )?.value,
    ).toBe(200);
    const withPdf = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: bundle.draft.id,
      generatedAt: "2026-07-28T12:01:00.000Z",
    });
    const pdf = withPdf.pdfs[0];
    const pdfObject = getConsumerRepairPdfStorageObject({
      storageBucket: pdf.storageBucket,
      storageKey: pdf.storageKey,
    });
    const pdfText = extractEstimatePdfText(pdfObject!.body);
    expect(pdfText).toContain("Длина кабельной трассы: 200 linear_m");
    expect(pdfText).toContain(
      `Версия расчёта: ${withPdf.canonicalParameterSession?.calculationVersion}`,
    );
    expect(pdfText).toContain(
      `Ревизия расчёта: ${withPdf.estimateDraftRevisionState?.currentRevisionId}`,
    );
  });

  it("keeps passport-backed volume-only earthworks BOQ instead of falling back to manual triage", () => {
    const prompt = "уплотнение песчаного основания в стандартной зоне (раздел: земляные работы) 12 м3, город Бишкек.";
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "request-autoprepare-passport-backed-volume-only",
      problemText: prompt,
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    expect(aiDraft.selectedWork?.selectedWorkKey).toBe("earthworks_interior_sand_base_compact_standard_professional_expanded_v1");
    expect(aiDraft.items).toHaveLength(200);
    expect(aiDraft.items.every((item) => item.sourceParameters?.passportBackedNaturalLanguageIngress === true)).toBe(true);
    expect(aiDraft.items.every((item) => item.priceSource === "missing")).toBe(true);

    expect(bundle.draft.selectedWorkKey).toBe("earthworks_interior_sand_base_compact_standard_professional_expanded_v1");
    expect(bundle.items).toHaveLength(200);
    expect(bundle.items.every((item) => item.sourceParameters?.passportBackedNaturalLanguageIngress === true)).toBe(true);
    expect(bundle.items.every((item) => item.priceSource === "missing")).toBe(true);
  });

  it("keeps passport-backed carpet BOQ without invoking legacy unit fallback", () => {
    const prompt = "укладка ковролина в стандартной зоне 100 м2, город Бишкек.";
    const { bundle, aiDraft } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "request-autoprepare-passport-backed-carpet",
      problemText: prompt,
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    expect(aiDraft.selectedWork?.selectedWorkKey).toBe("flooring_interior_carpet_lay_standard_professional_expanded_v1");
    expect(aiDraft.items).toHaveLength(61);
    expect(aiDraft.items.every((item) => item.sourceParameters?.passportBackedNaturalLanguageIngress === true)).toBe(true);
    expect(aiDraft.items.every((item) => item.priceSource === "missing")).toBe(true);

    expect(bundle.draft.selectedWorkKey).toBe("flooring_interior_carpet_lay_standard_professional_expanded_v1");
    expect(bundle.items).toHaveLength(61);
    expect(bundle.items.every((item) => item.sourceParameters?.passportBackedNaturalLanguageIngress === true)).toBe(true);
    expect(bundle.items.every((item) => item.priceSource === "missing")).toBe(true);
  });
});
