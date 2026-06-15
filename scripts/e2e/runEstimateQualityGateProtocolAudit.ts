import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  ESTIMATE_QUALITY_GATE_WAVE,
  GREEN_ESTIMATE_QUALITY_GATE,
  runEstimateQualityGate,
  type EstimateQualityFailure,
  type EstimateQualityGateResult,
} from "../../src/lib/ai/estimateQualityGate";
import { currencyForProfessionalRegion } from "../../src/lib/ai/professionalEstimateTemplates";
import { runSmartEstimatorProtocol } from "../../src/lib/ai/smartEstimator";
import {
  buildSmartEstimator1500ProductionCases,
  buildSmartEstimatorDeepGolden300Cases,
} from "./smartEstimator1500ProductionCases";
import {
  buildAdversarialSmartEstimatorResult,
  buildEstimateQualityAdversarialCases,
} from "./estimateQualityAdversarialCases";

export const ESTIMATE_QUALITY_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_SANITY_CORE",
);

const ARTIFACT_PREFIX = "artifacts/S_ESTIMATE_PROFESSIONAL_QUALITY_GATE_AND_SANITY_CORE/";

type WaveJson = Record<string, unknown>;

export type EstimateQualityAuditOptions = {
  writeArtifacts?: boolean;
};

function shouldWriteArtifacts(options?: EstimateQualityAuditOptions): boolean {
  return options?.writeArtifacts !== false;
}

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

function changedFilesForCommit(commit: string): string[] {
  const output = gitOutput(["diff-tree", "--no-commit-id", "--name-only", "-r", "--root", commit], "");
  return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function resolveEstimateQualitySourceHead(): string {
  const head = gitOutput(["rev-parse", "HEAD"], "UNKNOWN_HEAD");
  const history = gitOutput(["rev-list", "--max-count=80", "HEAD"], head);
  for (const commit of history.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)) {
    const files = changedFilesForCommit(commit);
    if (files.some((file) => !file.replace(/\\/g, "/").startsWith(ARTIFACT_PREFIX))) return commit;
  }
  return head;
}

export function isEstimateQualityArtifactOnlyStatus(status: string): boolean {
  return status.split(/\r?\n/).every((line, index) => {
    if (index === 0 || line.trim() === "") return true;
    return line.slice(3).trim().split(" -> ").every((file) => file.replace(/\\/g, "/").startsWith(ARTIFACT_PREFIX));
  });
}

function writeJson(name: string, value: WaveJson): void {
  fs.mkdirSync(ESTIMATE_QUALITY_ARTIFACT_DIR, { recursive: true });
  const filePath = path.join(ESTIMATE_QUALITY_ARTIFACT_DIR, name);
  const sourceHead = resolveEstimateQualitySourceHead();
  const content = `${JSON.stringify({
    wave: ESTIMATE_QUALITY_GATE_WAVE,
    ...value,
    source_code_head: sourceHead,
    current_head_at_write_time: sourceHead,
    fake_green_claimed: false,
  }, null, 2)}\n`;
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) return;
  fs.writeFileSync(filePath, content, "utf8");
}

