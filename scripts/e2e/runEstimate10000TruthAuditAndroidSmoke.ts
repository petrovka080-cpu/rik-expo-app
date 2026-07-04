import { runCapitalRenovation98ProductFlowAndroidSmoke } from "./runCapitalRenovation98ProductFlowAndroidSmoke";

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function normalizeCases(cases: string): "blackbox-critical" {
  if (cases === "critical" || cases === "blackbox-critical") return "blackbox-critical";
  throw new Error(`UNSUPPORTED_TRUTH_AUDIT_CASES:${cases}`);
}

export async function runEstimate10000TruthAuditAndroidSmoke(options: {
  cases?: "critical" | "blackbox-critical";
  target?: "android-chrome";
  requireRealBrowser?: boolean;
} = {}) {
  normalizeCases(options.cases ?? "critical");
  return runCapitalRenovation98ProductFlowAndroidSmoke({
    target: options.target ?? "android-chrome",
    requireRealBrowser: options.requireRealBrowser ?? true,
    writeBlackboxEvidence: true,
  });
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runEstimate10000TruthAuditAndroidSmoke.ts")) {
  void runEstimate10000TruthAuditAndroidSmoke({
    cases: normalizeCases(argValue("cases") ?? "critical"),
    target: "android-chrome",
    requireRealBrowser: process.argv.includes("--require-real-browser"),
  })
    .then((result) => {
      const blockers = Array.isArray(result.artifact.blockers) ? result.artifact.blockers : [];
      console.log(JSON.stringify({
        status: result.artifact.status,
        artifact: result.blackboxArtifactPath ?? result.artifactPath,
        product_artifact: result.artifactPath,
        blockers,
        actual_android_chrome_browser_smoke_passed: result.artifact.actual_android_chrome_browser_smoke_passed,
        actual_android_chrome_capital_renovation_98_smoke_passed: result.artifact.actual_android_chrome_capital_renovation_98_smoke_passed,
        android_smoke_checks_full_product_flow: result.artifact.android_smoke_checks_full_product_flow,
      }, null, 2));
      if (blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
