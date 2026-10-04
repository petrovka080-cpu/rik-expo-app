import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { CONCRETE_SLAB_CURING_SOURCE_ID, CONCRETE_SLAB_CURING_SOURCE_METADATA } from "./concreteSlabCuringR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const CURING_MATERIAL_ACCESSORIES_S2733_CONTRACT = "curing-material-accessories:s27-33.v1";
export const CURING_MATERIAL_ACCESSORIES_ROWS = {
  wet: "material:concrete:wet-curing-material-included-kit",
  sheet: "material:concrete:sheet-curing-material-included-kit",
  compound: "material:concrete:compound-curing-material-included-kit",
  separate: "material:concrete:curing-material-separate-kit",
} as const;
const methods = [
  ["WET_COVERING", CURING_MATERIAL_ACCESSORIES_ROWS.wet, "material:concrete:wet-curing-covering"],
  ["IMPERVIOUS_SHEET", CURING_MATERIAL_ACCESSORIES_ROWS.sheet, "material:concrete:impervious-curing-sheet"],
  ["MEMBRANE_CURING_COMPOUND", CURING_MATERIAL_ACCESSORIES_ROWS.compound, "material:concrete:membrane-curing-compound"],
] as const;
const method = (value: string): AutomaticInclusionCondition => ({ kind: "equals", parameterId: "approved_external_curing_method", value });
const material: AutomaticInclusionCondition = { kind: "or", operands: methods.map(([value]) => method(value)) };
const pricing = "curing_material_accessories_pricing_mode", specification = "curing_material_accessories_specification", count = "curing_material_accessories_set_count";
const selected = (value: string): AutomaticInclusionCondition => ({ kind: "and", operands: [material, { kind: "equals", parameterId: pricing, value }] });
const kit: AutomaticInclusionCondition = { kind: "or", operands: ["INCLUDED_IN_CURING_MATERIAL_RATE", "SEPARATE_SUPPLY"].map(selected) };
const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
  requiredWhen: AutomaticInclusionCondition, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
  ({ id, title, valueType, unitId, kind: "conditional", requiredWhen, ...extra });

/** Actual project BOM for fastening, sealing and protecting the selected curing
 * material. Method guidance supplies no consumption coefficient. An explicit
 * project decision is required; no kit or NOT_REQUIRED choice is defaulted. */
export function buildCuringMaterialAccessoriesS2733(catalogId: string) {
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: CURING_MATERIAL_ACCESSORIES_ROWS.separate,
    orderUnitId: "set", consumed: count, stock: "0", reserve: "0", quantum: "1" });
  const rows: AutomaticRowSpec[] = [
    ...methods.map(([value, rowId]): AutomaticRowSpec => ({ rowId,
      formulaId: `${value.toLowerCase()}_material_included_kit_v1`, expression: count,
      section: "Уход за бетоном", category: "material", title: "Крепёж, герметизация и защитные расходники, включённые в цену материала для ухода",
      unitId: "set", procurement: false, costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
      inclusion: { kind: "and", operands: [method(value), { kind: "equals", parameterId: pricing, value: "INCLUDED_IN_CURING_MATERIAL_RATE" }] },
      inputParameterIds: [specification, count], titleParameterIds: [specification] })),
    { rowId: CURING_MATERIAL_ACCESSORIES_ROWS.separate, formulaId: "curing_material_separate_kit_v1", expression: count,
      section: "Уход за бетоном", category: "material", title: "Крепёж, герметизация и защитные расходники для ухода, отдельная поставка",
      unitId: "set", procurement: true, costTreatment: "OWN_COST", inclusion: selected("SEPARATE_SUPPLY"),
      inputParameterIds: [specification], titleParameterIds: [specification], purchaseBalance: balance.owner.purchaseBalance },
  ];
  const addition = buildAutomaticConstructionOwnerR1({ contract: CURING_MATERIAL_ACCESSORIES_S2733_CONTRACT, semanticOwner: catalogId,
    sourceId: CONCRETE_SLAB_CURING_SOURCE_ID, normId: "approved-project-curing-material-fastening-sealing-protection-bom",
    sourceMetadata: { ...CONCRETE_SLAB_CURING_SOURCE_METADATA, artifact_sha256: CONCRETE_SLAB_CURING_SOURCE_METADATA.definition_hash },
    applicabilityRu: "Совместимый с выбранным материалом фактический состав крепежа, герметизации и защиты по проектной ведомости; без универсальной нормы на площадь или объём.",
    ordinary: [], profile: [], deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [], conditional: [
      parameter("approved_external_curing_method", "Существующий выбранный способ ухода", "enum", null, material,
        { values: ["WATER_CURING", ...methods.map(([value]) => value)] }),
      parameter(pricing, "Крепёж, герметизация и защита: по проекту не нужны, включены в цену материала или поставляются отдельно", "enum", null, material,
        { values: ["NOT_REQUIRED", "INCLUDED_IN_CURING_MATERIAL_RATE", "SEPARATE_SUPPLY"] }),
      parameter(specification, "Состав одного комплекта для ухода: совместимые изделия и расходники с количеством каждого по проекту", "text", null, kit),
      parameter(count, "Фактическое число одинаковых комплектов крепежа, герметизации и защиты материала для ухода", "integer", "set", kit, { min: 1 }),
    ], rows });
  return { ...addition, formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i]!.expression, output_unit_id: rows[i]!.unitId })),
    resources: addition.resources.map(r => ({ ...r, resource_graph: { ...r.resource_graph,
      ...(methods.find(([, rowId]) => rowId === r.row_id) ? { includedInResourceOwnerRowId: methods.find(([, rowId]) => rowId === r.row_id)![2] } : {}) } as Record<string, unknown>,
      source_metadata: { ...r.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false,
        quantity_basis: "APPROVED_PROJECT_CURING_METHOD_AND_COUNTED_MATERIAL_BOM" } })) };
}
