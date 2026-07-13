import {
  runWave2CExpandedBoqWebSmoke,
  type Wave2CWebSmokeSummary,
} from "./runWave2CExpandedBoqWebSmoke";
import { argValue, hasFlag } from "./renderStagingAcceptanceCore";

export async function runProfessional11610ExpandedBoqWebSmoke(options: {
  target?: "web";
  cases?: string;
  requireRealBrowser?: boolean;
  baseUrl?: string;
  writeSummary?: boolean;
} = {}): Promise<{ artifactPath: string; artifact: Wave2CWebSmokeSummary }> {
  return runWave2CExpandedBoqWebSmoke(options);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runProfessional11610ExpandedBoqWebSmoke.ts")) {
  void runProfessional11610ExpandedBoqWebSmoke({
    target: (argValue("target") ?? "web") as "web",
    cases: argValue("cases") ?? undefined,
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url") ?? undefined,
    writeSummary: !hasFlag("no-write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_web_browser_wave2c_expanded_smoke_passed: result.artifact.actual_web_browser_wave2c_expanded_smoke_passed,
        web_wave2c_cases_passed: result.artifact.web_wave2c_cases_passed,
        base_url: result.artifact.base_url,
        blockers: result.artifact.blockers.slice(0, 20),
        artifact: result.artifactPath,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
