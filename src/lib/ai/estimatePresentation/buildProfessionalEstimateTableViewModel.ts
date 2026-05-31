import { buildEstimatePresentationViewModel } from "./buildEstimatePresentationViewModel";
import type { EstimatePresentationViewModel } from "./estimatePresentationTypes";
import type { GlobalEstimateResult } from "../globalEstimate/globalEstimateTypes";

export const PROFESSIONAL_ESTIMATE_TABLE_COLUMNS = [
  "№",
  "Раздел",
  "Позиция",
  "Ед. изм.",
  "Кол-во",
  "Цена за ед.",
  "Сумма",
  "Источник / уверенность",
  "Комментарий",
] as const;

export type ProfessionalEstimateTableViewModel = EstimatePresentationViewModel & {
  columns: typeof PROFESSIONAL_ESTIMATE_TABLE_COLUMNS;
  requiredBlocks: {
    localContext: string;
    assumptions: string[];
    notIncluded: string[];
    costIncreaseFactors: string[];
    clarifyingQuestions: string[];
    taxWarning: string;
  };
};

export function buildProfessionalEstimateTableViewModel(result: GlobalEstimateResult): ProfessionalEstimateTableViewModel {
  const viewModel = buildEstimatePresentationViewModel(result);
  return {
    ...viewModel,
    columns: PROFESSIONAL_ESTIMATE_TABLE_COLUMNS,
    requiredBlocks: {
      localContext: viewModel.localContext.displayLine,
      assumptions: viewModel.assumptions,
      notIncluded: result.regionalRisks.map((risk) => risk.text),
      costIncreaseFactors: viewModel.costIncreaseFactors,
      clarifyingQuestions: viewModel.clarifyingQuestions,
      taxWarning: viewModel.tax.warning ?? `${viewModel.tax.taxLabel}: ${viewModel.tax.included ? "включен" : "проверьте начисление"}`,
    },
  };
}
