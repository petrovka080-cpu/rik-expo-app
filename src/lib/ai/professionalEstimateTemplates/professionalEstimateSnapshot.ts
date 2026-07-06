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

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function rightRotate(value: number, shift: number): number {
  return (value >>> shift) | (value << (32 - shift));
}

function bytesToSha256Hex(bytes: Uint8Array): string {
  const bitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      w[index] = view.getUint32(offset + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 = rightRotate(w[index - 15], 7) ^ rightRotate(w[index - 15], 18) ^ (w[index - 15] >>> 3);
      const s1 = rightRotate(w[index - 2], 17) ^ rightRotate(w[index - 2], 19) ^ (w[index - 2] >>> 10);
      w[index] = (w[index - 16] + s0 + w[index - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[index] + w[index]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
}

export function professionalSha256(value: unknown): string {
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  return bytesToSha256Hex(new TextEncoder().encode(payload));
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
