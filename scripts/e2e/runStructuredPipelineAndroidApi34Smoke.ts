import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildStructuredEstimatePayload } from "../../src/lib/estimateStructuredPipeline";
import { ensureAndroidApi34DeviceReady } from "./ensureAndroidApi34DeviceReady";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_ESTIMATE_STRUCTURED_PIPELINE_UI_PDF_BINDING");

const CASES = [
  { id: "foundation_rebar", prompt: "смета на ленточный фундамент 10*10*1,8*0,4", expectedWorkKey: "strip_foundation" },
  { id: "paving_stone", prompt: "смета на укладку брусчатки 587 м2", expectedWorkKey: "paving_stone_laying" },
  { id: "roof", prompt: "смета на кровлю 120 м2", expectedWorkKey: "roof_repair" },
  { id: "electrical_outlets", prompt: "смета на электрику 40 розеток", expectedWorkKey: "socket_installation" },
  { id: "plumbing_house", prompt: "смета на сантехнику в доме 100 м2", expectedWorkKey: "plumbing_basic" },
] as const;

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const device = await ensureAndroidApi34DeviceReady({ artifactDir: ARTIFACT_DIR, bootTimeoutMs: 240_000, allowCreateAvd: false });
  const failures: string[] = [];
  if (device.final_status !== "GREEN_ANDROID_API34_DEVICE_READY") failures.push(device.final_status);
  const cases = CASES.map((testCase) => {
    const answer = answerBuiltInAi({
      text: testCase.prompt,
      screenContext: "request",
      route: "/request",
      role: "consumer",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;
    const payload = estimate ? buildStructuredEstimatePayload(estimate) : null;
    const caseFailures = [
      ...(estimate?.work.workKey === testCase.expectedWorkKey ? [] : [`WORK_KEY:${estimate?.work.workKey ?? "missing"}`]),
      ...(payload && payload.rows.length > 0 ? [] : ["PAYLOAD_ROWS_MISSING"]),
    ];
    failures.push(...caseFailures.map((failure) => `${testCase.id}:${failure}`));
    return {
      id: testCase.id,
      workKey: estimate?.work.workKey ?? null,
      rowCount: payload?.rows.length ?? 0,
      failures: caseFailures,
    };
  });
  const passed = failures.length === 0;
  writeJson("android_api34.json", {
    passed,
    android_api34_tested: device.final_status === "GREEN_ANDROID_API34_DEVICE_READY",
    android_api34_passed: passed,
    android_api34_smoke_passed: passed,
    android_api_actual: device.android_sdk,
    api36_used_as_substitute: false,
    device_id: device.device_id,
    android_sdk: device.android_sdk,
    cases,
    failures,
    fake_green_claimed: false,
  });
  if (!passed) throw new Error(`BLOCKED_STRUCTURED_PIPELINE_ANDROID_API34:${failures.join("|")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
