import crypto from "node:crypto";

import { calculateProfessionalRecipeRowQuantity } from "./professionalQuantityFormulaEngine";
import { currencyForProfessionalRegion } from "./professionalCurrencyPolicy";
import {
  pricebookSnapshotIdForRegion,
  resolveProfessionalPricebookRow,
} from "./professionalPricebookBinder";
import { buildProfessionalVisibleRows } from "./professionalEstimatePresentationPolicy";
import { resolveProfessionalWorkTemplate } from "./workTemplateResolver";
import type {
  ProfessionalEstimateCaseUnit,
  ProfessionalEstimateLine,
  ProfessionalEstimateRecipeRow,
  ProfessionalEstimateSnapshot,
  ProfessionalGroupKey,
  ProfessionalGovernedPrice,
  ProfessionalRegion,
} from "./professionalEstimateTypes";

export type ProfessionalRowForLeakDetection =
  | ProfessionalEstimateRecipeRow
  | ProfessionalEstimateLine;

export type ProfessionalCrossDomainRowLeak = {
  status: "BLOCKED_CROSS_DOMAIN_ROW_LEAK";
  selected_work_key: string;
  leaked_row_key: string;
  leaked_row: string;
  leaked_domain: ProfessionalGroupKey | "unknown";
  expected_domain: ProfessionalGroupKey;
  reason:
    | "ROW_DOMAIN_MISMATCH"
    | "ROW_NOT_ALLOWED_FOR_WORK"
    | "ROW_FORBIDDEN_FOR_WORK"
    | "FORBIDDEN_TERM_FOR_DOMAIN";
  matched_term?: string;
  fake_green_claimed: false;
};

const FORBIDDEN_TERMS_BY_EXPECTED_DOMAIN: Partial<Record<ProfessionalGroupKey, readonly RegExp[]>> = {
  flooring: [
    /РєРёСЂРїРёС‡|РљРёСЂРїРёС‡|brick/i,
    /(^|[^Р°-СЏС‘])(?:РєР»Р°РґРєР°|РєР»Р°РґРѕС‡|masonry)([^Р°-СЏС‘]|$)/i,
    /Р°СЂРјР°С‚СѓСЂ|rebar/i,
    /Р±РµС‚РѕРЅ\s*b?\s*25|concrete\s*b?\s*25/i,
    /РєСЂРѕРІРµР»СЊРЅ|roofing\s+membrane/i,
    /РІРѕРґРѕРїСЂРѕРІРѕРґ|water\s+pipe|plumbing\s+pipe/i,
    /РєР°Р±РµР»СЊ|cable/i,
  ],
  tile_stone: [/РєСЂРѕРІРµР»СЊРЅ|(^|[^a-z])roofing([^a-z]|$)|СЃС‚СЂРѕРїРёР»|rafter/i],
  roofing: [/РІРѕРґРѕРїСЂРѕРІРѕРґ|РєР°РЅР°Р»РёР·Р°С†|plumbing|ppr\s+pipe|sewer\s+pipe/i],
  electrical_power: [/Р±РµС‚РѕРЅ\s*b?\s*25|concrete\s*b?\s*25|Р°СЂРјР°С‚СѓСЂ|rebar/i],
  plumbing_sewerage: [/low\s+voltage|СЃР»Р°Р±РѕС‚РѕС‡|cctv|РґРѕРјРѕС„РѕРЅ|internet|network\s+cable/i],
  foundation_concrete: [/РєРѕРІСЂРѕР»РёРЅ|carpet|Р»РёРЅРѕР»РµСѓРј|linoleum|Р»Р°РјРёРЅР°С‚|laminate/i],
};

function rowAllowedForWork(row: ProfessionalRowForLeakDetection, selectedWorkKey: string): boolean {
  const allowed = "allowed_work_keys" in row ? row.allowed_work_keys : [selectedWorkKey];
  return allowed.length === 0 || allowed.includes(selectedWorkKey);
}

function rowForbiddenForWork(row: ProfessionalRowForLeakDetection, selectedWorkKey: string): boolean {
  const forbidden = "forbidden_work_keys" in row ? row.forbidden_work_keys : [];
  return forbidden.includes(selectedWorkKey);
}

