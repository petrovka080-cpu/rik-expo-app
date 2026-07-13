import { createHash } from "node:crypto";
import path from "node:path";

import {
  CONTROLLED_PILOT_RUNTIME_ROOT,
  gitOutput,
  loadControlledPilotScenarios,
  timestampForPath,
  writeJson,
  type ControlledPilotScenario,
} from "./buildControlledPilotHealthDashboard";

const SUPPORT_ROOT = path.join(CONTROLLED_PILOT_RUNTIME_ROOT, "support-package");

type ControlledPilotFailurePackageInput = {
  scenario: ControlledPilotScenario;
  target: "web" | "android-chrome";
  browserSessionId: string;
  androidDeviceId?: string | null;
  failureReason: string;
  consoleLogs?: string[];
  parserResult?: unknown;
  draftState?: unknown;
  snapshotState?: unknown;
  pdfText?: string | null;
  buyerHandoffJson?: unknown;
  telemetryEvents?: unknown[];
};

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function redactControlledPilotSupportString(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-token]")
    .replace(/service[_-]?role[_-]?key\s*[:=]\s*["']?[A-Za-z0-9._-]+["']?/gi, "service_role_key=[redacted]")
    .replace(/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?[A-Za-z0-9._-]+["']?/gi, "SUPABASE_SERVICE_ROLE_KEY=[redacted]")
    .replace(/ANTHROPIC_API_KEY\s*[:=]\s*["']?[A-Za-z0-9._-]+["']?/gi, "ANTHROPIC_API_KEY=[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]")
    .replace(/(?:улица|ул\.|проспект|пр-т|дом|квартира|адрес|street|avenue|apt)[^,"\n]*/gi, "[redacted-address]");
}

export function redactControlledPilotSupportValue<T>(value: T): T {
  if (typeof value === "string") return redactControlledPilotSupportString(value) as T;
  if (Array.isArray(value)) return value.map((item) => redactControlledPilotSupportValue(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, redactControlledPilotSupportValue(nested)]),
    ) as T;
  }
  return value;
}

export function buildControlledPilotFailureSupportPackage(input: ControlledPilotFailurePackageInput) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  return redactControlledPilotSupportValue({
    support_package_schema: "ai-estimate-controlled-pilot-failure-support-package-v1",
    support_package_id: `controlled_pilot_${hash(`${input.scenario.case_id}:${input.target}:${input.failureReason}`).slice(0, 16)}`,
    case_id: input.scenario.case_id,
    prompt: input.scenario.prompt,
    target: input.target,
    source_sha: sourceSha,
    browser_session_id: input.browserSessionId,
    android_device_id: input.androidDeviceId ?? null,
    screenshot_before: `screenshots/${input.scenario.case_id}-${input.target}-before.png`,
    screenshot_after: `screenshots/${input.scenario.case_id}-${input.target}-after.png`,
    console_logs: input.consoleLogs ?? [],
    parser_result: input.parserResult ?? null,
    draft_state: input.draftState ?? null,
    snapshot_state: input.snapshotState ?? null,
    pdf_text: input.pdfText ?? null,
    buyer_handoff_json: input.buyerHandoffJson ?? null,
    telemetry_events: input.telemetryEvents ?? [],
    failure_reason: input.failureReason,
    redacted_context: {
      raw_private_user_data_included: false,
      env_included: false,
      tokens_included: false,
      service_role_keys_included: false,
      prompt_hash: hash(input.scenario.prompt),
    },
  });
}

export function runControlledPilotSupportPackageDryRun() {
  const scenarios = loadControlledPilotScenarios();
  const scenario = scenarios[0];
  if (!scenario) throw new Error("controlled_pilot_scenarios_missing");
  const webPackage = buildControlledPilotFailureSupportPackage({
    scenario,
    target: "web",
    browserSessionId: "web-session-redacted",
    failureReason: "synthetic_dry_run_positions_empty_after_prompt",
    consoleLogs: ["console error from user@example.com and +996700000000 is redacted"],
    parserResult: { prompt: scenario.prompt, contact: "+996700000000", email: "user@example.com" },
    draftState: { row_count: 0 },
    snapshotState: null,
    pdfText: "PDF text sample with address: улица Test 10",
    buyerHandoffJson: { items: [] },
    telemetryEvents: [{ payload: { token: "sk-testtoken", serviceRoleKey: "service_role_key=abc" } }],
  });
  const androidPackage = buildControlledPilotFailureSupportPackage({
    scenario,
    target: "android-chrome",
    browserSessionId: "android-cdp-session-redacted",
    androidDeviceId: "emulator-5554",
    failureReason: "synthetic_dry_run_android_chrome_missing_pdf",
    consoleLogs: ["android chrome console log"],
    parserResult: { prompt: scenario.prompt },
    draftState: { row_count: 1 },
    snapshotState: { snapshot_id: "snapshot-redacted" },
    pdfText: null,
    buyerHandoffJson: { items: [] },
    telemetryEvents: [],
  });
  const serialized = JSON.stringify({ webPackage, androidPackage });
  const blockers = [
    serialized.includes("+996700000000") ? "phone_not_redacted" : "",
    serialized.includes("user@example.com") ? "email_not_redacted" : "",
    serialized.includes("sk-testtoken") ? "token_not_redacted" : "",
    serialized.includes("service_role_key=abc") ? "service_role_key_not_redacted" : "",
    /улица Test 10/i.test(serialized) ? "address_not_redacted" : "",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_SUPPORT_PACKAGE"
      : "STOP_AI_ESTIMATE_CONTROLLED_PILOT_SUPPORT_PACKAGE_FAILED",
    controlled_pilot_support_package_created: true,
    web_failure_support_package_created: true,
    android_failure_support_package_created: true,
    support_package_redacts_private_data: blockers.length === 0,
    support_package_secret_scan_passed: blockers.length === 0,
    packages: [webPackage, androidPackage],
    blockers,
  };
  const outPath = path.join(SUPPORT_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  return { summary, outPath };
}

if (require.main === module) {
  const { summary, outPath } = runControlledPilotSupportPackageDryRun();
  console.log(JSON.stringify({
    final_status: summary.final_status,
    blockers: summary.blockers,
    artifact: outPath,
  }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
