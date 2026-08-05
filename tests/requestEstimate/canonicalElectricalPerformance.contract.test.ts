import { buildConsumerRepairSelectedWorkDraftBundle } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { buildCanonicalElectricalConsumerRepairAiDraft } from "../../src/lib/estimate/v4/electrical/buildCanonicalElectricalConsumerRepairAiDraft";
import {
  __resetConsumerRepairRequestStoreForTests,
  applyConsumerRepairDraftRevisionParamPatch,
} from "../../src/lib/consumerRequests";

const ELECTRICAL_PROMPT = [
  "электромонтаж 10 розеток и 10 выключателей",
  "длина трассы 154 метра",
  "площадь 87 м²",
  "8 точек освещения",
].join("\n");

function percentile95(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
}

describe("canonical electrical production performance budgets", () => {
  beforeEach(() => {
    __resetConsumerRepairRequestStoreForTests();
  });

  it("keeps deterministic prompt compilation below one second and warm p95 below five seconds", () => {
    const durations: number[] = [];
    const boqSignatures = new Set<string>();
    for (let index = 0; index < 12; index += 1) {
      const startedAt = performance.now();
      const draft = buildCanonicalElectricalConsumerRepairAiDraft({
        text: ELECTRICAL_PROMPT,
      });
      durations.push(performance.now() - startedAt);
      const rowCodes = draft.items.map(
        (item) => String(item.sourceParameters?.rowCode ?? ""),
      );
      expect(rowCodes.every(Boolean)).toBe(true);
      expect(new Set(rowCodes).size).toBe(rowCodes.length);
      expect(
        draft.items
          .filter((item) =>
            item.priceSourceId === "src_configured_regional_reference_2026" ||
            item.priceStatus === "REFERENCE_PRICE_ESTIMATE"
          )
          .map((item) => ({
            rowCode: item.sourceParameters?.rowCode,
            unitPrice: item.unitPrice,
            priceStatus: item.priceStatus,
            priceSourceId: item.priceSourceId,
          })),
      ).toEqual([]);
      expect(draft.items.some((item) => item.unitPrice == null)).toBe(true);
      boqSignatures.add(draft.items.map((item) => [
        item.sourceParameters?.rowCode,
        item.quantity,
        item.unit,
      ].join(":")).join("|"));
    }

    expect(boqSignatures.size).toBe(1);
    expect(Math.max(...durations)).toBeLessThan(1_000);
    expect(percentile95(durations)).toBeLessThan(5_000);
  });

  it("recalculates and persists a visible parameter edit below two seconds", () => {
    const { bundle } = buildConsumerRepairSelectedWorkDraftBundle({
      consumerUserId: "electrical-performance-editor",
      problemText: ELECTRICAL_PROMPT,
      repairType: "estimate",
      city: "Bishkek",
      addressText: "",
      preferredTimeText: "",
      contactPhone: "",
      selectedWork: null,
    });

    const startedAt = performance.now();
    const edited = applyConsumerRepairDraftRevisionParamPatch({
      requestDraftId: bundle.draft.id,
      operation: "update_param",
      paramKey: "route_length_m",
      rawValue: "200",
      createdAt: "2026-07-28T16:00:00.000Z",
    });
    const duration = performance.now() - startedAt;

    expect(duration).toBeLessThan(2_000);
    expect(
      edited.canonicalParameterSession?.parameters.find(
        (parameter) => parameter.parameterId === "route_length_m",
      ),
    ).toEqual(expect.objectContaining({
      value: 200,
      source: "USER_EXPLICIT",
    }));
    expect(
      edited.items.find(
        (item) => item.sourceParameters?.rowCode === "electrical_cable_laying",
      )?.quantity,
    ).toBe(200);
  });
});