function detectForbiddenTerm(input: {
  selectedWorkKey: string;
  expectedDomain: ProfessionalGroupKey;
  rowText: string;
}): string | null {
  const patterns = [
    ...(FORBIDDEN_TERMS_BY_EXPECTED_DOMAIN[input.expectedDomain] ?? []),
    ...(input.selectedWorkKey === "roof_waterproofing" ? [/РІР°РЅРЅ|СЃР°РЅСѓР·РµР»|РєР°С„РµР»СЊ|bathroom|tile/i] : []),
  ];
  const match = patterns.find((pattern) => pattern.test(input.rowText));
  return match?.source ?? null;
}

export function detectCrossDomainRowLeaks(input: {
  selected_work_key: string;
  expected_domain?: ProfessionalGroupKey;
  rows: readonly ProfessionalRowForLeakDetection[];
}): ProfessionalCrossDomainRowLeak[] {
  const template = resolveProfessionalWorkTemplate(input.selected_work_key);
  const expectedDomain = input.expected_domain ?? template?.group_key;
  if (!expectedDomain) {
    throw new Error(`PROFESSIONAL_TEMPLATE_NOT_SUPPORTED:${input.selected_work_key}`);
  }

  const leaks: ProfessionalCrossDomainRowLeak[] = [];
  for (const row of input.rows) {
    if (row.row_domain !== expectedDomain) {
      leaks.push({
        status: "BLOCKED_CROSS_DOMAIN_ROW_LEAK",
        selected_work_key: input.selected_work_key,
        leaked_row_key: row.row_key,
        leaked_row: row.visible_name_ru,
        leaked_domain: row.row_domain ?? "unknown",
        expected_domain: expectedDomain,
        reason: "ROW_DOMAIN_MISMATCH",
        fake_green_claimed: false,
      });
      continue;
    }

    if (!rowAllowedForWork(row, input.selected_work_key)) {
      leaks.push({
        status: "BLOCKED_CROSS_DOMAIN_ROW_LEAK",
        selected_work_key: input.selected_work_key,
        leaked_row_key: row.row_key,
        leaked_row: row.visible_name_ru,
        leaked_domain: row.row_domain,
        expected_domain: expectedDomain,
        reason: "ROW_NOT_ALLOWED_FOR_WORK",
        fake_green_claimed: false,
      });
      continue;
    }

    if (rowForbiddenForWork(row, input.selected_work_key)) {
      leaks.push({
        status: "BLOCKED_CROSS_DOMAIN_ROW_LEAK",
        selected_work_key: input.selected_work_key,
        leaked_row_key: row.row_key,
        leaked_row: row.visible_name_ru,
        leaked_domain: row.row_domain,
        expected_domain: expectedDomain,
        reason: "ROW_FORBIDDEN_FOR_WORK",
        fake_green_claimed: false,
      });
      continue;
    }

    const matchedTerm = detectForbiddenTerm({
      selectedWorkKey: input.selected_work_key,
      expectedDomain,
      rowText: `${row.visible_name_ru} ${row.row_key} ${"material_key" in row ? row.material_key : ""}`,
    });
    if (matchedTerm) {
      leaks.push({
        status: "BLOCKED_CROSS_DOMAIN_ROW_LEAK",
        selected_work_key: input.selected_work_key,
        leaked_row_key: row.row_key,
        leaked_row: row.visible_name_ru,
        leaked_domain: row.row_domain,
        expected_domain: expectedDomain,
        reason: "FORBIDDEN_TERM_FOR_DOMAIN",
        matched_term: matchedTerm,
        fake_green_claimed: false,
      });
    }
  }

  return leaks;
}

