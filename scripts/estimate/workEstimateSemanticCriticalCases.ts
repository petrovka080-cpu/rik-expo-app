import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  runProductionGradeEstimateCase,
  type ProductionGradeCaseProof,
  type ProductionGradeCoverageGroup,
  type ProductionGradeCriticalCase,
} from "./productionGradeLayerSealCore";
import { buildProfessionalEstimate1500Cases } from "../e2e/professionalEstimate1500WorkCases";

export const WORK_ESTIMATE_SEMANTIC_CRITICAL_CASE_SET = "work-estimate-semantic-critical" as const;
export const WORK_ESTIMATE_SEMANTIC_RUNTIME_ROOT =
  ".release-runtime/ai-estimate-11610-work-semantic-acceptance";

type SemanticGroupQuota = {
  group: string;
  count: number;
  coverageGroup: ProductionGradeCoverageGroup;
};

export type WorkEstimateSemanticCriticalCase = ProductionGradeCriticalCase & {
  semantic_source_case_id: string;
  expected_group_key: string;
};

type SemanticDraftItem = ReturnType<typeof buildConsumerRepairAiDraft>["items"][number];

const SEMANTIC_GROUP_QUOTAS: readonly SemanticGroupQuota[] = [
  { group: "demolition", count: 9, coverageGroup: "drilling_cutting_demolition" },
  { group: "earthworks", count: 9, coverageGroup: "road_earthworks" },
  { group: "foundation_concrete", count: 10, coverageGroup: "concrete_reinforcement_formwork_masonry" },
  { group: "reinforcement_formwork", count: 8, coverageGroup: "concrete_reinforcement_formwork_masonry" },
  { group: "masonry", count: 8, coverageGroup: "concrete_reinforcement_formwork_masonry" },
  { group: "waterproofing", count: 6, coverageGroup: "roof_mansard_facade_glazing" },
  { group: "roofing", count: 8, coverageGroup: "roof_mansard_facade_glazing" },
  { group: "insulation", count: 5, coverageGroup: "roof_mansard_facade_glazing" },
  { group: "facade", count: 8, coverageGroup: "roof_mansard_facade_glazing" },
  { group: "plaster_putty_paint", count: 10, coverageGroup: "plaster_paint_tile_flooring" },
  { group: "drywall_ceiling", count: 8, coverageGroup: "interior_renovation" },
  { group: "tile_stone", count: 8, coverageGroup: "plaster_paint_tile_flooring" },
  { group: "flooring", count: 8, coverageGroup: "plaster_paint_tile_flooring" },
  { group: "doors_windows", count: 5, coverageGroup: "roof_mansard_facade_glazing" },
  { group: "electrical_power", count: 10, coverageGroup: "electrical_power_low_voltage" },
  { group: "low_voltage_security", count: 5, coverageGroup: "electrical_power_low_voltage" },
  { group: "plumbing_sewerage", count: 10, coverageGroup: "water_sewer_stormwater" },
  { group: "heating_hvac", count: 5, coverageGroup: "hydraulic_bridge_tunnel_industrial_high_risk" },
  { group: "ventilation_ac", count: 4, coverageGroup: "hydraulic_bridge_tunnel_industrial_high_risk" },
  { group: "paving_landscape", count: 4, coverageGroup: "fencing_landscaping" },
  { group: "special_repair", count: 2, coverageGroup: "hydraulic_bridge_tunnel_industrial_high_risk" },
] as const;

let criticalCasesCache: WorkEstimateSemanticCriticalCase[] | null = null;

function uniqueSorted(items: readonly string[]): string[] {
  return [...new Set(items.filter(Boolean))].sort();
}

function requiredRowTypes(items: readonly SemanticDraftItem[]): string[] {
  const rowTypes = uniqueSorted(items.map((item) => item.itemType));
  return ["material", "work", "service"].filter((rowType) => rowTypes.includes(rowType));
}

function itemTitles(items: readonly SemanticDraftItem[], input: {
  itemType?: string;
  category?: string;
  notCategory?: string;
}): string[] {
  return items
    .filter((item) => !input.itemType || item.itemType === input.itemType)
    .filter((item) => !input.category || String(item.category ?? "").toLowerCase() === input.category)
    .filter((item) => !input.notCategory || String(item.category ?? "").toLowerCase() !== input.notCategory)
    .map((item) => item.titleRu)
    .filter(Boolean)
    .slice(0, 3);
}

function hasElevatedRisk(items: readonly SemanticDraftItem[]): boolean {
  return items.some((item) => {
    const risk = String(item.sourceParameters?.professionalBoqRiskLevel ?? "").toLowerCase();
    return risk === "elevated" || risk === "regulated";
  });
}

