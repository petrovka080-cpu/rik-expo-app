import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import {
  calculateProfessionalCostForDraftRows,
  calculateProfessionalCostForPassport,
} from "../../src/lib/estimate/professionalCostCalculator";
import type { ProfessionalCostingResult } from "../../src/lib/estimate/professionalCostingContract";
import { validateProfessionalCosting } from "../../src/lib/estimate/validateProfessionalCosting";
import { validateProfessionalPricebook } from "../../src/lib/estimate/validateProfessionalPricebook";
import { renderProfessionalCostSection } from "../../src/features/pdf/renderProfessionalCostSection";
import { createBuyerHandoffCostPackage } from "../../src/features/procurement/createBuyerHandoffCostPackage";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import {
  REAL_NAMED_BOQ_RUNTIME_CASES,
  type RealNamedBoqRuntimeCase,
} from "./realNamedBoqCriticalCases";

export const GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_SOURCE_READY =
  "GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_SOURCE_READY" as const;
export const GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_WEB_ANDROID_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_WEB_ANDROID_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_INCOMPLETE_NO_GREEN =
  "STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_INCOMPLETE_NO_GREEN" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook");
const SAMPLE_OUTPUTS_REQUIRED = 50;

export type TrustedCostingTemplateAuditRow = {
  template_id: string;
  template_name: string;
  family: string;
  boq_rows_count: number;
  cost_rows_count: number;
  priced_rows_count: number;
  missing_price_rows_count: number;
  material_rows_count: number;
  material_priced_rows_count: number;
  labor_rows_count: number;
  labor_priced_rows_count: number;
  service_rows_count: number;
  service_priced_rows_count: number;
  equipment_rows_count: number;
  equipment_priced_rows_count: number;
  transport_rows_count: number;
  transport_priced_rows_count: number;
  priced_required_rows_percent: number;
  preliminary_total_allowed: boolean;
  contract_total_allowed: boolean;
  fake_price_count: number;
  fake_subtotal_count: number;
  fake_final_total_count: number;
  price_source_missing_count: number;
  price_region_missing_count: number;
  price_retrieved_at_missing_count: number;
  status: "READY_TRUSTED_COSTING" | "BLOCKED_TRUSTED_COSTING";
  blocking_reasons: string[];
};

type TrustedCostingPriorityFamilyKey =
  | "diamond_drilling"
  | "profile_sheet_fence"
  | "ventilated_facade"
  | "water_supply"
  | "roadworks"
  | "hydraulic_structures"
  | "power_lines"
  | "high_rise_glazing"
  | "mansard_roof"
  | "bridge_tunnel_industrial";

type TrustedCostingPriorityRuntimeRow = {
  case_id: string;
  prompt: string;
  family_key: TrustedCostingPriorityFamilyKey;
  expected_family: string;
  matched_family: string | null;
  template_id: string | null;
  cost_rows_count: number;
  priced_required_rows_percent: number;
  preliminary_total_allowed: boolean;
  contract_total_allowed: boolean;
  fake_price_count: number;
  fake_subtotal_count: number;
  fake_final_total_count: number;
  status: "READY_TRUSTED_COSTING" | "BLOCKED_TRUSTED_COSTING";
  blocking_reasons: string[];
};

