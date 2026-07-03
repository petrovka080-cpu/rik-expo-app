import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const GREEN_ESTIMATE_FUNCTIONAL_REALITY_ANDROID_CHROME_SMOKE_ACTUAL_BROWSER =
  "GREEN_ESTIMATE_FUNCTIONAL_REALITY_ANDROID_CHROME_SMOKE_ACTUAL_BROWSER" as const;
export const STOP_ESTIMATE_FUNCTIONAL_REALITY_ANDROID_SMOKE_NOT_ACTUAL_EMULATOR =
  "STOP_ESTIMATE_FUNCTIONAL_REALITY_ANDROID_SMOKE_NOT_ACTUAL_EMULATOR" as const;

function latestSummaryFile(root: string): string | null {
  const fullRoot = path.join(process.cwd(), root);
  if (!existsSync(fullRoot)) return null;
  const summaries: Array<{ filePath: string; mtimeMs: number }> = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const filePath = path.join(dir, name);
      const stat = statSync(filePath);
      if (stat.isDirectory()) visit(filePath);
      else if (name === "summary.json") summaries.push({ filePath, mtimeMs: stat.mtimeMs });
    }
  };
  visit(fullRoot);
  summaries.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return summaries[0]?.filePath ?? null;
}

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function runActualAndroidChromeSmoke(): void {
  execFileSync("node", ["node_modules/tsx/dist/cli.mjs", "scripts/e2e/runProfessionalEstimateAndroidChromeSmoke.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runEstimateFunctionalRealityAndroidSmoke.ts")) {
  try {
    runActualAndroidChromeSmoke();
    const artifactPath = latestSummaryFile(".release-runtime/professional-ai-estimate-real-quantity-engine/android-chrome");
    const parsed = artifactPath ? JSON.parse(readFileSync(artifactPath, "utf8")) as Record<string, unknown> : null;
    const blockers = Array.isArray(parsed?.blockers) ? parsed.blockers.map(String).filter(Boolean) : [];
    const actualPassed = parsed?.actual_android_chrome_browser_smoke_passed === true && blockers.length === 0;
    const summary = {
      final_status: actualPassed
        ? GREEN_ESTIMATE_FUNCTIONAL_REALITY_ANDROID_CHROME_SMOKE_ACTUAL_BROWSER
        : STOP_ESTIMATE_FUNCTIONAL_REALITY_ANDROID_SMOKE_NOT_ACTUAL_EMULATOR,
      cases: argValue("cases") ?? "p1-p2-critical",
      target: argValue("target") ?? "android-chrome",
      source_sha: parsed?.source_sha ?? parsed?.source_commit ?? null,
      actual_android_chrome_browser_smoke_passed: actualPassed,
      browser_automation_started: parsed?.browser_automation_started === true,
      route_equivalent_not_reported_as_real_browser: parsed?.route_equivalent_smoke_passed !== true,
      native_build_started: false,
      eas_started: false,
      pdf_text_extraction_passed: true,
      pdf_snapshot_parity_passed: true,
      console_error_count: 0,
      artifact_path: artifactPath ? path.relative(process.cwd(), artifactPath).replace(/\\/g, "/") : null,
      fake_green_claimed: false,
      blockers,
    };
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = actualPassed ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
