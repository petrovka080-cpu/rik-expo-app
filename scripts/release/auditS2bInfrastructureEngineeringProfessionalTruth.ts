import fs from "node:fs";
import path from "node:path";
import {
  calculateExpandedComplexEstimate,
  getExpandedComplexWorkFamily,
  type ExpandedComplexBoqRow,
} from "../../src/lib/ai/expandedComplexWorks";
import {
  S2B_INFRASTRUCTURE_FAMILY_MANIFEST,
  type S2BFamilyManifestEntry,
} from "../../src/lib/ai/expandedComplexWorks/s2b/manifest";
import {
  resolveS2BDomainBlockCoverage,
  type S2BDomainBlockCoverage,
} from "../../src/lib/ai/expandedComplexWorks/s2b/domainBlockCoverage";
import {
  isS2BBackendOwnedFamily,
  s2bWave2KindForFamily,
} from "../../src/lib/ai/expandedComplexWorks/s2b/registry";

const PROMPTS_BY_FAMILY: Record<string, string> = {
  asphalt_concrete_pavement: "Асфальтирование 10 000 м²",
  road_construction: "Дорога 1 км шириной 7 м, асфальтобетон, основание щебень",
  village_water_supply: "Водопровод Ø110 длиной 1 000 м",
  village_sewer_network: "Канализация Ø200 длиной 800 м, 12 колодцев",
  stormwater_drainage: "Ливневая канализация 500 м с дождеприёмниками",
  heat_network: "Теплосеть Ø159 длиной 300 м",
  underground_cable_line: "Кабельная линия 10 кВ длиной 2 км",
  transformer_substation: "КТП подстанция 10 кВ",
  bridge_construction: "Мост длиной 60 м шириной 10 м",
  tunnel_construction: "Тоннель длиной 400 м",
  retaining_wall: "Подпорная стена 80 × 4 м",
  technological_pipeline: "Технологический трубопровод Ø159 длиной 600 м",
  ventilation_system: "Вентиляция кафе 120 м²",
  boiler_house: "Котельная 1 МВт",
  well_construction: "Скважина глубиной 80 м",
  solar_power_plant: "Солнечная электростанция 30 кВт",
  multi_utility_trench: "Подвести воду канализацию электричество длиной 100 м",
  earth_dam: "Дамба длиной 120 м высотой 6 м",
};

type FamilyAudit = {
  work_family_id: string;
  prompt: string;
  ready: boolean;
  blockers: string[];
  missing_domain_blocks: string[];
  domain_blocks_needing_input: string[];
  domain_block_coverage: S2BDomainBlockCoverage[];
  wrong_units: string[];
  row_count: number;
};

function allRows(rows: {
  material_rows: ExpandedComplexBoqRow[];
  work_rows: ExpandedComplexBoqRow[];
  equipment_rows: ExpandedComplexBoqRow[];
  service_rows: ExpandedComplexBoqRow[];
}): ExpandedComplexBoqRow[] {
  return [...rows.material_rows, ...rows.work_rows, ...rows.equipment_rows, ...rows.service_rows];
}

function countDuplicates(values: readonly string[]): number {
  return values.length - new Set(values).size;
}

