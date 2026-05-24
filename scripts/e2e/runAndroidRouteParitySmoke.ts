import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SOURCE_ARTIFACT = path.join(ARTIFACT_DIR, "S_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY_android_screenshots.json");
const TARGET_ARTIFACT = path.join(ARTIFACT_DIR, "S_AI_ROUTE_PARITY_android_transcripts.json");
const REQUIRED_FLOWS = [
  "android_request_carpet_100sqm",
  "android_foreman_asphalt_1000sqm",
  "android_chat_brick_masonry_74sqm",
];

function readJson(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runLiveAndroidSmoke(): void {
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const args =
    process.platform === "win32"
      ? ["/c", "npx", "tsx", "scripts/e2e/runAndroidLiveEstimateRealitySmoke.ts"]
      : ["tsx", "scripts/e2e/runAndroidLiveEstimateRealitySmoke.ts"];
  execFileSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env },
  });
}

function buildTargetArtifact(source: Record<string, unknown>, errorMessage?: string) {
  const cases = Array.isArray(source.cases) ? source.cases : [];
  const requiredCases = cases.filter((item) => {
    if (!item || typeof item !== "object") return false;
    return REQUIRED_FLOWS.includes(String((item as { id?: unknown }).id));
  });
  const androidTested = source.android_emulator_tested === true;
  const androidPassed =
    source.android_emulator_passed === true &&
    REQUIRED_FLOWS.every((id) =>
      requiredCases.some((item) => item && typeof item === "object" && String((item as { id?: unknown }).id) === id),
    );
  return {
    wave: "S_AI_ROUTE_PARITY_CHAT_FOREMAN_REQUEST_POINT_OF_NO_RETURN",
    final_status: androidPassed
      ? "GREEN_ANDROID_ROUTE_PARITY_SMOKE_READY"
      : androidTested
        ? "BLOCKED_ANDROID_EMULATOR_FAILED"
        : "BLOCKED_ANDROID_EMULATOR_NOT_RUN",
    android_emulator_tested: androidTested,
    android_emulator_passed: androidPassed,
    required_flows: REQUIRED_FLOWS,
    source_artifact: SOURCE_ARTIFACT,
    source_final_status: source.final_status ?? null,
    cases: requiredCases,
    error: errorMessage ?? null,
    fake_green_claimed: false,
  };
}

try {
  runLiveAndroidSmoke();
  const source = readJson(SOURCE_ARTIFACT);
  const target = buildTargetArtifact(source);
  writeJson(TARGET_ARTIFACT, target);
  if (target.android_emulator_passed !== true) {
    throw new Error(String(target.final_status));
  }
  console.log(target.final_status);
} catch (error) {
  const source = readJson(SOURCE_ARTIFACT);
  const target = buildTargetArtifact(source, error instanceof Error ? error.message : String(error));
  writeJson(TARGET_ARTIFACT, target);
  throw error;
}
