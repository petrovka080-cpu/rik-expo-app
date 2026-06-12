import {
  buildGlobalEstimateInputWithSelectedWork,
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
  formatEstimateUnitLabel,
  type GlobalEstimateInput,
  type SourceBackedEstimateRow,
} from "../globalEstimate";
import { normalizeRuText } from "../../text/encoding";
import type { EstimatePdfViewModel } from "../../estimatePdf";
import {
  EXACT_MATERIAL_PRICEBOOK_DATE,
  EXACT_MATERIAL_PRICEBOOK_REGION,
  resolveExactMaterialRate,
} from "./exactMaterialPricebook";
import type {
  ExactEstimateCatalogBindingRow,
  ExactEstimateTotalStatus,
  ExactEstimateVisibleRow,
  ExactMaterialCurrency,
  ExactMaterialPriceEstimate,
  ExactMaterialPriceEstimateInput,
  ExactMaterialPriceLine,
  ExactPriceSourceAuditTrail,
  ExactRecipeMaterialRow,
  WorkMaterialRecipe,
} from "./exactMaterialPriceEstimateTypes";

export const EXACT_MATERIAL_PRICE_ESTIMATE_WAVE =
  "S_USER_INPUT_TO_EXACT_MATERIAL_PRICE_ESTIMATE_CLOSEOUT_POINT_OF_NO_RETURN";

export const EXACT_MATERIAL_PRICE_ESTIMATE_GREEN_STATUS =
  "GREEN_USER_INPUT_TO_EXACT_MATERIAL_PRICE_ESTIMATE_READY";

export const REQUIRED_EXACT_MATERIAL_WORK_COVERAGE = Object.freeze([
  { requirement: "roof waterproofing", workKey: "roof_waterproofing" },
  { requirement: "foundation waterproofing", workKey: "foundation_waterproofing" },
  { requirement: "bathroom waterproofing", workKey: "bathroom_waterproofing" },
  { requirement: "floor screed", workKey: "floor_screed" },
  { requirement: "wall plastering", workKey: "wall_plastering" },
  { requirement: "tile installation", workKey: "ceramic_tile_laying" },
  { requirement: "wall painting", workKey: "wall_painting" },
  { requirement: "facade painting", workKey: "facade_painting" },
  { requirement: "electrical wiring", workKey: "electrical_wiring" },
  { requirement: "plumbing", workKey: "plumbing_basic" },
  { requirement: "heating", workKey: "heating_radiator_installation" },
  { requirement: "concrete slab", workKey: "concrete_floor_slab" },
  { requirement: "foundation concrete", workKey: "foundation_concrete_pour" },
  { requirement: "brick masonry", workKey: "brick_masonry" },
  { requirement: "block masonry", workKey: "block_masonry" },
  { requirement: "drywall partition", workKey: "drywall_partition" },
  { requirement: "roofing", workKey: "gable_roof_installation" },
  { requirement: "insulation", workKey: "facade_insulation" },
  { requirement: "earthworks", workKey: "foundation_excavation" },
  { requirement: "excavation", workKey: "excavation_demolition" },
  { requirement: "backfill", workKey: "foundation_backfill" },
  { requirement: "paving", workKey: "paving_stone_laying" },
  { requirement: "window installation", workKey: "window_installation" },
  { requirement: "door installation", workKey: "door_installation" },
  { requirement: "ceiling installation", workKey: "suspended_ceiling" },
  { requirement: "floor laminate", workKey: "laminate_laying" },
  { requirement: "floor parquet", workKey: "parquet_laying" },
  { requirement: "sanitary installation", workKey: "bathroom_plumbing_turnkey" },
] as const);

const PRICE_MISSING = "PRICE_MISSING";
const PARTIAL_STATUS: ExactEstimateTotalStatus = "PARTIAL_PRICE_MISSING";
const COMPLETE_STATUS: ExactEstimateTotalStatus = "COMPLETE";
const SUPPLIER_NOT_DECLARED_RU = "\u041f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a \u043d\u0435 \u0437\u0430\u044f\u0432\u043b\u0435\u043d";
const EXACT_TITLE_RU = "\u0422\u043e\u0447\u043d\u0430\u044f \u0441\u043c\u0435\u0442\u0430 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432";

