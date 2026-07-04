import { runCapitalRenovation98ProductFlowWebSmoke } from "./runCapitalRenovation98ProductFlowWebSmoke";

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

export async function runEstimate10000TruthAuditWebSmoke(options: {
  cases?: "critical" | "blackbox-critical";
  target?: "web";
  requireRealBrowser?: boolean;
} = {}) {
  normalizeCases(options.cases ?? "critical");
  return runCapitalRenovation98ProductFlowWebSmoke({
    target: options.target ?? "web",
    requireRealBrowser: options.requireRealBrowser ?? true,
    writeBlackboxEvidence: true,
  });
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runEstimate10000TruthAuditWebSmoke.ts")) {
  void runEstimate10000TruthAuditWebSmoke({
    cases: normalizeCases(argValue("cases") ?? "critical"),
    target: "web",
    requireRealBrowser: process.argv.includes("--require-real-browser"),
  })
    .then((result) => {
      const blockers = Array.isArray(result.artifact.blockers) ? result.artifact.blockers : [];
      console.log(JSON.stringify({
        status: result.artifact.status,
        artifact: result.blackboxArtifactPath ?? result.artifactPath,
        product_artifact: result.artifactPath,
        blockers,
        actual_web_browser_smoke_passed: result.artifact.actual_web_browser_smoke_passed,
        actual_web_browser_capital_renovation_98_smoke_passed: result.artifact.actual_web_browser_capital_renovation_98_smoke_passed,
        web_smoke_checks_full_product_flow: result.artifact.web_smoke_checks_full_product_flow,
        console_error_count: result.artifact.console_error_count,
      }, null, 2));
      if (blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
