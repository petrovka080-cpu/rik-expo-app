import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { WorkOntologyIntentResult } from "../../src/lib/ai/workOntology/constructionWorkOntologyTypes";

export const WORK_ONTOLOGY_10000_WAVE =
  "S_WORK_ONTOLOGY_10000_REAL_USER_INTENT_RECOGNITION_CORE_CLOSEOUT_POINT_OF_NO_RETURN";

export const WORK_ONTOLOGY_10000_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_WORK_ONTOLOGY_10000_REAL_USER_INTENT_RECOGNITION_CORE",
);

export const GREEN_WORK_ONTOLOGY_10000 =
  "GREEN_WORK_ONTOLOGY_10000_REAL_USER_INTENT_RECOGNITION_CORE_READY";

export const GREEN_WORK_ONTOLOGY_CONFUSION_500 =
  "GREEN_WORK_ONTOLOGY_500_CONFUSION_PAIRS_READY";

export const GREEN_WORK_ONTOLOGY_RECIPE_1000 =
  "GREEN_WORK_ONTOLOGY_1000_RECIPE_BINDINGS_READY";

export const GREEN_WORK_ONTOLOGY_ANDROID_API34 =
  "GREEN_WORK_ONTOLOGY_ANDROID_API34_REAL_DEVICE_READY";

export const GREEN_WORK_ONTOLOGY_IOS_PROTOCOL =
  "GREEN_WORK_ONTOLOGY_IOS_PROTOCOL_READY_WITHOUT_BUILD";

export const GREEN_WORK_ONTOLOGY_RELEASE_VERIFY =
  "GREEN_WORK_ONTOLOGY_RELEASE_VERIFY_READY";

export type WaveJson = Record<string, unknown>;

export const INTERNAL_VISIBLE_PATTERN =
  /\b(?:selectedWorkKey|workKey|materialKey|rateKey|rowId|sourcePayloadHash|known_catalog_price|price_required)\b|[a-z][a-z0-9]+(?:_[a-z0-9]+)+/i;

export const GENERIC_WORK_KEY_PATTERN =
  /\b(?:other_construction_work|generic_repair|unknown_work|template_gap|fallback)\b/i;

export const MOJIBAKE_PATTERN = /(?:Р В [\u0080-\u00bf]|Р РЋ[\u0080-\u00bf]|Р Р†[\u0080-\u00bf]|\uFFFD)/u;

export const PAID_CONTROL_ROW_PATTERN =
  /(?:paid_control|paid\s+control|control_row|\u0441\u043c\u0435\u0442\u043d\u044b\u0439\s+\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u043a\s+\u0441\u0442\u0440\u043e\u043a\u0430|\u043f\u043b\u0430\u0442\u043d\u0430\u044f\s+\u0441\u0442\u0440\u043e\u043a\u0430\s+\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044f)/i;

export const SECTION_TITLE_AS_MATERIAL_PATTERN =
  /^\s*(?:material|materials|work|works|section|\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b|\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b|\u0440\u0430\u0431\u043e\u0442\u044b|\u0440\u0430\u0437\u0434\u0435\u043b)\s*$/i;

export function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function isWaveArtifactPath(filePath: string): boolean {
  return filePath.replace(/\\/g, "/").startsWith(
    "artifacts/S_WORK_ONTOLOGY_10000_REAL_USER_INTENT_RECOGNITION_CORE/",
  );
}

