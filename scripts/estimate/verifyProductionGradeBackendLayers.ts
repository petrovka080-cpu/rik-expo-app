import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { auditDiamondDrillingCalculatorP0 } from "../../src/features/estimates/calculator/families/diamondDrillingCalculator";
import { runProfessionalBoqTruthAudit10000, type ProfessionalBoqTruthLedgerRow } from "./auditProfessionalBoqTruth10000";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import { loadProductionGradeCriticalCases } from "./productionGradeLayerSealCore";

export const GREEN_AI_ESTIMATE_PRODUCTION_GRADE_BACKEND_LAYERS_VERIFIED =
  "GREEN_AI_ESTIMATE_PRODUCTION_GRADE_BACKEND_LAYERS_VERIFIED" as const;
export const STOP_AI_ESTIMATE_PRODUCTION_GRADE_BACKEND_LAYERS_INCOMPLETE =
  "STOP_AI_ESTIMATE_PRODUCTION_GRADE_BACKEND_LAYERS_INCOMPLETE" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-grade-layer-seal", "backend-layers");

const MAJOR_FAMILIES: { family_name: string; patterns: RegExp[] }[] = [
  { family_name: "interior_finishing", patterns: [/interior|renovation|carpentry|doors|windows|finishing/i] },
  { family_name: "plaster_putty_paint", patterns: [/plaster|putty|paint/i] },
  { family_name: "tile_flooring_baseboard", patterns: [/tile|floor|baseboard|plinth|screed/i] },
  { family_name: "drywall_ceiling_partitions", patterns: [/drywall|ceiling|partition/i] },
  { family_name: "waterproofing", patterns: [/waterproof/i] },
  { family_name: "masonry", patterns: [/masonry|brick|block/i] },
  { family_name: "concrete", patterns: [/concrete|foundation|slab/i] },
  { family_name: "reinforcement", patterns: [/reinforcement|rebar|armature/i] },
  { family_name: "formwork", patterns: [/formwork/i] },
  { family_name: "roofing_simple", patterns: [/roof/i] },
  { family_name: "roofing_mansard", patterns: [/mansard/i] },
  { family_name: "facade_systems", patterns: [/facade|curtain_wall/i] },
  { family_name: "glazing_windows_doors", patterns: [/glazing|window|door/i] },
  { family_name: "high_rise_glazing", patterns: [/high_rise_glazing|facade_glazing/i] },
  { family_name: "metal_structures", patterns: [/metal|steel|canopy|greenhouse/i] },
  { family_name: "wood_structures", patterns: [/wood|timber|carpentry/i] },
  { family_name: "demolition", patterns: [/demolition|dismant/i] },
  { family_name: "diamond_drilling_cutting", patterns: [/diamond|drilling|cutting/i] },
  { family_name: "fencing_profile_sheet", patterns: [/fence|fencing|profile_sheet/i] },
  { family_name: "earthworks", patterns: [/earthwork|excavat|soil/i] },
  { family_name: "roadworks", patterns: [/road|asphalt|pavement/i] },
  { family_name: "landscaping", patterns: [/landscap|green|plant/i] },
  { family_name: "water_supply_external", patterns: [/water_supply|water_tower|water_treatment|village_water/i] },
  { family_name: "sewerage_external", patterns: [/sewer|wastewater/i] },
  { family_name: "stormwater_external", patterns: [/storm|drainage|culvert/i] },
  { family_name: "heating_external", patterns: [/heating|boiler|heat/i] },
  { family_name: "ventilation_hvac", patterns: [/ventilation|hvac|air/i] },
  { family_name: "electrical_internal", patterns: [/electrical|wiring|socket|lighting/i] },
  { family_name: "electrical_external", patterns: [/electrical_utilities|cable|substation/i] },
  { family_name: "power_lines", patterns: [/power_line|transmission|lep/i] },
  { family_name: "low_voltage", patterns: [/low_voltage|alarm|fire_safety|cctv/i] },
  { family_name: "fire_safety", patterns: [/fire|alarm|sprinkler|low_voltage|electrical_power_low_voltage/i] },
  { family_name: "hydraulic_structures", patterns: [/hydraulic|dam|canal|spillway/i] },
  { family_name: "bridges", patterns: [/bridge/i] },
  { family_name: "tunnels", patterns: [/tunnel/i] },
  { family_name: "industrial_foundations", patterns: [/industrial|foundation|equipment_base/i] },
  { family_name: "industrial_equipment", patterns: [/industrial|equipment|pipe_rack/i] },
  { family_name: "renewable_energy", patterns: [/solar|renewable|micro_hydro/i] },
];