const GENERIC_MATERIAL_NAME_PATTERN =
  /^(?:Основной материал|Дополнительные материалы|Материалы подготовки|Запас\s*\/\s*расходники|Расходные материалы)/i;

const MATERIAL_NAME_OVERRIDES: Record<string, string> = {
  floor_screed_material_extra_3: "Полиэтиленовая пленка и демпферная лента",
  floor_screed_material_extra_4: "Фиброволокно и крепеж маяков",
  wall_plastering_material_extra_3: "Уголки, серпянка и крепеж маяков",
  wall_plastering_material_extra_4: "Локальная шпаклевка под штукатурку",
  wall_painting_material_extra_3: "Малярная лента и защитная пленка",
  wall_painting_material_extra_4: "Шпаклевка локальных дефектов",
  facade_painting_material_extra_3: "Малярная лента для фасада и пленка",
  facade_painting_material_extra_4: "Ремонтная фасадная шпаклевка",
  electrical_wiring_material_extra_4: "Клеммы, подрозетники и крепеж кабеля",
  plumbing_basic_main_material: "Трубы и фитинги водоснабжения",
  plumbing_basic_auxiliary: "Сантехнический крепеж и уплотнители",
  plumbing_basic_preparation_materials: "Гильзы и расходники для проходок",
  plumbing_basic_waste_allowance: "Резерв фитингов и прокладок",
  heating_radiator_installation_material_extra_3: "Запорная арматура для радиаторов",
  heating_radiator_installation_material_extra_4: "Уплотнители и монтажные расходники отопления",
  concrete_slab_material_extra_3: "Фиксаторы арматуры и вязальная проволока",
  concrete_slab_material_extra_4: "Пленка для ухода за бетоном",
  foundation_concrete_pour_material_extra_4: "Фиксаторы арматуры, пленка и вязальная проволока",
  block_masonry_material_extra_3: "Кладочная сетка для блоков",
  block_masonry_material_extra_4: "Анкеры и армирующие элементы кладки",
  facade_insulation_material_extra_4: "Армирующая сетка, уголки и дюбельные шайбы",
  door_installation_main_material: "Дверной блок",
  door_installation_auxiliary: "Пена, анкеры и крепеж двери",
  door_installation_preparation_materials: "Клинья и монтажные пластины двери",
  door_installation_waste_allowance: "Резерв крепежа и герметика двери",
  parquet_laying_material_extra_3: "Клей, подложка и крепеж паркета",
  parquet_laying_material_extra_4: "Плинтус и пороги для паркета",
  suspended_ceiling_main_material: "Плиты и подвесная система потолка",
  suspended_ceiling_auxiliary: "Подвесы, крепеж и пристенный профиль",
  foundation_excavation_main_material: "Грунт разработки и вывоз",
  foundation_backfill_main_material: "Песок и послойная обратная засыпка",
  excavation_demolition_main_material: "Разработка грунта и погрузка",
  bathroom_plumbing_turnkey_main_material: "Сантехнические приборы, трубы и фитинги",
  bathroom_plumbing_turnkey_auxiliary: "Крепеж, герметик и уплотнители сантехники",
};