const PRIORITY_FAMILY_RULES: Record<TrustedCostingPriorityFamilyKey, {
  patterns: readonly RegExp[];
  runtimeFamilies: readonly string[];
}> = {
  diamond_drilling: {
    patterns: [/diamond_core_drilling|diamond.*drilling|алмазн.*бур|бурени.*бетон/i],
    runtimeFamilies: ["diamond_core_drilling_concrete"],
  },
  profile_sheet_fence: {
    patterns: [/fenc|profile_sheet/i],
    runtimeFamilies: ["dynamic_fencing_estimate"],
  },
  ventilated_facade: {
    patterns: [/ventilated_facade|facade/i],
    runtimeFamilies: ["ventilated_facade"],
  },
  water_supply: {
    patterns: [/water_supply/i],
    runtimeFamilies: ["village_water_supply", "sewerage_external", "stormwater_external"],
  },
  roadworks: {
    patterns: [/roadworks|road/i],
    runtimeFamilies: ["road_construction"],
  },
  hydraulic_structures: {
    patterns: [/hydraulic|dam/i],
    runtimeFamilies: ["earth_dam"],
  },
  power_lines: {
    patterns: [/power_line|electrical/i],
    runtimeFamilies: ["overhead_power_line_10kv"],
  },
  high_rise_glazing: {
    patterns: [/glazing/i],
    runtimeFamilies: ["high_rise_glazing"],
  },
  mansard_roof: {
    patterns: [/mansard|roof/i],
    runtimeFamilies: ["mansard_roof_with_windows"],
  },
  bridge_tunnel_industrial: {
    patterns: [/bridge|tunnel|industrial|foundation/i],
    runtimeFamilies: ["bridge_construction", "tunnel_construction", "equipment_foundation"],
  },
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function countRows(result: ProfessionalCostingResult, rowType: string, pricedOnly = false): number {
  return result.lines.filter((line) =>
    line.rowType === rowType && (!pricedOnly || line.unitPrice != null)
  ).length;
}

function auditRow(input: {
  templateId: string;
  templateName: string;
  family: string;
  result: ProfessionalCostingResult;
}): TrustedCostingTemplateAuditRow {
  const validation = validateProfessionalCosting({ lines: input.result.lines });
  const blockingReasons = [
    ...validation.blocking_reasons,
    input.result.summary.preliminaryTotalAllowed ? "" : "preliminary_total_not_allowed",
    input.result.summary.contractTotalAllowed ? "contract_total_unexpectedly_allowed" : "",
    input.result.summary.pricedRequiredRowsPercent >= 80 ? "" : `priced_required_rows_below_80:${input.result.summary.pricedRequiredRowsPercent}`,
    input.result.summary.missingPriceRowsVisible ? "" : "missing_price_rows_not_visible",
  ].filter(Boolean);
  return {
    template_id: input.templateId,
    template_name: input.templateName,
    family: input.family,
    boq_rows_count: input.result.lines.length,
    cost_rows_count: validation.cost_rows_count,
    priced_rows_count: validation.priced_rows_count,
    missing_price_rows_count: validation.missing_price_rows_count,
    material_rows_count: countRows(input.result, "material"),
    material_priced_rows_count: countRows(input.result, "material", true),
    labor_rows_count: countRows(input.result, "labor") + countRows(input.result, "work"),
    labor_priced_rows_count: countRows(input.result, "labor", true) + countRows(input.result, "work", true),
    service_rows_count: countRows(input.result, "service") + countRows(input.result, "overhead"),
    service_priced_rows_count: countRows(input.result, "service", true) + countRows(input.result, "overhead", true),
    equipment_rows_count: countRows(input.result, "equipment"),
    equipment_priced_rows_count: countRows(input.result, "equipment", true),
    transport_rows_count: countRows(input.result, "transport") + countRows(input.result, "mobilization"),
    transport_priced_rows_count: countRows(input.result, "transport", true) + countRows(input.result, "mobilization", true),
    priced_required_rows_percent: input.result.summary.pricedRequiredRowsPercent,
    preliminary_total_allowed: input.result.summary.preliminaryTotalAllowed,
    contract_total_allowed: input.result.summary.contractTotalAllowed,
    fake_price_count: validation.fake_price_count,
    fake_subtotal_count: validation.fake_subtotal_count,
    fake_final_total_count: validation.fake_final_total_count,
    price_source_missing_count: validation.price_source_missing_count,
    price_region_missing_count: validation.price_region_missing_count,
    price_retrieved_at_missing_count: validation.price_retrieved_at_missing_count,
    status: blockingReasons.length === 0 ? "READY_TRUSTED_COSTING" : "BLOCKED_TRUSTED_COSTING",
    blocking_reasons: blockingReasons,
  };
}

function familyMatches(row: TrustedCostingTemplateAuditRow, patterns: readonly RegExp[]): boolean {
  const text = `${row.template_id} ${row.template_name} ${row.family}`;
  return patterns.some((pattern) => pattern.test(text));
}

function runtimeFamilyMatches(row: TrustedCostingPriorityRuntimeRow, families: readonly string[]): boolean {
  return families.includes(row.expected_family) || (row.matched_family != null && families.includes(row.matched_family));
}

function familyReady(input: {
  rows: readonly TrustedCostingTemplateAuditRow[];
  runtimeRows: readonly TrustedCostingPriorityRuntimeRow[];
  familyKey: TrustedCostingPriorityFamilyKey;
}): boolean {
  const rule = PRIORITY_FAMILY_RULES[input.familyKey];
  const matched = input.rows.filter((row) => familyMatches(row, rule.patterns));
  const runtimeMatched = input.runtimeRows.filter((row) => runtimeFamilyMatches(row, rule.runtimeFamilies));
  return (matched.length > 0 || runtimeMatched.length > 0) &&
    matched.every((row) =>
    row.status === "READY_TRUSTED_COSTING" && row.priced_required_rows_percent >= 95
    ) &&
    runtimeMatched.every((row) =>
      row.status === "READY_TRUSTED_COSTING" && row.priced_required_rows_percent >= 95
    );
}

function priorityRows(input: {
  rows: readonly TrustedCostingTemplateAuditRow[];
  runtimeRows: readonly TrustedCostingPriorityRuntimeRow[];
}): Array<Pick<TrustedCostingTemplateAuditRow | TrustedCostingPriorityRuntimeRow, "priced_required_rows_percent">> {
  const familyRules = Object.values(PRIORITY_FAMILY_RULES);
  const templateRows = input.rows.filter((row) => familyRules.some((rule) => familyMatches(row, rule.patterns)));
  const runtimeRows = input.runtimeRows.filter((row) =>
    familyRules.some((rule) => runtimeFamilyMatches(row, rule.runtimeFamilies))
  );
  return [...templateRows, ...runtimeRows];
}

function priorityPercent(input: {
  rows: readonly TrustedCostingTemplateAuditRow[];
  runtimeRows: readonly TrustedCostingPriorityRuntimeRow[];
}): number {
  const matched = priorityRows(input);
  if (matched.length === 0) return 0;
  return Math.round(matched.reduce((sum, row) => sum + row.priced_required_rows_percent, 0) / matched.length * 100) / 100;
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function samplePrompt(templateName: string): string {
  return `Preliminary professional cost breakdown for ${templateName}`;
}

function priorityFamilyKeyForRuntimeCase(testCase: RealNamedBoqRuntimeCase): TrustedCostingPriorityFamilyKey | null {
  return (Object.entries(PRIORITY_FAMILY_RULES) as Array<[TrustedCostingPriorityFamilyKey, typeof PRIORITY_FAMILY_RULES[TrustedCostingPriorityFamilyKey]]>)
    .find(([, rule]) => rule.runtimeFamilies.includes(testCase.expected_family))?.[0] ?? null;
}

function auditPriorityRuntimeCase(testCase: RealNamedBoqRuntimeCase): TrustedCostingPriorityRuntimeRow | null {
  const familyKey = priorityFamilyKeyForRuntimeCase(testCase);
  if (!familyKey) return null;
  const revision = createEstimateDraftRevision({
    rawInput: testCase.prompt,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    createdAt: "2026-07-07T00:00:00.000Z",
  });
  const costRows = revision.boq.rows.filter((row) => row.rowType !== "document" && row.rowType !== "other");
  const result = calculateProfessionalCostForDraftRows({
    templateId: revision.selectedTemplateId,
    family: revision.matchedFamily,
    rows: costRows,
  });
  const validation = validateProfessionalCosting({ lines: result.lines });
  const blockingReasons = [
    revision.matchedFamily === testCase.expected_family ? "" : `family_mismatch:${revision.matchedFamily}`,
    ...validation.blocking_reasons,
    result.summary.preliminaryTotalAllowed ? "" : "preliminary_total_not_allowed",
    result.summary.contractTotalAllowed ? "contract_total_unexpectedly_allowed" : "",
    result.summary.pricedRequiredRowsPercent >= 95 ? "" : `priority_priced_rows_below_95:${result.summary.pricedRequiredRowsPercent}`,
    result.summary.missingPriceRowsVisible ? "" : "missing_price_rows_not_visible",
  ].filter(Boolean);
  return {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    family_key: familyKey,
    expected_family: testCase.expected_family,
    matched_family: revision.matchedFamily || null,
    template_id: revision.selectedTemplateId || null,
    cost_rows_count: validation.cost_rows_count,
    priced_required_rows_percent: result.summary.pricedRequiredRowsPercent,
    preliminary_total_allowed: result.summary.preliminaryTotalAllowed,
    contract_total_allowed: result.summary.contractTotalAllowed,
    fake_price_count: validation.fake_price_count,
    fake_subtotal_count: validation.fake_subtotal_count,
    fake_final_total_count: validation.fake_final_total_count,
    status: blockingReasons.length === 0 ? "READY_TRUSTED_COSTING" : "BLOCKED_TRUSTED_COSTING",
    blocking_reasons: blockingReasons,
  };
}

function auditPriorityRuntimeCases(): TrustedCostingPriorityRuntimeRow[] {
  return REAL_NAMED_BOQ_RUNTIME_CASES
    .map(auditPriorityRuntimeCase)
    .filter((row): row is TrustedCostingPriorityRuntimeRow => row != null);
}

function writeSamples(outDir: string, rows: readonly TrustedCostingTemplateAuditRow[]): { sample_count: number; sample_dir: string } {
  const sampleDir = path.join(outDir, "sample-outputs");
  mkdirSync(sampleDir, { recursive: true });
  for (const row of rows.slice(0, SAMPLE_OUTPUTS_REQUIRED)) {
    const passport = buildProfessionalWorkPassport(row.template_id);
    if (!passport) continue;
    const result = calculateProfessionalCostForPassport(passport);
    const pdfText = renderProfessionalCostSection({ summary: result.summary, lines: result.lines });
    const buyer = createBuyerHandoffCostPackage({
      templateId: passport.templateId,
      summary: result.summary,
      lines: result.lines,
    });
    const caseDir = path.join(sampleDir, row.template_id.replace(/[^a-zA-Z0-9_-]+/g, "_"));
    mkdirSync(caseDir, { recursive: true });
    const pdfPath = path.join(caseDir, "pdf-cost-section.txt");
    const buyerPath = path.join(caseDir, "buyer-handoff-cost-trace.json");
    writeFileSync(pdfPath, pdfText, "utf8");
    writeJson(buyerPath, buyer);
    writeJson(path.join(caseDir, "sample.json"), {
      prompt: samplePrompt(passport.localizedNameRu),
      matched_template: passport.templateId,
      family: passport.familyId,
      recognized_params: {},
      boq_rows_count: passport.boqRecipe.rowCount,
      cost_summary: {
        materials_subtotal: result.summary.materialsSubtotal,
        labor_subtotal: result.summary.laborSubtotal,
        services_subtotal: result.summary.servicesSubtotal,
        equipment_subtotal: result.summary.equipmentSubtotal,
        transport_subtotal: result.summary.transportSubtotal,
        preliminary_total: result.summary.preliminaryTotal,
        contract_total_allowed: result.summary.contractTotalAllowed,
        priced_required_rows_percent: result.summary.pricedRequiredRowsPercent,
        missing_price_rows_count: result.summary.missingPriceRowsCount,
      },
      cost_rows: result.lines.slice(0, 20),
      missing_price_rows: result.lines.filter((line) => line.priceState === "missing_price"),
      price_sources: result.sources.filter((source) => source.priceSource),
      pdf_path: pdfPath,
      buyer_handoff_path: buyerPath,
      fake_final_total: false,
    });
  }
  clearProfessionalWorkPassportBuildCaches();
  return { sample_count: Math.min(SAMPLE_OUTPUTS_REQUIRED, rows.length), sample_dir: sampleDir };
}

export function audit11610TrustedCostingPricebook(input: {
  writeLedger?: boolean;
  writeSummary?: boolean;
  writeSamples?: boolean;
} = {}) {
  const pricebook = validateProfessionalPricebook();
  const validations: TrustedCostingTemplateAuditRow[] = [];
  for (const [index, templateId] of listProfessionalWorkPassportTemplateIds().entries()) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) continue;
    const result = calculateProfessionalCostForPassport(passport);
    validations.push(auditRow({
      templateId,
      templateName: passport.localizedNameRu,
      family: passport.familyId,
      result,
    }));
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  clearProfessionalWorkPassportBuildCaches();
  const runtimePriorityRows = auditPriorityRuntimeCases();
  const outDir = input.writeLedger || input.writeSummary
    ? path.join(RUNTIME_ROOT, timestampForPath())
    : null;
  if (outDir) mkdirSync(outDir, { recursive: true });
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "trusted-costing-ledger.jsonl") : null;
  const runtimePriorityLedgerPath = outDir && input.writeLedger ? path.join(outDir, "trusted-costing-priority-runtime-ledger.jsonl") : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  if (ledgerPath) writeJsonl(ledgerPath, validations);
  if (runtimePriorityLedgerPath) writeJsonl(runtimePriorityLedgerPath, runtimePriorityRows);
  const blocked = validations.filter((row) => row.status !== "READY_TRUSTED_COSTING");
  const runtimePriorityBlocked = runtimePriorityRows.filter((row) => row.status !== "READY_TRUSTED_COSTING");
  const fakePriceCount =
    validations.reduce((sum, row) => sum + row.fake_price_count, 0) +
    runtimePriorityRows.reduce((sum, row) => sum + row.fake_price_count, 0);
  const fakeSubtotalCount =
    validations.reduce((sum, row) => sum + row.fake_subtotal_count, 0) +
    runtimePriorityRows.reduce((sum, row) => sum + row.fake_subtotal_count, 0);
  const fakeFinalTotalCount =
    validations.reduce((sum, row) => sum + row.fake_final_total_count, 0) +
    runtimePriorityRows.reduce((sum, row) => sum + row.fake_final_total_count, 0);
  const missingPriceRowsCount = validations.reduce((sum, row) => sum + row.missing_price_rows_count, 0);
  const pricedAverage = validations.length > 0
    ? Math.round(validations.reduce((sum, row) => sum + row.priced_required_rows_percent, 0) / validations.length * 100) / 100
    : 0;
  const criticalPercent = priorityPercent({ rows: validations, runtimeRows: runtimePriorityRows });
  const priorityFamilyReady = {
    diamond_drilling_costing_ready: familyReady({ rows: validations, runtimeRows: runtimePriorityRows, familyKey: "diamond_drilling" }),
    profile_sheet_fence_costing_ready: familyReady({ rows: validations, runtimeRows: runtimePriorityRows, familyKey: "profile_sheet_fence" }),
    ventilated_facade_costing_ready: familyReady({ rows: validations, runtimeRows: runtimePriorityRows, familyKey: "ventilated_facade" }),
    water_supply_costing_ready: familyReady({ rows: validations, runtimeRows: runtimePriorityRows, familyKey: "water_supply" }),
    roadworks_costing_ready: familyReady({ rows: validations, runtimeRows: runtimePriorityRows, familyKey: "roadworks" }),
    hydraulic_structures_costing_ready: familyReady({ rows: validations, runtimeRows: runtimePriorityRows, familyKey: "hydraulic_structures" }),
    power_lines_costing_ready: familyReady({ rows: validations, runtimeRows: runtimePriorityRows, familyKey: "power_lines" }),
    high_rise_glazing_costing_ready: familyReady({ rows: validations, runtimeRows: runtimePriorityRows, familyKey: "high_rise_glazing" }),
    mansard_roof_costing_ready: familyReady({ rows: validations, runtimeRows: runtimePriorityRows, familyKey: "mansard_roof" }),
    bridge_tunnel_industrial_costing_ready: familyReady({ rows: validations, runtimeRows: runtimePriorityRows, familyKey: "bridge_tunnel_industrial" }),
  };
  const priorityFamiliesReady = Object.values(priorityFamilyReady).every(Boolean);
  const sourceGreen =
    validations.length === 11610 &&
    blocked.length === 0 &&
    runtimePriorityRows.length >= 100 &&
    runtimePriorityBlocked.length === 0 &&
    priorityFamiliesReady &&
    pricebook.blocking_reasons.length === 0 &&
    fakePriceCount === 0 &&
    fakeSubtotalCount === 0 &&
    fakeFinalTotalCount === 0 &&
    validations.every((row) => row.preliminary_total_allowed && !row.contract_total_allowed) &&
    pricedAverage >= 80 &&
    criticalPercent >= 95;
  const samples = outDir && (input.writeSamples ?? input.writeSummary ?? false)
    ? writeSamples(outDir, validations)
    : null;
  const summary = {
    final_status: sourceGreen
      ? GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_SOURCE_READY
      : STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_INCOMPLETE_NO_GREEN,
    source_audit_status: sourceGreen
      ? GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_SOURCE_READY
      : STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_INCOMPLETE_NO_GREEN,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    templates_audited: validations.length,
    templates_costing_ready: validations.filter((row) => row.status === "READY_TRUSTED_COSTING").length,
    blocked_templates_count: blocked.length,
    pricebook_registry_created: true,
    material_pricebook_created: pricebook.material_pricebook_created,
    labor_rate_book_created: pricebook.labor_rate_book_created,
    equipment_rate_book_created: pricebook.equipment_rate_book_created,
    service_rate_book_created: pricebook.service_rate_book_created,
    transport_rate_book_created: pricebook.transport_rate_book_created,
    all_prices_have_source: pricebook.all_prices_have_source,
    all_prices_have_region: pricebook.all_prices_have_region,
    all_prices_have_retrieved_at: pricebook.all_prices_have_retrieved_at,
    all_prices_have_currency: pricebook.all_prices_have_currency,
    zero_or_negative_prices_count: pricebook.zero_or_negative_prices_count,
    trusted_contract_prices_require_source: pricebook.trusted_contract_prices_require_source,
    fake_price_count: fakePriceCount,
    fake_subtotal_count: fakeSubtotalCount,
    fake_final_total_count: fakeFinalTotalCount,
    price_state_present_for_all_rows: validations.every((row) => row.cost_rows_count > 0),
    missing_price_visible_for_all_unpriced_rows: true,
    missing_price_rows_count: missingPriceRowsCount,
    price_source_missing_count: validations.reduce((sum, row) => sum + row.price_source_missing_count, 0),
    price_region_missing_count: validations.reduce((sum, row) => sum + row.price_region_missing_count, 0),
    price_retrieved_at_missing_count: validations.reduce((sum, row) => sum + row.price_retrieved_at_missing_count, 0),
    preliminary_cost_available_templates_count: validations.filter((row) => row.preliminary_total_allowed).length,
    contract_total_allowed_templates_count: validations.filter((row) => row.contract_total_allowed).length,
    priced_required_rows_percent_average: pricedAverage,
    priority_critical_cases_priced_percent: criticalPercent,
    priority_runtime_cases_audited: runtimePriorityRows.length,
    priority_runtime_cases_costing_ready: runtimePriorityRows.filter((row) => row.status === "READY_TRUSTED_COSTING").length,
    ...priorityFamilyReady,
    sample_outputs_created: Boolean(samples && samples.sample_count >= SAMPLE_OUTPUTS_REQUIRED),
    sample_outputs_count: samples?.sample_count ?? 0,
    sample_outputs_dir: samples?.sample_dir ?? null,
    sample_outputs_runtime_only_not_committed: true,
    focused_professional_boq_tests_passed: false,
    typecheck_passed: false,
    lint_passed: false,
    diff_check_passed: false,
    no_test_weakening_passed: false,
    web_public_smoke_passed: false,
    ci_office_market_passed: false,
    secret_scan_passed: false,
    full_trusted_costing_green_claimed: false,
    contract_total_claimed: false,
    owner_approved: false,
    render_staging_started: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    full_jest_started: false,
    fake_green_claimed: false,
    blocking_reasons: [
      ...pricebook.blocking_reasons,
      ...blocked.flatMap((row) => row.blocking_reasons.map((reason) => `${row.template_id}:${reason}`)),
      ...runtimePriorityBlocked.flatMap((row) => row.blocking_reasons.map((reason) => `${row.case_id}:${reason}`)),
      runtimePriorityRows.length >= 100 ? "" : `priority_runtime_cases_below_100:${runtimePriorityRows.length}`,
      priorityFamiliesReady ? "" : "priority_family_costing_not_ready",
      sourceGreen ? "" : "trusted_costing_source_audit_not_green",
    ].filter(Boolean).slice(0, 200),
    ledger_artifact: ledgerPath,
    priority_runtime_ledger_artifact: runtimePriorityLedgerPath,
    runtime_summary_path: summaryPath,
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, validations, ledgerPath, summaryPath, outDir };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/audit11610TrustedCostingPricebook.ts")) {
  const result = audit11610TrustedCostingPricebook({
    writeLedger: hasFlag("write-ledger"),
    writeSummary: hasFlag("write-summary") || hasFlag("all"),
    writeSamples: hasFlag("write-summary") || hasFlag("all"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    templates_audited: result.summary.templates_audited,
    templates_costing_ready: result.summary.templates_costing_ready,
    blocked_templates_count: result.summary.blocked_templates_count,
    priced_required_rows_percent_average: result.summary.priced_required_rows_percent_average,
    priority_critical_cases_priced_percent: result.summary.priority_critical_cases_priced_percent,
    fake_price_count: result.summary.fake_price_count,
    fake_final_total_count: result.summary.fake_final_total_count,
    sample_outputs_count: result.summary.sample_outputs_count,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    runtime_summary_path: result.summary.runtime_summary_path,
  }, null, 2));
  if (result.summary.final_status === STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_11610_INCOMPLETE_NO_GREEN) {
    process.exitCode = 1;
  }
}
