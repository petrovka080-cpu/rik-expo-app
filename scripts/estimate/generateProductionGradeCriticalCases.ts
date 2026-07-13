import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import extendedCasesJson from "../../data/estimate-golden-cases/extended-100-work-cases.json";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { draftHasProfessionalBoqSourceTrace } from "../../src/lib/estimate/buildProfessionalBoqDraft";
import {
  PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES,
} from "./professionalBoqRuntimeContractCases";
import { WAVE2C_EXPANDED_CRITICAL_CASES } from "./wave2CExpandedBoqCases";

const COVERAGE_GROUPS = [
  "interior_renovation",
  "plaster_paint_tile_flooring",
  "concrete_reinforcement_formwork_masonry",
  "roof_mansard_facade_glazing",
  "drilling_cutting_demolition",
  "fencing_landscaping",
  "road_earthworks",
  "water_sewer_stormwater",
  "electrical_power_low_voltage",
  "hydraulic_bridge_tunnel_industrial_high_risk",
] as const;

type ProductionGradeCoverageGroup = typeof COVERAGE_GROUPS[number];

type ExtendedCase = {
  case_id: string;
  prompt: string;
  expected_work_group: string;
};

type Candidate = {
  case_id: string;
  prompt: string;
  coverage_group: ProductionGradeCoverageGroup;
  source: string;
  expected_family: string;
  required_row_types: string[];
  expected_units: string[];
  high_risk_expected: boolean;
};

const EXTENDED_GROUP_MAP: Record<string, ProductionGradeCoverageGroup> = {
  carpentry: "interior_renovation",
  ceiling: "interior_renovation",
  cleaning: "interior_renovation",
  documents_design: "interior_renovation",
  doors_windows: "interior_renovation",
  drywall: "interior_renovation",
  wall_finishing: "interior_renovation",
  waterproofing: "interior_renovation",
  painting: "plaster_paint_tile_flooring",
  plastering: "plaster_paint_tile_flooring",
  tile: "plaster_paint_tile_flooring",
  flooring: "plaster_paint_tile_flooring",
  putty: "plaster_paint_tile_flooring",
  concrete: "concrete_reinforcement_formwork_masonry",
  foundation: "concrete_reinforcement_formwork_masonry",
  masonry: "concrete_reinforcement_formwork_masonry",
  facade: "roof_mansard_facade_glazing",
  roofing: "roof_mansard_facade_glazing",
  demolition: "drilling_cutting_demolition",
  landscaping: "fencing_landscaping",
  roadworks: "road_earthworks",
  electrical: "electrical_power_low_voltage",
  heating_hvac: "hydraulic_bridge_tunnel_industrial_high_risk",
  metalworks: "hydraulic_bridge_tunnel_industrial_high_risk",
};

const SYNTHETIC_VERIFIED_CASES: readonly {
  id: string;
  prompt: string;
  group: ProductionGradeCoverageGroup;
}[] = [
  { id: "fence-002", prompt: "забор из профлиста 100 м высота 2 м", group: "fencing_landscaping" },
  { id: "fence-003", prompt: "ограждение участка профнастил 120 м высота 2 м", group: "fencing_landscaping" },
  { id: "fence-004", prompt: "забор металлический 60 м высота 2 м столбы бетон", group: "fencing_landscaping" },
  { id: "fence-005", prompt: "ограждение стройплощадки 150 м профлист высота 2 м", group: "fencing_landscaping" },
  { id: "fence-006", prompt: "забор из профнастила 200 м ворота калитка высота 2 м", group: "fencing_landscaping" },
  { id: "drill-002", prompt: "diamond core drilling concrete 12 holes diameter 90 mm depth 180 mm", group: "drilling_cutting_demolition" },
  { id: "drill-003", prompt: "алмазное бурение отверстий в бетоне 8 шт диаметр 160 мм глубина 250 мм", group: "drilling_cutting_demolition" },
  { id: "demo-002", prompt: "демонтаж железобетона 20 м3", group: "drilling_cutting_demolition" },
  { id: "demo-003", prompt: "load bearing wall demolition 12 m2 preliminary estimate", group: "drilling_cutting_demolition" },
  { id: "demo-004", prompt: "демонтаж несущей стены 18 м2 предварительная оценка", group: "drilling_cutting_demolition" },
  { id: "road-002", prompt: "дорога 3 км ширина 6 м щебень асфальт водоотвод", group: "road_earthworks" },
  { id: "road-003", prompt: "земляные работы дорога 1 км ширина 5 м планировка уплотнение", group: "road_earthworks" },
  { id: "water-002", prompt: "наружная канализация 3 км труба 200 колодцы каждые 60 м", group: "water_sewer_stormwater" },
  { id: "water-003", prompt: "водоснабжение поселка 7 км труба ПНД 160 насосная станция", group: "water_sewer_stormwater" },
  { id: "water-004", prompt: "ливневая канализация 2 км лотки колодцы пескоуловители", group: "water_sewer_stormwater" },
] as const;

