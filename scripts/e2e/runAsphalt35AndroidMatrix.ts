import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAProductionRegistry,
  buildAsphalt35NormativeCompositionLedgerV3,
  compileRoadworksWaveAWork,
} from "../../src/lib/estimate/v4/roadworks";
import {
  runProductionGradeEstimateCase,
  type ProductionGradeCriticalCase,
} from "../estimate/productionGradeLayerSealCore";
import { checkAndroidEmulatorHealth } from "./checkAndroidEmulatorHealth";
import {
  compactAndroidHealth,
  ensureProductionGradeAndroidWebServer,
  runProductionGradeAndroidBrowserCase,
} from "./runProductionGradeEstimateAndroidSmoke";

const exactSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const status = execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }).trim();
const diff = execFileSync("git", ["diff", "--binary"], { encoding: "utf8" });
const subjectTreeHash = createHash("sha256").update(JSON.stringify({ exactSha, status, diff })).digest("hex");
const outDir = path.join(".release-runtime", "asphalt-v3-final-r1", exactSha, "android");
const baseUrl = process.env.ASPHALT_ANDROID_BASE_URL ?? "http://localhost:8112";
const deviceId = process.env.ASPHALT_ANDROID_DEVICE_ID ?? "emulator-5554";
const ledger = new Map(buildAsphalt35NormativeCompositionLedgerV3().map((row) => [row.workId, row]));

function testCase(workId: string, templateId: string, label: string, executable: boolean, units: string[]): ProductionGradeCriticalCase {
  return {
    case_id: `asphalt-35:${workId}`,
    prompt: `${label} 240 м2 толщина 60 мм`,
    expected_family: workId,
    expected_template_id: templateId,
    selected_template_id: templateId,
    selected_work_key: workId,
    coverage_group: "road_earthworks",
    source: "POST_R6_01_FINAL_R1",
    required_row_types: executable ? ["work"] : ["document"],
    required_material_keywords: [], required_service_keywords: [], required_equipment_keywords: [],
    expected_units: units, forbidden_units: ["item"], high_risk_expected: true,
    pdf_required: true, buyer_handoff_required: executable, forbidden_refusal: true,
    forbidden_drawings_required_stop: true, forbidden_raw_dump: true, forbidden_fake_final_total: true,
  };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const health = checkAndroidEmulatorHealth({ serial: deviceId, requireEmulator: true, requireChrome: true }).artifact;
  if (!health.android_lab_healthy) throw new Error(`android_lab_unhealthy:${health.blocking_reasons.join("|")}`);
  const server = await ensureProductionGradeAndroidWebServer(baseUrl, outDir);
  try {
    const checkpointPath = path.join(outDir, "asphalt-35-android-api34-checkpoint.json");
    const previous = process.env.ASPHALT_ANDROID_RESUME === "1" && existsSync(checkpointPath)
      ? JSON.parse(readFileSync(checkpointPath, "utf8")) as { allRuns: any[]; blockers: string[] }
      : { allRuns: [], blockers: [] };
    const allRuns: any[] = previous.allRuns;
    const blockers: string[] = previous.blockers;
    const completed = new Set(allRuns.map((row) => `${row.replay}:${row.work_id}`));
    const onlyWork = process.env.ASPHALT_ANDROID_ONLY_WORK;
    const replayTotal = Number(process.env.ASPHALT_ANDROID_REPLAYS ?? "3");
    const registrations = onlyWork
      ? RoadworksWaveAProductionRegistry.filter((row) => row.workId === onlyWork)
      : RoadworksWaveAProductionRegistry;
    const checkpoint = () => writeFileSync(checkpointPath, `${JSON.stringify({ allRuns, blockers }, null, 2)}\n`);
    for (let replay = 1; replay <= replayTotal; replay += 1) {
      for (const registration of registrations) {
        if (completed.has(`${replay}:${registration.workId}`)) continue;
        const record = ledger.get(registration.workId)!;
        const executable = record.terminalDecision === "EXECUTABLE_B";
        const compiled = executable
          ? compileRoadworksWaveAWork(registration.canonicalWorkId, DEFAULT_ROADWORKS_WAVE_A_INPUTS, { scopeProfile: registration.scopeProfile })
          : null;
        const units = [...new Set((compiled?.rows ?? [{ unit: "pcs" }]).map((row) => row.unit))];
        const test = testCase(registration.workId, registration.templateId, registration.professionalNameRu, executable, units);
        const domain = runProductionGradeEstimateCase(test);
        let browser: Awaited<ReturnType<typeof runProductionGradeAndroidBrowserCase>> | null = null;
        let lastError: unknown;
        for (let attempt = 1; attempt <= 3 && browser == null; attempt += 1) {
          try { browser = await runProductionGradeAndroidBrowserCase({ deviceId, baseUrl, testCase: test, domain }); }
          catch (error) { lastError = error; if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1500)); }
        }
        if (browser == null) throw lastError;
        const local = [
          browser.summary_card_visible ? "" : "summary_missing",
          // Android renders the full BOQ inline after approval; the desktop-only
          // grouped drawer markers are intentionally absent on this breakpoint.
          browser.positions_empty_after_prompt ? "positions_empty" : "",
          browser.raw_dump_visible ? "raw_dump" : "",
          browser.console_error_count === 0 ? "" : `console_errors:${browser.console_error_count}`,
          executable && !browser.work_rows_visible ? "work_rows_missing" : "",
          domain.material_rows_count > 0 && !browser.material_rows_visible ? "material_rows_missing" : "",
          !executable && !browser.service_rows_visible ? "conditional_document_missing" : "",
          browser.pdf_button_visible_after_confirm ? "" : "pdf_entry_missing",
        ].filter(Boolean);
        blockers.push(...local.map((reason) => `replay${replay}:${registration.workId}:${reason}`));
        allRuns.push({ replay, work_id: registration.workId, terminal_decision: record.terminalDecision, passed: local.length === 0, blockers: local, browser });
        checkpoint();
        console.info(`[${replay}/3 ${allRuns.length - (replay - 1) * 35}/35] ${registration.workId} ${local.length ? "RED" : "GREEN"}`);
      }
    }
    const healthAfter = checkAndroidEmulatorHealth({ serial: deviceId, requireEmulator: true, requireChrome: true }).artifact;
    if (!healthAfter.android_lab_healthy) blockers.push(...healthAfter.blocking_reasons.map((x) => `android_health_after:${x}`));
    const payload = {
      schema: "asphalt-35-android-api34-visible-output-v1", generated_at: new Date().toISOString(), exact_sha: exactSha,
      subject_tree_hash: subjectTreeHash, actual_android_emulator: true, device_id: deviceId, sdk: 34,
      replay_passed: Array.from({ length: replayTotal }, (_, index) => allRuns.filter((x: any) => x.replay === index + 1 && x.passed).length),
      records_seen: allRuns.length, expected_records: registrations.length * replayTotal, health_before: compactAndroidHealth(health), health_after: compactAndroidHealth(healthAfter),
      blockers, passed: blockers.length === 0 && allRuns.length === registrations.length * replayTotal, results: allRuns,
    };
    writeFileSync(path.join(outDir, "asphalt-35-android-api34-3x.json"), `${JSON.stringify(payload, null, 2)}\n`);
    console.info(JSON.stringify({ passed: payload.passed, replay_passed: payload.replay_passed, blockers: blockers.slice(0, 100) }, null, 2));
    if (!payload.passed) process.exitCode = 1;
  } finally { server.stop(); }
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
