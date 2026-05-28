import type { EstimatePresentationViewModel } from "./estimatePresentationTypes";
import type { GlobalEstimateResult } from "../globalEstimate/globalEstimateTypes";

export function assertUiRowsMatchGlobalEstimate(
  result: GlobalEstimateResult,
  viewModel: Pick<EstimatePresentationViewModel, "rows">,
): void {
  const estimateRows = result.sections.flatMap((section) => section.rows);
  const uiCodes = viewModel.rows.map((row) => row.code);
  const missing = estimateRows.filter((row) => !uiCodes.includes(row.code));
  if (missing.length > 0 || estimateRows.length !== viewModel.rows.length) {
    throw new Error(`UI_ROWS_DO_NOT_MATCH_GLOBAL_ESTIMATE:${missing.map((row) => row.code).join(",")}`);
  }
}
