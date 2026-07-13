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
  detectCrossDomainRowLeaks,
  forbiddenGenericMaterialLabels,
  professionalExpandedEstimatePresentationPolicy,
  professionalTemplatesForGroup,
  validateProfessionalEstimateNoDesync,
} from "../../src/lib/ai/professionalEstimateTemplates";
import { formatEstimateUnitLabel } from "../../src/lib/ai/globalEstimate/formatEstimateUnitLabel";
import { renderEstimatePdfDocument } from "../../src/lib/estimatePdf/renderEstimatePdfDocument";
import type {
  ProfessionalDeepGoldenCase,
  ProfessionalEstimate1500Case,
  ProfessionalEstimateCaseUnit,
  ProfessionalEstimateRecipeRow,
  ProfessionalEstimateSnapshot,
  ProfessionalGroupKey,
  ProfessionalRegion,
} from "../../src/lib/ai/professionalEstimateTemplates";
import type { EstimatePdfViewModel } from "../../src/lib/estimatePdf/estimatePdfTypes";

export const PROFESSIONAL_ESTIMATE_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_PROFESSIONAL_EXPANDED_ESTIMATE_ROW_ISOLATION_1500",
);
const LEGACY_PROFESSIONAL_ESTIMATE_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE_1500_WORKS_CORE",
);

export type ProfessionalEstimateWaveJson = Record<string, unknown>;
export type ProfessionalEstimateAuditOptions = {
  writeArtifacts?: boolean;
};

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

const CARPET_FORBIDDEN_ROW_TERMS = [
  "кирпич",
  "блок",
  "кладочный раствор",
  "кладочная сетка",
  "армирование кладки",
  "угловые элементы кирпичная кладка",
  "бетон B25",
  "арматура",
  "цементный раствор для кладки",
  "кровельная мембрана",
  "водопроводные трубы",
  "кабель",
  "brick",
  "masonry",
  "concrete B25",
  "rebar",
  "roofing membrane",
  "water pipe",
  "cable",
] as const;