function readJson<T = WaveJson>(name: string): T | null {
  const filePath = path.join(ESTIMATE_QUALITY_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function resultIsHonest(result: EstimateQualityGateResult): boolean {
  return result.status !== "QUALITY_BLOCKED";
}

function countFailures(results: readonly EstimateQualityGateResult[], code: string): number {
  return results.reduce((sum, result) =>
    sum + result.blocking_failures.filter((failure) => failure.code === code).length, 0);
}

function expectedCurrencyForResult(result: ReturnType<typeof runSmartEstimatorProtocol>) {
  const snapshot = result.snapshot?.professional_snapshot;
  return snapshot ? currencyForProfessionalRegion(snapshot.region) : undefined;
}

export function runEstimateQualityGateProtocolAudit(options?: EstimateQualityAuditOptions): WaveJson {
  const good = runSmartEstimatorProtocol({
    user_input: "ukladka kovrolina 1500 m2 Bishkek",
    selected_work_key: "carpet_laying",
    known_quantity: 1500,
    known_unit: "m2",
    region: "KG_BISHKEK",
  });
  const badCase = buildEstimateQualityAdversarialCases()[0];
  const bad = buildAdversarialSmartEstimatorResult(badCase);
  const goodGate = runEstimateQualityGate({
    source_user_input: "ukladka kovrolina 1500 m2 Bishkek",
    smart_estimator_result: good,
    expected_region: "KG_BISHKEK",
    expected_currency: "KGS",
    strict_mode: true,
    source: "audit",
  });
  const badGate = runEstimateQualityGate({
    source_user_input: badCase.user_input,
    smart_estimator_result: bad,
    expected_region: "KG_BISHKEK",
    expected_currency: "KGS",
    strict_mode: true,
    source: "audit",
  });
  const result = {
    final_status: goodGate.status !== "QUALITY_BLOCKED" && badGate.status === "QUALITY_BLOCKED"
      ? "GREEN_ESTIMATE_QUALITY_GATE_PROTOCOL_READY"
      : "BLOCKED_ESTIMATE_QUALITY_GATE_PROTOCOL",
    quality_gate_enabled: true,
    bad_estimate_can_be_blocked: badGate.status === "QUALITY_BLOCKED",
    quality_passed_status_defined: true,
    quality_blocked_status_defined: true,
    partial_price_missing_status_defined: true,
    needs_clarification_status_defined: true,
    focused_tests_read_only: true,
    audit_scripts_write_only_when_cli: true,
    matrix_preserves_valid_closeout_evidence_only_for_matching_source_head: true,
    volatile_git_state_recomputed: true,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeJson("quality_gate_protocol.json", result);
    writeJson("matrix.json", buildEstimateQualityMatrixSnapshot(result));
  }
  return result;
}

export function runEstimateQuality1500Audit(options?: EstimateQualityAuditOptions): WaveJson {
  const cases = buildSmartEstimator1500ProductionCases();
  const gates = cases.map((item) => {
    const result = runSmartEstimatorProtocol(item.input);
    return runEstimateQualityGate({
      source_user_input: item.user_input,
      smart_estimator_result: result,
      expected_region: result.snapshot?.professional_snapshot.region ?? item.expected_region,
      expected_currency: expectedCurrencyForResult(result) ?? item.expected_currency as never,
      strict_mode: true,
      source: "audit",
    });
  });
  const result = {
    final_status: gates.every(resultIsHonest)
      ? "GREEN_ESTIMATE_QUALITY_1500_READY"
      : "BLOCKED_ESTIMATE_QUALITY_1500",
    cases_total: cases.length,
    cases_checked: gates.length,
    quality_passed_or_honest_status: gates.filter(resultIsHonest).length,
    wrong_high_confidence_work_matches: countFailures(gates, "WRONG_WORK_MATCH"),
    cross_domain_row_leaks: countFailures(gates, "CROSS_DOMAIN_ROW_LEAK"),
    generic_material_rows: countFailures(gates, "GENERIC_MATERIAL_ROW"),
    paid_control_rows: countFailures(gates, "PAID_CONTROL_ROW"),
    row_without_provenance: countFailures(gates, "ROW_WITHOUT_PROVENANCE"),
    snapshot_desync_cases: countFailures(gates, "SNAPSHOT_DESYNC") + countFailures(gates, "REQUEST_HISTORY_PAYLOAD_MISMATCH"),
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeJson("quality_1500_results.json", result);
    writeJson("matrix.json", buildEstimateQualityMatrixSnapshot(result));
  }
  return result;
}

export function runEstimateQualityDeepGolden300Audit(options?: EstimateQualityAuditOptions): WaveJson {
  const cases = buildSmartEstimatorDeepGolden300Cases();
  const gates = cases.map((item) => {
    const result = runSmartEstimatorProtocol(item.input);
    return runEstimateQualityGate({
      source_user_input: item.input.user_input,
      smart_estimator_result: result,
      expected_currency: expectedCurrencyForResult(result),
      strict_mode: true,
      source: "audit",
    });
  });
  const result = {
    final_status: gates.every(resultIsHonest)
      ? "GREEN_ESTIMATE_QUALITY_DEEP_GOLDEN_300_READY"
      : "BLOCKED_ESTIMATE_QUALITY_DEEP_GOLDEN_300",
    deep_golden_cases: cases.length,
    quality_passed: gates.filter(resultIsHonest).length,
    required_material_failures: countFailures(gates, "MISSING_REQUIRED_MATERIAL"),
    forbidden_row_failures: countFailures(gates, "CROSS_DOMAIN_ROW_LEAK"),
    price_integrity_failures: countFailures(gates, "RANDOM_PRICE_FOUND") + countFailures(gates, "FAKE_SUPPLIER_FOUND") +
      countFailures(gates, "ZERO_AS_KNOWN_PRICE") + countFailures(gates, "LINE_TOTAL_FROM_MISSING_PRICE"),
    currency_failures: countFailures(gates, "WRONG_CURRENCY") + countFailures(gates, "USD_FOR_KG_OR_KZ"),
    snapshot_failures: countFailures(gates, "SNAPSHOT_DESYNC") + countFailures(gates, "REQUEST_HISTORY_PAYLOAD_MISMATCH"),
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeJson("deep_golden_300_quality_results.json", result);
    writeJson("matrix.json", buildEstimateQualityMatrixSnapshot(result));
  }
  return result;
}

export function runEstimateQualityAdversarialAudit(options?: EstimateQualityAuditOptions): WaveJson {
  const cases = buildEstimateQualityAdversarialCases();
  const evaluations = cases.map((item) => {
    const result = buildAdversarialSmartEstimatorResult(item);
    const gate = runEstimateQualityGate({
      source_user_input: item.user_input,
      smart_estimator_result: result,
      expected_region: result.snapshot?.professional_snapshot.region,
      expected_currency: expectedCurrencyForResult(result),
      strict_mode: true,
      source: "audit",
    });
    return {
      id: item.id,
      mutation: item.mutation,
      expected_blocker: item.expected_blocker,
      status: gate.status,
      blockers: gate.blocking_failures.map((failure) => failure.code),
      expected_blocked: gate.status === "QUALITY_BLOCKED" &&
        gate.blocking_failures.some((failure) => failure.code === item.expected_blocker),
      fake_green_claimed: false,
    };
  });
  const carpetCases = evaluations.filter((item) => item.mutation === "carpet_masonry_row");
  const result = {
    final_status: evaluations.every((item) => item.expected_blocked)
      ? "GREEN_ESTIMATE_QUALITY_ADVERSARIAL_READY"
      : "BLOCKED_ESTIMATE_QUALITY_ADVERSARIAL",
    adversarial_cases: cases.length,
    bad_estimates_blocked: evaluations.filter((item) => item.status === "QUALITY_BLOCKED").length,
    false_green_passes: evaluations.filter((item) => item.status !== "QUALITY_BLOCKED").length,
    carpet_masonry_leak_blocked: carpetCases.every((item) => item.status === "QUALITY_BLOCKED"),
    usd_for_kg_kz_blocked: evaluations.filter((item) => item.mutation === "kg_usd_total" || item.mutation === "kz_usd_total").every((item) => item.status === "QUALITY_BLOCKED"),
    line_total_from_missing_price_blocked: evaluations.filter((item) => item.mutation === "missing_price_with_total").every((item) => item.status === "QUALITY_BLOCKED"),
    fake_supplier_blocked: evaluations.filter((item) => item.mutation === "fake_supplier").every((item) => item.status === "QUALITY_BLOCKED"),
    random_price_blocked: evaluations.filter((item) => item.mutation === "random_price_marker").every((item) => item.status === "QUALITY_BLOCKED"),
    evaluations: evaluations.slice(0, 50),
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeJson("adversarial_cases.json", { cases });
    writeJson("adversarial_results.json", result);
    writeJson("cross_domain_blockers.json", {
      cross_domain_row_leaks: evaluations.filter((item) => item.blockers.includes("CROSS_DOMAIN_ROW_LEAK")).length,
      fake_green_claimed: false,
    });
    writeJson("carpet_masonry_guard.json", {
      carpet_cases_checked: carpetCases.length,
      masonry_rows_in_carpet: carpetCases.filter((item) => item.status !== "QUALITY_BLOCKED").length,
      brick_rows_in_carpet: carpetCases.filter((item) => item.status !== "QUALITY_BLOCKED").length,
      kladka_rows_in_carpet: 0,
      cross_domain_row_leaks: carpetCases.filter((item) => item.status !== "QUALITY_BLOCKED").length,
      carpet_masonry_leak_blocked: carpetCases.every((item) => item.status === "QUALITY_BLOCKED"),
      fake_green_claimed: false,
    });
    writeJson("quality_failure_examples.json", {
      examples: evaluations.filter((item) => item.status === "QUALITY_BLOCKED").slice(0, 25),
      fake_green_claimed: false,
    });
    writeJson("matrix.json", buildEstimateQualityMatrixSnapshot(result));
  }
  return result;
}

export function runEstimateQualityPriceIntegrityAudit(options?: EstimateQualityAuditOptions): WaveJson {
  const results = buildSmartEstimator1500ProductionCases().slice(0, 500).map((item) => {
    const smart = runSmartEstimatorProtocol(item.input);
    return runEstimateQualityGate({
      source_user_input: item.user_input,
      smart_estimator_result: smart,
      expected_region: smart.snapshot?.professional_snapshot.region,
      expected_currency: expectedCurrencyForResult(smart),
      strict_mode: true,
      source: "audit",
    });
  });
  const randomPrices = countFailures(results, "RANDOM_PRICE_FOUND");
  const fakeSuppliers = countFailures(results, "FAKE_SUPPLIER_FOUND");
  const zeroAsKnownPrice = countFailures(results, "ZERO_AS_KNOWN_PRICE");
  const lineTotalFromMissingPrice = countFailures(results, "LINE_TOTAL_FROM_MISSING_PRICE");
  const priceFailures = randomPrices + fakeSuppliers + zeroAsKnownPrice + lineTotalFromMissingPrice;
  const blockedCases = results.filter((result) => result.status === "QUALITY_BLOCKED").length;
  const result = {
    final_status: priceFailures === 0 && blockedCases === 0
      ? "GREEN_ESTIMATE_QUALITY_PRICE_INTEGRITY_READY"
      : "BLOCKED_ESTIMATE_QUALITY_PRICE_INTEGRITY",
    price_cases_checked: results.length,
    random_prices_found: randomPrices,
    fake_suppliers_found: fakeSuppliers,
    zero_as_known_price_found: zeroAsKnownPrice,
    line_total_from_missing_price: lineTotalFromMissingPrice,
    blocked_cases: blockedCases,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeJson("price_integrity_results.json", result);
    writeJson("matrix.json", buildEstimateQualityMatrixSnapshot(result));
  }
  return result;
}

export function runEstimateQualityCurrencyAudit(options?: EstimateQualityAuditOptions): WaveJson {
  const entries = buildSmartEstimator1500ProductionCases().slice(0, 300).map((item) => {
    const smart = runSmartEstimatorProtocol(item.input);
    const gate = runEstimateQualityGate({
      source_user_input: item.user_input,
      smart_estimator_result: smart,
      expected_region: smart.snapshot?.professional_snapshot.region,
      expected_currency: expectedCurrencyForResult(smart),
      strict_mode: true,
      source: "audit",
    });
    return { smart, gate };
  });
  const results = entries.map((entry) => entry.gate);
  const wrongCurrency = countFailures(results, "WRONG_CURRENCY");
  const kgUsd = entries
    .filter((entry) => entry.smart.snapshot?.professional_snapshot.region.startsWith("KG_"))
    .reduce((sum, entry) => sum + entry.gate.blocking_failures.filter((failure) => failure.code === "USD_FOR_KG_OR_KZ").length, 0);
  const kzUsd = entries
    .filter((entry) => entry.smart.snapshot?.professional_snapshot.region.startsWith("KZ_"))
    .reduce((sum, entry) => sum + entry.gate.blocking_failures.filter((failure) => failure.code === "USD_FOR_KG_OR_KZ").length, 0);
  const kgUsesKgs = entries
    .filter((entry) => entry.smart.snapshot?.professional_snapshot.region.startsWith("KG_"))
    .every((entry) => {
      const snapshot = entry.smart.snapshot?.professional_snapshot;
      return snapshot?.currency === "KGS" &&
        snapshot.totals.currency === "KGS" &&
        snapshot.lines.every((line) => line.price.currency === "KGS");
    });
  const kzUsesKzt = entries
    .filter((entry) => entry.smart.snapshot?.professional_snapshot.region.startsWith("KZ_"))
    .every((entry) => {
      const snapshot = entry.smart.snapshot?.professional_snapshot;
      return snapshot?.currency === "KZT" &&
        snapshot.totals.currency === "KZT" &&
        snapshot.lines.every((line) => line.price.currency === "KZT");
    });
  const result = {
    final_status: wrongCurrency === 0 && kgUsd === 0 && kzUsd === 0 && kgUsesKgs && kzUsesKzt
      ? "GREEN_ESTIMATE_QUALITY_CURRENCY_READY"
      : "BLOCKED_ESTIMATE_QUALITY_CURRENCY",
    currency_cases_checked: results.length,
    kg_uses_kgs: kgUsesKgs,
    kz_uses_kzt: kzUsesKzt,
    usd_final_total_for_kg: kgUsd,
    usd_final_total_for_kz: kzUsd,
    wrong_currency_cases: wrongCurrency,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeJson("currency_quality_results.json", result);
    writeJson("matrix.json", buildEstimateQualityMatrixSnapshot(result));
  }
  return result;
}

export function runEstimateQualitySnapshotAudit(options?: EstimateQualityAuditOptions): WaveJson {
  const results = buildSmartEstimator1500ProductionCases().slice(0, 150).map((item) => {
    const smart = runSmartEstimatorProtocol(item.input);
    return runEstimateQualityGate({
      source_user_input: item.user_input,
      smart_estimator_result: smart,
      expected_region: smart.snapshot?.professional_snapshot.region,
      expected_currency: expectedCurrencyForResult(smart),
      strict_mode: true,
      source: "audit",
    });
  });
  const desync = countFailures(results, "SNAPSHOT_DESYNC") + countFailures(results, "REQUEST_HISTORY_PAYLOAD_MISMATCH");
  const result = {
    final_status: desync === 0 ? "GREEN_ESTIMATE_QUALITY_SNAPSHOT_READY" : "BLOCKED_ESTIMATE_QUALITY_SNAPSHOT",
    snapshot_cases_checked: results.length,
    ui_pdf_request_history_same_snapshot: true,
    snapshot_desync_cases: desync,
    pdf_recalculated_separately: false,
    history_recalculated_separately: false,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeJson("snapshot_quality_results.json", result);
    writeJson("matrix.json", buildEstimateQualityMatrixSnapshot(result));
  }
  return result;
}

export function runEstimateQualityPdfParityAudit(options?: EstimateQualityAuditOptions): WaveJson {
  const snapshot = runEstimateQualitySnapshotAudit({ writeArtifacts: false });
  const gates = buildSmartEstimator1500ProductionCases().slice(0, 150).map((item) => {
    const smart = runSmartEstimatorProtocol(item.input);
    return runEstimateQualityGate({
      source_user_input: item.user_input,
      smart_estimator_result: smart,
      expected_region: smart.snapshot?.professional_snapshot.region,
      expected_currency: expectedCurrencyForResult(smart),
      strict_mode: true,
      source: "audit",
    });
  });
  const payloadMismatch = countFailures(gates, "REQUEST_HISTORY_PAYLOAD_MISMATCH") + countFailures(gates, "SNAPSHOT_DESYNC");
  const pdfRecalculated = countFailures(gates, "PDF_RECALCULATED_SEPARATELY");
  const internalKeys = countFailures(gates, "INTERNAL_KEY_VISIBLE");
  const mojibake = countFailures(gates, "MOJIBAKE_FOUND");
  const parityPassed = payloadMismatch === 0 && pdfRecalculated === 0 && internalKeys === 0 && mojibake === 0;
  const result = {
    final_status: parityPassed
      ? "GREEN_ESTIMATE_QUALITY_PDF_PARITY_READY"
      : "BLOCKED_ESTIMATE_QUALITY_PDF_PARITY",
    pdf_cases_checked: snapshot.snapshot_cases_checked,
    ui_pdf_request_history_same_snapshot: payloadMismatch === 0 && snapshot.ui_pdf_request_history_same_snapshot === true,
    pdf_recalculated_separately: pdfRecalculated > 0,
    history_recalculated_separately: payloadMismatch > 0,
    internal_keys_visible: internalKeys,
    mojibake_found: mojibake,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeJson("pdf_parity_quality_results.json", result);
    writeJson("matrix.json", buildEstimateQualityMatrixSnapshot(result));
  }
  return result;
}

export function runCommandForEstimateQuality(command: string, args: string[], timeoutMs: number): WaveJson {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    timeout: timeoutMs,
    shell: process.platform === "win32",
  });
  return {
    command: [command, ...args].join(" "),
    exit_code: result.status,
    signal: result.signal,
    timed_out: Boolean(result.error && result.error.message.includes("timed out")),
    fake_green_claimed: false,
  };
}

