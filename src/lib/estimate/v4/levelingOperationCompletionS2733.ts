import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { CONCRETE_SLAB_LEVELING_SOURCE_ID, CONCRETE_SLAB_LEVELING_SOURCE_METADATA } from "./concreteSlabLevelingR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const LEVELING_COMPLETION_S2733_CONTRACT = "leveling-operation-completion:s27-33.v1";
export const LEVELING_COMPLETION_ROWS = {
  guides: "material:concrete:screed-guides",
  includedGuideKit: "material:concrete:leveling-guide-included-kit",
  separateGuideKit: "material:concrete:leveling-guide-separate-kit",
  includedEquipmentKit: "material:concrete:leveling-equipment-included-kit",
  separateEquipmentKit: "material:concrete:leveling-equipment-separate-kit",
} as const;
const and = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: "and", operands });
const equals = (parameterId: string, value: string): AutomaticInclusionCondition => ({ kind: "equals", parameterId, value });
// Keep the delivered boolean selectors. The existing inclusion graph supports them.
const selected = (parameterId: string, quantityId: string): AutomaticInclusionCondition => and(
  equals(parameterId, true as unknown as string), { kind: "greater_than", parameterId: quantityId, value: 0 });
const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
  requiredWhen: AutomaticInclusionCondition, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
  ({ id, title, valueType, unitId, kind: "conditional", requiredWhen, ...extra });

/** Explicit project BOMs complete the selected guides and equipment. No new
 * material consumption or labor/equipment productivity factors are introduced. */
export function buildLevelingOperationCompletionS2733(catalogId: string, equipmentOwnerRowId: string) {
  const guides = selected("screed_guides_required", "screed_guide_length_m");
  const equipment = selected("separate_leveling_equipment_required", "leveling_equipment_machine_h");
  const guideBalance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: LEVELING_COMPLETION_ROWS.guides,
    orderUnitId: "m", consumed: "screed_guide_length_m", stock: "0", reserve: "0",
    quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption" });
  const profiles = [
    { prefix: "leveling_guide_accessories", subject: "Крепления и опоры направляющих", condition: guides,
      includedMode: "INCLUDED_IN_GUIDE_RATE", includedRow: LEVELING_COMPLETION_ROWS.includedGuideKit,
      separateRow: LEVELING_COMPLETION_ROWS.separateGuideKit, owner: LEVELING_COMPLETION_ROWS.guides },
    { prefix: "leveling_equipment_accessories", subject: "Принадлежности и расходники оборудования", condition: equipment,
      includedMode: "INCLUDED_IN_EQUIPMENT_RATE", includedRow: LEVELING_COMPLETION_ROWS.includedEquipmentKit,
      separateRow: LEVELING_COMPLETION_ROWS.separateEquipmentKit, owner: equipmentOwnerRowId },
  ];
  const conditional: AutomaticParameterSpec[] = [
    parameter("screed_guide_length_m", "Направляющие по существующей проектной ведомости", "decimal", "m", guides),
    parameter("leveling_equipment_machine_h", "Машино-часы по существующей ведомости", "decimal", "machine_hour", equipment),
  ];
  const rows: AutomaticRowSpec[] = [{ rowId: LEVELING_COMPLETION_ROWS.guides, formulaId: "leveling_completion_guide_owner_v1",
    expression: "screed_guide_length_m", section: "Выравнивание бетона", category: "material", title: "Направляющие по проектной спецификации",
    unitId: "m", procurement: true, inclusion: guides, purchaseBalance: guideBalance.owner.purchaseBalance,
    effectiveQuantityOutput: guideBalance.owner.effectiveQuantityOutput }];
  for (const p of profiles) {
    const pricingId = `${p.prefix}_pricing_mode`, specificationId = `${p.prefix}_specification`, countId = `${p.prefix}_set_count`;
    const applicableKit = and(p.condition, { kind: "or", operands: [p.includedMode, "SEPARATE_SUPPLY"].map(mode => equals(pricingId, mode)) });
    conditional.push(
      parameter(pricingId, `${p.subject}: не требуются дополнительные изделия, включены в цену или поставляются отдельно`, "enum", null, p.condition,
        { values: ["NOT_REQUIRED", p.includedMode, "SEPARATE_SUPPLY"] }),
      parameter(specificationId, `${p.subject}: состав одного комплекта, совместимость и количество каждого изделия по проекту`, "text", null, applicableKit),
      parameter(countId, `${p.subject}: фактическое число одинаковых комплектов по ведомости`, "integer", "set", applicableKit, { min: 1 }),
    );
    const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: p.separateRow, orderUnitId: "set", consumed: countId, stock: "0", reserve: "0", quantum: "1" });
    for (const mode of [p.includedMode, "SEPARATE_SUPPLY"]) {
      const separate = mode === "SEPARATE_SUPPLY";
      rows.push({ rowId: separate ? p.separateRow : p.includedRow, formulaId: `${p.prefix}_${separate ? "separate" : "included"}_v1`,
        expression: countId, section: "Выравнивание бетона", category: "material",
        title: `${p.subject}, ${separate ? "отдельная поставка" : "включены в цену основного ресурса"}`,
        unitId: "set", procurement: separate, costTreatment: separate ? "OWN_COST" : "INCLUDED_IN_RESOURCE_ROWS",
        inclusion: and(p.condition, equals(pricingId, mode)), inputParameterIds: [specificationId], titleParameterIds: [specificationId],
        ...(separate ? { purchaseBalance: balance.owner.purchaseBalance } : {}) });
    }
  }
  const addition = buildAutomaticConstructionOwnerR1({ contract: LEVELING_COMPLETION_S2733_CONTRACT, semanticOwner: catalogId,
    sourceId: CONCRETE_SLAB_LEVELING_SOURCE_ID, normId: "approved-project-leveling-component-bom",
    sourceMetadata: { ...CONCRETE_SLAB_LEVELING_SOURCE_METADATA, artifact_sha256: CONCRETE_SLAB_LEVELING_SOURCE_METADATA.definition_hash },
    applicabilityRu: "Фактическая комплектность выбранных направляющих и техники по проектной ведомости и условиям цены; без универсальных коэффициентов.",
    ordinary: [], profile: [], conditional, rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [] });
  return { ...addition,
    formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i]!.expression, output_unit_id: rows[i]!.unitId })),
    resources: addition.resources.map(r => {
      const included = profiles.find(p => p.includedRow === r.row_id);
      return { ...r, resource_graph: { ...r.resource_graph,
        ...(included ? { includedInResourceOwnerRowId: included.owner } : {}) } as Record<string, unknown>,
      source_metadata: { ...r.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false,
        quantity_basis: "APPROVED_PROJECT_LEVELING_METHOD_AND_DIRECT_PROJECT_SCHEDULE" } };
    }) };
}