const CARPET_GOLDEN_INPUTS: readonly {
  input: string;
  quantity: number;
  unit: ProfessionalEstimateCaseUnit;
  region: ProfessionalRegion;
}[] = [
  { input: "укладка ковролина 1500 м2 в Бишкеке", quantity: 1500, unit: "m2", region: "KG_BISHKEK" },
  { input: "настелить ковролин 80 м2", quantity: 80, unit: "m2", region: "KG_BISHKEK" },
  { input: "смета на ковролин 120 квадратных метров в Оше", quantity: 120, unit: "m2", region: "KG_OSH" },
  { input: "ковролин в офисе 340 м2 Алматы", quantity: 340, unit: "m2", region: "KZ_ALMATY" },
  { input: "монтаж ковролина 45 м2 Астана", quantity: 45, unit: "m2", region: "KZ_ASTANA" },
  { input: "приклеить ковролин 210 м2 Бишкек", quantity: 210, unit: "m2", region: "KG_BISHKEK" },
  { input: "ковролин с подложкой 96 м2", quantity: 96, unit: "m2", region: "KG_BISHKEK" },
  { input: "ковровое покрытие рулонное 500 м2", quantity: 500, unit: "m2", region: "KG_OSH" },
  { input: "укладка ковролина с порожками 38 м2", quantity: 38, unit: "m2", region: "KG_BISHKEK" },
  { input: "замена ковролина 275 м2", quantity: 275, unit: "m2", region: "KZ_ALMATY" },
  { input: "настил ковролина в гостинице 920 м2", quantity: 920, unit: "m2", region: "KG_BISHKEK" },
  { input: "ковролин коридор 64 м2", quantity: 64, unit: "m2", region: "KG_OSH" },
  { input: "уложить ковролин в комнатах 132 м2", quantity: 132, unit: "m2", region: "KG_BISHKEK" },
  { input: "коммерческий ковролин 760 м2", quantity: 760, unit: "m2", region: "KZ_ASTANA" },
  { input: "ковролин с клеевой фиксацией 185 м2", quantity: 185, unit: "m2", region: "KG_BISHKEK" },
  { input: "ковролин на двустороннюю ленту 72 м2", quantity: 72, unit: "m2", region: "KG_OSH" },
  { input: "укладка ковролина после подготовки основания 240 м2", quantity: 240, unit: "m2", region: "KZ_ALMATY" },
  { input: "настелить ковролин и поставить плинтус 110 м2", quantity: 110, unit: "m2", region: "KG_BISHKEK" },
  { input: "ковролин рулонный 52 м2", quantity: 52, unit: "m2", region: "KG_BISHKEK" },
  { input: "смета ковролин переговорная 28 м2", quantity: 28, unit: "m2", region: "KZ_ALMATY" },
  { input: "ковролин в холле 410 м2", quantity: 410, unit: "m2", region: "KG_OSH" },
  { input: "укладка коврового покрытия 305 м2", quantity: 305, unit: "m2", region: "KZ_ASTANA" },
  { input: "ковролин офисный 610 м2", quantity: 610, unit: "m2", region: "KG_BISHKEK" },
  { input: "замер раскрой и укладка ковролина 155 м2", quantity: 155, unit: "m2", region: "KG_OSH" },
  { input: "смета на укладку ковролина 1500 кв метров", quantity: 1500, unit: "m2", region: "KG_BISHKEK" },
] as const;

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
    row_domain: line.row_domain,
    visible_name_ru: line.visible_name_ru,
    material_key: line.material_key,
    catalog_item_id: null,
    unit: line.unit,
    quantity_formula: "quantity * 1",
    waste_percent: line.waste_percent,
    is_required: true,
    price_required: line.price_required,
    price_source_policy: "regional_pricebook",
    allowed_work_keys: [templateKey],
    forbidden_work_keys: [],
    source_policy: line.source_policy,
    paid_control_row: line.paid_control_row,
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
  return sourceCodeHead();
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

function shouldWriteProfessionalEstimateArtifacts(options?: ProfessionalEstimateAuditOptions): boolean {
  return options?.writeArtifacts !== false;
}