const SYNTHETIC_PROMPT_OVERRIDES: Record<string, string> = {
  "fence-002": "site perimeter profiled metal fence 100 m height 2 m",
  "fence-003": "site perimeter profiled metal fence 120 m height 2 m",
  "fence-004": "site perimeter profiled metal fence 60 m height 2 m concrete posts",
  "fence-005": "construction site temporary profiled sheet fence 150 m height 2 m",
  "fence-006": "temporary construction site profiled sheet fence 200 m gate wicket height 2 m",
  "drill-003": "diamond drilling in concrete 8 holes diameter 160 mm depth 250 mm",
  "demo-002": "reinforced concrete demolition 20 cubic meters",
  "demo-004": "load bearing wall demolition 18 m2 preliminary estimate",
  "road-002": "road 3 km width 6 m crushed stone asphalt drainage",
  "road-003": "road earthworks 1 km width 5 m grading and compaction",
  "water-002": "external sewer 3 km pipe 200 mm manholes every 60 m",
  "water-003": "village water supply 7 km HDPE 160 pipe pumping station",
  "water-004": "storm sewer 2 km trays manholes sand traps",
};

function mapWave2CCoverage(testCase: { category: string }): ProductionGradeCoverageGroup {
  if (/water|sewer|storm/i.test(testCase.category)) return "water_sewer_stormwater";
  if (/road|transport/i.test(testCase.category)) return "road_earthworks";
  if (/electrical|utility/i.test(testCase.category)) return "electrical_power_low_voltage";
  return "hydraulic_bridge_tunnel_industrial_high_risk";
}

function mapRuntimeCoverage(testCase: { category: string }): ProductionGradeCoverageGroup {
  const mapped: Partial<Record<string, ProductionGradeCoverageGroup>> = {
    concrete: "drilling_cutting_demolition",
    fencing: "fencing_landscaping",
    water_supply: "water_sewer_stormwater",
    roadworks: "road_earthworks",
    hydraulic: "hydraulic_bridge_tunnel_industrial_high_risk",
    electrical: "electrical_power_low_voltage",
    facade: "roof_mansard_facade_glazing",
    roofing: "roof_mansard_facade_glazing",
    bridge: "hydraulic_bridge_tunnel_industrial_high_risk",
    tunnel: "hydraulic_bridge_tunnel_industrial_high_risk",
    gas_heat: "hydraulic_bridge_tunnel_industrial_high_risk",
    demolition: "drilling_cutting_demolition",
    sewer: "water_sewer_stormwater",
    painting: "plaster_paint_tile_flooring",
    tile: "plaster_paint_tile_flooring",
    plastering: "plaster_paint_tile_flooring",
    industrial: "hydraulic_bridge_tunnel_industrial_high_risk",
  };
  return mapped[testCase.category] ?? "interior_renovation";
}

function uniqueSorted(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))].sort();
}

function candidateFrom(input: {
  case_id: string;
  prompt: string;
  coverage_group: ProductionGradeCoverageGroup;
  source: string;
}): Candidate | null {
  const draft = buildConsumerRepairAiDraft(input.prompt, { city: "Bishkek", currency: "KGS" });
  if (!draft.items.length || !draftHasProfessionalBoqSourceTrace(draft)) return null;
  const riskLevel = String(draft.items[0]?.sourceParameters?.professionalBoqRiskLevel ?? "standard");
  return {
    ...input,
    expected_family: draft.selectedWork?.selectedWorkKey ?? draft.repairType,
    required_row_types: uniqueSorted(draft.items.map((item) => item.itemType)),
    expected_units: uniqueSorted(draft.items.map((item) => item.unit)).slice(0, 8),
    high_risk_expected: riskLevel === "elevated" || riskLevel === "regulated",
  };
}

