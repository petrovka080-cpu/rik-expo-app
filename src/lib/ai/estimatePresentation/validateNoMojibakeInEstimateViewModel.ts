import type { EstimatePresentationViewModel } from "./estimatePresentationTypes";

const MOJIBAKE_MARKERS = [/РЎ/, /Рџ/, /Р°/, /Рµ/, /РЅ/, /Ð/, /Ñ/, /�/];

export function validateNoMojibakeInEstimateViewModel(viewModel: EstimatePresentationViewModel): { passed: boolean; failures: string[] } {
  const text = [
    viewModel.workTitle,
    ...viewModel.rows.map((row) => row.name),
    ...viewModel.sourceLabels,
    viewModel.tax.taxLabel,
    viewModel.tax.warning,
  ].filter(Boolean).join("\n");
  const failures = MOJIBAKE_MARKERS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => `mojibake_marker:${pattern.source}`);
  return { passed: failures.length === 0, failures };
}