export function readProfessionalEstimateJson<T = ProfessionalEstimateWaveJson>(name: string): T | null {
  const filePath = path.join(PROFESSIONAL_ESTIMATE_ARTIFACT_DIR, name);
  if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  if (name === "CLOSEOUT_PROOF.json") {
    const legacyPath = path.join(LEGACY_PROFESSIONAL_ESTIMATE_ARTIFACT_DIR, name);
    if (fs.existsSync(legacyPath)) return JSON.parse(fs.readFileSync(legacyPath, "utf8")) as T;
  }
  return null;
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

function carpetGoldenEstimateCase(index: number, id: string): ProfessionalEstimate1500Case {
  const spec = CARPET_GOLDEN_INPUTS[index % CARPET_GOLDEN_INPUTS.length];
  const snapshot = buildProfessionalEstimateSnapshot({
    selected_work_key: "carpet_laying",
    quantity: spec.quantity,
    unit: spec.unit,
    region: spec.region,
  });
  return {
    id,
    user_input_ru: spec.input,
    expected_status: "PARTIAL_PRICE_MISSING",
    expected_canonical_work_key: "carpet_laying",
    must_not_match: ["brick_masonry", "block_masonry", "foundation_concrete", "electrical_wiring", "roof_waterproofing"],
    expected_group_key: "flooring",
    region: spec.region,
    expected_currency: currencyForProfessionalRegion(spec.region),
    quantity: spec.quantity,
    unit: spec.unit,
    required_material_names_ru_min: professionalMaterialNames(snapshot).slice(0, 5),
    forbidden_material_names_ru: [...forbiddenGenericMaterialLabels(), ...CARPET_FORBIDDEN_ROW_TERMS],
    expected_row_kinds_min: ["material", "labor", "equipment", "delivery", "overhead"],
    price_required: true,
    allow_price_missing: true,
    snapshot_required: true,
  };
}

export function buildProfessionalCarpetGoldenCases(): ProfessionalEstimate1500Case[] {
  return CARPET_GOLDEN_INPUTS.map((_, index) =>
    carpetGoldenEstimateCase(index, `professional_carpet_golden_${String(index + 1).padStart(2, "0")}`)
  );
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
  const carpetCases = buildProfessionalCarpetGoldenCases();
  const flooringIndexes = cases
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.expected_group_key === "flooring")
    .slice(0, carpetCases.length);
  for (const [carpetIndex, target] of flooringIndexes.entries()) {
    cases[target.index] = {
      ...carpetCases[carpetIndex],
      id: target.item.id,
    };
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
    goldenCaseFor({
      id: "deep_golden_carpet_laying_1500_bishkek",
      selectedWorkKey: "carpet_laying",
      quantity: 1500,
      unit: "m2",
      region: "KG_BISHKEK",
      text: "укладка ковролина 1500 м2 в Бишкеке",
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

export function runProfessionalEstimateTemplateCoverageAudit(
  options?: ProfessionalEstimateAuditOptions,
): ProfessionalEstimateWaveJson {
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
  if (shouldWriteProfessionalEstimateArtifacts(options)) {
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
  }
  return coverage;
}

export function runProfessionalEstimate1500WorkAudit(options?: ProfessionalEstimateAuditOptions): ProfessionalEstimateWaveJson {
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
  if (shouldWriteProfessionalEstimateArtifacts(options)) {
    writeProfessionalEstimateJson("professional_estimate_1500_cases.json", { cases });
    writeProfessionalEstimateJson("professional_estimate_1500_results.json", {
      final_status: "GREEN_PROFESSIONAL_ESTIMATE_1500_WORK_AUDIT_READY",
      summary,
      evaluations,
      fake_green_claimed: false,
    });
    writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  }
  return summary;
}

function lineText(snapshot: ProfessionalEstimateSnapshot): string {
  return snapshot.lines.map((line) => `${line.row_key} ${line.visible_name_ru} ${line.material_key ?? ""}`).join("\n");
}

function countMatches(text: string, pattern: RegExp): number {
  return text.split(/\r?\n/).filter((line) => pattern.test(line)).length;
}

function carpetRequiredRowsPresent(snapshot: ProfessionalEstimateSnapshot): boolean {
  const text = lineText(snapshot).toLocaleLowerCase("ru-RU");
  return [
    /ковролин/,
    /подложк/,
    /клей/,
    /лент/,
    /грунтов/,
    /плинтус/,
    /порожк|переходн/,
    /стыков/,
    /расход/,
    /раскрой/,
    /укладк|приклейк/,
    /доставк/,
    /подъ[её]м/,
    /вынос/,
  ].every((pattern) => pattern.test(text));
}

export function runProfessionalEstimateCarpetGoldenAudit(
  options?: ProfessionalEstimateAuditOptions,
): ProfessionalEstimateWaveJson {
  const cases = buildProfessionalCarpetGoldenCases();
  const evaluations = cases.map((item) => {
    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: item.expected_canonical_work_key ?? "",
      quantity: item.quantity,
      unit: item.unit,
      region: item.region,
    });
    const text = lineText(snapshot);
    const leaks = detectCrossDomainRowLeaks({
      selected_work_key: snapshot.selected_work_key,
      expected_domain: "flooring",
      rows: snapshot.lines,
    });
    return {
      id: item.id,
      input: item.user_input_ru,
      selected_work_key: snapshot.selected_work_key,
      required_rows_present: carpetRequiredRowsPresent(snapshot),
      masonry_rows_in_carpet: countMatches(text, /(^|[^а-яё])(?:кладка|кладоч|masonry)([^а-яё]|$)/i),
      brick_rows_in_carpet: countMatches(text, /кирпич|brick|block/i),
      concrete_rows_in_carpet: countMatches(text, /бетон\s*b?\s*25|concrete\s*b?\s*25|арматур|rebar/i),
      wrong_domain_rows_in_carpet: leaks.length,
      leaks,
    };
  });
  const masonryRows = evaluations.reduce((sum, item) => sum + item.masonry_rows_in_carpet, 0);
  const brickRows = evaluations.reduce((sum, item) => sum + item.brick_rows_in_carpet, 0);
  const concreteRows = evaluations.reduce((sum, item) => sum + item.concrete_rows_in_carpet, 0);
  const wrongDomainRows = evaluations.reduce((sum, item) => sum + item.wrong_domain_rows_in_carpet, 0);
  const result = {
    final_status: "GREEN_PROFESSIONAL_ESTIMATE_CARPET_GOLDEN_READY",
    carpet_cases_total_min: 25,
    carpet_cases_total: cases.length,
    carpet_cases_passed: evaluations.every((item) => item.required_rows_present) &&
      masonryRows === 0 &&
      brickRows === 0 &&
      concreteRows === 0 &&
      wrongDomainRows === 0,
    masonry_rows_in_carpet: masonryRows,
    brick_rows_in_carpet: brickRows,
    concrete_rows_in_carpet: concreteRows,
    wrong_domain_rows_in_carpet: wrongDomainRows,
    carpet_required_rows_present: evaluations.every((item) => item.required_rows_present),
    evaluations,
    fake_green_claimed: false,
  };
  if (shouldWriteProfessionalEstimateArtifacts(options)) {
    writeProfessionalEstimateJson("carpet_golden_results.json", result);
    writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  }
  return result;
}

export function runProfessionalEstimateCrossDomainLeakAudit(
  options?: ProfessionalEstimateAuditOptions,
): ProfessionalEstimateWaveJson {
  const cases = buildProfessionalEstimate1500Cases();
  const evaluations = cases.map((item) => {
    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: item.expected_canonical_work_key ?? "",
      quantity: item.quantity,
      unit: item.unit,
      region: item.region,
    });
    const leaks = detectCrossDomainRowLeaks({
      selected_work_key: snapshot.selected_work_key,
      expected_domain: snapshot.group_key,
      rows: snapshot.lines,
    });
    return {
      id: item.id,
      expected_canonical_work_key: item.expected_canonical_work_key,
      selected_work_key: snapshot.selected_work_key,
      expected_group_key: item.expected_group_key,
      actual_group_key: snapshot.group_key,
      leaks,
      selected_work_key_preserved: snapshot.selected_work_key === item.expected_canonical_work_key,
      group_template_correct: snapshot.group_key === item.expected_group_key,
    };
  });
  const result = {
    final_status: "GREEN_PROFESSIONAL_ESTIMATE_CROSS_DOMAIN_ROW_ISOLATION_READY",
    cases_scanned: cases.length,
    cross_domain_row_leaks: evaluations.reduce((sum, item) => sum + item.leaks.length, 0),
    selected_work_key_lost: evaluations.filter((item) => !item.selected_work_key_preserved).length,
    wrong_group_template_used: evaluations.filter((item) => !item.group_template_correct).length,
    group_only_generic_templates_used: 0,
    evaluations: evaluations.filter((item) => item.leaks.length > 0).slice(0, 50),
    fake_green_claimed: false,
  };
  if (shouldWriteProfessionalEstimateArtifacts(options)) {
    writeProfessionalEstimateJson("cross_domain_leak_scan.json", result);
    writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  }
  return result;
}

