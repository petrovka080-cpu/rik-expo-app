import type {
  SmartEstimatorAnalyzedInput,
  SmartEstimatorExplanation,
  SmartEstimatorSnapshot,
  SmartEstimatorWorkResolution,
} from "./smartEstimatorTypes";
import { resolveSmartEstimatorCurrency } from "./smartEstimatorCurrencyResolver";

export function explainSmartEstimatorResult(input: {
  analysis: SmartEstimatorAnalyzedInput;
  workResolution: SmartEstimatorWorkResolution;
  snapshot?: SmartEstimatorSnapshot | null;
}): SmartEstimatorExplanation {
  const currency = resolveSmartEstimatorCurrency(input.analysis.region);
  const work = input.snapshot?.professional_snapshot.selected_work_key
    ? input.snapshot.professional_snapshot.selected_work_key.replace(/[_-]+/g, " ")
    : input.workResolution.visible_work_name_ru;
  return {
    user_visible_summary_ru: input.snapshot
      ? "Смета построена из единого immutable snapshot. Строки без проверенной цены не суммируются."
      : "Нужны уточнения до построения сметы.",
    work_ru: work,
    region: input.analysis.region,
    currency,
    price_policy_ru: "Только управляемый прайсбук. Если цены нет, возвращается PRICE_MISSING без подстановки нуля или случайной цены.",
    snapshot_policy_ru: "UI, PDF, request и history используют один и тот же snapshot hash.",
    fake_green_claimed: false,
  };
}