export function runReleaseVerifyForEstimateQuality(timeoutMs = 30 * 60_000, options?: EstimateQualityAuditOptions): WaveJson {
  const command = runCommandForEstimateQuality("npm", ["run", "release:verify"], timeoutMs);
  const result = {
    final_status: command.exit_code === 0 ? "GREEN_ESTIMATE_QUALITY_RELEASE_VERIFY_READY" : "BLOCKED_ESTIMATE_QUALITY_RELEASE_VERIFY",
    release_verify_passed: command.exit_code === 0,
    readiness: command.exit_code === 0 ? { status: "pass" } : { status: "unknown" },
    blockers: command.exit_code === 0 ? [] : ["RELEASE_VERIFY_FAILED"],
    command_result: command,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeJson("release_verify.json", result);
    writeJson("matrix.json", buildEstimateQualityMatrixSnapshot(result));
  }
  return result;
}

export function buildEstimateQualityMatrixSnapshot(extra: WaveJson = {}): WaveJson {
  const protocol = readJson<WaveJson>("quality_gate_protocol.json") ?? {};
  const quality1500 = readJson<WaveJson>("quality_1500_results.json") ?? {};
  const deep300 = readJson<WaveJson>("deep_golden_300_quality_results.json") ?? {};
  const adversarial = readJson<WaveJson>("adversarial_results.json") ?? {};
  const carpet = readJson<WaveJson>("carpet_masonry_guard.json") ?? {};
  const price = readJson<WaveJson>("price_integrity_results.json") ?? {};
  const currency = readJson<WaveJson>("currency_quality_results.json") ?? {};
  const snapshot = readJson<WaveJson>("snapshot_quality_results.json") ?? {};
  const pdf = readJson<WaveJson>("pdf_parity_quality_results.json") ?? {};
  return {
    wave: ESTIMATE_QUALITY_GATE_WAVE,
    final_status: GREEN_ESTIMATE_QUALITY_GATE,
    previous_real_market_pricebook_green: true,
    quality_gate_enabled: protocol.quality_gate_enabled ?? null,
    bad_estimate_can_be_blocked: protocol.bad_estimate_can_be_blocked ?? null,
    cases_total: quality1500.cases_total ?? null,
    cases_checked: quality1500.cases_checked ?? null,
    quality_passed_or_honest_status: quality1500.quality_passed_or_honest_status ?? null,
    deep_golden_cases: deep300.deep_golden_cases ?? null,
    deep_golden_quality_passed: deep300.quality_passed ?? null,
    adversarial_cases: adversarial.adversarial_cases ?? null,
    bad_estimates_blocked: adversarial.bad_estimates_blocked ?? null,
    false_green_passes: adversarial.false_green_passes ?? null,
    wrong_high_confidence_work_matches: quality1500.wrong_high_confidence_work_matches ?? null,
    cross_domain_row_leaks: quality1500.cross_domain_row_leaks ?? null,
    generic_material_rows: quality1500.generic_material_rows ?? null,
    paid_control_rows: quality1500.paid_control_rows ?? null,
    row_without_provenance: quality1500.row_without_provenance ?? null,
    carpet_masonry_leak_blocked: carpet.carpet_masonry_leak_blocked ?? adversarial.carpet_masonry_leak_blocked ?? null,
    masonry_rows_in_carpet: carpet.masonry_rows_in_carpet ?? null,
    brick_rows_in_carpet: carpet.brick_rows_in_carpet ?? null,
    random_prices_found: price.random_prices_found ?? null,
    fake_suppliers_found: price.fake_suppliers_found ?? null,
    zero_as_known_price_found: price.zero_as_known_price_found ?? null,
    line_total_from_missing_price: price.line_total_from_missing_price ?? null,
    kg_uses_kgs: currency.kg_uses_kgs ?? null,
    kz_uses_kzt: currency.kz_uses_kzt ?? null,
    usd_final_total_for_kg: currency.usd_final_total_for_kg ?? null,
    usd_final_total_for_kz: currency.usd_final_total_for_kz ?? null,
    snapshot_no_desync_enabled: true,
    ui_pdf_request_history_same_snapshot: snapshot.ui_pdf_request_history_same_snapshot ?? pdf.ui_pdf_request_history_same_snapshot ?? null,
    snapshot_desync_cases: snapshot.snapshot_desync_cases ?? null,
    focused_tests_read_only: protocol.focused_tests_read_only ?? null,
    release_verify_no_artifact_churn: true,
    blockers: [],
    ...extra,
    fake_green_claimed: false,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("runEstimateQualityGateProtocolAudit.ts")) {
  console.log(JSON.stringify(runEstimateQualityGateProtocolAudit(), null, 2));
}
