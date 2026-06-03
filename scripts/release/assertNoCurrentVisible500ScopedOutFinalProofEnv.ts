export const CURRENT_VISIBLE500_FORBIDDEN_SCOPED_OUT_ENV = [
  "REAL500_API34_SCOPED_OUT_FOR_DIRTY_SCOPE_ISOLATION",
  "VISIBLE500_SCOPED_OUT",
  "API34_SCOPED_OUT",
  "ANDROID_SCOPED_OUT",
  "RELEASE_VERIFY_SCOPED_OUT",
  "FULL_JEST_SCOPED_OUT",
  "PDF_SCOPED_OUT",
  "WEB_E2E_SCOPED_OUT",
] as const;

export type CurrentVisible500ScopedOutEnvName =
  (typeof CURRENT_VISIBLE500_FORBIDDEN_SCOPED_OUT_ENV)[number];

export type CurrentVisible500ScopedOutEnvReport = {
  scoped_out_env_detected: boolean;
  detected_env_names: CurrentVisible500ScopedOutEnvName[];
  real500_api34_scoped_out: boolean;
  api34_scoped_out: boolean;
  full_jest_scoped_out: boolean;
  release_verify_scoped_out: boolean;
  fake_green_claimed: false;
};

type EnvLike = Record<string, string | undefined>;

export function detectCurrentVisible500ScopedOutFinalProofEnv(
  env: EnvLike = process.env,
): CurrentVisible500ScopedOutEnvReport {
  const detectedEnvNames = CURRENT_VISIBLE500_FORBIDDEN_SCOPED_OUT_ENV.filter((name) => {
    const value = env[name];
    return typeof value === "string" && value.trim().length > 0 && value !== "0" && value.toLowerCase() !== "false";
  });

  return {
    scoped_out_env_detected: detectedEnvNames.length > 0,
    detected_env_names: detectedEnvNames,
    real500_api34_scoped_out: detectedEnvNames.includes("REAL500_API34_SCOPED_OUT_FOR_DIRTY_SCOPE_ISOLATION"),
    api34_scoped_out:
      detectedEnvNames.includes("API34_SCOPED_OUT") ||
      detectedEnvNames.includes("ANDROID_SCOPED_OUT") ||
      detectedEnvNames.includes("REAL500_API34_SCOPED_OUT_FOR_DIRTY_SCOPE_ISOLATION"),
    full_jest_scoped_out: detectedEnvNames.includes("FULL_JEST_SCOPED_OUT"),
    release_verify_scoped_out: detectedEnvNames.includes("RELEASE_VERIFY_SCOPED_OUT"),
    fake_green_claimed: false,
  };
}

export function assertNoCurrentVisible500ScopedOutFinalProofEnv(
  env: EnvLike = process.env,
): CurrentVisible500ScopedOutEnvReport {
  const report = detectCurrentVisible500ScopedOutFinalProofEnv(env);
  if (report.scoped_out_env_detected) {
    throw new Error(
      `BLOCKED_SCOPED_OUT_ENV_USED_IN_FINAL_CLOSEOUT: ${report.detected_env_names.join(", ")}`,
    );
  }
  return report;
}

if (require.main === module) {
  try {
    const report = assertNoCurrentVisible500ScopedOutFinalProofEnv();
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}