export function buildProductionGradeCriticalCasesFixture() {
  const candidates: Candidate[] = [];
  for (const testCase of (extendedCasesJson as { cases: ExtendedCase[] }).cases) {
    const coverageGroup = EXTENDED_GROUP_MAP[testCase.expected_work_group];
    if (!coverageGroup) continue;
    const candidate = candidateFrom({
      case_id: `pg-ext-${testCase.case_id}`,
      prompt: testCase.prompt,
      coverage_group: coverageGroup,
      source: "extended_100",
    });
    if (candidate) candidates.push(candidate);
  }
  for (const testCase of WAVE2C_EXPANDED_CRITICAL_CASES) {
    const candidate = candidateFrom({
      case_id: `pg-w2c-${testCase.case_id}`,
      prompt: testCase.prompt,
      coverage_group: mapWave2CCoverage(testCase),
      source: "wave2c_expanded",
    });
    if (candidate) candidates.push(candidate);
  }
  for (const testCase of PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES) {
    const candidate = candidateFrom({
      case_id: `pg-runtime-${testCase.case_id}`,
      prompt: testCase.prompt,
      coverage_group: mapRuntimeCoverage(testCase),
      source: "runtime_contract_18",
    });
    if (candidate) candidates.push(candidate);
  }
  for (const testCase of SYNTHETIC_VERIFIED_CASES) {
    const prompt = SYNTHETIC_PROMPT_OVERRIDES[testCase.id] ?? testCase.prompt;
    const candidate = candidateFrom({
      case_id: `pg-synth-${testCase.id}`,
      prompt,
      coverage_group: testCase.group,
      source: "synthetic_verified",
    });
    if (!candidate) throw new Error(`SYNTHETIC_PRODUCTION_CASE_NOT_TRACEABLE:${testCase.id}`);
    candidates.push(candidate);
  }

  const selected: Candidate[] = [];
  for (const group of COVERAGE_GROUPS) {
    const available = candidates.filter(
      (candidate) => candidate.coverage_group === group && !selected.some((item) => item.case_id === candidate.case_id),
    );
    if (available.length < 10) throw new Error(`PRODUCTION_GRADE_CASE_GROUP_SHORT:${group}:${available.length}`);
    selected.push(...available.slice(0, 10));
  }
  if (selected.length !== 100) throw new Error(`PRODUCTION_GRADE_CASE_COUNT_INVALID:${selected.length}`);

  return {
    schema: "production-grade-web-android-critical-cases-v1",
    case_set: "production-grade-critical",
    generated_from: [
      "data/estimate-golden-cases/extended-100-work-cases.json",
      "scripts/estimate/wave2CExpandedBoqCases.ts",
      "scripts/estimate/professionalBoqRuntimeContractCases.ts",
      "synthetic_verified_prompt_variants",
    ],
    generated_policy: "every selected prompt produced a non-empty traceable professional BOQ draft before fixture generation",
    coverage_groups: Object.fromEntries(COVERAGE_GROUPS.map((group) => [
      group,
      selected.filter((item) => item.coverage_group === group).length,
    ])),
    cases: selected.map((item) => ({
      case_id: item.case_id,
      prompt: item.prompt,
      expected_family: item.expected_family,
      coverage_group: item.coverage_group,
      source: item.source,
      required_row_types: item.required_row_types,
      required_material_keywords: [],
      required_service_keywords: [],
      required_equipment_keywords: [],
      expected_units: item.expected_units,
      forbidden_units: ["unknown", "UNKNOWN"],
      high_risk_expected: item.high_risk_expected,
      pdf_required: true,
      buyer_handoff_required: true,
      forbidden_refusal: true,
      forbidden_drawings_required_stop: true,
      forbidden_raw_dump: true,
      forbidden_fake_final_total: true,
    })),
  };
}

if (require.main === module) {
  const fixture = buildProductionGradeCriticalCasesFixture();
  const outPath = path.join("tests", "fixtures", "estimate", "productionGradeWebAndroidCriticalCases.json");
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    artifact: outPath,
    production_grade_critical_cases_count: fixture.cases.length,
    coverage_groups: fixture.coverage_groups,
  }, null, 2));
}