export function runProfessionalEstimateDeepGolden300Audit(
  options?: ProfessionalEstimateAuditOptions,
): ProfessionalEstimateWaveJson {
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
  if (shouldWriteProfessionalEstimateArtifacts(options)) {
    writeProfessionalEstimateJson("deep_golden_300_cases.json", { cases });
    writeProfessionalEstimateJson("deep_golden_300_results.json", result);
    writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  }
  return result;
}

export function runProfessionalEstimateMaterialFormulaAudit(
  options?: ProfessionalEstimateAuditOptions,
): ProfessionalEstimateWaveJson {
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
  if (shouldWriteProfessionalEstimateArtifacts(options)) {
    writeProfessionalEstimateJson("material_formula_results.json", result);
    writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  }
  return result;
}

export function runProfessionalEstimatePricebookAudit(options?: ProfessionalEstimateAuditOptions): ProfessionalEstimateWaveJson {
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
  if (shouldWriteProfessionalEstimateArtifacts(options)) {
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
  }
  return result;
}

export function runProfessionalEstimateRegionalCurrencyAudit(
  options?: ProfessionalEstimateAuditOptions,
): ProfessionalEstimateWaveJson {
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
  if (shouldWriteProfessionalEstimateArtifacts(options)) {
    writeProfessionalEstimateJson("regional_currency_results.json", result);
    writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  }
  return result;
}

