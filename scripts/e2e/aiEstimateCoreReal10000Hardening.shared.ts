import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const AI_ESTIMATE_CORE_REAL_10000_WAVE =
  "S_AI_ESTIMATE_CORE_REAL_10000_WORK_READING_EXACT_BOQ_HARDENING_CLOSEOUT_POINT_OF_NO_RETURN";

export const AI_ESTIMATE_CORE_REAL_10000_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_AI_ESTIMATE_CORE_REAL_10000_WORK_READING_EXACT_BOQ_HARDENING",
);

export const AI_ESTIMATE_CORE_REAL_10000_GREEN =
  "GREEN_AI_ESTIMATE_CORE_REAL_10000_WORK_READING_EXACT_BOQ_READY";

export const AI_ESTIMATE_CORE_BACKEND_GREEN =
  "GREEN_AI_ESTIMATE_CORE_REAL_10000_WORK_READING_BACKEND_ACCEPTANCE_READY";

export type WaveJson = Record<string, unknown>;

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
  return filePath.replace(/\\/g, "/").startsWith("artifacts/S_AI_ESTIMATE_CORE_REAL_10000_WORK_READING_EXACT_BOQ_HARDENING/");
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
    wave: AI_ESTIMATE_CORE_REAL_10000_WAVE,
    ...value,
    source_code_head: sourceCodeHead(),
    current_head_at_write_time: currentHeadAtWriteTime(),
    fake_green_claimed: false,
  };
}

export function writeWaveJson(name: string, value: WaveJson): void {
  const filePath = path.join(AI_ESTIMATE_CORE_REAL_10000_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(withWaveLineage(value), null, 2)}\n`, "utf8");
}

export function readWaveJson<T = WaveJson>(name: string): T | null {
  const filePath = path.join(AI_ESTIMATE_CORE_REAL_10000_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function writeWaveText(name: string, value: string): void {
  const filePath = path.join(AI_ESTIMATE_CORE_REAL_10000_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export const REAL_WORK_READING_SMOKE_CASES = [
  {
    id: "roof_waterproofing_area",
    text: "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u044b\u0448\u0438 120 \u043c2",
    expectedUnit: "sq_m",
    expectedQuantity: 120,
    forbiddenWorkKey: "other_construction_work",
  },
  {
    id: "foundation_concrete_volume",
    text: "\u0437\u0430\u043b\u0438\u0432\u043a\u0430 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442\u0430 30 \u043c3",
    expectedUnit: "m3",
    expectedQuantity: 30,
    forbiddenWorkKey: "other_construction_work",
  },
  {
    id: "wall_plastering_area",
    text: "\u0448\u0442\u0443\u043a\u0430\u0442\u0443\u0440\u043a\u0430 \u0441\u0442\u0435\u043d 85 \u043c2",
    expectedUnit: "sq_m",
    expectedQuantity: 85,
    forbiddenWorkKey: "other_construction_work",
  },
  {
    id: "electrical_apartment_area",
    text: "\u044d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0430 \u0432 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u0435 75 \u043c2",
    expectedUnit: "sq_m",
    expectedQuantity: 75,
    forbiddenWorkKey: "other_construction_work",
  },
  {
    id: "water_supply_bathroom_set",
    text: "\u0432\u043e\u0434\u043e\u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0438\u0435 \u0441\u0430\u043d\u0443\u0437\u043b\u0430 1 \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442",
    expectedUnit: "set",
    expectedQuantity: 1,
    forbiddenWorkKey: "other_construction_work",
  },
] as const;

export const QUANTITY_EDGE_CASES = [
  { text: "120 \u043c2", quantity: 120, unit: "sq_m" },
  { text: "120\u043c2", quantity: 120, unit: "sq_m" },
  { text: "120 \u043a\u0432.\u043c", quantity: 120, unit: "sq_m" },
  { text: "120 \u043a\u0432\u0430\u0434\u0440\u0430\u0442\u043e\u0432", quantity: 120, unit: "sq_m" },
  { text: "30 \u043c3", quantity: 30, unit: "m3" },
  { text: "30 \u043a\u0443\u0431\u043e\u0432", quantity: 30, unit: "m3" },
  { text: "18 \u043f\u043e\u0433.\u043c", quantity: 18, unit: "linear_m" },
  { text: "18 \u043f.\u043c", quantity: 18, unit: "linear_m" },
  { text: "1 \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442", quantity: 1, unit: "set" },
  { text: "2 \u0442\u043e\u0447\u043a\u0438", quantity: 2, unit: "pcs" },
  { text: "15 \u0448\u0442", quantity: 15, unit: "pcs" },
  { text: "5 \u0442\u043e\u043d\u043d", quantity: 5, unit: "ton" },
] as const;

export const INTERNAL_VISIBLE_PATTERN =
  /\b(?:selectedWorkKey|workKey|materialKey|rateKey|rowId|sourcePayloadHash|known_catalog_price|price_required)\b|[a-z][a-z0-9]+(?:_[a-z0-9]+)+/i;

export const WEAK_GENERIC_ROW_PATTERN =
  /^\s*(?:material|materials|work|works|other|generic|\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b|\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b|\u0440\u0430\u0431\u043e\u0442\u044b|\u043f\u0440\u043e\u0447\u0435\u0435)\s*$/i;

export const PAID_CONTROL_ROW_PATTERN =
  /(?:\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430|\u043f\u0440\u0438\u0435\u043c\u043a\u0430|\u0441\u043c\u0435\u0442\u043d\u044b\u0439\s+\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c|paid\s+control)/i;

export const MOJIBAKE_PATTERN = /(?:Р [\u0080-\u00bf]|РЎ[\u0080-\u00bf]|РІ[\u0080-\u00bf]|\uFFFD)/u;

export function failureSummary(failures: readonly unknown[], limit = 25): unknown[] {
  return failures.slice(0, limit);
}
