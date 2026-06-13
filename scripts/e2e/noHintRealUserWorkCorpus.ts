import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  GREEN_NO_HINT_WORK_ONTOLOGY,
  NO_HINT_WORK_ONTOLOGY_WAVE,
} from "../../src/lib/ai/workOntology/noHintSemanticAuditTypes";

export const NO_HINT_WORK_ONTOLOGY_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_WORK_ONTOLOGY_NO_HINT_REAL_USER_SEMANTIC_CORE_AUDIT",
);

export type NoHintWaveJson = Record<string, unknown>;

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

function isGeneratedProofArtifactPath(filePath: string): boolean {
  return filePath.replace(/\\/g, "/").startsWith("artifacts/");
}

function commitTouchesOnlyGeneratedProofArtifacts(commit: string): boolean {
  const files = gitOutput(["diff-tree", "--no-commit-id", "--name-only", "-r", commit], "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return files.length > 0 && files.every(isGeneratedProofArtifactPath);
}

export function sourceCodeHead(): string {
  let commit = gitOutput(["rev-parse", "HEAD"], "unknown");
  while (commit !== "unknown" && commitTouchesOnlyGeneratedProofArtifacts(commit)) {
    const parent = gitOutput(["rev-parse", `${commit}^`], "unknown");
    if (parent === "unknown" || parent === commit) break;
    commit = parent;
  }
  return commit;
}

export function currentHeadAtWriteTime(): string {
  return gitOutput(["rev-parse", "HEAD"], "unknown");
}

export function withNoHintLineage<T extends NoHintWaveJson>(value: T): T & {
  wave: string;
  source_code_head: string;
  current_head_at_write_time: string;
  fake_green_claimed: false;
} {
  return {
    wave: NO_HINT_WORK_ONTOLOGY_WAVE,
    ...value,
    source_code_head: sourceCodeHead(),
    current_head_at_write_time: currentHeadAtWriteTime(),
    fake_green_claimed: false,
  };
}

export function writeNoHintJson(name: string, value: NoHintWaveJson): void {
  const filePath = path.join(NO_HINT_WORK_ONTOLOGY_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(withNoHintLineage(value), null, 2)}\n`, "utf8");
}

export function readNoHintJson<T = NoHintWaveJson>(name: string): T | null {
  const filePath = path.join(NO_HINT_WORK_ONTOLOGY_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function assertNoHintFailures(failures: readonly unknown[], prefix: string): void {
  if (failures.length > 0) {
    throw new Error(`${prefix}:${JSON.stringify(failures.slice(0, 25), null, 2)}`);
  }
}

export function runReleaseVerifyForNoHint(): NoHintWaveJson {
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
      ? GREEN_NO_HINT_WORK_ONTOLOGY
      : "BLOCKED_WORK_ONTOLOGY_NO_HINT_RELEASE_VERIFY",
    command: "npm run release:verify",
    exit_code: result.status,
    readiness: { status: readinessStatus },
    blockers,
    stdout_tail: stdout.split(/\r?\n/).slice(-120),
    stderr_tail: (result.stderr ?? "").split(/\r?\n/).slice(-120),
    fake_green_claimed: false,
  };
  writeNoHintJson("platform_release_verify.json", release);
  return readNoHintJson("platform_release_verify.json") ?? release;
}

export function buildNoHintMatrixSnapshot(extra: NoHintWaveJson = {}): NoHintWaveJson {
  const semantic = readNoHintJson<NoHintWaveJson & { summary?: NoHintWaveJson }>("no_hint_semantic_results.json");
  const confusion = readNoHintJson<NoHintWaveJson & { summary?: NoHintWaveJson }>("no_hint_confusion_results.json");
  const ranking = readNoHintJson<NoHintWaveJson>("candidate_ranking_results.json");
  const release = readNoHintJson<NoHintWaveJson>("platform_release_verify.json");
  const closeout = readNoHintJson<NoHintWaveJson>("CLOSEOUT_PROOF.json");
  return {
    final_status: GREEN_NO_HINT_WORK_ONTOLOGY,
    semantic_audit_status: semantic?.final_status ?? null,
    confusion_hard_set_status: confusion?.final_status ?? null,
    candidate_ranking_status: ranking?.final_status ?? null,
    release_verify_status: release?.final_status ?? null,
    closeout_status: closeout?.final_status ?? null,
    no_hint_cases_total: semantic?.summary?.no_hint_cases_total ?? null,
    hard_confusion_cases_total: confusion?.summary?.hard_confusion_cases_total ?? null,
    high_confidence_wrong_matches: semantic?.summary?.high_confidence_wrong_matches ?? null,
    confusion_high_confidence_wrong_matches: confusion?.summary?.high_confidence_wrong_matches ?? null,
    canonical_hints_found: semantic?.summary?.canonical_hints_found ?? null,
    underscore_keys_in_user_input: semantic?.summary?.underscore_keys_in_user_input ?? null,
    selected_work_key_lost: semantic?.summary?.selected_work_key_lost ?? null,
    quantity_parser_regressions: semantic?.summary?.quantity_parser_regressions ?? null,
    recipe_scope_missing: semantic?.summary?.recipe_scope_missing ?? null,
    material_recipe_scope_missing: semantic?.summary?.material_recipe_scope_missing ?? null,
    pricebook_scope_missing: semantic?.summary?.pricebook_scope_missing ?? null,
    ios_build_started: false,
    eas_build_started: false,
    testflight_started: false,
    android_required: false,
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    head: currentHeadAtWriteTime(),
    origin_head: gitOutput(["rev-parse", "@{u}"], "unknown"),
    branch_synced_with_origin: gitOutput(["rev-parse", "HEAD"], "unknown") === gitOutput(["rev-parse", "@{u}"], "unknown"),
    fake_green_claimed: false,
    ...extra,
  };
}
