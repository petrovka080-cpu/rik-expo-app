import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import type { ConsumerRepairAiDraft } from "../../src/lib/consumerRequests";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  type ConsumerRepairDraftBundle,
  type ConsumerRepairRequestItem,
} from "../../src/lib/consumerRequests";
import type { ContinuousEstimateDetectorRow } from "../../src/lib/ai/estimateContinuousDetection";

export const CAPITAL_RENOVATION_54_PROMPT = "Капитальный ремонт квартиры 54 кв метра";
export const CAPITAL_RENOVATION_98_PROMPT = "капитальный ремонт квартиры 98 м² потолок 3 м 2 санузла";

export function capitalRenovationDraft(prompt = CAPITAL_RENOVATION_54_PROMPT): ConsumerRepairAiDraft {
  return buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Bishkek" });
}
export function capitalRenovationBundle(prompt = CAPITAL_RENOVATION_54_PROMPT): ConsumerRepairDraftBundle {
  __resetConsumerRepairRequestStoreForTests();
  return createConsumerRepairRequestDraft({
    consumerUserId: `capital-renovation-test-${prompt.length}`,
    problemText: prompt,
    repairType: "apartment_capital_renovation",
    city: "Бишкек",
    addressText: "Бишкек, тестовый адрес",
    contactPhone: "+996700000000",
    aiDraft: capitalRenovationDraft(prompt),
  });
}

export function rowCode(item: Pick<ConsumerRepairRequestItem, "sourceParameters" | "id">): string {
  return String(item.sourceParameters?.rowCode ?? item.id);
}

export function includedInProcurement(item: Pick<ConsumerRepairRequestItem, "sourceParameters">): boolean {
  return item.sourceParameters?.includedInProcurement === true;
}

export function draftItemRowsForDetector(items: readonly ConsumerRepairRequestItem[]): ContinuousEstimateDetectorRow[] {
  return items.map((item) => ({
    row_id: rowCode(item),
    row_title: item.titleRu,
    section: item.itemType === "work" ? "labor" : item.itemType === "service" ? "delivery" : "materials",
    line_type: item.itemType === "work" ? "work" : item.itemType === "service" ? "service" : "material",
    quantity: item.quantity ?? null,
    unit: item.unit ?? "",
    unit_price: item.unitPrice ?? null,
    amount: item.totalPrice ?? null,
    currency: item.currency ?? "KGS",
    formula_id: item.formulaId ?? null,
    template_id: item.templateId ?? null,
    template_version: item.templateVersion ?? null,
    calculation_trace_visible: Boolean(item.calculationTrace),
    calculation_trace: item.calculationTrace ?? null,
    norm_id: item.normId ?? null,
    norm_source: item.normSourceId ?? null,
    norm_version: item.normVersion ?? null,
    price_source: item.priceSourceLabel ?? item.sourceLabel ?? null,
    requires_measurement: item.unitPrice == null || item.totalPrice == null,
    included_in_procurement: includedInProcurement(item),
  }));
}