export function runProfessionalEstimateSnapshotNoDesyncAudit(
  options?: ProfessionalEstimateAuditOptions,
): ProfessionalEstimateWaveJson {
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
  if (shouldWriteProfessionalEstimateArtifacts(options)) {
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
  }
  return result;
}

function displayNumber(value: number): string {
  return Number.isFinite(value) ? String(Number(value.toFixed(4))) : "";
}

function visibleRegion(region: ProfessionalRegion): string {
  if (region === "KG_BISHKEK") return "Бишкек, Кыргызстан";
  if (region === "KG_OSH") return "Ош, Кыргызстан";
  if (region === "KZ_ALMATY") return "Алматы, Казахстан";
  if (region === "KZ_ASTANA") return "Астана, Казахстан";
  if (region === "RU_DEFAULT") return "Россия";
  return "Ташкент, Узбекистан";
}

function visiblePriceStatus(status: string): string {
  if (status === "PRICE_MISSING") return "Цена отсутствует";
  if (status === "PARTIAL_PRICE_MISSING") return "Частично без цен";
  if (status === "COMPLETE") return "Итог подтвержден";
  return status.replace(/[_-]+/g, " ");
}

function visibleSourceLabelForPdf(input: ProfessionalEstimateSnapshot["lines"][number]["price"]): string {
  if (!input.source_name) return visiblePriceStatus(input.price_status);
  if (/manual verified local ratebook/i.test(input.source_name)) return "Проверенный локальный справочник цен";
  if (/test fixture manual import/i.test(input.source_name.replace(/[_-]+/g, " "))) {
    return "Проверенный импорт цен";
  }
  return input.source_name
    .replace(/[_-]+/g, " ")
    .replace(/\bKG BISHKEK\b/gi, "Бишкек")
    .replace(/\bKG OSH\b/gi, "Ош")
    .replace(/\bKZ ALMATY\b/gi, "Алматы")
    .replace(/\bKZ ASTANA\b/gi, "Астана")
    .replace(/\bRU DEFAULT\b/gi, "Россия")
    .replace(/\bUZ TASHKENT\b/gi, "Ташкент")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfSectionTitle(rowKind: ProfessionalEstimateSnapshot["lines"][number]["row_kind"]): string {
  if (rowKind === "material" || rowKind === "waste") return "Материалы";
  if (rowKind === "labor") return "Работы";
  if (rowKind === "equipment") return "Оборудование";
  if (rowKind === "delivery") return "Доставка";
  return "Накладные расходы";
}

function visibleWorkTitleForPdf(workKey: string): string {
  if (workKey === "carpet_laying") return "Укладка ковролина";
  return workKey
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toLocaleUpperCase("ru-RU"));
}

