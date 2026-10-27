import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { MONOLITHIC_REBAR_CAGE_SOURCE_ID, MONOLITHIC_REBAR_CAGE_SOURCE_METADATA, MONOLITHIC_REBAR_CAGE_NORM_ID, MONOLITHIC_REBAR_CAGE_PARAMETERS } from "./monolithicRebarCageR1";

export const REBAR_CAGE_COMPLETION_S2733_CONTRACT = "rebar-cage-operation-completion:s27-33.v1";
export const REBAR_CAGE_COMPLETION_ROWS = {
  work: "work:rebar-cage:assemble-install",
  assemblyLabor: "work:rebar-cage:assembly-labor-composition",
  includedWeldingLabor: "work:rebar-cage:welding-labor-included",
  separateWeldingLabor: "work:rebar-cage:welding-labor-separate",
  includedWeldingMachine: "equipment:rebar-cage:welding-machine-included",
  separateWeldingMachine: "equipment:rebar-cage:welding-machine-separate",
} as const;
export const REBAR_CAGE_WELDING_PRICING_MODES = ["INCLUDED_IN_CAGE_RATE", "SEPARATE_LABOR_AND_MACHINE_RATES"] as const;
const welding: AutomaticInclusionCondition = { kind: "equals", parameterId: "welding_electrode_mode", value: "REQUIRED" };
const pricingId = "cage_welding_pricing_mode";
const selected = (value: string): AutomaticInclusionCondition => ({ kind: "and", operands: [welding, { kind: "equals", parameterId: pricingId, value }] });
const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
  ({ id, title, valueType, unitId, kind: "conditional", requiredWhen: { parameterId: "welding_electrode_mode", value: "REQUIRED" }, ...extra });

/** Expose actual labor inside the already paid kilogram work. Welding is
 * selected only by the existing project branch, with actual approved procedure
 * and a complete equipment BOM; no productivity or safety approval is inferred. */
