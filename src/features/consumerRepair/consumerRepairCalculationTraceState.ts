import type { ConsumerRepairRequestItem } from "../../lib/consumerRequests";

export function hasConsumerRepairCalculationTrace(item: ConsumerRepairRequestItem): boolean {
  return Boolean(
    item.quantityFormula
      || item.calculationTrace
      || item.normSourceTitle
      || item.normId
      || item.formulaId
      || item.templateVersion
      || item.sourceParameters,
  );
}