export function assertNoCrossDomainRows(input: {
  selected_work_key: string;
  expected_domain: ProfessionalGroupKey;
  rows: readonly ProfessionalRowForLeakDetection[];
}): void {
  const leaks = detectCrossDomainRowLeaks(input);
  if (leaks.length === 0) return;

  const carpetMasonryLeak = input.selected_work_key === "carpet_laying" &&
    leaks.some((leak) => leak.expected_domain === "flooring" && /brick|masonry|РєРёСЂРїРёС‡|РєР»Р°Рґ/i.test(leak.leaked_row));
  const blocker = carpetMasonryLeak
    ? "BLOCKED_CROSS_DOMAIN_ROW_LEAK_CARPET_USES_MASONRY_ROWS"
    : "BLOCKED_CROSS_DOMAIN_ROW_LEAK";

  throw new Error(`${blocker}:${JSON.stringify(leaks.slice(0, 5))}`);
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

export function professionalSha256(value: unknown): string {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

export function buildProfessionalEstimateSnapshot(input: {
  selected_work_key: string;
  quantity: number;
  unit: ProfessionalEstimateCaseUnit;
  region: ProfessionalRegion;
  pricebook?: readonly ProfessionalGovernedPrice[];
}): ProfessionalEstimateSnapshot {
  const template = resolveProfessionalWorkTemplate(input.selected_work_key);
  if (!template || !template.supported) {
    throw new Error(`PROFESSIONAL_TEMPLATE_NOT_SUPPORTED:${input.selected_work_key}`);
  }
  const allRows = [
    ...template.material_recipe_rows,
    ...template.labor_rows,
    ...template.equipment_rows,
    ...template.delivery_rows,
    ...template.overhead_rows,
  ];
  assertNoCrossDomainRows({
    selected_work_key: input.selected_work_key,
    expected_domain: template.group_key,
    rows: allRows,
  });
  const lines: ProfessionalEstimateLine[] = allRows.map((row) => {
    const formula = calculateProfessionalRecipeRowQuantity(row, {
      quantity: input.quantity,
      unit: input.unit,
    });
    if (formula.parse_failed || formula.value === null || formula.negative_quantity || formula.nan_quantity) {
      throw new Error(`PROFESSIONAL_FORMULA_FAILED:${row.row_key}:${row.quantity_formula}`);
    }
    const price = resolveProfessionalPricebookRow({
      row,
      quantity: formula.value,
      region: input.region,
      pricebook: input.pricebook,
    });
    return {
      row_key: row.row_key,
      row_kind: row.row_kind,
      row_domain: row.row_domain,
      visible_name_ru: row.visible_name_ru,
      material_key: row.material_key,
      unit: row.unit,
      quantity: formula.value,
      waste_percent: row.waste_percent,
      price_required: row.price_required,
      price,
      source_policy: row.source_policy,
      paid_control_row: row.paid_control_row,
      forbidden_as_paid_control_row: row.forbidden_as_paid_control_row,
    };
  });
  assertNoCrossDomainRows({
    selected_work_key: input.selected_work_key,
    expected_domain: template.group_key,
    rows: lines,
  });
  const visibleRows = buildProfessionalVisibleRows(lines);
  const missingPriceRows = lines.filter((line) => line.price_required && line.price.price_status === "PRICE_MISSING").length;
  const knownTotals = lines
    .map((line) => line.price.line_total)
    .filter((value): value is number => typeof value === "number");
  const payload = {
    selected_work_key: input.selected_work_key,
    group_key: template.group_key,
    template_version: template.version,
    material_recipe_version: template.material_recipe_version,
    region: input.region,
    currency: currencyForProfessionalRegion(input.region),
    quantity: input.quantity,
    unit: input.unit,
    rows: visibleRows,
  };
  const rowsHash = professionalSha256(stableJson(payload));
  return {
    snapshot_id: professionalSha256(`${input.selected_work_key}|${template.version}|${input.region}|${input.quantity}|${input.unit}`).slice(0, 32),
    selected_work_key: input.selected_work_key,
    group_key: template.group_key,
    template_version: template.version,
    material_recipe_version: template.material_recipe_version,
    pricebook_snapshot_id: pricebookSnapshotIdForRegion(input.region),
    region: input.region,
    currency: currencyForProfessionalRegion(input.region),
    quantity: input.quantity,
    unit: input.unit,
    lines,
    visible_rows: visibleRows,
    totals: {
      estimate_total_status: missingPriceRows > 0 ? "PARTIAL_PRICE_MISSING" : "COMPLETE",
      known_total: missingPriceRows > 0 ? null : Number(knownTotals.reduce((sum, value) => sum + value, 0).toFixed(2)),
      missing_price_rows_count: missingPriceRows,
      currency: currencyForProfessionalRegion(input.region),
    },
    ui_payload_hash: rowsHash,
    pdf_payload_hash: rowsHash,
    request_payload_hash: rowsHash,
    history_payload_hash: rowsHash,
    all_hashes_match: true,
    ui_repriced_after_snapshot: false,
    pdf_repriced_after_snapshot: false,
    history_repriced_after_snapshot: false,
    fake_green_claimed: false,
  };
}
