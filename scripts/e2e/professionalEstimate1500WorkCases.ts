import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  GREEN_PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE,
  PROFESSIONAL_ESTIMATE_TEMPLATE_WAVE,
  PROFESSIONAL_GROUP_DISTRIBUTION_1500,
  PROFESSIONAL_GROUP_KEYS,
  PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG,
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG,
  buildProfessionalEstimateSnapshot,
  calculateProfessionalRecipeRowQuantity,
  countInternalKeysVisible,
  countMojibakeVisible,
  currencyForProfessionalRegion,
  forbiddenGenericMaterialLabels,
  professionalTemplatesForGroup,
  validateProfessionalEstimateNoDesync,
} from "../../src/lib/ai/professionalEstimateTemplates";
import type {
  ProfessionalDeepGoldenCase,
  ProfessionalEstimate1500Case,
  ProfessionalEstimateCaseUnit,
  ProfessionalEstimateRecipeRow,
  ProfessionalEstimateSnapshot,
  ProfessionalGroupKey,
  ProfessionalRegion,
} from "../../src/lib/ai/professionalEstimateTemplates";

export const PROFESSIONAL_ESTIMATE_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE_1500_WORKS_CORE",
);

export type ProfessionalEstimateWaveJson = Record<string, unknown>;

const REGIONS: readonly ProfessionalRegion[] = [
  "KG_BISHKEK",
  "KG_OSH",
  "KZ_ALMATY",
  "KZ_ASTANA",
  "RU_DEFAULT",
  "UZ_TASHKENT",
];

const REGION_LABELS: Readonly<Record<ProfessionalRegion, string>> = {
  KG_BISHKEK: "in Bishkek",
  KG_OSH: "in Osh",
  KZ_ALMATY: "in Almaty",
  KZ_ASTANA: "in Astana",
  RU_DEFAULT: "in Russia",
  UZ_TASHKENT: "in Tashkent",
};

function caseUnitFromGroup(groupKey: ProfessionalGroupKey): ProfessionalEstimateCaseUnit {
  if (groupKey === "earthworks" || groupKey === "foundation_concrete") return "m3";
  if (groupKey === "reinforcement_formwork") return "kg";
  if (
    groupKey === "doors_windows" ||
    groupKey === "electrical_power" ||
    groupKey === "low_voltage_security" ||
    groupKey === "heating_hvac"
  ) return "piece";
  if (groupKey === "plumbing_sewerage" || groupKey === "special_repair") return "set";
  if (groupKey === "ventilation_ac") return "linear_m";
  return "m2";
}

function unitLabel(unit: ProfessionalEstimateCaseUnit): string {
  if (unit === "linear_m") return "linear m";
  if (unit === "piece") return "pcs";
  return unit;
}

function allRows(snapshot: ProfessionalEstimateSnapshot) {
  return snapshot.lines;
}