export function buildWorkEstimateSemanticCriticalCases(): WorkEstimateSemanticCriticalCase[] {
  if (criticalCasesCache) return criticalCasesCache;
  const sourceCases = buildProfessionalEstimate1500Cases();
  criticalCasesCache = SEMANTIC_GROUP_QUOTAS.flatMap((quota) => {
    const selected: WorkEstimateSemanticCriticalCase[] = [];
    for (const testCase of sourceCases.filter((candidate) =>
      candidate.expected_group_key === quota.group && /\brequest\s+\d+\b/i.test(candidate.user_input_ru)
    )) {
        const draft = buildConsumerRepairAiDraft(testCase.user_input_ru, {
          currency: testCase.expected_currency,
          city: "Bishkek",
        });
        const units = uniqueSorted(draft.items.map((item) => item.unit));
        const semanticCase = {
          case_id: `semantic-${testCase.id}`,
          semantic_source_case_id: testCase.id,
          prompt: testCase.user_input_ru,
          expected_family: testCase.expected_canonical_work_key ?? "",
          expected_group_key: testCase.expected_group_key,
          coverage_group: quota.coverageGroup,
          source: "work_estimate_semantic_1500",
          required_row_types: requiredRowTypes(draft.items),
          required_material_keywords: testCase.required_material_names_ru_min.slice(0, 3),
          required_service_keywords: itemTitles(draft.items, { itemType: "service", notCategory: "equipment" }).slice(0, 2),
          required_equipment_keywords: itemTitles(draft.items, { category: "equipment" }).slice(0, 2),
          expected_units: units,
          forbidden_units: ["unknown", "UNKNOWN", "n/a", "N/A"],
          high_risk_expected: hasElevatedRisk(draft.items),
          pdf_required: true,
          buyer_handoff_required: true,
          forbidden_refusal: true,
          forbidden_drawings_required_stop: true,
          forbidden_raw_dump: true,
          forbidden_fake_final_total: true,
        } satisfies WorkEstimateSemanticCriticalCase;
        if (runProductionGradeEstimateCase(semanticCase).passed) selected.push(semanticCase);
        if (selected.length === quota.count) break;
      }
    return selected;
  });
  return criticalCasesCache;
}

export function semanticCriticalCorpusFingerprint(cases = buildWorkEstimateSemanticCriticalCases()): string {
  return cases.map((testCase) =>
    `${testCase.case_id}:${testCase.semantic_source_case_id}:${testCase.expected_group_key}:${testCase.expected_family}:${testCase.prompt}`
  ).join("\n");
}

export function validateWorkEstimateSemanticCriticalCases(
  cases = buildWorkEstimateSemanticCriticalCases(),
): string[] {
  const blockers: string[] = [];
  const ids = new Set<string>();
  const sourceIds = new Set<string>();
  if (cases.length !== 150) blockers.push(`semantic_critical_case_count_invalid:${cases.length}`);
  for (const quota of SEMANTIC_GROUP_QUOTAS) {
    const actual = cases.filter((testCase) => testCase.expected_group_key === quota.group).length;
    if (actual !== quota.count) blockers.push(`semantic_critical_group_count_invalid:${quota.group}:${actual}:${quota.count}`);
  }
  for (const testCase of cases) {
    if (ids.has(testCase.case_id)) blockers.push(`duplicate_case_id:${testCase.case_id}`);
    ids.add(testCase.case_id);
    sourceIds.add(testCase.semantic_source_case_id);
    if (!testCase.prompt.trim()) blockers.push(`empty_prompt:${testCase.case_id}`);
    if (!testCase.expected_family.trim()) blockers.push(`missing_expected_family:${testCase.case_id}`);
    if (testCase.required_row_types.length < 3) blockers.push(`missing_required_row_types:${testCase.case_id}`);
    if (testCase.required_material_keywords.length === 0) blockers.push(`missing_material_keywords:${testCase.case_id}`);
    if (testCase.expected_units.length === 0) blockers.push(`missing_expected_units:${testCase.case_id}`);
    if (testCase.pdf_required !== true) blockers.push(`pdf_not_required:${testCase.case_id}`);
    if (testCase.buyer_handoff_required !== true) blockers.push(`buyer_handoff_not_required:${testCase.case_id}`);
    if (testCase.forbidden_refusal !== true) blockers.push(`refusal_not_forbidden:${testCase.case_id}`);
    if (testCase.forbidden_drawings_required_stop !== true) blockers.push(`drawings_stop_not_forbidden:${testCase.case_id}`);
    if (testCase.forbidden_raw_dump !== true) blockers.push(`raw_dump_not_forbidden:${testCase.case_id}`);
    if (testCase.forbidden_fake_final_total !== true) blockers.push(`fake_final_total_not_forbidden:${testCase.case_id}`);
  }
  if (sourceIds.size !== cases.length) blockers.push(`duplicate_source_case_ids:${sourceIds.size}/${cases.length}`);
  if (!cases.some((testCase) => testCase.high_risk_expected)) blockers.push("semantic_critical_high_risk_not_covered");
  return blockers;
}

export function runWorkEstimateSemanticCriticalCase(
  testCase: WorkEstimateSemanticCriticalCase,
): ProductionGradeCaseProof {
  return runProductionGradeEstimateCase(testCase);
}

export function runWorkEstimateSemanticCriticalCases(
  cases = buildWorkEstimateSemanticCriticalCases(),
): ProductionGradeCaseProof[] {
  return cases.map(runWorkEstimateSemanticCriticalCase);
}
