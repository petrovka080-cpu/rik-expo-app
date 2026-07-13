import {
  runWave2CExpandedBoqAndroidSmoke,
  type Wave2CAndroidSmokeSummary,
} from "./runWave2CExpandedBoqAndroidSmoke";
import { argValue, hasFlag } from "./renderStagingAcceptanceCore";

export async function runProfessional11610ExpandedBoqAndroidSmoke(options: {
  target?: "android-chrome";
  cases?: string;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string;
  writeSummary?: boolean;
} = {}): Promise<{ artifactPath: string; artifact: Wave2CAndroidSmokeSummary }> {
  return runWave2CExpandedBoqAndroidSmoke(options);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runProfessional11610ExpandedBoqAndroidSmoke.ts")) {
  void runProfessional11610ExpandedBoqAndroidSmoke({
    target: (argValue("target") ?? "android-chrome") as "android-chrome",
    cases: argValue("cases") ?? undefined,
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url") ?? undefined,
    writeSummary: !hasFlag("no-write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_android_emulator_wave2c_expanded_smoke_passed: result.artifact.actual_android_emulator_wave2c_expanded_smoke_passed,
        android_wave2c_cases_passed: result.artifact.android_wave2c_cases_passed,
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