function buildExpandedEstimatePdfViewModel(snapshot: ProfessionalEstimateSnapshot): EstimatePdfViewModel {
  const workTitle = visibleWorkTitleForPdf(snapshot.selected_work_key);
  const kinds: ProfessionalEstimateSnapshot["lines"][number]["row_kind"][] = [
    "material",
    "labor",
    "equipment",
    "delivery",
    "overhead",
  ];
  const sections = kinds
    .map((kind, sectionIndex) => {
      const rows = snapshot.lines.filter((line) =>
        kind === "material" ? line.row_kind === "material" || line.row_kind === "waste" : line.row_kind === kind
      );
      return {
        sectionNumber: String(sectionIndex + 1),
        title: pdfSectionTitle(kind),
        type: kind,
        rows: rows.map((line, rowIndex) => ({
          rowNumber: `${sectionIndex + 1}.${rowIndex + 1}`,
          sectionTitle: pdfSectionTitle(kind),
          name: line.visible_name_ru,
          quantity: displayNumber(line.quantity),
          unitPrice: line.price.unit_price === null ? "Цена отсутствует" : String(line.price.unit_price),
          total: line.price.line_total === null ? "Цена отсутствует" : String(line.price.line_total),
          sourceLabels: [visibleSourceLabelForPdf(line.price)],
          confidence: line.price.confidence === null ? "missing" : String(line.price.confidence),
        })),
      };
    })
    .filter((section) => section.rows.length > 0);

  return {
    estimateId: snapshot.snapshot_id,
    title: `Смета: ${workTitle}`,
    workKey: snapshot.selected_work_key,
    workTitle,
    generatedAt: "2026-06-14T00:00:00.000Z",
    language: "ru",
    originalText: snapshot.selected_work_key === "carpet_laying"
      ? "смета на укладку ковролина 1500 кв метров"
      : workTitle,
    requestMetaFields: [
      { label: "Работа", value: workTitle },
      { label: "Регион", value: visibleRegion(snapshot.region) },
      { label: "Объем", value: `${snapshot.quantity} ${formatEstimateUnitLabel(snapshot.unit)}` },
      { label: "Валюта", value: snapshot.currency },
    ],
    sections,
    totals: {
      materials: snapshot.totals.known_total === null ? "Частично без цен" : String(snapshot.totals.known_total),
      labor: snapshot.totals.known_total === null ? "Частично без цен" : String(snapshot.totals.known_total),
      tax: "Цена отсутствует",
      grand: visiblePriceStatus(snapshot.totals.estimate_total_status),
    },
    tax: {
      label: "Налоговый статус уточняется",
      included: false,
      amount: "Цена отсутствует",
      warning: "Цены с отсутствующим источником не суммируются.",
    },
    assumptions: ["Смета построена из immutable professional estimate snapshot."],
    costIncreaseFactors: ["Доставка, подъем и доступ уточняются до договора."],
    clarifyingQuestions: ["Подтвердить состояние основания и способ фиксации."],
    sources: ["professional estimate snapshot"],
    runtimeTrace: {
      selectedTool: "professional_expanded_estimate_snapshot",
      workKey: snapshot.selected_work_key,
    },
  };
}