function stableId(prefix: string, value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return `${prefix}_${Math.abs(hash)}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(round2(value)).replace(/\u00a0/g, " ");
}

function formatMoney(value: number | null, currency: ExactMaterialCurrency): string {
  if (value == null || !Number.isFinite(value)) return PRICE_MISSING;
  const formatted = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(value)).replace(/\u00a0/g, " ");
  return `${formatted} ${currency}`;
}

function safeVisibleText(value: string): string {
  const normalized = String(normalizeRuText(value) ?? value)
    .replace(/\uFFFD+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.replace(/:\s*$/g, "").trim();
}

function materialRows(estimate: ExactMaterialPriceEstimate["source_global_estimate"]) {
  return estimate.sections
    .filter((section) => section.type === "materials")
    .flatMap((section) => section.rows)
    .filter((row) => Number.isFinite(row.quantity) && row.quantity > 0);
}

function laborRows(estimate: ExactMaterialPriceEstimate["source_global_estimate"]) {
  return estimate.sections.filter((section) => section.type === "labor").flatMap((section) => section.rows);
}

function materialIdForRow(row: SourceBackedEstimateRow): string {
  return row.rateKey ?? row.materialKey ?? row.code;
}

function visibleMaterialName(row: SourceBackedEstimateRow): string {
  const override = MATERIAL_NAME_OVERRIDES[row.code];
  if (override) return override;
  const normalized = safeVisibleText(row.name);
  if (GENERIC_MATERIAL_NAME_PATTERN.test(normalized)) {
    return safeVisibleText(row.materialKey ?? row.rateKey ?? row.code).replace(/[_-]+/g, " ");
  }
  return normalized;
}

function consumptionPerUnit(row: SourceBackedEstimateRow, baseQuantity: number): number {
  if (!Number.isFinite(baseQuantity) || baseQuantity <= 0) return round6(row.quantity);
  return round6(row.quantity / baseQuantity);
}

function formulaForRow(row: SourceBackedEstimateRow, baseQuantity: number): string {
  const perUnit = consumptionPerUnit(row, baseQuantity);
  return `quantity * ${perUnit}`;
}

function sourceLabel(line: Pick<ExactMaterialPriceLine,
  "price_status" | "region" | "price_captured_at" | "valid_from" | "confidence" | "source_type" | "source_reference" | "supplier_visible_name" | "validation_failures"
>): string {
  if (line.price_status !== "VERIFIED") {
    const failures = line.validation_failures.length > 0 ? `; ${line.validation_failures.join("|")}` : "";
    return `${line.price_status}; region ${line.region}; price date ${EXACT_MATERIAL_PRICEBOOK_DATE}; confidence ${line.confidence}${failures}`;
  }
  const supplier = line.supplier_visible_name ?? SUPPLIER_NOT_DECLARED_RU;
  const sourceType = String(line.source_type ?? "pricebook").replace(/[_-]+/g, " ");
  return `${sourceType}; region ${line.region}; price date ${line.valid_from ?? line.price_captured_at ?? EXACT_MATERIAL_PRICEBOOK_DATE}; ${supplier}; confidence ${line.confidence}; ${line.source_reference ?? ""}`.trim();
}

function exactRecipeRows(rows: SourceBackedEstimateRow[], baseQuantity: number): ExactRecipeMaterialRow[] {
  return rows.map((row) => ({
    material_id: materialIdForRow(row),
    material_visible_name_ru: visibleMaterialName(row),
    consumption_per_unit: consumptionPerUnit(row, baseQuantity),
    consumption_unit: row.unit,
    waste_percent: 0,
    formula: formulaForRow(row, baseQuantity),
    required: true,
    price_required: true,
    source_row_code: row.code,
    source_rate_key: row.rateKey ?? null,
  }));
}

function buildRecipe(estimate: ExactMaterialPriceEstimate["source_global_estimate"]): WorkMaterialRecipe {
  const rows = materialRows(estimate);
  const baseQuantity = estimate.input.volume;
  return {
    work_key: estimate.work.workKey,
    work_visible_name_ru: safeVisibleText(estimate.work.title),
    category: estimate.work.category,
    base_unit: estimate.input.unit as WorkMaterialRecipe["base_unit"],
    material_rows: exactRecipeRows(rows, baseQuantity),
    labor_rows: laborRows(estimate).map((row) => ({
      labor_key: row.rateKey ?? row.code,
      labor_visible_name_ru: safeVisibleText(row.name),
      norm_per_unit: consumptionPerUnit(row, baseQuantity),
      unit: row.unit,
    })),
    control_rows: [],
  };
}

function buildMaterialLines(input: {
  recipe: WorkMaterialRecipe;
  sourceRows: SourceBackedEstimateRow[];
  region: string;
  priceDate: string;
  currency: ExactMaterialCurrency;
}): ExactMaterialPriceLine[] {
  return input.recipe.material_rows.map((recipeRow, index) => {
    const row = input.sourceRows[index];
    const resolution = resolveExactMaterialRate({
      materialId: recipeRow.material_id,
      rateKey: recipeRow.source_rate_key,
      unit: row.unit,
      region: input.region,
      priceDate: input.priceDate,
      currency: input.currency,
    });
    const priceSourceAudit: ExactPriceSourceAuditTrail = resolution.price_source_audit ?? {
      selected_rate_id: null,
      material_id: recipeRow.material_id,
      requested_rate_key: recipeRow.source_rate_key,
      unit: row.unit,
      region: resolution.region,
      currency: input.currency,
      price_date: input.priceDate,
      price_status: resolution.price_status,
      source_type: resolution.source_type,
      source_reference: resolution.source_reference,
      supplier_id: resolution.supplier_id,
      supplier_visible_name: resolution.supplier_visible_name,
      captured_at: resolution.captured_at,
      valid_from: resolution.valid_from,
      valid_to: resolution.valid_to,
      confidence: resolution.confidence,
      alternatives_count: resolution.alternatives_count,
      validation_failures: resolution.validation_failures ?? [],
    };
    const lineTotal = resolution.price_value == null ? null : round2(row.quantity * resolution.price_value);
    const line: ExactMaterialPriceLine = {
      ...recipeRow,
      row_number: row.rowNumber,
      quantity: row.quantity,
      unit: row.unit,
      visible_quantity: `${formatNumber(row.quantity)} ${formatEstimateUnitLabel(row.unit)}`,
      price_status: resolution.price_status,
      price_value: resolution.price_value,
      visible_unit_price: resolution.price_value == null
        ? PRICE_MISSING
        : `${formatMoney(resolution.price_value, input.currency)} / ${formatEstimateUnitLabel(row.unit)}`,
      line_total: lineTotal,
      visible_line_total: formatMoney(lineTotal, input.currency),
      currency: input.currency,
      supplier_id: resolution.supplier_id,
      supplier_visible_name: resolution.supplier_visible_name,
      region: resolution.region,
      price_captured_at: resolution.captured_at,
      valid_from: resolution.valid_from,
      valid_to: resolution.valid_to,
      source_type: resolution.source_type,
      source_reference: resolution.source_reference,
      confidence: resolution.confidence,
      alternatives_count: resolution.alternatives_count,
      governance_status: resolution.governance_status ?? (resolution.price_status === "VERIFIED" ? "VERIFIED_PRICE_SELECTED" : "PRICE_MISSING"),
      price_source_audit: priceSourceAudit,
      validation_failures: resolution.validation_failures ?? priceSourceAudit.validation_failures,
      fake_price_claimed: false,
      fake_supplier_claimed: false,
    };
    return line;
  });
}

function buildVisibleRows(lines: readonly ExactMaterialPriceLine[]): ExactEstimateVisibleRow[] {
  return lines.map((line) => ({
    row_number: line.row_number,
    material_name: line.material_visible_name_ru,
    quantity: line.visible_quantity,
    unit_price: line.visible_unit_price,
    line_total: line.visible_line_total,
    price_status: line.price_status,
    source_label: sourceLabel(line),
  }));
}

function buildCatalogBinding(lines: readonly ExactMaterialPriceLine[]): ExactEstimateCatalogBindingRow[] {
  return lines.map((line) => ({
    visible_material_name: line.material_visible_name_ru,
    search_query: line.material_visible_name_ru,
    price_status: line.price_status,
    source_label: sourceLabel(line),
  }));
}

function buildPdfModel(input: {
  estimateId: string;
  workKey: string;
  workTitle: string;
  originalText: string;
  visibleQuantity: string;
  region: string;
  priceDate: string;
  currency: ExactMaterialCurrency;
  visibleRows: ExactEstimateVisibleRow[];
  materialsTotal: number;
  laborTotal: number | null;
  totalStatus: ExactEstimateTotalStatus;
  missingRows: number;
}): EstimatePdfViewModel {
  const sourceLabels = [...new Set(input.visibleRows.map((row) => row.source_label))];
  const grand = input.totalStatus === "COMPLETE" && input.laborTotal != null
    ? input.materialsTotal + input.laborTotal
    : null;
  return {
    estimateId: input.estimateId,
    title: EXACT_TITLE_RU,
    workKey: input.workKey,
    workTitle: input.workTitle,
    generatedAt: `${input.priceDate}T00:00:00+06:00`,
    language: "ru",
    originalText: input.originalText,
    requestMetaFields: [
      { label: "\u041e\u0431\u044a\u0435\u043c", value: input.visibleQuantity },
      { label: "\u0420\u0435\u0433\u0438\u043e\u043d", value: input.region },
      { label: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0446\u0435\u043d", value: input.totalStatus },
      { label: "\u041f\u0440\u043e\u043f\u0443\u0441\u043a\u0438 \u0446\u0435\u043d", value: String(input.missingRows) },
    ],
    sections: [{
      sectionNumber: "1",
      title: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
      type: "materials",
      rows: input.visibleRows.map((row) => ({
        rowNumber: row.row_number,
        sectionTitle: "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b",
        name: row.material_name,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        total: row.line_total,
        sourceLabels: [row.source_label],
        confidence: row.source_label.match(/confidence ([0-9.]+)/)?.[1] ?? "0.35",
      })),
    }],
    totals: {
      materials: `${formatMoney(input.materialsTotal, input.currency)} known; ${PRICE_MISSING}: ${input.missingRows}`,
      labor: input.laborTotal == null ? PRICE_MISSING : formatMoney(input.laborTotal, input.currency),
      tax: "\u043d\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d",
      grand: formatMoney(grand, input.currency),
    },
    tax: {
      label: "\u041d\u0430\u043b\u043e\u0433 \u043d\u0435 \u0432\u0445\u043e\u0434\u0438\u0442 \u0432 exact material price proof",
      included: false,
      amount: "\u043d\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d",
      warning: "\u042d\u0442\u043e\u0442 proof \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442 \u0442\u043e\u043b\u044c\u043a\u043e exact material pricebook.",
    },
    assumptions: [
      "\u0426\u0435\u043d\u044b \u0431\u0435\u0440\u0443\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0438\u0437 exact pricebook/ratebook.",
      "\u0415\u0441\u043b\u0438 \u0446\u0435\u043d\u044b \u043d\u0435\u0442, \u0441\u0442\u0440\u043e\u043a\u0430 \u043f\u043e\u043c\u0435\u0447\u0430\u0435\u0442\u0441\u044f PRICE_MISSING \u0438 \u0438\u0442\u043e\u0433 \u043d\u0435 \u0438\u0437\u043e\u0431\u0440\u0435\u0442\u0430\u0435\u0442\u0441\u044f.",
    ],
    costIncreaseFactors: [],
    clarifyingQuestions: input.missingRows > 0
      ? ["\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 verified pricebook \u0446\u0435\u043d\u0443 \u0434\u043b\u044f \u0441\u0442\u0440\u043e\u043a PRICE_MISSING."]
      : [],
    sources: sourceLabels,
    runtimeTrace: {
      traceId: `exact-material-price:${input.estimateId}`,
      input: input.originalText,
      selectedTool: "build_exact_material_price_estimate",
      workKey: input.workKey,
      priceDate: input.priceDate,
      region: input.region,
    },
  };
}

export function buildExactMaterialPriceEstimate(input: ExactMaterialPriceEstimateInput): ExactMaterialPriceEstimate {
  const currency = input.currency ?? "KGS";
  const region = input.region ?? EXACT_MATERIAL_PRICEBOOK_REGION;
  const priceDate = input.priceDate ?? EXACT_MATERIAL_PRICEBOOK_DATE;
  const baseGlobalInput: GlobalEstimateInput = {
    text: input.text,
    language: input.language ?? "ru",
    countryCode: input.countryCode ?? "KG",
    city: input.city ?? "Bishkek",
    currency,
    volume: input.volume,
    unit: input.unit,
  };
  const selectedWork = input.selectedWorkKey
    ? buildGlobalSelectedWorkBinding({ selectedWorkKey: input.selectedWorkKey, rawInput: input.text })
    : null;
  const globalEstimate = calculateGlobalConstructionEstimateSync(
    buildGlobalEstimateInputWithSelectedWork(baseGlobalInput, selectedWork),
  );
  const rows = materialRows(globalEstimate);
  const recipe = buildRecipe(globalEstimate);
  const materialLines = buildMaterialLines({ recipe, sourceRows: rows, region, priceDate, currency });
  const visibleRows = buildVisibleRows(materialLines);
  const catalogBinding = buildCatalogBinding(materialLines);
  const missingRows = materialLines.filter((line) => line.price_status !== "VERIFIED").length;
  const totalStatus = missingRows > 0 ? PARTIAL_STATUS : COMPLETE_STATUS;
  const materialsKnownTotal = round2(materialLines.reduce((sum, line) => sum + (line.line_total ?? 0), 0));
  const laborTotal = Number.isFinite(globalEstimate.totals.laborTotal) ? round2(globalEstimate.totals.laborTotal) : null;
  const grandKnownTotal = totalStatus === "COMPLETE" && laborTotal != null
    ? round2(materialsKnownTotal + laborTotal)
    : null;
  const visibleQuantity = `${formatNumber(globalEstimate.input.volume)} ${formatEstimateUnitLabel(globalEstimate.input.unit)}`;
  const estimateId = stableId("exact_material_estimate", JSON.stringify({
    text: input.text,
    selectedWorkKey: input.selectedWorkKey ?? null,
    volume: globalEstimate.input.volume,
    unit: globalEstimate.input.unit,
    workKey: globalEstimate.work.workKey,
    region,
    priceDate,
    currency,
  }));
  const workTitle = safeVisibleText(globalEstimate.work.title);
  const originalText = safeVisibleText(input.text);
  const pdfModel = buildPdfModel({
    estimateId,
    workKey: globalEstimate.work.workKey,
    workTitle,
    originalText,
    visibleQuantity,
    region,
    priceDate,
    currency,
    visibleRows,
    materialsTotal: materialsKnownTotal,
    laborTotal,
    totalStatus,
    missingRows,
  });
  const totalsLabel = `${formatMoney(materialsKnownTotal, currency)} known; ${PRICE_MISSING}: ${missingRows}; status ${totalStatus}`;
  const visibleTextLines = [
    EXACT_TITLE_RU,
    `${"\u0420\u0430\u0431\u043e\u0442\u0430"}: ${workTitle}`,
    `${"\u041e\u0431\u044a\u0435\u043c"}: ${visibleQuantity}`,
    ...visibleRows.flatMap((row) => [
      `${row.row_number}. ${row.material_name}`,
      `${row.quantity} | ${row.unit_price} | ${row.line_total} | ${row.price_status}`,
      row.source_label,
    ]),
    totalsLabel,
  ];

  return {
    estimate_id: estimateId,
    source_global_estimate_id: globalEstimate.estimateId,
    source_global_estimate: globalEstimate,
    work: {
      work_key: globalEstimate.work.workKey,
      visible_name_ru: workTitle,
      category: globalEstimate.work.category,
    },
    input: {
      original_text: originalText,
      quantity: globalEstimate.input.volume,
      unit: globalEstimate.input.unit,
      visible_quantity: visibleQuantity,
      selected_work_key: input.selectedWorkKey ?? null,
    },
    recipe,
    material_lines: materialLines,
    catalog_binding: catalogBinding,
    totals: {
      currency,
      materials_known_total: materialsKnownTotal,
      labor_known_total: laborTotal,
      grand_known_total: grandKnownTotal,
      missing_price_rows_count: missingRows,
      total_status: totalStatus,
      visible_materials_known_total: formatMoney(materialsKnownTotal, currency),
      visible_grand_total: formatMoney(grandKnownTotal, currency),
    },
    ui_model: {
      title: EXACT_TITLE_RU,
      work_label: workTitle,
      quantity_label: visibleQuantity,
      rows: visibleRows,
      totals_label: totalsLabel,
      visible_text_lines: visibleTextLines,
    },
    pdf_model: pdfModel,
    policy: {
      random_prices_allowed: false,
      hidden_fallback_prices_allowed: false,
      fake_suppliers_allowed: false,
      fake_price_claimed: false,
      fake_supplier_claimed: false,
    },
  };
}