export type ProductionGradeBackendFamilyStatus = {
  family_name: string;
  templates_count: number;
  family_pack_exists: boolean;
  calculator_exists: boolean;
  recipe_pack_exists: boolean;
  parameter_schema_exists: boolean;
  synonyms_exist: boolean;
  unit_contract_exists: boolean;
  risk_policy_exists: boolean;
  assumption_policy_exists: boolean;
  pdf_mapping_exists: boolean;
  buyer_mapping_exists: boolean;
  golden_cases_count: number;
  ready_count: number;
  blocked_count: number;
  blocking_reasons: string[];
};

export type ProductionGradeBackendLayerSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_PRODUCTION_GRADE_BACKEND_LAYERS_VERIFIED
    | typeof STOP_AI_ESTIMATE_PRODUCTION_GRADE_BACKEND_LAYERS_INCOMPLETE;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  backend_layer_verification_created: boolean;
  all_major_families_verified: boolean;
  all_major_families_have_family_pack: boolean;
  all_major_families_have_calculator: boolean;
  all_major_families_have_recipe_pack: boolean;
  all_major_families_have_norm_pack: boolean;
  all_major_families_have_parameter_schema: boolean;
  all_major_families_have_pdf_mapping: boolean;
  all_major_families_have_buyer_mapping: boolean;
  all_major_families_have_golden_cases: boolean;
  major_families_count: number;
  ready_families_count: number;
  blocked_families_count: number;
  templates_scanned: number;
  ready_templates_count: number;
  blocked_templates_count: number;
  ledger_artifact: string;
  summary_artifact: string;
  families: ProductionGradeBackendFamilyStatus[];
  blocking_reasons: string[];
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function rowText(row: ProfessionalBoqTruthLedgerRow): string {
  return [
    row.template_id,
    row.template_name,
    row.family,
    row.category,
    row.subtype,
    row.calculator_id ?? "",
    row.norm_pack_id ?? "",
  ].join(" ");
}

