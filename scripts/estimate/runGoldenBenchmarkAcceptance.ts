import {
  GREEN_AI_ESTIMATE_GOLDEN_BENCHMARK_EXPERT_ACCEPTANCE_COMMITTED_NO_BUILDS,
  runGoldenBenchmarkAcceptance,
} from "./goldenBenchmarkCore";

export { runGoldenBenchmarkAcceptance } from "./goldenBenchmarkCore";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function envBoolean(name: string): boolean | undefined {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return undefined;
  return value === "1" || value === "true" || value === "yes" || value === "green";
}

if (require.main === module) {
  const summary = runGoldenBenchmarkAcceptance({
    cases: argValue("cases") === "critical" ? "critical" : "all",
    writeRuntime: hasFlag("write-runtime") || hasFlag("json"),
    createHumanReviewPack: hasFlag("human-review"),
    requireRuntimeSmoke: hasFlag("require-real-browser"),
    webSmokePassed: envBoolean("GOLDEN_BENCHMARK_WEB_SMOKE_PASSED"),
    androidChromeSmokePassed: envBoolean("GOLDEN_BENCHMARK_ANDROID_CHROME_SMOKE_PASSED"),
    sourceGate: {
      benchmark_tests_passed: envBoolean("GOLDEN_BENCHMARK_TESTS_PASSED"),
      typecheck_passed: envBoolean("GOLDEN_BENCHMARK_TYPECHECK_PASSED"),
      lint_passed: envBoolean("GOLDEN_BENCHMARK_LINT_PASSED"),
      diff_check_passed: envBoolean("GOLDEN_BENCHMARK_DIFF_CHECK_PASSED"),
      no_test_weakening_passed: envBoolean("GOLDEN_BENCHMARK_NO_TEST_WEAKENING_PASSED"),
      web_public_smoke_passed: envBoolean("GOLDEN_BENCHMARK_WEB_PUBLIC_SMOKE_PASSED"),
      ci_office_market_passed: envBoolean("GOLDEN_BENCHMARK_CI_OFFICE_MARKET_PASSED"),
      secret_scan_passed: envBoolean("GOLDEN_BENCHMARK_SECRET_SCAN_PASSED"),
    },
  });
  console.info(JSON.stringify(summary, null, 2));
  if (summary.final_status !== GREEN_AI_ESTIMATE_GOLDEN_BENCHMARK_EXPERT_ACCEPTANCE_COMMITTED_NO_BUILDS) {
    process.exitCode = 1;
  }
}