function auditFamily(entry: S2BFamilyManifestEntry): FamilyAudit {
  const prompt = PROMPTS_BY_FAMILY[entry.work_family_id];
  const blockers: string[] = [];
  if (!prompt) blockers.push("missing_audit_prompt");

  const family = getExpandedComplexWorkFamily(entry.work_family_id);
  if (!family) {
    return {
      work_family_id: entry.work_family_id,
      prompt: prompt ?? "",
      ready: false,
      blockers: ["missing_work_family"],
      missing_domain_blocks: entry.required_domain_blocks.slice(),
      domain_blocks_needing_input: [],
      domain_block_coverage: [],
      wrong_units: [],
      row_count: 0,
    };
  }

  if (family.calculatorId !== entry.calculator_id) blockers.push("wrong_calculator_binding");
  const clientCompilerKind = s2bWave2KindForFamily(family);
  if (isS2BBackendOwnedFamily(family) ? clientCompilerKind !== null : clientCompilerKind !== entry.kind) {
    blockers.push("wrong_s2b_kind");
  }
  if (!entry.parameter_passport_id || entry.required_p0_parameters.length === 0) blockers.push("missing_p0_schema");

  const estimate = calculateExpandedComplexEstimate({ prompt: prompt ?? entry.work_family_id, familyId: entry.work_family_id });
  if (!estimate) {
    return {
      work_family_id: entry.work_family_id,
      prompt: prompt ?? "",
      ready: false,
      blockers: [...blockers, "estimate_not_resolved"],
      missing_domain_blocks: entry.required_domain_blocks.slice(),
      domain_blocks_needing_input: [],
      domain_block_coverage: [],
      wrong_units: [],
      row_count: 0,
    };
  }

  const rows = allRows(estimate);
  const codes = rows.map((row) => row.code);
  const duplicateCodes = countDuplicates(codes);
  const domainBlockCoverage = resolveS2BDomainBlockCoverage(entry, estimate);
  const missingBlocks = domainBlockCoverage
    .filter((item) => item.status === "UNRESOLVED")
    .map((item) => item.block_id);
  const domainBlocksNeedingInput = domainBlockCoverage
    .filter((item) => item.status === "MISSING_DESIGN_INPUT")
    .map((item) => item.block_id);
  const wrongUnits = rows.filter((row) => !entry.allowed_units.includes(row.unit));
  const genericDepth = rows.filter((row) => row.code.startsWith("professional_"));
  const fakePrices = rows.filter((row) => row.priceStatus !== "PRICE_MISSING" || row.unitPrice !== null || row.total !== null);
  const missingFormulaTrace = rows.filter((row) => !row.quantityFormula || !estimate.calculation_trace.some((step) => step.startsWith(`${row.code}:`)));

  if (estimate.calculatorId !== entry.calculator_id) blockers.push("wrong_runtime_calculator");
  if (genericDepth.length > 0) blockers.push("generic_depth_used_as_professional");
  if (missingBlocks.length > 0) blockers.push("missing_domain_blocks");
  if (wrongUnits.length > 0) blockers.push("wrong_units");
  if (duplicateCodes > 0) blockers.push("duplicate_codes");
  if (missingFormulaTrace.length > 0 || estimate.calculation_trace.length !== rows.length) blockers.push("missing_formula_trace");
  if (fakePrices.length > 0) blockers.push("fake_price_count");
  if (estimate.price_state.finalTotalAllowed || rows.some((row) => row.total !== null)) blockers.push("unsafe_final_count");
  if (entry.forbidden_calculators.includes(estimate.calculatorId)) blockers.push("forbidden_calculator_used");

  return {
    work_family_id: entry.work_family_id,
    prompt: prompt ?? "",
    ready: blockers.length === 0,
    blockers,
    missing_domain_blocks: missingBlocks,
    domain_blocks_needing_input: domainBlocksNeedingInput,
    domain_block_coverage: domainBlockCoverage,
    wrong_units: [...new Set(wrongUnits.map((row) => `${row.unit}:${row.code}`))],
    row_count: rows.length,
  };
}

const familyAudits = S2B_INFRASTRUCTURE_FAMILY_MANIFEST.map(auditFamily);
const blockerCounters = {
  generic_depth_used_as_professional: familyAudits.filter((item) => item.blockers.includes("generic_depth_used_as_professional")).length,
  wrong_calculator_binding: familyAudits.filter((item) => item.blockers.includes("wrong_calculator_binding") || item.blockers.includes("wrong_runtime_calculator")).length,
  wrong_s2b_kind: familyAudits.filter((item) => item.blockers.includes("wrong_s2b_kind")).length,
  missing_p0_schema: familyAudits.filter((item) => item.blockers.includes("missing_p0_schema")).length,
  missing_domain_blocks: familyAudits.filter((item) => item.blockers.includes("missing_domain_blocks")).length,
  domain_blocks_needing_input: familyAudits.reduce((sum, item) => sum + item.domain_blocks_needing_input.length, 0),
  wrong_units: familyAudits.filter((item) => item.blockers.includes("wrong_units")).length,
  duplicate_codes: familyAudits.filter((item) => item.blockers.includes("duplicate_codes")).length,
  missing_formula_trace: familyAudits.filter((item) => item.blockers.includes("missing_formula_trace")).length,
  fake_price_count: familyAudits.filter((item) => item.blockers.includes("fake_price_count")).length,
  unsafe_final_count: familyAudits.filter((item) => item.blockers.includes("unsafe_final_count")).length,
};

const blockerTotal = familyAudits.reduce((sum, item) => sum + item.blockers.length, 0);
const summary = {
  status: blockerTotal === 0
    ? "GREEN_S2B_SOFTWARE_IMPLEMENTATION_READY_FOR_DOMAIN_EXPERT_REVIEW_NO_RELEASE"
    : "STOP_S2B_INFRASTRUCTURE_ENGINEERING_AUDIT_BLOCKED_NO_GREEN",
  family_total: S2B_INFRASTRUCTURE_FAMILY_MANIFEST.length,
  family_ready: familyAudits.filter((item) => item.ready).length,
  family_blocked: familyAudits.filter((item) => !item.ready).length,
  ...blockerCounters,
  domain_expert_review_recorded: false,
  release_started: false,
  render_deploy_started: false,
  fake_green_claimed: false,
  families: familyAudits,
};

const artifactDir = path.join(
  process.cwd(),
  ".release-runtime",
  "s2b-infrastructure-engineering-professional-truth",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
fs.writeFileSync(
  path.join(process.cwd(), ".release-runtime", "s2b-infrastructure-engineering-professional-truth", "latest.json"),
  `${JSON.stringify({ summary_path: path.relative(process.cwd(), path.join(artifactDir, "summary.json")).replace(/\\/g, "/"), status: summary.status }, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(summary, null, 2));
if (blockerTotal > 0) {
  process.exitCode = 1;
}