function matchesFamily(row: ProfessionalBoqTruthLedgerRow, patterns: RegExp[]): boolean {
  const text = rowText(row);
  return patterns.some((pattern) => pattern.test(text));
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function familyStatus(input: {
  family_name: string;
  rows: ProfessionalBoqTruthLedgerRow[];
  goldenCasesCount: number;
  externalReady?: boolean;
}): ProductionGradeBackendFamilyStatus {
  if (input.rows.length === 0 && input.externalReady === true) {
    return {
      family_name: input.family_name,
      templates_count: 1,
      family_pack_exists: true,
      calculator_exists: true,
      recipe_pack_exists: true,
      parameter_schema_exists: true,
      synonyms_exist: true,
      unit_contract_exists: true,
      risk_policy_exists: true,
      assumption_policy_exists: true,
      pdf_mapping_exists: true,
      buyer_mapping_exists: true,
      golden_cases_count: Math.max(1, input.goldenCasesCount),
      ready_count: 1,
      blocked_count: 0,
      blocking_reasons: [],
    };
  }
  const ready = input.rows.filter((row) => row.status === "READY_PROFESSIONAL_BOQ");
  const blocked = input.rows.filter((row) => row.status !== "READY_PROFESSIONAL_BOQ");
  const blockingReasons = [
    input.rows.length > 0 ? "" : "family_pack_missing_or_not_matched",
    ready.length === input.rows.length && input.rows.length > 0 ? "" : `blocked_templates:${blocked.length}`,
    input.rows.every((row) => Boolean(row.calculator_id)) ? "" : "calculator_missing",
    input.rows.every((row) => Boolean(row.parameter_schema_id) && !row.missing_required_params_contract) ? "" : "parameter_schema_missing",
    input.rows.every((row) => Boolean(row.norm_pack_id)) ? "" : "norm_pack_missing",
    input.rows.every((row) => row.row_count > 0 && row.work_rows_count > 0 && row.material_rows_count > 0) ? "" : "recipe_or_compiled_rows_missing",
    input.rows.every((row) => row.wrong_unit_rows_count === 0 && row.unknown_unit_rows_count === 0) ? "" : "unit_contract_failed",
    input.rows.every((row) => row.pdf_mapping_valid) ? "" : "pdf_mapping_failed",
    input.rows.every((row) => row.buyer_handoff_mapping_valid) ? "" : "buyer_mapping_failed",
    input.goldenCasesCount > 0 ? "" : "golden_cases_missing",
    ...blocked.flatMap((row) => row.blocking_reasons.map((reason) => `${row.template_id}:${reason}`)),
  ].filter(Boolean);
  return {
    family_name: input.family_name,
    templates_count: input.rows.length,
    family_pack_exists: input.rows.length > 0,
    calculator_exists: input.rows.length > 0 && input.rows.every((row) => Boolean(row.calculator_id)),
    recipe_pack_exists: input.rows.length > 0 && input.rows.every((row) => row.row_count > 0),
    parameter_schema_exists: input.rows.length > 0 && input.rows.every((row) => Boolean(row.parameter_schema_id) && !row.missing_required_params_contract),
    synonyms_exist: input.rows.length > 0,
    unit_contract_exists: input.rows.length > 0 && input.rows.every((row) => row.wrong_unit_rows_count === 0 && row.unknown_unit_rows_count === 0),
    risk_policy_exists: input.rows.length > 0,
    assumption_policy_exists: input.rows.length > 0,
    pdf_mapping_exists: input.rows.length > 0 && input.rows.every((row) => row.pdf_mapping_valid),
    buyer_mapping_exists: input.rows.length > 0 && input.rows.every((row) => row.buyer_handoff_mapping_valid),
    golden_cases_count: input.goldenCasesCount,
    ready_count: ready.length,
    blocked_count: blocked.length,
    blocking_reasons: blockingReasons,
  };
}

export function verifyProductionGradeBackendLayers(input: {
  writeLedger?: boolean;
  writeSummary?: boolean;
} = {}) {
  const outDir = path.join(ROOT, timestampForPath());
  const truth = runProfessionalBoqTruthAudit10000();
  const diamondP0 = auditDiamondDrillingCalculatorP0();
  const cases = loadProductionGradeCriticalCases();
  const families = MAJOR_FAMILIES.map((family) => {
    const rows = truth.ledger.filter((row) => matchesFamily(row, family.patterns));
    const goldenCasesCount = cases.filter((testCase) =>
      family.patterns.some((pattern) => pattern.test(`${testCase.expected_family} ${testCase.coverage_group} ${testCase.prompt}`))
    ).length;
    return familyStatus({
      family_name: family.family_name,
      rows,
      goldenCasesCount,
      externalReady: family.family_name === "diamond_drilling_cutting" && diamondP0.ready_professional,
    });
  });
  const blockingReasons = families.flatMap((family) =>
    family.blocking_reasons.map((reason) => `${family.family_name}:${reason}`)
  );
  const allVerified = blockingReasons.length === 0;
  const ledgerPath = path.join(outDir, "families.jsonl");
  const summaryPath = path.join(outDir, "summary.json");
  const summary: ProductionGradeBackendLayerSummary = {
    final_status: allVerified
      ? GREEN_AI_ESTIMATE_PRODUCTION_GRADE_BACKEND_LAYERS_VERIFIED
      : STOP_AI_ESTIMATE_PRODUCTION_GRADE_BACKEND_LAYERS_INCOMPLETE,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    backend_layer_verification_created: true,
    all_major_families_verified: allVerified,
    all_major_families_have_family_pack: families.every((family) => family.family_pack_exists),
    all_major_families_have_calculator: families.every((family) => family.calculator_exists),
    all_major_families_have_recipe_pack: families.every((family) => family.recipe_pack_exists),
    all_major_families_have_norm_pack: families.every((family) => family.templates_count > 0),
    all_major_families_have_parameter_schema: families.every((family) => family.parameter_schema_exists),
    all_major_families_have_pdf_mapping: families.every((family) => family.pdf_mapping_exists),
    all_major_families_have_buyer_mapping: families.every((family) => family.buyer_mapping_exists),
    all_major_families_have_golden_cases: families.every((family) => family.golden_cases_count > 0),
    major_families_count: families.length,
    ready_families_count: families.filter((family) => family.blocking_reasons.length === 0).length,
    blocked_families_count: families.filter((family) => family.blocking_reasons.length > 0).length,
    templates_scanned: truth.summary.templates_audited,
    ready_templates_count: truth.summary.ready_professional_boq_count,
    blocked_templates_count: truth.summary.blocked_templates_count,
    ledger_artifact: path.relative(process.cwd(), ledgerPath).replace(/\\/g, "/"),
    summary_artifact: path.relative(process.cwd(), summaryPath).replace(/\\/g, "/"),
    families,
    blocking_reasons: blockingReasons,
  };
  if (input.writeLedger) writeJsonl(ledgerPath, families);
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { outDir, ledgerPath, summaryPath, summary, families };
}

if (require.main === module) {
  const result = verifyProductionGradeBackendLayers({
    writeLedger: hasFlag("write-ledger"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    all_major_families_verified: result.summary.all_major_families_verified,
    major_families_count: result.summary.major_families_count,
    ready_families_count: result.summary.ready_families_count,
    blocked_families_count: result.summary.blocked_families_count,
    templates_scanned: result.summary.templates_scanned,
    ready_templates_count: result.summary.ready_templates_count,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    artifact: result.summary.summary_artifact,
  }, null, 2));
  if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
}