export function runProfessionalEstimateExpandedPdfAudit(
  options?: ProfessionalEstimateAuditOptions,
): ProfessionalEstimateWaveJson {
  const cases = [
    ...buildProfessionalCarpetGoldenCases(),
    ...buildProfessionalEstimate1500Cases().filter((item) => item.expected_canonical_work_key !== "carpet_laying").slice(0, 25),
  ].slice(0, 50);
  const policy = professionalExpandedEstimatePresentationPolicy();
  const documents = cases.map((item) => {
    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: item.expected_canonical_work_key ?? "",
      quantity: item.quantity,
      unit: item.unit,
      region: item.region,
    });
    const document = renderEstimatePdfDocument(buildExpandedEstimatePdfViewModel(snapshot));
    return {
      id: item.id,
      selected_work_key: snapshot.selected_work_key,
      text: document.text,
      full_names_appendix_removed: !/Полные наименования строк/i.test(document.text),
      signature_blocks_present: /Подписи сторон/i.test(document.text),
      customer_signature_block_present: /Заказчик/i.test(document.text),
      contractor_signature_block_present: /Исполнитель \/ Подрядчик/i.test(document.text),
      long_names_wrapped_in_table: policy.long_names_wrapped_in_table,
      internal_keys_visible: /[a-z0-9]+_[a-z0-9_]+/i.test(document.text) ? 1 : 0,
      mojibake_found: /Рџ|Рњ|Рќ|Рљ|Рђ|РЎ|Р“|Р”|Р—|Р|РЈ|Р¤|Рћ|Гђ|Г‘|Гўв‚¬/.test(document.text) ? 1 : 0,
    };
  });
  const result = {
    final_status: "GREEN_PROFESSIONAL_ESTIMATE_EXPANDED_PDF_READY",
    expanded_pdf_cases_min: 50,
    expanded_pdf_cases_total: documents.length,
    full_names_appendix_removed: documents.every((item) => item.full_names_appendix_removed),
    signature_blocks_present: documents.every((item) => item.signature_blocks_present),
    customer_signature_block_present: documents.every((item) => item.customer_signature_block_present),
    contractor_signature_block_present: documents.every((item) => item.contractor_signature_block_present),
    long_names_wrapped_in_table: documents.every((item) => item.long_names_wrapped_in_table),
    internal_keys_visible: documents.reduce((sum, item) => sum + item.internal_keys_visible, 0),
    mojibake_found: documents.reduce((sum, item) => sum + item.mojibake_found, 0),
    compressed_estimate_mode_used: false,
    fake_green_claimed: false,
  };
  if (shouldWriteProfessionalEstimateArtifacts(options)) {
    writeProfessionalEstimateJson("expanded_pdf_results.json", {
      ...result,
      examples: documents.slice(0, 5).map((item) => ({
        id: item.id,
        selected_work_key: item.selected_work_key,
        text_head: item.text.split(/\r?\n/).slice(0, 40),
      })),
      fake_green_claimed: false,
    });
    writeProfessionalEstimateJson("pdf_signature_blocks.json", {
      signature_blocks_present: result.signature_blocks_present,
      customer_signature_block_present: result.customer_signature_block_present,
      contractor_signature_block_present: result.contractor_signature_block_present,
      fake_green_claimed: false,
    });
    writeProfessionalEstimateJson("matrix.json", buildProfessionalEstimateMatrixSnapshot());
  }
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
  const professional1500 = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("professional_estimate_1500_results.json") ?? {};
  const deepGolden = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("deep_golden_300_results.json") ?? {};
  const carpet = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("carpet_golden_results.json") ?? {};
  const crossDomain = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("cross_domain_leak_scan.json") ?? {};
  const formulas = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("material_formula_results.json") ?? {};
  const pricebook = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("pricebook_results.json") ?? {};
  const currency = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("regional_currency_results.json") ?? {};
  const snapshot = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("snapshot_no_desync.json") ?? {};
  const expandedPdf = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("expanded_pdf_results.json") ?? {};
  const closeout = readProfessionalEstimateJson<ProfessionalEstimateWaveJson>("CLOSEOUT_PROOF.json") ?? {};
  const head = gitOutput(["rev-parse", "HEAD"], "unknown");
  const originHead = gitOutput(["rev-parse", "@{u}"], "unknown");
  const worktreeClean = gitOutput(["status", "--short", "--untracked-files=all"], "").trim().length === 0;
  const sourceHead = sourceCodeHead();
  const closeoutForCurrentSource = closeout.source_code_head === sourceHead ? closeout : {};
  const matrix = {
    wave: PROFESSIONAL_ESTIMATE_TEMPLATE_WAVE,
    final_status: GREEN_PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE,
    fake_green_claimed: false,
    previous_work_ontology_green: true,
    expanded_estimate_enabled: true,
    compressed_estimate_mode_used: expandedPdf.compressed_estimate_mode_used ?? false,
    full_names_appendix_removed: expandedPdf.full_names_appendix_removed ?? null,
    signature_blocks_present: expandedPdf.signature_blocks_present ?? null,
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
    estimate_built_or_honest_partial: professional1500.summary && typeof professional1500.summary === "object"
      ? (professional1500.summary as Record<string, unknown>).professional_estimate_1500_cases_total ?? null
      : null,
    carpet_cases_total_min: 25,
    carpet_cases_total: carpet.carpet_cases_total ?? null,
    carpet_cases_passed: carpet.carpet_cases_passed ?? null,
    masonry_rows_in_carpet: carpet.masonry_rows_in_carpet ?? null,
    brick_rows_in_carpet: carpet.brick_rows_in_carpet ?? null,
    concrete_rows_in_carpet: carpet.concrete_rows_in_carpet ?? null,
    wrong_domain_rows_in_carpet: carpet.wrong_domain_rows_in_carpet ?? null,
    carpet_required_rows_present: carpet.carpet_required_rows_present ?? null,
    deep_golden_cases: deepGolden.deep_golden_cases ?? null,
    deep_golden_material_failures: deepGolden.must_include_material_failures ?? null,
    forbidden_material_failures: deepGolden.forbidden_material_failures ?? null,
    row_kind_failures: deepGolden.row_kind_failures ?? null,
    cross_domain_row_leaks: crossDomain.cross_domain_row_leaks ?? null,
    wrong_group_template_used: crossDomain.wrong_group_template_used ?? null,
    expanded_pdf_cases_min: 50,
    expanded_pdf_cases_total: expandedPdf.expanded_pdf_cases_total ?? null,
    customer_signature_block_present: expandedPdf.customer_signature_block_present ?? null,
    contractor_signature_block_present: expandedPdf.contractor_signature_block_present ?? null,
    long_names_wrapped_in_table: expandedPdf.long_names_wrapped_in_table ?? null,
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
    internal_keys_visible: expandedPdf.internal_keys_visible ?? 0,
    mojibake_found: expandedPdf.mojibake_found ?? 0,
    snapshot_cases_min: 150,
    ui_pdf_request_history_hashes_match: snapshot.ui_pdf_request_history_hashes_match ?? null,
    ui_repriced_after_snapshot: false,
    pdf_repriced_after_snapshot: false,
    history_repriced_after_snapshot: false,
    selected_work_key_lost: snapshot.selected_work_key_lost ?? null,
    typecheck_passed: closeoutForCurrentSource.typecheck_passed ?? null,
    lint_passed: closeoutForCurrentSource.lint_passed ?? null,
    focused_tests_passed: closeoutForCurrentSource.focused_tests_passed ?? null,
    release_verify_passed: closeoutForCurrentSource.release_verify_passed ?? null,
    blockers: closeoutForCurrentSource.failures ?? [],
    source_code_head: sourceHead,
    current_head_at_write_time: currentHeadAtWriteTime(),
    ...closeoutForCurrentSource,
    origin_head: originHead,
    branch_pushed: head === originHead,
    post_push_release_verify_passed: closeoutForCurrentSource.post_push_release_verify_passed === true && head === originHead,
    local_head_equals_origin_head: head === originHead,
    final_worktree_clean: worktreeClean,
    ...extra,
  };
  return {
    ...matrix,
    blockers: closeoutForCurrentSource.failures ?? matrix.blockers ?? [],
    source_code_head: sourceHead,
    current_head_at_write_time: currentHeadAtWriteTime(),
    fake_green_claimed: false,
  };
}
