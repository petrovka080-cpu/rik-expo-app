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
  ProfessionalEstimateSnapshot,
  ProfessionalGovernedPrice,
  ProfessionalRegion,
} from "./professionalEstimateTypes";

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
      visible_name_ru: row.visible_name_ru,
      material_key: row.material_key,
      unit: row.unit,
      quantity: formula.value,
      waste_percent: row.waste_percent,
      price_required: row.price_required,
      price,
      forbidden_as_paid_control_row: row.forbidden_as_paid_control_row,
    };
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
