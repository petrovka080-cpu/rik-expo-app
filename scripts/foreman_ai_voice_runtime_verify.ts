import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");
const fullOutPath = path.join(artifactDir, "foreman-ai-voice-runtime.json");
const summaryOutPath = path.join(artifactDir, "foreman-ai-voice-runtime.summary.json");

const runtimeSummaryPath = path.join(artifactDir, "foreman-request-sync-runtime.summary.json");
const battleSummaryPath = path.join(artifactDir, "foreman-ai-battle-hardening-wave1.summary.json");

const readJson = (targetPath: string): JsonRecord | null => {
  if (!fs.existsSync(targetPath)) return null;
  return JSON.parse(fs.readFileSync(targetPath, "utf8").replace(/^\uFEFF/, "")) as JsonRecord;
};

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8").replace(/^\uFEFF/, "");

const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const arrayIncludesText = (value: unknown, pattern: string) => JSON.stringify(value ?? []).includes(pattern);

async function main() {
  const packageJson = readJson(path.join(projectRoot, "package.json"));
  const appJson = readJson(path.join(projectRoot, "app.json"));
  const runtimeSummary = readJson(runtimeSummaryPath);
  const battleSummary = readJson(battleSummaryPath);

  const voiceHookSource = readText("src/screens/foreman/hooks/useForemanVoiceInput.ts");
  const modalSource = readText("src/screens/foreman/ForemanAiQuickModal.tsx");
  const runtimeScriptSource = readText("scripts/foreman_request_sync_runtime_verify.ts");

  const expoConfig = ((appJson?.expo as JsonRecord | undefined) ?? {}) as JsonRecord;
  const pluginConfig = expoConfig.plugins ?? [];
  const androidConfig = ((expoConfig.android as JsonRecord | undefined) ?? {}) as JsonRecord;
  const iosConfig = ((expoConfig.ios as JsonRecord | undefined) ?? {}) as JsonRecord;
  const iosInfoPlist = ((iosConfig.infoPlist as JsonRecord | undefined) ?? {}) as JsonRecord;

  const dependencyVersion = String(
    (((packageJson?.dependencies as JsonRecord | undefined) ?? {})["expo-speech-recognition"] as string | undefined) ?? "",
  ).trim();

  const checks = {
    dependencyInstalled: dependencyVersion.length > 0,
    pluginConfigured:
      arrayIncludesText(pluginConfig, "expo-speech-recognition")
      && arrayIncludesText(pluginConfig, "microphonePermission")
      && arrayIncludesText(pluginConfig, "speechRecognitionPermission"),
    androidPermissionsPresent: arrayIncludesText(androidConfig.permissions, "android.permission.RECORD_AUDIO"),
    iosPermissionsPresent:
      typeof iosInfoPlist.NSMicrophoneUsageDescription === "string"
      && String(iosInfoPlist.NSMicrophoneUsageDescription).trim().length > 0,
    hookHasVoiceStatuses:
      voiceHookSource.includes('"ready"')
      && voiceHookSource.includes('"listening"')
      && voiceHookSource.includes('"recognizing"')
      && voiceHookSource.includes('"denied"')
      && voiceHookSource.includes('"unsupported"')
      && voiceHookSource.includes('"failed"'),
    hookUsesNativeModule: voiceHookSource.includes('require("expo-speech-recognition")'),
    hookTelemetryPresent:
      voiceHookSource.includes("recordPlatformObservability")
      && voiceHookSource.includes('event: "voice_start_requested"')
      && voiceHookSource.includes('event: "voice_transcript_inserted"')
      && voiceHookSource.includes('event: "voice_permission_denied"')
      && voiceHookSource.includes('event: "voice_transcript_edited"')
      && voiceHookSource.includes('event: "voice_start_blocked"'),
    modalUsesVoiceHook: modalSource.includes("useForemanVoiceInput"),
    manualConfirmationSafe:
      modalSource.includes("Отправка остаётся ручной")
      && modalSource.includes("voice.isActive ? voice.stop : voice.start")
      && modalSource.includes('voice.status === "unsupported"')
      && !voiceHookSource.includes("onSubmit"),
    textFallbackVisible:
      voiceHookSource.includes('setStatus("unsupported")')
      && voiceHookSource.includes('setStatus("denied")')
      && voiceHookSource.includes('setStatus("failed")'),
    expoGoNotUsedAsProof:
      runtimeScriptSource.includes("--dev-client")
      && runtimeScriptSource.includes("buildAndroidDevClientDeepLink"),
    runtimeWebPassed: runtimeSummary?.webPassed === true,
    runtimeAndroidPassed: runtimeSummary?.androidPassed === true,
    runtimeIosHonest: runtimeSummary?.iosPassed === true || typeof runtimeSummary?.iosResidual === "string",
    battleVoiceGate: battleSummary?.voiceOptionalSafe === true,
  };

  const summary = {
    status:
      Object.values(checks).every(Boolean)
      ? "passed"
      : "failed",
    gate:
      Object.values(checks).every(Boolean)
      ? "GREEN"
      : "AMBER",
    dependencyInstalled: checks.dependencyInstalled,
    pluginConfigured: checks.pluginConfigured,
    permissionsConfigured: checks.androidPermissionsPresent && checks.iosPermissionsPresent,
    voiceTelemetryPresent: checks.hookTelemetryPresent,
    manualConfirmationSafe: checks.manualConfirmationSafe,
    textFallbackVisible: checks.textFallbackVisible,
    expoGoNotUsedAsProof: checks.expoGoNotUsedAsProof,
    webPassed: checks.runtimeWebPassed,
    androidPassed: checks.runtimeAndroidPassed,
    iosPassed: runtimeSummary?.iosPassed === true,
    iosResidual: runtimeSummary?.iosResidual ?? null,
    capabilityMatrix: {
      web: {
        supportedIfBrowserApiExists: voiceHookSource.includes("SpeechRecognition"),
        fallbackToText: checks.textFallbackVisible,
      },
      android: {
        devBuildConfigured: checks.pluginConfigured && checks.androidPermissionsPresent,
        runtimePassed: checks.runtimeAndroidPassed,
      },
      ios: {
        permissionConfigPresent: checks.pluginConfigured && checks.iosPermissionsPresent,
        runtimePassed: runtimeSummary?.iosPassed === true,
        residual: runtimeSummary?.iosResidual ?? null,
      },
    },
  };

  const full = {
    generatedAt: new Date().toISOString(),
    summary,
    checks,
    artifacts: {
      runtimeSummary: path.relative(projectRoot, runtimeSummaryPath),
      battleSummary: path.relative(projectRoot, battleSummaryPath),
    },
  };

  writeJson(fullOutPath, full);
  writeJson(summaryOutPath, summary);

  console.log(JSON.stringify(summary, null, 2));

  if (summary.status !== "passed" || summary.gate !== "GREEN") {
    process.exitCode = 1;
  }
}

void main();
