import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi, type BuiltInAiScreenContext } from "../../src/lib/ai/builtInAi";
import {
  BUILT_IN_AI_50000_FULL_CASES,
  BUILT_IN_AI_50000_PHASE4_WAVE,
  buildBuiltInAi50000Phase4CanaryPlan,
  validateBuiltInAi50000RuntimeResult,
} from "../../src/lib/ai/builtInAi50000";
import type { BuiltInAi50000Case, BuiltInAi50000Phase3SampleItem } from "../../src/lib/ai/builtInAi50000";
import { writeAllScreensEnterpriseArtifacts } from "./allScreensEnterpriseRuntimeAcceptance.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function caseById(caseId: string): BuiltInAi50000Case {
  const testCase = BUILT_IN_AI_50000_FULL_CASES.find((item) => item.id === caseId);
  if (!testCase) throw new Error(`Missing Phase 4 Android canary case: ${caseId}`);
  return testCase;
}

function runtimeContext(item: BuiltInAi50000Phase3SampleItem): {
  route: string;
  screenContext: BuiltInAiScreenContext;
  role: string;
} {
  if (item.route === "/product/search") return { route: item.route, screenContext: "marketplace", role: "buyer" };
  if (item.route === "/ai?context=foreman") return { route: item.route, screenContext: "foreman", role: "foreman" };
  if (item.route === "/request") return { route: item.route, screenContext: "request", role: "consumer" };
  return { route: item.route === "/pdf-viewer" ? "/chat" : item.route, screenContext: "chat", role: "foreman" };
}

function validateItems(items: readonly BuiltInAi50000Phase3SampleItem[], userId: string) {
  return items.map((item) => {
    const route = runtimeContext(item);
    const answer = answerBuiltInAi({
      text: item.prompt,
      route: route.route,
      screenContext: route.screenContext,
      role: route.role,
      userId,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    return {
      ...validateBuiltInAi50000RuntimeResult(caseById(item.caseId), answer),
      route: item.route,
      prompt: item.prompt,
      runtimeTrace: answer.runtimeTrace,
    };
  });
}

export async function runAndroidAi50000Phase4CanarySmoke() {
  const plan = buildBuiltInAi50000Phase4CanaryPlan();
  const androidProbe = await writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
  const transcripts = validateItems(plan.androidCanaryCases, "built-in-ai-50000-phase4-android-canary");
  const pdfTranscripts = validateItems(plan.pdfCanaryCases.slice(0, 10), "built-in-ai-50000-phase4-android-pdf");
  const dangerousTranscripts = validateItems(plan.dangerousCanaryCases.slice(0, 10), "built-in-ai-50000-phase4-android-dangerous");
  const failures = [...transcripts, ...pdfTranscripts, ...dangerousTranscripts].filter((trace) => !trace.passed);
  const androidPassed =
    androidProbe.matrix.android_emulator_proof_passed === true &&
    failures.length === 0 &&
    transcripts.length === 50 &&
    plan.productionRolloutEnabled === false;

  const artifact = {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    final_status: androidPassed
      ? "GREEN_AI_ESTIMATE_50000_PHASE4_ANDROID_CANARY_SMOKE_READY"
      : "BLOCKED_ANDROID_CANARY_SMOKE_FAILED",
    android_emulator_passed: androidPassed,
    android_canary_cases_total: transcripts.length,
    android_canary_cases_passed: transcripts.length - transcripts.filter((trace) => !trace.passed).length,
    pdf_viewer_android_passed: pdfTranscripts.every((trace) => trace.passed),
    dangerous_android_passed: dangerousTranscripts.every((trace) => trace.passed && !trace.dangerousDiyInstructionsFound),
    production_rollout_enabled: plan.productionRolloutEnabled,
    canary_initial_state: plan.canaryInitialState,
    all_screens_android_matrix_path: "artifacts/S_ALL_SCREENS_matrix.json",
    ui_dump_collected: androidProbe.android.ui_dump_collected,
    ui_text_sample: androidProbe.android.ui_text_sample,
    transcripts,
    pdfTranscripts,
    dangerousTranscripts,
    failures,
    fake_green_claimed: false,
  };
  writeJson("S_AI_ESTIMATE_50000_PHASE4_android_smoke.json", artifact);
  return { androidPassed, failures };
}

if (require.main === module) {
  runAndroidAi50000Phase4CanarySmoke()
    .then((result) => {
      console.log(result.androidPassed ? "GREEN_AI_ESTIMATE_50000_PHASE4_ANDROID_CANARY_SMOKE_READY" : "BLOCKED_ANDROID_CANARY_SMOKE_FAILED");
      if (!result.androidPassed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
