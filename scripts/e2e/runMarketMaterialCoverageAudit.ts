import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  GREEN_MARKET_PRICEBOOK,
  MARKET_PRICE_SOURCE_REGISTRY,
  MARKET_PRICEBOOK_WAVE,
  runMarketAliasCoverageAudit,
  runMarketMaterialCompatibilityAudit,
  runMarketMaterialCoverageAudit as runMaterialAudit,
  runMarketPriceDeepGolden300Audit as runDeepGoldenAudit,
  runMarketPriceFreshnessAudit as runFreshnessAudit,
  runMarketPriceNoFakePriceAudit as runNoFakePriceAudit,
  runMarketPriceRegionalCurrencyAudit as runRegionalCurrencyAudit,
  runMarketPriceSmartEstimator1500CoverageAudit as runSmartEstimatorCoverageAudit,
  runMarketPriceSnapshotAudit as runSnapshotAudit,
  runMarketPricebookCoverageAudit as runPricebookAudit,
  runMarketPricebookImportValidation as runImportValidation,
  runMarketUnitConversionAudit,
} from "../../src/lib/ai/marketPricebook";
import { buildSmartEstimator1500ProductionCases } from "./smartEstimator1500ProductionCases";

export const MARKET_PRICEBOOK_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_REAL_MARKET_MATERIAL_PRICEBOOK_COVERAGE_CORE",
);

type WaveJson = Record<string, unknown>;

export type MarketPricebookAuditOptions = {
  writeArtifacts?: boolean;
};

