import {
  compareEstimateToGoldenBenchmark,
  loadGoldenBenchmarkCases,
  loadGoldenBenchmarkTolerancePolicy,
} from "./goldenBenchmarkCore";

export {
  compareEstimateToGoldenBenchmark,
  compareGeneratedEstimateToGoldenBenchmark,
} from "./goldenBenchmarkCore";

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

if (require.main === module) {
  const caseId = argValue("case");
  const cases = loadGoldenBenchmarkCases();
  const target = caseId ? cases.find((item) => item.case_id === caseId) : cases[0];
  if (!target) throw new Error(`golden_benchmark_case_not_found:${caseId ?? "<first>"}`);
  const result = compareEstimateToGoldenBenchmark(target, loadGoldenBenchmarkTolerancePolicy());
  console.info(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}
