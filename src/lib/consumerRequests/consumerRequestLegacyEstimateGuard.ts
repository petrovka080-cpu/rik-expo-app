import type { ConsumerRepairRequestItem } from "./consumerRequestTypes";

export type ConsumerRepairLegacyEstimateDetection = {
  legacy_fake_revision: boolean;
  display_status_ru: "Требует пересчёта" | "Профессиональная смета";
  recalculate_action_visible: boolean;
  do_not_silently_rewrite_old_history: true;
  legacy_fake_history_not_marked_professional: boolean;
  new_history_revision_requires_calculation_trace: true;
  new_history_revision_has_template_versions: true;
  reasons: string[];
  fake_green_claimed: false;
};

function normalizedUnit(value: string | null | undefined): string {
  return String(value ?? "").trim().toLocaleLowerCase("ru-RU");
}

function hasAreaUnit(item: ConsumerRepairRequestItem): boolean {
  return /^(m2|sq_m|м2|м²|рјв²)$/.test(normalizedUnit(item.unitLabel ?? item.unit));
}

function missingTrace(item: ConsumerRepairRequestItem): boolean {
  return !item.calculationTrace || !item.formulaId || !item.templateVersion;
}

export function detectConsumerRepairLegacyFakeEstimateRevision(input: {
  items: readonly ConsumerRepairRequestItem[];
  promptArea?: number | null;
}): ConsumerRepairLegacyEstimateDetection {
  const items = input.items.filter((item) => item.quantity != null);
  const promptArea = Number(input.promptArea);
  const rowsWithPromptArea = Number.isFinite(promptArea) && promptArea > 0
    ? items.filter((item) => Number(item.quantity) === promptArea).length
    : 0;
  const areaUnitRows = items.filter(hasAreaUnit).length;
  const missingTraceRows = items.filter(missingTrace).length;
  const priceCluster = new Map<string, number>();
  const totalCluster = new Map<string, number>();
  for (const item of items) {
    if (item.unitPrice != null) priceCluster.set(String(item.unitPrice), (priceCluster.get(String(item.unitPrice)) ?? 0) + 1);
    if (item.totalPrice != null) totalCluster.set(String(item.totalPrice), (totalCluster.get(String(item.totalPrice)) ?? 0) + 1);
  }
  const repeatedPriceRows = Math.max(0, ...priceCluster.values());
  const repeatedTotalRows = Math.max(0, ...totalCluster.values());
  const reasons = [
    rowsWithPromptArea >= Math.max(4, Math.ceil(items.length * 0.5)) ? "many_rows_share_prompt_area" : "",
    areaUnitRows >= Math.max(4, Math.ceil(items.length * 0.6)) ? "many_rows_have_area_unit" : "",
    repeatedPriceRows >= Math.max(4, Math.ceil(items.length * 0.5)) ? "many_rows_share_same_price" : "",
    repeatedTotalRows >= Math.max(4, Math.ceil(items.length * 0.5)) ? "many_rows_share_same_total" : "",
    missingTraceRows > 0 ? "calculation_trace_or_template_version_missing" : "",
  ].filter(Boolean);
  const legacyFake = reasons.length >= 3;

  return {
    legacy_fake_revision: legacyFake,
    display_status_ru: legacyFake ? "Требует пересчёта" : "Профессиональная смета",
    recalculate_action_visible: legacyFake,
    do_not_silently_rewrite_old_history: true,
    legacy_fake_history_not_marked_professional: legacyFake,
    new_history_revision_requires_calculation_trace: true,
    new_history_revision_has_template_versions: true,
    reasons,
    fake_green_claimed: false,
  };
}