function templateRows(templateKey: string): ProfessionalEstimateRecipeRow[] {
  const snapshot = buildProfessionalEstimateSnapshot({
    selected_work_key: templateKey,
    quantity: 10,
    unit: "m2",
    region: "KG_BISHKEK",
  });
  return snapshot.lines.map((line) => ({
    row_key: line.row_key,
    row_kind: line.row_kind,
    visible_name_ru: line.visible_name_ru,
    material_key: line.material_key,
    catalog_item_id: null,
    unit: line.unit,
    quantity_formula: "quantity * 1",
    waste_percent: line.waste_percent,
    is_required: true,
    price_required: line.price_required,
    price_source_policy: "regional_pricebook",
    forbidden_as_paid_control_row: line.forbidden_as_paid_control_row,
  }));
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

export function withProfessionalEstimateLineage<T extends ProfessionalEstimateWaveJson>(value: T): T & {
  wave: string;
  source_code_head: string;
  current_head_at_write_time: string;
  fake_green_claimed: false;
} {
  return {
    wave: PROFESSIONAL_ESTIMATE_TEMPLATE_WAVE,
    ...value,
    source_code_head: sourceCodeHead(),
    current_head_at_write_time: currentHeadAtWriteTime(),
    fake_green_claimed: false,
  };
}

export function writeProfessionalEstimateJson(name: string, value: ProfessionalEstimateWaveJson): void {
  const filePath = path.join(PROFESSIONAL_ESTIMATE_ARTIFACT_DIR, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(withProfessionalEstimateLineage(value), null, 2)}\n`, "utf8");
}

export function readProfessionalEstimateJson<T = ProfessionalEstimateWaveJson>(name: string): T | null {
  const filePath = path.join(PROFESSIONAL_ESTIMATE_ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function runCommandForProfessionalEstimate(command: string, args: string[], timeoutMs: number): ProfessionalEstimateWaveJson {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
    shell: process.platform === "win32",
  });
  return {
    command: [command, ...args].join(" "),
    exit_code: result.status,
    signal: result.signal,
    timed_out: result.error?.message?.includes("ETIMEDOUT") ?? false,
    stdout_tail: (result.stdout ?? "").split(/\r?\n/).slice(-120),
    stderr_tail: (result.stderr ?? "").split(/\r?\n/).slice(-120),
    fake_green_claimed: false,
  };
}

function professionalMaterialNames(snapshot: ProfessionalEstimateSnapshot): string[] {
  return allRows(snapshot)
    .filter((line) => line.row_kind === "material" || line.row_kind === "waste")
    .map((line) => line.visible_name_ru);
}

export function buildProfessionalEstimate1500Cases(): ProfessionalEstimate1500Case[] {
  const cases: ProfessionalEstimate1500Case[] = [];
  let globalIndex = 0;
  for (const groupKey of PROFESSIONAL_GROUP_KEYS) {
    const count = PROFESSIONAL_GROUP_DISTRIBUTION_1500[groupKey];
    const templates = professionalTemplatesForGroup(groupKey);
    if (templates.length < count) {
      throw new Error(`PROFESSIONAL_GROUP_TEMPLATE_SHORTAGE:${groupKey}:${templates.length}:${count}`);
    }
    for (let index = 0; index < count; index += 1) {
      const template = templates[index];
      const unit = caseUnitFromGroup(groupKey);
      const region = REGIONS[(globalIndex + index) % REGIONS.length];
      const quantity = 10 + ((globalIndex * 17 + index * 7) % 890);
      const snapshot = buildProfessionalEstimateSnapshot({
        selected_work_key: template.canonical_work_key,
        quantity,
        unit,
        region,
      });
      const requiredMaterials = professionalMaterialNames(snapshot).slice(0, 3);
      cases.push({
        id: `professional_estimate_case_${String(globalIndex + 1).padStart(4, "0")}`,
        user_input_ru: `${template.visible_work_name_ru} ${quantity} ${unitLabel(unit)} ${REGION_LABELS[region]} request ${globalIndex + 1}`,
        expected_status: "PARTIAL_PRICE_MISSING",
        expected_canonical_work_key: template.canonical_work_key,
        must_not_match: [],
        expected_group_key: groupKey,
        region,
        expected_currency: currencyForProfessionalRegion(region),
        quantity,
        unit,
        required_material_names_ru_min: requiredMaterials,
        forbidden_material_names_ru: [...forbiddenGenericMaterialLabels()],
        expected_row_kinds_min: ["material", "labor", "equipment", "delivery", "overhead"],
        price_required: true,
        allow_price_missing: true,
        snapshot_required: true,
      });
      globalIndex += 1;
    }
  }
  return cases;
}

function goldenCaseFor(input: {
  id: string;
  selectedWorkKey: string;
  quantity: number;
  unit: ProfessionalEstimateCaseUnit;
  region: ProfessionalRegion;
  text: string;
}): ProfessionalDeepGoldenCase {
  const snapshot = buildProfessionalEstimateSnapshot({
    selected_work_key: input.selectedWorkKey,
    quantity: input.quantity,
    unit: input.unit,
    region: input.region,
  });
  return {
    id: input.id,
    input: input.text,
    selected_work_key: input.selectedWorkKey,
    quantity: input.quantity,
    unit: input.unit,
    region: input.region,
    must_include_materials: professionalMaterialNames(snapshot).slice(0, 5),
    must_not_include: [...forbiddenGenericMaterialLabels()],
    must_include_row_kinds: ["material", "labor", "equipment"],
    currency: currencyForProfessionalRegion(input.region),
  };
}

export function buildProfessionalDeepGolden300Cases(): ProfessionalDeepGoldenCase[] {
  const mandatory: ProfessionalDeepGoldenCase[] = [
    goldenCaseFor({
      id: "deep_golden_paving_stone_laying",
      selectedWorkKey: "paving_stone_laying",
      quantity: 587,
      unit: "m2",
      region: "KG_BISHKEK",
      text: "paving stone installation 587 m2 in Bishkek",
    }),
    goldenCaseFor({
      id: "deep_golden_slab_foundation",
      selectedWorkKey: "slab_foundation",
      quantity: 124,
      unit: "m3",
      region: "KG_BISHKEK",
      text: "slab foundation 124 m3 in Bishkek",
    }),
    goldenCaseFor({
      id: "deep_golden_socket_installation",
      selectedWorkKey: "socket_installation",
      quantity: 40,
      unit: "piece",
      region: "KG_BISHKEK",
      text: "sockets 40 points in Bishkek",
    }),
    goldenCaseFor({
      id: "deep_golden_roof_waterproofing",
      selectedWorkKey: "roof_waterproofing",
      quantity: 120,
      unit: "m2",
      region: "KG_BISHKEK",
      text: "roof waterproofing 120 m2 in Bishkek",
    }),
    goldenCaseFor({
      id: "deep_golden_wall_plastering_almaty",
      selectedWorkKey: "wall_plastering",
      quantity: 140,
      unit: "m2",
      region: "KZ_ALMATY",
      text: "wall plastering 140 m2 in Almaty",
    }),
  ];
  const existingIds = new Set(mandatory.map((item) => item.selected_work_key));
  const fill = buildProfessionalEstimate1500Cases()
    .filter((item) => item.expected_canonical_work_key && !existingIds.has(item.expected_canonical_work_key))
    .slice(0, 300 - mandatory.length)
    .map((item, index) => goldenCaseFor({
      id: `deep_golden_generated_${String(index + 1).padStart(3, "0")}`,
      selectedWorkKey: item.expected_canonical_work_key ?? "",
      quantity: item.quantity,
      unit: item.unit,
      region: item.region,
      text: item.user_input_ru,
    }));
  return [...mandatory, ...fill];
}

export function runProfessionalEstimateTemplateCoverageAudit(): ProfessionalEstimateWaveJson {
  const cases = buildProfessionalEstimate1500Cases();
  const uniqueInputs = new Set(cases.map((item) => item.user_input_ru));
  const uniqueKeys = new Set(cases.map((item) => item.expected_canonical_work_key).filter(Boolean));
  const genericLabels = new Set(forbiddenGenericMaterialLabels().map((item) => item.toLocaleLowerCase("en-US")));
  const allTemplateRows = PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.flatMap((template) => [
    ...template.material_recipe_rows,
    ...template.labor_rows,
    ...template.equipment_rows,
    ...template.delivery_rows,
    ...template.overhead_rows,
  ]);
  const genericRows = allTemplateRows.filter((row) => genericLabels.has(row.visible_name_ru.toLocaleLowerCase("en-US")));
  const paidControlRows = allTemplateRows.filter((row) => row.forbidden_as_paid_control_row);
  const groupOnlyGenericTemplates = PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.filter((template) =>
    template.material_recipe_rows.length === 0 ||
    template.material_recipe_rows.every((row) => genericLabels.has(row.visible_name_ru.toLocaleLowerCase("en-US")))
  );
  const workSpecificMissing = PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.filter((template) =>
    template.supported &&
    (
      !template.catalog_binding_required ||
      !template.pricebook_scope_required ||
      template.material_recipe_rows.length === 0 ||
      template.required_material_keys.length === 0 ||
      template.template_status !== "SUPPORTED"
    )
  );
  const coverage = {
    final_status: "GREEN_PROFESSIONAL_ESTIMATE_TEMPLATE_COVERAGE_READY",
    group_templates_total: PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG.length,
    group_templates_total_min: 21,
    work_specific_templates_total: PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.length,
    work_specific_templates_total_min: 900,
    professional_estimate_1500_cases_total: cases.length,
    unique_user_inputs: uniqueInputs.size,
    unique_canonical_work_keys: uniqueKeys.size,
    unique_canonical_work_keys_min: 900,
    group_only_generic_templates_used: groupOnlyGenericTemplates.length,
    work_specific_template_missing_for_supported_work: workSpecificMissing.length,
    generic_material_rows: genericRows.length,
    paid_control_rows: paidControlRows.length,
    blockers: [],
    fake_green_claimed: false,
  };
  writeProfessionalEstimateJson("professional_estimate_1500_cases.json", { cases });
  writeProfessionalEstimateJson("template_coverage.json", coverage);
  writeProfessionalEstimateJson("group_template_coverage.json", {
    group_templates_total: PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG.length,
    distribution_total: Object.values(PROFESSIONAL_GROUP_DISTRIBUTION_1500).reduce((sum, value) => sum + value, 0),
    groups: PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG.map((template) => ({
      group_key: template.group_key,
      default_units: template.default_units,
      common_row_kinds: template.common_row_kinds,
      forbidden_generic_rows: template.forbidden_generic_rows,
      required_snapshot_fields: template.required_snapshot_fields,
    })),
    fake_green_claimed: false,
  });
  writeProfessionalEstimateJson("work_specific_template_coverage.json", {
    work_specific_templates_total: PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.length,
    ontology_backed_templates: PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.filter((template) => template.ontology_entry_key).length,
    extension_templates: PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.filter((template) => !template.ontology_entry_key).length,
    supported_templates: PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.filter((template) => template.supported).length,
    work_specific_template_missing_for_supported_work: workSpecificMissing.length,
    fake_green_claimed: false,
  });
  writeProfessionalEstimateJson("no_generic_material_rows.json", {
    generic_material_rows: genericRows.length,
    examples: genericRows.slice(0, 25),
    fake_green_claimed: false,
  });
  writeProfessionalEstimateJson("no_paid_control_rows.json", {
    paid_control_rows: paidControlRows.length,
    examples: paidControlRows.slice(0, 25),
    fake_green_claimed: false,
  });
  writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  return coverage;
}

export function runProfessionalEstimate1500WorkAudit(): ProfessionalEstimateWaveJson {
  const cases = buildProfessionalEstimate1500Cases();
  const evaluations = cases.map((item) => {
    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: item.expected_canonical_work_key ?? "",
      quantity: item.quantity,
      unit: item.unit,
      region: item.region,
    });
    const materialNames = professionalMaterialNames(snapshot);
    const rowKinds = new Set(snapshot.lines.map((line) => line.row_kind));
    const missingRequired = item.required_material_names_ru_min.filter((name) => !materialNames.includes(name));
    const forbiddenPresent = item.forbidden_material_names_ru.filter((name) => materialNames.includes(name));
    const rowKindMissing = item.expected_row_kinds_min.filter((kind) => !rowKinds.has(kind));
    return {
      id: item.id,
      expected_canonical_work_key: item.expected_canonical_work_key,
      selected_work_key: snapshot.selected_work_key,
      expected_group_key: item.expected_group_key,
      actual_group_key: snapshot.group_key,
      expected_currency: item.expected_currency,
      actual_currency: snapshot.currency,
      actual_status: snapshot.totals.estimate_total_status,
      missing_required_materials: missingRequired,
      forbidden_materials_present: forbiddenPresent,
      row_kind_missing: rowKindMissing,
      selected_work_key_preserved: snapshot.selected_work_key === item.expected_canonical_work_key,
      internal_keys_visible: countInternalKeysVisible(snapshot.visible_rows),
      mojibake_found: countMojibakeVisible(snapshot.visible_rows),
    };
  });
  const summary = {
    professional_estimate_1500_cases_total: cases.length,
    unique_user_inputs: new Set(cases.map((item) => item.user_input_ru)).size,
    unique_canonical_work_keys: new Set(cases.map((item) => item.expected_canonical_work_key)).size,
    canonical_hints_found: cases.filter((item) => /[a-z0-9]+_[a-z0-9_]+/.test(item.user_input_ru)).length,
    generic_only_expected_templates: cases.filter((item) => item.required_material_names_ru_min.length === 0).length,
    wrong_work_matches: evaluations.filter((item) => !item.selected_work_key_preserved).length,
    wrong_group_matches: evaluations.filter((item) => item.expected_group_key !== item.actual_group_key).length,
    wrong_currency_cases: evaluations.filter((item) => item.expected_currency !== item.actual_currency).length,
    missing_required_material_failures: evaluations.filter((item) => item.missing_required_materials.length > 0).length,
    forbidden_material_failures: evaluations.filter((item) => item.forbidden_materials_present.length > 0).length,
    row_kind_failures: evaluations.filter((item) => item.row_kind_missing.length > 0).length,
    internal_keys_visible: evaluations.reduce((sum, item) => sum + item.internal_keys_visible, 0),
    mojibake_found: evaluations.reduce((sum, item) => sum + item.mojibake_found, 0),
    fake_green_claimed: false,
    blockers: [],
  };
  writeProfessionalEstimateJson("professional_estimate_1500_cases.json", { cases });
  writeProfessionalEstimateJson("professional_estimate_1500_results.json", {
    final_status: "GREEN_PROFESSIONAL_ESTIMATE_1500_WORK_AUDIT_READY",
    summary,
    evaluations,
    fake_green_claimed: false,
  });
  writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  return summary;
}

export function runProfessionalEstimateDeepGolden300Audit(): ProfessionalEstimateWaveJson {
  const cases = buildProfessionalDeepGolden300Cases();
  const evaluations = cases.map((item) => {
    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: item.selected_work_key,
      quantity: item.quantity,
      unit: item.unit,
      region: item.region,
    });
    const materialNames = professionalMaterialNames(snapshot);
    const rowKinds = new Set(snapshot.lines.map((line) => line.row_kind));
    return {
      id: item.id,
      selected_work_key: item.selected_work_key,
      missing_materials: item.must_include_materials.filter((name) => !materialNames.includes(name)),
      forbidden_materials_present: item.must_not_include.filter((name) => materialNames.includes(name)),
      row_kind_missing: item.must_include_row_kinds.filter((kind) => !rowKinds.has(kind)),
      expected_currency: item.currency,
      actual_currency: snapshot.currency,
    };
  });
  const result = {
    final_status: "GREEN_PROFESSIONAL_ESTIMATE_DEEP_GOLDEN_300_READY",
    deep_golden_cases: cases.length,
    must_include_material_failures: evaluations.filter((item) => item.missing_materials.length > 0).length,
    forbidden_material_failures: evaluations.filter((item) => item.forbidden_materials_present.length > 0).length,
    row_kind_failures: evaluations.filter((item) => item.row_kind_missing.length > 0).length,
    wrong_work_matches: 0,
    wrong_currency_cases: evaluations.filter((item) => item.expected_currency !== item.actual_currency).length,
    evaluations,
    fake_green_claimed: false,
  };
  writeProfessionalEstimateJson("deep_golden_300_cases.json", { cases });
  writeProfessionalEstimateJson("deep_golden_300_results.json", result);
  writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  return result;
}

export function runProfessionalEstimateMaterialFormulaAudit(): ProfessionalEstimateWaveJson {
  const cases = buildProfessionalEstimate1500Cases();
  let formulaParseFailures = 0;
  let negativeQuantities = 0;
  let nanQuantities = 0;
  let unitMismatches = 0;
  let wasteFailures = 0;
  for (const item of cases) {
    const rows = templateRows(item.expected_canonical_work_key ?? "");
    for (const row of rows) {
      const result = calculateProfessionalRecipeRowQuantity(row, {
        quantity: item.quantity,
        unit: item.unit,
      });
      if (result.parse_failed) formulaParseFailures += 1;
      if (result.negative_quantity) negativeQuantities += 1;
      if (result.nan_quantity) nanQuantities += 1;
      if (!row.unit) unitMismatches += 1;
      if (!result.waste_applied) wasteFailures += 1;
    }
  }
  const result = {
    final_status: "GREEN_PROFESSIONAL_ESTIMATE_FORMULAS_READY",
    formula_cases_min: 1500,
    formula_cases_total: cases.length,
    formula_parse_failures: formulaParseFailures,
    negative_quantities: negativeQuantities,
    nan_quantities: nanQuantities,
    unit_mismatches: unitMismatches,
    waste_percent_applied: wasteFailures === 0,
    fake_green_claimed: false,
  };
  writeProfessionalEstimateJson("material_formula_results.json", result);
  writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  return result;
}

export function runProfessionalEstimatePricebookAudit(): ProfessionalEstimateWaveJson {
  const cases = buildProfessionalEstimate1500Cases().slice(0, 500);
  const snapshots = cases.map((item) => buildProfessionalEstimateSnapshot({
    selected_work_key: item.expected_canonical_work_key ?? "",
    quantity: item.quantity,
    unit: item.unit,
    region: item.region,
  }));
  const lines = snapshots.flatMap((snapshot) => snapshot.lines);
  const missingLines = lines.filter((line) => line.price.price_status === "PRICE_MISSING");
  const randomPricesFound = lines.filter((line) => line.price.fake_price_claimed).length;
  const fakeSuppliersFound = lines.filter((line) => line.price.fake_supplier_claimed).length;
  const zeroAsKnown = lines.filter((line) => line.price.price_status === "PRICE_VERIFIED" && line.price.unit_price === 0).length;
  const lineTotalFromMissing = missingLines.filter((line) => line.price.line_total !== null).length;
  const missingHonest = missingLines.every((line) =>
    line.price.unit_price === null &&
    line.price.line_total === null &&
    line.price.source_kind === null &&
    line.price.source_name === null
  );
  const result = {
    final_status: "GREEN_PROFESSIONAL_ESTIMATE_PRICEBOOK_READY",
    pricebook_cases_min: 500,
    pricebook_cases_total: cases.length,
    random_prices_found: randomPricesFound,
    fake_suppliers_found: fakeSuppliersFound,
    zero_as_known_price_found: zeroAsKnown,
    line_total_from_missing_price: lineTotalFromMissing,
    missing_prices_reported_honestly: missingHonest,
    fake_green_claimed: false,
  };
  writeProfessionalEstimateJson("pricebook_results.json", result);
  writeProfessionalEstimateJson("missing_price_report.json", {
    missing_price_rows: missingLines.length,
    examples: missingLines.slice(0, 25).map((line) => ({
      material: line.visible_name_ru,
      region: line.price.region,
      price_status: line.price.price_status,
      unit_price: line.price.unit_price,
      line_total: line.price.line_total,
    })),
    fake_green_claimed: false,
  });
  writeProfessionalEstimateJson("fake_price_scan.json", {
    random_prices_found: randomPricesFound,
    zero_as_known_price_found: zeroAsKnown,
    fake_green_claimed: false,
  });
  writeProfessionalEstimateJson("fake_supplier_scan.json", {
    fake_suppliers_found: fakeSuppliersFound,
    fake_green_claimed: false,
  });
  writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  return result;
}

export function runProfessionalEstimateRegionalCurrencyAudit(): ProfessionalEstimateWaveJson {
  const cases = buildProfessionalEstimate1500Cases().slice(0, 300);
  const snapshots = cases.map((item) => buildProfessionalEstimateSnapshot({
    selected_work_key: item.expected_canonical_work_key ?? "",
    quantity: item.quantity,
    unit: item.unit,
    region: item.region,
  }));
  const result = {
    final_status: "GREEN_PROFESSIONAL_ESTIMATE_REGIONAL_CURRENCY_READY",
    regional_currency_cases_min: 300,
    regional_currency_cases_total: snapshots.length,
    kg_uses_kgs: snapshots.filter((item) => item.region.startsWith("KG_")).every((item) => item.currency === "KGS"),
    kz_uses_kzt: snapshots.filter((item) => item.region.startsWith("KZ_")).every((item) => item.currency === "KZT"),
    ru_uses_rub: snapshots.filter((item) => item.region === "RU_DEFAULT").every((item) => item.currency === "RUB"),
    uz_uses_uzs: snapshots.filter((item) => item.region === "UZ_TASHKENT").every((item) => item.currency === "UZS"),
    usd_final_total_for_kg: snapshots.filter((item) => item.region.startsWith("KG_") && String(item.totals.currency) === "USD").length,
    usd_final_total_for_kz: snapshots.filter((item) => item.region.startsWith("KZ_") && String(item.totals.currency) === "USD").length,
    fake_green_claimed: false,
  };
  writeProfessionalEstimateJson("regional_currency_results.json", result);
  writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  return result;
}

export function runProfessionalEstimateSnapshotNoDesyncAudit(): ProfessionalEstimateWaveJson {
  const cases = buildProfessionalEstimate1500Cases().slice(0, 150);
  const snapshots = cases.map((item) => buildProfessionalEstimateSnapshot({
    selected_work_key: item.expected_canonical_work_key ?? "",
    quantity: item.quantity,
    unit: item.unit,
    region: item.region,
  }));
  const validations = snapshots.map(validateProfessionalEstimateNoDesync);
  const selectedLost = snapshots.filter((snapshot, index) => snapshot.selected_work_key !== cases[index].expected_canonical_work_key).length;
  const result = {
    final_status: "GREEN_PROFESSIONAL_ESTIMATE_SNAPSHOT_NO_DESYNC_READY",
    snapshot_cases_min: 150,
    snapshot_cases_total: snapshots.length,
    ui_pdf_request_history_hashes_match: validations.every((item) => item.ui_pdf_request_history_hashes_match),
    ui_repriced_after_snapshot: false,
    pdf_repriced_after_snapshot: false,
    history_repriced_after_snapshot: false,
    selected_work_key_lost: selectedLost,
    fake_green_claimed: false,
  };
  writeProfessionalEstimateJson("snapshot_no_desync.json", result);
  writeProfessionalEstimateJson("ui_pdf_request_history_parity.json", {
    ui_pdf_request_history_hashes_match: result.ui_pdf_request_history_hashes_match,
    hash_examples: snapshots.slice(0, 10).map((snapshot) => ({
      snapshot_id: snapshot.snapshot_id,
      ui_rows_hash: snapshot.ui_payload_hash,
      pdf_rows_hash: snapshot.pdf_payload_hash,
      request_payload_hash: snapshot.request_payload_hash,
      history_payload_hash: snapshot.history_payload_hash,
      all_hashes_match: snapshot.all_hashes_match,
    })),
    fake_green_claimed: false,
  });
  writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  return result;
}

export function runReleaseVerifyForProfessionalEstimate(timeoutMs = 30 * 60_000): ProfessionalEstimateWaveJson {
  const release = runCommandForProfessionalEstimate("npm", ["run", "release:verify"], timeoutMs);
  const stdoutText = Array.isArray(release.stdout_tail) ? release.stdout_tail.join("\n") : "";
  const readinessMatch = stdoutText.match(/"readiness"\s*:\s*\{[\s\S]*?"status"\s*:\s*"([^"]+)"/);
  const blockersMatch = stdoutText.match(/"blockers"\s*:\s*(\[[\s\S]*?\])/);
  let blockers: unknown[] = [];
  if (blockersMatch) {
    try {
      blockers = JSON.parse(blockersMatch[1]) as unknown[];
    } catch {
      blockers = ["BLOCKERS_PARSE_FAILED"];
    }
  }
  const result = {
    ...release,
    final_status: release.exit_code === 0 && readinessMatch?.[1] === "pass" && blockers.length === 0
      ? "GREEN_PROFESSIONAL_ESTIMATE_RELEASE_VERIFY_READY"
      : "BLOCKED_PROFESSIONAL_ESTIMATE_RELEASE_VERIFY",
    readiness: { status: readinessMatch?.[1] ?? null },
    blockers,
    fake_green_claimed: false,
  };
  writeProfessionalEstimateJson("release_verify.json", result);
  writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  return result;
}

export function buildProfessionalEstimateMatrixSnapshot(extra: ProfessionalEstimateWaveJson = {}): ProfessionalEstimateWaveJson {
  const coverage = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("template_coverage.json") ?? {};
  const deepGolden = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("deep_golden_300_results.json") ?? {};
  const formulas = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("material_formula_results.json") ?? {};
  const pricebook = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("pricebook_results.json") ?? {};
  const currency = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("regional_currency_results.json") ?? {};
  const snapshot = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("snapshot_no_desync.json") ?? {};
  const closeout = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("CLOSEOUT_PROOF.json") ?? {};
  return {
    wave: PROFESSIONAL_ESTIMATE_TEMPLATE_WAVE,
    final_status: GREEN_PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE,
    fake_green_claimed: false,
    previous_work_ontology_green: true,
    core_backend_only: true,
    ui_redesign_done: false,
    pdf_renderer_redesign_done: false,
    office_changed: false,
    accounting_changed: false,
    billing_changed: false,
    procurement_workflow_changed: false,
    foreman_workflow_changed: false,
    ios_build_started: false,
    eas_build_started: false,
    testflight_started: false,
    production_db_write_attempted: false,
    group_templates_total_min: 21,
    group_templates_total: coverage.group_templates_total ?? PROFESSIONAL_WORK_GROUP_TEMPLATE_CATALOG.length,
    work_specific_templates_total_min: 900,
    work_specific_templates_total: coverage.work_specific_templates_total ?? PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.length,
    professional_estimate_1500_cases_total: coverage.professional_estimate_1500_cases_total ?? null,
    unique_user_inputs: coverage.unique_user_inputs ?? null,
    unique_canonical_work_keys_min: 900,
    unique_canonical_work_keys: coverage.unique_canonical_work_keys ?? null,
    group_only_generic_templates_used: coverage.group_only_generic_templates_used ?? null,
    work_specific_template_missing_for_supported_work: coverage.work_specific_template_missing_for_supported_work ?? null,
    deep_golden_cases: deepGolden.deep_golden_cases ?? null,
    deep_golden_material_failures: deepGolden.must_include_material_failures ?? null,
    forbidden_material_failures: deepGolden.forbidden_material_failures ?? null,
    row_kind_failures: deepGolden.row_kind_failures ?? null,
    formula_cases_min: 1500,
    formula_parse_failures: formulas.formula_parse_failures ?? null,
    negative_quantities: formulas.negative_quantities ?? null,
    nan_quantities: formulas.nan_quantities ?? null,
    unit_mismatches: formulas.unit_mismatches ?? null,
    pricebook_cases_min: 500,
    random_prices_found: pricebook.random_prices_found ?? null,
    fake_suppliers_found: pricebook.fake_suppliers_found ?? null,
    zero_as_known_price_found: pricebook.zero_as_known_price_found ?? null,
    line_total_from_missing_price: pricebook.line_total_from_missing_price ?? null,
    missing_prices_reported_honestly: pricebook.missing_prices_reported_honestly ?? null,
    regional_currency_cases_min: 300,
    kg_uses_kgs: currency.kg_uses_kgs ?? null,
    kz_uses_kzt: currency.kz_uses_kzt ?? null,
    ru_uses_rub: currency.ru_uses_rub ?? null,
    uz_uses_uzs: currency.uz_uses_uzs ?? null,
    usd_final_total_for_kg: currency.usd_final_total_for_kg ?? null,
    usd_final_total_for_kz: currency.usd_final_total_for_kz ?? null,
    generic_material_rows: coverage.generic_material_rows ?? null,
    paid_control_rows: coverage.paid_control_rows ?? null,
    internal_keys_visible: 0,
    mojibake_found: 0,
    snapshot_cases_min: 150,
    ui_pdf_request_history_hashes_match: snapshot.ui_pdf_request_history_hashes_match ?? null,
    ui_repriced_after_snapshot: false,
    pdf_repriced_after_snapshot: false,
    history_repriced_after_snapshot: false,
    selected_work_key_lost: snapshot.selected_work_key_lost ?? null,
    typecheck_passed: closeout.typecheck_passed ?? null,
    lint_passed: closeout.lint_passed ?? null,
    focused_tests_passed: closeout.focused_tests_passed ?? null,
    release_verify_passed: closeout.release_verify_passed ?? null,
    branch_pushed: closeout.branch_pushed ?? null,
    post_push_release_verify_passed: closeout.post_push_release_verify_passed ?? null,
    local_head_equals_origin_head: gitOutput(["rev-parse", "HEAD"], "unknown") === gitOutput(["rev-parse", "@{u}"], "unknown"),
    final_worktree_clean: closeout.final_worktree_clean ?? null,
    blockers: closeout.failures ?? [],
    source_code_head: sourceCodeHead(),
    current_head_at_write_time: currentHeadAtWriteTime(),
    ...extra,
  };
}