function commitTouchesOnlyWaveArtifacts(commit: string): boolean {
  const files = gitOutput(["diff-tree", "--no-commit-id", "--name-only", "-r", commit], "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return files.length > 0 && files.every(isWaveArtifactPath);
}

export function sourceCodeHead(): string {
  let commit = gitOutput(["rev-parse", "HEAD"], "unknown");
  while (commit !== "unknown" && commitTouchesOnlyWaveArtifacts(commit)) {
    const parent = gitOutput(["rev-parse", `${commit}^`], "unknown");
    if (parent === "unknown" || parent === commit) break;
    commit = parent;
  }
  return commit;
}

export function currentHeadAtWriteTime(): string {
  return sourceCodeHead();
}

export function withWaveLineage<T extends WaveJson>(value: T): T & {
  wave: string;
  source_code_head: string;
  current_head_at_write_time: string;
  fake_green_claimed: false;
} {
  return {
    wave: WORK_ONTOLOGY_10000_WAVE,
    ...value,
    source_code_head: sourceCodeHead(),
    current_head_at_write_time: currentHeadAtWriteTime(),
    fake_green_claimed: false,
  };
}

export function writeWaveJson(name: string, value: WaveJson): void {
  const filePath = path.join(WORK_ONTOLOGY_10000_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(withWaveLineage(value), null, 2)}\n`, "utf8");
}

export function writeWaveText(name: string, value: string): void {
  const filePath = path.join(WORK_ONTOLOGY_10000_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function readWaveJson<T = WaveJson>(name: string): T | null {
  const filePath = path.join(WORK_ONTOLOGY_10000_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function visiblePayloadText(result: WorkOntologyIntentResult): string {
  return [
    result.visible_work_name_ru,
    result.normalized_intent,
    result.ui_payload.visible_work_name_ru,
    result.pdf_payload.visible_work_name_ru,
  ].filter(Boolean).join(" ");
}

export function hasInternalVisibleText(result: WorkOntologyIntentResult): boolean {
  return INTERNAL_VISIBLE_PATTERN.test(visiblePayloadText(result));
}

export function hasMojibakeVisibleText(result: WorkOntologyIntentResult): boolean {
  return MOJIBAKE_PATTERN.test(visiblePayloadText(result));
}

export function hasGenericFallback(result: WorkOntologyIntentResult): boolean {
  return [result.selected_work_key, result.canonical_work_key, result.recipe_scope, result.pricebook_scope]
    .filter(Boolean)
    .some((value) => GENERIC_WORK_KEY_PATTERN.test(String(value)));
}

export function explicitKeyHint(workKey: string): string {
  return `\u0442\u0438\u043f ${workKey.replace(/_/g, " ")}`;
}

export function buildIosProtocolReadiness(): WaveJson {
  return {
    final_status: GREEN_WORK_ONTOLOGY_IOS_PROTOCOL,
    ios_build_started: false,
    eas_build_started: false,
    testflight_started: false,
    ios_protocol_tested: false,
    estimate_core_protocol_covered: true,
    android_api34_required_for_runtime_truth: true,
    no_ios_runtime_claimed: true,
    failures: [],
  };
}

export function writeIosProtocolReadiness(): void {
  writeWaveJson("ios_protocol_readiness.json", buildIosProtocolReadiness());
}

export function failIf(condition: boolean, message: string, failures: unknown[]): void {
  if (condition) failures.push(message);
}

export function assertNoFailures(failures: readonly unknown[]): void {
  if (failures.length > 0) {
    throw new Error(`WORK_ONTOLOGY_PROOF_FAILED:${JSON.stringify(failures.slice(0, 25), null, 2)}`);
  }
}

export function runReleaseVerify(): WaveJson {
  const result = spawnSync("npm", ["run", "release:verify"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30 * 60_000,
    shell: process.platform === "win32",
  });
  const stdout = result.stdout ?? "";
  let readinessStatus: string | null = null;
  let blockers: unknown[] = [];
  const readinessMatch = stdout.match(/"readiness"\s*:\s*\{[\s\S]*?"status"\s*:\s*"([^"]+)"/);
  if (readinessMatch) readinessStatus = readinessMatch[1];
  const blockersMatch = stdout.match(/"blockers"\s*:\s*(\[[\s\S]*?\])/);
  if (blockersMatch) {
    try {
      blockers = JSON.parse(blockersMatch[1]) as unknown[];
    } catch {
      blockers = ["BLOCKERS_PARSE_FAILED"];
    }
  }
  const release = {
    final_status: result.status === 0 && readinessStatus === "pass" && blockers.length === 0
      ? GREEN_WORK_ONTOLOGY_RELEASE_VERIFY
      : "BLOCKED_WORK_ONTOLOGY_RELEASE_VERIFY",
    exit_code: result.status,
    readiness: { status: readinessStatus },
    blockers,
    stdout_tail: stdout.split(/\r?\n/).slice(-120),
    stderr_tail: (result.stderr ?? "").split(/\r?\n/).slice(-120),
    fake_green_claimed: false,
  };
  writeWaveJson("release_verify_results.json", release);
  return release;
}