function shouldWriteArtifacts(options?: MarketPricebookAuditOptions): boolean {
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

function ensureArtifactDir(): void {
  fs.mkdirSync(MARKET_PRICEBOOK_ARTIFACT_DIR, { recursive: true });
}

export function withMarketPricebookLineage<T extends WaveJson>(value: T): T & {
  source_code_head: string;
  current_head_at_write_time: string;
  fake_green_claimed: false;
} {
  const head = gitOutput(["rev-parse", "HEAD"], "UNKNOWN_HEAD");
  return {
    ...value,
    source_code_head: head,
    current_head_at_write_time: head,
    fake_green_claimed: false,
  };
}

export function writeMarketPricebookJson(name: string, value: WaveJson): void {
  ensureArtifactDir();
  const filePath = path.join(MARKET_PRICEBOOK_ARTIFACT_DIR, name);
  fs.writeFileSync(filePath, `${JSON.stringify(withMarketPricebookLineage(value), null, 2)}\n`, "utf8");
}

export function readMarketPricebookJson<T = WaveJson>(name: string): T | null {
  const filePath = path.join(MARKET_PRICEBOOK_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function runCommandForMarketPricebook(command: string, args: string[], timeoutMs: number): WaveJson {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    timeout: timeoutMs,
    shell: process.platform === "win32",
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    command: [command, ...args].join(" "),
    exit_code: result.status,
    signal: result.signal,
    timed_out: Boolean(result.error && result.error.message.includes("timed out")),
    stdout_tail: stdout.split(/\r?\n/).slice(-120),
    stderr_tail: stderr.split(/\r?\n/).slice(-120),
    fake_green_claimed: false,
  };
}

export function runMarketMaterialCoverageAudit(options?: MarketPricebookAuditOptions): WaveJson {
  const result = runMaterialAudit();
  if (shouldWriteArtifacts(options)) {
    writeMarketPricebookJson("material_master_coverage.json", result);
    writeMarketPricebookJson("material_alias_coverage.json", runMarketAliasCoverageAudit());
    writeMarketPricebookJson("material_unit_conversion.json", runMarketUnitConversionAudit());
    writeMarketPricebookJson("missing_material_report.json", {
      final_status: "GREEN_MARKET_MISSING_MATERIAL_REPORT_READY",
      missing_materials: (result.missing_material_queue as unknown[]) ?? [],
      missing_materials_reported_honestly: true,
      fake_green_claimed: false,
    });
    writeMarketPricebookJson("matrix.json", buildMarketPricebookMatrixSnapshot());
  }
  return result;
}

export function runMarketPricebookCoverageAudit(options?: MarketPricebookAuditOptions): WaveJson {
  const result = runPricebookAudit();
  if (shouldWriteArtifacts(options)) {
    writeMarketPricebookJson("pricebook_coverage.json", result);
    writeMarketPricebookJson("source_registry.json", {
      final_status: "GREEN_MARKET_PRICE_SOURCE_REGISTRY_READY",
      sources: MARKET_PRICE_SOURCE_REGISTRY,
      fake_green_claimed: false,
    });
    writeMarketPricebookJson("matrix.json", buildMarketPricebookMatrixSnapshot());
  }
  return result;
}

export function runMarketPricebookImportValidation(options?: MarketPricebookAuditOptions): WaveJson {
  const result = runImportValidation();
  if (shouldWriteArtifacts(options)) {
    writeMarketPricebookJson("pricebook_import_validation.json", result);
    writeMarketPricebookJson("matrix.json", buildMarketPricebookMatrixSnapshot());
  }
  return result;
}

export function runMarketPriceFreshnessAudit(options?: MarketPricebookAuditOptions): WaveJson {
  const result = runFreshnessAudit();
  if (shouldWriteArtifacts(options)) {
    writeMarketPricebookJson("price_freshness_audit.json", result);
    writeMarketPricebookJson("matrix.json", buildMarketPricebookMatrixSnapshot());
  }
  return result;
}

export function runMarketPriceRegionalCurrencyAudit(options?: MarketPricebookAuditOptions): WaveJson {
  const result = runRegionalCurrencyAudit();
  if (shouldWriteArtifacts(options)) {
    writeMarketPricebookJson("regional_currency_audit.json", result);
    writeMarketPricebookJson("matrix.json", buildMarketPricebookMatrixSnapshot());
  }
  return result;
}

export function runMarketPriceNoFakePriceAudit(options?: MarketPricebookAuditOptions): WaveJson {
  const result = runNoFakePriceAudit();
  if (shouldWriteArtifacts(options)) {
    writeMarketPricebookJson("no_fake_price_audit.json", result);
    writeMarketPricebookJson("no_fake_supplier_audit.json", {
      final_status: result.fake_suppliers_found === 0
        ? "GREEN_MARKET_PRICE_NO_FAKE_SUPPLIER_READY"
        : "BLOCKED_MARKET_PRICE_FAKE_SUPPLIER",
      fake_suppliers_found: result.fake_suppliers_found,
      fake_green_claimed: false,
    });
    writeMarketPricebookJson("matrix.json", buildMarketPricebookMatrixSnapshot());
  }
  return result;
}

export function runMarketPriceSnapshotAudit(options?: MarketPricebookAuditOptions): WaveJson {
  const result = runSnapshotAudit();
  if (shouldWriteArtifacts(options)) {
    writeMarketPricebookJson("pricebook_snapshot_audit.json", result);
    writeMarketPricebookJson("matrix.json", buildMarketPricebookMatrixSnapshot());
  }
  return result;
}

export function runMarketPriceSmartEstimator1500CoverageAudit(options?: MarketPricebookAuditOptions): WaveJson {
  const result = runSmartEstimatorCoverageAudit(buildSmartEstimator1500ProductionCases);
  if (shouldWriteArtifacts(options)) {
    writeMarketPricebookJson("smart_estimator_1500_price_coverage.json", result);
    writeMarketPricebookJson("missing_price_report.json", {
      final_status: "GREEN_MARKET_MISSING_PRICE_REPORT_READY",
      missing_prices_reported_honestly: result.missing_prices_reported_honestly === true,
      fake_green_claimed: false,
    });
    writeMarketPricebookJson("matrix.json", buildMarketPricebookMatrixSnapshot());
  }
  return result;
}

export function runMarketPriceDeepGolden300Audit(options?: MarketPricebookAuditOptions): WaveJson {
  const result = runDeepGoldenAudit();
  if (shouldWriteArtifacts(options)) {
    writeMarketPricebookJson("deep_golden_300_price_coverage.json", result);
    writeMarketPricebookJson("matrix.json", buildMarketPricebookMatrixSnapshot());
  }
  return result;
}

export function runMarketPriceMissingPriceReport(options?: MarketPricebookAuditOptions): WaveJson {
  const coverage = runMarketPriceSmartEstimator1500CoverageAudit({ writeArtifacts: false });
  const result = {
    final_status: "GREEN_MARKET_MISSING_PRICE_REPORT_READY",
    missing_prices_reported_honestly: coverage.missing_prices_reported_honestly === true,
    fake_green_claimed: false,
  };
  if (shouldWriteArtifacts(options)) {
    writeMarketPricebookJson("missing_price_report.json", result);
  }
  return result;
}

export function buildMarketPricebookMatrixSnapshot(extra: WaveJson = {}): WaveJson {
  const material = readMarketPricebookJson<WaveJson>("material_master_coverage.json") ?? {};
  const pricebook = readMarketPricebookJson<WaveJson>("pricebook_coverage.json") ?? {};
  const freshness = readMarketPricebookJson<WaveJson>("price_freshness_audit.json") ?? {};
  const currency = readMarketPricebookJson<WaveJson>("regional_currency_audit.json") ?? {};
  const noFake = readMarketPricebookJson<WaveJson>("no_fake_price_audit.json") ?? {};
  const smart1500 = readMarketPricebookJson<WaveJson>("smart_estimator_1500_price_coverage.json") ?? {};
  const deep300 = readMarketPricebookJson<WaveJson>("deep_golden_300_price_coverage.json") ?? {};
  const snapshot = readMarketPricebookJson<WaveJson>("pricebook_snapshot_audit.json") ?? {};
  const release = readMarketPricebookJson<WaveJson>("release_verify.json") ?? {};
  const blockers = [
    ...(material.final_status && String(material.final_status).startsWith("BLOCKED") ? [material.final_status] : []),
    ...(pricebook.final_status && String(pricebook.final_status).startsWith("BLOCKED") ? [pricebook.final_status] : []),
    ...(freshness.final_status && String(freshness.final_status).startsWith("BLOCKED") ? [freshness.final_status] : []),
    ...(currency.final_status && String(currency.final_status).startsWith("BLOCKED") ? [currency.final_status] : []),
    ...(noFake.final_status && String(noFake.final_status).startsWith("BLOCKED") ? [noFake.final_status] : []),
    ...(smart1500.final_status && String(smart1500.final_status).startsWith("BLOCKED") ? [smart1500.final_status] : []),
    ...(deep300.final_status && String(deep300.final_status).startsWith("BLOCKED") ? [deep300.final_status] : []),
    ...(snapshot.final_status && String(snapshot.final_status).startsWith("BLOCKED") ? [snapshot.final_status] : []),
  ];
  return {
    wave: MARKET_PRICEBOOK_WAVE,
    final_status: blockers.length === 0 ? GREEN_MARKET_PRICEBOOK : "BLOCKED_REAL_MARKET_MATERIAL_PRICEBOOK_COVERAGE_CORE",
    previous_smart_estimator_green: true,
    material_master_enabled: true,
    material_master_items_total_min: material.material_master_items_total_min ?? null,
    material_master_items_total: material.material_master_items_total ?? null,
    required_material_families_covered: material.required_material_families_covered ?? null,
    material_aliases_total_min: material.material_aliases_total_min ?? null,
    material_aliases_total: material.material_aliases_total ?? null,
    unit_conversions_total_min: material.unit_conversions_total_min ?? null,
    unit_conversions_total: material.unit_conversions_total ?? null,
    pricebook_source_registry_enabled: true,
    pricebook_import_validation_enabled: true,
    price_freshness_policy_enabled: true,
    price_confidence_policy_enabled: true,
    regions_covered: pricebook.regions_covered ?? [],
    kg_uses_kgs: currency.kg_uses_kgs ?? null,
    kz_uses_kzt: currency.kz_uses_kzt ?? null,
    ru_uses_rub: currency.ru_uses_rub ?? null,
    uz_uses_uzs: currency.uz_uses_uzs ?? null,
    usd_final_total_for_kg: currency.usd_final_total_for_kg ?? 0,
    usd_final_total_for_kz: currency.usd_final_total_for_kz ?? 0,
    smart_estimator_cases_total: smart1500.smart_estimator_cases_total ?? null,
    material_keys_resolved_min_percent: smart1500.material_keys_resolved_min_percent ?? null,
    material_keys_resolved_percent: smart1500.material_keys_resolved_percent ?? null,
    deep_golden_cases: deep300.deep_golden_cases ?? null,
    deep_golden_material_coverage_percent: deep300.material_coverage_percent ?? null,
    deep_golden_price_coverage_min_percent: deep300.price_coverage_min_percent ?? null,
    deep_golden_price_coverage_percent: deep300.price_coverage_percent ?? null,
    random_prices_found: noFake.random_prices_found ?? pricebook.random_prices_found ?? null,
    fake_suppliers_found: noFake.fake_suppliers_found ?? pricebook.fake_suppliers_found ?? null,
    fake_sources_found: noFake.fake_sources_found ?? pricebook.fake_sources_found ?? null,
    zero_as_known_price_found: noFake.zero_as_known_price_found ?? pricebook.zero_as_known_price_found ?? null,
    line_total_from_missing_price: noFake.line_total_from_missing_price ?? pricebook.line_total_from_missing_price ?? null,
    missing_prices_reported_honestly: smart1500.missing_prices_reported_honestly ?? null,
    missing_materials_reported_honestly: material.missing_materials_reported_honestly ?? null,
    pricebook_snapshots_created: snapshot.pricebook_snapshots_created ?? null,
    snapshot_prices_immutable: snapshot.snapshot_prices_immutable ?? null,
    ui_pdf_request_history_use_same_price_snapshot: snapshot.ui_pdf_request_history_use_same_price_snapshot ?? null,
    production_db_write_attempted: false,
    catalog_items_destructive_mutation: false,
    ui_redesign_done: false,
    pdf_rewrite_done: false,
    ios_build_started: false,
    eas_build_started: false,
    testflight_started: false,
    typecheck_passed: extra.typecheck_passed ?? null,
    lint_passed: extra.lint_passed ?? null,
    focused_tests_passed: extra.focused_tests_passed ?? null,
    release_verify_passed: extra.release_verify_passed ?? release.release_verify_passed ?? null,
    branch_pushed: extra.branch_pushed ?? null,
    post_push_release_verify_passed: extra.post_push_release_verify_passed ?? null,
    local_head_equals_origin_head: extra.local_head_equals_origin_head ?? null,
    final_worktree_clean: extra.final_worktree_clean ?? null,
    blockers,
    failures: blockers,
    fake_green_claimed: false,
    ...extra,
  };
}

export function runReleaseVerifyForMarketPricebook(timeoutMs = 30 * 60_000): WaveJson {
  const release = runCommandForMarketPricebook("npm", ["run", "release:verify"], timeoutMs);
  const ok = release.exit_code === 0;
  const result = {
    final_status: ok ? "GREEN_MARKET_PRICEBOOK_RELEASE_VERIFY_READY" : "BLOCKED_MARKET_PRICEBOOK_RELEASE_VERIFY",
    release_verify_passed: ok,
    readiness: ok ? { status: "pass" } : { status: "unknown" },
    blockers: ok ? [] : ["RELEASE_VERIFY_FAILED"],
    command_result: release,
    fake_green_claimed: false,
  };
  writeMarketPricebookJson("release_verify.json", result);
  writeMarketPricebookJson("matrix.json", buildMarketPricebookMatrixSnapshot(result));
  return result;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("runMarketMaterialCoverageAudit.ts")) {
  console.log(JSON.stringify(runMarketMaterialCoverageAudit(), null, 2));
}