export function buildRebarCageOperationCompletionS2733(catalogId: string) {
  // The approved project source is unchanged. Reuse its accepted SHA-256
  // identity; the platform's short calculation hash is not a source digest.
  const projectGuide = MONOLITHIC_REBAR_CAGE_PARAMETERS.find(p => p.parameter_id === "bbs_reference")!.truth_metadata.guide as { source_snapshot_hash: string };
  const rows: AutomaticRowSpec[] = [{ rowId: REBAR_CAGE_COMPLETION_ROWS.assemblyLabor, formulaId: "cage_assembly_labor_composition_v1",
    expression: "cage_assembly_worker_h", section: "Арматурный каркас", category: "construction_work",
    title: "Фактический труд резки, гибки, сборки и установки без сварки, включённый в работу в кг",
    unitId: "man_hour", procurement: false, costTreatment: "INCLUDED_IN_RESOURCE_ROWS" }];
  for (const mode of REBAR_CAGE_WELDING_PRICING_MODES) {
    const included = mode === "INCLUDED_IN_CAGE_RATE", suffix = included ? "included" : "separate";
    rows.push({ rowId: included ? REBAR_CAGE_COMPLETION_ROWS.includedWeldingLabor : REBAR_CAGE_COMPLETION_ROWS.separateWeldingLabor,
      formulaId: `cage_welding_labor_${suffix}_v1`, expression: "cage_welding_worker_h", section: "Сварные соединения каркаса",
      category: "construction_work", title: `Сварщик по утверждённой технологии, ${included ? "включён в работу в кг" : "отдельная оплата труда"}`,
      unitId: "man_hour", procurement: false, costTreatment: included ? "INCLUDED_IN_RESOURCE_ROWS" : "OWN_COST", inclusion: selected(mode),
      inputParameterIds: ["cage_welding_procedure_reference"], titleParameterIds: ["cage_welding_procedure_reference"] });
    rows.push({ rowId: included ? REBAR_CAGE_COMPLETION_ROWS.includedWeldingMachine : REBAR_CAGE_COMPLETION_ROWS.separateWeldingMachine,
      formulaId: `cage_welding_machine_${suffix}_v1`, expression: "cage_welding_machine_h", section: "Сварные соединения каркаса",
      category: "equipment", title: `Укомплектованный сварочный пост, ${included ? "включён в работу в кг" : "отдельная оплата оборудования"}`,
      unitId: "machine_hour", procurement: !included, costTreatment: included ? "INCLUDED_IN_RESOURCE_ROWS" : "OWN_COST", inclusion: selected(mode),
      inputParameterIds: ["cage_welding_procedure_reference", "cage_welding_machine_specification", "cage_welding_machine_complete_bom"],
      titleParameterIds: ["cage_welding_machine_specification", "cage_welding_machine_complete_bom"] });
  }
  const addition = buildAutomaticConstructionOwnerR1({ contract: REBAR_CAGE_COMPLETION_S2733_CONTRACT, semanticOwner: catalogId,
    sourceId: MONOLITHIC_REBAR_CAGE_SOURCE_ID, normId: MONOLITHIC_REBAR_CAGE_NORM_ID,
    sourceMetadata: { ...MONOLITHIC_REBAR_CAGE_SOURCE_METADATA, artifact_sha256: projectGuide.source_snapshot_hash },
    applicabilityRu: "Фактический состав труда по производственной ведомости и, только при проектной сварке, утверждённая технология и полностью укомплектованный пост по спецификации. Цена поста включает указанные комплектующие; электроды остаются отдельным существующим расходным материалом.",
    ordinary: [], profile: [], deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: ["automatic labor productivity", "automatic welding approval", "automatic equipment consumption"],
    conditional: [
      { id: "cage_assembly_worker_h", title: "Фактический труд резки, гибки, сборки и установки без сварки, включённый в работу в кг", valueType: "decimal", unitId: "man_hour", kind: "conditional", min: 0.001 },
      parameter("welding_electrode_mode", "Сварные соединения по существующему проекту", "enum", null, { values: ["NOT_REQUIRED", "REQUIRED"] }),
      parameter(pricingId, "Цена работы в кг включает сварщика и полный пост или исключает их для раздельной оплаты по собственным ставкам", "enum", null, { values: REBAR_CAGE_WELDING_PRICING_MODES }),
      parameter("cage_welding_procedure_reference", "Ссылка и ревизия утверждённой проектом технологии сварных соединений", "text", null),
      parameter("cage_welding_worker_h", "Фактические часы сварщика по ведомости; не входят в часы сборки без сварки", "decimal", "man_hour", { min: 0.001 }),
      parameter("cage_welding_machine_specification", "Совместимый укомплектованный сварочный пост по утверждённой технологии", "text", null),
      parameter("cage_welding_machine_h", "Фактические машино-часы сварочного поста", "decimal", "machine_hour", { min: 0.001 }),
      parameter("cage_welding_machine_complete_bom", "Полный состав одного поставляемого поста: изделия, кабели, принадлежности, средства защиты и количество каждого; входят в выбранную ставку поста", "text", null),
    ], rows });
  return { ...addition, formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i]!.expression, output_unit_id: rows[i]!.unitId })),
    resources: addition.resources.map(r => ({ ...r, resource_graph: { ...r.resource_graph,
      ...(r.resource_graph.costTreatment === "INCLUDED_IN_RESOURCE_ROWS" ? { includedInResourceOwnerRowId: REBAR_CAGE_COMPLETION_ROWS.work } : {}) } as Record<string, unknown>,
      source_metadata: { ...r.source_metadata, universal_productivity_claimed: false, universal_consumption_claimed: false,
        quantity_basis: "ACTUAL_PROJECT_LABOR_AND_APPROVED_WELDING_EQUIPMENT_SCHEDULE" } })) };
}
